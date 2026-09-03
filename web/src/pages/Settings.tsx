import { money, parseMoney } from "../format";
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
export default function Settings() {
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
  }, [me.data]);
  if (me.isLoading) return <Loading />;
  if (me.error)
    return <ErrorState error={me.error} retry={() => me.refetch()} />;
  const profile = me.data!;
  return (
    <div className="page settings">
      <div className="page-heading">
        <div>
          <h1>Seu Orbit, do seu jeito</h1>
          <p>Perfil, preferências e segurança.</p>
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
                },
                "PATCH",
              );
              toast("Preferências salvas");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Save size={16} />
          Salvar alterações
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
          Perfil & identidade
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
                ? "Seu espaço de demonstração"
                : "Sua central pessoal"}
            </small>
          </div>
        </div>
        <Field label="Nome completo">
          <input
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Fuso horário">
            <select
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
            </select>
          </Field>
          <Field label="Idioma">
            <select value="pt-BR" disabled>
              <option>pt-BR</option>
            </select>
          </Field>
        </div>
      </Card>
      <Card>
        <CardTitle>
          <Settings2 />
          Preferências operacionais
        </CardTitle>
        <p>Ajuste os detalhes da sua rotina.</p>
        <div className="form-grid">
          <Field label="Primeiro dia da semana">
            <select
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {[
                "Segunda-feira",
                "Terça-feira",
                "Quarta-feira",
                "Quinta-feira",
                "Sexta-feira",
                "Sábado",
                "Domingo",
              ].map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unidade de peso">
            <select value={weight} onChange={(e) => setWeight(e.target.value)}>
              <option value="kg">Quilogramas (kg)</option>
              <option value="lb">Libras (lb)</option>
            </select>
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Moeda padrão">
            <select value="BRL" disabled>
              <option value="BRL">Real brasileiro (BRL)</option>
            </select>
          </Field>
          <Field label="Aparência">
            <select value="dark" disabled>
              <option value="dark">Dark Orbital</option>
            </select>
          </Field>
        </div>
      </Card>
      <Card>
        <CardTitle>
          <ShieldCheck />
          Segurança & acesso
        </CardTitle>
        <p>
          {profile.is_demo
            ? "Esta sessão é temporária e contém apenas dados fictícios."
            : "Seu acesso é individual. Encerre a sessão ao terminar em um dispositivo compartilhado."}
        </p>
        <div className="between">
          <Badge tone="teal">
            {profile.is_demo ? "Demonstração isolada" : "Acesso individual"}
          </Badge>
          <Button onClick={() => logout()}>
            <LogOut size={16} />
            Sair da conta
          </Button>
        </div>
      </Card>
      <Card>
        <CardTitle>
          <Cable />
          Integrações
        </CardTitle>
        <Link className="between" to="/integracoes">
          <div>
            <h3>Telegram Áudio</h3>
            <p className="muted" style={{ marginTop: 7 }}>
              Registro de despesas por mensagem de voz.
            </p>
          </div>
          <span className="button">Configurar</span>
        </Link>
      </Card>
      <Card>
        <CardTitle
          action={
            <Button onClick={() => setShowAudit(!showAudit)}>
              {showAudit ? "Ocultar" : "Ver atividade"}
            </Button>
          }
        >
          <History />
          Histórico de alterações
        </CardTitle>
        <p>Correções e ações importantes ficam registradas.</p>
        {showAudit &&
          (audit.isLoading ? (
            <Loading />
          ) : audit.error ? (
            <ErrorState error={audit.error} />
          ) : (
            audit.data?.map((a) => (
              <div key={a.id} className="transaction-row">
                <div className="row-content">
                  <strong>{a.action}</strong>
                  <small>{a.entity_type}</small>
                </div>
                <small>
                  {new Date(a.created_at).toLocaleString("pt-BR", {
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
            Recomeçar a demonstração
          </CardTitle>
          <p>
            Restaure os dados fictícios desta sessão para explorar o Orbit
            novamente.
          </p>
          <Button variant="danger" onClick={() => setReset(true)}>
            Restaurar minha demo
          </Button>
        </Card>
      )}
      <Confirm
        title="Restaurar os dados da demonstração?"
        open={reset}
        onClose={() => setReset(false)}
        pending={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await action("/auth/demo/reset", {});
            setReset(false);
            toast("Sua demonstração foi restaurada");
          } catch (e) {
            toast((e as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        As alterações feitas nesta sessão serão substituídas pelos exemplos
        iniciais. Isso afeta somente seu espaço de demonstração.
      </Confirm>
    </div>
  );
}
export function Integrations() {
  const status = useApi<Telegram>("/integrations/telegram");
  const accounts = useApi<Account[]>("/accounts");
  const [description, setDescription] = useState("Café da tarde");
  const [amount, setAmount] = useState("8,50");
  const [accountId, setAccountId] = useState("");
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(
    null,
  );
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
          <h1>Telegram & despesas por áudio</h1>
          <p>Menos digitação. Mais clareza nas suas finanças.</p>
        </div>
        <Badge tone={data.linked ? "teal" : "muted"}>
          {data.linked
            ? "Vinculado"
            : data.provider_mode === "fixture"
              ? "Simulação"
              : "Não vinculado"}
        </Badge>
      </div>
      <Card>
        <CardTitle>
          <Cable />
          Conexão com o Telegram
        </CardTitle>
        <p>
          {data.provider_mode === "fixture"
            ? "Explore o fluxo com uma simulação identificada, sem enviar áudios ou acessar uma conta real."
            : data.enabled
              ? "Vincule sua conta para registrar despesas pelo seu chat privado."
              : "A integração de áudio ainda não está configurada nesta instalação. O restante do Orbit funciona normalmente."}
        </p>
        <div className="form-help">{data.status}</div>
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
                  }>("/integrations/telegram/link", {});
                  setCode(value);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Gerar código de vínculo
            </Button>
            {data.linked && (
              <Button
                onClick={async () => {
                  try {
                    await action("/integrations/telegram/link", {}, "DELETE");
                    toast("Telegram desvinculado");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Desvincular
              </Button>
            )}
          </div>
        )}
        {code && (
          <div className="form-help" style={{ marginTop: 20 }}>
            <p>Envie ao bot em uma conversa privada:</p>
            <h2 className="mono teal" style={{ margin: "12px 0" }}>
              /start {code.code}
            </h2>
            <small>
              Válido até {new Date(code.expires_at).toLocaleTimeString("pt-BR")}
              .
            </small>
          </div>
        )}
      </Card>
      <Card>
        <CardTitle>Fluxo previsto para o áudio</CardTitle>
        <div className="stack">
          {[
            [
              "01",
              "Envie uma mensagem de voz",
              "Conte o valor, a descrição e a conta ou cartão usado.",
            ],
            [
              "02",
              "Confira os dados",
              "Se algo estiver ambíguo, o Orbit pede a informação que falta.",
            ],
            [
              "03",
              "Veja o registro nas suas finanças",
              "Parcelas, categorias e faturas seguem as mesmas regras do aplicativo.",
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
          <CardTitle>Simulação de captura</CardTitle>
          <p>
            Este cenário usa dados estruturados de teste. Não há transcrição de
            áudio nem inteligência artificial nesta demonstração.
          </p>
          <Field label="Despesa de exemplo">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Valor (R$)">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Conta da demonstração">
              <select
                value={accountId || accounts.data?.[0]?.id || ""}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.data?.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
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
                    ? `${value.result.description}: ${money(value.result.amount ?? 0)} registrado na sua demonstração.`
                    : (value.result.question ?? "Confira os dados informados."),
                );
                toast("Simulação processada");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Executar simulação
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
