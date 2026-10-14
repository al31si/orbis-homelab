/**
 * What can honestly be said to a visitor about installing the app, decided from facts only.
 *
 * Browsers do NOT treat these as one thing, and neither does this module:
 *  - a full installed app (PWA): needs a secure context (HTTPS, or `localhost`/`127.0.0.1`);
 *  - an app window / standalone web app: Chromium desktop browsers, Safari on Mac and Safari or
 *    Chrome on iPhone/iPad can turn ANY site into one, over plain HTTP too, but without a service
 *    worker (so no offline mode and no Web Push);
 *  - a shortcut: what most Android browsers add for a site that is not installable;
 *  - the service worker, the offline cache and Web Push: secure contexts only.
 *
 * Sources: web.dev "What does it take to be installable?", MDN "Making PWAs installable", Chrome,
 * Brave and Edge help pages, Apple's iPhone and Safari guides, WebKit "Web Push for Web Apps on
 * iOS and iPadOS". Nothing here touches the DOM, so it is covered by plain unit tests.
 */
import type { PushBlockReason, PushState } from './push';

export type BrowserFamily =
  'chrome' | 'edge' | 'brave' | 'opera' | 'samsung' | 'firefox' | 'safari' | 'chromium' | 'other';

export type OsFamily = 'windows' | 'mac' | 'linux' | 'chromeos' | 'android' | 'ios' | 'other';

export interface BrowserSignals {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  /** Result of `navigator.brave?.isBrave()`: Brave hides itself in the user agent. */
  isBrave: boolean;
}

export interface BrowserInfo {
  family: BrowserFamily;
  os: OsFamily;
}

/** Browser and operating system, as far as they can be told apart reliably. */
export function identifyBrowser(signals: BrowserSignals): BrowserInfo {
  const ua = signals.userAgent;
  // iPadOS 13+ reports itself as a Mac with a touch screen.
  const ios =
    /iPhone|iPad|iPod/.test(ua) || (signals.platform === 'MacIntel' && signals.maxTouchPoints > 1);
  if (ios) {
    // Every iOS browser is WebKit and installs through the same Share sheet.
    let family: BrowserFamily = 'other';
    if (/CriOS/.test(ua)) family = 'chrome';
    else if (/FxiOS/.test(ua)) family = 'firefox';
    else if (/EdgiOS/.test(ua)) family = 'edge';
    else if (/OPiOS|OPT\//.test(ua)) family = 'opera';
    else if (/Safari\//.test(ua)) family = 'safari';
    return { family, os: 'ios' };
  }

  let os: OsFamily = 'other';
  if (/Android/.test(ua)) os = 'android';
  else if (/CrOS/.test(ua)) os = 'chromeos';
  else if (/Windows/.test(ua)) os = 'windows';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'mac';
  else if (/Linux|X11/.test(ua)) os = 'linux';

  let family: BrowserFamily = 'other';
  if (/SamsungBrowser/.test(ua)) family = 'samsung';
  else if (/Edg(e|A)?\//.test(ua)) family = 'edge';
  else if (/OPR\/|Opera/.test(ua)) family = 'opera';
  else if (/Firefox\/|Fennec\//.test(ua)) family = 'firefox';
  else if (/Chromium\//.test(ua)) family = signals.isBrave ? 'brave' : 'chromium';
  else if (/Chrome\//.test(ua)) family = signals.isBrave ? 'brave' : 'chrome';
  else if (/Safari\//.test(ua)) family = 'safari';
  return { family, os };
}

/** What the visitor gets if they follow the guide. */
export type InstallResult =
  /** A real installed app: own window or home-screen icon; offline and push when secure. */
  | 'app'
  /** The site in its own window (a "website as app"): no service worker, offline or push. */
  | 'window'
  /** A shortcut that opens in the browser. */
  | 'shortcut'
  /** Nothing to install in this browser. */
  | 'none';

export type InstallKind =
  /** Running as an installed app or standalone window right now. */
  | 'installed'
  /** Running in a browser tab, but this device is known to have the app installed. */
  | 'installed-elsewhere'
  /** The browser's own install dialog is available right now (secure context only). */
  | 'prompt'
  | 'chromium-desktop'
  | 'chromium-android'
  | 'ios'
  | 'mac-safari'
  | 'firefox-desktop'
  | 'firefox-android'
  /** An in-app browser (iOS) that has no Add to Home Screen. */
  | 'in-app-browser'
  | 'generic';

export interface InstallEnvironment {
  browser: BrowserInfo;
  /** `window.isSecureContext`. */
  secureContext: boolean;
  /** Running as an installed app or in a standalone window. */
  standalone: boolean;
  /** This device has been seen installing or running the app. */
  installedHere: boolean;
  /** The browser holds a `beforeinstallprompt` event it can show now. */
  canPrompt: boolean;
}

export interface InstallGuide {
  kind: InstallKind;
  browser: BrowserFamily;
  os: OsFamily;
  secure: boolean;
  result: InstallResult;
}

const CHROMIUM_FAMILIES: readonly BrowserFamily[] = [
  'chrome',
  'edge',
  'brave',
  'opera',
  'samsung',
  'chromium',
];

/** Android browsers that install a secure site as a real app (WebAPK) rather than a shortcut. */
const ANDROID_REAL_APP: readonly BrowserFamily[] = ['chrome', 'samsung'];

/** The one install path to show, and what it leads to, for this browser and this address. */
export function deriveInstallGuide(env: InstallEnvironment): InstallGuide {
  const { browser, secureContext: secure } = env;
  const guide = (kind: InstallKind, result: InstallResult): InstallGuide => ({
    kind,
    browser: browser.family,
    os: browser.os,
    secure,
    result,
  });
  const appOrWindow: InstallResult = secure ? 'app' : 'window';

  if (env.standalone) return guide('installed', appOrWindow);
  // Only a secure context ever receives the event; the check keeps the rule explicit.
  if (env.canPrompt && secure) return guide('prompt', 'app');
  if (env.installedHere) return guide('installed-elsewhere', appOrWindow);

  if (browser.os === 'ios') {
    return browser.family === 'other' ? guide('in-app-browser', 'none') : guide('ios', appOrWindow);
  }
  if (browser.os === 'android') {
    if (browser.family === 'firefox') return guide('firefox-android', 'shortcut');
    if (CHROMIUM_FAMILIES.includes(browser.family)) {
      const real = secure && ANDROID_REAL_APP.includes(browser.family);
      return guide('chromium-android', real ? 'app' : 'shortcut');
    }
    return guide('generic', 'shortcut');
  }
  if (browser.family === 'firefox') return guide('firefox-desktop', 'none');
  if (browser.family === 'safari' && browser.os === 'mac') return guide('mac-safari', appOrWindow);
  if (CHROMIUM_FAMILIES.includes(browser.family)) return guide('chromium-desktop', appOrWindow);
  return guide('generic', 'none');
}

/* --------------------------------------------------------------------------- capabilities */

export type ServiceWorkerState =
  | 'unsupported'
  | 'insecure'
  | 'development'
  | 'none'
  | 'failed'
  | 'installing'
  | 'waiting'
  | 'active';

export type CapabilityTone = 'ok' | 'neutral' | 'warn';

export type OfflineReason =
  'ready' | 'preparing' | 'needs-https' | 'unsupported' | 'development' | 'failed';
/**
 * Why notifications are or are not usable here. Each reason is one of: not configured on the
 * server (`server-off`), not possible with this browser or address (`needs-https`, `unsupported`,
 * `worker-failed`, `install-first`, `limited`, `denied`), still being read (`checking`, `error`),
 * ready to be turned on (`available`) or already on (`active`).
 */
export type NotificationsReason =
  | 'checking'
  | 'error'
  | 'server-off'
  | 'needs-https'
  | 'install-first'
  | 'unsupported'
  | 'worker-failed'
  | 'limited'
  | 'denied'
  | 'available'
  | 'active';

/** One row of "what works on this address"; `reason` selects the message that explains it. */
export type Capability =
  | { id: 'installs-as'; tone: CapabilityTone; reason: InstallResult | 'window-without-worker' }
  | { id: 'offline'; tone: CapabilityTone; reason: OfflineReason }
  | { id: 'notifications'; tone: CapabilityTone; reason: NotificationsReason };

export interface CapabilityInput {
  guide: InstallGuide;
  serviceWorker: ServiceWorkerState;
  /**
   * The state of the notification settings (`derivePushState`), the single source of truth for
   * what Notifications says. Null when Web Push is not enabled on this server.
   */
  push: PushState | null;
}

const PUSH_BLOCK_REASON: Record<PushBlockReason, NotificationsReason> = {
  insecure: 'needs-https',
  'needs-install': 'install-first',
  unsupported: 'unsupported',
  'worker-failed': 'worker-failed',
  limited: 'limited',
  unavailable: 'server-off',
  denied: 'denied',
};

function notificationsRow(push: PushState | null): Extract<Capability, { id: 'notifications' }> {
  const row = (tone: CapabilityTone, reason: NotificationsReason) =>
    ({ id: 'notifications', tone, reason }) as const;
  if (push === null) return row('neutral', 'server-off');
  switch (push.kind) {
    case 'checking':
      return row('neutral', 'checking');
    case 'error':
      return row('warn', 'error');
    case 'inactive':
      return row('neutral', 'available');
    case 'active':
      return row('ok', 'active');
    case 'blocked': {
      const reason = PUSH_BLOCK_REASON[push.reason];
      const calm = reason === 'server-off' || reason === 'limited' || reason === 'install-first';
      return row(calm ? 'neutral' : 'warn', reason);
    }
  }
}

/**
 * What works on the address the page was opened from. Every row is a fact about this browser and
 * this address: nothing is promised that the page cannot do right now.
 */
export function deriveCapabilities(input: CapabilityInput): Capability[] {
  const { guide, serviceWorker, push } = input;

  // A refused worker (untrusted certificate) leaves a plain app window: nothing offline, no push.
  const workerRefused = guide.secure && guide.result === 'app' && serviceWorker === 'failed';
  const installs: Extract<Capability, { id: 'installs-as' }> = {
    id: 'installs-as',
    tone: workerRefused
      ? 'warn'
      : guide.result === 'app'
        ? 'ok'
        : guide.result === 'none'
          ? 'warn'
          : 'neutral',
    reason: workerRefused ? 'window-without-worker' : guide.result,
  };

  let offline: Extract<Capability, { id: 'offline' }>;
  if (!guide.secure) offline = { id: 'offline', tone: 'warn', reason: 'needs-https' };
  else if (serviceWorker === 'unsupported') {
    offline = { id: 'offline', tone: 'warn', reason: 'unsupported' };
  } else if (serviceWorker === 'development') {
    offline = { id: 'offline', tone: 'neutral', reason: 'development' };
  } else if (serviceWorker === 'failed') {
    offline = { id: 'offline', tone: 'warn', reason: 'failed' };
  } else if (serviceWorker === 'active' || serviceWorker === 'waiting') {
    offline = { id: 'offline', tone: 'ok', reason: 'ready' };
  } else offline = { id: 'offline', tone: 'neutral', reason: 'preparing' };

  return [installs, offline, notificationsRow(push)];
}

/* ------------------------------------------------------------------------- HTTPS guidance */

export type HttpsOption = 'tailscale' | 'proxy' | 'caddy' | 'local-ca' | 'localhost';

function ipv4(hostname: string): [number, number, number, number] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return null;
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0];
}

/**
 * The ways to get a secure address, most fitting first for the address the page was opened from.
 * A Tailscale address suggests Tailscale, a LAN address Tailscale first (it needs no domain or
 * existing proxy) then a proxy or a local CA, a real domain name a proxy with a public certificate. Always at least three options, never a single "right" one.
 */
export function suggestHttpsOptions(hostname: string): HttpsOption[] {
  const host = hostname.toLowerCase();
  const ip = ipv4(host);
  if (host.endsWith('.ts.net') || (ip && ip[0] === 100 && ip[1] >= 64 && ip[1] <= 127)) {
    return ['tailscale', 'proxy', 'caddy', 'localhost'];
  }
  const privateIp =
    ip !== null &&
    (ip[0] === 10 ||
      (ip[0] === 172 && ip[1] >= 16 && ip[1] <= 31) ||
      (ip[0] === 192 && ip[1] === 168));
  const lanName =
    host.endsWith('.local') ||
    host.endsWith('.lan') ||
    host.endsWith('.home.arpa') ||
    (ip === null && !host.includes('.'));
  if (privateIp || lanName) return ['tailscale', 'proxy', 'local-ca', 'localhost'];
  if (ip === null && host.includes('.')) return ['proxy', 'caddy', 'tailscale', 'localhost'];
  return ['proxy', 'tailscale', 'local-ca', 'localhost'];
}
