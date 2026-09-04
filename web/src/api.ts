import { t, setLocale, messages } from "./i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import type { Config } from "./types";
let config: Config | undefined;
let oidc: UserManager | undefined;
let token: string | undefined;
const DEMO_STORAGE = "orbit.demo";
const INTENT_STORAGE = "orbit.access-intent";
const intent = () => sessionStorage.getItem(INTENT_STORAGE);
export function signOutLocally() {
  token = undefined;
  sessionStorage.removeItem(DEMO_STORAGE);
  sessionStorage.setItem(INTENT_STORAGE, "signed-out");
}
export function setPersonalToken(value: string) {
  sessionStorage.removeItem(DEMO_STORAGE);
  sessionStorage.setItem(INTENT_STORAGE, "personal");
  token = value;
}
export const queryKeys = { all: ["orbit"] as const };
export function loadToken() {
  token = undefined;
  const stored = sessionStorage.getItem(DEMO_STORAGE);
  if (stored) {
    sessionStorage.setItem(INTENT_STORAGE, "demo");
    try {
      const item = JSON.parse(stored);
      if (Date.parse(item.expires_at) > Date.now()) token = item.access_token;
      else sessionStorage.removeItem(DEMO_STORAGE);
    } catch {
      sessionStorage.removeItem(DEMO_STORAGE);
    }
  }
  return token;
}
export function setToken(value: string | undefined) {
  token = value;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const publicPath = ["/config", "/auth/login", "/auth/demo"].includes(path);
  if (!publicPath && !token && ["demo", "signed-out"].includes(intent() ?? ""))
    throw new Error(t("Sua sessão terminou. Entre novamente para continuar."));
  if (!publicPath && token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");
  if (options.body) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(options.method ?? "GET"))
    headers.set("X-Orbit-CSRF", "1");
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
    credentials:
      path === "/auth/login"
        ? "same-origin"
        : publicPath || token || intent() === "demo"
          ? "omit"
          : "same-origin",
  });
  if (!response.ok) {
    let message = t("Não foi possível concluir ({{status}}).", {
      status: response.status,
    });
    try {
      const body = await response.json();
      message =
        typeof body.detail === "string" ? body.detail : body.title || message;
    } catch {
      /* non-JSON infrastructure errors */
    }
    if (response.status === 422 && !Object.hasOwn(messages, message))
      message = t("Confira os campos obrigatórios e os valores informados.");
    if (path === "/auth/login" && response.status === 401)
      message = t("E-mail ou senha inválidos.");
    if (path === "/auth/login" && response.status === 429)
      message = t(
        "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
      );
    if (response.status === 401 && !publicPath) {
      signOutLocally();
      window.dispatchEvent(new Event("orbit:unauthorized"));
    }
    throw new ApiError(t(message), response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const getConfig = async () =>
  config ?? (config = await request<Config>("/config"));
export async function getOidc() {
  const cfg = await getConfig();
  if (!cfg.oidc_authority || !cfg.oidc_client_id)
    throw new Error(
      t("O acesso pessoal precisa de um provedor de identidade configurado."),
    );
  if (!oidc) {
    oidc = new UserManager({
      authority: cfg.oidc_authority,
      client_id: cfg.oidc_client_id,
      redirect_uri: `${location.origin}/auth/callback`,
      silent_redirect_uri: `${location.origin}/auth/silent-callback`,
      post_logout_redirect_uri: location.origin,
      response_type: "code",
      scope: "openid profile email",
      automaticSilentRenew: true,
      userStore: new WebStorageStateStore({ store: sessionStorage }),
      extraQueryParams: cfg.oidc_audience
        ? { audience: cfg.oidc_audience }
        : {},
    });
    oidc.events.addUserLoaded((user) => {
      if (intent() === "personal") setToken(user.access_token);
    });
    oidc.events.addUserUnloaded(() => {
      if (intent() === "personal") setToken(undefined);
    });
    oidc.events.addAccessTokenExpired(() => {
      if (intent() !== "personal") return;
      window.dispatchEvent(new Event("orbit:unauthorized"));
    });
  }
  return oidc;
}
export async function restoreAuth() {
  const cfg = await getConfig();
  const demoToken = loadToken();
  if (demoToken) return true;
  if (
    ["demo", "signed-out"].includes(intent() ?? "") ||
    cfg.app_mode === "demo"
  )
    return false;
  if (!cfg.oidc_authority) {
    const response = await fetch("/api/v1/me", { credentials: "same-origin" });
    if (response.status === 401) return false;
    if (!response.ok)
      throw new Error(
        t("Não foi possível verificar sua sessão. Tente novamente."),
      );
    const profile = await response.json();
    if (profile.locale) setLocale(profile.locale);
    sessionStorage.setItem(INTENT_STORAGE, "personal");
    return true;
  }
  const manager = await getOidc();
  const user = await manager.getUser();
  if (user && !user.expired) {
    setPersonalToken(user.access_token);
    return true;
  }
  return false;
}
export async function startDemo() {
  const data = await request<{ access_token: string; expires_at: string }>(
    "/auth/demo",
    { method: "POST", body: "{}" },
  );
  sessionStorage.setItem(DEMO_STORAGE, JSON.stringify(data));
  sessionStorage.setItem(INTENT_STORAGE, "demo");
  setToken(data.access_token);
}
export async function startPersonal(email: string, password: string) {
  await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  sessionStorage.removeItem(DEMO_STORAGE);
  sessionStorage.setItem(INTENT_STORAGE, "personal");
  setToken(undefined);
}
export async function logout() {
  const demo = intent() === "demo" || !!sessionStorage.getItem(DEMO_STORAGE);
  if (demo) {
    try {
      if (token) await request("/auth/demo/logout", { method: "POST" });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    } finally {
      signOutLocally();
      window.dispatchEvent(new Event("orbit:unauthorized"));
    }
    return;
  }
  const cfg = await getConfig();
  if (cfg.oidc_authority) {
    signOutLocally();
    await (await getOidc()).signoutRedirect();
  } else {
    await request("/auth/logout", { method: "POST" });
    signOutLocally();
    window.dispatchEvent(new Event("orbit:unauthorized"));
  }
}
export function useApi<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.all, path],
    queryFn: () => request<T>(path),
    enabled,
    retry: 1,
    staleTime: 15000,
  });
}
export function useCommand<T = unknown>(
  path: string,
  method = "POST",
  idempotent = false,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) =>
      request<T>(path, {
        method,
        body: method === "DELETE" ? undefined : JSON.stringify(data),
        headers: idempotent
          ? { "Idempotency-Key": crypto.randomUUID() }
          : undefined,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.all }),
  });
}
export function useActions() {
  const client = useQueryClient();
  return async <T>(
    path: string,
    data: unknown = {},
    method = "POST",
    key?: string,
  ) => {
    const result = await request<T>(path, {
      method,
      body: method === "DELETE" ? undefined : JSON.stringify(data),
      headers: key ? { "Idempotency-Key": key } : undefined,
    });
    await client.invalidateQueries({ queryKey: queryKeys.all });
    return result;
  };
}
