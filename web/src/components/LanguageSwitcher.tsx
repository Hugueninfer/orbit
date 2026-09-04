import { useState } from "react";
import { Languages } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { request, queryKeys } from "../api";
import { locales, setLocale, useLocale, t, type Locale } from "../i18n";
import type { Dashboard, Profile } from "../types";
import { Select } from "./Select";
import { useToast } from "./ui";

export function LanguageSwitcher({ disabled = false }: { disabled?: boolean }) {
  const locale = useLocale();
  const [saving, setSaving] = useState(false);
  const client = useQueryClient();
  const toast = useToast();
  async function changeLanguage(next: Locale) {
    const previous = locale;
    setLocale(next);
    setSaving(true);
    try {
      const current = await request<Profile>("/me");
      const updated = await request<Profile>("/me", {
        method: "PATCH",
        body: JSON.stringify({ version: current.version, locale: next }),
      });
      client.setQueryData([...queryKeys.all, "/me"], updated);
      client.setQueryData<Dashboard>(
        [...queryKeys.all, "/dashboard"],
        (data) => (data ? { ...data, profile: updated } : data),
      );
    } catch {
      setLocale(previous);
      toast(t("Não foi possível salvar o idioma. Tente novamente."), true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Select
      className="topbar-language"
      aria-label={t("Idioma")}
      title={t("Idioma")}
      value={locale}
      disabled={disabled || saving}
      aria-busy={saving}
      displayValue={
        <span className="language-short">
          <Languages size={17} aria-hidden />
          <span>{locale.slice(0, 2).toUpperCase()}</span>
        </span>
      }
      onChange={(event) => void changeLanguage(event.target.value as Locale)}
    >
      {locales.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </Select>
  );
}
