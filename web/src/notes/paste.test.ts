import { expect, it } from "vitest";
import { normalizeStyle, normalizePaste } from "./paste";
import { Editor } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
it("normalizes real pasted rich text into supported colors and sizes", () => {
  const editor = new Editor({
    extensions: [StarterKit, TextStyleKit],
    content:
      '<p><span style="font-family:Arial;font-size:15px;color:rgb(255,0,0)">Copied text</span></p>',
  });
  const normalized = normalizePaste(new Slice(editor.state.doc.content, 0, 0));
  const attrs = normalized.content.firstChild!.firstChild!.marks[0].attrs;
  expect(attrs).toEqual(
    normalizeStyle({
      fontSize: "15px",
      color: "rgb(255, 0, 0)",
      fontFamily: "Arial",
    }),
  );
  expect(attrs.color).toBe("#ff0000");
  expect(attrs.fontFamily).toBe(null);
  expect(attrs.backgroundColor).toBe(null);
  editor.destroy();
});
it("keeps safe pasted links and removes unsupported relative links", () => {
  const editor = new Editor({
    extensions: [StarterKit],
    content:
      '<p><a href="https://example.com" target="_parent" class="hover:underline">Safe</a> <a href="/relative">Relative</a></p>',
  });
  const normalized = normalizePaste(new Slice(editor.state.doc.content, 0, 0));
  const children = normalized.content.firstChild!;
  expect(children.firstChild!.marks[0].attrs).toMatchObject({
    href: "https://example.com",
    target: "_blank",
    class: null,
  });
  expect(children.lastChild!.marks).toHaveLength(0);
  editor.destroy();
});
