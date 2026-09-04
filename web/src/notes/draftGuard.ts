// Protection survives route unmounts (e.g. browser Back while a save is offline).
const pending = new Set<string>();
const warn = (event: BeforeUnloadEvent) => {
  if (pending.size) {
    event.preventDefault();
    event.returnValue = "";
  }
};
export function trackDraft(key: string, dirty: boolean) {
  if (dirty) pending.add(key);
  else pending.delete(key);
  window.removeEventListener("beforeunload", warn);
  if (pending.size) window.addEventListener("beforeunload", warn);
}
