import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Flag,
  Plus,
  Trophy,
} from "lucide-react";
import { useActions, useApi } from "../api";
import type { Session, WorkoutSet, Profile } from "../types";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Confirm,
  Drawer,
  Empty,
  ErrorState,
  Field,
  Loading,
  Progress,
  useToast,
} from "../components/ui";
import { decimal, minutes, displayLoad, canonicalLoad } from "../format";
export default function WorkoutSession() {
  const { id } = useParams();
  const profile = useApi<Profile>("/me");
  const unit = profile.data?.weight_unit ?? "kg";
  const query = useApi<Session>(`/sessions/${id}`);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [restAdjustment, setRestAdjustment] = useState(0);
  const [finish, setFinish] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const actions = useActions();
  const toast = useToast();
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => setRestAdjustment(0), [query.data?.rest_until]);
  if (query.isLoading) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const session = query.data!;
  const exercise = session.exercises[exerciseIndex];
  if (!exercise) return <Empty title="Nenhum exercício nesta sessão" />;
  const sets = session.exercises.flatMap((e) => e.sets);
  const completed = sets.filter((s) => s.completed_at).length;
  const active = session.status === "active";
  const remaining = Math.max(
    0,
    (session.rest_until ? Date.parse(session.rest_until) - now : 0) / 1000 +
      restAdjustment,
  );
  return (
    <div className="page session">
      <div className="between">
        <div>
          <div className="row" style={{ marginBottom: 10 }}>
            <Badge tone="teal">
              ●{" "}
              {active
                ? "Ativo"
                : session.status === "finished"
                  ? "Concluído"
                  : "Cancelado"}
            </Badge>
            <span className="mono muted">
              <Clock3 size={13} />{" "}
              {minutes(
                ((session.finished_at ? Date.parse(session.finished_at) : now) -
                  Date.parse(session.started_at)) /
                  1000,
              )}
            </span>
          </div>
          <h1>{session.name}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Exercício {exerciseIndex + 1} de {session.exercises.length} ·{" "}
            <span className="teal">
              {completed}/{sets.length} séries concluídas
            </span>
          </p>
        </div>
        {active ? (
          <Button variant="danger" onClick={() => setFinish(true)}>
            <Flag size={16} />
            Finalizar
          </Button>
        ) : (
          <Link className="button" to="/treinos">
            <ArrowLeft size={16} />
            Voltar
          </Link>
        )}
      </div>
      <Progress value={sets.length ? (completed / sets.length) * 100 : 0} />
      <Card>
        <span className="caps blue">Exercício atual</span>
        <h1 style={{ margin: "12px 0" }}>{exercise.name}</h1>
        <Badge>{exercise.muscle_group}</Badge>
        <div className="divider" />
        <div className="between">
          <small>Descanso entre séries</small>
          <span className="mono teal">{minutes(exercise.rest_seconds)}</span>
        </div>
        {!active && (
          <p className="form-help" style={{ marginTop: 16 }}>
            Histórico preservado. Correções de séries exigem um motivo e ficam
            registradas.
          </p>
        )}
      </Card>
      <div>
        <h2 className="section-heading">Controle de séries</h2>
        <div className="set-head">
          <span>Série</span>
          <span>Tipo</span>
          <span>Carga ({unit})</span>
          <span>Reps</span>
          <span>OK</span>
        </div>
        {exercise.sets.map((set, i) => (
          <SetRow
            key={`${exercise.exercise_id}-${set.id}`}
            set={set}
            index={i}
            session={session}
            unit={unit}
            disabled={busy || session.status === "cancelled"}
            onBusy={setBusy}
          />
        ))}
        {active && (
          <Button
            style={{ width: "100%", marginTop: 8, borderStyle: "dashed" }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const last = exercise.sets.at(-1);
                await actions(`/sessions/${id}/sets`, {
                  version: session.version,
                  exercise_id: exercise.exercise_id,
                  load: last?.load ?? "0",
                  reps: last?.reps ?? 10,
                  type: "normal",
                });
                toast("Série adicionada");
              } catch (e) {
                toast((e as Error).message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Plus size={17} />
            Adicionar série
          </Button>
        )}
      </div>
      {active ? (
        <Card className="timer">
          <div className="between">
            <span className="caps teal">● Cronômetro de descanso</span>
            <span className="mono muted">
              Meta: {minutes(exercise.rest_seconds)}
            </span>
          </div>
          <div className="timer-clock">{minutes(remaining)}</div>
          <p className="muted">
            {remaining
              ? "Respire. Prepare sua próxima série."
              : "Pronto para a próxima série"}
          </p>
          <div className="actions" style={{ marginTop: 22 }}>
            <Button
              onClick={() => setRestAdjustment(restAdjustment - 15)}
              disabled={!remaining}
            >
              −15s
            </Button>
            <Button onClick={() => setRestAdjustment(restAdjustment + 30)}>
              +30s
            </Button>
            <Button
              onClick={() =>
                setRestAdjustment(
                  -(session.rest_until
                    ? Math.max(0, (Date.parse(session.rest_until) - now) / 1000)
                    : 0),
                )
              }
            >
              Pular
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>
            <Trophy />
            Resumo da sessão
          </CardTitle>
          <div className="routine-metrics">
            <div>
              <strong>
                {decimal(Number(displayLoad(session.volume, unit)))} {unit}
              </strong>
              <small>volume</small>
            </div>
            <div>
              <strong>{completed}</strong>
              <small>séries</small>
            </div>
            <div>
              <strong>{session.pr_count}</strong>
              <small>recordes</small>
            </div>
          </div>
          {session.notes && (
            <p className="muted" style={{ marginTop: 16 }}>
              {session.notes}
            </p>
          )}
        </Card>
      )}
      <div className="between">
        <Button
          disabled={exerciseIndex === 0}
          onClick={() => setExerciseIndex((i) => i - 1)}
        >
          <ArrowLeft size={17} />
          Anterior
        </Button>
        <div className="mini-bars">
          {session.exercises.map((e, i) => (
            <i
              key={e.exercise_id}
              className={i <= exerciseIndex ? "filled" : ""}
            />
          ))}
        </div>
        <Button
          variant="primary"
          disabled={exerciseIndex === session.exercises.length - 1}
          onClick={() => setExerciseIndex((i) => i + 1)}
        >
          Próximo
          <ArrowRight size={17} />
        </Button>
      </div>
      {active && (
        <div className="between">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await actions(`/sessions/${id}/copy-last`, {
                  version: session.version,
                });
                toast("Dados do treino anterior copiados");
              } catch (e) {
                toast((e as Error).message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            Copiar último treino
          </Button>
          <Button variant="ghost" onClick={() => setCancel(true)}>
            Cancelar sessão
          </Button>
        </div>
      )}
      <Drawer
        open={finish}
        title="Finalizar treino"
        onClose={() => setFinish(false)}
        footer={
          <>
            <Button onClick={() => setFinish(false)}>Continuar treino</Button>
            <Button
              variant="primary"
              disabled={busy || !completed}
              onClick={async () => {
                setBusy(true);
                try {
                  await actions(`/sessions/${id}/finish`, {
                    version: session.version,
                    notes,
                  });
                  toast("Treino concluído. Bom trabalho!");
                  setFinish(false);
                } catch (e) {
                  toast((e as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={17} />
              Concluir sessão
            </Button>
          </>
        }
      >
        <h1>{completed} séries concluídas</h1>
        <p className="muted" style={{ margin: "12px 0 26px" }}>
          Volume registrado:{" "}
          {decimal(Number(displayLoad(session.volume, unit)))} {unit}
        </p>
        <Field label="Notas do treino">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Como foi seu treino hoje?"
          />
        </Field>
        {!completed && (
          <p className="form-error">
            Conclua pelo menos uma série antes de finalizar.
          </p>
        )}
      </Drawer>
      <Confirm
        open={cancel}
        title="Cancelar esta sessão?"
        onClose={() => setCancel(false)}
        pending={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await actions(`/sessions/${id}/cancel`, {
              version: session.version,
            });
            setCancel(false);
            toast("Sessão cancelada");
          } catch (e) {
            toast((e as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        Esta sessão ficará marcada como cancelada no histórico.
      </Confirm>
    </div>
  );
}
function SetRow({
  set,
  index,
  session,
  disabled,
  onBusy,
  unit,
}: {
  unit: "kg" | "lb";
  set: WorkoutSet;
  index: number;
  session: Session;
  disabled: boolean;
  onBusy: (b: boolean) => void;
}) {
  const [load, setLoad] = useState(displayLoad(set.load, unit));
  const [loadChanged, setLoadChanged] = useState(false);
  const [reps, setReps] = useState(String(set.reps));
  const [type, setType] = useState(set.type);
  const [edit, setEdit] = useState(false);
  const [reason, setReason] = useState("");
  const actions = useActions();
  const toast = useToast();
  useEffect(() => {
    setLoad(displayLoad(set.load, unit));
    setLoadChanged(false);
    setReps(String(set.reps));
    setType(set.type);
  }, [set.load, set.reps, set.type, unit]);
  async function save() {
    onBusy(true);
    try {
      await actions(
        `/sessions/${session.id}/sets/${set.id}`,
        {
          version: session.version,
          load: loadChanged ? canonicalLoad(load, unit) : set.load,
          reps: Number(reps),
          type,
          completed: true,
          reason,
        },
        "PUT",
      );
      setEdit(false);
      toast("Série registrada");
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      onBusy(false);
    }
  }
  return (
    <>
      <div className={`set-row ${set.completed_at ? "completed" : ""}`}>
        <span className="mono">{index + 1}</span>
        <select
          aria-label={`Tipo da série ${index + 1}`}
          value={type}
          onChange={(e) => setType(e.target.value as WorkoutSet["type"])}
          disabled={disabled}
          style={{
            minWidth: 0,
            width: "100%",
            background: "transparent",
            color: "var(--muted)",
            border: 0,
            fontSize: 10,
          }}
        >
          <option value="normal">Normal</option>
          <option value="warmup">Aquec.</option>
          <option value="drop">Drop</option>
          <option value="failure">Falha</option>
        </select>
        <input
          aria-label={`Carga da série ${index + 1}`}
          type="number"
          min={0}
          step="0.5"
          value={load}
          disabled={disabled}
          onChange={(e) => {
            setLoad(e.target.value);
            setLoadChanged(true);
          }}
        />
        <input
          aria-label={`Repetições da série ${index + 1}`}
          type="number"
          min={0}
          max={1000}
          value={reps}
          disabled={disabled}
          onChange={(e) => setReps(e.target.value)}
        />
        <button
          className={`check-button ${set.completed_at ? "checked" : ""}`}
          disabled={disabled}
          aria-label={`Salvar série ${index + 1}`}
          onClick={() =>
            session.status === "finished" ? setEdit(true) : save()
          }
        >
          {set.completed_at ? (
            <Check size={20} />
          ) : (
            <Check size={17} style={{ color: "var(--muted)" }} />
          )}
        </button>
      </div>
      <Drawer
        open={edit}
        title="Corrigir série do histórico"
        onClose={() => setEdit(false)}
        footer={
          <>
            <Button onClick={() => setEdit(false)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={!reason.trim() || disabled}
              onClick={save}
            >
              Salvar correção
            </Button>
          </>
        }
      >
        <p className="form-help" style={{ marginBottom: 24 }}>
          Nova carga: {load} {unit} · {reps} repetições. O volume e os recordes
          serão recalculados.
        </p>
        <Field label="Motivo da correção">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </Drawer>
    </>
  );
}
