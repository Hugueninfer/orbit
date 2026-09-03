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
  return (
    <div className={`task-row ${task.status === "done" ? "done" : ""}`}>
      <CheckButton
        checked={task.status === "done"}
        onClick={onToggle}
        label={`${task.status === "done" ? "Reabrir" : "Concluir"} ${task.title}`}
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
            ` · ${task.checklist.filter((c) => c.done).length}/${task.checklist.length} subtarefas`}
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
          {priorities[task.priority]}
        </Badge>
        {task.tags.slice(0, 1).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
    </div>
  );
}
export default function Tasks() {
  const tasks = useApi<Task[]>("/tasks");
  const lists = useApi<TaskList[]>("/task-lists");
  const actions = useActions();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Task | null>(null);
  const [tab, setTab] = useState("today");
  const [search, setSearch] = useState("");
  const [list, setList] = useState("");
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
      toast(task.status === "done" ? "Tarefa reaberta" : "Tarefa concluída");
    } catch (e) {
      toast((e as Error).message, true);
    }
  }
  if (tasks.isLoading || lists.isLoading) return <Loading />;
  if (tasks.error)
    return <ErrorState error={tasks.error} retry={() => tasks.refetch()} />;
  const all = tasks.data ?? [];
  const active = all.filter((t) => !["done", "cancelled"].includes(t.status));
  const completed = all.filter((t) => t.status === "done");
  const filtered = all.filter(
    (t) =>
      (!list || t.list_id === list) &&
      t.title.toLowerCase().includes(search.toLowerCase()) &&
      (tab === "all" ||
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
        <Stat label="TAREFAS ATIVAS" value={active.length} icon={<ListTodo />}>
          <Progress value={100} tone="blue" />
          <p>Uma prioridade de cada vez.</p>
        </Stat>
        <Stat
          label="CONCLUÍDAS"
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
            % do seu backlog concluído
          </p>
        </Stat>
        <Stat
          label="EXIGEM ATENÇÃO"
          value={
            <span className={active.some((t) => t.is_overdue) ? "red" : ""}>
              {active.filter((t) => t.is_overdue).length}
            </span>
          }
          icon={<Clock3 />}
        >
          <p>Tarefas com prazo vencido</p>
        </Stat>
        <Stat
          label="LISTAS DE OPERAÇÃO"
          value={lists.data?.length ?? 0}
          icon={<CalendarDays />}
        >
          <Button variant="ghost" onClick={() => setNewList(true)}>
            <Plus size={15} />
            Criar lista
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
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <AddButton onClick={() => setParams({ new: "1" })}>
          Nova tarefa
        </AddButton>
      </div>
      <div className="toolbar">
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Buscar tarefas"
            placeholder="Buscar tarefas…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          className="control"
          aria-label="Filtrar por lista"
          value={list}
          onChange={(e) => setList(e.target.value)}
        >
          <option value="">Todas as listas</option>
          {lists.data?.map((l) => (
            <option value={l.id} key={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <section>
        <h2 className="section-heading">
          <Zap />
          {tab === "today"
            ? "Hoje — Seu foco principal"
            : tab === "done"
              ? "Tarefas concluídas"
              : tab === "upcoming"
                ? "Próximos dias — Em órbita"
                : "Todas as tarefas"}
          <Badge>{filtered.length} tarefas</Badge>
        </h2>
        {filtered.length ? (
          filtered.map((t) => (
            <div key={t.id} className="row" style={{ gap: 4 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <TaskRow
                  task={t}
                  listName={lists.data?.find((l) => l.id === t.list_id)?.name}
                  onEdit={() => setEditing(t)}
                  onToggle={() => toggle(t)}
                />
              </div>
              {list && tab === "all" && (
                <button
                  className="icon-button"
                  aria-label={`Mover ${t.title} para o topo`}
                  onClick={async () => {
                    const ordered = all
                      .filter((x) => x.list_id === list)
                      .sort((a, b) => a.position - b.position);
                    try {
                      await actions("/tasks/reorder", {
                        list_id: list,
                        items: [t, ...ordered.filter((x) => x.id !== t.id)].map(
                          (x) => ({ id: x.id, version: x.version }),
                        ),
                      });
                      toast("Ordem atualizada");
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
                  ? "Nenhuma tarefa encontrada"
                  : "Espaço para o que importa"
              }
              description={
                search
                  ? "Tente outro termo ou ajuste os filtros."
                  : "Organize suas ideias e transforme seus próximos passos em tarefas."
              }
              action={
                <AddButton onClick={() => setParams({ new: "1" })}>
                  Criar tarefa
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
        title="Nova lista"
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
                toast("Lista criada");
              } catch (e) {
                toast((e as Error).message, true);
              } finally {
                setBusy(false);
              }
            }}
          >
            Criar lista
          </Button>
        }
      >
        <Field label="Nome da lista">
          <input
            autoFocus
            value={listName}
            maxLength={100}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Ex.: Trabalho, Pessoal, Estudos"
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
      setError("Informe um título e selecione uma lista.");
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
      toast(task ? "Tarefa atualizada" : "Tarefa criada");
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
        title={task ? "Editar tarefa" : "Nova tarefa"}
        description={
          task
            ? "Organize os detalhes do seu próximo passo"
            : "Transforme uma ideia em ação"
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
                <span className="desktop-only">Arquivar</span>
              </Button>
            )}
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={save} disabled={busy}>
              {busy ? "Salvando…" : task ? "Salvar alterações" : "Criar tarefa"}
            </Button>
          </>
        }
      >
        <Field label="Título da tarefa">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder="O que precisa ser feito?"
          />
        </Field>
        <Field label="Descrição & notas">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexto, ideias e detalhes importantes…"
          />
        </Field>
        <div className="divider" />
        <div className="form-grid">
          <Field label="Lista / Projeto">
            <select value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prioridade">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task["priority"])}
            >
              {Object.entries(priorities).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Data de início">
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field label="Prazo">
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Estimativa (min)">
            <input
              type="number"
              min={1}
              max={10080}
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
          </Field>
          <Field label="Estado">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Task["status"])}
              disabled={!task}
            >
              <option value="todo">A fazer</option>
              <option value="in_progress">Em andamento</option>
              <option value="done">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </Field>
        </div>
        <div className="divider" />
        <div className="between" style={{ marginBottom: 16 }}>
          <span className="caps muted">Subtarefas</span>
          <span className="mono teal">
            {checklist.filter((c) => c.done).length}/{checklist.length}
          </span>
        </div>
        {checklist.map((c, index) => (
          <div className="row" key={c.id} style={{ marginBottom: 10 }}>
            <CheckButton
              checked={c.done}
              label={`Concluir subtarefa ${index + 1}`}
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
              aria-label={`Subtarefa ${index + 1}`}
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
              aria-label={`Remover subtarefa ${index + 1}`}
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
          Adicionar subtarefa
        </Button>
        <div className="divider" />
        <Field label="Tags" hint="Separe as tags por vírgula.">
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="trabalho, pessoal, importante"
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
        title="Arquivar esta tarefa?"
        pending={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await actions(`/tasks/${task!.id}`, {}, "DELETE");
            toast("Tarefa arquivada");
            onClose();
          } catch (e) {
            setError((e as Error).message);
            setRemove(false);
          } finally {
            setBusy(false);
          }
        }}
      >
        A tarefa sairá das listas ativas e seu histórico será preservado.
      </Confirm>
    </>
  );
}
