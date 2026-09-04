import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getLocale, setLocale } from "../i18n";
import { ToastProvider } from "./ui";
vi.mock("./Select", () => ({
  Select: ({
    displayValue: _displayValue,
    ...props
  }: React.SelectHTMLAttributes<HTMLSelectElement> & {
    displayValue?: React.ReactNode;
  }) => <select {...props} />,
}));
afterEach(() => {
  cleanup();
  setLocale("pt-BR");
  vi.unstubAllGlobals();
});
function setup(fail = false) {
  const client = new QueryClient();
  const fetcher = vi.fn(async (_url: string, options?: RequestInit) =>
    options?.method === "PATCH"
      ? fail
        ? Response.json({ detail: "Unavailable" }, { status: 503 })
        : Response.json({ id: "owner", version: 5, locale: "de-DE" })
      : Response.json({ id: "owner", version: 4, locale: "pt-BR" }),
  );
  vi.stubGlobal("fetch", fetcher);
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <LanguageSwitcher />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { client, fetcher };
}
test("topbar language previews immediately and saves only locale with the fresh profile version", async () => {
  const { client, fetcher } = setup();
  fireEvent.change(screen.getByRole("combobox", { name: "Idioma" }), {
    target: { value: "de-DE" },
  });
  expect(getLocale()).toBe("de-DE");
  await waitFor(() =>
    expect(client.getQueryData(["orbit", "/me"])).toMatchObject({
      locale: "de-DE",
      version: 5,
    }),
  );
  expect(JSON.parse(fetcher.mock.calls[1][1]!.body as string)).toEqual({
    version: 4,
    locale: "de-DE",
  });
});
test("failed language save restores the previous language and explains that it was not saved", async () => {
  setup(true);
  fireEvent.change(screen.getByRole("combobox", { name: "Idioma" }), {
    target: { value: "de-DE" },
  });
  await waitFor(() => expect(getLocale()).toBe("pt-BR"));
  expect(screen.getByRole("alert").textContent).toContain(
    "Não foi possível salvar o idioma",
  );
});
