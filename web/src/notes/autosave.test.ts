import { describe, it, expect, vi } from "vitest";
import { NoteSaver } from "./autosave";
const draft = {
  title: "First",
  content: { type: "doc" },
  folder_id: null,
  journal_date: null,
  favorite: false,
};
describe("serialized note saving", () => {
  it("preserves typing during a save and uses the returned version for the next write", async () => {
    let finish!: (v: number) => void;
    const send = vi
      .fn()
      .mockImplementationOnce(() => new Promise<number>((r) => (finish = r)))
      .mockResolvedValueOnce(3);
    const saver = new NoteSaver(draft, 1, send, () => {});
    saver.edit({ ...draft, title: "Second" });
    const saving = saver.flush();
    saver.edit({ ...draft, title: "Third" });
    finish(2);
    await saving;
    expect(send.mock.calls.map((x) => [x[0].title, x[1]])).toEqual([
      ["Second", 1],
      ["Third", 2],
    ]);
    expect(saver.dirty).toBe(false);
  });
  it("keeps failed text dirty and retries without pretending it was saved", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(2);
    const saver = new NoteSaver(draft, 1, send, () => {});
    saver.edit({ ...draft, title: "Keep me" });
    await expect(saver.flush()).rejects.toThrow("offline");
    expect(saver.dirty).toBe(true);
    expect(saver.value.title).toBe("Keep me");
    await saver.flush();
    expect(saver.dirty).toBe(false);
  });
});
it("discard stops late acknowledgements from recreating an abandoned draft", async () => {
  let finish!: (v: number) => void;
  const changed = vi.fn();
  const saver = new NoteSaver(
    draft,
    1,
    () => new Promise<number>((r) => (finish = r)),
    changed,
  );
  saver.edit({ ...draft, title: "old text" });
  const pending = saver.flush();
  saver.discard();
  changed.mockClear();
  finish(2);
  await pending;
  expect(saver.dirty).toBe(false);
  expect(changed).not.toHaveBeenCalled();
});
