import { afterEach, expect, test, vi } from "vitest";
import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TransactionEditor } from "./FinanceEditor";
import { setLocale } from "../i18n";

const action = vi.fn();
vi.mock("../api", () => ({ useActions: () => action }));

afterEach(() => {
  cleanup();
  action.mockReset();
  setLocale("pt-BR");
});

test("English transaction and purchase editors preserve a dot-decimal amount in their payload", async () => {
  setLocale("en-US");
  const accounts: ComponentProps<typeof TransactionEditor>["accounts"] = [{ id: "account", version: 1, name: "Checking", currency: "BRL", archived: false, color: "#44e2cd", current_balance: 0, opening_balance: 0, projected_balance: 0, type: "checking" }];
  const cards: ComponentProps<typeof TransactionEditor>["cards"] = [{ id: "card", version: 1, name: "Card", last_four: "1234", archived: false, close_day: 25, due_day: 5, color: "#b7c4ff", currency: "BRL", limit_amount: null, payment_account_id: "account" }];
  const common = { accounts, categories: [], cards, onClose: vi.fn(), today: "2026-09-04" };
  const transaction: NonNullable<ComponentProps<typeof TransactionEditor>["transaction"]> = { id: "transaction", version: 1, account_id: "account", category_id: null, kind: "expense", amount: 1234, currency: "BRL", description: "Lunch", date: "2026-09-04", status: "posted", invoice_id: null, is_overdue: false, recurrence_id: null, recurrence_superseded: false, reversal_of: null, scheduled_date: null, transfer_id: null };
  const purchase: NonNullable<ComponentProps<typeof TransactionEditor>["purchase"]> = { id: "purchase", version: 1, card_id: "card", category_id: null, amount: 1234, description: "Lunch", purchase_date: "2026-09-04", installment_count: 1, installments: [], status: "active" };
  const { unmount } = render(<TransactionEditor {...common} transaction={transaction} />);
  expect((screen.getByDisplayValue("12.34") as HTMLInputElement).value).toBe("12.34");
  fireEvent.click(screen.getByRole("button", { name: "Confirm transaction" }));
  await waitFor(() => expect(action).toHaveBeenCalledWith("/transactions/transaction", expect.objectContaining({ amount: 1234 }), "PATCH"));
  unmount();
  render(<TransactionEditor {...common} purchase={purchase} />);
  expect((screen.getByDisplayValue("12.34") as HTMLInputElement).value).toBe("12.34");
  fireEvent.click(screen.getByRole("button", { name: "Confirm transaction" }));
  await waitFor(() => expect(action).toHaveBeenCalledWith("/purchases/purchase", expect.objectContaining({ amount: 1234 }), "PATCH", expect.any(String)));
});
