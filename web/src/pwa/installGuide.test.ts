import { derivePushState, type PushEnvironment, type PushState } from './push';
import { describe, expect, it } from 'vitest';
import {
  deriveCapabilities,
  deriveInstallGuide,
  identifyBrowser,
  suggestHttpsOptions,
  type BrowserFamily,
  type BrowserInfo,
  type InstallEnvironment,
  type OsFamily,
  type ServiceWorkerState,
} from './installGuide';

const CHROME = 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0';
const IOS = 'AppleWebKit/605.1.15 (KHTML, like Gecko)';

/** Real user agent strings; `brave` stands for `navigator.brave.isBrave()` resolving to true. */
const BROWSERS: {
  name: string;
  ua: string;
  platform?: string;
  touch?: number;
  brave?: boolean;
  expect: BrowserInfo;
}[] = [
  {
    name: 'Chrome on Windows',
    ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${CHROME} Safari/537.36`,
    expect: { family: 'chrome', os: 'windows' },
  },
  {
    name: 'Chrome on Linux',
    ua: `Mozilla/5.0 (X11; Linux x86_64) ${CHROME} Safari/537.36`,
    expect: { family: 'chrome', os: 'linux' },
  },
  {
    name: 'Chrome on macOS',
    ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${CHROME} Safari/537.36`,
    expect: { family: 'chrome', os: 'mac' },
  },
  {
    name: 'Chromium on Ubuntu',
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/150.0.0.0 Chrome/150.0.0.0 Safari/537.36',
    expect: { family: 'chromium', os: 'linux' },
  },
  {
    name: 'Brave on Windows (hidden in the user agent)',
    ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${CHROME} Safari/537.36`,
    brave: true,
    expect: { family: 'brave', os: 'windows' },
  },
  {
    name: 'Brave on Linux',
    ua: `Mozilla/5.0 (X11; Linux x86_64) ${CHROME} Safari/537.36`,
    brave: true,
    expect: { family: 'brave', os: 'linux' },
  },
  {
    name: 'Edge on Windows',
    ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${CHROME} Safari/537.36 Edg/150.0.0.0`,
    expect: { family: 'edge', os: 'windows' },
  },
  {
    name: 'Opera on Windows',
    ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${CHROME} Safari/537.36 OPR/120.0.0.0`,
    expect: { family: 'opera', os: 'windows' },
  },
  {
    name: 'Firefox on Windows',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    expect: { family: 'firefox', os: 'windows' },
  },
  {
    name: 'Firefox on Linux',
    ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
    expect: { family: 'firefox', os: 'linux' },
  },
  {
    name: 'Safari on macOS',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    platform: 'MacIntel',
    touch: 0,
    expect: { family: 'safari', os: 'mac' },
  },
  {
    name: 'Safari on iPhone',
    ua: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ${IOS} Version/17.5 Mobile/15E148 Safari/604.1`,
    platform: 'iPhone',
    touch: 5,
    expect: { family: 'safari', os: 'ios' },
  },
  {
    name: 'Safari on iPadOS (reports itself as a Mac)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    platform: 'MacIntel',
    touch: 5,
    expect: { family: 'safari', os: 'ios' },
  },
  {
    name: 'Chrome on iPhone',
    ua: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ${IOS} CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1`,
    platform: 'iPhone',
    touch: 5,
    expect: { family: 'chrome', os: 'ios' },
  },
  {
    name: 'Firefox on iPhone',
    ua: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ${IOS} FxiOS/127.0 Mobile/15E148 Safari/605.1.15`,
    platform: 'iPhone',
    touch: 5,
    expect: { family: 'firefox', os: 'ios' },
  },
  {
    name: 'Edge on iPhone',
    ua: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ${IOS} EdgiOS/126.2592.82 Version/17.0 Mobile/15E148 Safari/604.1`,
    platform: 'iPhone',
    touch: 5,
    expect: { family: 'edge', os: 'ios' },
  },
  {
    name: 'an in-app browser on iPhone (no Safari token)',
    ua: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) ${IOS} Mobile/15E148 Instagram 330.0`,
    platform: 'iPhone',
    touch: 5,
    expect: { family: 'other', os: 'ios' },
  },
  {
    name: 'Chrome on Android',
    ua: `Mozilla/5.0 (Linux; Android 14; Pixel 8) ${CHROME} Mobile Safari/537.36`,
    platform: 'Linux armv81',
    touch: 5,
    expect: { family: 'chrome', os: 'android' },
  },
  {
    name: 'Samsung Internet',
    ua: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
    touch: 5,
    expect: { family: 'samsung', os: 'android' },
  },
  {
    name: 'Edge on Android',
    ua: `Mozilla/5.0 (Linux; Android 14; Pixel 8) ${CHROME} Mobile Safari/537.36 EdgA/150.0.0.0`,
    touch: 5,
    expect: { family: 'edge', os: 'android' },
  },
  {
    name: 'Brave on Android',
    ua: `Mozilla/5.0 (Linux; Android 14; Pixel 8) ${CHROME} Mobile Safari/537.36`,
    brave: true,
    touch: 5,
    expect: { family: 'brave', os: 'android' },
  },
  {
    name: 'Firefox on Android',
    ua: 'Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0',
    touch: 5,
    expect: { family: 'firefox', os: 'android' },
  },
];

const identify = (b: (typeof BROWSERS)[number]): BrowserInfo =>
  identifyBrowser({
    userAgent: b.ua,
    platform: b.platform ?? 'Win32',
    maxTouchPoints: b.touch ?? 0,
    isBrave: b.brave ?? false,
  });

describe('identifyBrowser', () => {
  it.each(BROWSERS)('recognises $name', (b) => {
    expect(identify(b)).toEqual(b.expect);
  });

  it('does not take a desktop Mac without a touch screen for an iPad', () => {
    const mac = BROWSERS.find((b) => b.name === 'Safari on macOS')!;
    expect(identify(mac).os).toBe('mac');
  });

  it('only calls it Brave when the browser says so', () => {
    const chrome = BROWSERS[0]!;
    expect(identify({ ...chrome, brave: false }).family).toBe('chrome');
    expect(identify({ ...chrome, brave: true }).family).toBe('brave');
  });
});

const env = (
  overrides: Partial<InstallEnvironment> & { browser: BrowserInfo },
): InstallEnvironment => ({
  secureContext: false,
  standalone: false,
  installedHere: false,
  canPrompt: false,
  ...overrides,
});

const browser = (family: BrowserFamily, os: OsFamily): BrowserInfo => ({ family, os });

describe('deriveInstallGuide on a plain HTTP address (the typical LAN install)', () => {
  it.each([
    ['chrome', 'windows'],
    ['chrome', 'linux'],
    ['chrome', 'mac'],
    ['chromium', 'linux'],
    ['brave', 'windows'],
    ['brave', 'linux'],
    ['edge', 'windows'],
    ['opera', 'windows'],
  ] as const)('%s on %s: installs as an app window, never claims a full app', (family, os) => {
    const guide = deriveInstallGuide(env({ browser: browser(family, os) }));
    expect(guide).toMatchObject({ kind: 'chromium-desktop', result: 'window', secure: false });
  });

  it('never offers the native install button, whatever the browser said about it', () => {
    const guide = deriveInstallGuide(
      env({ browser: browser('chrome', 'windows'), canPrompt: true }),
    );
    expect(guide.kind).not.toBe('prompt');
    expect(guide.result).toBe('window');
  });

  it('Safari on Mac: Add to Dock as an app window', () => {
    expect(deriveInstallGuide(env({ browser: browser('safari', 'mac') }))).toMatchObject({
      kind: 'mac-safari',
      result: 'window',
    });
  });

  it.each(['safari', 'chrome', 'firefox', 'edge'] as const)(
    '%s on iPhone: Add to Home Screen instructions (not a dead end)',
    (family) => {
      expect(deriveInstallGuide(env({ browser: browser(family, 'ios') }))).toMatchObject({
        kind: 'ios',
        result: 'window',
      });
    },
  );

  it('an in-app browser on iPhone is told to open the page in a real browser', () => {
    expect(deriveInstallGuide(env({ browser: browser('other', 'ios') })).kind).toBe(
      'in-app-browser',
    );
  });

  it.each(['chrome', 'samsung', 'edge', 'brave'] as const)(
    '%s on Android: only a shortcut that opens in the browser',
    (family) => {
      expect(deriveInstallGuide(env({ browser: browser(family, 'android') }))).toMatchObject({
        kind: 'chromium-android',
        result: 'shortcut',
      });
    },
  );

  it('Firefox: a shortcut on Android, nothing to install on a computer', () => {
    expect(deriveInstallGuide(env({ browser: browser('firefox', 'android') }))).toMatchObject({
      kind: 'firefox-android',
      result: 'shortcut',
    });
    expect(deriveInstallGuide(env({ browser: browser('firefox', 'windows') }))).toMatchObject({
      kind: 'firefox-desktop',
      result: 'none',
    });
  });

  it('an unknown browser gets generic advice, not a made-up path', () => {
    expect(deriveInstallGuide(env({ browser: browser('other', 'other') })).kind).toBe('generic');
  });
});

describe('deriveInstallGuide on a secure address', () => {
  const secure = { secureContext: true };

  it('offers the browser dialog only when the browser actually has it', () => {
    const chrome = browser('chrome', 'windows');
    expect(deriveInstallGuide(env({ browser: chrome, ...secure, canPrompt: true }))).toMatchObject({
      kind: 'prompt',
      result: 'app',
    });
    expect(deriveInstallGuide(env({ browser: chrome, ...secure })).kind).toBe('chromium-desktop');
  });

  it('desktop Chromium installs a full app, with or without the dialog yet', () => {
    for (const family of ['chrome', 'edge', 'brave'] as const) {
      expect(deriveInstallGuide(env({ browser: browser(family, 'linux'), ...secure })).result).toBe(
        'app',
      );
    }
  });

  it('Android: Chrome and Samsung Internet install a real app, other browsers a shortcut', () => {
    expect(
      deriveInstallGuide(env({ browser: browser('chrome', 'android'), ...secure })).result,
    ).toBe('app');
    expect(
      deriveInstallGuide(env({ browser: browser('samsung', 'android'), ...secure })).result,
    ).toBe('app');
    expect(deriveInstallGuide(env({ browser: browser('edge', 'android'), ...secure })).result).toBe(
      'shortcut',
    );
  });

  it('iOS and Safari on Mac become full apps once the address is secure', () => {
    expect(deriveInstallGuide(env({ browser: browser('safari', 'ios'), ...secure })).result).toBe(
      'app',
    );
    expect(deriveInstallGuide(env({ browser: browser('safari', 'mac'), ...secure })).result).toBe(
      'app',
    );
  });

  it('Firefox on a computer still has nothing to install, secure or not', () => {
    expect(
      deriveInstallGuide(env({ browser: browser('firefox', 'linux'), ...secure })).result,
    ).toBe('none');
  });
});

describe('an app that is already installed', () => {
  const chrome = browser('chrome', 'windows');

  it('is reported as installed, with no steps, when running as the app', () => {
    for (const secureContext of [true, false]) {
      const guide = deriveInstallGuide(
        env({ browser: chrome, standalone: true, canPrompt: true, secureContext }),
      );
      expect(guide.kind).toBe('installed');
    }
  });

  it('is reported as installed in a browser tab when this device is known to have it', () => {
    expect(deriveInstallGuide(env({ browser: chrome, installedHere: true })).kind).toBe(
      'installed-elsewhere',
    );
  });

  it('a browser that offers the install dialog again proves it is not installed', () => {
    const guide = deriveInstallGuide(
      env({ browser: chrome, secureContext: true, installedHere: true, canPrompt: true }),
    );
    expect(guide.kind).toBe('prompt');
  });
});

describe('invariants over every browser and every situation', () => {
  const situations: Pick<
    InstallEnvironment,
    'secureContext' | 'standalone' | 'installedHere' | 'canPrompt'
  >[] = [];
  for (const secureContext of [true, false]) {
    for (const standalone of [true, false]) {
      for (const installedHere of [true, false]) {
        for (const canPrompt of [true, false]) {
          situations.push({ secureContext, standalone, installedHere, canPrompt });
        }
      }
    }
  }

  it('never shows the install button without a secure context and a real prompt', () => {
    for (const b of BROWSERS) {
      for (const s of situations) {
        const guide = deriveInstallGuide({ browser: b.expect, ...s });
        if (guide.kind === 'prompt') {
          expect(s.secureContext && s.canPrompt && !s.standalone).toBe(true);
        }
      }
    }
  });

  it('never promises a full app, nor offline or notifications, on an insecure address', () => {
    for (const b of BROWSERS) {
      for (const s of situations.filter((x) => !x.secureContext)) {
        const guide = deriveInstallGuide({ browser: b.expect, ...s });
        expect(guide.result).not.toBe('app');
        const rows = deriveCapabilities({
          guide,
          serviceWorker: 'insecure',
          push: derivePushState({ ...PUSH_READY, secureContext: false }),
        });
        for (const id of ['offline', 'notifications'] as const) {
          const row = rows.find((r) => r.id === id)!;
          expect(row).toMatchObject({ tone: 'warn', reason: 'needs-https' });
        }
      }
    }
  });

  it('reports "installed" only when the page runs as the app or the device is known to have it', () => {
    for (const b of BROWSERS) {
      for (const s of situations) {
        const { kind } = deriveInstallGuide({ browser: b.expect, ...s });
        if (kind === 'installed') expect(s.standalone).toBe(true);
        if (kind === 'installed-elsewhere') expect(s.installedHere && !s.standalone).toBe(true);
      }
    }
  });

  it('always gives every browser some way forward or an honest "not possible"', () => {
    for (const b of BROWSERS) {
      const guide = deriveInstallGuide({ browser: b.expect, ...situations[3]! });
      expect(guide.kind).toBeTruthy();
      expect(['app', 'window', 'shortcut', 'none']).toContain(guide.result);
    }
  });
});

describe('deriveCapabilities on a secure address', () => {
  const chrome = deriveInstallGuide(
    env({ browser: browser('chrome', 'windows'), secureContext: true }),
  );
  const offline = (state: ServiceWorkerState) =>
    deriveCapabilities({ guide: chrome, serviceWorker: state, push: ACTIVE }).find(
      (r) => r.id === 'offline',
    )!;

  it('says offline is ready only once the service worker is there', () => {
    expect(offline('active')).toMatchObject({ tone: 'ok', reason: 'ready' });
    expect(offline('waiting')).toMatchObject({ tone: 'ok', reason: 'ready' });
    expect(offline('installing')).toMatchObject({ tone: 'neutral', reason: 'preparing' });
    expect(offline('none')).toMatchObject({ tone: 'neutral', reason: 'preparing' });
    // The browser refused the worker on an https address (untrusted certificate): say so, do not wait forever.
    expect(offline('failed')).toMatchObject({ tone: 'warn', reason: 'failed' });
    // ...and then the install row must not promise a full app either.
    const caps = deriveCapabilities({ guide: chrome, serviceWorker: 'failed', push: ACTIVE });
    expect(caps.find((c) => c.id === 'installs-as')).toMatchObject({
      tone: 'warn',
      reason: 'window-without-worker',
    });
  });

  it('is honest about browsers without service workers and about development builds', () => {
    expect(offline('unsupported')).toMatchObject({ tone: 'warn', reason: 'unsupported' });
    expect(offline('development')).toMatchObject({ tone: 'neutral', reason: 'development' });
  });

  it('notifications: nothing to turn on when the server has push disabled', () => {
    const row = deriveCapabilities({ guide: chrome, serviceWorker: 'active', push: null }).find(
      (r) => r.id === 'notifications',
    );
    expect(row).toMatchObject({ tone: 'neutral', reason: 'server-off' });
  });

  it('notifications on iPhone need the app on the Home Screen first', () => {
    const tab = deriveInstallGuide(env({ browser: browser('safari', 'ios'), secureContext: true }));
    const row = (guide: typeof tab, needsInstall: boolean) =>
      deriveCapabilities({
        guide,
        serviceWorker: 'active',
        push: derivePushState({ ...PUSH_READY, needsInstall }),
      }).find((r) => r.id === 'notifications')!;
    expect(row(tab, true).reason).toBe('install-first');
    expect(row(tab, false).reason).toBe('available');
  });

  it('describes what the install gives: the result of the guide', () => {
    const row = deriveCapabilities({ guide: chrome, serviceWorker: 'active', push: ACTIVE })[0];
    expect(row).toMatchObject({ id: 'installs-as', tone: 'ok', reason: 'app' });
    const firefox = deriveInstallGuide(env({ browser: browser('firefox', 'linux') }));
    expect(
      deriveCapabilities({ guide: firefox, serviceWorker: 'insecure', push: null })[0],
    ).toMatchObject({ tone: 'warn', reason: 'none' });
  });
});

describe('suggestHttpsOptions', () => {
  it('starts with Tailscale for a tailnet name or a Tailscale address', () => {
    expect(suggestHttpsOptions('atlas.tail1234.ts.net')[0]).toBe('tailscale');
    expect(suggestHttpsOptions('100.101.192.118')[0]).toBe('tailscale');
    expect(suggestHttpsOptions('100.64.0.1')[0]).toBe('tailscale');
    expect(suggestHttpsOptions('100.127.255.254')[0]).toBe('tailscale');
  });

  it('does not take other 100.x addresses for Tailscale', () => {
    expect(suggestHttpsOptions('100.63.0.1')[0]).not.toBe('tailscale');
    expect(suggestHttpsOptions('100.128.0.1')[0]).not.toBe('tailscale');
  });

  it('starts with a reverse proxy, then a local CA, on a home network address or name', () => {
    for (const host of [
      '192.168.1.50',
      '10.0.0.7',
      '172.20.1.2',
      'nas.local',
      'homelab',
      'x.lan',
    ]) {
      expect(suggestHttpsOptions(host).slice(0, 2), host).toEqual(['proxy', 'local-ca']);
    }
  });

  it('suggests a proxy with a public certificate for a real domain name', () => {
    expect(suggestHttpsOptions('orbis.example.com').slice(0, 2)).toEqual(['proxy', 'caddy']);
  });

  it('never offers fewer than three distinct ways, and always the localhost route', () => {
    for (const host of [
      'atlas.ts.net',
      '100.100.100.100',
      '192.168.0.2',
      'nas',
      'orbis.example.org',
      '8.8.8.8',
      '300.1.1.1',
      '',
    ]) {
      const options = suggestHttpsOptions(host);
      expect(new Set(options).size, host).toBe(options.length);
      expect(options.length, host).toBeGreaterThanOrEqual(3);
      expect(options, host).toContain('localhost');
    }
  });
});

const ACTIVE: PushState = { kind: 'active' };
const PUSH_READY: PushEnvironment = {
  secureContext: true,
  support: { serviceWorker: true, pushManager: true, notification: true },
  workerFailed: false,
  needsInstall: false,
  access: 'full',
  permission: 'default',
  config: { available: true },
  subscribed: false,
  loadFailed: false,
};

describe('the Installation notifications row follows the Notifications settings', () => {
  const guide = (secureContext: boolean) =>
    deriveInstallGuide(env({ browser: browser('chrome', 'windows'), secureContext }));
  const rowFor = (environment: PushEnvironment) =>
    deriveCapabilities({
      guide: guide(environment.secureContext),
      serviceWorker: environment.secureContext ? 'active' : 'insecure',
      push: derivePushState(environment),
    }).find((r) => r.id === 'notifications')!;

  const cases: [string, Partial<PushEnvironment>, string, string][] = [
    ['everything in place, not subscribed', {}, 'neutral', 'available'],
    ['subscribed with permission', { subscribed: true, permission: 'granted' }, 'ok', 'active'],
    ['plain HTTP', { secureContext: false }, 'warn', 'needs-https'],
    ['iPhone tab', { needsInstall: true }, 'neutral', 'install-first'],
    [
      'browser without Push API',
      { support: { serviceWorker: true, pushManager: false, notification: true } },
      'warn',
      'unsupported',
    ],
    [
      'browser without Notification API',
      { support: { serviceWorker: true, pushManager: true, notification: false } },
      'warn',
      'unsupported',
    ],
    [
      'browser without service workers',
      { support: { serviceWorker: false, pushManager: true, notification: true } },
      'warn',
      'unsupported',
    ],
    ['service worker refused', { workerFailed: true }, 'warn', 'worker-failed'],
    ['limited access', { access: 'limited' }, 'neutral', 'limited'],
    [
      'limited access beats a refused worker',
      { access: 'limited', workerFailed: true },
      'neutral',
      'limited',
    ],
    ['permission denied', { permission: 'denied' }, 'warn', 'denied'],
    ['server says push is unavailable', { config: { available: false } }, 'neutral', 'server-off'],
    ['session still loading', { access: null }, 'neutral', 'checking'],
    [
      'server configuration still loading',
      { config: null, subscribed: null },
      'neutral',
      'checking',
    ],
    [
      'server configuration unreadable',
      { config: null, subscribed: null, loadFailed: true },
      'warn',
      'error',
    ],
  ];

  it.each(cases)('%s', (_name, change, tone, reason) => {
    expect(rowFor({ ...PUSH_READY, ...change })).toMatchObject({ tone, reason });
  });

  it('says "ready" or "active" only when the Notifications section can really turn them on', () => {
    const accesses: PushEnvironment['access'][] = ['full', 'limited', null];
    const permissions: PushEnvironment['permission'][] = ['default', 'granted', 'denied', null];
    for (const secureContext of [true, false]) {
      for (const access of accesses) {
        for (const permission of permissions) {
          for (const workerFailed of [true, false]) {
            for (const needsInstall of [true, false]) {
              for (const config of [null, { available: true }, { available: false }]) {
                const environment: PushEnvironment = {
                  ...PUSH_READY,
                  secureContext,
                  access,
                  permission,
                  workerFailed,
                  needsInstall,
                  config,
                  subscribed: config === null ? null : permission === 'granted',
                };
                const state: PushState = derivePushState(environment);
                const { reason } = rowFor(environment);
                const usable = state.kind === 'inactive' || state.kind === 'active';
                expect(reason === 'available' || reason === 'active').toBe(usable);
                if (usable) {
                  expect(secureContext && access === 'full' && !workerFailed && !needsInstall).toBe(
                    true,
                  );
                }
              }
            }
          }
        }
      }
    }
  });
});
