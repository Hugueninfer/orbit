import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import type { Config } from "./types";
let config: Config | undefined;
let oidc: UserManager | undefined;
let token: string | undefined;
const DEMO_STORAGE = "orbit.demo";
export const queryKeys = { all: ["orbit"] as const };
export function loadToken() {
  const stored = sessionStorage.getItem(DEMO_STORAGE);
  if (stored) {
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
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/v1${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Não foi possível concluir (${response.status}).`;
    try {
      const body = await response.json();
      message =
        typeof body.detail === "string" ? body.detail : body.title || message;
    } catch {
      /* non-JSON infrastructure errors */
    }
    if (response.status === 401) {
      token = undefined;
      sessionStorage.removeItem(DEMO_STORAGE);
      window.dispatchEvent(new Event("orbit:unauthorized"));
    }
    throw new Error(message);
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
      "O acesso pessoal precisa de um provedor de identidade configurado.",
    );
  if (!oidc) {
    oidc = new UserManager({
      authority: cfg.oidc_authority,
      client_id: cfg.oidc_client_id,
      redirect_uri: `${location.origin}/auth/callback`,
      post_logout_redirect_uri: location.origin,
      response_type: "code",
      scope: "openid profile email",
      automaticSilentRenew: true,
      userStore: new WebStorageStateStore({ store: sessionStorage }),
      extraQueryParams: cfg.oidc_audience
        ? { audience: cfg.oidc_audience }
        : {},
    });
    oidc.events.addUserLoaded((user) => setToken(user.access_token));
    oidc.events.addUserUnloaded(() => setToken(undefined));
    oidc.events.addAccessTokenExpired(() => {
      window.dispatchEvent(new Event("orbit:unauthorized"));
    });
  }
  return oidc;
}
export async function restoreAuth() {
  const cfg = await getConfig();
  if (cfg.app_mode === "demo") return !!loadToken();
  if (!cfg.oidc_authority) return false;
  const manager = await getOidc();
  const user = await manager.getUser();
  if (user && !user.expired) {
    setToken(user.access_token);
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
  setToken(data.access_token);
}
export async function logout() {
  setToken(undefined);
  sessionStorage.removeItem(DEMO_STORAGE);
  if ((await getConfig()).app_mode === "personal") {
    await (await getOidc()).signoutRedirect();
  } else window.location.assign("/");
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
