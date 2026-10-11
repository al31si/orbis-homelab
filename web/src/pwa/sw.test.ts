import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { SCOPE_HEADER } from '@shared/api';

/**
 * Runs the real `public/sw.js` in a vm with an in-memory Cache API and a scripted network, and
 * checks what it keeps and what it serves when the network is gone.
 */

const SOURCE = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8').replace(
  '__BUILD_ID__',
  'test-build',
);
const ORIGIN = 'https://demo.example.com';
const SECRET = 'PRIVATE-TASK-TITLE';

type Listener = (event: Record<string, unknown>) => void;

class MemoryCache {
  readonly entries = new Map<string, Response>();
  private static key(request: Request | string): string {
    return typeof request === 'string' ? new URL(request, ORIGIN).href : request.url;
  }
  async match(request: Request | string): Promise<Response | undefined> {
    return this.entries.get(MemoryCache.key(request))?.clone();
  }
  async put(request: Request | string, response: Response): Promise<void> {
    this.entries.set(MemoryCache.key(request), response);
  }
  async delete(request: Request | string): Promise<boolean> {
    return this.entries.delete(MemoryCache.key(request));
  }
  async addAll(): Promise<void> {
    // The tests run with an empty precache list.
  }
}

class MemoryCaches {
  readonly stores = new Map<string, MemoryCache>();
  async open(name: string): Promise<MemoryCache> {
    let cache = this.stores.get(name);
    if (!cache) this.stores.set(name, (cache = new MemoryCache()));
    return cache;
  }
  async has(name: string): Promise<boolean> {
    return this.stores.has(name);
  }
  async keys(): Promise<string[]> {
    return [...this.stores.keys()];
  }
  async delete(name: string): Promise<boolean> {
    return this.stores.delete(name);
  }
  /** Every cached body, to look for what must not be there. */
  async everything(): Promise<string> {
    const bodies: string[] = [];
    for (const cache of this.stores.values()) {
      for (const [url, response] of cache.entries) bodies.push(url, await response.clone().text());
    }
    return bodies.join('\n');
  }
}

interface Reply {
  status?: number;
  scope?: string;
  body?: string;
}

function createWorker(existing?: MemoryCaches) {
  const caches = existing ?? new MemoryCaches();
  const listeners = new Map<string, Listener>();
  const state = { skipWaiting: 0, offline: false, replies: new Map<string, Reply>() };
  const network = async (input: Request | string): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input.url, ORIGIN);
    if (state.offline) throw new TypeError('Failed to fetch');
    const reply = state.replies.get(url.pathname) ?? {};
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (reply.scope) headers[SCOPE_HEADER] = reply.scope;
    return new Response(reply.body ?? '{}', { status: reply.status ?? 200, headers });
  };
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    skipWaiting: () => {
      state.skipWaiting += 1;
    },
    clients: { claim: async () => undefined },
  };
  vm.runInNewContext(SOURCE, {
    self,
    caches,
    fetch: network,
    Request,
    Response,
    Headers,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    console,
  });

  const lifecycle = async (type: 'install' | 'activate'): Promise<void> => {
    const pending: Promise<unknown>[] = [];
    listeners.get(type)?.({ waitUntil: (p: Promise<unknown>) => pending.push(p) });
    await Promise.all(pending);
  };
  /** Dispatches a GET like the browser; null when the worker does not intercept it. */
  const get = async (path: string, init: { method?: string; mode?: string } = {}) => {
    const request = new Request(new URL(path, ORIGIN), { method: init.method ?? 'GET' });
    Object.defineProperty(request, 'mode', { value: init.mode ?? 'cors' });
    let answer: Promise<Response> | null = null;
    listeners.get('fetch')?.({ request, respondWith: (p: Promise<Response>) => (answer = p) });
    return answer as Promise<Response> | null;
  };
  return { caches, state, lifecycle, get };
}

const reply = (worker: ReturnType<typeof createWorker>, path: string, r: Reply): void => {
  worker.state.replies.set(path, r);
};

describe('what the service worker keeps of the API', () => {
  it('serves shared data when the backend is gone, flagged as not live', async () => {
    const worker = createWorker();
    reply(worker, '/api/overview', { scope: 'shared', body: '{"data":{"up":3}}' });
    await (await worker.get('/api/overview'))!;
    worker.state.offline = true;
    const offline = (await worker.get('/api/overview'))!;
    expect(await offline.json()).toEqual({ data: { up: 3 } });
    expect(offline.headers.get('X-Orbis-From-Cache')).toBe('1');
  });

  it('keeps the limited view of an access-dependent route and serves it offline', async () => {
    const worker = createWorker();
    reply(worker, '/api/activity', { scope: 'limited', body: '{"tasks":{"items":[]}}' });
    await (await worker.get('/api/activity'))!;
    worker.state.offline = true;
    expect(await (await (await worker.get('/api/activity'))!).json()).toEqual({
      tasks: { items: [] },
    });
  });

  it('never stores a private answer, and offline there is nothing to serve', async () => {
    const worker = createWorker();
    reply(worker, '/api/activity', { scope: 'full', body: `{"tasks":{"items":["${SECRET}"]}}` });
    await (await worker.get('/api/activity'))!;
    expect(await worker.caches.everything()).not.toContain(SECRET);
    worker.state.offline = true;
    await expect(worker.get('/api/activity')).rejects.toThrow();
  });

  it('treats an answer without the scope header as private', async () => {
    const worker = createWorker();
    reply(worker, '/api/overview', { body: `{"leak":"${SECRET}"}` });
    await (await worker.get('/api/overview'))!;
    expect(await worker.caches.everything()).not.toContain(SECRET);
  });

  it('full to limited: the private answer is not served after the visitor lost access', async () => {
    const worker = createWorker();
    reply(worker, '/api/activity', { scope: 'full', body: `{"items":["${SECRET}"]}` });
    await (await worker.get('/api/activity'))!;
    // access drops to limited, then the backend goes away
    reply(worker, '/api/activity', { scope: 'limited', body: '{"items":[]}' });
    await (await worker.get('/api/activity'))!;
    worker.state.offline = true;
    const offline = await (await (await worker.get('/api/activity'))!).text();
    expect(offline).not.toContain(SECRET);
    expect(await worker.caches.everything()).not.toContain(SECRET);
  });

  it('a private answer replaces, rather than leaves behind, the stored public one', async () => {
    const worker = createWorker();
    reply(worker, '/api/activity', { scope: 'limited', body: '{"items":[]}' });
    await (await worker.get('/api/activity'))!;
    reply(worker, '/api/activity', { scope: 'full', body: `{"items":["${SECRET}"]}` });
    await (await worker.get('/api/activity'))!;
    worker.state.offline = true;
    await expect(worker.get('/api/activity')).rejects.toThrow();
  });

  it('does not store errors, and an error from the proxy falls back to the stored copy', async () => {
    const worker = createWorker();
    reply(worker, '/api/overview', { scope: 'shared', body: '{"data":1}' });
    await (await worker.get('/api/overview'))!;
    reply(worker, '/api/overview', { status: 502, body: 'Bad gateway' });
    const fallback = (await worker.get('/api/overview'))!;
    expect(await fallback.json()).toEqual({ data: 1 });
    reply(worker, '/api/services', { status: 500, scope: 'shared', body: 'boom' });
    await (await worker.get('/api/services'))!;
    expect(await worker.caches.everything()).not.toContain('boom');
  });

  it('leaves the session, push, health, extension routes and writes alone', async () => {
    const worker = createWorker();
    for (const path of ['/api/session', '/api/push/config', '/api/health', '/api/x/ext/status']) {
      expect(await worker.get(path), path).toBeNull();
    }
    expect(await worker.get('/api/push/subscribe', { method: 'POST' })).toBeNull();
    expect(await worker.get('https://other.example.net/api/overview')).toBeNull(); // other origin
  });
});

describe('what the service worker keeps of the instance', () => {
  it('serves branding, the manifest and extension bundles offline: they are static', async () => {
    const worker = createWorker();
    for (const path of [
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/extensions/ext/client.js',
    ]) {
      reply(worker, path, { body: `content of ${path}` });
      await (await worker.get(path))!;
    }
    worker.state.offline = true;
    for (const path of [
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/extensions/ext/client.js',
    ]) {
      expect(await (await (await worker.get(path))!).text()).toBe(`content of ${path}`);
    }
  });

  it('serves the stored app shell for a navigation when the backend is gone', async () => {
    const worker = createWorker();
    reply(worker, '/', { body: '<html>shell</html>' });
    await (await worker.get('/', { mode: 'navigate' }))!;
    worker.state.offline = true;
    expect(await (await (await worker.get('/', { mode: 'navigate' }))!).text()).toBe(
      '<html>shell</html>',
    );
  });
});

describe('older caches', () => {
  const stored = async (): Promise<MemoryCaches> => {
    const caches = new MemoryCaches();
    const legacy = await caches.open('orbis-homelab-api-v1');
    await legacy.put('/api/activity', new Response(`{"items":["${SECRET}"]}`));
    return caches;
  };

  it('deletes the cache an earlier version filled with every answer, on activation', async () => {
    const caches = await stored();
    const worker = createWorker(caches);
    await worker.lifecycle('activate');
    expect(await caches.keys()).not.toContain('orbis-homelab-api-v1');
    expect(await caches.everything()).not.toContain(SECRET);
    worker.state.offline = true;
    await expect(worker.get('/api/activity')).rejects.toThrow();
  });

  it('takes over at install time instead of waiting, because the old worker keeps filling it', async () => {
    const worker = createWorker(await stored());
    await worker.lifecycle('install');
    expect(worker.state.skipWaiting).toBe(1);
  });

  it('keeps waiting for the page when there is no such cache (a normal update)', async () => {
    const worker = createWorker();
    await worker.lifecycle('install');
    expect(worker.state.skipWaiting).toBe(0);
  });

  it('keeps its own caches and removes only those of this instance', async () => {
    const caches = await stored();
    await caches.open('orbis-homelab-assets-v1');
    await caches.open('another-app-api-v1');
    const worker = createWorker(caches);
    await worker.lifecycle('install');
    await worker.lifecycle('activate');
    const names = await caches.keys();
    expect(names).toContain('orbis-homelab-assets-v1');
    expect(names).toContain('another-app-api-v1');
    expect(names).toContain('orbis-homelab-shell-test-build');
    expect(names).not.toContain('orbis-homelab-api-v1');
  });
});
