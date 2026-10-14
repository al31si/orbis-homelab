import { useSyncExternalStore } from 'react';
import {
  deriveInstallGuide,
  identifyBrowser,
  type BrowserInfo,
  type InstallGuide,
} from './installGuide';

/** Chromium's install prompt event (not in lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Brave hides itself in the user agent and answers this instead. */
type BraveNavigator = Navigator & { brave?: { isBrave: () => Promise<boolean> } };

export interface InstallState {
  /** Already running as an installed app or in a standalone window: hide every install affordance. */
  standalone: boolean;
  /** The browser can show its own install dialog right now (secure context only). */
  canPrompt: boolean;
  /** iOS/iPadOS and not installed: Add to Home Screen instructions apply. */
  showIosHint: boolean;
  /** Service worker, offline mode, Web Push and the install dialog need HTTPS (or localhost). */
  secureContext: boolean;
  /** This device has been seen installing or running the app (best effort, per browser profile). */
  installedHere: boolean;
  browser: BrowserInfo;
  /** What to tell this visitor, from the browser and the address (see `installGuide.ts`). */
  guide: InstallGuide;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isBrave = false;
/** Storage key of the "installed here" memory; null until `initInstall` knows the app id. */
let installedKey: string | null = null;
let installedHere = false;
const listeners = new Set<() => void>();
let snapshot = compute();

function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return (
    iosStandalone ||
    ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(
      (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
    )
  );
}

function rememberInstalled(value: boolean): void {
  installedHere = value;
  if (installedKey === null) return;
  try {
    if (value) localStorage.setItem(installedKey, '1');
    else localStorage.removeItem(installedKey);
  } catch {
    /* storage disabled: the memory only lasts for this page */
  }
}

async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferredPrompt;
  if (!event) return 'unavailable';
  deferredPrompt = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  refresh();
  return outcome;
}

function compute(): InstallState {
  const standalone = isStandalone();
  const browser = identifyBrowser({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    isBrave,
  });
  const secureContext = window.isSecureContext;
  const canPrompt = !standalone && secureContext && deferredPrompt !== null;
  return {
    standalone,
    canPrompt,
    showIosHint: !standalone && browser.os === 'ios',
    secureContext,
    installedHere,
    browser,
    guide: deriveInstallGuide({ browser, secureContext, standalone, installedHere, canPrompt }),
    promptInstall,
  };
}

function refresh(): void {
  snapshot = compute();
  for (const listener of listeners) listener();
}

/**
 * Called once the app id is known (after the boot config is loaded). Running as the app, or having
 * seen the `appinstalled` event, is remembered under `<app.id>.installed` so that a later visit in
 * a browser tab says "already installed" instead of explaining the installation again.
 */
export function initInstall(appId: string): void {
  installedKey = `${appId}.installed`;
  try {
    installedHere = installedHere || localStorage.getItem(installedKey) === '1';
  } catch {
    /* storage disabled */
  }
  if (isStandalone() || installedHere) rememberInstalled(true);
  refresh();
}

// The event can fire before React mounts, so it is captured at module load (this module is part
// of the main bundle: `main.tsx` imports it).
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  // The browser only offers the dialog while the app is not installed: forget an old "installed".
  rememberInstalled(false);
  refresh();
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  rememberInstalled(true);
  refresh();
});
(navigator as BraveNavigator).brave
  ?.isBrave()
  .then((brave) => {
    isBrave = brave;
    refresh();
  })
  .catch(() => undefined);

/** Install affordances for this browser and address (see `InstallState.guide`). */
export function useInstall(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}
