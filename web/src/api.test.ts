import { beforeEach, expect, test, vi } from "vitest";
beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
function server() {
  const seen: { path: string; options: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (path: string, options: RequestInit = {}) => {
    seen.push({ path, options });
    if (path.endsWith("/config"))
      return Response.json({ app_mode: "combined", oidc_authority: null });
    if (path.endsWith("/auth/demo"))
      return Response.json({
        access_token: "demo-token",
        expires_at: "2099-01-01",
      });
    if (path.endsWith("/me"))
      return Response.json({ is_demo: false, name: "Private owner" });
    return new Response(null, { status: 204 });
  });
  return seen;
}
test("expired demo never restores the residual personal cookie", async () => {
  server();
  sessionStorage.setItem(
    "orbit.demo",
    JSON.stringify({ access_token: "expired", expires_at: "2000-01-01" }),
  );
  const api = await import("./api");
  expect(await api.restoreAuth()).toBe(false);
  await expect(api.request("/me")).rejects.toThrow();
});
test("missing demo token and signed-out intent cannot read cookie data", async () => {
  server();
  const api = await import("./api");
  for (const intent of ["demo", "signed-out"]) {
    sessionStorage.setItem("orbit.access-intent", intent);
    expect(await api.restoreAuth()).toBe(false);
    await expect(api.request("/dashboard")).rejects.toThrow();
  }
});
test("demo requests omit cookies and personal login discards demo identity", async () => {
  const seen = server();
  const api = await import("./api");
  await api.startDemo();
  await api.request("/me");
  expect(seen.at(-1)?.options.credentials).toBe("omit");
  await api.startPersonal("owner@example.com", "password");
  expect(new Headers(seen.at(-1)?.options.headers).has("Authorization")).toBe(
    false,
  );
  expect(seen.at(-1)?.options.credentials).toBe("same-origin");
  expect(sessionStorage.getItem("orbit.demo")).toBeNull();
  await api.request("/me");
  expect(new Headers(seen.at(-1)?.options.headers).has("Authorization")).toBe(
    false,
  );
});
test("loading expired storage clears stale memory", async () => {
  server();
  const api = await import("./api");
  await api.startDemo();
  sessionStorage.setItem(
    "orbit.demo",
    JSON.stringify({ access_token: "expired", expires_at: "2000-01-01" }),
  );
  expect(api.loadToken()).toBeUndefined();
  expect(await api.restoreAuth()).toBe(false);
});
test("expired server demo logout does not reject or restore personal session", async () => {
  const seen = server();
  const api = await import("./api");
  await api.startDemo();
  vi.stubGlobal("fetch", async (path: string, options: RequestInit) => {
    seen.push({ path, options });
    return new Response(null, { status: 401 });
  });
  await expect(api.logout()).resolves.toBeUndefined();
  expect(seen.at(-1)?.path).toBe("/api/v1/auth/demo/logout");
  expect(new Headers(seen.at(-1)?.options.headers).get("Authorization")).toBe(
    "Bearer demo-token",
  );
  await expect(api.request("/me")).rejects.toThrow();
});
