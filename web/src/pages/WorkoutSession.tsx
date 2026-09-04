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
import { Select } from "../components/Select";
import { useT } from "../i18n";
type SetDraft = {
  load: string;
  loadChanged: boolean;
  reps: string;
  type: WorkoutSet["type"];
  rpe: string;
  rir: string;
};
export default function WorkoutSession() {
  const t = useT();
  const { id } = useParams();
  const profile = useApi<Profile>("/me");
  const unit = profile.data?.weight_unit ?? "kg";
  const query = useApi<Session>(`/sessions/${id}`);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({});
  const [now, setNow] = useState(Date.now());
  const [restOverride, setRestOverride] = useState<number | null>(null);
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
  useEffect(() => setRestOverride(null), [query.data?.rest_until]);
  if (query.isLoading) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const session = query.data!;
  const exercise = session.exercises[exerciseIndex];
  if (!exercise) return <Empty title={t("Nenhum exercício nesta sessão")} />;
  const sets = session.exercises.flatMap((e) => e.sets);
  const completed = sets.filter((s) => s.completed_at).length;
  const active = session.status === "active";
  const remaining = Math.max(
    0,
    ((restOverride ??
      (session.rest_until ? Date.parse(session.rest_until) : now)) -
      now) /
      1000,
  );
  return (
    <div className="page session">
      <div className="between">
        <div>
          <div className="row" style={{ marginBottom: 10 }}>
            <Badge tone="teal">
              ●{" "}
              {active
                ? t("Ativo")
                : session.status === "finished"
                  ? t("Concluído")
                  : t("Cancelado")}
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
            {t("Exercício {{current}} de {{total}} · {{completed}}/{{sets}} séries concluídas", { current: exerciseIndex + 1, total: session.exercises.length, completed, sets: sets.length })}
          </p>
        </div>
        {active ? (
          <Button variant="danger" onClick={() => setFinish(true)}>
            <Flag size={16} />
            {t("Finalizar")}
          </Button>
        ) : (
          <Link className="button" to="/treinos">
            <ArrowLeft size={16} />
            {t("Voltar")}
          </Link>
        )}
      </div>
      <Progress value={sets.length ? (completed / sets.length) * 100 : 0} />
      <Card>
        <span className="caps blue">{t("Exercício atual")}</span>
        <h1 style={{ margin: "12px 0" }}>{exercise.name}</h1>
        <Badge>{t(exercise.muscle_group)}</Badge>
        <div className="divider" />
        <div className="between">
          <small>{t("Descanso entre séries")}</small>
          <span className="mono teal">{minutes(exercise.rest_seconds)}</span>
        </div>
        {!active && (
          <p className="form-help" style={{ marginTop: 16 }}>
            {t("Histórico preservado. Correções de séries exigem um motivo e ficam registradas.")}
          </p>
        )}
      </Card>
      <div>
        <h2 className="section-heading">{t("Controle de séries")}</h2>
        <div className="set-head">
          <span>{t("Série")}</span>
          <span>{t("Tipo")}</span>
          <span>{t("Carga ({{unit}})", { unit })}</span>
          <span>{t("Reps")}</span>
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
            draft={drafts[set.id]}
            onDraft={(draft) =>
              setDrafts((current) => {
                const next = { ...current };
                if (draft) next[set.id] = draft;
                else delete next[set.id];
                return next;
              })
            }
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
                toast(t("Série adicionada"));
              } catch (e) {
                toast((e as Error).message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Plus size={17} />
            {t("Adicionar série")}
          </Button>
        )}
      </div>
      {active ? (
        <Card className="timer">
          <div className="between">
            <span className="caps teal">● {t("Cronômetro de descanso")}</span>
            <span className="mono muted">
              {t("Meta: {{time}}", { time: minutes(exercise.rest_seconds) })}
            </span>
          </div>
          <div className="timer-clock">{minutes(remaining)}</div>
          <p className="muted">
            {remaining
              ? t("Respire. Prepare sua próxima série.")
              : t("Pronto para a próxima série")}
          </p>
          <div className="actions" style={{ marginTop: 22 }}>
            <Button
              onClick={() =>
                setRestOverride(Date.now() + Math.max(0, remaining - 15) * 1000)
              }
              disabled={!remaining}
            >
              −15s
            </Button>
            <Button
              onClick={() =>
                setRestOverride(Date.now() + (remaining + 30) * 1000)
              }
            >
              +30s
            </Button>
            <Button onClick={() => setRestOverride(Date.now())}>{t("Pular")}</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle>
            <Trophy />
            {t("Resumo da sessão")}
          </CardTitle>
          <div className="routine-metrics">
            <div>
              <strong>
                {decimal(Number(displayLoad(session.volume, unit)))} {unit}
              </strong>
              <small>{t("volume")}</small>
            </div>
            <div>
              <strong>{completed}</strong>
              <small>{t("séries")}</small>
            </div>
            <div>
              <strong>{session.pr_count}</strong>
              <small>{t("recordes")}</small>
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
          disabled={busy || exerciseIndex === 0}
          onClick={() => setExerciseIndex((i) => i - 1)}
        >
          <ArrowLeft size={17} />
          {t("Anterior")}
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
          disabled={busy || exerciseIndex === session.exercises.length - 1}
          onClick={() => setExerciseIndex((i) => i + 1)}
        >
          {t("Próximo")}
          <ArrowRight size={17} />
        </Button>
      </div>
      {active && (
        <div className="between">
          <Button
            variant="ghost"
            disabled={busy || Object.keys(drafts).length > 0}
            onClick={async () => {
              setBusy(true);
              try {
                await actions(`/sessions/${id}/copy-last`, {
                  version: session.version,
                });
                toast(t("Dados do treino anterior copiados"));
              } catch (e) {
                toast((e as Error).message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Copiar último treino")}
          </Button>
          <Button variant="ghost" onClick={() => setCancel(true)}>
            {t("Cancelar sessão")}
          </Button>
        </div>
      )}
      <Drawer
        open={finish}
        title={t("Finalizar treino")}
        onClose={() => setFinish(false)}
        footer={
          <>
            <Button onClick={() => setFinish(false)}>{t("Continuar treino")}</Button>
            <Button
              variant="primary"
              disabled={busy || !completed || Object.keys(drafts).length > 0}
              onClick={async () => {
                setBusy(true);
                try {
                  await actions(`/sessions/${id}/finish`, {
                    version: session.version,
                    notes,
                  });
                  toast(t("Treino concluído. Bom trabalho!"));
                  setFinish(false);
                } catch (e) {
                  toast((e as Error).message, true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={17} />
              {t("Concluir sessão")}
            </Button>
          </>
        }
      >
        <h1>{t("{{count}} séries concluídas", { count: completed })}</h1>
        {Object.keys(drafts).length > 0 && (
          <p className="form-error">
            {t("Salve as séries editadas antes de finalizar o treino.")}
          </p>
        )}
        <p className="muted" style={{ margin: "12px 0 26px" }}>
          {t("Volume registrado: {{volume}} {{unit}}", { volume: decimal(Number(displayLoad(session.volume, unit))), unit })}
        </p>
        <Field label={t("Notas do treino")}>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("Como foi seu treino hoje?")}
          />
        </Field>
        {!completed && (
          <p className="form-error">
            {t("Conclua pelo menos uma série antes de finalizar.")}
          </p>
        )}
      </Drawer>
      <Confirm
        open={cancel}
        title={t("Cancelar esta sessão?")}
        onClose={() => setCancel(false)}
        pending={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await actions(`/sessions/${id}/cancel`, {
              version: session.version,
            });
            setCancel(false);
            toast(t("Sessão cancelada"));
          } catch (e) {
            toast((e as Error).message, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("Esta sessão ficará marcada como cancelada no histórico.")}
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
  draft,
  onDraft,
}: {
  draft?: SetDraft;
  onDraft: (draft?: SetDraft) => void;
  unit: "kg" | "lb";
  set: WorkoutSet;
  index: number;
  session: Session;
  disabled: boolean;
  onBusy: (b: boolean) => void;
}) {
  const t = useT();
  const [load, setLoad] = useState(draft?.load ?? displayLoad(set.load, unit));
  const [loadChanged, setLoadChanged] = useState(draft?.loadChanged ?? false);
  const [reps, setReps] = useState(draft?.reps ?? String(set.reps));
  const [type, setType] = useState(draft?.type ?? set.type);
  const [rpe, setRpe] = useState(draft?.rpe ?? set.rpe?.toString() ?? "");
  const [rir, setRir] = useState(draft?.rir ?? set.rir?.toString() ?? "");
  const [edit, setEdit] = useState(false);
  function preserve(change: Partial<SetDraft>) {
    onDraft({ load, loadChanged, reps, type, rpe, rir, ...change });
  }
  const [reason, setReason] = useState("");
  const actions = useActions();
  const toast = useToast();
  useEffect(() => {
    if (draft) return;
    setLoad(displayLoad(set.load, unit));
    setLoadChanged(false);
    setReps(String(set.reps));
    setType(set.type);
    setRpe(set.rpe?.toString() ?? "");
    setRir(set.rir?.toString() ?? "");
  }, [set.load, set.reps, set.type, set.rpe, set.rir, unit, draft]);
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
          rpe: rpe === "" ? null : Number(rpe),
          rir: rir === "" ? null : Number(rir),
          reason,
        },
        "PUT",
      );
      onDraft(undefined);
      setEdit(false);
      toast(t("Série registrada"));
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
        <Select
          aria-label={t("Tipo da série {{count}}", { count: index + 1 })}
          value={type}
          onChange={(e) => {
            const value = e.target.value as WorkoutSet["type"];
            setType(value);
            preserve({ type: value });
          }}
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
          <option value="normal">{t("Normal")}</option>
          <option value="warmup">{t("Aquec.")}</option>
          <option value="drop">{t("Drop")}</option>
          <option value="failure">{t("Falha")}</option>
        </Select>
        <input
          aria-label={t("Carga da série {{count}}", { count: index + 1 })}
          type="number"
          min={0}
          step="0.5"
          value={load}
          disabled={disabled}
          onChange={(e) => {
            setLoad(e.target.value);
            setLoadChanged(true);
            preserve({ load: e.target.value, loadChanged: true });
          }}
        />
        <input
          aria-label={t("Repetições da série {{count}}", { count: index + 1 })}
          type="number"
          min={0}
          max={1000}
          value={reps}
          disabled={disabled}
          onChange={(e) => {
            setReps(e.target.value);
            preserve({ reps: e.target.value });
          }}
        />
        <button
          className={`check-button ${set.completed_at ? "checked" : ""}`}
          disabled={disabled}
          aria-label={t("Salvar série {{count}}", { count: index + 1 })}
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
      {draft && (
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={() => onDraft(undefined)}
        >
          {t("Descartar alterações da série {{count}}", { count: index + 1 })}
        </Button>
      )}
      <details className="set-effort">
        <summary>{t("Esforço · série {{count}} (opcional)", { count: index + 1 })}</summary>
        <div className="form-grid">
          <Field
            label={t("RPE da série {{count}}", { count: index + 1 })}
            hint={t("Esforço percebido, de 0 a 10")}
          >
            <input
              type="number"
              min={0}
              max={10}
              step="0.5"
              disabled={disabled}
              value={rpe}
              onChange={(e) => {
                setRpe(e.target.value);
                preserve({ rpe: e.target.value });
              }}
            />
          </Field>
          <Field
            label={t("RIR da série {{count}}", { count: index + 1 })}
            hint={t("Repetições que ainda conseguiria fazer")}
          >
            <input
              type="number"
              min={0}
              max={10}
              step="0.5"
              disabled={disabled}
              value={rir}
              onChange={(e) => {
                setRir(e.target.value);
                preserve({ rir: e.target.value });
              }}
            />
          </Field>
        </div>
      </details>
      <Drawer
        open={edit}
        title={t("Corrigir série do histórico")}
        onClose={() => setEdit(false)}
        footer={
          <>
            <Button onClick={() => setEdit(false)}>{t("Cancelar")}</Button>
            <Button
              variant="primary"
              disabled={!reason.trim() || disabled}
              onClick={save}
            >
              {t("Salvar correção")}
            </Button>
          </>
        }
      >
        <p className="form-help" style={{ marginBottom: 24 }}>
          {t("Nova carga: {{load}} {{unit}} · {{reps}} repetições. O volume e os recordes serão recalculados.", { load, unit, reps })}
        </p>
        <Field label={t("Motivo da correção")}>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      </Drawer>
    </>
  );
}
