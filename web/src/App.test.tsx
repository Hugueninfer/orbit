import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { StrictMode } from "react";
import App from "./App";
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
test("direct demo entry in StrictMode does not restore personal cookie or create demo", async () => {
  const paths: string[] = [];
  vi.stubGlobal("fetch", async (path: string) => {
    paths.push(path);
    if (path.endsWith("/config"))
      return Response.json({ app_mode: "combined", oidc_authority: null });
    return Response.json({ name: "Private owner", is_demo: false });
  });
  render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/demo"]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
  await screen.findByRole("button", { name: "Experimentar demonstração" });
  expect(paths.every((path) => path === "/api/v1/config")).toBe(true);
  expect(sessionStorage.getItem("orbit.access-intent")).toBe("signed-out");
});
