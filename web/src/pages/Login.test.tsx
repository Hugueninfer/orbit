import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import Login from "./Login";
import type { Config } from "../types";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
test("combined entry offers personal credentials and demo works with empty required fields", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ access_token: "demo", expires_at: "2099-01-01" }),
  );
  let entered = false;
  render(
    <Login
      config={
        { app_mode: "combined", oidc_authority: null } as unknown as Config
      }
      onLogin={() => {
        entered = true;
      }}
    />,
  );
  expect(screen.getByLabelText("E-mail profissional ou pessoal")).toBeTruthy();
  const button = screen.getByRole("button", {
    name: "Experimentar demonstração",
  });
  expect(button.getAttribute("type")).toBe("button");
  fireEvent.click(button);
  await waitFor(() => expect(entered).toBe(true));
});
