import { Link, useNavigate } from "react-router-dom";
import {
  CircleCheck,
  Flame,
  Wallet,
  Timer,
  Plus,
  Repeat2,
  Receipt,
  Play,
  ListTodo,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApi, useActions } from "../api";
import type {
  Dashboard as DashboardData,
  Session,
  Task,
  Transaction,
} from "../types";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  CheckButton,
  Empty,
  ErrorState,
  Loading,
  Progress,
  Stat,
  useToast,
} from "../components/ui";
import { TaskRow } from "./Tasks";
import { dateLabel, money } from "../format";
export default function Dashboard() {
  const query = useApi<DashboardData>("/dashboard");
  const tx = useApi<Transaction[]>("/transactions");
  const actions = useActions();
  const toast = useToast();
  const navigate = useNavigate();
  if (query.isLoading) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const d = query.data!;
  const tasks = d.tasks.filter((t) => t.status !== "cancelled");
  const completed = tasks.filter((t) => t.status === "done").length;
  const urgent = tasks.filter(
    (t) => t.status !== "done" && (!t.due_date || t.due_date <= d.today),
  );
  const habitsDone = d.habits.filter(
    (h) => h.stats.calendar.find((c) => c.date === d.today)?.completed,
  ).length;
  const habitProgress = d.habits.length
    ? Math.round((habitsDone / d.habits.length) * 100)
    : 0;
  const chart = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(`${d.today}T12:00:00`);
    day.setDate(day.getDate() - 6 + i);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const entries = (tx.data ?? []).filter(
      (t) => t.date === date && t.status === "posted" && !t.transfer_id,
    );
    return {
      day: dateLabel(date, { weekday: "short" }),
      income:
        entries
          .filter((t) => t.kind === "income")
          .reduce((s, t) => s + t.amount, 0) / 100,
      expense:
        entries
          .filter((t) => t.kind === "expense")
          .reduce((s, t) => s + t.amount, 0) / 100,
    };
  });
  async function toggle(task: Task) {
    try {
      await actions(
        `/tasks/${task.id}`,
        {
          version: task.version,
          status: task.status === "done" ? "todo" : "done",
        },
        "PATCH",
      );
      toast(task.status === "done" ? "Tarefa reaberta" : "Tarefa concluída");
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  async function start() {
    if (d.active_session) {
      navigate(`/treinos/sessao/${d.active_session.id}`);
      return;
    }
    if (!d.suggested_routine) {
      navigate("/treinos?new=1");
      return;
    }
    try {
      const s = await actions<Session>(
        "/sessions",
        { routine_id: d.suggested_routine.id, copy_last: false },
        "POST",
        crypto.randomUUID(),
      );
      navigate(`/treinos/sessao/${s.id}`);
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  const firstName = d.profile.name.split(" ")[0];
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: d.profile.timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return (
    <div className="page">
      <section className="hero">
        <div>
          <div className="row">
            <Badge tone="teal">UM DIA DE CADA VEZ</Badge>
            <span className="mono muted desktop-only">Seu espaço de foco</span>
          </div>
          <h1>
            {hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"},{" "}
            {firstName}.
          </h1>
          <p>
            <span className="teal">
              {urgent.length}{" "}
              {urgent.length === 1 ? "prioridade exige" : "prioridades exigem"}
            </span>{" "}
            sua atenção hoje.
            <br />
            Sua rotina, com mais clareza e intenção.
          </p>
        </div>
        <div className="actions">
          <Link className="button" to="/tarefas?new=1">
            <CircleCheck size={18} className="blue" />
            Nova tarefa
          </Link>
          <Link className="button" to="/habitos">
            <Flame size={18} className="teal" />
            Marcar hábito
          </Link>
          <Link className="button" to="/financas?new=1">
            <Receipt size={18} className="teal" />
            Registrar despesa
          </Link>
          <Button onClick={start}>
            <Play size={18} className="blue" />
            {d.active_session ? "Retomar treino" : "Iniciar treino"}
          </Button>
        </div>
      </section>
      <div className="stats">
        <Stat
          label="FOCO DO DIA"
          value={
            <>
              {completed} de {tasks.length} concluídas
            </>
          }
          icon={<CircleCheck />}
        >
          <Progress
            value={tasks.length ? (completed / tasks.length) * 100 : 0}
          />
          <p>
            {urgent[0]?.title ?? "Tudo em dia. Espaço para o próximo passo."}
          </p>
        </Stat>
        <Stat
          label="HÁBITOS & CONSISTÊNCIA"
          value={
            <div className="row">
              <div
                className="ring"
                style={
                  { "--progress": `${habitProgress}%` } as React.CSSProperties
                }
              >
                <span>{habitProgress}%</span>
              </div>
              <div>
                {habitsDone}/{d.habits.length}
                <p>Concluídos hoje</p>
              </div>
            </div>
          }
          icon={<Flame />}
        >
          <p>Pequenas ações, progresso contínuo.</p>
        </Stat>
        <Stat
          label="SAÚDE FINANCEIRA"
          value={money(d.accounts.reduce((s, a) => s + a.current_balance, 0))}
          icon={<Wallet />}
        >
          <p>Saldo consolidado das suas contas</p>
          <span className="mono teal">
            Despesas: {money(d.monthly.expenses)}
          </span>
        </Stat>
        <Stat
          label={
            d.active_session ? "SESSÃO EM ANDAMENTO" : "SUA PRÓXIMA SESSÃO"
          }
          value={
            <span style={{ fontSize: 18 }}>
              {d.active_session?.name ??
                d.suggested_routine?.name ??
                "Vamos começar?"}
            </span>
          }
          icon={<Timer />}
        >
          <p>
            {d.suggested_routine
              ? `${d.suggested_routine.exercises.length} exercícios programados`
              : "Crie uma rotina do seu jeito"}
          </p>
          <Button onClick={start} style={{ alignSelf: "flex-start" }}>
            <Play size={14} />
            {d.active_session ? "Retomar" : "Iniciar"}
          </Button>
        </Stat>
      </div>
      <div className="split">
        <div className="stack">
          <Card>
            <CardTitle
              action={
                <Link className="button" to="/tarefas">
                  Ver todas
                  <ArrowRight size={14} />
                </Link>
              }
            >
              <ListTodo />
              Tarefas prioritárias de hoje
            </CardTitle>
            {tasks.length ? (
              tasks
                .slice()
                .sort(
                  (a, b) =>
                    Number(a.status === "done") - Number(b.status === "done"),
                )
                .slice(0, 5)
                .map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onEdit={() => navigate("/tarefas")}
                    onToggle={() => toggle(t)}
                  />
                ))
            ) : (
              <Empty
                title="Sua mente merece espaço"
                description="Tire as ideias da cabeça e organize seus próximos passos."
                action={
                  <Link className="button primary" to="/tarefas?new=1">
                    <Plus size={16} />
                    Criar tarefa
                  </Link>
                }
              />
            )}
          </Card>
          <Card>
            <CardTitle>Fluxo financeiro semanal</CardTitle>
            <p className="muted" style={{ fontSize: 12, marginBottom: 20 }}>
              Receitas e despesas realizadas nos últimos 7 dias
            </p>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} barGap={4}>
                  <CartesianGrid vertical={false} stroke="#25365366" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#969cac", fontSize: 10 }}
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
                    name="Entradas"
                    dataKey="income"
                    fill="#44e2cd"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={16}
                  />
                  <Bar
                    name="Saídas"
                    dataKey="expense"
                    fill="#7692ff"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div
              className="actions mono muted"
              style={{ justifyContent: "center" }}
            >
              <span className="teal">● Entradas</span>
              <span className="blue">● Saídas</span>
            </div>
            <div className="divider" />
            <Link to="/financas" className="between">
              <span className="row">
                <Wallet size={18} className="teal" />
                Ver movimentações e faturas
              </span>
              <ArrowRight size={17} />
            </Link>
          </Card>
        </div>
        <div className="stack">
          <Card>
            <CardTitle
              action={
                <span className="mono teal">
                  {habitsDone}/{d.habits.length} hoje
                </span>
              }
            >
              <Repeat2 />
              Check-in de hábitos
            </CardTitle>
            {d.habits.map((h) => {
              const done =
                h.stats.calendar.find((c) => c.date === d.today)?.completed ??
                false;
              return (
                <div className="habit-row" key={h.id}>
                  <CheckButton
                    checked={done}
                    label={`Registrar ${h.name}`}
                    onClick={async () => {
                      if (h.target_quantity > 1 || done) {
                        navigate("/habitos");
                        return;
                      }
                      try {
                        await actions(
                          `/habits/${h.id}/checkins/${d.today}`,
                          { quantity: 1, note: "" },
                          "PUT",
                        );
                        toast("Hábito registrado");
                      } catch (e) {
                        toast((e as Error).message, true);
                      }
                    }}
                  />
                  <div className="row-content">
                    <strong style={{ fontSize: 13 }}>{h.name}</strong>
                  </div>
                  <span className="mono muted" style={{ fontSize: 10 }}>
                    {h.target_quantity} {h.unit}
                  </span>
                </div>
              );
            })}
            {!d.habits.length && (
              <Empty
                title="Encontre seu ritmo"
                description="Crie o primeiro hábito para começar."
                action={
                  <Link className="button" to="/habitos?new=1">
                    Novo hábito
                  </Link>
                }
              />
            )}
          </Card>
          <Card>
            <CardTitle>
              <CalendarDays />
              Próximos vencimentos
            </CardTitle>
            {d.invoices
              .filter((i) => i.remaining > 0)
              .slice(0, 3)
              .map((i) => (
                <Link to="/financas" key={i.id} className="transaction-row">
                  <div className="row-content">
                    <strong>
                      {d.cards.find((c) => c.id === i.card_id)?.name ??
                        "Fatura"}
                    </strong>
                    <small>{dateLabel(i.due_date)}</small>
                  </div>
                  <span className="mono">{money(i.remaining)}</span>
                </Link>
              ))}
            {!d.invoices.some((i) => i.remaining > 0) && (
              <p className="muted">Nenhuma fatura pendente. Tudo em ordem.</p>
            )}
          </Card>
          <Link className="card between" to="/integracoes">
            <div>
              <strong>Telegram Áudio</strong>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                Explore a captura de despesas
              </p>
            </div>
            <ArrowRight size={18} className="teal" />
          </Link>
        </div>
      </div>
    </div>
  );
}
