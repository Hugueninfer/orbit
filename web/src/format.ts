import { getLocale, t } from "./i18n";
export function parseMoney(value: string): number {
  return parseLocalizedMoney(value, false);
}
export function parseBalance(value: string): number {
  return parseLocalizedMoney(value, true);
}
function parseLocalizedMoney(value: string, signed: boolean): number {
  const raw = value.trim().replace(/\s|R\$/g, "");
  const negative = signed && raw.startsWith("-");
  const normalized = negative ? raw.slice(1) : raw;
  const english = getLocale() === "en-US";
  const pattern = english
    ? /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/
    : /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/;
  if (!pattern.test(normalized))
    throw new Error(t("Informe um valor como 123,45."));
  const [whole, cents = ""] = normalized
    .replaceAll(english ? "," : ".", "")
    .split(english ? "." : ",");
  const minor = Number(whole) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || (!signed && minor <= 0))
    throw new Error(t("O valor deve ser maior que zero."));
  return negative ? -minor : minor;
}
export const money = (value: number, currency = "BRL") =>
  new Intl.NumberFormat(getLocale(), { style: "currency", currency }).format(
    value / 100,
  );
export const decimal = (value: number) =>
  new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(
    value,
  );
export function localDate(
  timeZone = "America/Sao_Paulo",
  now = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)?.value)
    .join("-");
}
export function dateLabel(
  date: string | undefined | null,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" },
) {
  if (!date) return t("Sem prazo");
  return new Intl.DateTimeFormat(getLocale(), options).format(
    new Date(date.length === 10 ? `${date}T12:00:00` : date),
  );
}
export function installmentParts(total: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > total)
    throw new Error(t("Parcelamento inválido"));
  const base = Math.floor(total / count);
  return Array.from(
    { length: count },
    (_, i) => base + (i < total % count ? 1 : 0),
  );
}
export const minutes = (seconds: number) =>
  `${Math.floor(Math.max(0, seconds) / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(Math.max(0, seconds) % 60)
    .toString()
    .padStart(2, "0")}`;
export function displayLoad(
  kg: string | number,
  unit: "kg" | "lb" = "kg",
): string {
  return String(
    Math.round(Number(kg) * (unit === "lb" ? 2.20462262185 : 1) * 1000) / 1000,
  );
}
export function canonicalLoad(value: string, unit: "kg" | "lb" = "kg"): string {
  return String(
    Math.round((Number(value) / (unit === "lb" ? 2.20462262185 : 1)) * 1000) /
      1000,
  );
}

// Profile weekdays use Monday=0; civil dates stay independent of device timezone.
export function weekDates(date: string, weekStart = 0): string[] {
  const start = new Date(`${date}T12:00:00Z`);
  start.setUTCDate(
    start.getUTCDate() - ((start.getUTCDay() + 6 - weekStart + 7) % 7),
  );
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + i);
    return day.toISOString().slice(0, 10);
  });
}

export function moneyInput(value: number): string {
  return (value / 100)
    .toFixed(2)
    .replace(".", getLocale() === "en-US" ? "." : ",");
}
