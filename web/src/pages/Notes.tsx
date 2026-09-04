import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  NotebookPen,
  Folder,
  FolderPlus,
  Plus,
  Search,
  Star,
  Trash2,
  Inbox,
  ChevronRight,
  PenLine,
  ArrowLeft,
  Feather,
  MoreHorizontal,
} from "lucide-react";
import { request, useApi } from "../api";
import { t, useLocale, getLocale } from "../i18n";
import {
  Button,
  Drawer,
  Field,
  Confirm,
  ErrorState,
  Loading,
} from "../components/ui";
import { NoteEditor, type EditorHandle } from "../notes/NoteEditor";
import type {
  Note,
  NotePage,
  Folder as FolderData,
  Draft,
} from "../notes/types";
import "../notes/notes.css";

export default function Notes() {
  useLocale();
  const qc = useQueryClient();
  const me = useApi<{ id: string; timezone: string }>("/me");
  const [view, setView] = useState("journal");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [showFolders, setShowFolders] = useState(false);
  const [editingFolder, setEditingFolder] = useState<
    FolderData | null | undefined
  >(undefined);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("#7692ff");
  const [deletingFolder, setDeletingFolder] = useState<FolderData | null>(null);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  const editor = useRef<EditorHandle>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setOffset(0);
    }, 220);
    return () => clearTimeout(timer);
  }, [search]);
  const folders = useQuery({
    queryKey: ["orbit", "note-folders", me.data?.id],
    queryFn: () => request<FolderData[]>("/note-folders"),
    enabled: !!me.data,
    staleTime: 30000,
  });
  const params = new URLSearchParams({
    view,
    q: query,
    offset: String(offset),
    limit: "30",
  });
  if (folderId) params.set("folder_id", folderId);
  const list = useQuery({
    queryKey: [
      "orbit",
      "notes-list",
      me.data?.id,
      view,
      folderId,
      query,
      offset,
    ],
    queryFn: () => request<NotePage>(`/notes?${params}`),
    enabled: !!me.data,
    staleTime: 30000,
  });
  const detail = useQuery({
    queryKey: ["orbit", "note", me.data?.id, selected, editorKey],
    queryFn: () => request<Note>(`/notes/${selected}`),
    enabled: !!selected && !!me.data,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["orbit", "notes-list"] });
    void qc.invalidateQueries({ queryKey: ["orbit", "note-folders"] });
  };
  const run = async (action: () => Promise<void>, flush = true) => {
    setBusy(true);
    setError(null);
    try {
      if (flush) await editor.current?.flush();
      await action();
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  };
  const choose = (id: string | null) =>
    void run(async () => {
      setSelected(id);
      setEditorKey((k) => k + 1);
      setShowFolders(false);
    });
  const filter = (v: string, f: string | null = null) => {
    setView(v);
    setFolderId(f);
    setOffset(0);
    setShowFolders(false);
  };
  const today = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: me.data?.timezone ?? "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  const create = async (draft?: Draft) => {
    const body = draft ?? {
      title: "",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      folder_id: folderId,
      journal_date: view === "journal" ? today() : null,
    };
    const note = await request<Note>("/notes", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(body),
    });
    // A copy can escape a conflicting draft without overwriting the original.
    setSelected(note.id);
    setEditorKey((k) => k + 1);
    refresh();
    setShowFolders(false);
  };
  const openFolder = (folder: FolderData | null) => {
    setFolderName(folder?.name ?? "");
    setFolderColor(folder?.color ?? "#7692ff");
    setEditingFolder(folder);
  };
  const selectedFolder = folders.data?.find((f) => f.id === folderId);
  const title =
    selectedFolder?.name ??
    t(
      view === "journal"
        ? "Meu diário"
        : view === "favorites"
          ? "Favoritas"
          : view === "trash"
            ? "Lixeira"
            : view === "unfiled"
              ? "Sem pasta"
              : "Todas as notas",
    );
  const remove = (note: Note) => {
    if (detail.data?.deleted_at && note.deleted_at) {
      setDeletingNote(note);
      return;
    }
    setSelected(null);
    refresh();
  };
  return (
    <div className={`notes-page ${selected ? "has-selected" : ""}`}>
      <div className="notes-page-heading">
        <div>
          <span className="note-eyebrow">
            <Feather size={14} />
            {t("PENSAR. ESCREVER. GUARDAR.")}
          </span>
          <h2>{t("Notas & Diário")}</h2>
          <p>{t("Ideias organizadas. Memórias por perto.")}</p>
        </div>
        <Button
          variant="primary"
          disabled={busy || !me.data}
          onClick={() => void run(() => create())}
        >
          <Plus size={17} />
          {t(view === "journal" ? "Novo registro" : "Nova nota")}
        </Button>
      </div>
      {error && (
        <div className="note-page-error" role="alert">
          <span>{error.message}</span>
          <button className="button" onClick={() => setError(null)}>
            {t("Fechar")}
          </button>
        </div>
      )}
      <div className="notes-workspace">
        <aside
          className={`notes-folders ${showFolders ? "mobile-open" : ""}`}
          aria-label={t("Organizar notas")}
        >
          <div className="notes-rail-heading">
            <span>{t("BIBLIOTECA")}</span>
            <button
              className="icon-button note-back"
              aria-label={t("Voltar às notas")}
              onClick={() => setShowFolders(false)}
            >
              <ArrowLeft size={17} />
            </button>
          </div>
          {(
            [
              { id: "journal", label: "Meu diário", icon: BookOpen },
              { id: "all", label: "Todas as notas", icon: NotebookPen },
              { id: "favorites", label: "Favoritas", icon: Star },
              { id: "unfiled", label: "Sem pasta", icon: Inbox },
            ] as const
          ).map((x) => (
            <button
              key={x.id}
              className={`notes-filter ${view === x.id && !folderId ? "active" : ""}`}
              onClick={() => filter(x.id)}
            >
              <x.icon size={18} />
              <span>{t(x.label)}</span>
            </button>
          ))}
          <div className="notes-rail-heading">
            <span>{t("SUAS PASTAS")}</span>
            <button
              className="icon-button"
              aria-label={t("Nova pasta")}
              title={t("Nova pasta")}
              onClick={() => openFolder(null)}
            >
              <FolderPlus size={17} />
            </button>
          </div>
          {folders.data?.map((f) => (
            <div key={f.id} className="notes-folder-row">
              <button
                className={`notes-filter ${folderId === f.id ? "active" : ""}`}
                onClick={() => filter("all", f.id)}
              >
                <Folder size={17} style={{ color: f.color }} />
                <span>{f.name}</span>
                <small>{f.count}</small>
              </button>
              <button
                className="folder-menu"
                aria-label={t("Gerenciar pasta {{name}}", { name: f.name })}
                onClick={() => openFolder(f)}
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
          ))}
          {!folders.data?.length && (
            <p className="notes-rail-hint">
              {t("Crie pastas para estudos, planos e o que mais importa.")}
            </p>
          )}
          <button className="notes-add-folder" onClick={() => openFolder(null)}>
            <Plus size={15} />
            {t("Nova pasta")}
          </button>
          <div className="notes-rail-bottom">
            <button
              className={`notes-filter ${view === "trash" ? "active" : ""}`}
              onClick={() => filter("trash")}
            >
              <Trash2 size={17} />
              {t("Lixeira")}
            </button>
            <div className="notes-quote">
              <Feather size={23} />
              <p>{t("Uma ideia merece um lugar para ficar.")}</p>
            </div>
          </div>
        </aside>
        <section className="notes-list-pane" aria-label={t("Lista de notas")}>
          <header className="notes-list-heading">
            <div>
              <button
                className="icon-button mobile-folder-button"
                aria-label={t("Abrir pastas")}
                onClick={() => setShowFolders(true)}
              >
                <Folder size={18} />
              </button>
              <h3>{title}</h3>
            </div>
            <button
              className="icon-button"
              aria-label={t("Nova nota")}
              disabled={busy || !me.data}
              onClick={() => void run(() => create())}
            >
              <PenLine size={18} />
            </button>
          </header>
          <label className="notes-search">
            <Search size={16} />
            <input
              aria-label={t("Buscar notas")}
              placeholder={t("Buscar nas notas…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="notes-list-scroll">
            {list.isLoading || me.isLoading ? (
              <Loading />
            ) : list.error || me.error ? (
              <ErrorState
                error={(list.error || me.error) as Error}
                retry={() => void list.refetch()}
              />
            ) : (
              <>
                {!list.data?.items.length && (
                  <div className="notes-empty-list">
                    <NotebookPen size={32} />
                    <strong>{t("Um novo começo")}</strong>
                    <p>
                      {t(
                        query
                          ? "Nenhuma nota encontrada."
                          : "Suas próximas ideias começam aqui.",
                      )}
                    </p>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() => void run(() => create())}
                    >
                      {t("Escrever uma nota")}
                    </button>
                  </div>
                )}
                {list.data?.items.map((n) => (
                  <button
                    className={`note-preview ${selected === n.id ? "selected" : ""}`}
                    key={n.id}
                    onClick={() => choose(n.id)}
                  >
                    <div className="note-preview-meta">
                      <span>
                        {new Intl.DateTimeFormat(getLocale(), {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          timeZone: n.journal_date ? "UTC" : me.data?.timezone,
                        }).format(
                          new Date(
                            n.journal_date
                              ? n.journal_date + "T12:00:00Z"
                              : n.updated_at,
                          ),
                        )}
                      </span>
                      {n.favorite && (
                        <Star
                          size={12}
                          className="is-favorite"
                          fill="currentColor"
                        />
                      )}
                    </div>
                    <strong>{n.title || t("Sem título")}</strong>
                    <p>{n.preview || t("Uma página em branco…")}</p>
                    <div className="note-preview-tags">
                      {n.journal_date && (
                        <span>
                          <BookOpen size={11} />
                          {t("Diário")}
                        </span>
                      )}
                      {n.folder_id && (
                        <span>
                          <Folder size={11} />
                          {
                            folders.data?.find((f) => f.id === n.folder_id)
                              ?.name
                          }
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {(offset > 0 || list.data?.has_more) && (
                  <div className="notes-pagination">
                    <button
                      className="button"
                      disabled={!offset}
                      onClick={() => setOffset(offset - 30)}
                    >
                      {t("Anterior")}
                    </button>
                    <button
                      className="button"
                      disabled={!list.data?.has_more}
                      onClick={() => setOffset(offset + 30)}
                    >
                      {t("Próximo")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
        {selected ? (
          detail.data && me.data ? (
            <NoteEditor
              key={`${selected}:${editorKey}`}
              ref={editor}
              note={detail.data}
              owner={me.data.id}
              folders={folders.data ?? []}
              onSaved={refresh}
              onBack={() => choose(null)}
              onRemove={remove}
              onCopy={create}
              onReload={() => {
                setEditorKey((k) => k + 1);
              }}
            />
          ) : (
            <div className="note-detail-loading">
              <button className="button" onClick={() => choose(null)}>
                {t("Voltar às notas")}
              </button>
              {detail.error ? (
                <ErrorState
                  error={detail.error}
                  retry={() => void detail.refetch()}
                />
              ) : (
                <Loading />
              )}
            </div>
          )
        ) : (
          <div className="notes-welcome">
            <div className="notes-welcome-orbit">
              <Feather size={44} />
            </div>
            <span className="note-eyebrow">
              {t("SEU PEQUENO UNIVERSO DE IDEIAS")}
            </span>
            <h3>{t("Dê espaço aos seus pensamentos.")}</h3>
            <p>
              {t(
                "Registre o dia, organize os estudos ou guarde a próxima grande ideia. Tudo no seu ritmo.",
              )}
            </p>
            <Button
              variant="primary"
              disabled={busy || !me.data}
              onClick={() => void run(() => create())}
            >
              {t("Começar a escrever")}
              <ChevronRight size={17} />
            </Button>
            <div className="notes-welcome-features">
              <span>
                <BookOpen size={16} />
                {t("Diário pessoal")}
              </span>
              <span>
                <Folder size={16} />
                {t("Pastas organizadas")}
              </span>
            </div>
          </div>
        )}
      </div>
      <Drawer
        title={t(editingFolder ? "Editar pasta" : "Nova pasta")}
        open={editingFolder !== undefined}
        onClose={() => setEditingFolder(undefined)}
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await request(
                editingFolder
                  ? `/note-folders/${editingFolder.id}`
                  : "/note-folders",
                {
                  method: editingFolder ? "PATCH" : "POST",
                  body: JSON.stringify({
                    name: folderName,
                    color: folderColor,
                    ...(editingFolder
                      ? { version: editingFolder.version }
                      : {}),
                  }),
                },
              );
              setEditingFolder(undefined);
              refresh();
            });
          }}
        >
          {error && (
            <p role="alert" className="error">
              {error.message}
            </p>
          )}
          <Field label={t("Nome da pasta")}>
            <input
              required
              autoFocus
              maxLength={120}
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder={t("Ex.: Faculdade, Presentes, Projetos")}
            />
          </Field>
          <Field label={t("Cor da pasta")}>
            <div className="note-folder-colors">
              {[
                "#7692ff",
                "#38d9c5",
                "#f7c66d",
                "#ea8dba",
                "#ac96ee",
                "#81badf",
              ].map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={c}
                  aria-pressed={folderColor === c}
                  style={{ background: c }}
                  onClick={() => setFolderColor(c)}
                >
                  {folderColor === c ? "✓" : ""}
                </button>
              ))}
              <input
                type="color"
                aria-label={t("Cor personalizada")}
                value={folderColor}
                onChange={(e) => setFolderColor(e.target.value)}
              />
            </div>
          </Field>
          <Button
            variant="primary"
            type="submit"
            disabled={busy || !folderName.trim()}
          >
            {t("Salvar pasta")}
          </Button>
          {editingFolder && (
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                setDeletingFolder(editingFolder);
                setEditingFolder(undefined);
              }}
            >
              <Trash2 size={16} />
              {t("Excluir pasta")}
            </Button>
          )}
        </form>
      </Drawer>
      <Confirm
        open={!!deletingFolder}
        title={t("Excluir pasta?")}
        children={t("As notas serão mantidas em Sem pasta.")}
        pending={busy}
        onClose={() => setDeletingFolder(null)}
        onConfirm={() =>
          void run(async () => {
            await request(
              `/note-folders/${deletingFolder!.id}?version=${deletingFolder!.version}`,
              { method: "DELETE" },
            );
            if (folderId === deletingFolder!.id) filter("unfiled");
            setDeletingFolder(null);
            setSelected(null);
            refresh();
          })
        }
      />
      <Confirm
        open={!!deletingNote}
        title={t("Excluir nota definitivamente?")}
        children={t("Esta ação não pode ser desfeita.")}
        pending={busy}
        onClose={() => setDeletingNote(null)}
        onConfirm={() =>
          void run(async () => {
            await request(
              `/notes/${deletingNote!.id}?version=${deletingNote!.version}`,
              { method: "DELETE" },
            );
            setDeletingNote(null);
            setSelected(null);
            refresh();
          })
        }
      />
    </div>
  );
}
