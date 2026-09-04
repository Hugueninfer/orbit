"""Bounded, allowlisted ProseMirror documents. No HTML is accepted or rendered."""

import json
import re
from urllib.parse import urlsplit

EMPTY_DOCUMENT = {"type": "doc", "content": [{"type": "paragraph"}]}
NODES = {
    "doc",
    "paragraph",
    "heading",
    "text",
    "hardBreak",
    "horizontalRule",
    "bulletList",
    "orderedList",
    "listItem",
    "taskList",
    "taskItem",
    "blockquote",
    "codeBlock",
}
MARKS = {"bold", "italic", "underline", "strike", "code", "link", "textStyle", "highlight"}
COLOR = re.compile(r"#[0-9a-fA-F]{6}\Z")


def validate_document(value: dict) -> dict:
    if len(json.dumps(value, ensure_ascii=False).encode()) > 200_000:
        raise ValueError("Nota muito longa (máximo 200 KB).")
    count, text_length = 0, 0

    def walk(node, depth=0, mark=False):
        nonlocal count, text_length
        count += 1
        if depth > 20 or count > 5000 or not isinstance(node, dict):
            raise ValueError("Documento excede os limites de estrutura.")
        kind = node.get("type")
        if kind not in (MARKS if mark else NODES):
            raise ValueError("Formato de texto não suportado.")
        if set(node) - {"type", "attrs", "content", "text", "marks"}:
            raise ValueError("Documento inválido.")
        attrs = node.get("attrs", {})
        allowed = {
            "paragraph": {"textAlign"},
            "heading": {"level", "textAlign"},
            "orderedList": {"start", "type"},
            "taskItem": {"checked"},
            "codeBlock": {"language"},
            "link": {"href", "target", "rel", "class", "title"},
            "textStyle": {"color", "backgroundColor", "fontSize", "fontFamily", "lineHeight"},
            "highlight": {"color"},
        }.get(kind, set())
        if not isinstance(attrs, dict) or set(attrs) - allowed:
            raise ValueError("Atributos de texto inválidos.")
        for key, val in attrs.items():
            if val is None:
                continue
            if key in {"color", "backgroundColor"} and not (isinstance(val, str) and COLOR.fullmatch(val)):
                raise ValueError("Cor inválida.")
            if key == "fontSize" and val not in {
                "12px",
                "14px",
                "16px",
                "18px",
                "20px",
                "24px",
                "28px",
                "32px",
                "40px",
            }:
                raise ValueError("Tamanho de fonte inválido.")
            if key == "fontFamily" and val not in {"Geist", "Georgia", "monospace"}:
                raise ValueError("Fonte inválida.")
            if key == "lineHeight" and val not in {"1", "1.5", "2"}:
                raise ValueError("Espaçamento inválido.")
            if key == "textAlign" and val not in {"left", "center", "right", "justify"}:
                raise ValueError("Alinhamento inválido.")
            if key == "level" and (type(val) is not int or val not in {1, 2, 3}):
                raise ValueError("Título inválido.")
            if key == "start" and (type(val) is not int or not 1 <= val <= 10000):
                raise ValueError("Lista inválida.")
            if key == "checked" and type(val) is not bool:
                raise ValueError("Checklist inválida.")
            if key == "href":
                if (
                    not isinstance(val, str)
                    or len(val) > 2000
                    or any(ord(c) <= 32 for c in val)
                    or urlsplit(val).scheme.lower() not in {"https", "http", "mailto"}
                ):
                    raise ValueError("Use um link http, https ou mailto válido.")
            if key == "title" and (not isinstance(val, str) or len(val) > 200):
                raise ValueError("Título de link inválido.")
            if key == "target" and val not in {"_blank", "_self"}:
                raise ValueError("Link inválido.")
            if key in {"rel", "class", "language", "type"} and (
                not isinstance(val, str) or len(val) > 100 or not re.fullmatch(r"[\w \-]*", val)
            ):
                raise ValueError("Atributo inválido.")
        if "text" in node:
            if kind != "text" or not isinstance(node["text"], str):
                raise ValueError("Texto inválido.")
            text_length += len(node["text"])
        children = node.get("content", [])
        marks = node.get("marks", [])
        if not isinstance(children, list) or not isinstance(marks, list) or (mark and (children or marks)):
            raise ValueError("Documento inválido.")
        blocks = {
            "paragraph",
            "heading",
            "bulletList",
            "orderedList",
            "taskList",
            "blockquote",
            "codeBlock",
            "horizontalRule",
        }
        expected = {
            "doc": blocks,
            "blockquote": blocks,
            "listItem": blocks,
            "taskItem": blocks,
            "paragraph": {"text", "hardBreak"},
            "heading": {"text", "hardBreak"},
            "codeBlock": {"text"},
            "bulletList": {"listItem"},
            "orderedList": {"listItem"},
            "taskList": {"taskItem"},
        }.get(kind, set())
        if any(not isinstance(child, dict) or child.get("type") not in expected for child in children):
            raise ValueError("Estrutura de texto inválida.")
        if (
            kind in {"doc", "blockquote", "bulletList", "orderedList", "taskList", "listItem", "taskItem"}
            and not children
        ):
            raise ValueError("Bloco de texto vazio.")
        if kind in {"listItem", "taskItem"} and children[0].get("type") != "paragraph":
            raise ValueError("Item de lista inválido.")
        if kind == "text" and not node.get("text"):
            raise ValueError("Texto vazio.")
        if marks and kind not in {"text", "hardBreak"}:
            raise ValueError("Formatação inválida para este bloco.")
        for child in children:
            walk(child, depth + 1)
        for item in marks:
            walk(item, depth + 1, True)

    walk(value)
    if value.get("type") != "doc" or text_length > 100_000:
        raise ValueError("Nota inválida ou muito longa (máximo 100.000 caracteres).")
    return value


def plain_text(node):
    if node.get("type") == "text":
        return node.get("text", "")
    parts = [plain_text(child) for child in node.get("content", [])]
    return (
        "\n" if node.get("type") in {"doc", "bulletList", "orderedList", "taskList", "blockquote"} else ""
    ).join(parts)
