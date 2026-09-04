import type { Draft } from "./types";
/** One in-flight write per note; late acknowledgements never replace newer text. */
export class NoteSaver {
  value: Draft;
  version: number;
  private saved: string;
  private abandoned = false;
  private active?: Promise<void>;
  error: Error | null = null;
  constructor(
    value: Draft,
    version: number,
    private send: (value: Draft, version: number) => Promise<number>,
    private changed: () => void,
  ) {
    this.value = value;
    this.version = version;
    this.saved = JSON.stringify(value);
  }
  get dirty() {
    return !this.abandoned && JSON.stringify(this.value) !== this.saved;
  }
  get saving() {
    return !!this.active;
  }
  discard() {
    this.abandoned = true;
    this.error = null;
  }
  private notify() {
    if (!this.abandoned) this.changed();
  }
  edit(value: Draft) {
    if (this.abandoned) return;
    this.value = value;
    this.notify();
  }
  flush(): Promise<void> {
    if (this.active) return this.active;
    if (!this.dirty) return Promise.resolve();
    this.error = null;
    const run = async () => {
      while (this.dirty) {
        const snapshot = this.value;
        const nextVersion = await this.send(snapshot, this.version);
        if (this.abandoned) return;
        this.version = nextVersion;
        this.saved = JSON.stringify(snapshot);
        this.notify();
      }
    };
    this.active = run()
      .catch((error) => {
        if (!this.abandoned) this.error = error;
        throw error;
      })
      .finally(() => {
        this.active = undefined;
        this.notify();
      });
    this.notify();
    return this.active;
  }
}
