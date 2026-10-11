import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig, loadEnv } from '../config/loader.js';
import { configSchema, servicesFileSchema } from '../config/schema.js';
import { createSecretResolver } from '../config/secrets.js';
import { tempDir, writeFile } from './support/core.js';

const quiet = { info: () => undefined };

function dirWith(files: Record<string, string>): string {
  const dir = tempDir();
  for (const [name, content] of Object.entries(files)) writeFile(dir, name, content);
  return dir;
}

async function problemsOf(files: Record<string, string>): Promise<string[]> {
  try {
    await loadConfig({ CONFIG_DIR: dirWith(files) }, quiet);
  } catch (err) {
    expect(err).toBeInstanceOf(ConfigError);
    return (err as ConfigError).problems;
  }
  throw new Error('expected a ConfigError');
}

describe('loadConfig', () => {
  it('starts from defaults when nothing is configured (limited access, no sources, no services)', async () => {
    const { config, services } = await loadConfig({ CONFIG_DIR: dirWith({}) }, quiet);
    expect(config.access).toEqual({ mode: 'limited' });
    expect(config.sources.system).toBeUndefined();
    expect(config.sources.storage).toBeUndefined();
    expect(config.sources.usage).toEqual([]);
    expect(config.push.enabled).toBe(false);
    expect(config.extensions).toEqual([]);
    expect(services.services).toEqual([]);
  });

  it('says so in the log when config.yaml is missing', async () => {
    const lines: string[] = [];
    await loadConfig({ CONFIG_DIR: dirWith({}) }, { info: (m) => lines.push(m) });
    expect(lines.join('\n')).toMatch(/no config\.yaml/);
  });

  it('accepts a minimal catalog: id, name and url are enough', async () => {
    const { services } = await loadConfig(
      {
        CONFIG_DIR: dirWith({
          'services.yaml':
            'services:\n  - id: wiki\n    name: Wiki\n    url: https://wiki.example.com\n',
        }),
      },
      quiet,
    );
    expect(services.services[0]).toMatchObject({
      id: 'wiki',
      core: false,
      icon: 'generic',
      containers: [],
    });
  });

  it('reports every problem of both files at once, with the path of the field', async () => {
    const problems = await problemsOf({
      'config.yaml': 'app:\n  language: fr\nserver:\n  port: 99999\n',
      'services.yaml': 'services:\n  - id: Bad Id\n    name: X\n',
    });
    expect(problems.some((p) => p.startsWith('config.yaml: app.language'))).toBe(true);
    expect(problems.some((p) => p.startsWith('config.yaml: server.port'))).toBe(true);
    expect(problems.some((p) => p.startsWith('services.yaml: services[0].id'))).toBe(true);
  });

  it('rejects unknown keys so a typo cannot silently disable something', async () => {
    const problems = await problemsOf({
      'config.yaml': 'sources:\n  sistem:\n    type: glances\n',
    });
    expect(problems.join('\n')).toMatch(/sistem/);
  });

  it('reports YAML syntax errors with the line and without quoting the source text', async () => {
    const problems = await problemsOf({
      'config.yaml': 'app:\n  name: "unterminated-secret-value\n  language: en\n',
    });
    expect(problems[0]).toMatch(/^config\.yaml: line \d+:/);
    expect(problems.join('\n')).not.toContain('unterminated-secret-value');
  });

  it('never echoes the value of a rejected field', async () => {
    const problems = await problemsOf({
      'config.yaml': 'access:\n  mode: trusted-network\n  token: s3cr3t-value-123\n',
    });
    expect(problems.join('\n')).not.toContain('s3cr3t-value-123');
  });

  it('rejects favorites that are not in the catalog', async () => {
    const problems = await problemsOf({
      'config.yaml': 'app:\n  defaultFavorites: [ghost]\n',
      'services.yaml': 'services:\n  - id: wiki\n    name: Wiki\n',
    });
    expect(problems).toEqual(['config.yaml: app.defaultFavorites[0]: unknown service "ghost"']);
  });
});

describe('loadEnv', () => {
  it('defaults to the container paths', () => {
    expect(loadEnv({})).toMatchObject({
      CONFIG_DIR: '/config',
      DATA_DIR: '/data',
      WEB_DIR: '/app/web',
      EXTENSIONS_DIR: '/extensions',
    });
  });

  it('rejects an invalid log level', () => {
    expect(() => loadEnv({ LOG_LEVEL: 'loud' })).toThrow(ConfigError);
  });
});

describe('configSchema', () => {
  describe('product names', () => {
    const appOf = (input: unknown) => configSchema.parse(input).app;

    it('defaults to Orbis Homelab with the short name Orbis', () => {
      expect(appOf({})).toMatchObject({
        id: 'orbis-homelab',
        name: 'Orbis Homelab',
        shortName: 'Orbis',
      });
    });

    it('keeps the short name Orbis when only other app settings are given', () => {
      expect(appOf({ app: { language: 'it' } })).toMatchObject({
        name: 'Orbis Homelab',
        shortName: 'Orbis',
      });
    });

    it('does not impose the product short name on an instance with its own name', () => {
      const app = appOf({ app: { id: 'my-homelab', name: 'My Homelab' } });
      expect(app).toMatchObject({ id: 'my-homelab', name: 'My Homelab' });
      expect(app.shortName).toBeUndefined();
    });

    it('takes an explicit short name, with or without a custom name', () => {
      expect(appOf({ app: { shortName: 'Home' } }).shortName).toBe('Home');
      expect(appOf({ app: { name: 'My Homelab', shortName: 'Home' } }).shortName).toBe('Home');
    });
  });

  const parse = (input: unknown) => configSchema.safeParse(input);
  const messages = (input: unknown): string =>
    parse(input)
      .error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n') ?? '';

  it('identity-proxy needs trusted proxies, allowed users and a header or preset', () => {
    const ok = {
      access: {
        mode: 'identity-proxy',
        identityProxy: {
          preset: 'tailscale',
          trustedProxies: ['10.0.0.0/8'],
          allowedUsers: ['me@example.com'],
        },
      },
    };
    expect(parse(ok).success).toBe(true);
    expect(parse({ access: { mode: 'identity-proxy' } }).success).toBe(false);
    expect(
      messages({
        access: {
          mode: 'identity-proxy',
          identityProxy: { trustedProxies: ['10.0.0.1'], allowedUsers: ['me'] },
        },
      }),
    ).toMatch(/userHeader/);
  });

  it.each(['10.0.0.1', '10.0.0.0/8', '::1', 'fd00::/8'])('accepts the proxy address %s', (addr) => {
    const result = parse({
      access: {
        mode: 'identity-proxy',
        identityProxy: { preset: 'tailscale', trustedProxies: [addr], allowedUsers: ['u'] },
      },
    });
    expect(result.success).toBe(true);
  });

  it.each(['proxy.example.com', '10.0.0.0/33', '10.0.0.0/8/8', '300.1.1.1'])(
    'rejects the proxy address %s',
    (addr) => {
      const result = parse({
        access: {
          mode: 'identity-proxy',
          identityProxy: { preset: 'tailscale', trustedProxies: [addr], allowedUsers: ['u'] },
        },
      });
      expect(result.success).toBe(false);
    },
  );

  it('pools and explicit volumes need the system provider', () => {
    const pool = { id: 'p', label: 'P', mount: '/pool', members: [] };
    expect(parse({ sources: { storage: { pools: [pool] } } }).success).toBe(false);
    expect(
      parse({
        sources: {
          system: { type: 'glances', url: 'http://glances:61208' },
          storage: { pools: [pool] },
        },
      }).success,
    ).toBe(true);
  });

  it('a SMART report is allowed without a system provider', () => {
    const smart = { type: 'report-json', file: '/data/smart.json' };
    expect(parse({ sources: { storage: { smart } } }).success).toBe(true);
  });

  it('a SMART or usage source needs exactly one of url and file', () => {
    expect(parse({ sources: { storage: { smart: { type: 'report-json' } } } }).success).toBe(false);
    expect(
      parse({
        sources: {
          storage: { smart: { type: 'report-json', url: 'http://a.example.com/x', file: '/x' } },
        },
      }).success,
    ).toBe(false);
  });

  it('push needs a subject when enabled', () => {
    expect(parse({ push: { enabled: true } }).success).toBe(false);
    expect(parse({ push: { enabled: true, subject: 'mailto:me@example.com' } }).success).toBe(true);
    expect(parse({ push: { enabled: false } }).success).toBe(true);
  });

  it('cannot force a feature on without its source', () => {
    expect(parse({ features: { system: true } }).success).toBe(false);
  });

  it('rejects duplicate extension and link ids', () => {
    expect(parse({ extensions: [{ id: 'a' }, { id: 'a' }] }).success).toBe(false);
    const link = { id: 'l', title: 'L', url: 'https://x.example.com' };
    expect(parse({ links: [link, link] }).success).toBe(false);
  });

  it('keeps secrets out of the file: a secret is a reference to an env var or a file', () => {
    const parsed = servicesFileSchema.safeParse({
      services: [
        {
          id: 'movies',
          name: 'Movies',
          integration: {
            type: 'radarr',
            url: 'http://radarr:7878',
            secret: { env: 'RADARR_API_KEY' },
          },
        },
      ],
    });
    expect(parsed.success).toBe(true);
    const literal = servicesFileSchema.safeParse({
      services: [
        {
          id: 'movies',
          name: 'Movies',
          integration: { type: 'radarr', url: 'http://radarr:7878', secret: 'abc123' },
        },
      ],
    });
    expect(literal.success).toBe(false);
  });
});

describe('servicesFileSchema', () => {
  const parse = (services: unknown[]) => servicesFileSchema.safeParse({ services });

  it('turns every probe form into one object', () => {
    const result = parse([
      { id: 'a', name: 'A', url: 'https://a.example.com', probe: true },
      { id: 'b', name: 'B', probe: 'http://b.internal/health' },
      { id: 'c', name: 'C', probe: { url: 'http://c.internal/', okStatus: [200, 401] } },
    ]);
    const probes = result.data?.services.map((s) => s.probe);
    expect(probes).toEqual([
      { url: 'https://a.example.com' },
      { url: 'http://b.internal/health' },
      { url: 'http://c.internal/', okStatus: [200, 401] },
    ]);
  });

  it('probe: true needs a concrete url (no {host} placeholder)', () => {
    expect(parse([{ id: 'a', name: 'A', probe: true }]).success).toBe(false);
    expect(parse([{ id: 'a', name: 'A', url: 'http://{host}:80', probe: true }]).success).toBe(
      false,
    );
  });

  it('rejects duplicate ids and a container owned by two services', () => {
    expect(
      parse([
        { id: 'a', name: 'A' },
        { id: 'a', name: 'B' },
      ]).success,
    ).toBe(false);
    expect(
      parse([
        { id: 'a', name: 'A', containers: ['c1'] },
        { id: 'b', name: 'B', containers: ['c1'] },
      ]).success,
    ).toBe(false);
  });

  it('categories are free-form slugs, not a fixed list', () => {
    expect(parse([{ id: 'a', name: 'A', category: 'my-custom-group' }]).success).toBe(true);
  });
});

describe('createSecretResolver', () => {
  const env = { CONFIG_DIR: '/config' };

  it('reads an env var, trims it, and treats empty or unset as not configured', async () => {
    const resolve = createSecretResolver(env, { A: '  value\n', B: '' });
    expect(await resolve({ env: 'A' })).toBe('value');
    expect(await resolve({ env: 'B' })).toBeUndefined();
    expect(await resolve({ env: 'C' })).toBeUndefined();
  });

  it('falls back to the default variable name when there is no reference', async () => {
    const resolve = createSecretResolver(env, { RADARR_API_KEY: 'k' });
    expect(await resolve(undefined, 'RADARR_API_KEY')).toBe('k');
    expect(await resolve(undefined, 'SONARR_API_KEY')).toBeUndefined();
    expect(await resolve(undefined)).toBeUndefined();
  });

  it('reads a secret file, trims the trailing newline, and re-reads it on every call', async () => {
    const dir = tempDir();
    const file = writeFile(dir, 'secret', 'first\n');
    const resolve = createSecretResolver({ CONFIG_DIR: dir }, {});
    expect(await resolve({ file })).toBe('first');
    writeFile(dir, 'secret', 'second\n');
    expect(await resolve({ file })).toBe('second');
  });

  it('resolves a relative file path against the config directory', async () => {
    const dir = tempDir();
    writeFile(dir, 'token.txt', 'relative\n');
    const resolve = createSecretResolver({ CONFIG_DIR: dir }, {});
    expect(await resolve({ file: 'token.txt' })).toBe('relative');
  });

  it('a missing file means not configured, not an error', async () => {
    const resolve = createSecretResolver({ CONFIG_DIR: tempDir() }, {});
    expect(await resolve({ file: '/nonexistent/secret' })).toBeUndefined();
  });

  it('an unreadable path throws without any secret content in the message', async () => {
    const dir = tempDir();
    const resolve = createSecretResolver({ CONFIG_DIR: dir }, {});
    // A directory cannot be read as a file: EISDIR, not "missing".
    await expect(resolve({ file: dir })).rejects.toThrow(/cannot read secret file/);
  });
});
