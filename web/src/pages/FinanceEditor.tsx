import { useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { useActions } from "../api";
import type {
  Account,
  Category,
  CreditCard as CardType,
  Transaction,
  Recurrence,
} from "../types";
import { Button, Drawer, Field, useToast } from "../components/ui";
import { installmentParts, localDate, money, parseMoney } from "../format";
export function TransactionEditor({
  accounts,
  categories,
  cards,
  onClose,
  transaction,
  today = localDate(),
}: {
  accounts: Account[];
  categories: Category[];
  cards: CardType[];
  onClose: () => void;
  transaction?: Transaction | null;
  today?: string;
}) {
  const [type, setType] = useState<string>(transaction?.kind ?? "expense");
  const [amount, setAmount] = useState(
    transaction ? (transaction.amount / 100).toFixed(2).replace(".", ",") : "",
  );
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );
  const [date, setDate] = useState(transaction?.date ?? today);
  const [account, setAccount] = useState(
    transaction?.account_id ?? accounts[0]?.id ?? "",
  );
  const [destination, setDestination] = useState(accounts[1]?.id ?? "");
  const [category, setCategory] = useState(transaction?.category_id ?? "");
  const [card, setCard] = useState(cards[0]?.id ?? "");
  const [count, setCount] = useState(1);
  const [status, setStatus] = useState(transaction?.status ?? "posted");
  const [recurring, setRecurring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [key] = useState(crypto.randomUUID());
  const actions = useActions();
  const toast = useToast();
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
      if (!description.trim()) throw new Error("Adicione uma descrição.");
      if (type === "card") {
        await actions(
          "/purchases",
          {
            card_id: card,
            category_id: category || null,
            description,
            amount: value,
            installment_count: count,
            purchase_date: date,
          },
          "POST",
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
        await actions("/recurrences", {
          account_id: account,
          category_id: category || null,
          kind: type,
          amount: value,
          currency: accounts.find((a) => a.id === account)?.currency ?? "BRL",
          description,
          start_date: date,
          day_of_month: Number(date.slice(-2)),
        });
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
      toast(recurring ? "Recorrência criada" : "Transação salva");
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Drawer
      title={transaction ? "Editar transação" : "Nova transação"}
      open
      onClose={onClose}
      description="Tudo sob controle, até o último centavo"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            <Check size={17} />
            {busy ? "Salvando…" : "Confirmar transação"}
          </Button>
        </>
      }
    >
      <Field label="Tipo de operação">
        <div className="tabs">
          {[
            ["expense", "Despesa"],
            ["income", "Receita"],
            ["transfer", "Transf."],
            ["card", "Cartão"],
          ].map(([k, label]) => (
            <button
              disabled={!!transaction}
              key={k}
              className={type === k ? "active" : ""}
              onClick={() => {
                setType(k);
                setCategory("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Valor da operação · BRL">
        <input
          className="money-input"
          inputMode="decimal"
          autoFocus
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="Descrição">
        <input
          value={description}
          maxLength={200}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex.: Almoço, mercado, salário…"
        />
      </Field>
      <div className="form-grid">
        {type !== "transfer" && (
          <Field label="Categoria">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Sem categoria</option>
              {categories
                .filter(
                  (c) => c.kind === (type === "income" ? "income" : "expense"),
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <Field label="Data">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      {type === "card" ? (
        <>
          <Field label="Cartão de crédito">
            <select value={card} onChange={(e) => setCard(e.target.value)}>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (••{c.last_four})
                </option>
              ))}
            </select>
            {!cards.length && (
              <small>Crie um cartão na página de finanças primeiro.</small>
            )}
          </Field>
          <div className="form-help">
            <div className="row">
              <CreditCard size={17} className="teal" />
              <strong>Compra parcelada</strong>
            </div>
            <Field label="Número de parcelas">
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
                  As parcelas somam exatamente{" "}
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
          <Field label={type === "transfer" ? "Conta de origem" : "Conta"}>
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
            {!accounts.length && (
              <small>Crie uma conta na página de finanças primeiro.</small>
            )}
          </Field>
          {type === "transfer" ? (
            <Field label="Conta de destino">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="">Selecione a conta</option>
                {accounts
                  .filter((a) => a.id !== account)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Situação">
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as Transaction["status"])
                  }
                >
                  <option value="posted">Realizada</option>
                  <option value="planned">Prevista</option>
                  {transaction && <option value="cancelled">Cancelada</option>}
                </select>
              </Field>
              {!transaction && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                  />
                  Repetir mensalmente neste dia
                </label>
              )}
              {recurring && (
                <p className="form-help">
                  A recorrência gera lançamentos previstos. Confirme cada um
                  quando o pagamento acontecer.
                </p>
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
  return (
    <Drawer
      title={
        kind === "accounts"
          ? "Nova conta"
          : kind === "categories"
            ? "Nova categoria"
            : "Novo cartão"
      }
      open
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
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
                        opening_balance: opening ? parseMoney(opening) : 0,
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
                toast("Registro criado");
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <Field label="Nome">
        <input
          autoFocus
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      {kind === "accounts" && (
        <>
          <Field label="Tipo de conta">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="checking">Conta corrente</option>
              <option value="savings">Reserva / Poupança</option>
              <option value="cash">Dinheiro</option>
            </select>
          </Field>
          <Field label="Saldo inicial (R$)">
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </Field>
        </>
      )}
      {kind === "categories" && (
        <Field label="Tipo">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
        </Field>
      )}
      {kind === "cards" && (
        <>
          <Field label="Últimos quatro dígitos">
            <input
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]{4}"
              value={last}
              onChange={(e) => setLast(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
          <div className="form-grid">
            <Field label="Dia de fechamento">
              <input
                type="number"
                min={1}
                max={31}
                value={closeDay}
                onChange={(e) => setCloseDay(e.target.value)}
              />
            </Field>
            <Field label="Dia de vencimento">
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Limite (R$) · opcional">
            <input
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </Field>
          <Field label="Conta de pagamento">
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Selecionar ao pagar</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <p className="form-help">
            Informe somente os últimos quatro dígitos. O Orbit não precisa do
            número completo nem do código de segurança.
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
  const [amount, setAmount] = useState(
    (recurrence.amount / 100).toFixed(2).replace(".", ","),
  );
  const [description, setDescription] = useState(recurrence.description);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const action = useActions();
  const toast = useToast();
  return (
    <Drawer
      open
      title="Editar recorrência"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
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
                  },
                  "PATCH",
                );
                toast("Recorrência atualizada");
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <Field label="Descrição">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <Field label="Valor (R$)">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <p className="form-help">
        Os lançamentos já realizados permanecem no histórico. As alterações
        orientam novas ocorrências.
      </p>
      {error && <p className="form-error">{error}</p>}
    </Drawer>
  );
}
