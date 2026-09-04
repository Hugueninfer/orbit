import { afterEach, expect, test } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { getLocale, setLocale, t, useT } from "./i18n";
afterEach(() => {
  cleanup();
  setLocale("pt-BR");
});
test("language switch updates mounted UI, html language and saved preference", () => {
  function Greeting() {
    const tr = useT();
    return <p>{tr("Salvar alterações")}</p>;
  }
  render(<Greeting />);
  act(() => setLocale("de-DE"));
  expect(screen.getByText("Änderungen speichern")).toBeTruthy();
  expect(document.documentElement.lang).toBe("de-DE");
  expect(localStorage.getItem("orbit.locale")).toBe("de-DE");
  act(() => setLocale("en-US"));
  expect(screen.getByText("Save changes")).toBeTruthy();
});
test("unsupported language falls back to Portuguese and interpolation keeps user data", () => {
  setLocale("unsupported");
  expect(getLocale()).toBe("pt-BR");
  setLocale("en-US");
  expect(t("Olá, {{name}}", { name: "João & <Anna>" })).toBe(
    "Hello, João & <Anna>",
  );
});
