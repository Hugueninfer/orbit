import type { Transaction, Purchase } from "./types";

export type FinanceEntry =
  | { type: "transaction"; date: string; record: Transaction }
  | { type: "purchase"; date: string; record: Purchase };

export function financeEntries(
  transactions: Transaction[],
  purchases: Purchase[],
  month: string,
  search: string,
  tab: string,
): FinanceEntry[] {
  const entries: FinanceEntry[] = [
    ...transactions
      .filter(
        (t) =>
          tab === "all" || (t.kind === tab && !t.transfer_id && !t.invoice_id),
      )
      .map((t) => ({ type: "transaction" as const, date: t.date, record: t })),
    ...(["all", "expense", "purchases"].includes(tab) ? purchases : []).map(
      (p) => ({ type: "purchase" as const, date: p.purchase_date, record: p }),
    ),
  ];
  return entries
    .filter(
      (e) =>
        e.date.startsWith(month) &&
        e.record.description
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}
