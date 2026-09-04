import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Sprout } from "lucide-react";
import { request } from "../../api";
import { t, useLocale } from "../../i18n";
import { remainingSeconds, formatTimer } from "../../focusClock";
import type { components } from "../../generated/api";
import "../../styles/focus.css";

export type FocusSession = components["schemas"]["FocusOut"];
type State = components["schemas"]["FocusState"];
export type FocusPage = components["schemas"]["FocusPage"];
export type FocusStart = Omit<components["schemas"]["FocusStart"], "species">;
function useFocusController() {
  const client = useQueryClient();
  const mounted = useRef(true);
  const offset = useRef(0);
  const [now, setNow] = useState(Date.now());
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState<Error | null>(null);
  const [completed, setCompleted] = useState<FocusSession | null>(null);
  const attempted = useRef({ key: "", retryAt: 0 });
  const startIntent = useRef({ body: "", key: "" });
  const query = useQuery({
    queryKey: ["orbit", "/focus"],
    queryFn: async () => {
      const data = await request<State>("/focus");
      if (data.active) startIntent.current = { body: "", key: "" };
      offset.current = Date.parse(data.server_now) - Date.now();
      setNow(Date.now() + offset.current);
      return data;
    },
    staleTime: 15000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    mounted.current = true;
    const tick = () => setNow(Date.now() + offset.current);
    const timer = window.setInterval(tick, 1000);
    const visible = () => {
      if (!document.hidden) {
        tick();
        void query.refetch();
      }
    };
    const online = () => {
      attempted.current.retryAt = 0;
      visible();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", online);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", online);
    };
  }, []);
  const active = query.data?.active ?? null;
  const remaining = active ? remainingSeconds(active, now) : 0;
  async function perform(path: string, body: unknown, key?: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const row = await request<FocusSession>(path, {
        method: "POST",
        body: JSON.stringify(body),
        headers: key ? { "Idempotency-Key": key } : undefined,
      });
      if (!mounted.current) return;
      // Use the confirmed command response even if the following read fails.
      client.setQueryData<State>(["orbit", "/focus"], (old) =>
        old
          ? {
              ...old,
              active: ["running", "paused"].includes(row.status) ? row : null,
            }
          : old,
      );
      if (row.status === "completed") setCompleted(row);
      if (path === "/focus/start") {
        setCompleted(null);
        startIntent.current = { body: "", key: "" };
      }
      await Promise.all([
        query.refetch(),
        client.invalidateQueries({ queryKey: ["orbit", "focus-history"] }),
      ]);
      return row;
    } catch (e) {
      if (!mounted.current) return;
      setError(e as Error);
      await Promise.all([
        query.refetch(),
        client.invalidateQueries({ queryKey: ["orbit", "focus-history"] }),
      ]);
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  function command(action: "pause" | "resume" | "complete" | "cancel") {
    if (!active) return Promise.resolve(undefined);
    return perform(`/focus/${active.id}/${action}`, {
      version: active.version,
    });
  }
  function start(body: FocusStart) {
    const serialized = JSON.stringify(body);
    if (startIntent.current.body !== serialized)
      startIntent.current = { body: serialized, key: crypto.randomUUID() };
    return perform("/focus/start", body, startIntent.current.key);
  }
  async function resetCollection() {
    if (busy.current || !query.data) return false;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await request("/focus/collection/reset", {
        method: "POST",
        body: JSON.stringify({ version: query.data.collection.version }),
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      if (!mounted.current) return false;
      await query.refetch();
      return true;
    } catch (e) {
      if (mounted.current) {
        setError(e as Error);
        await query.refetch();
      }
      return false;
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  useEffect(() => {
    const key = active ? `${active.id}:${active.version}` : "";
    if (
      active?.status === "running" &&
      remaining === 0 &&
      !pending &&
      !document.hidden &&
      navigator.onLine &&
      (attempted.current.key !== key || Date.now() >= attempted.current.retryAt)
    ) {
      attempted.current = { key, retryAt: Date.now() + 30000 };
      void command("complete");
    }
  }, [active?.id, active?.version, active?.status, remaining, pending, now]);
  return {
    query,
    active,
    remaining,
    pending,
    error,
    completed,
    command,
    start,
    resetCollection,
  };
}
const FocusContext = createContext<ReturnType<
  typeof useFocusController
> | null>(null);
export function FocusProvider({ children }: { children: ReactNode }) {
  const value = useFocusController();
  return (
    <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
  );
}
export function useFocus() {
  const value = useContext(FocusContext);
  if (!value) throw new Error("FocusProvider missing");
  return value;
}
export function FocusBadge() {
  useLocale();
  const { active, remaining, error, completed } = useFocus();
  if (!active && !completed) return null;
  return (
    <Link
      to="/foco"
      className="focus-badge"
      aria-label={t("Abrir Jardim de Foco")}
      title={t("Jardim de Foco")}
    >
      <Sprout size={17} />
      <span>
        {active
          ? active.status === "paused"
            ? t("Pausado")
            : formatTimer(remaining)
          : t(
              completed?.session_kind === "break"
                ? "Intervalo concluído"
                : "Colheita pronta",
            )}
      </span>
      {error && <b>!</b>}
    </Link>
  );
}
