import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import type { RouteHelpers } from '../../../sdk/server.js';
import { createSecretResolver } from '../config/secrets.js';
import { ExtensionHost } from '../extensions/host.js';
import { servableAssetPath } from '../extensions/assets.js';
import { createFakeCore } from './helpers/fake-core.js';
import { silentLog, tempDir, writeFile } from './support/core.js';

interface Fixture {
  id: string;
  manifest?: unknown;
  server?: string;
  clientFiles?: string[];
}

const GOOD_SERVER = (id: string, body = '') => `
export default {
  id: '${id}',
  apiVersion: 1,
  async register(ctx) {
    ${body}
  },
};
`;

function install(root: string, fx: Fixture): void {
  const dir = path.join(root, fx.id);
  mkdirSync(dir, { recursive: true });
  const manifest = fx.manifest ?? { id: fx.id, apiVersion: 1 };
  // A string is written as-is, so a test can plant a corrupt file.
  writeFile(
    dir,
    'manifest.json',
    typeof manifest === 'string' ? manifest : JSON.stringify(manifest),
  );
  writeFile(dir, 'server.mjs', fx.server ?? GOOD_SERVER(fx.id));
  for (const file of fx.clientFiles ?? []) {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    writeFile(dir, file, '// client');
  }
}

const helpers: RouteHelpers = {
  accessOf: () => 'full',
  requireFull: () => true,
  isSameOriginJson: () => true,
};

async function loadHost(
  fixtures: Fixture[],
  entries: { id: string; enabled?: boolean; config?: Record<string, unknown> }[],
  opts: { services?: string[]; env?: Record<string, string> } = {},
) {
  const root = tempDir();
  for (const fx of fixtures) install(root, fx);
  const core = createFakeCore({ services: opts.services });
  const host = await ExtensionHost.load({
    extensionsDir: root,
    entries: entries.map((e) => ({ enabled: true, config: {}, ...e })),
    core,
    secrets: createSecretResolver({ CONFIG_DIR: root }, opts.env ?? {}),
    language: 'en',
    log: silentLog,
  });
  return { host, core, root };
}

describe('ExtensionHost loading', () => {
  it('loads a valid extension and reports it as loaded', async () => {
    const { host, core } = await loadHost([{ id: 'demo' }], [{ id: 'demo' }]);
    expect(host.status()).toEqual([{ id: 'demo', loaded: true, error: null }]);
    expect(core.failures).toEqual({});
  });

  it('does nothing for a disabled entry: it is not even attempted', async () => {
    const { host } = await loadHost(
      [{ id: 'demo', server: 'throw new Error("must not be imported")' }],
      [{ id: 'demo', enabled: false }],
    );
    expect(host.status()).toEqual([]);
    expect(host.refs()).toEqual([]);
  });

  it('passes the extension its own config block and the instance language', async () => {
    const { host } = await loadHost(
      [
        {
          id: 'demo',
          server: GOOD_SERVER(
            'demo',
            `if (ctx.config.url !== 'http://x.example.com' || ctx.language !== 'en') throw new Error('bad ctx');`,
          ),
        },
      ],
      [{ id: 'demo', config: { url: 'http://x.example.com' } }],
    );
    expect(host.status()[0]?.loaded).toBe(true);
  });

  it('registers collectors and integrations through the core', async () => {
    const { host, core } = await loadHost(
      [
        {
          id: 'demo',
          server: GOOD_SERVER(
            'demo',
            `ctx.createCollector({ id: 'ping', label: 'Ping', intervalMs: 1000, run: async () => 1 });
             ctx.registerIntegration({ serviceId: 'wiki', type: 'demo', label: 'Demo', configured: true,
               collector: null, describe: () => ({ badges: [], metrics: [] }), alerts: () => [] });
             ctx.registerAlertRules(() => []);`,
          ),
        },
      ],
      [{ id: 'demo' }],
      { services: ['wiki'] },
    );
    expect(host.status()[0]?.loaded).toBe(true);
    expect(core.calls).toEqual(['collector:demo:ping', 'integration:demo:wiki', 'rules:demo']);
  });
});

describe('ExtensionHost failure isolation', () => {
  const failing: [string, Fixture | null, string][] = [
    ['a missing directory', null, 'not found'],
    ['invalid manifest JSON', { id: 'demo', manifest: 'not json' }, 'not valid JSON'],
    [
      'a manifest id that does not match the directory',
      { id: 'demo', manifest: { id: 'other', apiVersion: 1 } },
      'does not match',
    ],
    [
      'an unsupported manifest apiVersion',
      { id: 'demo', manifest: { id: 'demo', apiVersion: 99 } },
      'apiVersion',
    ],
    [
      'a server module declaring another id',
      { id: 'demo', server: GOOD_SERVER('imposter') },
      'declares id',
    ],
    [
      'a register() that throws',
      { id: 'demo', server: GOOD_SERVER('demo', `throw new Error('boom');`) },
      'boom',
    ],
    [
      'an integration on an unknown service',
      {
        id: 'demo',
        server: GOOD_SERVER(
          'demo',
          `ctx.registerIntegration({ serviceId: 'ghost', type: 't', label: 'T', configured: true,
             collector: null, describe: () => ({ badges: [], metrics: [] }), alerts: () => [] });`,
        ),
      },
      'unknown service',
    ],
    [
      'an extension that swallows a rejected registration',
      {
        id: 'demo',
        server: GOOD_SERVER(
          'demo',
          `try { ctx.registerIntegration({ serviceId: 'ghost', type: 't', label: 'T', configured: true,
             collector: null, describe: () => ({ badges: [], metrics: [] }), alerts: () => [] }); } catch {}`,
        ),
      },
      'unknown service',
    ],
    [
      'a client file that is declared but missing',
      {
        id: 'demo',
        manifest: { id: 'demo', apiVersion: 1, client: { script: 'client.js' } },
      },
      'client.js',
    ],
    [
      'a client script outside the public allow-list',
      {
        id: 'demo',
        manifest: { id: 'demo', apiVersion: 1, client: { script: 'server.mjs' } },
      },
      'client.js',
    ],
  ];

  it.each(failing)('%s: reported, skipped, others still load', async (_name, fx, reason) => {
    const { host, core } = await loadHost(
      [...(fx ? [fx] : []), { id: 'good' }],
      [{ id: 'demo' }, { id: 'good' }],
    );
    const status = Object.fromEntries(host.status().map((s) => [s.id, s]));
    expect(status.demo?.loaded).toBe(false);
    expect(status.demo?.error).toContain(reason);
    expect(core.failures.demo).toContain(reason);
    expect(status.good).toEqual({ id: 'good', loaded: true, error: null });
    expect(host.refs().map((r) => r.id)).not.toContain('demo');
    expect(host.assetRoot('demo')).toBeNull();
  });

  it('a failure message is a single line without a stack trace', async () => {
    const { host } = await loadHost(
      [{ id: 'demo', server: GOOD_SERVER('demo', `throw new Error('line one\\nline two');`) }],
      [{ id: 'demo' }],
    );
    const error = host.status()[0]?.error ?? '';
    expect(error).toBe('line one');
    expect(error).not.toMatch(/\bat\b.*\(/);
  });
});

describe('ExtensionHost client bundles', () => {
  const withClient: Fixture = {
    id: 'demo',
    manifest: {
      id: 'demo',
      apiVersion: 1,
      client: { script: 'client.js', style: 'client.css', activity: true },
    },
    clientFiles: ['client.js', 'client.css', 'assets/logo.svg'],
  };

  it('exposes script and style under /extensions/<id>/ and flags Activity sections', async () => {
    const { host } = await loadHost([withClient], [{ id: 'demo' }]);
    expect(host.refs()).toEqual([
      { id: 'demo', script: '/extensions/demo/client.js', style: '/extensions/demo/client.css' },
    ]);
    expect(host.hasActivity()).toBe(true);
    expect(host.assetRoot('demo')).toMatch(/demo$/);
  });

  it('an extension without a client has no ref and no Activity', async () => {
    const { host } = await loadHost([{ id: 'demo' }], [{ id: 'demo' }]);
    expect(host.refs()).toEqual([]);
    expect(host.hasActivity()).toBe(false);
  });
});

describe('servableAssetPath', () => {
  it.each(['client.js', 'client.css', 'assets/logo.svg', 'assets/img/a.png'])(
    'serves %s',
    (file) => {
      expect(servableAssetPath(file)).toBe(file);
    },
  );

  it.each([
    'server.mjs',
    'manifest.json',
    '.env',
    'assets/../server.mjs',
    '../other/client.js',
    '/etc/passwd',
    'assets/..%2Fserver.mjs',
    '',
  ])('refuses %s', (file) => {
    expect(servableAssetPath(file)).toBeNull();
  });
});

describe('ExtensionHost routes', () => {
  async function appWith(host: ExtensionHost) {
    const app = Fastify();
    host.mountRoutes(app, helpers, () => ({ error: 'not found' }));
    await app.ready();
    return app;
  }

  const routeServer = (id: string, handler = `async () => ({ ok: true, from: '${id}' })`) =>
    GOOD_SERVER(id, `ctx.registerRoutes((app) => { app.get('/ping', ${handler}); });`);

  it('mounts routes only under /api/x/<id>/', async () => {
    const { host } = await loadHost(
      [{ id: 'demo', server: routeServer('demo') }],
      [{ id: 'demo' }],
    );
    const app = await appWith(host);
    const ok = await app.inject({ url: '/api/x/demo/ping' });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ ok: true, from: 'demo' });
    expect((await app.inject({ url: '/ping' })).statusCode).toBe(404);
    expect((await app.inject({ url: '/api/x/other/ping' })).statusCode).toBe(404);
  });

  it('two extensions cannot collide', async () => {
    const { host } = await loadHost(
      [
        { id: 'one', server: routeServer('one') },
        { id: 'two', server: routeServer('two') },
      ],
      [{ id: 'one' }, { id: 'two' }],
    );
    const app = await appWith(host);
    expect((await app.inject({ url: '/api/x/one/ping' })).json().from).toBe('one');
    expect((await app.inject({ url: '/api/x/two/ping' })).json().from).toBe('two');
  });

  it('an extension whose route registration throws is failed and its routes answer 404', async () => {
    const server = GOOD_SERVER(
      'demo',
      `ctx.registerRoutes((app) => {
         app.get('/early', async () => ({ ok: true }));
         throw new Error('route setup failed');
       });`,
    );
    const { host, core } = await loadHost([{ id: 'demo', server }], [{ id: 'demo' }]);
    const app = await appWith(host);
    expect((await app.inject({ url: '/api/x/demo/early' })).statusCode).toBe(404);
    expect(core.failures.demo).toContain('route setup failed');
    expect(host.status()[0]).toMatchObject({ id: 'demo', loaded: false });
  });

  it('cannot register after register() has returned', async () => {
    const server = `
let saved;
export default {
  id: 'demo',
  apiVersion: 1,
  register(ctx) { saved = ctx; },
  late() { saved.registerRoutes(() => undefined); },
};
`;
    const { host } = await loadHost([{ id: 'demo', server }], [{ id: 'demo' }]);
    expect(host.status()[0]?.loaded).toBe(true);
  });
});

describe('extension context secrets', () => {
  it('resolves env and file references and rejects anything else', async () => {
    const root = tempDir();
    const secretFile = writeFile(root, 'bearer', 'file-secret\n');
    install(root, {
      id: 'demo',
      server: GOOD_SERVER(
        'demo',
        `const fromEnv = await ctx.secret(ctx.config.fromEnv);
         const fromFile = await ctx.secret(ctx.config.fromFile);
         const none = await ctx.secret(undefined);
         let rejected = false;
         try { await ctx.secret('literal-secret'); } catch { rejected = true; }
         if (fromEnv !== 'env-secret' || fromFile !== 'file-secret' || none !== undefined || !rejected) {
           throw new Error('secret resolution mismatch');
         }`,
      ),
    });
    const core = createFakeCore();
    const host = await ExtensionHost.load({
      extensionsDir: root,
      entries: [
        {
          id: 'demo',
          enabled: true,
          config: { fromEnv: { env: 'DEMO_SECRET' }, fromFile: { file: secretFile } },
        },
      ],
      core,
      secrets: createSecretResolver({ CONFIG_DIR: root }, { DEMO_SECRET: 'env-secret' }),
      language: 'en',
      log: silentLog,
    });
    expect(host.status()).toEqual([{ id: 'demo', loaded: true, error: null }]);
  });
});
