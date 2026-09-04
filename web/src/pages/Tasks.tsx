import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  CircleCheck,
  ListTodo,
  Clock3,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  Zap,
} from "lucide-react";
import { useApi, useActions } from "../api";
import type { Task, TaskList, Profile } from "../types";
import {
  AddButton,
  Badge,
  Button,
  Card,
  CheckButton,
  Confirm,
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
import { useT } from "../i18n";
import { Select } from "../components/Select";
const priorities = {
  none: "Normal",
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};
export function TaskRow({
  task,
  onEdit,
  onToggle,
  listName,
}: {
  task: Task;
  onEdit: () => void;
  onToggle: () => void;
  listName?: string;
}) {
  const t = useT();
  return (
    <div className={`task-row ${task.status === "done" ? "done" : ""}`}>
      <CheckButton
        checked={task.status === "done"}
        onClick={onToggle}
        label={t(task.status === "done" ? "Reabrir {{name}}" : "Concluir {{name}}", { name: task.title })}
      />
      <div className="row-content">
        <button className="task-title" onClick={onEdit}>
          {task.title}
        </button>
        <small className={task.is_overdue ? "red" : ""}>
          <CalendarDays
            size={12}
            style={{ verticalAlign: "-2px", marginRight: 4 }}
          />
          {dateLabel(task.due_date)}
          {listName && ` · ${listName}`}
          {task.checklist.length > 0 &&
            ` · ${t("{{done}}/{{total}} subtarefas", { done: task.checklist.filter((c) => c.done).length, total: task.checklist.length })}`}
        </small>
      </div>
      <div className="tags">
        <Badge
          tone={
            task.priority === "high"
              ? "red"
              : task.priority === "medium"
                ? "blue"
                : "muted"
          }
        >
          {t(priorities[task.priority])}
        </Badge>
        {task.tags.slice(0, 1).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
    </div>
  );
}
export default function Tasks() {
  const tasks = useApi<Task[]>("/tasks?archived=true");
  const lists = useApi<TaskList[]>("/task-lists");
  const actions = useActions();
  const toast = useToast();
  const t = useT();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Task | null>(null);
  const [tab, setTab] = useState("today");
  const [search, setSearch] = useState("");
  const [list, setList] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [newList, setNewList] = useState(false);
  const [listName, setListName] = useState("");
  const [busy, setBusy] = useState(false);
  const profile = useApi<Profile>("/me");
  const today = localDate(profile.data?.timezone);
  const open = params.has("new") || editing !== null;
  function close() {
    setEditing(null);
    setParams({});
  }
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
      toast(t(task.status === "done" ? "Tarefa reaberta" : "Tarefa concluída"));
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  if (tasks.isLoading || lists.isLoading) return <Loading />;
  if (tasks.error)
    return <ErrorState error={tasks.error} retry={() => tasks.refetch()} />;
  const all = (tasks.data ?? []).filter((t) => !t.archived);
  const active = all.filter((t) => !["done", "cancelled"].includes(t.status));
  const completed = all.filter((t) => t.status === "done");
  const filtered = (tasks.data ?? []).filter(
    (t) =>
      (tab === "archived" ? t.archived : !t.archived) &&
      (!priorityFilter || t.priority === priorityFilter) &&
      (!tagFilter || t.tags.includes(tagFilter)) &&
      (!list || t.list_id === list) &&
      t.title.toLowerCase().includes(search.toLowerCase()) &&
      (tab === "all" ||
        tab === "archived" ||
        (tab === "done" && t.status === "done") ||
        (tab === "today" &&
          !["done", "cancelled"].includes(t.status) &&
          (!t.due_date || t.due_date <= today)) ||
        (tab === "upcoming" &&
          !["done", "cancelled"].includes(t.status) &&
          t.due_date &&
          t.due_date > today)),
  );
  return (
    <div className="page">
      <div className="stats">
        <Stat label={t("TAREFAS ATIVAS")} value={active.length} icon={<ListTodo />}>
          <Progress value={100} tone="blue" />
          <p>{t("Uma prioridade de cada vez.")}</p>
        </Stat>
        <Stat
          label={t("CONCLUÍDAS")}
          value={
            <>
              {completed.length}
              <small> / {all.length}</small>
            </>
          }
          icon={<CircleCheck />}
        >
          <Progress
            value={all.length ? (completed.length / all.length) * 100 : 0}
          />
          <p>
            {all.length ? Math.round((completed.length / all.length) * 100) : 0}
            {t("% do seu backlog concluído")}
          </p>
        </Stat>
        <Stat
          label={t("EXIGEM ATENÇÃO")}
          value={
            <span className={active.some((t) => t.is_overdue) ? "red" : ""}>
              {active.filter((t) => t.is_overdue).length}
            </span>
          }
          icon={<Clock3 />}
        >
          <p>{t("Tarefas com prazo vencido")}</p>
        </Stat>
        <Stat
          label={t("LISTAS DE OPERAÇÃO")}
          value={lists.data?.length ?? 0}
          icon={<CalendarDays />}
        >
          <Button variant="ghost" onClick={() => setNewList(true)}>
            <Plus size={15} />
            {t("Criar lista")}
          </Button>
        </Stat>
      </div>
      <div className="toolbar">
        <div className="tabs">
          {[
            ["today", "Hoje"],
            ["upcoming", "Próximas"],
            ["all", "Todas"],
            ["done", "Concluídas"],
            ["archived", "Arquivadas"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <AddButton onClick={() => setParams({ new: "1" })}>
          {t("Nova tarefa")}
        </AddButton>
      </div>
      <div className="toolbar">
        <label className="search">
          <Search size={16} />
          <input
            aria-label={t("Buscar tarefas")}
            placeholder={t("Buscar tarefas…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          className="control"
          aria-label={t("Filtrar por lista")}
          value={list}
          onChange={(e) => setList(e.target.value)}
        >
          <option value="">{t("Todas as listas")}</option>
          {lists.data?.map((l) => (
            <option value={l.id} key={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Select
          className="control"
          aria-label={t("Filtrar por prioridade")}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">{t("Todas as prioridades")}</option>
          {Object.entries(priorities).map(([k, v]) => (
            <option key={k} value={k}>
              {t(v)}
            </option>
          ))}
        </Select>
        <Select
          className="control"
          aria-label={t("Filtrar por tag")}
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">{t("Todas as tags")}</option>
          {[...new Set((tasks.data ?? []).flatMap((t) => t.tags))]
            .sort()
            .map((tag) => (
              <option key={tag}>{tag}</option>
            ))}
        </Select>
      </div>
      <section>
        <h2 className="section-heading">
          <Zap />
          {tab === "today"
            ? t("Hoje — Seu foco principal")
            : tab === "done"
              ? t("Tarefas concluídas")
              : tab === "upcoming"
                ? t("Próximos dias — Em órbita")
                : t("Todas as tarefas")}
          <Badge>{t("{{count}} tarefas", { count: filtered.length })}</Badge>
        </h2>
        {filtered.length ? (
          filtered.map((task) => (
            <div key={task.id} className="row" style={{ gap: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TaskRow
                  task={task}
                  listName={lists.data?.find((l) => l.id === task.list_id)?.name}
                  onEdit={() => setEditing(task)}
                  onToggle={() => {
                    if (!task.archived) void toggle(task);
                  }}
                />
              </div>
              {task.archived && (
                <Button
                  onClick={async () => {
                    try {
                      await actions(
                        `/tasks/${task.id}`,
                        { version: task.version, archived: false },
                        "PATCH",
                      );
                      toast(t("Tarefa restaurada"));
                    } catch (e) {
                      toast((e as Error).message, true);
                    }
                  }}
                >
                  {t("Restaurar")}
                </Button>
              )}
              {list && tab === "all" && (
                <button
                  className="icon-button"
                  aria-label={t("Mover {{name}} para o topo", { name: task.title })}
                  onClick={async () => {
                    const ordered = all
                      .filter((x) => x.list_id === list)
                      .sort((a, b) => a.position - b.position);
                    try {
                      await actions("/tasks/reorder", {
                        list_id: list,
                        items: [task, ...ordered.filter((x) => x.id !== task.id)].map(
                          (x) => ({ id: x.id, version: x.version }),
                        ),
                      });
                      toast(t("Ordem atualizada"));
                    } catch (e) {
                      toast((e as Error).message, true);
                    }
                  }}
                >
                  <ArrowUp size={15} />
                </button>
              )}
            </div>
          ))
        ) : (
          <Card>
            <Empty
              title={
                search
                  ? t("Nenhuma tarefa encontrada")
                  : t("Espaço para o que importa")
              }
              description={
                search
                  ? t("Tente outro termo ou ajuste os filtros.")
                  : t("Organize suas ideias e transforme seus próximos passos em tarefas.")
              }
              action={
                <AddButton onClick={() => setParams({ new: "1" })}>
                  {t("Criar tarefa")}
                </AddButton>
              }
            />
          </Card>
        )}
      </section>
      {open && (
        <TaskEditor task={editing} lists={lists.data ?? []} onClose={close} />
      )}
      <Drawer
        title={t("Nova lista")}
        open={newList}
        onClose={() => setNewList(false)}
        footer={
          <Button
            variant="primary"
            disabled={busy || !listName.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await actions("/task-lists", {
                  name: listName,
                  color: "#44e2cd",
                });
                setNewList(false);
                setListName("");
                toast(t("Lista criada"));
              } catch (e) {
                toast((e as Error).message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Criar lista")}
          </Button>
        }
      >
        <Field label={t("Nome da lista")}>
          <input
            autoFocus
            value={listName}
            maxLength={100}
            onChange={(e) => setListName(e.target.value)}
            placeholder={t("Ex.: Trabalho, Pessoal, Estudos")}
          />
        </Field>
      </Drawer>
    </div>
  );
}
function TaskEditor({
  task,
  lists,
  onClose,
}: {
  task: Task | null;
  lists: TaskList[];
  onClose: () => void;
}) {
  const t = useT();
  const actions = useActions();
  const toast = useToast();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [listId, setListId] = useState(task?.list_id ?? lists[0]?.id ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "none");
  const [due, setDue] = useState(task?.due_date ?? "");
  const [start, setStart] = useState(task?.start_date ?? "");
  const [estimate, setEstimate] = useState(
    task?.estimate_minutes?.toString() ?? "",
  );
  const [status, setStatus] = useState(task?.status ?? "todo");
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "");
  const [checklist, setChecklist] = useState(task?.checklist ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(false);
  async function save() {
    setError("");
    if (!title.trim() || !listId) {
      setError(t("Informe um título e selecione uma lista."));
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description,
        list_id: listId,
        priority,
        due_date: due || null,
        start_date: start || null,
        estimate_minutes: estimate ? Number(estimate) : null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        checklist,
      };
      await actions(
        task ? `/tasks/${task.id}` : "/tasks",
        task ? { ...payload, version: task.version, status } : payload,
        task ? "PATCH" : "POST",
      );
      toast(t(task ? "Tarefa atualizada" : "Tarefa criada"));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Drawer
        open
        title={t(task ? "Editar tarefa" : "Nova tarefa")}
        description={
          task
            ? t("Organize os detalhes do seu próximo passo")
            : t("Transforme uma ideia em ação")
        }
        onClose={onClose}
        footer={
          <>
            {task && (
              <Button
                variant="ghost"
                style={{ marginRight: "auto", color: "var(--danger)" }}
                onClick={() => setRemove(true)}
              >
                <Trash2 size={17} />
                <span>{t("Arquivar")}</span>
              </Button>
            )}
            <Button onClick={onClose}>{t("Cancelar")}</Button>
            <Button variant="primary" onClick={save} disabled={busy}>
              {t(busy ? "Salvando…" : task ? "Salvar alterações" : "Criar tarefa")}
            </Button>
          </>
        }
      >
        <Field label={t("Título da tarefa")}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder={t("O que precisa ser feito?")}
          />
        </Field>
        <Field label={t("Descrição & notas")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("Contexto, ideias e detalhes importantes…")}
          />
        </Field>
        <div className="divider" />
        <div className="form-grid">
          <Field label={t("Lista / Projeto")}>
            <Select value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Prioridade")}>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task["priority"])}
            >
              {Object.entries(priorities).map(([k, v]) => (
                <option key={k} value={k}>
                  {t(v)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="form-grid">
          <Field label={t("Data de início")}>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label={t("Prazo")}>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label={t("Estimativa (min)")}>
            <input
              type="number"
              min={1}
              max={10080}
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
          </Field>
          <Field label={t("Estado")}>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as Task["status"])}
              disabled={!task}
            >
              <option value="todo">{t("A fazer")}</option>
              <option value="in_progress">{t("Em andamento")}</option>
              <option value="done">{t("Concluída")}</option>
              <option value="cancelled">{t("Cancelada")}</option>
            </Select>
          </Field>
        </div>
        <div className="divider" />
        <div className="between" style={{ marginBottom: 16 }}>
          <span className="caps muted">{t("Subtarefas")}</span>
          <span className="mono teal">
            {checklist.filter((c) => c.done).length}/{checklist.length}
          </span>
        </div>
        {checklist.map((c, index) => (
          <div className="row" key={c.id} style={{ marginBottom: 10 }}>
            <CheckButton
              checked={c.done}
              label={t("Concluir subtarefa {{index}}", { index: index + 1 })}
              onClick={() =>
                setChecklist(
                  checklist.map((x) =>
                    x.id === c.id ? { ...x, done: !x.done } : x,
                  ),
                )
              }
            />
            <input
              className="control"
              aria-label={t("Subtarefa {{index}}", { index: index + 1 })}
              value={c.text}
              onChange={(e) =>
                setChecklist(
                  checklist.map((x) =>
                    x.id === c.id ? { ...x, text: e.target.value } : x,
                  ),
                )
              }
            />
            <button
              className="icon-button"
              aria-label={t("Remover subtarefa {{index}}", { index: index + 1 })}
              onClick={() =>
                setChecklist(checklist.filter((x) => x.id !== c.id))
              }
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <Button
          style={{ width: "100%", borderStyle: "dashed" }}
          onClick={() =>
            setChecklist([
              ...checklist,
              { id: crypto.randomUUID(), text: "", done: false },
            ])
          }
        >
          <Plus size={16} />
          {t("Adicionar subtarefa")}
        </Button>
        <div className="divider" />
        <Field label={t("Tags")} hint={t("Separe as tags por vírgula.")}>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t("trabalho, pessoal, importante")}
          />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </Drawer>
      <Confirm
        open={remove}
        onClose={() => setRemove(false)}
        title={t("Arquivar esta tarefa?")}
        pending={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await actions(`/tasks/${task!.id}`, {}, "DELETE");
            toast(t("Tarefa arquivada"));
            onClose();
          } catch (e) {
            setError((e as Error).message);
            setRemove(false);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("A tarefa sairá das listas ativas e seu histórico será preservado.")}
      </Confirm>
    </>
  );
}
