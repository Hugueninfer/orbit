import { useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { useActions } from "../api";
import type {
  Account,
  Category,
  CreditCard as CardType,
  Transaction,
  Recurrence,
  Purchase,
} from "../types";
import { Button, Drawer, Field, useToast } from "../components/ui";
import { Select } from "../components/Select";
import { useT } from "../i18n";
import {
  installmentParts,
  localDate,
  money,
  moneyInput,
  parseMoney,
  parseBalance,
} from "../format";
export function TransactionEditor({
  accounts,
  categories,
  cards,
  onClose,
  transaction,
  purchase,
  today = localDate(),
}: {
  accounts: Account[];
  categories: Category[];
  cards: CardType[];
  onClose: () => void;
  transaction?: Transaction | null;
  purchase?: Purchase | null;
  today?: string;
}) {
  const [type, setType] = useState<string>(
    purchase ? "card" : (transaction?.kind ?? "expense"),
  );
  const [amount, setAmount] = useState(
    transaction || purchase ? moneyInput(transaction?.amount ?? purchase!.amount) : "",
  );
  const [description, setDescription] = useState(
    transaction?.description ?? purchase?.description ?? "",
  );
  const [date, setDate] = useState(
    transaction?.date ?? purchase?.purchase_date ?? today,
  );
  const [account, setAccount] = useState(
    transaction?.account_id ?? accounts[0]?.id ?? "",
  );
  const [destination, setDestination] = useState(accounts[1]?.id ?? "");
  const [category, setCategory] = useState(
    transaction?.category_id ?? purchase?.category_id ?? "",
  );
  const [card, setCard] = useState(purchase?.card_id ?? cards[0]?.id ?? "");
  const [count, setCount] = useState(purchase?.installment_count ?? 1);
  const [status, setStatus] = useState(transaction?.status ?? "posted");
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [interval, setInterval] = useState(1);
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key] = useState(crypto.randomUUID());
  const actions = useActions();
  const toast = useToast();
  const t = useT();
  let parts: number[] = [];
  try {
    parts = installmentParts(parseMoney(amount), count);
  } catch {
    /* preview is displayed only for valid amount */
  }
  async function save() {
    setError("");
    setBusy(true);
    try {
      const value = parseMoney(amount);
      if (!description.trim()) throw new Error(t("Adicione uma descrição."));
      if (type === "card") {
        await actions(
          purchase ? `/purchases/${purchase.id}` : "/purchases",
          {
            ...(purchase ? { version: purchase.version } : { card_id: card }),
            category_id: category || null,
            description,
            amount: value,
            installment_count: count,
            purchase_date: date,
          },
          purchase ? "PATCH" : "POST",
          key,
        );
      } else if (type === "transfer") {
        await actions(
          "/transfers",
          {
            from_account_id: account,
            to_account_id: destination,
            amount: value,
            date,
            description,
          },
          "POST",
          key,
        );
      } else if (recurring && !transaction) {
        await actions(
          "/recurrences",
          {
            account_id: account,
            category_id: category || null,
            kind: type,
            amount: value,
            currency: accounts.find((a) => a.id === account)?.currency ?? "BRL",
            description,
            start_date: date,
            day_of_month: Number(date.slice(-2)),
            frequency,
            interval,
            end_date: endDate || null,
          },
          "POST",
          key,
        );
      } else {
        const payload = {
          account_id: account,
          category_id: category || null,
          kind: type,
          amount: value,
          currency: accounts.find((a) => a.id === account)?.currency ?? "BRL",
          description,
          date,
          status,
        };
        if (transaction) {
          const { kind: _, currency: __, ...editable } = payload;
          await actions(
            `/transactions/${transaction.id}`,
            { ...editable, version: transaction.version },
            "PATCH",
          );
        } else await actions("/transactions", payload, "POST", key);
      }
      toast(t(recurring ? "Recorrência criada" : "Transação salva"));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Drawer
      title={
        purchase
          ? t("Editar compra")
          : transaction
            ? t("Editar transação")
            : t("Nova transação")
      }
      open
      onClose={onClose}
      description={t("Tudo sob controle, até o último centavo")}
      footer={
        <>
          <Button onClick={onClose}>{t("Cancelar")}</Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            <Check size={17} />
            {t(busy ? "Salvando…" : "Confirmar transação")}
          </Button>
        </>
      }
    >
      <Field label={t("Tipo de operação")}>
        <div className="tabs">
          {[
            ["expense", "Despesa"],
            ["income", "Receita"],
            ["transfer", "Transf."],
            ["card", "Cartão"],
          ].map(([k, label]) => (
            <button
              disabled={!!transaction || !!purchase}
              key={k}
              className={type === k ? "active" : ""}
              onClick={() => {
                setType(k);
                setCategory("");
              }}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("Valor da operação · BRL")}>
        <input
          className="money-input"
          inputMode="decimal"
          autoFocus
          placeholder={moneyInput(0)}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label={t("Descrição")}>
        <input
          value={description}
          maxLength={200}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("Ex.: Almoço, mercado, salário…")}
        />
      </Field>
      <div className="form-grid">
        {type !== "transfer" && (
          <Field label={t("Categoria")}>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t("Sem categoria")}</option>
              {categories
                .filter(
                  (c) => c.kind === (type === "income" ? "income" : "expense"),
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
        )}
        <Field label={t("Data")}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      {type === "card" ? (
        <>
          <Field label={t("Cartão de crédito")}>
            <Select
              disabled={!!purchase}
              value={card}
              onChange={(e) => setCard(e.target.value)}
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (••{c.last_four})
                </option>
              ))}
            </Select>
            {!cards.length && (
              <small>{t("Crie um cartão na página de finanças primeiro.")}</small>
            )}
          </Field>
          <div className="form-help">
            <div className="row">
              <CreditCard size={17} className="teal" />
              <strong>{t("Compra parcelada")}</strong>
            </div>
            <Field label={t("Número de parcelas")}>
              <input
                type="number"
                min={1}
                max={60}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </Field>
            {parts.length > 0 && (
              <>
                <small>
                  {t("As parcelas somam exatamente")} {" "}
                  {money(parts.reduce((a, b) => a + b, 0))}.
                </small>
                <div className="installments">
                  {parts.map((p, i) => (
                    <div key={i}>
                      {i + 1}/{count}
                      <br />
                      {money(p)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <Field label={t(type === "transfer" ? "Conta de origem" : "Conta")}>
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
            {!accounts.length && (
              <small>{t("Crie uma conta na página de finanças primeiro.")}</small>
            )}
          </Field>
          {type === "transfer" ? (
            <Field label={t("Conta de destino")}>
              <Select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="">{t("Selecione a conta")}</option>
                {accounts
                  .filter((a) => a.id !== account)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </Select>
            </Field>
          ) : (
            <>
              <Field label={t("Situação")}>
                <Select
                  disabled={recurring}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as Transaction["status"])
                  }
                >
                  <option value="posted">{t("Realizada")}</option>
                  <option value="planned">{t("Prevista")}</option>
                  {transaction && <option value="cancelled">{t("Cancelada")}</option>}
                </Select>
              </Field>
              {!transaction && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                  />
                  {t("Repetir esta transação")}
                </label>
              )}
              {recurring && (
                <>
                  <RecurrenceFields
                    frequency={frequency}
                    setFrequency={setFrequency}
                    interval={interval}
                    setInterval={setInterval}
                    endDate={endDate}
                    setEndDate={setEndDate}
                    minDate={date}
                  />
                  <p className="form-help">
                    {t("Os próximos lançamentos serão criados como previstos. Confirme cada um quando o pagamento acontecer.")}
                  </p>
                </>
              )}
            </>
          )}
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Drawer>
  );
}
export function FinanceResourceEditor({
  kind,
  accounts,
  onClose,
}: {
  kind: "accounts" | "categories" | "cards";
  accounts: Account[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState(
    kind === "categories" ? "expense" : "checking",
  );
  const [opening, setOpening] = useState("");
  const [closeDay, setCloseDay] = useState("25");
  const [dueDay, setDueDay] = useState("5");
  const [last, setLast] = useState("");
  const [account, setAccount] = useState(accounts[0]?.id ?? "");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actions = useActions();
  const toast = useToast();
  const t = useT();
  return (
    <Drawer
      title={
        kind === "accounts"
          ? t("Nova conta")
          : kind === "categories"
            ? t("Nova categoria")
            : t("Novo cartão")
      }
      open
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("Cancelar")}</Button>
          <Button
            variant="primary"
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const payload =
                  kind === "accounts"
                    ? {
                        name,
                        type,
                        currency: "BRL",
                        opening_balance: opening ? parseBalance(opening) : 0,
                        color: "#44e2cd",
                      }
                    : kind === "categories"
                      ? { name, kind: type, color: "#7692ff" }
                      : {
                          name,
                          last_four: last || "0000",
                          currency: "BRL",
                          close_day: Number(closeDay),
                          due_day: Number(dueDay),
                          limit_amount: limit ? parseMoney(limit) : null,
                          payment_account_id: account || null,
                          color: "#b7c4ff",
                        };
                await actions("/" + kind, payload);
                toast(t("Registro criado"));
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Salvar")}
          </Button>
        </>
      }
    >
      <Field label={t("Nome")}>
        <input
          autoFocus
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      {kind === "accounts" && (
        <>
          <Field label={t("Tipo de conta")}>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="checking">{t("Conta corrente")}</option>
              <option value="savings">{t("Reserva / Poupança")}</option>
              <option value="cash">{t("Dinheiro")}</option>
            </Select>
          </Field>
          <Field label={t("Saldo inicial (R$)")}>
            <input
              inputMode="decimal"
              placeholder={moneyInput(0)}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </Field>
        </>
      )}
      {kind === "categories" && (
        <Field label={t("Tipo")}>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">{t("Despesa")}</option>
            <option value="income">{t("Receita")}</option>
          </Select>
        </Field>
      )}
      {kind === "cards" && (
        <>
          <Field label={t("Últimos quatro dígitos")}>
            <input
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]{4}"
              value={last}
              onChange={(e) => setLast(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <div className="form-grid">
            <Field label={t("Dia de fechamento")}>
              <input
                type="number"
                min={1}
                max={31}
                value={closeDay}
                onChange={(e) => setCloseDay(e.target.value)}
              />
            </Field>
            <Field label={t("Dia de vencimento")}>
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </Field>
          </div>
          <Field label={t("Limite (R$) · opcional")}>
            <input
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </Field>
          <Field label={t("Conta de pagamento")}>
            <Select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">{t("Selecionar ao pagar")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <p className="form-help">
            {t("Informe somente os últimos quatro dígitos. O Orbit não precisa do número completo nem do código de segurança.")}
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </Drawer>
  );
}
export function RecurrenceEditor({
  recurrence,
  onClose,
}: {
  recurrence: Recurrence;
  onClose: () => void;
}) {
  const t = useT();
  const [amount, setAmount] = useState(
    moneyInput(recurrence.amount),
  );
  const [description, setDescription] = useState(recurrence.description);
  const [frequency, setFrequency] = useState<Frequency>(recurrence.frequency);
  const [interval, setInterval] = useState(recurrence.interval);
  const [endDate, setEndDate] = useState(recurrence.end_date ?? "");
  const [day, setDay] = useState(recurrence.day_of_month);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = useActions();
  const toast = useToast();
  return (
    <Drawer
      open
      title={t("Editar recorrência")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("Cancelar")}</Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await action(
                  `/recurrences/${recurrence.id}`,
                  {
                    version: recurrence.version,
                    amount: parseMoney(amount),
                    description,
                    frequency,
                    interval,
                    end_date: endDate || null,
                    day_of_month: day,
                  },
                  "PATCH",
                );
                toast(t("Recorrência atualizada"));
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Salvar")}
          </Button>
        </>
      }
    >
      <Field label={t("Descrição")}>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label={t("Valor (R$)")}>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <RecurrenceFields
        frequency={frequency}
        setFrequency={setFrequency}
        interval={interval}
        setInterval={setInterval}
        endDate={endDate}
        setEndDate={setEndDate}
        minDate={recurrence.start_date}
      />
      {frequency === "monthly" && (
        <Field label={t("Dia do mês")}>
          <input
            type="number"
            min={1}
            max={31}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          />
        </Field>
      )}
      <p className="form-help">
        {t("Os lançamentos já realizados permanecem no histórico. As alterações atualizam os lançamentos futuros previstos. O histórico já realizado é preservado.")}
      </p>
      {error && <p className="form-error">{error}</p>}
    </Drawer>
  );
}

type Frequency = "daily" | "weekly" | "monthly" | "yearly";
export const frequencyNames: Record<Frequency, string> = {
  daily: "dia(s)",
  weekly: "semana(s)",
  monthly: "mês(es)",
  yearly: "ano(s)",
};
function RecurrenceFields({
  frequency,
  setFrequency,
  interval,
  setInterval,
  endDate,
  setEndDate,
  minDate,
}: {
  frequency: Frequency;
  setFrequency: (v: Frequency) => void;
  interval: number;
  setInterval: (v: number) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  minDate: string;
}) {
  const t = useT();
  return (
    <>
      <div className="form-grid">
        <Field label={t("Repetir a cada")}>
          <input
            type="number"
            min={1}
            max={365}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          />
        </Field>
        <Field label={t("Frequência")}>
          <Select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            {Object.entries(frequencyNames).map(([value, label]) => (
              <option value={value} key={value}>
                {t(label)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("Data final (opcional)")}>
        <input
          type="date"
          min={minDate}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </Field>
    </>
  );
}
