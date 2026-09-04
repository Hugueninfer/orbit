import { useSyncExternalStore } from "react";
import { coreMessages } from "./locales/core";
import { operationsMessages } from "./locales/operations";
import { routinesMessages } from "./locales/routines";
export type Locale = "pt-BR" | "en-US" | "de-DE";
export const locales: { value: Locale; label: string }[] = [
  { value: "pt-BR", label: "Português" },
  { value: "en-US", label: "English" },
  { value: "de-DE", label: "Deutsch" },
];
export const messages = {
  ...operationsMessages,
  ...routinesMessages,
  ...coreMessages,
};
export function normalizeLocale(value: unknown): Locale {
  return value === "en-US" || value === "de-DE" ? value : "pt-BR";
}
function savedLocale(): Locale {
  try {
    return normalizeLocale(localStorage.getItem("orbit.locale"));
  } catch {
    return "pt-BR";
  }
}
let locale = savedLocale();
const listeners = new Set<() => void>();
export function getLocale(): Locale {
  return locale;
}
export function setLocale(value: string) {
  const next = normalizeLocale(value);
  const changed = next !== locale;
  locale = next;
  try {
    localStorage.setItem("orbit.locale", locale);
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  if (changed) listeners.forEach((listener) => listener());
}
if (typeof document !== "undefined") document.documentElement.lang = locale;
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === "orbit.locale") setLocale(event.newValue ?? "pt-BR");
  });
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, () => "pt-BR");
}
export function t(
  key: string,
  values: Record<string, string | number> = {},
): string {
  const translated =
    locale === "pt-BR"
      ? key
      : (messages[key]?.[locale === "en-US" ? "en" : "de"] ?? key);
  return translated.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    values[name] === undefined ? match : String(values[name]),
  );
}
export function useT() {
  useLocale();
  return t;
}
