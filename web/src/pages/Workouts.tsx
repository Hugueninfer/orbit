import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Play,
  Dumbbell,
  Trophy,
  BookOpen,
  Pencil,
  Plus,
  History,
  ListTodo,
  Search,
} from "lucide-react";
import { useApi, useActions } from "../api";
import type {
  Routine,
  RoutineExercise,
  Session,
  Exercise,
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
  useToast,
} from "../components/ui";
import { dateLabel, decimal, displayLoad, canonicalLoad } from "../format";
import { Select } from "../components/Select";
import { useT } from "../i18n";
export default function Workouts() {
  const t = useT();
  const profile = useApi<Profile>("/me");
  const unit = profile.data?.weight_unit ?? "kg";
  const routines = useApi<Routine[]>("/routines");
  const exercises = useApi<Exercise[]>("/exercises");
  const sessions = useApi<Session[]>("/sessions");
  const active = useApi<Session | null>("/sessions/active");
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Routine | null>(null);
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState(false);
  const [newExercise, setNewExercise] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copyLast, setCopyLast] = useState(false);
  const actions = useActions();
  const toast = useToast();
  const navigate = useNavigate();
  const all = (routines.data ?? []).filter((r) => !r.archived);
  const suggested = all[0];
  const finished = (sessions.data ?? []).filter((s) => s.status === "finished");
  async function start(r: Routine) {
    if (active.data) {
      navigate(`/treinos/sessao/${active.data.id}`);
      return;
    }
    setBusy(true);
    try {
      const session = await actions<Session>(
        "/sessions",
        { routine_id: r.id, copy_last: copyLast },
        "POST",
        crypto.randomUUID(),
      );
      navigate(`/treinos/sessao/${session.id}`);
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  if (routines.isLoading) return <Loading />;
  if (routines.error)
    return (
      <ErrorState error={routines.error} retry={() => routines.refetch()} />
    );
  return (
    <div className="page">
      {active.data ? (
        <div className="hero">
          <div>
            <Badge tone="teal">● {t("Treino em andamento")}</Badge>
            <h1>{active.data.name}</h1>
            <p>{t("Sua sessão está salva. Continue de onde parou.")}</p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate(`/treinos/sessao/${active.data!.id}`)}
          >
            <Play size={17} />
            {t("Retomar treino")}
          </Button>
        </div>
      ) : suggested ? (
        <div className="hero">
          <div>
            <Badge tone="teal">{t("Sua próxima sessão")}</Badge>
            <h1>{suggested.name}</h1>
            <p>
              {suggested.description ||
                t("Mantenha a constância e acompanhe sua evolução a cada série.")}
            </p>
            <div className="actions" style={{ marginTop: 22 }}>
              <span className="row muted">
                <ListTodo size={17} />
                {t("{{count}} exercícios", { count: suggested.exercises.length })}
              </span>
              <span className="row muted">
                <Dumbbell size={17} />
                {t("{{count}} séries", { count: suggested.exercises.reduce((s, e) => s + e.sets, 0) })}
              </span>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={copyLast}
                onChange={(e) => setCopyLast(e.target.checked)}
              />
              {t("Copiar cargas e repetições do último treino")}
            </label>
            <div className="actions">
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => start(suggested)}
              >
                <Play size={17} />
                {t("Iniciar treino agora")}
              </Button>
              <Button onClick={() => setHistory(true)}>
                <History size={17} />
                {t("Ver histórico")}
              </Button>
            </div>
          </div>
          <div
            className="routine-metrics"
            style={{ minWidth: 240, gap: 24, border: 0 }}
          >
            <div>
              <span className="caps muted">{t("Sessões")}</span>
              <h1 className="teal">{finished.length}</h1>
              <small>{t("concluídas")}</small>
            </div>
            <div>
              <span className="caps muted">{t("Volume total")}</span>
              <h1 style={{ fontSize: 25 }}>
                {decimal(
                  Number(
                    displayLoad(
                      finished.reduce((s, w) => s + Number(w.volume), 0),
                      unit,
                    ),
                  ),
                )}
              </h1>
              <small>{t("{{unit}} registrados", { unit })}</small>
            </div>
          </div>
        </div>
      ) : (
        <Card>
          <Empty
            title={t("Seu próximo recorde começa aqui")}
            description={t("Monte sua primeira rotina e registre sua evolução com clareza.")}
            action={
              <AddButton onClick={() => setParams({ new: "1" })}>
                {t("Criar rotina")}
              </AddButton>
            }
          />
        </Card>
      )}
      <div className="between">
        <h2>
          {t("Rotinas operacionais")} <Badge>{t("{{count}} ativas", { count: all.length })}</Badge>
        </h2>
        <div className="actions">
          <Button onClick={() => setHistory(true)}>
            <History size={16} />
            {t("Histórico")}
          </Button>
          <AddButton onClick={() => setParams({ new: "1" })}>
            {t("Nova rotina")}
          </AddButton>
        </div>
      </div>
      <div className="routine-grid">
        {all.map((r) => (
          <Card key={r.id} className="routine-card">
            <div className="between">
              <Badge tone="blue">
                {t(r.exercises[0]?.muscle_group || "Treino")}
              </Badge>
              <button
                className="icon-button"
                aria-label={t("Editar {{name}}", { name: r.name })}
                onClick={() => setEditing(r)}
              >
                <Pencil size={16} />
              </button>
            </div>
            <div>
              <h3>{r.name}</h3>
              <p>{r.description}</p>
            </div>
            <div className="routine-metrics">
              <div>
                <strong>{r.exercises.length}</strong>
                <small>{t("exercícios")}</small>
              </div>
              <div>
                <strong>{r.exercises.reduce((s, e) => s + e.sets, 0)}</strong>
                <small>{t("séries")}</small>
              </div>
              <div>
                <strong>{r.exercises[0]?.rest_seconds ?? 90}s</strong>
                <small>{t("descanso")}</small>
              </div>
            </div>
            <div className="between">
              <small className="mono">
                {finished.find((s) => s.routine_id === r.id)
                  ? t("Última: {{date}}", { date: dateLabel(finished.find((s) => s.routine_id === r.id)?.finished_at) })
                  : t("Pronta para começar")}
              </small>
              <Button disabled={busy} onClick={() => start(r)}>
                <Play size={14} />
                {t("Iniciar")}
              </Button>
            </div>
          </Card>
        ))}
        <button
          className="card routine-card routine-new"
          onClick={() => setParams({ new: "1" })}
        >
          <Plus
            size={30}
            style={{ margin: "0 auto", color: "var(--primary)" }}
          />
          <div>
            <h3>{t("Criar nova rotina")}</h3>
            <p>{t("Defina seus exercícios, séries e metas de carga.")}</p>
          </div>
        </button>
      </div>
      <div className="split">
        <Card>
          <CardTitle
            action={
              <Button onClick={() => setNewExercise(true)}>
                <Plus size={15} />
                {t("Novo exercício")}
              </Button>
            }
          >
            <BookOpen />
            {t("Biblioteca de exercícios")}
          </CardTitle>
          <label className="search" style={{ marginBottom: 18 }}>
            <Search size={16} />
            <input
              aria-label={t("Buscar exercícios")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Buscar exercício, grupo muscular…")}
            />
          </label>
          {(exercises.data ?? [])
            .filter((e) =>
              `${e.name} ${e.muscle_group}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((e) => (
              <div key={e.id} className="transaction-row">
                <Dumbbell size={19} className="muted" />
                <div className="row-content">
                  <strong>{e.name}</strong>
                  <small>
                    {t(e.muscle_group)} · {e.equipment || t("Livre")}
                  </small>
                </div>
                <Badge>{t(e.is_global ? "Catálogo" : "Pessoal")}</Badge>
              </div>
            ))}
        </Card>
        <Card>
          <CardTitle>
            <Trophy />
            {t("Evolução recente")}
          </CardTitle>
          {finished.slice(0, 5).map((s) => (
            <Link
              key={s.id}
              className="transaction-row"
              to={`/treinos/sessao/${s.id}`}
            >
              <span className="icon-box">
                <Trophy size={18} />
              </span>
              <div className="row-content">
                <strong>{s.name}</strong>
                <small>
                  {t("{{date}} · {{count}} recordes", { date: dateLabel(s.finished_at), count: s.pr_count })}
                </small>
              </div>
              <span className="mono teal">
                {decimal(Number(displayLoad(s.volume, unit)))} {unit}
              </span>
            </Link>
          ))}
          {!finished.length && (
            <Empty
              title={t("Sua evolução, visível")}
              description={t("Conclua uma sessão para acompanhar volume e recordes.")}
            />
          )}
        </Card>
      </div>
      {(params.has("new") || editing) && (
        <RoutineEditor
          routine={editing}
          exercises={exercises.data ?? []}
          onClose={() => {
            setParams({});
            setEditing(null);
          }}
        />
      )}
      <Drawer
        title={t("Histórico de treinos")}
        open={history}
        onClose={() => setHistory(false)}
      >
        <div className="stack">
          {(sessions.data ?? []).map((s) => (
            <Link className="card" to={`/treinos/sessao/${s.id}`} key={s.id}>
              <div className="between">
                <h3>{s.name}</h3>
                <Badge tone={s.status === "finished" ? "teal" : "muted"}>
                  {s.status === "finished"
                    ? t("Concluído")
                    : s.status === "active"
                      ? t("Ativo")
                      : t("Cancelado")}
                </Badge>
              </div>
              <p className="muted" style={{ marginTop: 12 }}>
                {dateLabel(s.started_at)} ·{" "}
                {decimal(Number(displayLoad(s.volume, unit)))} {unit}
              </p>
            </Link>
          ))}
          {!sessions.data?.length && (
            <Empty description={t("Seus treinos aparecerão aqui.")} />
          )}
        </div>
      </Drawer>
      {newExercise && <ExerciseEditor onClose={() => setNewExercise(false)} />}
    </div>
  );
}
function RoutineEditor({
  routine,
  exercises,
  onClose,
}: {
  routine: Routine | null;
  exercises: Exercise[];
  onClose: () => void;
}) {
  const t = useT();
  const profile = useApi<Profile>("/me");
  const unit = profile.data?.weight_unit ?? "kg";
  const [name, setName] = useState(routine?.name ?? "");
  const [description, setDescription] = useState(routine?.description ?? "");
  const [items, setItems] = useState<RoutineExercise[]>(
    routine?.exercises ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const actions = useActions();
  const toast = useToast();
  function patch(i: number, values: Partial<RoutineExercise>) {
    setItems(items.map((x, index) => (index === i ? { ...x, ...values } : x)));
  }
  return (
    <Drawer
      open
      title={routine ? t("Editar rotina") : t("Nova rotina de treino")}
      description={t("Prepare sua próxima sessão")}
      onClose={onClose}
      footer={
        <>
          {routine && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                try {
                  await actions(
                    `/routines/${routine.id}`,
                    { version: routine.version, archived: true },
                    "PATCH",
                  );
                  toast(t("Rotina arquivada"));
                  onClose();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {t("Arquivar")}
            </Button>
          )}
          <Button onClick={onClose}>{t("Cancelar")}</Button>
          <Button
            variant="primary"
            disabled={busy || !name.trim() || !items.length}
            onClick={async () => {
              setBusy(true);
              try {
                const payload = {
                  name,
                  description,
                  exercises: items.map(
                    ({ exercise_id, sets, reps, load, rest_seconds }) => ({
                      exercise_id,
                      sets,
                      reps,
                      load,
                      rest_seconds,
                    }),
                  ),
                };
                await actions(
                  routine ? `/routines/${routine.id}` : "/routines",
                  routine ? { ...payload, version: routine.version } : payload,
                  routine ? "PATCH" : "POST",
                );
                toast(t("Rotina salva"));
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("Salvando…") : t("Salvar rotina")}
          </Button>
        </>
      }
    >
      <Field label={t("Nome da rotina")}>
        <input
          autoFocus
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("Ex.: Push Day A")}
        />
      </Field>
      <Field label={t("Foco / descrição")}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("Peito, ombros e tríceps…")}
        />
      </Field>
      <div className="divider" />
      <h3 style={{ marginBottom: 18 }}>{t("Exercícios da rotina")}</h3>
      {items.map((item, i) => (
        <Card key={i} className="routine-exercise">
          <div className="between" style={{ marginBottom: 16 }}>
            <Badge tone="teal">{t("Exercício {{count}}", { count: i + 1 })}</Badge>
            <Button
              variant="ghost"
              onClick={() => setItems(items.filter((_, index) => index !== i))}
            >
              {t("Remover")}
            </Button>
          </div>
          <Field label={t("Exercício")}>
            <Select
              value={item.exercise_id}
              onChange={(e) => patch(i, { exercise_id: e.target.value })}
            >
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="form-grid">
            <Field label={t("Séries")}>
              <input
                type="number"
                min={1}
                max={20}
                value={item.sets}
                onChange={(e) => patch(i, { sets: Number(e.target.value) })}
              />
            </Field>
            <Field label={t("Repetições")}>
              <input
                type="number"
                min={1}
                max={100}
                value={item.reps}
                onChange={(e) => patch(i, { reps: Number(e.target.value) })}
              />
            </Field>
            <Field label={t("Carga ({{unit}})", { unit })}>
              <input
                type="number"
                min={0}
                step="0.5"
                value={displayLoad(item.load, unit)}
                onChange={(e) =>
                  patch(i, { load: canonicalLoad(e.target.value, unit) })
                }
              />
            </Field>
            <Field label={t("Descanso (s)")}>
              <input
                type="number"
                min={0}
                max={900}
                value={item.rest_seconds}
                onChange={(e) =>
                  patch(i, { rest_seconds: Number(e.target.value) })
                }
              />
            </Field>
          </div>
        </Card>
      ))}
      <Button
        style={{ width: "100%", marginTop: 16, borderStyle: "dashed" }}
        disabled={!exercises.length}
        onClick={() =>
          setItems([
            ...items,
            {
              exercise_id: exercises[0]?.id ?? "",
              sets: 3,
              reps: 10,
              load: "0",
              rest_seconds: 90,
            },
          ])
        }
      >
        <Plus size={17} />
        {t("Adicionar exercício")}
      </Button>
      {routine && (
        <p className="form-help" style={{ marginTop: 20 }}>
          {t("As alterações valem para novos treinos. Sessões anteriores preservam a rotina usada naquele dia.")}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Drawer>
  );
}
function ExerciseEditor({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("Peito");
  const [equipment, setEquipment] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const actions = useActions();
  const toast = useToast();
  return (
    <Drawer
      open
      title={t("Novo exercício")}
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
                await actions("/exercises", {
                  name,
                  muscle_group: muscle,
                  equipment,
                  instructions,
                });
                toast(t("Exercício criado"));
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Salvar exercício")}
          </Button>
        </>
      }
    >
      <Field label={t("Nome")}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label={t("Grupo muscular")}>
        <Select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
          {[
            "Peito",
            "Costas",
            "Pernas",
            "Ombros",
            "Braços",
            "Core",
            "Corpo inteiro",
          ].map((g) => (
            <option key={g} value={g}>
              {t(g)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("Equipamento")}>
        <input
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          placeholder={t("Halteres, barra, máquina…")}
        />
      </Field>
      <Field label={t("Instruções")}>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </Field>
      {error && <p className="form-error">{error}</p>}
    </Drawer>
  );
}
