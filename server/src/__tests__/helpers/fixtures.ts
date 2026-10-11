import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';
import { type Env, type Config, configSchema } from '../../config/schema.js';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

export function tempDir(prefix = 'orbis-test-'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

/** Writes `files` (relative path -> content) under `root`. */
export function writeFiles(root: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
}

/** Template with every token the server fills, the way the web bundle ships it. */
export const INDEX_TEMPLATE = `<!doctype html>
<html lang="%%LANG%%">
  <head>
    <title>%%TITLE%%</title>
    <meta name="description" content="%%DESCRIPTION%%" />
    <meta name="apple-mobile-web-app-title" content="%%APP_SHORT_NAME%%" />
    <meta name="orbis-boot" content="%%BOOT_JSON%%" />
    %%ICON_LINKS%%
  </head>
  <body><div id="root"></div></body>
</html>
`;

export const SW_TEMPLATE = `// service worker
const INSTANCE = /*__SW_INSTANCE__*/ { cachePrefix: 'orbis-homelab-', offlineText: 'Offline', notificationTitle: 'Orbis Homelab' };
const CACHE = INSTANCE.cachePrefix + 'v1';
`;

export interface Instance {
  webDir: string;
  configDir: string;
  extensionsDir: string;
  dataDir: string;
  env: Env;
}

/** A built web bundle, empty config/extensions/data folders. */
export function createInstance(): Instance {
  const root = tempDir();
  const webDir = path.join(root, 'web');
  const configDir = path.join(root, 'config');
  const extensionsDir = path.join(root, 'extensions');
  const dataDir = path.join(root, 'data');
  for (const dir of [configDir, extensionsDir, dataDir]) fs.mkdirSync(dir);
  writeFiles(webDir, {
    'index.html': INDEX_TEMPLATE,
    'sw.js': SW_TEMPLATE,
    'theme-init.js': 'window.__theme = 1;',
    'assets/app-abc123.js': 'console.log("app");',
    'icons/icon-192.png': 'builtin-icon-192',
    'icons/favicon-32.png': 'builtin-favicon',
    'icons/apple-touch-icon.png': 'builtin-touch',
    'splash/750x1334.png': 'builtin-splash',
  });
  fs.writeFileSync(path.join(root, 'secret.txt'), 'top-secret-outside-web-dir');
  return {
    webDir,
    configDir,
    extensionsDir,
    dataDir,
    env: {
      CONFIG_DIR: configDir,
      DATA_DIR: dataDir,
      WEB_DIR: webDir,
      EXTENSIONS_DIR: extensionsDir,
      LOG_LEVEL: 'silent',
    },
  };
}

/** A fully defaulted config with `overrides` applied (validated by the real schema). */
export function makeConfig(overrides: Record<string, unknown> = {}): Config {
  return configSchema.parse(overrides);
}
