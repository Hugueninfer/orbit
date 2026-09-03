import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  CalendarDays,
  Flame,
  Repeat2,
  Target,
  Search,
  Droplets,
  BookOpen,
  Moon,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { request, useApi, useActions, queryKeys } from "../api";
import type { Habit, HabitStats, Profile, Schedule } from "../types";
import {
  AddButton,
  Badge,
  Button,
  Card,
  CardTitle,
  CheckButton,
  Drawer,
  Empty,
  ErrorState,
  Field,
  Loading,
  Progress,
  Stat,
  useToast,
} from "../components/ui";
import { dateLabel, localDate } from "../format";
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export default function Habits() {
  const habits = useApi<Habit[]>("/habits");
  const me = useApi<Profile>("/me");
  const today = localDate(me.data?.timezone);
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [search, setSearch] = useState("");
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [checkin, setCheckin] = useState<Habit | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const actions = useActions();
  const toast = useToast();
  const monthEnd = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5)),
    0,
  ).getDate();
  const calendarEnd = `${month}-${String(monthEnd).padStart(2, "0")}`;
  const endDate = calendarEnd > today ? today : calendarEnd;
  const stats = useQueries({
    queries: (habits.data ?? [])
      .filter((h) => !h.archived)
      .map((h) => ({
        queryKey: [
          ...queryKeys.all,
          `/habits/${h.id}/stats?from_date=${month}-01&to_date=${endDate}`,
        ],
        queryFn: () =>
          request<HabitStats>(
            `/habits/${h.id}/stats?from_date=${month}-01&to_date=${endDate}`,
          ),
      })),
  });
  const active = (habits.data ?? []).filter((h) => !h.archived);
  const getStats = (id: string) =>
    stats[active.findIndex((h) => h.id === id)]?.data;
  const done = active.filter(
    (h) => getStats(h.id)?.calendar.find((c) => c.date === selected)?.completed,
  ).length;
  const adherence = active.length
    ? stats.reduce((sum, s) => sum + (s.data?.adherence ?? 0), 0) /
      active.length
    : 0;
  async function mark(habit: Habit) {
    const entry = getStats(habit.id)?.calendar.find((c) => c.date === selected);
    if (entry?.completed) {
      setCheckin(habit);
      setQuantity(String(entry.quantity));
      setNote(
        getStats(habit.id)?.checkins.find((c) => c.date === selected)?.note ??
          "",
      );
      return;
    }
    if (habit.target_quantity > 1) {
      setCheckin(habit);
      setQuantity(String(habit.target_quantity));
      setNote("");
      return;
    }
    try {
      await actions(
        `/habits/${habit.id}/checkins/${selected}`,
        { quantity: 1, note: "" },
        "PUT",
      );
      toast("Check-in registrado");
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  function changeMonth(delta: number) {
    const d = new Date(`${month}-15T12:00:00`);
    d.setMonth(d.getMonth() + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  if (habits.isLoading) return <Loading />;
  if (habits.error)
    return <ErrorState error={habits.error} retry={() => habits.refetch()} />;
  const startWeek = new Date(`${selected}T12:00:00`);
  startWeek.setDate(startWeek.getDate() - ((startWeek.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startWeek);
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  return (
    <div className="page">
      {stats.find((s) => s.error)?.error && (
        <ErrorState
          error={stats.find((s) => s.error)!.error!}
          retry={() => {
            stats.forEach((s) => s.refetch());
          }}
        />
      )}
      <div className="stats">
        <Stat
          label="CONCLUSÃO DO DIA"
          value={
            <span>
              {active.length ? Math.round((done / active.length) * 100) : 0}%
            </span>
          }
          icon={<Repeat2 />}
        >
          <Progress value={active.length ? (done / active.length) * 100 : 0} />
          <p>
            {done} de {active.length} hábitos cumpridos
          </p>
        </Stat>
        <Stat
          label="SEQUÊNCIA ATIVA"
          value={
            <>
              {Math.max(0, ...stats.map((s) => s.data?.current_streak ?? 0))}
              <small> ciclos</small>
            </>
          }
          icon={<Flame />}
        >
          <p>Maior sequência entre seus hábitos</p>
        </Stat>
        <Stat
          label="ADERÊNCIA NO PERÍODO"
          value={<span className="teal">{Math.round(adherence)}%</span>}
          icon={<Target />}
        >
          <Progress value={adherence} />
          <p>Considera os dias agendados</p>
        </Stat>
        <Stat label="SEU RITMO" value={active.length} icon={<CalendarDays />}>
          <p>Hábitos ativos na sua órbita</p>
          <AddButton onClick={() => setParams({ new: "1" })}>
            Novo hábito
          </AddButton>
        </Stat>
      </div>
      <div className="split">
        <div className="stack">
          <Card>
            <div className="between" style={{ marginBottom: 16 }}>
              <span className="caps muted">Horizonte semanal</span>
              <input
                type="date"
                aria-label="Data do check-in"
                value={selected}
                max={today}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setMonth(e.target.value.slice(0, 7));
                }}
                style={{
                  background: "transparent",
                  color: "var(--teal)",
                  border: 0,
                  fontSize: 12,
                }}
              />
            </div>
            <div className="week-strip">
              {week.map((d, i) => (
                <button
                  key={d}
                  className={selected === d ? "selected" : ""}
                  onClick={() => setSelected(d)}
                  disabled={d > today}
                >
                  <small>{weekdays[i]}</small>
                  <strong>{d.slice(-2)}</strong>
                  {d === today ? (
                    <Badge tone="teal">Hoje</Badge>
                  ) : (
                    <span>•</span>
                  )}
                </button>
              ))}
            </div>
          </Card>
          <div className="toolbar">
            <h2 style={{ flex: 1 }}>Sua rotina, com constância</h2>
            <label className="search">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar hábito"
                placeholder="Buscar hábito…"
              />
            </label>
          </div>
          {active.filter((h) =>
            h.name.toLowerCase().includes(search.toLowerCase()),
          ).length ? (
            active
              .filter((h) =>
                h.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((h, i) => {
                const data = getStats(h.id);
                const entry = data?.calendar.find((c) => c.date === selected);
                const Icon = [Droplets, BookOpen, Target, Moon][i % 4];
                return (
                  <Card key={h.id} className="habit-card">
                    <div className="row">
                      <CheckButton
                        checked={entry?.completed ?? false}
                        disabled={selected > today}
                        onClick={() => mark(h)}
                        label={`Registrar ${h.name}`}
                      />
                      <span
                        className="icon-box"
                        style={{ color: h.color, borderColor: h.color + "55" }}
                      >
                        <Icon size={22} />
                      </span>
                      <div className="row-content">
                        <strong>
                          {h.name}{" "}
                          <span className="mono teal" style={{ marginLeft: 6 }}>
                            <Flame size={12} /> {data?.current_streak ?? 0}{" "}
                            {data?.streak_unit === "weeks" ? "sem." : "dias"}
                          </span>
                        </strong>
                        <small>
                          Meta: {h.target_quantity} {h.unit} ·{" "}
                          {h.schedule.kind === "daily"
                            ? "Todos os dias"
                            : h.schedule.kind === "times_per_week"
                              ? `${h.schedule.times_per_week}× por semana`
                              : (h.schedule.weekdays ?? [])
                                  .map((d) => weekdays[d])
                                  .join(", ")}
                        </small>
                        {entry && entry.quantity > 0 && (
                          <small className="teal">
                            {entry.quantity} {h.unit} registrados
                          </small>
                        )}
                      </div>
                      <div className="mini-bars">
                        {(data?.calendar ?? []).slice(-7).map((c) => (
                          <i
                            key={c.date}
                            className={c.completed ? "filled" : ""}
                            title={c.date}
                          />
                        ))}
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Editar ${h.name}`}
                        onClick={() => setEditing(h)}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </Card>
                );
              })
          ) : (
            <Card>
              <Empty
                title="Pequenos passos. Grandes mudanças."
                description="Crie um hábito e acompanhe sua consistência, um dia de cada vez."
                action={
                  <AddButton onClick={() => setParams({ new: "1" })}>
                    Criar hábito
                  </AddButton>
                }
              />
            </Card>
          )}
        </div>
        <div className="stack">
          <Card>
            <CardTitle
              action={
                <div className="row">
                  <button
                    className="icon-button"
                    aria-label="Mês anterior"
                    onClick={() => changeMonth(-1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Próximo mês"
                    onClick={() => changeMonth(1)}
                    disabled={month >= today.slice(0, 7)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              }
            >
              Matriz de consistência
            </CardTitle>
            <h3 style={{ marginBottom: 22, textTransform: "capitalize" }}>
              {dateLabel(`${month}-01`, { month: "long", year: "numeric" })}
            </h3>
            <div className="calendar">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
              {Array.from(
                { length: new Date(`${month}-01T12:00:00`).getDay() },
                (_, i) => (
                  <span key={`blank${i}`} />
                ),
              )}
              {Array.from({ length: monthEnd }, (_, i) => {
                const d = `${month}-${String(i + 1).padStart(2, "0")}`;
                const count = stats.filter(
                  (s) => s.data?.calendar.find((c) => c.date === d)?.completed,
                ).length;
                return (
                  <button
                    key={d}
                    aria-label={`Ver ${dateLabel(d)}`}
                    disabled={d > today}
                    className={`${count ? "filled" : ""} ${d === selected ? "selected" : ""}`}
                    style={
                      count
                        ? {
                            opacity:
                              0.45 +
                              (count / Math.max(active.length, 1)) * 0.55,
                          }
                        : undefined
                    }
                    onClick={() => setSelected(d)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="divider" />
            <div className="between">
              <small>Menos</small>
              <div className="mini-bars">
                <i />
                <i className="filled" style={{ opacity: 0.3 }} />
                <i className="filled" style={{ opacity: 0.6 }} />
                <i className="filled" />
              </div>
              <small className="teal">Mais consistente</small>
            </div>
          </Card>
          <Card>
            <CardTitle>
              <Target />
              Aderência por hábito
            </CardTitle>
            {active.map((h) => (
              <div key={h.id} style={{ marginBottom: 20 }}>
                <div className="between" style={{ marginBottom: 8 }}>
                  <small>{h.name}</small>
                  <span className="mono teal">
                    {Math.round(getStats(h.id)?.adherence ?? 0)}%
                  </span>
                </div>
                <Progress value={getStats(h.id)?.adherence ?? 0} />
              </div>
            ))}
            <p className="form-help">
              Consistência se constrói com tempo. Dias fora da sua agenda não
              interrompem sua sequência.
            </p>
          </Card>
        </div>
      </div>
      {(params.has("new") || editing) && (
        <HabitEditor
          habit={editing}
          onClose={() => {
            setParams({});
            setEditing(null);
          }}
        />
      )}
      <Drawer
        title={checkin?.name ?? "Check-in"}
        description={dateLabel(selected, { day: "numeric", month: "long" })}
        open={!!checkin}
        onClose={() => setCheckin(null)}
        footer={
          <>
            <Button
              disabled={busy}
              variant="ghost"
              onClick={async () => {
                setBusy(true);
                try {
                  await actions(
                    `/habits/${checkin!.id}/checkins/${selected}`,
                    {},
                    "DELETE",
                  );
                  setCheckin(null);
                  toast("Check-in removido");
                } catch (e) {
                  toast((e as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remover registro
            </Button>
            <Button
              variant="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await actions(
                    `/habits/${checkin!.id}/checkins/${selected}`,
                    { quantity: Number(quantity), note },
                    "PUT",
                  );
                  setCheckin(null);
                  toast("Check-in salvo");
                } catch (e) {
                  toast((e as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={17} />
              Salvar check-in
            </Button>
          </>
        }
      >
        <Field label={`Quantidade (${checkin?.unit})`}>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <Field label="Como foi hoje?">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Uma observação para acompanhar sua evolução…"
          />
        </Field>
      </Drawer>
    </div>
  );
}
function HabitEditor({
  habit,
  onClose,
}: {
  habit: Habit | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(habit?.name ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [target, setTarget] = useState(String(habit?.target_quantity ?? 1));
  const [unit, setUnit] = useState(habit?.unit ?? "vezes");
  const [schedule, setSchedule] = useState<Schedule>(
    habit
      ? { ...habit.schedule, weekdays: habit.schedule.weekdays ?? [] }
      : { kind: "daily", weekdays: [], times_per_week: 3 },
  );
  const [color, setColor] = useState(habit?.color ?? "#44e2cd");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actions = useActions();
  const toast = useToast();
  return (
    <Drawer
      open
      title={habit ? "Editar hábito" : "Novo hábito"}
      description="Pequenos passos, uma órbita consistente"
      onClose={onClose}
      footer={
        <>
          {habit && (
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await actions(
                    `/habits/${habit.id}`,
                    { version: habit.version, archived: true },
                    "PATCH",
                  );
                  onClose();
                  toast("Hábito arquivado");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Arquivar
            </Button>
          )}
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const payload = {
                  name,
                  description,
                  target_quantity: Number(target),
                  unit,
                  color,
                  schedule,
                };
                await actions(
                  habit ? `/habits/${habit.id}` : "/habits",
                  habit ? { ...payload, version: habit.version } : payload,
                  habit ? "PATCH" : "POST",
                );
                toast(habit ? "Hábito atualizado" : "Hábito criado");
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Salvando…" : "Salvar hábito"}
          </Button>
        </>
      }
    >
      <Field label="Nome do hábito">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="Ex.: Leitura diária"
        />
      </Field>
      <Field label="Descrição">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qual é o seu propósito?"
        />
      </Field>
      <div className="form-grid">
        <Field label="Meta diária">
          <input
            min={1}
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </Field>
        <Field label="Unidade">
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            maxLength={30}
            placeholder="minutos, ml, páginas…"
          />
        </Field>
      </div>
      <div className="divider" />
      <Field label="Frequência">
        <select
          value={schedule.kind}
          onChange={(e) =>
            setSchedule({
              ...schedule,
              kind: e.target.value as Schedule["kind"],
            })
          }
        >
          <option value="daily">Todos os dias</option>
          <option value="weekdays">Dias específicos</option>
          <option value="times_per_week">Vezes por semana</option>
        </select>
      </Field>
      {schedule.kind === "weekdays" && (
        <div className="actions" style={{ marginBottom: 24 }}>
          {weekdays.map((d, i) => (
            <Button
              key={d}
              variant={schedule.weekdays.includes(i) ? "primary" : "secondary"}
              onClick={() =>
                setSchedule({
                  ...schedule,
                  weekdays: schedule.weekdays.includes(i)
                    ? schedule.weekdays.filter((x) => x !== i)
                    : [...schedule.weekdays, i],
                })
              }
            >
              {d}
            </Button>
          ))}
        </div>
      )}
      {schedule.kind === "times_per_week" && (
        <Field label="Dias por semana">
          <input
            type="number"
            min={1}
            max={7}
            value={schedule.times_per_week}
            onChange={(e) =>
              setSchedule({
                ...schedule,
                times_per_week: Number(e.target.value),
              })
            }
          />
        </Field>
      )}
      <Field label="Cor do hábito">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </Field>
      {habit && (
        <p className="form-help">
          Alterações na agenda valem a partir de amanhã. Seus registros
          anteriores são preservados.
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </Drawer>
  );
}
