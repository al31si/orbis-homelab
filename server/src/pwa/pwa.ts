import fs from 'node:fs';
import path from 'node:path';
import type { BootConfig } from '../../../shared/api.js';
import type { T } from '../i18n/index.js';
import { resolveBranding } from './branding.js';
import {
  SPLASH_FILES,
  checkIndexTemplate,
  renderIconLinks,
  renderIndexHtml,
} from './index-html.js';
import { renderManifest } from './manifest.js';
import { checkServiceWorkerTemplate, renderServiceWorker } from './service-worker.js';

export interface PwaOptions {
  webDir: string;
  /** `<CONFIG_DIR>/branding`. */
  brandingDir: string;
  /**
   * The final boot config. Called on first use, after extensions are loaded or failed, then
   * cached for the life of the process (the instance does not change while it runs).
   */
  boot: () => BootConfig;
  t: T;
}

export interface Pwa {
  indexHtml(): string;
  manifestJson(): string;
  serviceWorker(): string;
}

/**
 * The parts of the PWA that depend on the instance. Templates (`index.html`, `sw.js`) are read
 * once at startup; every rendering is computed on first request and cached.
 */
export function createPwa(opts: PwaOptions): Pwa {
  const indexTemplate = fs.readFileSync(path.join(opts.webDir, 'index.html'), 'utf8');
  const swTemplate = fs.readFileSync(path.join(opts.webDir, 'sw.js'), 'utf8');
  checkIndexTemplate(indexTemplate);
  checkServiceWorkerTemplate(swTemplate);

  const cache = new Map<string, string>();
  const memo = (key: string, build: () => string): string => {
    let value = cache.get(key);
    if (value === undefined) {
      value = build();
      cache.set(key, value);
    }
    return value;
  };

  return {
    indexHtml: () =>
      memo('index', () => {
        const boot = opts.boot();
        const dirs = { brandingDir: opts.brandingDir, webDir: opts.webDir };
        const splash = new Set(
          SPLASH_FILES.filter((file) => resolveBranding(dirs, `splash/${file}`) !== null),
        );
        return renderIndexHtml(indexTemplate, {
          app: boot.app,
          boot,
          iconLinks: renderIconLinks(splash),
        });
      }),
    manifestJson: () =>
      memo('manifest', () => {
        const { app, features } = opts.boot();
        return JSON.stringify(renderManifest(app, features, opts.t));
      }),
    serviceWorker: () =>
      memo('sw', () => {
        const { app } = opts.boot();
        return renderServiceWorker(swTemplate, {
          cachePrefix: `${app.id}-`,
          offlineText: opts.t('http.sw.offline'),
          notificationTitle: app.shortName,
        });
      }),
  };
}
