import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setLocale } from "../i18n";
import Settings from "./Settings";
const { action, profile } = vi.hoisted(() => ({
  action: vi.fn().mockResolvedValue({}),
  profile: {
    id: "owner",
    version: 1,
    name: "Minha conta",
    timezone: "America/Sao_Paulo",
    locale: "pt-BR",
    week_start: 0,
    weight_unit: "kg",
    currency: "BRL",
    is_demo: false,
  },
}));
vi.mock("../api", () => ({
  useApi: (path: string) => ({
    data: path === "/me" ? profile : [],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useActions: () => action,
  logout: vi.fn(),
}));
vi.mock("../components/Select", () => ({
  Select: (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} />
  ),
}));
afterEach(() => {
  cleanup();
  setLocale("pt-BR");
  vi.clearAllMocks();
});
test("language preview preserves entered name and Save persists account locale", async () => {
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Nome completo"), {
    target: { value: "Nome sem salvar" },
  });
  fireEvent.change(screen.getByLabelText("Idioma"), {
    target: { value: "en-US" },
  });
  expect((screen.getByLabelText("Full name") as HTMLInputElement).value).toBe(
    "Nome sem salvar",
  );
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(action).toHaveBeenCalledWith(
      "/me",
      expect.objectContaining({
        locale: "en-US",
        name: "Nome sem salvar",
        version: 1,
      }),
      "PATCH",
    ),
  );
  expect(document.documentElement.lang).toBe("en-US");
});
