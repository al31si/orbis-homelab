import { describe, expect, it } from 'vitest';
import type { BootConfig } from '../../../shared/api.js';
import { createTranslator } from '../i18n/index.js';
import { escapeHtml } from '../pwa/escape.js';
import {
  SPLASH_FILES,
  checkIndexTemplate,
  renderIconLinks,
  renderIndexHtml,
} from '../pwa/index-html.js';
import { renderManifest } from '../pwa/manifest.js';
import { resolveBranding, resolveServiceIcon } from '../pwa/branding.js';
import { createPwa } from '../pwa/pwa.js';
import { safeRelativePath } from '../pwa/safe-path.js';
import { checkServiceWorkerTemplate, renderServiceWorker } from '../pwa/service-worker.js';
import { ALL_OFF, APP } from './helpers/fake-core.js';
import {
  INDEX_TEMPLATE,
  SW_TEMPLATE,
  createInstance,
  tempDir,
  writeFiles,
} from './helpers/fixtures.js';

const t = createTranslator('en');
const boot = (over: Partial<BootConfig['app']> = {}): BootConfig => ({
  app: { ...APP, description: 'A description', ...over },
  features: { ...ALL_OFF },
  extensions: [],
});
const render = (b: BootConfig, splash: string[] = []) =>
  renderIndexHtml(INDEX_TEMPLATE, {
    app: b.app,
    boot: b,
    iconLinks: renderIconLinks(new Set(splash)),
  });

describe('escapeHtml', () => {
  it('escapes markup, quotes and percent signs', () => {
    expect(escapeHtml(`<a href="x">'&%</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#37;&lt;/a&gt;',
    );
  });
});

describe('renderIndexHtml', () => {
  it('fills every token and leaves none behind', () => {
    const html = render(boot());
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Demo Center</title>');
    expect(html).toContain('content="A description"');
    expect(html).toContain('apple-mobile-web-app-title" content="Demo"');
    expect(html).not.toMatch(/%%[A-Z_]+%%/);
  });

  it('escapes hostile app names and descriptions (no markup injection)', () => {
    const html = render(
      boot({
        name: '</title><script>alert(1)</script>',
        description: '"><img src=x onerror=alert(1)>',
        shortName: `"><svg onload=alert(1)>`,
      }),
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<svg');
    expect(html).toContain('<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>');
  });

  it('embeds the boot JSON as an attribute that round-trips and cannot break out', () => {
    const b = boot({ name: `Q"uote </head> & 'x' %%TITLE%%` });
    const html = render(b);
    const match = /<meta name="orbis-boot" content="([^"]*)" \/>/.exec(html);
    expect(match).not.toBeNull();
    const decoded = (match?.[1] ?? '')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#37;/g, '%')
      .replace(/&amp;/g, '&');
    expect(JSON.parse(decoded)).toEqual(b);
    expect(html).not.toContain('</head> &');
  });

  it('never re-interprets a value as a token, nor as a replacement pattern', () => {
    const html = render(boot({ name: '%%LANG%% $& $1 $$', description: '%%BOOT_JSON%%' }));
    expect(html).toContain('<title>&#37;&#37;LANG&#37;&#37; $&amp; $1 $$</title>');
    expect(html).not.toMatch(/%%[A-Z_]+%%/);
  });

  it('emits icon links, with only the launch images that exist', () => {
    const html = render(boot(), ['750x1334.png', '2048x2732.png']);
    expect(html).toContain('href="/icons/favicon-32.png"');
    expect(html).toContain('href="/icons/apple-touch-icon.png"');
    expect(html).toContain('href="/splash/750x1334.png"');
    expect(html).toContain(
      '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
    );
    expect(html).toContain('href="/splash/2048x2732.png"');
    expect(html).not.toContain('1170x2532');
  });

  it('knows the eight iOS portrait launch images', () => {
    expect(SPLASH_FILES).toHaveLength(8);
    expect(renderIconLinks(new Set(SPLASH_FILES)).match(/apple-touch-startup-image/g)).toHaveLength(
      8,
    );
  });
});

describe('checkIndexTemplate', () => {
  it('accepts the shipped tokens', () => {
    expect(() => checkIndexTemplate(INDEX_TEMPLATE)).not.toThrow();
  });
  it('rejects missing and unknown tokens', () => {
    expect(() => checkIndexTemplate(INDEX_TEMPLATE.replace('%%TITLE%%', 'x'))).toThrow(
      'missing %%TITLE%%',
    );
    expect(() => checkIndexTemplate(`${INDEX_TEMPLATE}%%TYPO%%`)).toThrow('unknown %%TYPO%%');
  });
});

describe('renderManifest', () => {
  const manifest = (features = { system: false, storage: false }, lang: 'en' | 'it' = 'en') =>
    renderManifest(
      { ...APP, description: 'Desc', language: lang },
      features,
      createTranslator(lang),
    );

  it('has the installable PWA shape', () => {
    const m = manifest();
    expect(m).toMatchObject({
      id: '/',
      name: 'Demo Center',
      short_name: 'Demo',
      description: 'Desc',
      lang: 'en',
      start_url: '/?source=pwa',
      scope: '/',
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      orientation: 'any',
      theme_color: '#070e1b',
      background_color: '#070e1b',
    });
    expect(m.icons.map((i) => `${i.sizes}:${i.purpose}`)).toEqual([
      '192x192:any',
      '512x512:any',
      '512x512:maskable',
      '180x180:any',
    ]);
  });

  it('builds shortcuts from the enabled features, translated', () => {
    expect(manifest().shortcuts.map((s) => s.name)).toEqual(['Services']);
    expect(manifest({ system: true, storage: true }).shortcuts).toMatchObject([
      { name: 'Services', url: '/services?source=shortcut' },
      { name: 'System', url: '/system?source=shortcut' },
      { name: 'Storage', url: '/storage?source=shortcut' },
    ]);
    expect(manifest({ system: true, storage: false }, 'it').shortcuts.map((s) => s.name)).toEqual([
      'Servizi',
      'Sistema',
    ]);
  });
});

describe('service worker instance marker', () => {
  const instance = {
    cachePrefix: 'demo-',
    offlineText: 'Offline "now"',
    notificationTitle: 'Demo',
  };

  it('replaces the whole object literal and nothing else', () => {
    const sw = renderServiceWorker(SW_TEMPLATE, instance);
    expect(sw).toContain(
      `const INSTANCE = /*__SW_INSTANCE__*/ {"cachePrefix":"demo-","offlineText":"Offline \\"now\\"","notificationTitle":"Demo"};`,
    );
    expect(sw).not.toContain("'orbis-homelab-'");
    expect(sw).toContain("const CACHE = INSTANCE.cachePrefix + 'v1';");
    expect(sw.split('\n')).toHaveLength(SW_TEMPLATE.split('\n').length);
  });

  it('is not fooled by replacement patterns in values', () => {
    const sw = renderServiceWorker(SW_TEMPLATE, { ...instance, offlineText: "$& $' $`" });
    expect(sw).toContain(`"offlineText":"$& $' $\`"`);
  });

  it('refuses a service worker without the marker', () => {
    expect(() => checkServiceWorkerTemplate('const x = 1;')).toThrow('INSTANCE marker');
    expect(() => checkServiceWorkerTemplate(SW_TEMPLATE)).not.toThrow();
  });
});

describe('safeRelativePath', () => {
  it('accepts plain relative paths', () => {
    expect(safeRelativePath('icons/icon-192.png')).toBe('icons/icon-192.png');
  });
  it.each([
    '',
    '../x',
    'a/../../x',
    '/etc/passwd',
    'a//b',
    './a',
    'a/./b',
    '.env',
    'a/.git/x',
    'a\\b',
    'a\0b',
  ])('refuses %j', (raw) => {
    expect(safeRelativePath(raw)).toBeNull();
  });
});

describe('branding resolution', () => {
  it('prefers the instance branding, falls back to the built-in asset', () => {
    const inst = createInstance();
    const brandingDir = `${inst.configDir}/branding`;
    writeFiles(brandingDir, { 'icons/icon-192.png': 'custom', 'icons/mine.svg': '<svg/>' });
    const dirs = { brandingDir, webDir: inst.webDir };
    expect(resolveBranding(dirs, 'icons/icon-192.png')).toEqual({
      root: brandingDir,
      rel: 'icons/icon-192.png',
    });
    expect(resolveBranding(dirs, 'icons/favicon-32.png')).toEqual({
      root: inst.webDir,
      rel: 'icons/favicon-32.png',
    });
    expect(resolveBranding(dirs, 'icons/missing.png')).toBeNull();
    expect(resolveBranding(dirs, 'icons/../index.html')).toBeNull();
  });

  it('serves custom service icons from the branding folder only', () => {
    const inst = createInstance();
    const brandingDir = `${inst.configDir}/branding`;
    writeFiles(brandingDir, { 'icons/mine.svg': '<svg/>' });
    expect(resolveServiceIcon(brandingDir, 'mine.svg')?.rel).toBe('mine.svg');
    // exists in the web bundle, but only the instance folder is consulted
    expect(resolveServiceIcon(brandingDir, 'favicon-32.png')).toBeNull();
    expect(resolveServiceIcon(brandingDir, '../icon-192.png')).toBeNull();
  });
});

describe('createPwa', () => {
  it('renders from the web templates and the final boot config, once', () => {
    const inst = createInstance();
    writeFiles(`${inst.configDir}/branding`, { 'splash/1170x2532.png': 'custom-splash' });
    let calls = 0;
    const pwa = createPwa({
      webDir: inst.webDir,
      brandingDir: `${inst.configDir}/branding`,
      boot: () => {
        calls += 1;
        return boot();
      },
      t,
    });
    expect(calls).toBe(0);
    const html = pwa.indexHtml();
    expect(html).toContain('/splash/750x1334.png'); // built-in fallback
    expect(html).toContain('/splash/1170x2532.png'); // instance branding
    expect(html).not.toContain('/splash/1290x2796.png');
    expect(pwa.indexHtml()).toBe(html);
    expect(JSON.parse(pwa.manifestJson())).toMatchObject({ short_name: 'Demo' });
    expect(pwa.serviceWorker()).toContain('"cachePrefix":"demo-"');
    expect(pwa.serviceWorker()).toContain('"notificationTitle":"Demo"');
    expect(pwa.serviceWorker()).toContain('"offlineText":"The server is unreachable');
    expect(calls).toBe(3);
  });

  it('fails at startup on a template it cannot fill', () => {
    const dir = tempDir();
    writeFiles(dir, { 'index.html': '<html></html>', 'sw.js': SW_TEMPLATE });
    expect(() =>
      createPwa({ webDir: dir, brandingDir: `${dir}/b`, boot: () => boot(), t }),
    ).toThrow('index.html template');
  });
});
