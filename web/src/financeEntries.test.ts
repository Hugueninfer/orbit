import { expect, test } from "vitest";
import { financeEntries } from "./financeEntries";
import type { Transaction, Purchase } from "./types";
const tx: Transaction[] = [
  {
    id: "pix",
    kind: "expense",
    date: "2026-09-02",
    description: "Almoço Pix",
    amount: 2500,
  },
  {
    id: "salary",
    kind: "income",
    date: "2026-09-01",
    description: "Salário",
    amount: 500000,
  },
  {
    id: "bill",
    kind: "expense",
    date: "2026-09-03",
    description: "Pagamento fatura",
    invoice_id: "invoice",
    amount: 5000,
  },
  {
    id: "transfer",
    kind: "expense",
    date: "2026-09-03",
    description: "Transferência",
    transfer_id: "transfer",
    amount: 2000,
  },
].map((row) => ({
  account_id: "account",
  category_id: null,
  currency: "BRL",
  invoice_id: null,
  transfer_id: null,
  recurrence_id: null,
  recurrence_superseded: false,
  reversal_of: null,
  scheduled_date: null,
  status: "posted" as const,
  version: 1,
  is_overdue: false,
  ...row,
  kind: row.kind as Transaction["kind"],
}));
const purchases: Purchase[] = [
  {
    id: "credit",
    purchase_date: "2026-09-04",
    description: "Almoço crédito",
    amount: 5000,
  },
  {
    id: "old",
    purchase_date: "2026-08-30",
    description: "Compra antiga",
    amount: 1000,
  },
].map((row) => ({
  card_id: "card",
  category_id: null,
  installment_count: 1,
  installments: [],
  status: "active" as const,
  version: 1,
  ...row,
}));
test("Despesas includes credit and account expenses without counting bill payments or transfers", () => {
  expect(
    financeEntries(tx, purchases, "2026-09", "", "expense").map(
      (e) => e.record.id,
    ),
  ).toEqual(["credit", "pix"]);
});
test("All entries includes purchases and preserves payment history", () => {
  expect(
    financeEntries(tx, purchases, "2026-09", "", "all").map((e) => e.record.id),
  ).toEqual(["credit", "bill", "transfer", "pix", "salary"]);
});
test("Card and income filters respect month and search", () => {
  expect(
    financeEntries(tx, purchases, "2026-09", "ALMOÇO", "purchases").map(
      (e) => e.record.id,
    ),
  ).toEqual(["credit"]);
  expect(
    financeEntries(tx, purchases, "2026-09", "", "income").map(
      (e) => e.record.id,
    ),
  ).toEqual(["salary"]);
  expect(financeEntries(tx, purchases, "2026-10", "", "expense")).toEqual([]);
});
