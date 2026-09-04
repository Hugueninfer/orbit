// HTTP is the boundary: exercise the real provider state and query cache.
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { FocusProvider, useFocus } from "./FocusProvider";
import { request } from "../../api";
vi.mock("../../api", () => ({ request: vi.fn() }));
function Consumer() {
  const f = useFocus();
  return (
    <>
      <span data-testid="active">{f.active?.id ?? "none"}</span>
      <span>{f.completed ? "harvested" : "waiting"}</span>
      <button
        disabled={f.pending}
        onClick={() =>
          void f.start({
            duration_minutes: 1,
            label: "",
            session_kind: "focus",
          })
        }
      >
        start
      </button>
      <button disabled={f.pending} onClick={() => void f.command("cancel")}>
        cancel
      </button>
    </>
  );
}
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <FocusProvider>
        <Consumer />
      </FocusProvider>
    </QueryClientProvider>,
  );
  return client;
}
const session = {
  id: "one",
  version: 1,
  status: "running",
  session_kind: "focus",
  species: "oak",
  label: "",
  duration_seconds: 60,
  remaining_seconds: 60,
  started_at: new Date(Date.now() - 61000).toISOString(),
  deadline_at: new Date(Date.now() - 1000).toISOString(),
  finished_at: null,
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("reconnect completes an expired timer after a failed completion without reloading", async () => {
  let active: typeof session | null = session;
  let attempts = 0;
  vi.mocked(request).mockImplementation(async (path) => {
    if (path === "/focus")
      return {
        active,
        server_now: new Date().toISOString(),
        stats: { trees: 0, minutes: 0, today_minutes: 0 },
      };
    if (path.endsWith("/complete")) {
      attempts++;
      if (attempts === 1) throw new Error("offline");
      active = null;
      return { ...session, status: "completed" };
    }
    throw new Error(path);
  });
  const client = mount();
  await waitFor(() => expect(attempts).toBe(1));
  await waitFor(() =>
    expect((screen.getByText("start") as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  await act(async () => {
    window.dispatchEvent(new Event("online"));
  });
  await waitFor(() => expect(screen.getByText("harvested")).toBeTruthy());
  expect(screen.getByTestId("active").textContent).toBe("none");
  client.clear();
});
it("a lost start response resolved by refetch does not reuse that start key", async () => {
  let active: typeof session | null = null;
  const keys: string[] = [];
  vi.mocked(request).mockImplementation(async (path, options) => {
    if (path === "/focus")
      return {
        active,
        server_now: new Date().toISOString(),
        stats: { trees: 0, minutes: 0, today_minutes: 0 },
      };
    if (path === "/focus/start") {
      keys.push(new Headers(options?.headers).get("Idempotency-Key")!);
      active = {
        ...session,
        id: String(keys.length),
        deadline_at: new Date(Date.now() + 60000).toISOString(),
      };
      if (keys.length === 1) throw new Error("response lost after commit");
      return active;
    }
    if (path.endsWith("/cancel")) {
      const row = { ...active, status: "cancelled" };
      active = null;
      return row;
    }
    throw new Error(path);
  });
  const client = mount();
  await waitFor(() => expect(vi.mocked(request)).toHaveBeenCalled());
  fireEvent.click(screen.getByText("start"));
  await waitFor(() =>
    expect(screen.getByTestId("active").textContent).toBe("1"),
  );
  await waitFor(() =>
    expect((screen.getByText("cancel") as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  fireEvent.click(screen.getByText("cancel"));
  await waitFor(() =>
    expect(screen.getByTestId("active").textContent).toBe("none"),
  );
  await waitFor(() =>
    expect((screen.getByText("start") as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  fireEvent.click(screen.getByText("start"));
  await waitFor(() => expect(keys.length).toBe(2));
  expect(keys[0]).not.toBe(keys[1]);
  await waitFor(() =>
    expect((screen.getByText("start") as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
  client.clear();
});

it("a command finishing after logout cannot overwrite the next account cache", async () => {
  let resolveStart!: (value: unknown) => void;
  vi.mocked(request).mockImplementation(async (path) => {
    if (path === "/focus")
      return {
        active: null,
        server_now: new Date().toISOString(),
        stats: { trees: 0, minutes: 0, today_minutes: 0 },
      };
    return new Promise((resolve) => {
      resolveStart = resolve;
    });
  });
  const client = mount();
  await waitFor(() => expect(vi.mocked(request)).toHaveBeenCalled());
  fireEvent.click(screen.getByText("start"));
  await waitFor(() => expect(resolveStart).toBeTypeOf("function"));
  cleanup();
  client.clear();
  const nextOwner = {
    active: null,
    server_now: new Date().toISOString(),
    stats: { trees: 20, minutes: 500, today_minutes: 0 },
  };
  client.setQueryData(["orbit", "/focus"], nextOwner);
  await act(async () => {
    resolveStart({
      ...session,
      deadline_at: new Date(Date.now() + 60000).toISOString(),
    });
    await new Promise((r) => setTimeout(r, 30));
  });
  expect(client.getQueryData(["orbit", "/focus"])).toEqual(nextOwner);
  client.clear();
});
