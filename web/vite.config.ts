import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import process from 'node:process';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Development proxy to the BFF. To exercise an identity-proxy access mode locally, export
 * DEV_IDENTITY_HEADER (e.g. `X-Forwarded-User`) and DEV_IDENTITY (the value to send); the
 * instance's `trustedProxies` must include 127.0.0.1. Without them no identity header is sent.
 * `DEV_API_TARGET` points the proxy at another backend (default: the trusted listener on :3101).
 */
const API_TARGET = process.env.DEV_API_TARGET ?? 'http://127.0.0.1:3101';
const identityHeader = process.env.DEV_IDENTITY_HEADER;
const identity = process.env.DEV_IDENTITY;
const devHeaders: Record<string, string> =
  identityHeader && identity ? { [identityHeader]: identity } : {};

const proxyEntry = { target: API_TARGET, changeOrigin: false, headers: devHeaders };
const apiProxy = {
  '/api': proxyEntry,
  '/extensions': proxyEntry,
  '/branding': proxyEntry,
};

/** What the BFF fills in per instance; the dev server substitutes neutral values. */
const DEV_HTML_TOKENS: Record<string, string> = {
  '%%LANG%%': 'en',
  '%%TITLE%%': 'Orbis Homelab',
  '%%DESCRIPTION%%': 'Self-hosted homelab control center.',
  '%%APP_SHORT_NAME%%': 'Orbis',
  '%%ICON_LINKS%%':
    '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />' +
    '<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />',
};

/**
 * Dev only: replaces the instance tokens of index.html. `%%BOOT_JSON%%` stays untouched, which
 * makes the app fetch `/api/session` (see boot/load.ts). Production builds keep every token.
 */
function devHtmlTokens(): Plugin {
  return {
    name: 'orbis-dev-html-tokens',
    apply: 'serve',
    transformIndexHtml(html) {
      return Object.entries(DEV_HTML_TOKENS).reduce(
        (out, [token, value]) => out.replaceAll(token, value),
        html,
      );
    },
  };
}

/** Files that must not be part of the offline app shell (large, or only fetched on demand). */
const PRECACHE_EXCLUDE = [
  /^sw\.js$/,
  /^precache-manifest\.json$/,
  // Branding belongs to the instance (served by the BFF from its config folder first).
  /^splash\//,
  /^icons\//,
  /\.map$/,
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/**
 * Emits `precache-manifest.json` and bakes the build id + precache list into `sw.js`.
 * The build id is a hash of every precached file, so the service worker byte-changes (and
 * therefore updates) exactly when the shell changes.
 */
function serviceWorkerPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'orbis-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    closeBundle() {
      const hash = createHash('sha256');
      const files = walk(outDir)
        .map((path) => relative(outDir, path).split(sep).join('/'))
        .filter((file) => !PRECACHE_EXCLUDE.some((re) => re.test(file)))
        .sort()
        .map((file) => {
          const bytes = readFileSync(join(outDir, file));
          const revision = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
          hash.update(file).update(revision);
          return { url: file === 'index.html' ? '/index.html' : `/${file}`, revision };
        });
      const buildId = hash.digest('hex').slice(0, 12);

      writeFileSync(
        join(outDir, 'precache-manifest.json'),
        `${JSON.stringify({ buildId, files }, null, 2)}\n`,
      );

      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8')
        .replace('__BUILD_ID__', buildId)
        .replace('/*__PRECACHE_URLS__*/ []', JSON.stringify(files.map((f) => f.url)));
      writeFileSync(swPath, sw);
    },
  };
}

/**
 * Fingerprint of the API contract. Persisted snapshots are keyed by it, so a payload cached
 * under an older contract is never handed to code that expects the new shape.
 */
const API_SCHEMA = createHash('sha256')
  .update(readFileSync(fileURLToPath(new URL('../shared/api.ts', import.meta.url))))
  .digest('hex')
  .slice(0, 10);

export default defineConfig({
  define: { __API_SCHEMA__: JSON.stringify(API_SCHEMA) },
  plugins: [react(), devHtmlTokens(), serviceWorkerPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: apiProxy },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy: apiProxy },
  build: {
    target: 'es2022',
    sourcemap: false,
    // Small files are normally inlined as base64 into the JavaScript. The brand logos are only
    // looked up when a service shows one, so they stay separate files (still precached offline).
    assetsInlineLimit: (file) => (file.includes('/ui/brand/logos/') ? false : undefined),
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
