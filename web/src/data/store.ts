import type { ResponseScope, Snapshot } from '@shared/api';
import { t } from '@/i18n';
import { ApiError, apiFetchMeta, isUnreachable } from './api';
import {
  ENDPOINT_KEYS,
  ENDPOINTS,
  normalizeRemotePath,
  remoteKey,
  type EndpointDef,
  type RemoteSnapshotOptions,
} from './endpoints';

/** State of one polled endpoint. `T` is the payload type. */
export interface EntryState<T = unknown> {
  data: T | null;
  /** Epoch ms of the last successful collection (BFF time), null if never. */
  fetchedAt: number | null;
  intervalMs: number;
  /** Error carried by the BFF snapshot. */
  snapshotError: string | null;
  /** Error of the last request made by this client. */
  fetchError: string | null;
  /** A request is in flight. */
  refreshing: boolean;
  /** Who the held payload was produced for; null while there is none. */
  scope: ResponseScope | null;
}

export interface ConnectionState {
  /** `offline`: the BFF (or the device network) is not answering. */
  status: 'online' | 'offline';
  /** Epoch ms of the most recent successful collection across all endpoints. */
  lastDataAt: number | null;
}

interface Entry {
  def: EndpointDef;
  state: EntryState;
  subscribers: number;
  listeners: Set<() => void>;
  timer: number | undefined;
  inflight: Promise<void> | undefined;
  failures: number;
  lastAttemptAt: number;
  lastPersistedAt: number;
}

/** Bump when what is persisted, or the rules for persisting it, change: older copies are dropped. */
const PERSIST_FORMAT = 2;
const PERSIST_EVERY_MS = 20_000;
const MAX_BACKOFF_MS = 300_000;
/** Consecutive unreachable responses before the connection is declared lost. */
const OFFLINE_AFTER_FAILURES = 2;
const MIN_RETRY_GAP_MS = 2_000;

/**
 * One shared, visibility-aware poller per endpoint. Endpoints are only polled while at least one
 * component is subscribed and the page is visible. Requests are de-duplicated, failures back off
 * exponentially, and the last good payload is persisted (under `<app.id>.snapshot.<contract>.`)
 * so a cold offline launch has something to show. Besides the built-in endpoints, extensions
 * can poll arbitrary `/api` paths (`defineRemote`).
 *
 * Private data. Every answer says who it is for (`ResponseScope`). `shared` and `limited`
 * payloads can be obtained by anybody who reaches the server, so they are persisted and may be
 * shown offline. A `full` payload is held in memory only and is dropped as soon as the store
 * cannot vouch for the visitor any more: the server reports another viewer, answers 401/403 or
 * something that is not the API (a login page of the proxy), or the connection is lost. After a
 * logout, an identity change or an access downgrade nothing private stays on screen, in memory
 * or in storage; the price is that private sections are empty while offline.
 */
export class DataStore {
  private readonly entries = new Map<string, Entry>();
  private readonly connectionListeners = new Set<() => void>();
  private connection: ConnectionState = { status: 'online', lastDataAt: null };
  private unreachableCount = 0;
  /** Viewer tag of the latest answer; undefined before the first one. */
  private viewer: string | null | undefined;
  /** Counts purges, so an answer that was in flight during one can be recognised. */
  private generation = 0;
  private readonly storageRoot: string;
  private readonly storagePrefix: string;

  constructor(appId: string) {
    this.storageRoot = `${appId}.snapshot.`;
    this.storagePrefix = `${this.storageRoot}${__API_SCHEMA__}.f${PERSIST_FORMAT}.`;
    this.dropObsoletePersisted();
    for (const key of ENDPOINT_KEYS) this.create(key, ENDPOINTS[key]);
    this.connection = {
      status: navigator.onLine === false ? 'offline' : 'online',
      lastDataAt: this.latestFetchedAt(),
    };
  }

  /** Starts reacting to page visibility and network events. Pair with `disconnect`. */
  connect(): void {
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  disconnect(): void {
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }

  /**
   * Registers a polled `/api` path outside the built-in set and returns its key. Idempotent: the
   * first definition of a path wins.
   */
  defineRemote(path: string, options: RemoteSnapshotOptions): string {
    const key = remoteKey(path);
    if (!this.entries.has(key)) {
      this.create(key, {
        path: normalizeRemotePath(path),
        intervalMs: options.intervalMs,
        envelope: options.envelope ?? 'snapshot',
        // Extension data follows the same rule as the built-in one: kept only when `shared` or `limited`.
        persist: true,
      });
    }
    return key;
  }

  /* -------------------------------------------------------------- subscriptions */

  getState<T = unknown>(key: string): EntryState<T> {
    return this.entry(key).state as EntryState<T>;
  }

  getConnection(): ConnectionState {
    return this.connection;
  }

  subscribe(key: string, listener: () => void): () => void {
    const entry = this.entry(key);
    entry.listeners.add(listener);
    entry.subscribers += 1;
    if (entry.subscribers === 1) this.start(key);
    return () => {
      entry.listeners.delete(listener);
      entry.subscribers -= 1;
      if (entry.subscribers === 0) clearTimeout(entry.timer);
    };
  }

  subscribeConnection(listener: () => void): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  /** Fetches now (shares an in-flight request) and reschedules the poll. */
  refresh(key: string): Promise<void> {
    const entry = this.entry(key);
    if (entry.inflight) return entry.inflight;
    clearTimeout(entry.timer);
    entry.lastAttemptAt = Date.now();
    this.patch(key, { refreshing: true });
    entry.inflight = this.load(key).finally(() => {
      entry.inflight = undefined;
      this.patch(key, { refreshing: false });
      this.schedule(key);
    });
    return entry.inflight;
  }

  /** Refreshes every endpoint that is currently on screen. */
  refreshActive(): Promise<void> {
    const active = [...this.entries].filter(([, entry]) => entry.subscribers > 0);
    return Promise.all(active.map(([key]) => this.refresh(key))).then(() => undefined);
  }

  /* -------------------------------------------------------------------- entries */

  private entry(key: string): Entry {
    const entry = this.entries.get(key);
    if (!entry) throw new Error(`Unknown data endpoint: ${key}`);
    return entry;
  }

  private create(key: string, def: EndpointDef): void {
    this.entries.set(key, {
      def,
      state: {
        ...this.readPersisted(key, def),
        intervalMs: def.intervalMs,
        snapshotError: null,
        fetchError: null,
        refreshing: false,
      },
      subscribers: 0,
      listeners: new Set(),
      timer: undefined,
      inflight: undefined,
      failures: 0,
      lastAttemptAt: 0,
      lastPersistedAt: 0,
    });
  }

  /* ---------------------------------------------------------------- persistence */

  /**
   * Drops snapshots persisted under another API contract (they could crash the new code) or by a
   * version that did not separate private data: those may hold what a `full` visitor saw.
   */
  private dropObsoletePersisted(): void {
    try {
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const name = localStorage.key(i);
        if (name?.startsWith(this.storageRoot) && !name.startsWith(this.storagePrefix)) {
          localStorage.removeItem(name);
        }
      }
    } catch {
      /* storage disabled */
    }
  }

  private readPersisted(
    key: string,
    def: EndpointDef,
  ): Pick<EntryState, 'data' | 'fetchedAt' | 'scope'> {
    const none = { data: null, fetchedAt: null, scope: null };
    if (!def.persist) return none;
    try {
      const raw = localStorage.getItem(this.storagePrefix + key);
      if (!raw) return none;
      const parsed = JSON.parse(raw) as { data?: unknown; fetchedAt?: unknown; scope?: unknown };
      // Only what anybody could have fetched is ever restored; anything else is ignored.
      const scope = parsed.scope === 'shared' || parsed.scope === 'limited' ? parsed.scope : null;
      if (parsed.data == null || typeof parsed.fetchedAt !== 'number' || scope === null) {
        return none;
      }
      return { data: parsed.data, fetchedAt: parsed.fetchedAt, scope };
    } catch {
      return none;
    }
  }

  private writePersisted(key: string, state: EntryState): void {
    // `full` data never reaches storage; the caller checks, this is the last line of defence.
    if (state.scope !== 'shared' && state.scope !== 'limited') return;
    try {
      localStorage.setItem(
        this.storagePrefix + key,
        JSON.stringify({ data: state.data, fetchedAt: state.fetchedAt, scope: state.scope }),
      );
    } catch {
      /* quota exceeded or storage disabled: the in-memory copy still works */
    }
  }

  /* -------------------------------------------------------------------- polling */

  private start(key: string): void {
    const entry = this.entry(key);
    const age = Date.now() - entry.lastAttemptAt;
    if (document.hidden) return;
    if (age >= entry.state.intervalMs || entry.state.data === null) void this.refresh(key);
    else this.schedule(key, entry.state.intervalMs - age);
  }

  private schedule(key: string, delayOverride?: number): void {
    const entry = this.entry(key);
    clearTimeout(entry.timer);
    if (entry.subscribers === 0 || document.hidden) return;
    const { intervalMs } = entry.state;
    const backoff = Math.min(intervalMs * 2 ** entry.failures, MAX_BACKOFF_MS);
    const base = delayOverride ?? (entry.failures > 0 ? backoff : intervalMs);
    const jitter = 1 + (Math.random() - 0.5) * 0.1;
    entry.timer = window.setTimeout(() => void this.refresh(key), base * jitter);
  }

  private async load(key: string): Promise<void> {
    const entry = this.entry(key);
    const { def } = entry;
    const startedIn = this.generation;
    try {
      const { body, scope, viewer } = await apiFetchMeta<unknown>(def.path);
      // A purge happened while this request was in flight, so a private answer may belong to the
      // viewer that was just dropped: discard it, the next poll asks again.
      if (scope === 'full' && this.generation !== startedIn) return;
      this.noteViewer(viewer);
      entry.failures = 0;
      this.noteContact(true);
      if (def.envelope === 'plain') {
        this.commit(
          key,
          { data: body, fetchedAt: Date.now(), intervalMs: def.intervalMs },
          null,
          scope,
        );
      } else {
        const snapshot = body as Snapshot<unknown>;
        this.commit(
          key,
          {
            data: snapshot.data,
            fetchedAt: snapshot.fetchedAt ? Date.parse(snapshot.fetchedAt) : null,
            intervalMs: snapshot.intervalMs || def.intervalMs,
          },
          snapshot.error,
          scope,
        );
      }
    } catch (error) {
      entry.failures += 1;
      // 401/403 or a body that is not the API (the login page of a proxy): the visitor may have
      // lost access, and the private data held for them goes with it.
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403 || error.kind === 'parse')
      ) {
        this.purgePrivate();
      }
      this.noteContact(!isUnreachable(error));
      this.patch(key, {
        fetchError: error instanceof ApiError ? error.message : t('common.error.unexpected'),
      });
    }
  }

  private commit(
    key: string,
    next: { data: unknown; fetchedAt: number | null; intervalMs: number },
    snapshotError: string | null,
    scope: ResponseScope,
  ): void {
    const entry = this.entry(key);
    // A snapshot that never collected keeps whatever good data we already hold, except private
    // data when the visitor no longer gets it (a downgrade from full to limited access).
    const held = entry.state;
    const keepOld =
      next.data === null && held.data !== null && !(held.scope === 'full' && scope !== 'full');
    this.patch(key, {
      data: keepOld ? held.data : next.data,
      fetchedAt: keepOld ? held.fetchedAt : next.fetchedAt,
      scope: keepOld ? held.scope : next.data === null ? null : scope,
      intervalMs: next.intervalMs,
      snapshotError,
      fetchError: null,
    });
    const now = Date.now();
    if (
      !keepOld &&
      entry.def.persist &&
      scope !== 'full' &&
      now - entry.lastPersistedAt >= PERSIST_EVERY_MS
    ) {
      entry.lastPersistedAt = now;
      this.writePersisted(key, entry.state);
    }
    this.setConnection({ lastDataAt: this.latestFetchedAt() });
  }

  private patch(key: string, changes: Partial<EntryState>): void {
    const entry = this.entry(key);
    entry.state = { ...entry.state, ...changes };
    for (const listener of entry.listeners) listener();
  }

  /* -------------------------------------------------------------- private data */

  /** Remembers who the server answers for; a different viewer takes the previous one's data. */
  private noteViewer(viewer: string | null): void {
    if (this.viewer !== undefined && viewer !== this.viewer) this.purgePrivate();
    this.viewer = viewer;
  }

  /** Forgets every payload held in memory that was produced for a `full` visitor. */
  private purgePrivate(): void {
    this.generation += 1;
    for (const [key, entry] of this.entries) {
      if (entry.state.scope !== 'full') continue;
      this.patch(key, { data: null, fetchedAt: null, scope: null, snapshotError: null });
    }
    this.setConnection({ lastDataAt: this.latestFetchedAt() });
  }

  /* ----------------------------------------------------------------- connection */

  private noteContact(reachable: boolean): void {
    if (reachable) {
      this.unreachableCount = 0;
      this.setConnection({ status: navigator.onLine === false ? 'offline' : 'online' });
      return;
    }
    this.unreachableCount += 1;
    if (this.unreachableCount >= OFFLINE_AFTER_FAILURES) this.setConnection({ status: 'offline' });
  }

  private setConnection(changes: Partial<ConnectionState>): void {
    const next = { ...this.connection, ...changes };
    if (next.status === this.connection.status && next.lastDataAt === this.connection.lastDataAt) {
      return;
    }
    // Out of contact the store cannot tell whether the visitor still has access: private data goes.
    const wentOffline = next.status === 'offline' && this.connection.status !== 'offline';
    this.connection = next;
    if (wentOffline) this.purgePrivate();
    for (const listener of this.connectionListeners) listener();
  }

  private latestFetchedAt(): number | null {
    const times = [...this.entries.values()]
      .map((entry) => entry.state.fetchedAt)
      .filter((time): time is number => time !== null);
    return times.length > 0 ? Math.max(...times) : null;
  }

  /* --------------------------------------------------------------------- events */

  private readonly onVisibility = (): void => {
    for (const [key, entry] of this.entries) {
      if (entry.subscribers === 0) continue;
      if (document.hidden) {
        clearTimeout(entry.timer);
      } else if (Date.now() - entry.lastAttemptAt >= MIN_RETRY_GAP_MS) {
        void this.refresh(key);
      } else {
        this.schedule(key);
      }
    }
  };

  private readonly onOnline = (): void => {
    this.unreachableCount = 0;
    this.setConnection({ status: 'online' });
    for (const [key, entry] of this.entries) {
      entry.failures = 0;
      if (entry.subscribers > 0 && !document.hidden) void this.refresh(key);
    }
  };

  private readonly onOffline = (): void => {
    this.setConnection({ status: 'offline' });
  };
}
