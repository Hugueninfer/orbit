import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coffee,
  Leaf,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sprout,
  Square,
  Timer,
  Trees,
} from "lucide-react";
import { request } from "../api";
import { t, useLocale } from "../i18n";
import { Button, Confirm, Drawer, ErrorState, Loading } from "../components/ui";
import { Select } from "../components/Select";
import {
  useFocus,
  type FocusPage,
  type FocusSession,
} from "../components/focus/FocusProvider";
import { Tree, speciesNames, type Species } from "../components/focus/Tree";
import { formatTimer, growthStage } from "../focusClock";

const stages = ["Semente", "Broto", "Árvore jovem", "Árvore adulta"];
export default function Focus() {
  const locale = useLocale();
  const focus = useFocus();
  const { active, remaining, completed, pending, error, query } = focus;
  const [minutes, setMinutes] = useState("25");
  const [species, setSpecies] = useState<Species>("oak");
  const [label, setLabel] = useState("");
  const [breakMinutes, setBreakMinutes] = useState("5");
  const [cancel, setCancel] = useState(false);
  const [tab, setTab] = useState<"garden" | "history">("garden");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<FocusSession | null>(null);
  const history = useQuery({
    queryKey: ["orbit", "focus-history", tab, offset],
    queryFn: () =>
      request<FocusPage>(
        `/focus/history?garden=${tab === "garden"}&offset=${offset}`,
      ),
  });
  const validMinutes =
    /^\d+$/.test(minutes) && Number(minutes) >= 1 && Number(minutes) <= 180;
  const rest = active?.session_kind === "break";
  const celebration = !active && completed?.session_kind === "focus";
  const progress = active
    ? Math.max(0, Math.min(1, 1 - remaining / active.duration_seconds))
    : celebration
      ? 1
      : 0;
  const stage = active
    ? growthStage(Math.min(progress, 0.999))
    : celebration
      ? 3
      : 0;
  const displaySpecies =
    active?.species ?? (celebration ? completed.species : species);
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  function begin(kind: "focus" | "break" = "focus") {
    void focus.start({
      duration_minutes:
        kind === "focus" ? Number(minutes) : Number(breakMinutes),
      session_kind: kind,
      species,
      label: kind === "focus" ? label : "",
    });
  }
  if (query.isPending) return <Loading />;
  if (!query.data)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  return (
    <div className="page focus-page">
      <div className="focus-heading">
        <div>
          <span className="focus-eyebrow">
            <Sprout size={15} />
            {t("SEU TEMPO, CRIANDO RAÍZES")}
          </span>
          <h2>
            {t("Um pouco de foco.")}
            <br />
            <span>{t("Um jardim inteiro.")}</span>
          </h2>
          <p>
            {t("Transforme minutos de atenção em algo que cresce com você.")}
          </p>
        </div>
        <span className="focus-pill">
          <span />
          {t("Pomodoro vivo")}
        </span>
      </div>
      <div className="focus-stats">
        <div>
          <Trees />
          <span>
            {t("Árvores cultivadas")}
            <strong>{query.data.stats.trees}</strong>
          </span>
        </div>
        <div>
          <Timer />
          <span>
            {t("Foco de hoje")}
            <strong>
              {query.data.stats.today_minutes}
              <small> min</small>
            </strong>
          </span>
        </div>
        <div>
          <Leaf />
          <span>
            {t("Tempo cultivado")}
            <strong>
              {query.data.stats.minutes}
              <small> min</small>
            </strong>
          </span>
        </div>
      </div>
      <div className="focus-workspace">
        <section
          className={`focus-scene ${active?.status === "paused" ? "is-paused" : ""} ${celebration ? "is-complete" : ""}`}
          aria-label={t("Seu cultivo atual")}
        >
          <div className="scene-top">
            <span>
              <span className="scene-dot" />
              {rest
                ? t("Respire um pouco")
                : celebration
                  ? t("Colheita pronta")
                  : active
                    ? t("Cultivando seu foco")
                    : t("Tudo começa com uma semente")}
            </span>
            <span className="scene-number">
              {rest ? <Coffee size={17} /> : <Sprout size={17} />}
            </span>
          </div>
          <div className="focus-island">
            <div className="island-halo" />
            <div className="island-orbit" />
            <span className="garden-spark spark-one">✦</span>
            <span className="garden-spark spark-two">✧</span>
            <span className="garden-spark spark-three">·</span>
            <Tree
              species={displaySpecies}
              stage={rest ? 3 : stage}
              animated={active?.status === "running"}
            />
          </div>
          <div className="focus-clock-area">
            <span className="focus-overline">
              {active
                ? t(
                    active.status === "paused"
                      ? "Crescimento em pausa"
                      : rest
                        ? "INTERVALO"
                        : "TEMPO PARA FLORESCER",
                  )
                : celebration
                  ? t("Você fez crescer.")
                  : t("SEU PRÓXIMO CULTIVO")}
            </span>
            <div
              className="focus-clock"
              role="timer"
              aria-label={t("Tempo restante")}
            >
              {formatTimer(
                active
                  ? remaining
                  : celebration
                    ? 0
                    : validMinutes
                      ? Number(minutes) * 60
                      : 0,
              )}
            </div>
            <p>
              {active?.label ||
                (celebration
                  ? t("Mais uma árvore. Mais um compromisso com você.")
                  : t("Uma coisa de cada vez. Um minuto de cada vez."))}
            </p>
          </div>
          {active ? (
            <div className="focus-timer-actions">
              {remaining === 0 && active.status === "running" ? (
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() => void focus.command("complete")}
                >
                  <Check size={17} />
                  {t(pending ? "Salvando colheita…" : "Concluir sessão")}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={pending}
                  onClick={() =>
                    void focus.command(
                      active.status === "paused" ? "resume" : "pause",
                    )
                  }
                >
                  {active.status === "paused" ? (
                    <Play size={17} />
                  ) : (
                    <Pause size={17} />
                  )}{" "}
                  {t(active.status === "paused" ? "Retomar foco" : "Pausar")}
                </Button>
              )}
              <Button
                disabled={pending}
                onClick={() => setCancel(true)}
                aria-label={t("Encerrar sessão")}
              >
                <Square size={16} />
                {t("Encerrar")}
              </Button>
            </div>
          ) : (
            <div className="focus-timer-actions">
              <Button
                variant="primary"
                disabled={pending || !validMinutes}
                onClick={() => begin()}
              >
                <Play size={17} />
                {t(
                  pending
                    ? "Plantando…"
                    : celebration
                      ? "Plantar outra árvore"
                      : "Plantar e focar",
                )}
              </Button>
            </div>
          )}
          <div
            className="growth-track"
            aria-label={t("Estágios de crescimento")}
          >
            {stages.map((item, i) => (
              <div key={item} className={i <= stage && !rest ? "reached" : ""}>
                <span>{i < stage ? <Check size={12} /> : i + 1}</span>
                <small>{t(item)}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="focus-setup">
          <div className="focus-section-title">
            <span className="focus-section-icon">
              <Sparkles size={20} />
            </span>
            <div>
              <h3>
                {t(active ? "Seu pequeno ritual" : "Prepare seu momento")}
              </h3>
              <p>{t("Menos pressa. Mais presença.")}</p>
            </div>
          </div>
          {active ? (
            <>
              <div className="focus-active-summary">
                <span>
                  {t(rest ? "INTERVALO" : speciesNames[active.species])}
                </span>
                <strong>{active.duration_seconds / 60} min</strong>
                <p>{active.label || t("Cuidar de uma coisa importante.")}</p>
              </div>
              <div className="focus-progress">
                <div>
                  <span>{t("Progresso do cultivo")}</span>
                  <strong>{Math.floor(progress * 100)}%</strong>
                </div>
                <progress value={progress} max={1} />
              </div>
              <div className="focus-tip">
                <Leaf size={20} />
                <div>
                  <strong>{t("Pode deixar crescer.")}</strong>
                  <p>
                    {t(
                      "Você pode trocar de tela ou bloquear o celular. Seu tempo continua salvo. Pausar congela o crescimento.",
                    )}
                  </p>
                </div>
              </div>
              <p className="focus-footnote">
                {t("O jardim acompanha o tempo, sem vigiar sua atividade.")}
              </p>
            </>
          ) : (
            <>
              <label className="focus-label" htmlFor="focus-intention">
                {t("No que você quer focar?")}
                <span>{t("opcional")}</span>
              </label>
              <input
                id="focus-intention"
                maxLength={120}
                placeholder={t("Ex.: estudar, ler ou tirar uma ideia do papel")}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <label className="focus-label" htmlFor="focus-minutes">
                {t("Tempo de foco")}
              </label>
              <div className="focus-presets">
                {[25, 45, 60].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={Number(minutes) === n ? "selected" : ""}
                    aria-pressed={Number(minutes) === n}
                    onClick={() => setMinutes(String(n))}
                  >
                    {n} <span>min</span>
                  </button>
                ))}
                <div className="focus-custom">
                  <input
                    id="focus-minutes"
                    type="number"
                    min={1}
                    max={180}
                    step={1}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    aria-describedby="focus-range"
                  />
                  <span>min</span>
                </div>
              </div>
              <small className="focus-help" id="focus-range">
                {t("Escolha de 1 a 180 minutos.")}
              </small>
              <span className="focus-label" id="tree-label">
                {t("Escolha sua árvore")}
              </span>
              <div
                className="species-options"
                role="group"
                aria-labelledby="tree-label"
              >
                {(Object.keys(speciesNames) as Species[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={species === s ? "selected" : ""}
                    aria-pressed={species === s}
                    onClick={() => setSpecies(s)}
                  >
                    <Tree species={s} stage={3} island={false} />
                    <span>{t(speciesNames[s])}</span>
                    {species === s && (
                      <Check className="species-check" size={13} />
                    )}
                  </button>
                ))}
              </div>
              <div className="focus-tip">
                <Sprout size={20} />
                <p>
                  {t(
                    "Complete o tempo para guardar a árvore no seu jardim. Cada sessão é uma nova conquista.",
                  )}
                </p>
              </div>
              {completed && (
                <div className="focus-break">
                  <label htmlFor="break-minutes">
                    {t("Hora de respirar?")}
                  </label>
                  <div>
                    <Select
                      id="break-minutes"
                      aria-label={t("Duração do intervalo")}
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(e.target.value)}
                    >
                      {[5, 10, 15].map((n) => (
                        <option key={n} value={n}>
                          {n} min
                        </option>
                      ))}
                    </Select>
                    <Button disabled={pending} onClick={() => begin("break")}>
                      <Coffee size={16} />
                      {t("Fazer intervalo")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          {error && (
            <div className="focus-error" role="alert">
              {error.message}
              <p>
                {t(
                  "Seu progresso fica salvo. Tente novamente quando a conexão voltar.",
                )}
              </p>
            </div>
          )}
        </section>
      </div>
      <section className="focus-collection">
        <div className="collection-heading">
          <div>
            <span className="focus-eyebrow">
              {t("PEQUENOS PASSOS, NOVAS RAÍZES")}
            </span>
            <h3>{t("Seu jardim de conquistas")}</h3>
          </div>
          <div
            className="focus-tabs"
            role="group"
            aria-label={t("Visualização do jardim")}
          >
            <button
              aria-pressed={tab === "garden"}
              onClick={() => {
                setTab("garden");
                setOffset(0);
              }}
            >
              <Trees size={16} />
              {t("Jardim")}
            </button>
            <button
              aria-pressed={tab === "history"}
              onClick={() => {
                setTab("history");
                setOffset(0);
              }}
            >
              <RotateCcw size={15} />
              {t("Histórico")}
            </button>
          </div>
        </div>
        {history.isPending ? (
          <Loading />
        ) : history.isError ? (
          <ErrorState
            error={history.error}
            retry={() => void history.refetch()}
          />
        ) : !history.data?.items.length ? (
          <div className="garden-empty">
            <Sprout size={32} />
            <h4>{t("Seu jardim está esperando por você.")}</h4>
            <p>
              {t("Conclua a primeira sessão para ver sua árvore por aqui.")}
            </p>
          </div>
        ) : (
          <div className={tab === "garden" ? "garden-grid" : "focus-history"}>
            {history.data.items.map((row, i) => (
              <button
                className={
                  tab === "garden" ? "garden-plot" : "focus-history-row"
                }
                key={row.id}
                onClick={() => setSelected(row)}
              >
                {tab === "garden" ? (
                  <>
                    <span className="plot-number">
                      {String(query.data.stats.trees - offset - i).padStart(
                        2,
                        "0",
                      )}
                    </span>
                    <Tree species={row.species} />
                    <span className="plot-label">
                      {row.label || t(speciesNames[row.species])}
                    </span>
                    <span className="plot-meta">
                      {row.duration_seconds / 60} min ·{" "}
                      {t(speciesNames[row.species])}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`history-icon ${row.status}`}>
                      {row.session_kind === "break" ? (
                        <Coffee size={18} />
                      ) : (
                        <Sprout size={18} />
                      )}
                    </span>
                    <span>
                      <strong>
                        {row.label ||
                          t(
                            row.session_kind === "break"
                              ? "INTERVALO"
                              : speciesNames[row.species],
                          )}
                      </strong>
                      <small>
                        {row.finished_at && formatDate(row.finished_at)}
                      </small>
                    </span>
                    <span>
                      {row.duration_seconds / 60} min
                      <small>
                        {t(
                          row.status === "completed"
                            ? "Concluído"
                            : "Interrompido",
                        )}
                      </small>
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            ))}
          </div>
        )}
        {(offset > 0 || history.data?.has_more) && (
          <div className="focus-pagination">
            <Button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 24))}
            >
              <ArrowLeft size={16} />
              {t("Anterior")}
            </Button>
            <span>{Math.floor(offset / 24) + 1}</span>
            <Button
              disabled={!history.data?.has_more}
              onClick={() => setOffset(offset + 24)}
            >
              {t("Próxima")}
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
        <p className="garden-caption">
          <Leaf size={13} />
          {t("Não precisa ser perfeito. Só precisa começar.")}
        </p>
      </section>
      <Confirm
        open={cancel}
        title={t("Encerrar este cultivo?")}
        pending={pending}
        onClose={() => setCancel(false)}
        onConfirm={() => {
          void focus.command("cancel").then((row) => {
            if (row) setCancel(false);
          });
        }}
      >
        {t(
          "O tempo desta sessão será encerrado. Se ainda não terminou, ela não adicionará uma árvore ao jardim.",
        )}
      </Confirm>
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t("Detalhes do cultivo")}
        description={selected?.label || t("Cada árvore conta uma história.")}
      >
        {selected && (
          <div className="tree-details">
            <Tree
              species={selected.species}
              stage={selected.status === "completed" ? 3 : 1}
            />
            <h3>
              {t(
                selected.session_kind === "break"
                  ? "INTERVALO"
                  : speciesNames[selected.species],
              )}
            </h3>
            <p>
              {selected.duration_seconds / 60} min ·{" "}
              {t(
                selected.status === "completed" ? "Concluído" : "Interrompido",
              )}
            </p>
            <p>{selected.finished_at && formatDate(selected.finished_at)}</p>
            {selected.status === "completed" &&
              selected.session_kind === "focus" && (
                <span className="focus-pill">
                  <Check size={15} />
                  {t("Uma árvore conquistada")}
                </span>
              )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
