import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataStore } from './store';

/**
 * What the data store may keep of what a `full` visitor saw. The "server" below answers like the
 * real one (scope and viewer headers, activity withheld for limited visitors) and the browser
 * pieces the store touches are replaced by in-memory ones.
 */

const SECRET = 'PRIVATE-TASK-TITLE';

class MemoryStorage {
  private readonly items = new Map<string, string>();
  get length(): number {
    return this.items.size;
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, String(value));
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  dump(): string {
    return JSON.stringify([...this.items]);
  }
}

interface Viewer {
  level: 'full' | 'limited';
  login: string | null;
}

class FakeServer {
  viewer: Viewer = { level: 'full', login: 'alice@example.com' };
  /** The backend does not answer at all. */
  down = false;
  /** Answers that look like what a proxy returns after the session ended. */
  mode: 'api' | 'unauthorized' | 'login-page' | 'unmarked' = 'api';
  /** Paths whose answer is held back until `release` is called. */
  private readonly held = new Map<string, Promise<void>>();
  private releases = new Map<string, () => void>();

  hold(path: string): void {
    this.held.set(path, new Promise<void>((resolve) => this.releases.set(path, resolve)));
  }

  release(path: string): void {
    this.releases.get(path)?.();
    this.held.delete(path);
  }

  readonly fetch = async (input: string): Promise<Response> => {
    const path = input.split('?')[0] ?? input;
    const viewer = { ...this.viewer };
    await this.held.get(path);
    if (this.down) throw new TypeError('Failed to fetch');
    if (this.mode === 'unauthorized') return new Response('{"error":"forbidden"}', { status: 401 });
    if (this.mode === 'login-page') return new Response('<html>Sign in</html>', { status: 200 });
    const shared = path === '/api/overview';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.mode !== 'unmarked') {
      headers['X-Orbis-Scope'] = shared ? 'shared' : viewer.level;
      headers['X-Orbis-Viewer'] = `${viewer.level}:${viewer.login ?? ''}`;
    }
    return new Response(JSON.stringify(this.body(path, viewer)), { headers });
  };

  private body(path: string, viewer: Viewer): unknown {
    const full = viewer.level === 'full';
    if (path === '/api/session') {
      return { access: viewer.level, user: viewer.login ? { login: viewer.login } : null };
    }
    if (path === '/api/overview') {
      return {
        data: { services: { up: 3 } },
        fetchedAt: new Date().toISOString(),
        error: null,
        intervalMs: 10_000,
      };
    }
    if (path === '/api/activity') {
      return {
        events: [{ id: 'e1', title: 'Service restarted' }],
        usage: [],
        tasks: { data: { items: full ? [{ title: SECRET }] : [], restricted: !full } },
      };
    }
    if (path === '/api/x/ext/status') {
      return {
        data: full ? { note: SECRET } : null,
        fetchedAt: new Date().toISOString(),
        error: null,
        intervalMs: 10_000,
      };
    }
    throw new Error(`unexpected ${path}`);
  }
}

let server: FakeServer;
let storage: MemoryStorage;

beforeEach(() => {
  server = new FakeServer();
  storage = new MemoryStorage();
  vi.stubGlobal('__API_SCHEMA__', 'test');
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('document', {
    hidden: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal('window', {
    setTimeout,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
  vi.stubGlobal('fetch', server.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const newStore = (): DataStore => new DataStore('demo');
const memory = (store: DataStore, key: string): string => JSON.stringify(store.getState(key).data);
const holds = (store: DataStore, key: string): boolean => memory(store, key).includes(SECRET);

/** Loads what a signed-in visitor sees. */
async function browse(store: DataStore): Promise<void> {
  await Promise.all(['session', 'overview', 'activity'].map((key) => store.refresh(key)));
}

describe('a full visitor', () => {
  it('sees private data, which is held in memory and never written to storage', async () => {
    const store = newStore();
    await browse(store);
    expect(holds(store, 'activity')).toBe(true);
    expect(storage.dump()).not.toContain(SECRET);
    expect(storage.dump()).not.toContain('alice');
    // The session says who the visitor is: never persisted at all.
    expect(storage.dump()).not.toContain('session');
    // What anybody could fetch is persisted as before.
    expect(storage.dump()).toContain('overview');
  });

  it('leaves no private data to a restarted app', async () => {
    await browse(newStore());
    const restarted = newStore();
    expect(restarted.getState('activity').data).toBeNull();
    expect(restarted.getState('session').data).toBeNull();
    expect(restarted.getState('overview').data).not.toBeNull();
  });
});

describe('full to limited on the same origin', () => {
  it('drops the private data as soon as any answer comes from a limited viewer', async () => {
    const store = newStore();
    await browse(store);
    server.viewer = { level: 'limited', login: null };
    await store.refresh('overview'); // a shared route: activity is not asked again
    expect(store.getState('activity').data).toBeNull();
    expect(store.getState('session').data).toBeNull();
    expect(holds(store, 'activity')).toBe(false);
  });

  it('shows the limited view afterwards and keeps nothing private in storage or memory', async () => {
    const store = newStore();
    await browse(store);
    server.viewer = { level: 'limited', login: null };
    await store.refresh('activity');
    expect(store.getState('activity').scope).toBe('limited');
    expect(JSON.stringify(store.getState('activity').data)).toContain('"restricted":true');
    expect(holds(store, 'activity')).toBe(false);
    expect(storage.dump()).not.toContain(SECRET);
    // What was persisted is the limited copy anybody could fetch: restored, and without secrets.
    const restarted = newStore();
    expect(restarted.getState('activity').scope).toBe('limited');
    expect(holds(restarted, 'activity')).toBe(false);
  });

  it('does not keep a private snapshot when the limited answer carries no data', async () => {
    const store = newStore();
    const key = store.defineRemote('/x/ext/status', { intervalMs: 10_000 });
    await store.refresh(key);
    expect(holds(store, key)).toBe(true);
    server.viewer = { level: 'limited', login: null };
    await store.refresh(key);
    expect(store.getState(key).data).toBeNull();
  });
});

describe('another identity in the same browser', () => {
  it('drops the previous identity data when the server reports another viewer', async () => {
    const store = newStore();
    await browse(store);
    server.viewer = { level: 'full', login: 'bob@example.com' };
    await store.refresh('overview');
    expect(store.getState('activity').data).toBeNull();
    await store.refresh('activity');
    expect(holds(store, 'activity')).toBe(true); // bob's own copy, fetched for bob
  });

  it('ignores an answer for the previous identity that was still in flight', async () => {
    const store = newStore();
    await browse(store);
    server.hold('/api/activity');
    const stale = store.refresh('activity'); // asked as alice, answer delayed
    await Promise.resolve();
    server.viewer = { level: 'full', login: 'bob@example.com' };
    await store.refresh('overview'); // bob's first answer drops alice's data
    server.release('/api/activity');
    await stale;
    expect(store.getState('activity').data).toBeNull();
  });
});

describe('logout, then the backend is offline', () => {
  it('drops private data once contact is lost, and storage never had it', async () => {
    const store = newStore();
    await browse(store);
    server.down = true; // the visitor logged out at the proxy, the backend is unreachable
    await store.refresh('overview');
    expect(holds(store, 'activity')).toBe(true); // one miss is not yet "offline"
    await store.refresh('overview');
    expect(store.getConnection().status).toBe('offline');
    expect(store.getState('activity').data).toBeNull();
    expect(store.getState('session').data).toBeNull();
    expect(storage.dump()).not.toContain(SECRET);
    const restarted = newStore();
    expect(restarted.getState('activity').data).toBeNull();
  });

  it.each(['unauthorized', 'login-page'] as const)(
    'drops private data at once when the proxy answers %s',
    async (mode) => {
      const store = newStore();
      await browse(store);
      server.mode = mode;
      await store.refresh('activity');
      expect(store.getState('activity').data).toBeNull();
      expect(holds(store, 'activity')).toBe(false);
    },
  );

  it('does not let an answer that was in flight during the logout bring the data back', async () => {
    const store = newStore();
    await browse(store);
    server.hold('/api/activity');
    const inFlight = store.refresh('activity');
    await Promise.resolve();
    server.mode = 'unauthorized';
    await store.refresh('overview');
    server.mode = 'api';
    server.release('/api/activity');
    await inFlight;
    expect(store.getState('activity').data).toBeNull();
  });
});

describe('unmarked answers', () => {
  it('count as private: not persisted and dropped when contact is lost', async () => {
    server.mode = 'unmarked';
    const store = newStore();
    await store.refresh('activity');
    expect(holds(store, 'activity')).toBe(true);
    expect(storage.dump()).not.toContain(SECRET);
    server.down = true;
    await store.refresh('overview');
    await store.refresh('overview');
    expect(store.getState('activity').data).toBeNull();
  });
});

describe('restart with an earlier cache', () => {
  it('drops what an earlier version persisted, whatever it held', () => {
    const legacy = JSON.stringify({
      data: { tasks: { data: { items: [{ title: SECRET }] } } },
      fetchedAt: 1,
    });
    storage.setItem('demo.snapshot.test.activity', legacy); // old key layout, no scope
    storage.setItem(
      'demo.snapshot.test.session',
      JSON.stringify({ data: { access: 'full' }, fetchedAt: 1 }),
    );
    storage.setItem('demo.snapshot.old.activity', legacy); // another contract version
    storage.setItem('demo.prefs.v1', '{"theme":"dark"}'); // not a snapshot: untouched
    const store = newStore();
    expect(store.getState('activity').data).toBeNull();
    expect(store.getState('session').data).toBeNull();
    expect(storage.dump()).not.toContain(SECRET);
    expect(storage.getItem('demo.prefs.v1')).not.toBeNull();
  });

  it('ignores a persisted copy of a private scope even under the current layout', () => {
    storage.setItem(
      'demo.snapshot.test.f2.activity',
      JSON.stringify({ data: { tasks: SECRET }, fetchedAt: 1, scope: 'full' }),
    );
    storage.setItem(
      'demo.snapshot.test.f2.diagnostics',
      JSON.stringify({ data: { tasks: SECRET }, fetchedAt: 1 }),
    );
    const store = newStore();
    expect(store.getState('activity').data).toBeNull();
    expect(store.getState('diagnostics').data).toBeNull();
  });
});

describe('offline features that are not sensitive', () => {
  it('keeps showing shared data offline, after going offline and after a restart', async () => {
    const store = newStore();
    await browse(store);
    server.down = true;
    await store.refresh('overview');
    await store.refresh('overview');
    expect(store.getConnection().status).toBe('offline');
    expect(store.getState('overview').data).toEqual({ services: { up: 3 } });
    const restarted = newStore();
    expect(restarted.getState('overview').data).toEqual({ services: { up: 3 } });
    expect(restarted.getConnection().lastDataAt).not.toBeNull();
  });

  it('keeps limited-level data (the activity a limited visitor gets) across a restart and offline', async () => {
    server.viewer = { level: 'limited', login: null };
    const store = newStore();
    await browse(store);
    server.down = true;
    await store.refresh('activity');
    await store.refresh('activity');
    expect(store.getConnection().status).toBe('offline');
    expect(store.getState('activity').data).not.toBeNull();
    const restarted = newStore();
    expect(JSON.stringify(restarted.getState('activity').data)).toContain('Service restarted');
    expect(holds(restarted, 'activity')).toBe(false);
  });
});
