import type { IncomingMessage } from 'node:http';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { createAccessPolicy, resolveAccess } from '../access.js';
import { ConfigError, loadConfig, type LoadedConfig } from '../config/loader.js';
import { createSecretResolver } from '../config/secrets.js';
import { servicesFileSchema } from '../config/schema.js';
import { ControlCenter } from '../control-center.js';
import { silentLog, tempDir } from './support/core.js';

const readRoot = (name: string): string =>
  readFileSync(fileURLToPath(new URL(`../../../${name}`, import.meta.url)), 'utf8');

const EXAMPLE = readRoot('config.example.yaml');
const SERVICES = readRoot('services.example.yaml');

/**
 * The optional blocks of config.example.yaml. A header line
 *   `# ---- Optional: <title> [(requires: A, B)] [(replaces: <active line>)] ----`
 * is followed by commented-out YAML up to the next blank line.
 */
const HEADER =
  /^\s*# -{4} Optional: (.+?)(?: \(requires: ([^)]+)\))?(?: \(replaces: ([^)]+)\))? -{4}$/;

interface Block {
  title: string;
  requires: string[];
  replaces: string | null;
  /** Body lines, inclusive indexes into the file's lines. */
  first: number;
  last: number;
}

const FILE_LINES = EXAMPLE.split('\n');

function findBlocks(lines: readonly string[]): Block[] {
  const blocks: Block[] = [];
  lines.forEach((line, index) => {
    const match = HEADER.exec(line);
    if (!match) return;
    let last = index;
    while (/^\s*#/.test(lines[last + 1] ?? '') && !HEADER.test(lines[last + 1] ?? '')) last += 1;
    blocks.push({
      title: match[1] ?? '',
      requires: (match[2] ?? '').split(', ').filter(Boolean),
      replaces: match[3] ?? null,
      first: index + 1,
      last,
    });
  });
  return blocks;
}

const BLOCKS = findBlocks(FILE_LINES);
const TITLES = BLOCKS.map((b) => b.title);
const block = (title: string): Block => {
  const found = BLOCKS.find((b) => b.title === title);
  if (!found) throw new Error(`no block "${title}"`);
  return found;
};

/** The block and, recursively, everything it requires. */
function withRequirements(titles: readonly string[]): string[] {
  const wanted = new Set<string>();
  const visit = (title: string): void => {
    if (wanted.has(title)) return;
    wanted.add(title);
    block(title).requires.forEach(visit);
  };
  titles.forEach(visit);
  return [...wanted];
}

/**
 * The file as a user leaves it after following the instructions in its header: remove the `# `
 * that follows the indentation from each line of the chosen blocks, and for an alternative put
 * `# ` in front of the active line it replaces. Nothing else is touched.
 */
function userEdit(titles: readonly string[]): string {
  const lines = [...FILE_LINES];
  const inBlock = new Set<number>();
  for (const b of BLOCKS) for (let i = b.first - 1; i <= b.last; i += 1) inBlock.add(i);
  const chosen = BLOCKS.filter((b) => titles.includes(b.title));
  for (const b of chosen) {
    if (!b.replaces) continue;
    const at = lines.findIndex((line, i) => !inBlock.has(i) && line.trim() === b.replaces);
    if (at < 0) throw new Error(`block "${b.title}" replaces a line that is not active`);
    lines[at] = (lines[at] ?? '').replace(/^(\s*)/, '$1# ');
  }
  for (const b of chosen) {
    for (let i = b.first; i <= b.last; i += 1) {
      lines[i] = (lines[i] ?? '').replace(/^(\s*)# ?/, '$1');
    }
  }
  return lines.join('\n');
}

/** Loads a config text exactly like the container does at startup (YAML, schema, cross-checks). */
async function load(configText: string, servicesText = SERVICES): Promise<LoadedConfig> {
  const dir = tempDir();
  writeFileSync(path.join(dir, 'config.yaml'), configText);
  writeFileSync(path.join(dir, 'services.yaml'), servicesText);
  return loadConfig({ CONFIG_DIR: dir }, { info: () => undefined });
}

const enabled = (titles: readonly string[]): Promise<LoadedConfig> =>
  load(userEdit(withRequirements(titles)));

const SOURCE_BLOCKS = [
  'Data sources',
  'System provider',
  'Storage page',
  'Storage pools',
  'SMART disk health',
  'Weekly AI usage',
] as const;

const ACCESS_ALTERNATIVES = [
  'Trusted network',
  'Identity from a reverse proxy',
  'Identity from Tailscale Serve',
] as const;

describe('config.example.yaml as shipped (the recommended install)', () => {
  it('is safe by default: access.mode is limited and no source, push or extension is on', async () => {
    const { config } = await load(EXAMPLE);
    expect(config.access).toEqual({ mode: 'limited' });
    expect(config.sources.system).toBeUndefined();
    expect(config.sources.storage).toBeUndefined();
    expect(config.sources.usage).toEqual([]);
    expect(config.push.enabled).toBe(false);
    expect(config.extensions).toEqual([]);
  });

  it('installs as Orbis Homelab, short name Orbis, with its own storage namespace', async () => {
    const { config } = await load(EXAMPLE);
    expect(config.app).toMatchObject({
      id: 'orbis-homelab',
      name: 'Orbis Homelab',
      shortName: 'Orbis',
    });
  });

  it('gives nobody full access, whatever the address or the identity headers claim', async () => {
    const { config } = await load(EXAMPLE);
    const policy = createAccessPolicy(config.access);
    const request = (remoteAddress: string, localPort: number, headers: Record<string, string>) =>
      ({ socket: { remoteAddress, localPort }, headers }) as unknown as IncomingMessage;
    for (const [address, port] of [
      ['127.0.0.1', 3100],
      ['::1', 3100],
      ['192.168.1.50', 3100],
      ['172.18.0.1', 3101],
    ] as const) {
      const forged = request(address, port, {
        'remote-user': 'alice',
        'tailscale-user-login': 'alice@example.com',
        'x-forwarded-for': '127.0.0.1',
      });
      expect(resolveAccess(forged, policy)).toEqual({ level: 'limited', user: null });
    }
  });

  it('reaches the running core as a limited, quiet instance', async () => {
    const { config, services } = await load(EXAMPLE);
    const center = await ControlCenter.create({
      env: { DATA_DIR: tempDir() },
      config,
      services,
      secrets: createSecretResolver({ CONFIG_DIR: '/config' }, {}),
      log: silentLog,
      onNotification: () => undefined,
    });
    expect(center.features()).toMatchObject({
      system: false,
      storage: false,
      smart: false,
      push: false,
    });
  });
});

describe('the optional blocks follow their own instructions', () => {
  it('has uniquely named blocks with non-empty bodies', () => {
    expect(new Set(TITLES).size).toBe(TITLES.length);
    expect(TITLES.length).toBeGreaterThanOrEqual(15);
    for (const b of BLOCKS) expect(b.last).toBeGreaterThanOrEqual(b.first);
  });

  it('only requires blocks that exist and only replaces lines that are active', () => {
    for (const b of BLOCKS) {
      for (const needed of b.requires) expect(TITLES).toContain(needed);
      if (b.replaces) expect(() => userEdit([b.title])).not.toThrow();
    }
  });

  it('documents every capability of the product', () => {
    expect(TITLES).toEqual(
      expect.arrayContaining([
        ...SOURCE_BLOCKS,
        ...ACCESS_ALTERNATIVES,
        'Public HTTPS address',
        'Look, ordering and favorites',
        'Web Push notifications',
        'Quick links in Settings',
        'Extensions',
      ]),
    );
  });

  it.each(TITLES)('block "%s" loads when enabled with what it requires', async (title) => {
    await expect(enabled([title])).resolves.toBeDefined();
  });

  it('the harness really sees a key written twice (what the previous example did)', async () => {
    const twice = `${EXAMPLE}\napp:\n  id: other\n`;
    await expect(load(twice)).rejects.toBeInstanceOf(ConfigError);
    await expect(load(twice)).rejects.toThrow(/unique/);
  });

  it('forgetting to comment out the replaced `mode: limited` line is reported, not ignored', async () => {
    const lines = [...FILE_LINES];
    const trusted = block('Trusted network');
    for (let i = trusted.first; i <= trusted.last; i += 1) {
      lines[i] = (lines[i] ?? '').replace(/^(\s*)# ?/, '$1');
    }
    await expect(load(lines.join('\n'))).rejects.toThrow(/unique/);
  });

  it('each access alternative switches the mode it names, and trusted-network is opt-in', async () => {
    expect((await enabled(['Trusted network'])).config.access.mode).toBe('trusted-network');
    const proxy = (await enabled(['Identity from a reverse proxy'])).config.access;
    expect(proxy).toMatchObject({
      mode: 'identity-proxy',
      identityProxy: { userHeader: 'Remote-User' },
    });
    const tailscale = (await enabled(['Identity from Tailscale Serve'])).config.access;
    expect(tailscale).toMatchObject({
      mode: 'identity-proxy',
      identityProxy: { preset: 'tailscale', trustedPort: 3101 },
    });
  });

  it('every block switches on what it documents', async () => {
    const look = (await enabled(['Look, ordering and favorites'])).config.app;
    expect(look.categories.map((c) => c.id)).toEqual(['media', 'infrastructure']);
    expect(look).toMatchObject({ shortName: 'Lab', theme: 'system', accent: '#2f6fed' });
    expect(look.defaultFavorites).toEqual(['media-server']);
    expect((await enabled(['Public HTTPS address'])).config.publicUrl).toBe(
      'https://orbis.example.com',
    );
    expect((await enabled(['Listening port'])).config.server.port).toBe(3100);
    expect((await enabled(['Web Push notifications'])).config.push.enabled).toBe(true);
    expect((await enabled(['Quick links in Settings'])).config.links).toHaveLength(2);
    expect((await enabled(['Extensions'])).config.extensions).toHaveLength(1);
    expect((await enabled(['Alert tuning'])).config.alerts.thresholds.fsWarn).toBe(80);
    expect((await enabled(['Turn automatic pages off'])).config.features).toMatchObject({
      system: false,
      activity: true,
    });
  });
});

describe('several data sources at once', () => {
  it('System + Storage + pools + SMART + Usage together load and switch every page on', async () => {
    const { config, services } = await enabled([...SOURCE_BLOCKS]);
    expect(config.sources.system?.type).toBe('glances');
    expect(config.sources.storage?.volumes.include).toBe('auto');
    expect(config.sources.storage?.pools).toHaveLength(1);
    expect(config.sources.storage?.smart?.type).toBe('report-json');
    expect(config.sources.usage).toHaveLength(1);

    const center = await ControlCenter.create({
      env: { DATA_DIR: tempDir() },
      config,
      services,
      secrets: createSecretResolver({ CONFIG_DIR: '/config' }, {}),
      log: silentLog,
      onNotification: () => undefined,
    });
    expect(center.features()).toEqual({
      system: true,
      containers: true,
      storage: true,
      smart: true,
      activity: true,
      push: false,
    });
  });

  it('every combination of the source blocks that respects `requires` loads', async () => {
    const valid: string[][] = [];
    for (let mask = 1; mask < 1 << SOURCE_BLOCKS.length; mask += 1) {
      const picked = SOURCE_BLOCKS.filter((_, bit) => mask & (1 << bit));
      const closed = withRequirements(picked).length === picked.length;
      if (closed) valid.push([...picked]);
    }
    expect(valid.length).toBeGreaterThan(10);
    for (const titles of valid) {
      await expect(load(userEdit(titles)), titles.join(' + ')).resolves.toBeDefined();
    }
  });

  it('SMART health works on its own, without the System provider', async () => {
    const { config } = await enabled(['SMART disk health']);
    expect(config.sources.system).toBeUndefined();
    expect(config.sources.storage?.smart?.type).toBe('report-json');
  });

  it('pools need the System provider and say so when it is missing', async () => {
    const withoutProvider = userEdit(['Data sources', 'Storage page', 'Storage pools']);
    await expect(load(withoutProvider)).rejects.toThrow(/sources\.system/);
  });
});

describe('every block at once', () => {
  const independent = TITLES.filter((t) => !(ACCESS_ALTERNATIVES as readonly string[]).includes(t));

  it.each(ACCESS_ALTERNATIVES)('with the access alternative "%s"', async (alternative) => {
    const { config } = await enabled([...independent, alternative]);
    expect(config.sources.usage).toHaveLength(1);
    expect(config.extensions).toHaveLength(1);
    expect(config.push.enabled).toBe(true);
    expect(config.access.mode).not.toBe('limited');
  });
});

describe('services.example.yaml', () => {
  const parsed = servicesFileSchema.safeParse(parse(SERVICES));

  it('is a valid catalog', () => {
    expect(parsed.error?.issues).toBeUndefined();
  });

  it('shows the three probe forms, containers and both secret styles', () => {
    const services = parsed.data?.services ?? [];
    expect(services.some((s) => s.probe && Object.keys(s.probe).length === 1)).toBe(true);
    expect(services.some((s) => s.probe?.okStatus || s.probe?.headers)).toBe(true);
    expect(services.some((s) => s.containers.length > 0)).toBe(true);
    expect(services.some((s) => s.integration && !s.integration.secret)).toBe(true);
    expect(services.some((s) => s.integration?.secret)).toBe(true);
    expect(services.some((s) => !s.probe && s.containers.length === 0)).toBe(true);
  });

  it('only uses categories declared by the example look block', async () => {
    const declared = new Set(
      (await enabled(['Look, ordering and favorites'])).config.app.categories.map((c) => c.id),
    );
    const used = (parsed.data?.services ?? []).flatMap((s) => (s.category ? [s.category] : []));
    expect(used.length).toBeGreaterThan(0);
    for (const category of used) expect(declared).toContain(category);
  });
});

describe('.env.example', () => {
  const declared = new Set(
    [...readRoot('.env.example').matchAll(/^#?\s*([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]),
  );

  it('lists the variable behind every integration secret of the example catalog', () => {
    for (const svc of servicesFileSchema.parse(parse(SERVICES)).services) {
      const secret = svc.integration?.secret;
      if (secret && 'env' in secret) expect(declared).toContain(secret.env);
      if (svc.integration && !secret) {
        const name =
          svc.integration.type === 'vikunja'
            ? 'VIKUNJA_API_TOKEN'
            : `${svc.integration.type.toUpperCase()}_API_KEY`;
        expect(declared).toContain(name);
      }
    }
  });

  it('documents every variable that compose.yaml reads', () => {
    const used = [...readRoot('compose.yaml').matchAll(/\$\{([A-Z][A-Z0-9_]*)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) expect(declared).toContain(name);
  });

  it('contains no value for any secret', () => {
    for (const line of readRoot('.env.example').split('\n')) {
      if (/^[A-Z][A-Z0-9_]*(KEY|TOKEN|SECRET|PASSWORD)=/.test(line)) {
        expect(line).toMatch(/=$/);
      }
    }
  });
});

describe('compose.yaml', () => {
  const compose = parse(readRoot('compose.yaml')) as {
    name?: string;
    services: Record<string, { image: string; container_name?: string; ports: string[] }>;
  };
  const service = compose.services.orbis;

  it('fixes neither a project name nor a container name, so two folders can coexist', () => {
    expect(compose.name).toBeUndefined();
    expect(service?.container_name).toBeUndefined();
  });

  it('lets each installation choose its host port and has no default image version', () => {
    expect(service?.ports).toEqual(['${ORBIS_PORT:-3100}:3100']);
    // `:?` makes Compose stop when ORBIS_VERSION is unset instead of pulling `latest`.
    expect(service?.image).toMatch(/:\$\{ORBIS_VERSION:\?[^}]+\}$/);
  });
});

describe('Quick Start documents', () => {
  const docs = ['README.md', 'docs/install.md', 'docs/update.md'].map((f) => [f, readRoot(f)]);

  it.each(docs)('%s fetches files from the tag of the release, never from main', (_name, text) => {
    expect(text).toContain('/al31si/orbis-homelab/v$VERSION');
    expect(text).not.toMatch(/al31si\/orbis-homelab\/main/);
  });

  it.each(docs.slice(0, 2))('%s pins the image to the same version', (_name, text) => {
    expect(text).toContain('ORBIS_VERSION=$VERSION');
  });
});

describe('release consistency', () => {
  const version = /export const VERSION = '([^']+)'/.exec(readRoot('server/src/version.ts'))?.[1];
  const manifest = (file: string) => JSON.parse(readRoot(file)) as { version: string };

  it('has one version in the code, the workspaces and the lockfile', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/);
    for (const file of [
      'package.json',
      'server/package.json',
      'web/package.json',
      'sdk/package.json',
    ]) {
      expect(manifest(file).version, file).toBe(version);
    }
    expect(manifest('package-lock.json').version).toBe(version);
  });

  it('installs that very version in every Quick Start and has release notes for it', () => {
    for (const file of ['README.md', 'docs/install.md', 'compose.yaml']) {
      expect(readRoot(file), file).toMatch(new RegExp(`^[# ]*VERSION=${version}( |$)`, 'm'));
    }
    expect(readRoot(`docs/release-notes/${version}.md`).length).toBeGreaterThan(200);
  });

  it('points every install instruction at the public name, not at a placeholder', () => {
    for (const file of [
      'README.md',
      'docs/install.md',
      'docs/update.md',
      'docs/releasing.md',
      'compose.yaml',
      'Dockerfile',
    ]) {
      expect(readRoot(file), file).not.toMatch(/\bOWNER\b|<owner>/);
    }
    expect(readRoot('compose.yaml')).toContain('ghcr.io/al31si/orbis-homelab:');
  });
});

describe('documentation links', () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const markdown = (dir: string): string[] =>
    readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return ['node_modules', '.git', 'dist'].includes(entry.name) ? [] : markdown(rel);
      }
      return entry.name.endsWith('.md') ? [rel] : [];
    });
  const files = markdown('.').filter((f) => f !== 'THIRD_PARTY_NOTICES.md');
  const slug = (heading: string): string =>
    heading
      .toLowerCase()
      .replace(/`/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s/g, '-');
  const anchorsOf = (file: string): Set<string> =>
    new Set(
      readFileSync(path.join(root, file), 'utf8')
        .split('\n')
        .filter((line) => /^#{1,6}\s/.test(line))
        .map((line) => slug(line.replace(/^#+\s+/, ''))),
    );

  it.each(files)('%s: every relative link points at an existing file and heading', (file) => {
    const text = readFileSync(path.join(root, file), 'utf8').replace(/```[\s\S]*?```/g, '');
    const broken: string[] = [];
    for (const [, target = ''] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const [rawPath = '', anchor] = target.split('#');
      const resolved = rawPath === '' ? file : path.join(path.dirname(file), rawPath);
      if (!existsSync(path.join(root, resolved))) {
        broken.push(target);
      } else if (anchor && resolved.endsWith('.md') && !anchorsOf(resolved).has(anchor)) {
        broken.push(target);
      }
    }
    expect(broken).toEqual([]);
  });
});
