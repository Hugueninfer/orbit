import { Select } from "../components/Select";
import { t, useLocale, getLocale, setLocale, locales } from "../i18n";
import { money, parseMoney, moneyInput } from "../format";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CircleUserRound,
  ShieldCheck,
  Settings2,
  LogOut,
  RotateCcw,
  Cable,
  Save,
  History,
} from "lucide-react";
import { useApi, useActions, logout } from "../api";
import type { Profile, Telegram, Account } from "../types";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Confirm,
  ErrorState,
  Field,
  Loading,
  useToast,
} from "../components/ui";
const auditActions: Record<string, string> = {
  created: "Criado",
  updated: "Atualizado",
  deleted: "Excluído",
  archived: "Arquivado",
  restored: "Restaurado",
  transferred: "Transferido",
  purchased: "Compra registrada",
  payment_created: "Pagamento",
  reversal_reason: "Estorno",
  correction_reason: "Histórico corrigido",
  history_edit_reason: "Histórico corrigido",
  session_started: "Treino iniciado",
  purchase_plan_regenerated: "Parcelas recalculadas",
  checkin_created: "Hábito marcado",
  checkin_removed: "Marcação removida",
};
const auditEntities: Record<string, string> = {
  profile: "Perfil",
  account: "Conta",
  category: "Categoria",
  card: "Cartão",
  transaction: "Transação",
  purchase: "Compra",
  invoice: "Fatura",
  recurrence: "Recorrência",
  task: "Tarefa",
  habit: "Hábito",
  exercise: "Exercício",
  routine: "Rotina",
  session: "Sessão",
  task_list: "Lista de tarefas",
  workout_set: "Série",
  session_exercise: "Exercício da sessão",
  installment: "Parcela",
  telegram_link: "Vínculo Telegram",
};
export default function Settings() {
  const locale = useLocale();

  const me = useApi<Profile>("/me");
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [week, setWeek] = useState(0);
  const [weight, setWeight] = useState("kg");
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [error, setError] = useState("");
  const action = useActions();
  const toast = useToast();
  const audit = useApi<
    { id: string; action: string; entity_type: string; created_at: string }[]
  >("/audit", showAudit);
  useEffect(() => {
    if (me.data) {
      setName(me.data.name);
      setTimezone(me.data.timezone);
      setWeek(me.data.week_start);
      setWeight(me.data.weight_unit);
    }
  }, [
    me.data?.id,
    me.data?.name,
    me.data?.timezone,
    me.data?.week_start,
    me.data?.weight_unit,
  ]);
  if (me.isLoading) return <Loading />;
  if (me.error)
    return <ErrorState error={me.error} retry={() => me.refetch()} />;
  const profile = me.data!;
  return (
    <div className="page settings">
      <div className="page-heading">
        <div>
          <h1>{t("Seu Orbit, do seu jeito")}</h1>
          <p>{t("Perfil, preferências e segurança.")}</p>
        </div>
        <Button
          variant="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await action(
                "/me",
                {
                  version: profile.version,
                  name,
                  timezone,
                  week_start: week,
                  weight_unit: weight,
                  locale,
                },
                "PATCH",
              );
              toast(t("Preferências salvas"));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save size={16} />
          {t("Salvar alterações")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Card>
        <CardTitle>
          <CircleUserRound />
          {t("Perfil & identidade")}
        </CardTitle>
        <div className="row" style={{ margin: "20px 0 28px" }}>
          <span className="avatar">
            {name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <h3>{name}</h3>
            <small>
              {profile.is_demo
                ? t("Seu espaço de demonstração")
                : t("Sua central pessoal")}
            </small>
          </div>
        </div>
        <Field label={t("Nome completo")}>
          <input
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label={t("Fuso horário")}>
            <Select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {Array.from(
                new Set([
                  timezone,
                  "America/Sao_Paulo",
                  "America/Manaus",
                  "America/Recife",
                  "America/Fortaleza",
                  "America/Belem",
                  "America/Rio_Branco",
                  "America/New_York",
                  "Europe/Lisbon",
                  "Europe/Paris",
                  "UTC",
                ]),
              ).map((z) => (
                <option key={z}>{z}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("Idioma")}>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {locales.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>
      <Card>
        <CardTitle>
          <Settings2 />
          {t("Preferências operacionais")}
        </CardTitle>
        <p>{t("Ajuste os detalhes da sua rotina.")}</p>
        <div className="form-grid">
          <Field label={t("Primeiro dia da semana")}>
            <Select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {[
                t("Segunda-feira"),
                t("Terça-feira"),
                t("Quarta-feira"),
                t("Quinta-feira"),
                t("Sexta-feira"),
                t("Sábado"),
                t("Domingo"),
              ].map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Unidade de peso")}>
            <Select value={weight} onChange={(e) => setWeight(e.target.value)}>
              <option value="kg">{t("Quilogramas (kg)")}</option>
              <option value="lb">{t("Libras (lb)")}</option>
            </Select>
          </Field>
        </div>
        <div className="form-grid">
          <Field label={t("Moeda padrão")}>
            <Select value="BRL" disabled>
              <option value="BRL">{t("Real brasileiro (BRL)")}</option>
            </Select>
          </Field>
          <Field label={t("Aparência")}>
            <Select value="dark" disabled>
              <option value="dark">{t("Dark Orbital")}</option>
            </Select>
          </Field>
        </div>
      </Card>
      <Card>
        <CardTitle>
          <ShieldCheck />
          {t("Segurança & acesso")}
        </CardTitle>
        <p>
          {profile.is_demo
            ? t("Esta sessão é temporária e contém apenas dados fictícios.")
            : t(
                "Seu acesso é individual. Encerre a sessão ao terminar em um dispositivo compartilhado.",
              )}
        </p>
        <div className="between">
          <Badge tone="teal">
            {profile.is_demo
              ? t("Demonstração isolada")
              : t("Acesso individual")}
          </Badge>
          <Button onClick={() => logout()}>
            <LogOut size={16} />
            {t("Sair da conta")}
          </Button>
        </div>
      </Card>
      <Card>
        <CardTitle>
          <Cable />
          {t("Integrações")}
        </CardTitle>
        <Link className="between" to="/integracoes">
          <div>
            <h3>{t("Telegram Áudio")}</h3>
            <p className="muted" style={{ marginTop: 7 }}>
              {t("Registro de despesas por mensagem de voz.")}
            </p>
          </div>
          <span className="button">{t("Configurar")}</span>
        </Link>
      </Card>
      <Card>
        <CardTitle
          action={
            <Button onClick={() => setShowAudit(!showAudit)}>
              {showAudit ? t("Ocultar") : t("Ver atividade")}
            </Button>
          }
        >
          <History />
          {t("Histórico de alterações")}
        </CardTitle>
        <p>{t("Correções e ações importantes ficam registradas.")}</p>
        {showAudit &&
          (audit.isLoading ? (
            <Loading />
          ) : audit.error ? (
            <ErrorState error={audit.error} />
          ) : (
            audit.data?.map((a) => (
              <div key={a.id} className="transaction-row">
                <div className="row-content">
                  <strong>{t(auditActions[a.action] ?? "Atualizado")}</strong>
                  <small>{t(auditEntities[a.entity_type] ?? "Registro")}</small>
                </div>
                <small>
                  {new Date(a.created_at).toLocaleString(getLocale(), {
                    timeZone: timezone,
                  })}
                </small>
              </div>
            ))
          ))}
      </Card>
      {profile.is_demo && (
        <Card>
          <CardTitle>
            <RotateCcw />
            {t("Recomeçar a demonstração")}
          </CardTitle>
          <p>
            {t(
              "Restaure os dados fictícios desta sessão para explorar o Orbit novamente.",
            )}
          </p>
          <Button variant="danger" onClick={() => setReset(true)}>
            {t("Restaurar minha demo")}
          </Button>
        </Card>
      )}
      <Confirm
        title={t("Restaurar os dados da demonstração?")}
        open={reset}
        onClose={() => setReset(false)}
        pending={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await action("/auth/demo/reset", {});
            setReset(false);
            toast(t("Sua demonstração foi restaurada"));
          } catch (e) {
            toast((e as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t(
          "As alterações feitas nesta sessão serão substituídas pelos exemplos iniciais. Isso afeta somente seu espaço de demonstração.",
        )}
      </Confirm>
    </div>
  );
}
export function Integrations() {
  useLocale();

  const status = useApi<Telegram>("/integrations/telegram");
  const accounts = useApi<Account[]>("/accounts");
  const [description, setDescription] = useState(t("Café da tarde"));
  const [amount, setAmount] = useState(() => moneyInput(850));
  const [accountId, setAccountId] = useState("");
  const [code, setCode] = useState<{
    code: string;
    expires_at: string;
    bot_url?: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const action = useActions();
  const toast = useToast();
  if (status.isLoading) return <Loading />;
  if (status.error)
    return <ErrorState error={status.error} retry={() => status.refetch()} />;
  const data = status.data!;
  return (
    <div className="page settings">
      <div className="page-heading">
        <div>
          <h1>{t("Telegram & despesas por áudio")}</h1>
          <p>{t("Menos digitação. Mais clareza nas suas finanças.")}</p>
        </div>
        <Badge tone={data.linked ? "teal" : "muted"}>
          {data.linked
            ? t("Vinculado")
            : data.provider_mode === "fixture"
              ? t("Simulação")
              : t("Não vinculado")}
        </Badge>
      </div>
      <Card>
        <CardTitle>
          <Cable />
          {t("Conexão com o Telegram")}
        </CardTitle>
        <p>
          {data.provider_mode === "fixture"
            ? t(
                "Explore o fluxo com uma simulação identificada, sem enviar áudios ou acessar uma conta real.",
              )
            : data.enabled
              ? t(
                  "Vincule sua conta ao bot e envie uma mensagem de voz pelo Telegram para registrar uma despesa.",
                )
              : t(
                  "A integração de áudio ainda não está configurada nesta instalação. O restante do Orbit funciona normalmente.",
                )}
        </p>
        <div className="form-help">{t(data.status)}</div>
        {data.enabled && (
          <p className="form-help" style={{ marginTop: 12 }}>
            {t(
              "Cadastre sua conta ou cartão em Finanças antes do primeiro áudio. Exemplo: “Gastei 35 reais no almoço, pela conta Nubank”. Seus áudios e os nomes das contas, cartões e categorias são enviados ao Google para interpretação. No nível gratuito, esse conteúdo pode ser usado para melhorar os produtos do Google.",
            )}
          </p>
        )}
        {data.enabled && (
          <div className="actions" style={{ marginTop: 22 }}>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const value = await action<{
                    code: string;
                    expires_at: string;
                    bot_url?: string | null;
                  }>("/integrations/telegram/link", {});
                  setCode(value);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("Gerar código de vínculo")}
            </Button>
            {data.linked && (
              <Button
                onClick={async () => {
                  try {
                    await action("/integrations/telegram/link", {}, "DELETE");
                    toast(t("Telegram desvinculado"));
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {t("Desvincular")}
              </Button>
            )}
          </div>
        )}
        {code && (
          <div className="form-help" style={{ marginTop: 20 }}>
            {code.bot_url && (
              <a
                className="button primary"
                href={code.bot_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Abrir bot no Telegram")}
              </a>
            )}
            <p>
              {t(
                "Abra o bot, toque em Iniciar ou envie em uma conversa privada:",
              )}
            </p>
            <h2 className="mono teal" style={{ margin: "12px 0" }}>
              /start {code.code}
            </h2>
            <small>
              {t("Válido até")}{" "}
              {new Date(code.expires_at).toLocaleTimeString(getLocale())}.
            </small>
          </div>
        )}
      </Card>
      <Card>
        <CardTitle>{t("Como registrar pelo Telegram")}</CardTitle>
        <div className="stack">
          {[
            [
              "01",
              t("Envie uma mensagem de voz"),
              t("Conte o valor, a descrição e a conta ou cartão usado."),
            ],
            [
              "02",
              t("Confira os dados"),
              t(
                "Se algo estiver ambíguo, o Orbit pede a informação que falta.",
              ),
            ],
            [
              "03",
              t("Veja o registro nas suas finanças"),
              t(
                "Parcelas, categorias e faturas seguem as mesmas regras do aplicativo.",
              ),
            ],
          ].map(([n, title, text]) => (
            <div className="row" key={n}>
              <span className="icon-box mono">{n}</span>
              <div>
                <h3>{title}</h3>
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {data.provider_mode === "fixture" && (
        <Card>
          <CardTitle>{t("Simulação de captura")}</CardTitle>
          <p>
            {t(
              "Este cenário usa dados estruturados de teste. Não há transcrição de áudio nem inteligência artificial nesta demonstração.",
            )}
          </p>
          <Field label={t("Despesa de exemplo")}>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label={t("Valor (R$)")}>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label={t("Conta da demonstração")}>
              <Select
                value={accountId || accounts.data?.[0]?.id || ""}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.data?.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button
            disabled={busy || !description.trim() || !accounts.data?.length}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const value = await action<{
                  status: string;
                  result: {
                    recorded: boolean;
                    question?: string;
                    amount?: number;
                    description?: string;
                  };
                }>("/integrations/telegram/simulate", {
                  text: JSON.stringify({
                    description,
                    amount: parseMoney(amount),
                    account_id: accountId || accounts.data?.[0]?.id,
                    kind: "expense",
                  }),
                });
                setResult(
                  value.result.recorded
                    ? t(
                        "{{description}}: {{amount}} registrado na sua demonstração.",
                        {
                          description: value.result.description ?? "",
                          amount: money(value.result.amount ?? 0),
                        },
                      )
                    : (value.result.question ??
                        t("Confira os dados informados.")),
                );
                toast(t("Simulação processada"));
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Executar simulação")}
          </Button>
          {result && (
            <p
              className="form-help"
              style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {result}
            </p>
          )}
        </Card>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
