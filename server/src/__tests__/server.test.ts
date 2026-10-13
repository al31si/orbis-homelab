import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import type { Session } from '../../../shared/api.js';
import { ExtensionHost } from '../extensions/host.js';
import { createTranslator } from '../i18n/index.js';
import { PushService } from '../push.js';
import { buildApp } from '../server.js';
import { type FakeCore, createFakeCore } from './helpers/fake-core.js';
import { type Instance, createInstance, makeConfig, writeFiles } from './helpers/fixtures.js';

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0)) await close();
});

interface Options {
  config?: Record<string, unknown>;
  core?: FakeCore;
  instance?: Instance;
  withPush?: boolean;
}

async function start(opts: Options = {}) {
  const instance = opts.instance ?? createInstance();
  const config = makeConfig({
    push: opts.withPush ? { enabled: true, subject: 'mailto:ops@example.com' } : undefined,
    ...opts.config,
  });
  const t = createTranslator(config.app.language);
  const core = opts.core ?? createFakeCore();
  const push = opts.withPush
    ? await PushService.create({
        dataDir: instance.dataDir,
        subject: 'mailto:ops@example.com',
        appId: 'demo',
        appName: 'Demo',
        t,
        log: { info: () => undefined, warn: () => undefined },
      })
    : null;
  const extensions = await ExtensionHost.load({
    extensionsDir: instance.extensionsDir,
    entries: config.extensions,
    core,
    secrets: () => Promise.resolve(undefined),
    language: config.app.language,
    log: { info: () => undefined, warn: () => undefined, error: () => undefined },
  });
  const built = buildApp({ env: instance.env, config, core, push, extensions, t });
  closers.push(() => built.app.close());
  await built.app.ready();
  return { ...built, core, instance, push };
}

const json = async (app: FastifyInstance, url: string, init: object = {}) => {
  const res = await app.inject({ url, ...init });
  return { res, body: res.json() as Record<string, unknown> };
};

const post = (app: FastifyInstance, url: string, payload: unknown, headers: object = {}) =>
  app.inject({
    method: 'POST',
    url,
    payload: JSON.stringify(payload),
    headers: { 'content-type': 'application/json', ...headers },
  });

const trusted = { access: { mode: 'trusted-network' } };

describe('API edge', () => {
  it('answers health and sets the security headers and no-store on /api', async () => {
    const { app } = await start();
    const res = await app.inject({ url: '/api/health' });
    expect(res.json()).toEqual({ ok: true });
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe/);
  });

  it('answers unknown /api paths with a JSON 404, translated message included', async () => {
    const { app } = await start();
    const { res, body } = await json(app, '/api/nope');
    expect(res.statusCode).toBe(404);
    expect(body).toEqual({ error: 'not found', message: 'Resource not found.' });
    const it = await start({ config: { app: { language: 'it' } } });
    expect((await json(it.app, '/api/nope')).body.message).toBe('Risorsa non trovata.');
  });

  it('offers no secure address without publicUrl, and never an http one', async () => {
    const secureUrlOf = async (publicUrl?: string): Promise<unknown> => {
      const { app } = await start({ config: publicUrl === undefined ? {} : { publicUrl } });
      return (await json(app, '/api/session')).body.secureUrl;
    };
    expect(await secureUrlOf()).toBeNull();
    expect(await secureUrlOf('http://192.168.1.50:3100')).toBeNull();
    expect(await secureUrlOf('https://orbis.example.com')).toBe('https://orbis.example.com');
  });

  it('builds the session from the core: boot config + access fields', async () => {
    const { app } = await start({
      config: { publicUrl: 'https://demo.example.com' },
      core: createFakeCore({ features: { system: true } }),
    });
    const { body } = await json(app, '/api/session');
    const session = body as unknown as Session;
    expect(session).toMatchObject({
      access: 'limited',
      accessMode: 'limited',
      user: null,
      secureUrl: 'https://demo.example.com',
      extensions: [],
      integrations: [],
      startedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(session.app.name).toBe('Demo Center');
    expect(session.features.system).toBe(true);
    expect(session.version).toMatch(/^\d+\.\d+/);
  });

  it('fills the default description in the instance language', async () => {
    const en = (await json((await start()).app, '/api/session')).body as unknown as Session;
    expect(en.app.description).toBe('Status and quick access to your services.');
    const it = await start({ config: { app: { language: 'it' } } });
    expect(((await json(it.app, '/api/session')).body as unknown as Session).app.description).toBe(
      'Stato e accessi rapidi dei tuoi servizi.',
    );
    const own = await start({ core: createFakeCore({ app: { description: 'Mine' } }) });
    expect(((await json(own.app, '/api/session')).body as unknown as Session).app.description).toBe(
      'Mine',
    );
  });

  it('gates system, containers, storage and activity on their feature (404 when off)', async () => {
    const off = await start();
    for (const route of ['system', 'containers', 'storage', 'activity']) {
      const { res, body } = await json(off.app, `/api/${route}`);
      expect(res.statusCode, route).toBe(404);
      expect(body.error).toBe('not found');
    }
    const on = await start({
      core: createFakeCore({
        features: { system: true, containers: true, storage: true, activity: true },
      }),
    });
    for (const route of ['system', 'containers', 'storage', 'activity']) {
      expect((await on.app.inject({ url: `/api/${route}` })).statusCode, route).toBe(200);
    }
    // always available
    for (const route of ['overview', 'services', 'diagnostics', 'session']) {
      expect((await off.app.inject({ url: `/api/${route}` })).statusCode, route).toBe(200);
    }
  });

  it('passes the caller access level to the activity feed', async () => {
    const core = createFakeCore({ features: { activity: true } });
    const limited = await start({ core });
    await limited.app.inject({ url: '/api/activity' });
    const full = await start({ core, config: trusted });
    await full.app.inject({ url: '/api/activity' });
    expect(core.calls).toEqual(['activity:limited', 'activity:full']);
  });

  it('reports extensions and push in diagnostics', async () => {
    const off = await start();
    expect((await json(off.app, '/api/diagnostics')).body).toMatchObject({
      push: { enabled: false, subscriptions: 0 },
      extensions: [],
    });
    const on = await start({ withPush: true });
    expect((await json(on.app, '/api/diagnostics')).body.push).toEqual({
      enabled: true,
      subscriptions: 0,
    });
  });

  it('resolves identity-proxy access per request source', async () => {
    const config = {
      access: {
        mode: 'identity-proxy',
        identityProxy: {
          preset: 'tailscale',
          trustedProxies: ['10.0.0.0/8'],
          allowedUsers: ['me@example.com'],
        },
      },
    };
    const { app } = await start({ config });
    const headers = { 'tailscale-user-login': 'me@example.com', 'tailscale-user-name': 'Me' };
    const proxied = (await json(app, '/api/session', { headers, remoteAddress: '10.1.2.3' })).body;
    expect(proxied).toMatchObject({
      access: 'full',
      accessMode: 'identity-proxy',
      user: { login: 'me@example.com', name: 'Me' },
    });
    for (const remoteAddress of ['192.168.1.5', '127.0.0.1']) {
      const forged = (await json(app, '/api/session', { headers, remoteAddress })).body;
      expect(forged).toMatchObject({ access: 'limited', user: null });
    }
  });
});

describe('push routes', () => {
  const sub = {
    endpoint: 'https://web.push.apple.com/abc',
    keys: { p256dh: 'p', auth: 'a' },
  };

  it('does not exist when push is disabled: config says unavailable, the rest is 404', async () => {
    const { app } = await start({ config: trusted });
    expect((await json(app, '/api/push/config')).body).toEqual({
      available: false,
      publicKey: null,
      subscriptions: 0,
    });
    for (const route of ['subscribe', 'unsubscribe', 'test']) {
      expect((await post(app, `/api/push/${route}`, sub)).statusCode, route).toBe(404);
    }
  });

  it('is unavailable to limited callers even when enabled', async () => {
    const { app } = await start({ withPush: true });
    expect((await json(app, '/api/push/config')).body).toEqual({
      available: false,
      publicKey: null,
      subscriptions: 0,
    });
    for (const route of ['subscribe', 'unsubscribe', 'test']) {
      const res = await post(app, `/api/push/${route}`, sub);
      expect(res.statusCode, route).toBe(403);
      expect(res.json()).toMatchObject({ error: 'forbidden' });
    }
  });

  it('serves full callers: config, subscribe, unsubscribe, test', async () => {
    const { app, push } = await start({ withPush: true, config: trusted });
    const config = (await json(app, '/api/push/config')).body;
    expect(config).toEqual({ available: true, publicKey: push?.publicKey, subscriptions: 0 });

    expect((await post(app, '/api/push/subscribe', sub)).json()).toEqual({
      ok: true,
      subscriptions: 1,
    });
    expect((await post(app, '/api/push/test', {})).json()).toEqual({ sent: 0 });
    expect((await post(app, '/api/push/unsubscribe', { endpoint: sub.endpoint })).json()).toEqual({
      ok: true,
      subscriptions: 0,
    });
  });

  it('validates the request: same-origin JSON, subscription shape, body', async () => {
    const { app } = await start({ withPush: true, config: trusted });
    const form = await app.inject({
      method: 'POST',
      url: '/api/push/subscribe',
      payload: 'a=b',
      headers: { 'content-type': 'text/plain' },
    });
    expect(form.statusCode).toBe(400);
    expect(form.json()).toMatchObject({ error: 'json same-origin only' });
    const crossSite = await post(app, '/api/push/subscribe', sub, {
      origin: 'https://evil.test',
      host: 'demo.example.com',
    });
    expect(crossSite.statusCode).toBe(400);
    expect(crossSite.json()).toMatchObject({ error: 'json same-origin only' });
    const ssrf = await post(app, '/api/push/subscribe', {
      ...sub,
      endpoint: 'https://127.0.0.1/x',
    });
    expect(ssrf.json()).toMatchObject({ error: 'invalid subscription' });
    const body = await post(app, '/api/push/unsubscribe', { endpoint: 5 });
    expect(body.json()).toMatchObject({ error: 'invalid body' });
  });

  it('refuses the 21st subscription', async () => {
    const { app } = await start({ withPush: true, config: trusted });
    for (let n = 0; n < 20; n += 1) {
      const res = await post(app, '/api/push/subscribe', {
        ...sub,
        endpoint: `https://web.push.apple.com/${n}`,
      });
      expect(res.statusCode).toBe(200);
    }
    const res = await post(app, '/api/push/subscribe', sub);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: 'too many subscriptions' });
  });
});

describe('static PWA', () => {
  it('renders index.html for / and for SPA routes, never the raw template', async () => {
    const { app } = await start();
    for (const url of ['/', '/services', '/services/media-server?x=1', '/index.html']) {
      const res = await app.inject({ url });
      expect(res.statusCode, url).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.body).toContain('<title>Demo Center</title>');
      expect(res.body).not.toMatch(/%%[A-Z_]+%%/);
      expect(res.body).toContain('orbis-boot');
    }
  });

  it('renders sw.js and the manifest from the instance', async () => {
    const { app } = await start({
      core: createFakeCore({ features: { storage: true } }),
    });
    const sw = await app.inject({ url: '/sw.js' });
    expect(sw.headers['content-type']).toContain('text/javascript');
    expect(sw.headers['cache-control']).toBe('no-cache');
    expect(sw.body).toContain('"cachePrefix":"demo-"');
    const manifest = await app.inject({ url: '/manifest.webmanifest' });
    expect(manifest.headers['content-type']).toContain('application/manifest+json');
    expect(manifest.json()).toMatchObject({ name: 'Demo Center', lang: 'en' });
    expect(
      (manifest.json() as { shortcuts: { name: string }[] }).shortcuts.map((s) => s.name),
    ).toEqual(['Services', 'Storage']);
  });

  it('serves hashed assets as immutable and other bundle files revalidated', async () => {
    const { app } = await start();
    const asset = await app.inject({ url: '/assets/app-abc123.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    const theme = await app.inject({ url: '/theme-init.js' });
    expect(theme.body).toBe('window.__theme = 1;');
    expect(theme.headers['cache-control']).toBe('no-cache');
    expect((await app.inject({ url: '/assets/missing.js' })).statusCode).toBe(404);
    expect((await app.inject({ url: '/missing.png' })).statusCode).toBe(404);
  });

  it('serves icons and splash from the instance branding first, built-ins as fallback', async () => {
    const instance = createInstance();
    writeFiles(path.join(instance.configDir, 'branding'), {
      'icons/icon-192.png': 'custom-192',
      'splash/750x1334.png': 'custom-splash',
      'icons/my-service.svg': '<svg id="mine"/>',
    });
    const { app } = await start({ instance });
    const get = (url: string) => app.inject({ url });
    expect((await get('/icons/icon-192.png')).body).toBe('custom-192');
    expect((await get('/icons/favicon-32.png')).body).toBe('builtin-favicon');
    expect((await get('/splash/750x1334.png')).body).toBe('custom-splash');
    expect((await get('/icons/icon-192.png')).headers['cache-control']).toBe('no-cache');
    expect((await get('/icons/nothing.png')).statusCode).toBe(404);
    const custom = await get('/branding/icons/my-service.svg');
    expect(custom.body).toBe('<svg id="mine"/>');
    expect(custom.headers['content-type']).toContain('image/svg+xml');
    // only the instance folder: built-in icons are not reachable here
    expect((await get('/branding/icons/favicon-32.png')).statusCode).toBe(404);
  });

  it('cannot be tricked into reading files outside the served folders', async () => {
    const instance = createInstance();
    writeFiles(path.join(instance.configDir, 'branding'), { 'icons/ok.svg': '<svg/>' });
    fs.writeFileSync(path.join(instance.configDir, 'config.yaml'), 'secret: value');
    const { app } = await start({ instance });
    const attempts = [
      '/assets/../../secret.txt',
      '/assets/%2e%2e/%2e%2e/secret.txt',
      '/assets/..%2f..%2fsecret.txt',
      '/icons/../../secret.txt',
      '/icons/%2e%2e/%2e%2e/config/config.yaml',
      '/splash/..%2f..%2f..%2fsecret.txt',
      '/branding/icons/../../config.yaml',
      '/branding/icons/%2e%2e%2f%2e%2e%2fconfig.yaml',
      '/branding/icons/..%5c..%5cconfig.yaml',
      '/..%2fsecret.txt',
      '/%2e%2e/secret.txt',
      '/../secret.txt',
      '/.env',
      '/assets/.hidden',
      '/extensions/x/..%2f..%2fsecret.txt',
    ];
    for (const url of attempts) {
      const res = await app.inject({ url });
      expect(res.body, url).not.toContain('top-secret');
      expect(res.body, url).not.toContain('secret: value');
      // Either refused, or the SPA fallback page: never a file from outside.
      const spaPage = res.statusCode === 200 && res.body.includes('orbis-boot');
      expect(res.statusCode >= 400 || spaPage, url).toBe(true);
    }
  });

  it('serves the API only when the web bundle is missing', async () => {
    const instance = createInstance();
    fs.rmSync(path.join(instance.webDir, 'index.html'));
    const { app } = await start({ instance });
    expect((await app.inject({ url: '/' })).statusCode).toBe(404);
    expect((await app.inject({ url: '/api/health' })).statusCode).toBe(200);
  });
});

describe('listeners', () => {
  const freePort = (): Promise<number> =>
    new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const { port } = probe.address() as net.AddressInfo;
        probe.close(() => resolve(port));
      });
    });

  const access = (trustedPort: number | undefined) => ({
    mode: 'identity-proxy',
    identityProxy: {
      trustedProxies: ['127.0.0.1'],
      trustedPort,
      userHeader: 'X-Forwarded-User',
      allowedUsers: ['me@example.com'],
    },
  });

  const accessAt = async (port: number): Promise<string> => {
    const res = await fetch(`http://127.0.0.1:${port}/api/session`, {
      headers: { 'x-forwarded-user': 'me@example.com' },
    });
    return ((await res.json()) as Session).access;
  };

  it('honours identity only on the trusted listener, and closes both', async () => {
    const [port, trustedPort] = [await freePort(), await freePort()];
    const { app, listen } = await start({
      config: { server: { port }, access: access(trustedPort) },
    });
    await listen();
    expect(await accessAt(trustedPort)).toBe('full');
    // same source address and header on the public listener: a forged identity
    expect(await accessAt(port)).toBe('limited');

    await app.close();
    await expect(fetch(`http://127.0.0.1:${trustedPort}/api/health`)).rejects.toThrow();
    await expect(fetch(`http://127.0.0.1:${port}/api/health`)).rejects.toThrow();
  });

  it('does not open a second listener without trustedPort', async () => {
    const port = await freePort();
    const { listen } = await start({ config: { server: { port }, access: access(undefined) } });
    await listen();
    expect(await accessAt(port)).toBe('full');
  });

  it('refuses a trustedPort equal to the public port', async () => {
    const port = await freePort();
    const { listen } = await start({ config: { server: { port }, access: access(port) } });
    await expect(listen()).rejects.toThrow('must differ');
  });
});

describe('response scope (what a client may keep)', () => {
  const SHARED = ['overview', 'services', 'diagnostics', 'health'];
  const proxyConfig = {
    access: {
      mode: 'identity-proxy',
      identityProxy: {
        preset: 'tailscale',
        trustedProxies: ['10.0.0.0/8'],
        allowedUsers: ['me@example.com', 'you@example.com'],
      },
    },
  };
  const as = (login: string) => ({
    headers: { 'tailscale-user-login': login },
    remoteAddress: '10.1.2.3',
  });
  const scopeOf = async (app: FastifyInstance, url: string, init: object = {}) =>
    (await app.inject({ url, ...init })).headers['x-orbis-scope'];

  it('marks the routes that ignore who asks as shared, whatever the access level', async () => {
    const core = createFakeCore({ features: { system: true, containers: true, storage: true } });
    const open = await start({ core });
    const full = await start({ core, config: trusted });
    for (const route of [...SHARED, 'system', 'containers', 'storage']) {
      expect(await scopeOf(open.app, `/api/${route}`), route).toBe('shared');
      expect(await scopeOf(full.app, `/api/${route}`), route).toBe('shared');
    }
  });

  it('marks everything else with the access level of the request, private by default', async () => {
    const core = createFakeCore({ features: { activity: true } });
    const open = await start({ core });
    const full = await start({ core, config: trusted });
    for (const url of ['/api/activity', '/api/session', '/api/push/config', '/api/x/unknown']) {
      expect(await scopeOf(open.app, url), url).toBe('limited');
      expect(await scopeOf(full.app, url), url).toBe('full');
    }
    // Errors are marked too: a proxy-less 404 of a full visitor is still `full`.
    expect(await scopeOf(full.app, '/api/nope')).toBe('full');
    // The query string does not turn a private route into a shared one.
    expect(await scopeOf(full.app, '/api/activity?x=/api/overview')).toBe('full');
  });

  it('only calls the core without an access level for the routes it marks shared', async () => {
    const core = createFakeCore({ features: { activity: true } });
    const { app } = await start({ core, config: trusted });
    for (const route of ['overview', 'services', 'diagnostics'])
      await app.inject({ url: `/api/${route}` });
    expect(core.calls.filter((c) => c.includes(':'))).toEqual([]);
    await app.inject({ url: '/api/activity' });
    expect(core.calls).toContain('activity:full');
  });

  it('gives a viewer tag that follows the identity and reveals nothing about it', async () => {
    const { app } = await start({ config: proxyConfig });
    const tag = async (init: object) =>
      String((await app.inject({ url: '/api/session', ...init })).headers['x-orbis-viewer']);
    const me = await tag(as('me@example.com'));
    expect(await tag(as('me@example.com'))).toBe(me);
    expect(await tag(as('ME@example.com'))).toBe(me);
    const you = await tag(as('you@example.com'));
    const nobody = await tag({ remoteAddress: '192.168.1.5' });
    expect(new Set([me, you, nobody]).size).toBe(3);
    // A forged identity from an untrusted address is the anonymous viewer, not that identity.
    expect(await tag({ ...as('me@example.com'), remoteAddress: '192.168.1.5' })).toBe(nobody);
    expect(me).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(me + you + nobody).not.toMatch(/example|me@/);
  });

  it('uses a different salt per process, so tags cannot be correlated across restarts', async () => {
    const tag = async () =>
      String(
        (
          await (
            await start({ config: proxyConfig })
          ).app.inject({ url: '/api/session', ...as('me@example.com') })
        ).headers['x-orbis-viewer'],
      );
    expect(await tag()).not.toBe(await tag());
  });
});
