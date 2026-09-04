import {
  useEditor,
  EditorContent,
  useEditorState,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Link as LinkIcon,
  Unlink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Highlighter,
  RemoveFormatting,
  Minus,
} from "lucide-react";
import { normalizePaste } from "./paste";
import { useState } from "react";
import { Select } from "../components/Select";
import { t, useLocale } from "../i18n";

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: {
      openOnClick: false,
      autolink: false,
      defaultProtocol: "https",
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
  TextStyleKit,
  Highlight.configure({ multicolor: true }),
  TaskList,
  TaskItem.configure({ nested: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Placeholder.configure({
    placeholder: () => t("Comece a escrever. Este espaço é seu…"),
  }),
];
export default function RichEditor({
  content,
  onChange,
  readOnly = false,
}: {
  content: JSONContent;
  onChange: (content: JSONContent) => void;
  readOnly?: boolean;
}) {
  useLocale();
  const [link, setLink] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const editor = useEditor({
    extensions: editorExtensions,
    content,
    editable: !readOnly,
    shouldRerenderOnTransaction: false,
    editorProps: {
      transformPasted: normalizePaste,
      attributes: {
        class: "note-prose",
        role: "textbox",
        "aria-label": t("Conteúdo da nota"),
        "aria-multiline": "true",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold"),
      italic: e?.isActive("italic"),
      underline: e?.isActive("underline"),
      strike: e?.isActive("strike"),
      bullet: e?.isActive("bulletList"),
      ordered: e?.isActive("orderedList"),
      task: e?.isActive("taskList"),
      quote: e?.isActive("blockquote"),
      code: e?.isActive("codeBlock"),
      highlight: e?.isActive("highlight"),
      link: e?.isActive("link"),
      heading: e?.isActive("heading", { level: 1 })
        ? "1"
        : e?.isActive("heading", { level: 2 })
          ? "2"
          : e?.isActive("heading", { level: 3 })
            ? "3"
            : "0",
      size: e?.getAttributes("textStyle").fontSize ?? "16px",
      color: e?.getAttributes("textStyle").color ?? "#dce5f5",
      align:
        e?.getAttributes("paragraph").textAlign ??
        e?.getAttributes("heading").textAlign ??
        "left",
      undo: e?.can().undo(),
      redo: e?.can().redo(),
    }),
  });
  if (!editor) return null;
  const tool = (
    label: string,
    Icon: typeof Bold,
    action: () => void,
    active = false,
    disabled = false,
  ) => (
    <button
      type="button"
      className={`note-tool ${active ? "active" : ""}`}
      title={t(label)}
      aria-label={t(label)}
      aria-pressed={active}
      disabled={disabled || readOnly}
      onMouseDown={(e) => e.preventDefault()}
      onClick={action}
    >
      <Icon size={17} />
    </button>
  );
  return (
    <div className="rich-editor">
      {!readOnly && (
        <div
          className="note-toolbar"
          role="toolbar"
          aria-label={t("Formatação de texto")}
        >
          <Select
            aria-label={t("Estilo do texto")}
            value={state?.heading}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n)
                editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: n as 1 | 2 | 3 })
                  .run();
              else editor.chain().focus().setParagraph().run();
            }}
          >
            <option value="0">{t("Texto normal")}</option>
            <option value="1">{t("Título 1")}</option>
            <option value="2">{t("Título 2")}</option>
            <option value="3">{t("Título 3")}</option>
          </Select>
          <Select
            aria-label={t("Tamanho da fonte")}
            value={state?.size}
            onChange={(e) =>
              editor.chain().focus().setFontSize(e.target.value).run()
            }
          >
            {[12, 14, 16, 18, 20, 24, 28, 32, 40].map((n) => (
              <option key={n} value={`${n}px`}>
                {n}
              </option>
            ))}
          </Select>
          <span className="toolbar-divider" />
          {tool(
            "Negrito",
            Bold,
            () => editor.chain().focus().toggleBold().run(),
            state?.bold,
          )}
          {tool(
            "Itálico",
            Italic,
            () => editor.chain().focus().toggleItalic().run(),
            state?.italic,
          )}
          {tool(
            "Sublinhado",
            Underline,
            () => editor.chain().focus().toggleUnderline().run(),
            state?.underline,
          )}
          {tool(
            "Riscado",
            Strikethrough,
            () => editor.chain().focus().toggleStrike().run(),
            state?.strike,
          )}
          <details className="note-color-picker">
            <summary
              className="note-tool"
              aria-label={t("Cor do texto")}
              title={t("Cor do texto")}
            >
              <span style={{ borderBottom: `3px solid ${state?.color}` }}>
                A
              </span>
            </summary>
            <div className="note-color-popover">
              {[
                "#dce5f5",
                "#7692ff",
                "#38d9c5",
                "#ea8dba",
                "#f7c66d",
                "#fb7185",
                "#ac96ee",
                "#ffffff",
              ].map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-label={color}
                  style={{ background: color }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    editor.chain().focus().setColor(color).run();
                    e.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                />
              ))}
              <label>
                {t("Cor personalizada")}
                <input
                  type="color"
                  aria-label={t("Cor personalizada")}
                  value={state?.color}
                  onInput={(e) =>
                    editor.chain().focus().setColor(e.currentTarget.value).run()
                  }
                  onChange={() => {}}
                />
              </label>
            </div>
          </details>
          {tool(
            "Marca-texto",
            Highlighter,
            () =>
              editor
                .chain()
                .focus()
                .toggleHighlight({ color: "#38594f" })
                .run(),
            state?.highlight,
          )}
          <span className="toolbar-divider" />
          {tool(
            "Lista com marcadores",
            List,
            () => editor.chain().focus().toggleBulletList().run(),
            state?.bullet,
          )}
          {tool(
            "Lista numerada",
            ListOrdered,
            () => editor.chain().focus().toggleOrderedList().run(),
            state?.ordered,
          )}
          {tool(
            "Checklist",
            ListTodo,
            () => editor.chain().focus().toggleTaskList().run(),
            state?.task,
          )}
          {tool(
            "Citação",
            Quote,
            () => editor.chain().focus().toggleBlockquote().run(),
            state?.quote,
          )}
          {tool(
            "Bloco de código",
            Code,
            () => editor.chain().focus().toggleCodeBlock().run(),
            state?.code,
          )}
          {tool(
            "Inserir link",
            LinkIcon,
            () => {
              setLink(editor.getAttributes("link").href ?? "https://");
              setLinkError(false);
            },
            state?.link,
          )}
          {state?.link &&
            tool("Remover link", Unlink, () =>
              editor.chain().focus().unsetLink().run(),
            )}
          {tool(
            "Alinhar à esquerda",
            AlignLeft,
            () => editor.chain().focus().setTextAlign("left").run(),
            state?.align === "left",
          )}
          {tool(
            "Centralizar",
            AlignCenter,
            () => editor.chain().focus().setTextAlign("center").run(),
            state?.align === "center",
          )}
          {tool(
            "Alinhar à direita",
            AlignRight,
            () => editor.chain().focus().setTextAlign("right").run(),
            state?.align === "right",
          )}
          {tool("Divisor", Minus, () =>
            editor.chain().focus().setHorizontalRule().run(),
          )}
          {tool("Limpar formatação", RemoveFormatting, () =>
            editor.chain().focus().unsetAllMarks().clearNodes().run(),
          )}
          {tool(
            "Desfazer",
            Undo2,
            () => editor.chain().focus().undo().run(),
            false,
            !state?.undo,
          )}
          {tool(
            "Refazer",
            Redo2,
            () => editor.chain().focus().redo().run(),
            false,
            !state?.redo,
          )}
        </div>
      )}
      {link !== null && (
        <form
          className="note-link-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^(https?:\/\/|mailto:)[^\s]+$/i.test(link)) {
              setLinkError(true);
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: link })
              .run();
            setLink(null);
          }}
        >
          <input
            autoFocus
            aria-label={t("Endereço do link")}
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button className="button primary" type="submit">
            {t("Aplicar")}
          </button>
          <button
            className="button"
            type="button"
            onClick={() => setLink(null)}
          >
            {t("Cancelar")}
          </button>
          {linkError && (
            <small role="alert">
              {t("Use um link http, https ou mailto válido.")}
            </small>
          )}
        </form>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
