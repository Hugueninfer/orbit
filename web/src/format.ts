export function parseMoney(value: string): number {
  const normalized = value.trim().replace(/\s|R\$/g, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized))
    throw new Error("Informe um valor como 123,45.");
  const [whole, cents = ""] = normalized.replaceAll(".", "").split(",");
  const minor = Number(whole) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor <= 0)
    throw new Error("O valor deve ser maior que zero.");
  return minor;
}
export const money = (value: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    value / 100,
  );
export const decimal = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
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
  if (!date) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", options).format(
    new Date(date.length === 10 ? `${date}T12:00:00` : date),
  );
}
export function installmentParts(total: number, count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > total)
    throw new Error("Parcelamento inválido");
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
