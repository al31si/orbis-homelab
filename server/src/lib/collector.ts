import type { Snapshot } from '../../../shared/api.js';
import { errorMessage } from './http.js';

export interface CollectorOptions<T> {
  id: string;
  label: string;
  intervalMs: number;
  timeoutMs?: number;
  run: () => Promise<T>;
}

export type CollectorListener = (
  event: 'error' | 'recovered',
  collector: Collector<unknown>,
) => void;

/**
 * Periodically runs `run()` and keeps the last good value. A failing run never discards data:
 * the snapshot keeps `data` and reports `error` so clients can show it as stale.
 */
export class Collector<T> {
  readonly id: string;
  readonly label: string;
  readonly intervalMs: number;
  private readonly timeoutMs: number;
  private readonly runFn: () => Promise<T>;
  private data: T | null = null;
  private fetchedAt: number | null = null;
  private error: string | null = null;
  private failures = 0;
  private timer: NodeJS.Timeout | null = null;
  private stopped = true;
  private inFlight: Promise<void> | null = null;
  private readonly listeners = new Set<CollectorListener>();

  constructor(opts: CollectorOptions<T>) {
    this.id = opts.id;
    this.label = opts.label;
    this.intervalMs = opts.intervalMs;
    this.timeoutMs = opts.timeoutMs ?? Math.min(opts.intervalMs, 15_000);
    this.runFn = opts.run;
  }

  snapshot(): Snapshot<T> {
    return {
      data: this.data,
      fetchedAt: this.fetchedAt === null ? null : new Date(this.fetchedAt).toISOString(),
      error: this.error,
      intervalMs: this.intervalMs,
    };
  }

  get value(): T | null {
    return this.data;
  }

  get consecutiveFailures(): number {
    return this.failures;
  }

  /** True when data exists and is not older than `factor` intervals. */
  isFresh(factor = 3): boolean {
    return this.fetchedAt !== null && Date.now() - this.fetchedAt <= this.intervalMs * factor;
  }

  onEvent(listener: CollectorListener): void {
    this.listeners.add(listener);
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    void this.tick();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Runs once now (deduplicated with a run already in flight). */
  refresh(): Promise<void> {
    this.inFlight ??= this.execute().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async tick(): Promise<void> {
    await this.refresh();
    if (this.stopped) return;
    // Small jitter keeps collectors from firing in lockstep.
    const delay =
      this.intervalMs + Math.floor(Math.random() * Math.min(1000, this.intervalMs / 10));
    this.timer = setTimeout(() => void this.tick(), delay);
    this.timer.unref();
  }

  private async execute(): Promise<void> {
    try {
      const value = await withTimeout(this.runFn(), this.timeoutMs);
      const recovered = this.failures >= 2;
      this.data = value;
      this.fetchedAt = Date.now();
      this.error = null;
      this.failures = 0;
      if (recovered) this.emit('recovered');
    } catch (err) {
      this.error = errorMessage(err);
      this.failures += 1;
      if (this.failures === 2) this.emit('error');
    }
  }

  private emit(event: 'error' | 'recovered'): void {
    for (const listener of this.listeners) listener(event, this as Collector<unknown>);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
