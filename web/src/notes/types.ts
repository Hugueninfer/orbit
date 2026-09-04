import type { JSONContent } from "@tiptap/react";
export type Folder = {
  id: string;
  name: string;
  color: string;
  version: number;
  count: number;
};
export type NoteSummary = {
  id: string;
  title: string;
  preview: string;
  folder_id: string | null;
  journal_date: string | null;
  favorite: boolean;
  deleted_at: string | null;
  version: number;
  updated_at: string;
};
export type Note = NoteSummary & { content: JSONContent };
export type NotePage = { items: NoteSummary[]; has_more: boolean };
export type Draft = Pick<
  Note,
  "title" | "content" | "folder_id" | "journal_date" | "favorite"
>;
export const draftOf = (note: Note): Draft => ({
  title: note.title,
  content: note.content,
  folder_id: note.folder_id,
  journal_date: note.journal_date,
  favorite: note.favorite,
});
