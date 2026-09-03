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
import { dateLabel, localDate, money, parseMoney } from "../format";
import {
  FinanceResourceEditor,
  TransactionEditor,
  RecurrenceEditor,
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
  const filtered = tx.filter(
    (t) =>
      t.date.startsWith(month) &&
      t.description.toLowerCase().includes(search.toLowerCase()) &&
      (tab === "all" || t.kind === tab),
  );
  const cardName = (id: string) =>
    ca.find((c) => c.id === id)?.name ?? "Cartão";
  function exportCsv() {
    const safe = (s: string) =>
      '"' + (/^[=+\-@\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"';
    const csv = [
      "Data;Descrição;Tipo;Valor (centavos);Situação",
      ...filtered.map((t) =>
        [t.date, safe(t.description), t.kind, t.amount, t.status].join(";"),
      ),
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
  if (accounts.isLoading || transactions.isLoading) return <Loading />;
  if (accounts.error)
    return (
      <ErrorState error={accounts.error} retry={() => accounts.refetch()} />
    );
  return (
    <div className="page">
      <div className="toolbar">
        <div className="tabs">
          <button
            className={basis === "cash" ? "active" : ""}
            onClick={() => setBasis("cash")}
          >
            Visão de caixa
          </button>
          <button
            className={basis === "accrual" ? "active" : ""}
            onClick={() => setBasis("accrual")}
          >
            Competência
          </button>
        </div>
        <input
          aria-label="Mês financeiro"
          className="control"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ width: 160 }}
        />
        <AddButton onClick={() => setParams({ new: "1" })}>
          Nova transação
        </AddButton>
      </div>
      <div className="stats">
        <Stat
          label="SALDO CONSOLIDADO"
          value={money(ac.reduce((s, a) => s + a.current_balance, 0))}
          icon={<Wallet />}
        >
          <p>{ac.length} contas · saldo atual</p>
        </Stat>
        <Stat
          label="RECEITAS DO MÊS"
          value={
            <span className="teal">{money(report.data?.income ?? 0)}</span>
          }
          icon={<ArrowDownLeft />}
        >
          <p>
            {basis === "cash"
              ? "Entradas realizadas"
              : "Receitas por competência"}
          </p>
        </Stat>
        <Stat
          label="DESPESAS DO MÊS"
          value={money(report.data?.expenses ?? 0)}
          icon={<ArrowUpRight />}
        >
          <p>
            {basis === "cash"
              ? "Saídas realizadas"
              : "Despesas por competência"}
          </p>
        </Stat>
        <Stat
          label="RESULTADO DO MÊS"
          value={
            <span className={(report.data?.net ?? 0) >= 0 ? "teal" : "red"}>
              {money(report.data?.net ?? 0)}
            </span>
          }
          icon={<CalendarDays />}
        >
          <p>Receitas menos despesas</p>
        </Stat>
      </div>
      <section>
        <div className="card-title">
          <h2>
            <CreditCard />
            Cartões de crédito & faturas <Badge>{ca.length} cartões</Badge>
          </h2>
          <Button onClick={() => setResource("cards")}>
            <Plus size={15} />
            Novo cartão
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
                      {inv ? statusNames[inv.status] : "Sem pendências"}
                    </Badge>
                  </div>
                  <h3>{c.name}</h3>
                  <div>
                    <div className="between" style={{ marginBottom: 9 }}>
                      <small>Próxima fatura</small>
                      <strong>{money(inv?.remaining ?? 0)}</strong>
                    </div>
                    <Progress
                      value={
                        c.limit_amount ? (total / c.limit_amount) * 100 : 0
                      }
                    />
                    <div className="between" style={{ marginTop: 9 }}>
                      <small className="mono">Fecha dia {c.close_day}</small>
                      <small className="mono">Vence dia {c.due_day}</small>
                    </div>
                  </div>
                  <div className="between">
                    <small>
                      {c.limit_amount
                        ? `Limite: ${money(c.limit_amount)}`
                        : "Sem limite informado"}
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
                      Ver faturas
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <Empty
              title="Seus cartões, organizados"
              description="Cadastre um cartão para acompanhar parcelas, fechamento e vencimento."
              action={
                <AddButton onClick={() => setResource("cards")}>
                  Adicionar cartão
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
                Nova conta
              </Button>
            }
          >
            <Wallet />
            Suas contas
          </CardTitle>
          {ac.length ? (
            ac.map((a) => (
              <div className="transaction-row" key={a.id}>
                <div className="icon-box" style={{ color: a.color }}>
                  <Wallet size={20} />
                </div>
                <div className="row-content">
                  <strong>{a.name}</strong>
                  <small>Projetado: {money(a.projected_balance)}</small>
                </div>
                <span className="mono">{money(a.current_balance)}</span>
              </div>
            ))
          ) : (
            <Empty
              title="Comece pela sua primeira conta"
              description="Informe o saldo inicial para acompanhar as movimentações."
            />
          )}
        </Card>
        <Card>
          <CardTitle>Distribuição de despesas</CardTitle>
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
            <Empty description="Suas despesas por categoria aparecerão aqui." />
          )}
        </Card>
      </div>
      <Card>
        <CardTitle
          action={
            <Button onClick={exportCsv}>
              <Download size={15} />
              Exportar CSV
            </Button>
          }
        >
          Transações & compromissos
        </CardTitle>
        <div className="toolbar" style={{ marginBottom: 20 }}>
          <div className="tabs">
            {[
              ["all", "Todas"],
              ["expense", "Despesas"],
              ["income", "Receitas"],
              ["purchases", "Compras"],
              ["invoices", "Faturas"],
              ["recurrences", "Recorrências"],
            ].map(([k, l]) => (
              <button
                key={k}
                className={tab === k ? "active" : ""}
                onClick={() => setTab(k)}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={15} />
            <input
              aria-label="Buscar transações"
              placeholder="Buscar transações…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
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
                    Fecha {dateLabel(i.close_date)} · Vence{" "}
                    {dateLabel(i.due_date)}
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
                  {statusNames[i.status]}
                </Badge>
                <span className="mono">{money(i.remaining)}</span>
                <Button onClick={() => setInvoice(i)}>Abrir</Button>
              </div>
            ))
          ) : (
            <Empty description="As faturas são criadas ao registrar compras no cartão." />
          )
        ) : tab === "purchases" ? (
          (purchases.data ?? [])
            .filter((p) =>
              p.description.toLowerCase().includes(search.toLowerCase()),
            )
            .map((p) => (
              <div className="transaction-row" key={p.id}>
                <span className="icon-box">
                  <CreditCard size={18} />
                </span>
                <div className="row-content">
                  <strong>{p.description}</strong>
                  <small>
                    {cardName(p.card_id)} · {p.installment_count} parcelas ·{" "}
                    {dateLabel(p.purchase_date)}
                  </small>
                </div>
                <Badge>{statusNames[p.status]}</Badge>
                <span className="mono">{money(p.amount)}</span>
                {p.status === "active" && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setReverseKey(crypto.randomUUID());
                      setReverse({
                        id: p.id,
                        type: "purchase",
                        action: p.installments.every(
                          (i) => i.close_date >= today,
                        )
                          ? "cancel"
                          : "refund",
                      });
                    }}
                  >
                    Estornar
                  </Button>
                )}
              </div>
            ))
        ) : tab === "recurrences" ? (
          <>
            <div className="between" style={{ marginBottom: 18 }}>
              <small>
                Lançamentos previstos, sem alterar seu histórico realizado.
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
                    toast(`${result.created} lançamentos previstos gerados`);
                  } catch (e) {
                    toast((e as Error).message, true);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Repeat2 size={15} />
                Gerar próximos 3 meses
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
                    Todo dia {r.day_of_month} · {r.active ? "Ativa" : "Pausada"}
                  </small>
                </div>
                <span className="mono">{money(r.amount)}</span>
                <button
                  className="icon-button"
                  aria-label={`Editar ${r.description}`}
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
                        r.active
                          ? "Recorrência pausada"
                          : "Recorrência ativada",
                      );
                    } catch (e) {
                      toast((e as Error).message, true);
                    }
                  }}
                >
                  {r.active ? "Pausar" : "Ativar"}
                </Button>
              </div>
            ))}
            {!recurrences.data?.length && (
              <Empty
                title="Seu planejamento mensal"
                description="Ao criar uma transação, marque a opção de repetir mensalmente."
              />
            )}
          </>
        ) : filtered.length ? (
          filtered.map((t) => (
            <div className="transaction-row" key={t.id}>
              <span className="icon-box">
                {t.transfer_id ? (
                  <ArrowLeftRight size={18} />
                ) : t.kind === "income" ? (
                  <ArrowDownLeft size={18} />
                ) : (
                  <Receipt size={18} />
                )}
              </span>
              <div className="row-content">
                <strong className={t.kind === "income" ? "teal" : ""}>
                  {t.description}
                </strong>
                <small>
                  {cats.find((c) => c.id === t.category_id)?.name ??
                    (t.transfer_id ? "Transferência" : "Sem categoria")}{" "}
                  · {ac.find((a) => a.id === t.account_id)?.name}
                </small>
              </div>
              <div className="mono muted desktop-only">{dateLabel(t.date)}</div>
              <div className={`amount ${t.kind === "income" ? "teal" : ""}`}>
                {t.kind === "income" ? "+" : "−"} {money(t.amount)}
                <small className={t.is_overdue ? "red" : "muted"}>
                  {t.is_overdue ? "Vencida" : statusNames[t.status]}
                </small>
              </div>
              {t.status === "planned" ? (
                <button
                  className="icon-button"
                  onClick={() => setEditing(t)}
                  aria-label={`Editar ${t.description}`}
                >
                  <Pencil size={15} />
                </button>
              ) : t.status === "posted" && !t.transfer_id && !t.invoice_id ? (
                <button
                  className="icon-button"
                  aria-label={`Estornar ${t.description}`}
                  onClick={() => {
                    setReverseKey(crypto.randomUUID());
                    setReverse({ id: t.id, type: "transaction" });
                  }}
                >
                  <Repeat2 size={15} />
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <Empty
            title="Nenhuma transação neste período"
            description="Registre uma movimentação ou selecione outro mês."
            action={
              <AddButton onClick={() => setParams({ new: "1" })}>
                Nova transação
              </AddButton>
            }
          />
        )}
        <div className="divider" />
        <Button variant="ghost" onClick={() => setResource("categories")}>
          <Plus size={15} />
          Adicionar categoria
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
        title="Estornar lançamento"
        open={!!reverse}
        onClose={() => setReverse(null)}
        footer={
          <>
            <Button onClick={() => setReverse(null)}>Cancelar</Button>
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
                  toast("Estorno registrado");
                } catch (e) {
                  toast((e as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Confirmar estorno
            </Button>
          </>
        }
      >
        <p className="form-help" style={{ marginBottom: 24 }}>
          O histórico será preservado. Compras em faturas fechadas geram um
          crédito em uma fatura aberta.
        </p>
        <Field label="Motivo do estorno">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo desta correção…"
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
  today,
  onClose,
}: {
  invoice: Invoice;
  accounts: Account[];
  cardName: string;
  today: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(
    (Math.max(0, invoice.remaining) / 100).toFixed(2).replace(".", ","),
  );
  const [account, setAccount] = useState(accounts[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [key, setKey] = useState(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = useActions();
  const toast = useToast();
  return (
    <Drawer
      open
      title={`Fatura · ${cardName}`}
      description={`Vencimento em ${dateLabel(invoice.due_date, { day: "numeric", month: "long" })}`}
      onClose={onClose}
      footer={<Button onClick={onClose}>Fechar</Button>}
    >
      <div className="between">
        <h1>{money(invoice.remaining)}</h1>
        <Badge tone={invoice.status === "paid" ? "teal" : "blue"}>
          {statusNames[invoice.status]}
        </Badge>
      </div>
      <p className="muted" style={{ marginTop: 8 }}>
        Total {money(invoice.total)} · Pago {money(invoice.paid)}
      </p>
      <div className="divider" />
      {invoice.items.map((i) => (
        <div className="transaction-row" key={i.id}>
          <div className="row-content">
            <strong>{i.description}</strong>
            <small>Parcela {i.number}</small>
          </div>
          <span className="mono">{money(i.amount)}</span>
        </div>
      ))}
      {invoice.remaining > 0 && (
        <>
          <div className="divider" />
          <h3 style={{ marginBottom: 20 }}>Registrar pagamento</h3>
          <Field label="Conta de pagamento">
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Valor (R$)">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setKey(crypto.randomUUID());
                }}
              />
            </Field>
            <Field label="Data">
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
                toast("Pagamento registrado");
                setKey(crypto.randomUUID());
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Registrar pagamento
          </Button>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <p className="form-help" style={{ marginTop: 20 }}>
            Você pode registrar um pagamento parcial. O valor não pode
            ultrapassar o saldo restante da fatura.
          </p>
        </>
      )}
      <div className="divider" />
      <h3>Pagamentos</h3>
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
