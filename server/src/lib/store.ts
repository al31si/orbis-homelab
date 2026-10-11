import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Small JSON file persisted atomically (tmp + rename). Writes are coalesced. */
export class JsonStore<T> {
  private value: T;
  private timer: NodeJS.Timeout | null = null;
  private writing: Promise<void> = Promise.resolve();

  private constructor(
    private readonly file: string,
    initial: T,
    private readonly mode: number,
  ) {
    this.value = initial;
  }

  static async open<T>(file: string, fallback: T, mode = 0o600): Promise<JsonStore<T>> {
    await mkdir(path.dirname(file), { recursive: true });
    let initial = fallback;
    try {
      initial = { ...fallback, ...JSON.parse(await readFile(file, 'utf8')) } as T;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        // Corrupt file: keep it for inspection and start from the fallback.
        await rename(file, `${file}.corrupt-${Date.now()}`).catch(() => undefined);
      }
    }
    return new JsonStore(file, initial, mode);
  }

  get(): T {
    return this.value;
  }

  /** Mutates the value in place through `fn` and schedules a write. */
  update(fn: (value: T) => void): void {
    fn(this.value);
    this.schedule();
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, 2000);
    this.timer.unref();
  }

  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const data = JSON.stringify(this.value);
    this.writing = this.writing.then(async () => {
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, data, { mode: this.mode });
      await rename(tmp, this.file);
    });
    return this.writing;
  }
}
