import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  CloudUpload,
  Star,
  Trash2,
  RotateCcw,
  CalendarDays,
  Copy,
  Expand,
  Minimize,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackDraft } from "./draftGuard";
import { request, ApiError } from "../api";
import { t, useLocale, getLocale } from "../i18n";
import { Select } from "../components/Select";
import { NoteSaver } from "./autosave";
import { draftOf, type Draft, type Folder, type Note } from "./types";
import RichEditor from "./RichEditor";
export type EditorHandle = { flush: () => Promise<void> };
export const NoteEditor = forwardRef<
  EditorHandle,
  {
    note: Note;
    owner: string;
    folders: Folder[];
    onSaved: () => void;
    onBack: () => void;
    onRemove: (note: Note) => void;
    onReload: () => void;
    onCopy: (draft: Draft) => Promise<void>;
  }
>(function NoteEditor(
  { note, owner, folders, onSaved, onBack, onRemove, onReload, onCopy },
  ref,
) {
  useLocale();
  const navigate = useNavigate();
  const [, render] = useState(0);
  const [focus, setFocus] = useState(false);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const storageKey = `orbit.note-draft:${owner}:${note.id}`;
  const [initial] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (
        saved &&
        typeof saved.version === "number" &&
        typeof saved.draft?.title === "string" &&
        saved.draft.content?.type === "doc" &&
        !note.deleted_at
      )
        return saved as { draft: Draft; version: number };
    } catch {
      /* unavailable storage */
    }
    return null;
  });
  const [saver] = useState(() => {
    const value = new NoteSaver(
      draftOf(note),
      initial?.version ?? note.version,
      async (draft, version) => {
        const result = await request<Note>(`/notes/${note.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...draft, version }),
        });
        onSaved();
        return result.version;
      },
      () => {
        try {
          if (value.dirty)
            sessionStorage.setItem(
              storageKey,
              JSON.stringify({ draft: value.value, version: value.version }),
            );
          else sessionStorage.removeItem(storageKey);
        } catch {
          /* no durable browser storage */
        }
        trackDraft(storageKey, value.dirty);
        render((n) => n + 1);
      },
    );
    if (initial) value.value = initial.draft;
    return value;
  });
  const flush = () => {
    clearTimeout(timer.current);
    return saver.flush();
  };
  useImperativeHandle(ref, () => ({ flush }), [saver]);
  useEffect(() => {
    trackDraft(storageKey, saver.dirty);
    const leaving = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest?.("a[href]");
      if (
        !saver.dirty ||
        !anchor ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const destination = new URL(anchor.getAttribute("href")!, location.href);
      if (
        destination.origin !== location.origin ||
        destination.href === location.href
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      void flush()
        .then(() =>
          navigate(
            destination.pathname + destination.search + destination.hash,
          ),
        )
        .catch(() => {});
    };
    document.addEventListener("click", leaving, true);
    const hidden = () => {
      if (document.visibilityState === "hidden" && saver.dirty)
        void flush().catch(() => {});
    };

    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("click", leaving, true);
      document.removeEventListener("visibilitychange", hidden);
      if (saver.dirty) void saver.flush().catch(() => {});
    };
  }, [saver]);
  const edit = (values: Partial<Draft>) => {
    saver.edit({ ...saver.value, ...values });
    clearTimeout(timer.current);
    if (!(saver.error instanceof ApiError && saver.error.status === 409))
      timer.current = setTimeout(() => void saver.flush().catch(() => {}), 800);
  };
  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError("");
    try {
      await flush();
      await action();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const trash = () =>
    void act(async () => {
      const n = await request<Note>(`/notes/${note.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          version: saver.version,
          trashed: !note.deleted_at,
        }),
      });
      onRemove(n);
    });
  const status = saver.error
    ? t("Não foi possível salvar")
    : saver.saving
      ? t("Salvando…")
      : saver.dirty
        ? t("Alterações não salvas")
        : t("Salvo");
  const draft = saver.value;
  const wordCount = (node: any): number =>
    node.type === "text"
      ? node.text.trim().split(/\s+/).filter(Boolean).length
      : (node.content ?? []).reduce((n: number, c: any) => n + wordCount(c), 0);
  return (
    <article className={`note-editor-panel ${focus ? "note-focus" : ""}`}>
      <header className="note-editor-top">
        <button
          className="icon-button note-back"
          aria-label={t("Voltar às notas")}
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
        <span
          className={`note-save-state ${saver.error ? "error" : ""}`}
          role="status"
        >
          {saver.dirty ? <CloudUpload size={14} /> : <Check size={14} />}{" "}
          {status}
        </span>
        <div className="actions">
          <button
            className={`icon-button ${draft.favorite ? "is-favorite" : ""}`}
            disabled={!!note.deleted_at}
            title={t("Favoritar nota")}
            aria-label={t("Favoritar nota")}
            aria-pressed={draft.favorite}
            onClick={() => edit({ favorite: !draft.favorite })}
          >
            <Star size={17} fill={draft.favorite ? "currentColor" : "none"} />
          </button>
          <button
            className="icon-button"
            title={t("Duplicar nota")}
            aria-label={t("Duplicar nota")}
            disabled={busy}
            onClick={() => void act(() => onCopy(saver.value))}
          >
            <Copy size={17} />
          </button>
          <button
            className="icon-button note-focus-button"
            title={t("Modo foco")}
            aria-label={t("Modo foco")}
            aria-pressed={focus}
            onClick={() => setFocus(!focus)}
          >
            {focus ? <Minimize size={17} /> : <Expand size={17} />}
          </button>
          <button
            className="icon-button"
            title={t(
              note.deleted_at ? "Restaurar nota" : "Mover para a lixeira",
            )}
            aria-label={t(
              note.deleted_at ? "Restaurar nota" : "Mover para a lixeira",
            )}
            disabled={busy}
            onClick={trash}
          >
            {note.deleted_at ? <RotateCcw size={17} /> : <Trash2 size={17} />}
          </button>
          {note.deleted_at && (
            <button
              className="button danger"
              disabled={busy}
              onClick={() => onRemove({ ...note, version: saver.version })}
            >
              {t("Excluir definitivamente")}
            </button>
          )}
        </div>
      </header>
      {(saver.error || actionError || (initial && saver.dirty)) && (
        <div className="note-save-message" role="alert">
          <span>
            {saver.error instanceof ApiError && saver.error.status === 409
              ? t("Esta nota mudou em outra aba. Seu texto foi preservado.")
              : saver.error?.message ||
                actionError ||
                t("Rascunho recuperado. Revise e salve para continuar.")}
          </span>
          {saver.error instanceof ApiError && saver.error.status === 409 ? (
            <>
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void (async () => {
                    setBusy(true);
                    try {
                      await onCopy(saver.value);
                      saver.discard();
                      trackDraft(storageKey, false);
                      sessionStorage.removeItem(storageKey);
                    } catch (e) {
                      setActionError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  })()
                }
              >
                {t("Salvar como nova nota")}
              </button>
              <button
                className="button"
                onClick={() => {
                  if (
                    window.confirm(
                      t("Descartar este rascunho e carregar a versão salva?"),
                    )
                  ) {
                    clearTimeout(timer.current);
                    saver.discard();
                    trackDraft(storageKey, false);
                    try {
                      sessionStorage.removeItem(storageKey);
                    } catch {}
                    onReload();
                  }
                }}
              >
                {t("Recarregar")}
              </button>
            </>
          ) : (
            <button
              className="button"
              onClick={() => void flush().catch(() => {})}
            >
              {t("Salvar agora")}
            </button>
          )}
        </div>
      )}
      <div className="note-document-head">
        <span className="note-eyebrow">
          <CalendarDays size={14} />
          {draft.journal_date
            ? new Intl.DateTimeFormat(getLocale(), {
                dateStyle: "long",
                timeZone: "UTC",
              }).format(new Date(draft.journal_date + "T12:00:00Z"))
            : t("Um espaço para suas ideias")}
        </span>
        <input
          className="note-title-input"
          aria-label={t("Título da nota")}
          placeholder={t("Sem título")}
          value={draft.title}
          maxLength={300}
          readOnly={!!note.deleted_at}
          onChange={(e) => edit({ title: e.target.value })}
        />
        <div className="note-metadata">
          <Select
            aria-label={t("Pasta da nota")}
            disabled={!!note.deleted_at}
            value={draft.folder_id ?? ""}
            onChange={(e) => edit({ folder_id: e.target.value || null })}
          >
            <option value="">{t("Sem pasta")}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <label className="note-date-label">
            <span>{t("Data do diário")}</span>
            <input
              aria-label={t("Data do diário")}
              disabled={!!note.deleted_at}
              type="date"
              value={draft.journal_date ?? ""}
              onChange={(e) => edit({ journal_date: e.target.value || null })}
            />
          </label>
        </div>
      </div>
      <RichEditor
        content={initial?.draft.content ?? note.content}
        readOnly={!!note.deleted_at}
        onChange={(content) => edit({ content })}
      />
      <footer className="note-editor-footer">
        <span>
          {t("{{count}} palavras", { count: wordCount(draft.content) })}
        </span>
        <span>{t("Seu espaço, no seu ritmo.")}</span>
      </footer>
    </article>
  );
});
