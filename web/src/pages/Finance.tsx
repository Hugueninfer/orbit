import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CreditCard,
  Plus,
  Search,
  Download,
  Repeat2,
  Pencil,
  ArrowLeftRight,
  Receipt,
  CalendarDays,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useApi, useActions } from "../api";
import { financeEntries } from "../financeEntries";
import type {
  Account,
  Category,
  CreditCard as CardType,
  Invoice,
  FinanceReport,
  Transaction,
  Purchase,
  Recurrence,
  Profile,
} from "../types";
import {
  AddButton,
  Badge,
  Button,
  Card,
  CardTitle,
  Drawer,
  Empty,
  ErrorState,
  Field,
  Loading,
  Progress,
  Stat,
  useToast,
} from "../components/ui";
import { dateLabel, localDate, money, moneyInput, parseMoney } from "../format";
import { useT } from "../i18n";
import { Select } from "../components/Select";
import {
  FinanceResourceEditor,
  TransactionEditor,
  RecurrenceEditor,
  frequencyNames,
} from "./FinanceEditor";
const statusNames: Record<string, string> = {
  posted: "Realizada",
  planned: "Prevista",
  cancelled: "Cancelada",
  open: "Aberta",
  closed: "Fechada",
  partial: "Parcial",
  paid: "Paga",
  overdue: "Vencida",
  active: "Ativa",
  refunded: "Estornada",
};
export default function Finance() {
  const t = useT();
  const me = useApi<Profile>("/me");
  const today = localDate(me.data?.timezone);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [basis, setBasis] = useState<"cash" | "accrual">("cash");
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [params, setParams] = useSearchParams();
  const [resource, setResource] = useState<
    "accounts" | "categories" | "cards" | null
  >(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editPurchase, setEditPurchase] = useState<Purchase | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [reverse, setReverse] = useState<{
    id: string;
    type: "transaction" | "purchase";
    action?: "cancel" | "refund";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [editRecurrence, setEditRecurrence] = useState<Recurrence | null>(null);
  const [busy, setBusy] = useState(false);
  const [reverseKey, setReverseKey] = useState(crypto.randomUUID());
  const accounts = useApi<Account[]>("/accounts");
  const categories = useApi<Category[]>("/categories");
  const cards = useApi<CardType[]>("/cards");
  const transactions = useApi<Transaction[]>("/transactions");
  const invoices = useApi<Invoice[]>("/invoices");
  const purchases = useApi<Purchase[]>("/purchases");
  const recurrences = useApi<Recurrence[]>("/recurrences");
  const end = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const report = useApi<FinanceReport>(
    `/finance/report?from_date=${month}-01&to_date=${month}-${end}&basis=${basis}`,
  );
  const actions = useActions();
  const toast = useToast();
  const ac = accounts.data ?? [];
  const ca = cards.data ?? [];
  const cats = categories.data ?? [];
  const tx = transactions.data ?? [];
  const entries = financeEntries(tx, purchases.data ?? [], month, search, tab);
  const cardName = (id: string) =>
    ca.find((c) => c.id === id)?.name ?? t("Cartão");
  const renderPurchase = (p: Purchase) => (
    <div className="transaction-row purchase-row" key={p.id}>
      <span className="icon-box">
        <CreditCard size={18} />
      </span>
      <div className="row-content">
        <strong>{p.description}</strong>
        <small>
          {t("Crédito")} · {cardName(p.card_id)} · {t("{{count}} parcelas", { count: p.installment_count })} ·{" "}
          {dateLabel(p.purchase_date)}
        </small>
      </div>
      <Badge tone="red">{t("Despesa")} · {t(statusNames[p.status])}</Badge>
      <span className="mono">{money(p.amount)}</span>
      {p.status === "active" &&
        p.installments.every(
          (i) =>
            i.close_date >= today &&
            !invoices.data?.find((invoice) => invoice.id === i.invoice_id)
              ?.paid,
        ) && (
          <button
            className="icon-button"
            aria-label={t("Editar compra {{name}}", { name: p.description })}
            onClick={() => setEditPurchase(p)}
          >
            <Pencil size={15} />
          </button>
        )}
      {p.status === "active" && (
        <Button
          variant="ghost"
          onClick={() => {
            setReverseKey(crypto.randomUUID());
            setReverse({
              id: p.id,
              type: "purchase",
              action: p.installments.every((i) => i.close_date >= today)
                ? "cancel"
                : "refund",
            });
          }}
        >
          {t("Estornar")}
        </Button>
      )}
    </div>
  );
  const renderTransaction = (transaction: Transaction) => (
    <div className="transaction-row" key={transaction.id}>
      <span className="icon-box">
        {transaction.transfer_id ? (
          <ArrowLeftRight size={18} />
        ) : transaction.kind === "income" ? (
          <ArrowDownLeft size={18} />
        ) : (
          <Receipt size={18} />
        )}
      </span>
      <div className="row-content">
        <strong className={transaction.kind === "income" ? "teal" : ""}>
          {transaction.description}
        </strong>
        <small>
          {cats.find((c) => c.id === transaction.category_id)?.name ??
            (transaction.transfer_id ? t("Transferência") : t("Sem categoria"))}{" "}
          · {ac.find((a) => a.id === transaction.account_id)?.name}
        </small>
      </div>
      <div className="mono muted desktop-only">{dateLabel(transaction.date)}</div>
      <div className={`amount ${transaction.kind === "income" ? "teal" : ""}`}>
        {transaction.kind === "income" ? "+" : "−"} {money(transaction.amount)}
        <small className={transaction.is_overdue ? "red" : "muted"}>
          {t(transaction.is_overdue ? "Vencida" : statusNames[transaction.status])}
        </small>
      </div>
      {transaction.status === "planned" ? (
        <button
          className="icon-button"
          onClick={() => setEditing(transaction)}
          aria-label={t("Editar {{name}}", { name: transaction.description })}
        >
          <Pencil size={15} />
        </button>
      ) : transaction.status === "posted" && !transaction.transfer_id && !transaction.invoice_id ? (
        <button
          className="icon-button"
          aria-label={t("Estornar {{name}}", { name: transaction.description })}
          onClick={() => {
            setReverseKey(crypto.randomUUID());
            setReverse({ id: transaction.id, type: "transaction" });
          }}
        >
          <Repeat2 size={15} />
        </button>
      ) : null}
    </div>
  );
  function exportCsv() {
    const safe = (s: string) =>
      '"' + (/^[=+\-@\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"';
    const csv = [
      "Data;Descrição;Tipo;Valor (centavos);Situação;Pagamento",
      ...entries.map((entry) => {
        const record = entry.record;
        const kind =
          entry.type === "purchase"
            ? "expense"
            : entry.record.invoice_id
              ? "invoice_payment"
              : entry.record.transfer_id
                ? "transfer"
                : entry.record.kind;
        return [
          entry.date,
          safe(record.description),
          kind,
          record.amount,
          record.status,
          entry.type === "purchase" ? "Crédito" : "Conta",
        ].join(";");
      }),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `orbit-financas-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const sources = [
    accounts,
    categories,
    cards,
    transactions,
    invoices,
    purchases,
    recurrences,
    report,
  ];
  const failed = sources.find((source) => source.error);
  if (sources.some((source) => source.isLoading)) return <Loading />;
  if (failed?.error && sources.some((source) => source.data === undefined))
    return (
      <ErrorState
        error={failed.error}
        retry={() => {
          sources.forEach((source) => void source.refetch());
        }}
      />
    );
  return (
    <div className="page">
      {failed?.error && (
        <div>
          <p className="form-help">
            {t("Exibindo os últimos dados recebidos. Não foi possível atualizar os valores.")}
          </p>
          <ErrorState
            error={failed.error}
            retry={() => {
              sources.forEach((source) => void source.refetch());
            }}
          />
        </div>
      )}
      <div className="toolbar">
        <div className="tabs">
          <button
            className={basis === "cash" ? "active" : ""}
            onClick={() => setBasis("cash")}
          >
            {t("Visão de caixa")}
          </button>
          <button
            className={basis === "accrual" ? "active" : ""}
            onClick={() => setBasis("accrual")}
          >
            {t("Competência")}
          </button>
        </div>
        <input
          aria-label={t("Mês financeiro")}
          className="control"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ width: 160 }}
        />
        <AddButton onClick={() => setParams({ new: "1" })}>
          {t("Nova transação")}
        </AddButton>
      </div>
      <div className="stats">
        <Stat
          label={t("SALDO CONSOLIDADO")}
          value={money(ac.reduce((s, a) => s + a.current_balance, 0))}
          icon={<Wallet />}
        >
          <p>{t("{{count}} contas · saldo atual", { count: ac.length })}</p>
        </Stat>
        <Stat
          label={t("RECEITAS DO MÊS")}
          value={
            <span className="teal">{money(report.data?.income ?? 0)}</span>
          }
          icon={<ArrowDownLeft />}
        >
          <p>
            {basis === "cash"
              ? t("Entradas realizadas")
              : t("Receitas por competência")}
          </p>
        </Stat>
        <Stat
          label={t("DESPESAS DO MÊS")}
          value={money(report.data?.expenses ?? 0)}
          icon={<ArrowUpRight />}
        >
          <p>
            {basis === "cash"
              ? t("Saídas realizadas")
              : t("Despesas por competência")}
          </p>
        </Stat>
        <Stat
          label={t("RESULTADO DO MÊS")}
          value={
            <span className={(report.data?.net ?? 0) >= 0 ? "teal" : "red"}>
              {money(report.data?.net ?? 0)}
            </span>
          }
          icon={<CalendarDays />}
        >
          <p>{t("Receitas menos despesas")}</p>
        </Stat>
      </div>
      <section>
        <div className="card-title">
          <h2>
            <CreditCard />
            {t("Cartões de crédito & faturas")} <Badge>{t("{{count}} cartões", { count: ca.length })}</Badge>
          </h2>
          <Button onClick={() => setResource("cards")}>
            <Plus size={15} />
            {t("Novo cartão")}
          </Button>
        </div>
        {ca.length ? (
          <div className="card-grid">
            {ca.map((c) => {
              const inv = (invoices.data ?? [])
                .filter((i) => i.card_id === c.id && i.remaining > 0)
                .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
              const total = (invoices.data ?? [])
                .filter((i) => i.card_id === c.id)
                .reduce((s, i) => s + Math.max(i.remaining, 0), 0);
              return (
                <div className="credit-card" key={c.id}>
                  <div className="between">
                    <span className="mono muted">•••• {c.last_four}</span>
                    <Badge tone="teal">
                      {inv ? t(statusNames[inv.status]) : t("Sem pendências")}
                    </Badge>
                  </div>
                  <h3>{c.name}</h3>
                  <div>
                    <div className="between" style={{ marginBottom: 9 }}>
                      <small>{t("Próxima fatura")}</small>
                      <strong>{money(inv?.remaining ?? 0)}</strong>
                    </div>
                    <Progress
                      value={
                        c.limit_amount ? (total / c.limit_amount) * 100 : 0
                      }
                    />
                    <div className="between" style={{ marginTop: 9 }}>
                      <small className="mono">{t("Fecha dia {{day}}", { day: c.close_day })}</small>
                      <small className="mono">{t("Vence dia {{day}}", { day: c.due_day })}</small>
                    </div>
                  </div>
                  <div className="between">
                    <small>
                      {c.limit_amount
                        ? t("Limite: {{amount}}", { amount: money(c.limit_amount) })
                        : t("Sem limite informado")}
                    </small>
                    <Button
                      onClick={() => {
                        if (inv) setInvoice(inv);
                        else {
                          setTab("invoices");
                          setSearch("");
                        }
                      }}
                    >
                      {t("Ver faturas")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <Empty
              title={t("Seus cartões, organizados")}
              description={t("Cadastre um cartão para acompanhar parcelas, fechamento e vencimento.")}
              action={
                <AddButton onClick={() => setResource("cards")}>
                  {t("Adicionar cartão")}
                </AddButton>
              }
            />
          </Card>
        )}
      </section>
      <div className="split">
        <Card>
          <CardTitle
            action={
              <Button onClick={() => setResource("accounts")}>
                <Plus size={15} />
                {t("Nova conta")}
              </Button>
            }
          >
            <Wallet />
            {t("Suas contas")}
          </CardTitle>
          {ac.length ? (
            ac.map((a) => (
              <div className="transaction-row" key={a.id}>
                <div className="icon-box" style={{ color: a.color }}>
                  <Wallet size={20} />
                </div>
                <div className="row-content">
                  <strong>{a.name}</strong>
                  <small>{t("Projetado: {{amount}}", { amount: money(a.projected_balance) })}</small>
                </div>
                <span className="mono">{money(a.current_balance)}</span>
              </div>
            ))
          ) : (
            <Empty
              title={t("Comece pela sua primeira conta")}
              description={t("Informe o saldo inicial para acompanhar as movimentações.")}
            />
          )}
        </Card>
        <Card>
          <CardTitle>{t("Distribuição de despesas")}</CardTitle>
          {(report.data?.categories ?? []).length ? (
            <>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report.data?.categories.map((c) => ({
                      name: c.name,
                      value: c.amount / 100,
                    }))}
                  >
                    <CartesianGrid vertical={false} stroke="#253653" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#969cac" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "#16202f",
                        border: "1px solid #253653",
                        borderRadius: 8,
                      }}
                      formatter={(v) => money(Number(v) * 100)}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="value"
                      fill="#44e2cd"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={38}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {report.data?.categories.slice(0, 4).map((c) => (
                <div
                  key={c.category_id ?? c.name}
                  className="between"
                  style={{ marginTop: 12 }}
                >
                  <small>{c.name}</small>
                  <span className="mono">{money(c.amount)}</span>
                </div>
              ))}
            </>
          ) : (
            <Empty description={t("Suas despesas por categoria aparecerão aqui.")} />
          )}
        </Card>
      </div>
      <Card>
        <CardTitle
          action={
            <Button onClick={exportCsv}>
              <Download size={15} />
              {t("Exportar CSV")}
            </Button>
          }
        >
          {t("Transações & compromissos")}
        </CardTitle>
        <div className="toolbar" style={{ marginBottom: 20 }}>
          <div className="tabs">
            {[
              ["all", "Todas"],
              ["expense", "Despesas"],
              ["income", "Receitas"],
              ["purchases", "No crédito"],
              ["invoices", "Faturas"],
              ["recurrences", "Recorrências"],
            ].map(([k, l]) => (
              <button
                key={k}
                className={tab === k ? "active" : ""}
                onClick={() => setTab(k)}
              >
                {t(l)}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={15} />
            <input
              aria-label={t("Buscar transações")}
              placeholder={t("Buscar transações…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {tab === "expense" && (
          <p className="form-help">
            {t("Inclui gastos da conta e compras no crédito. Pagamentos de fatura ficam em Todas; os totais acima seguem a visão de caixa ou competência selecionada.")}
          </p>
        )}
        {tab === "invoices" ? (
          (invoices.data ?? []).length ? (
            invoices.data?.map((i) => (
              <div className="transaction-row" key={i.id}>
                <span className="icon-box">
                  <CreditCard size={18} />
                </span>
                <div className="row-content">
                  <strong>{cardName(i.card_id)}</strong>
                  <small>
                    {t("Fecha {{close}} · Vence {{due}}", { close: dateLabel(i.close_date), due: dateLabel(i.due_date) })}
                  </small>
                </div>
                <Badge
                  tone={
                    i.status === "paid"
                      ? "teal"
                      : i.status === "overdue"
                        ? "red"
                        : "blue"
                  }
                >
                  {t(statusNames[i.status])}
                </Badge>
                <span className="mono">{money(i.remaining)}</span>
                <Button onClick={() => setInvoice(i)}>{t("Abrir")}</Button>
              </div>
            ))
          ) : (
            <Empty description={t("As faturas são criadas ao registrar compras no cartão.")} />
          )
        ) : tab === "recurrences" ? (
          <>
            <div className="between" style={{ marginBottom: 18 }}>
              <small>
                {t("Lançamentos previstos, sem alterar seu histórico realizado.")}
              </small>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const endDate = new Date(`${today}T12:00:00`);
                    endDate.setMonth(endDate.getMonth() + 3);
                    const through = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
                    const result = await actions<{ created: number }>(
                      "/recurrences/generate",
                      { through_date: through },
                    );
                    toast(t("{{count}} lançamentos previstos gerados", { count: result.created }));
                  } catch (e) {
                    toast((e as Error).message, true);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Repeat2 size={15} />
                {t("Gerar próximos 3 meses")}
              </Button>
            </div>
            {recurrences.data?.map((r) => (
              <div className="transaction-row" key={r.id}>
                <span className="icon-box">
                  <Repeat2 size={18} />
                </span>
                <div className="row-content">
                  <strong>{r.description}</strong>
                  <small>
                    {t("A cada {{interval}} {{frequency}}", { interval: r.interval, frequency: t(frequencyNames[r.frequency]) })} · {t(r.active ? "Ativa" : "Pausada")}
                  </small>
                </div>
                <span className="mono">{money(r.amount)}</span>
                <button
                  className="icon-button"
                  aria-label={t("Editar {{name}}", { name: r.description })}
                  onClick={() => setEditRecurrence(r)}
                >
                  <Pencil size={15} />
                </button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await actions(
                        `/recurrences/${r.id}`,
                        { version: r.version, active: !r.active },
                        "PATCH",
                      );
                      toast(
                        t(r.active ? "Recorrência pausada" : "Recorrência ativada"),
                      );
                    } catch (e) {
                      toast((e as Error).message, true);
                    }
                  }}
                >
                  {t(r.active ? "Pausar" : "Ativar")}
                </Button>
              </div>
            ))}
            {!recurrences.data?.length && (
              <Empty
                title={t("Seu planejamento mensal")}
                description={t("Ao criar uma transação, marque a opção de repetir.")}
              />
            )}
          </>
        ) : entries.length ? (
          entries.map((entry) =>
            entry.type === "purchase"
              ? renderPurchase(entry.record)
              : renderTransaction(entry.record),
          )
        ) : (
          <Empty
            title={t("Nenhuma transação neste período")}
            description={t("Registre uma movimentação ou selecione outro mês.")}
            action={
              <AddButton onClick={() => setParams({ new: "1" })}>
                {t("Nova transação")}
              </AddButton>
            }
          />
        )}
        <div className="divider" />
        <Button variant="ghost" onClick={() => setResource("categories")}>
          <Plus size={15} />
          {t("Adicionar categoria")}
        </Button>
      </Card>
      {(params.has("new") || editing) && (
        <TransactionEditor
          accounts={ac}
          categories={cats}
          cards={ca}
          transaction={editing}
          today={today}
          onClose={() => {
            setParams({});
            setEditing(null);
          }}
        />
      )}
      {editPurchase && (
        <TransactionEditor
          accounts={ac}
          categories={cats}
          cards={ca}
          purchase={editPurchase}
          today={today}
          onClose={() => setEditPurchase(null)}
        />
      )}
      {resource && (
        <FinanceResourceEditor
          kind={resource}
          accounts={ac}
          onClose={() => setResource(null)}
        />
      )}{" "}
      {invoice && (
        <InvoiceDrawer
          invoice={invoices.data?.find((i) => i.id === invoice.id) ?? invoice}
          accounts={ac}
          cardName={cardName(invoice.card_id)}
          preferredAccount={
            ca.find((c) => c.id === invoice.card_id)?.payment_account_id ??
            undefined
          }
          today={today}
          onClose={() => setInvoice(null)}
        />
      )}{" "}
      {editRecurrence && (
        <RecurrenceEditor
          recurrence={editRecurrence}
          onClose={() => setEditRecurrence(null)}
        />
      )}
      <Drawer
        title={t("Estornar lançamento")}
        open={!!reverse}
        onClose={() => setReverse(null)}
        footer={
          <>
            <Button onClick={() => setReverse(null)}>{t("Cancelar")}</Button>
            <Button
              variant="danger"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await actions(
                    reverse!.type === "transaction"
                      ? `/transactions/${reverse!.id}/reverse`
                      : `/purchases/${reverse!.id}/${reverse!.action}`,
                    { reason },
                    "POST",
                    reverseKey,
                  );
                  setReverse(null);
                  setReason("");
                  toast(t("Estorno registrado"));
                } catch (e) {
                  toast((e as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("Confirmar estorno")}
            </Button>
          </>
        }
      >
        <p className="form-help" style={{ marginBottom: 24 }}>
          {t("O histórico será preservado. Compras em faturas fechadas geram um crédito em uma fatura aberta.")}
        </p>
        <Field label={t("Motivo do estorno")}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("Descreva o motivo desta correção…")}
          />
        </Field>
      </Drawer>
    </div>
  );
}
function InvoiceDrawer({
  invoice,
  accounts,
  cardName,
  preferredAccount,
  today,
  onClose,
}: {
  invoice: Invoice;
  accounts: Account[];
  cardName: string;
  preferredAccount?: string;
  today: string;
  onClose: () => void;
}) {
  const t = useT();
  const [amount, setAmount] = useState(
    moneyInput(Math.max(0, invoice.remaining)),
  );
  const [account, setAccount] = useState(
    accounts.find((a) => a.id === preferredAccount)?.id ??
      accounts[0]?.id ??
      "",
  );
  const [date, setDate] = useState(today);
  const [key, setKey] = useState(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = useActions();
  const toast = useToast();
  return (
    <Drawer
      open
      title={t("Fatura · {{name}}", { name: cardName })}
      description={t("Vencimento em {{date}}", { date: dateLabel(invoice.due_date, { day: "numeric", month: "long" }) })}
      onClose={onClose}
      footer={<Button onClick={onClose}>{t("Fechar")}</Button>}
    >
      <div className="between">
        <h1>{money(invoice.remaining)}</h1>
        <Badge tone={invoice.status === "paid" ? "teal" : "blue"}>
          {t(statusNames[invoice.status])}
        </Badge>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        {t("Total {{total}} · Pago {{paid}}", { total: money(invoice.total), paid: money(invoice.paid) })}
      </p>
      <div className="divider" />
      {invoice.items.map((i) => (
        <div className="transaction-row" key={i.id}>
          <div className="row-content">
            <strong>{i.description}</strong>
            <small>{t("Parcela {{number}}", { number: i.number })}</small>
          </div>
          <span className="mono">{money(i.amount)}</span>
        </div>
      ))}
      {invoice.remaining > 0 && (
        <>
          <div className="divider" />
          <h3 style={{ marginBottom: 20 }}>{t("Registrar pagamento")}</h3>
          <Field label={t("Conta de pagamento")}>
            <Select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="form-grid">
            <Field label={t("Valor (R$)")}>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setKey(crypto.randomUUID());
                }}
              />
            </Field>
            <Field label={t("Data")}>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
          </div>
          <Button
            variant="primary"
            disabled={busy || !account}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await action(
                  `/invoices/${invoice.id}/payments`,
                  { account_id: account, amount: parseMoney(amount), date },
                  "POST",
                  key,
                );
                toast(t("Pagamento registrado"));
                setKey(crypto.randomUUID());
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Registrar pagamento")}
          </Button>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <p className="form-help" style={{ marginTop: 20 }}>
            {t("Você pode registrar um pagamento parcial. O valor não pode ultrapassar o saldo restante da fatura.")}
          </p>
        </>
      )}
      <div className="divider" />
      <h3>{t("Pagamentos")}</h3>
      {invoice.payments.map((p) => (
        <div key={p.id} className="transaction-row">
          <div className="row-content">
            <strong>{accounts.find((a) => a.id === p.account_id)?.name}</strong>
            <small>{dateLabel(p.date)}</small>
          </div>
          <span className="mono teal">{money(p.amount)}</span>
        </div>
      ))}
    </Drawer>
  );
}
