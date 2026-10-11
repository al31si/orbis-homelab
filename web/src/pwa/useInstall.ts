import { useSyncExternalStore } from 'react';

/** Chromium's install prompt event (not in lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** Already running as an installed app: hide every install affordance. */
  standalone: boolean;
  /** Chromium can show its native install dialog right now. */
  canPrompt: boolean;
  /** iOS/iPadOS Safari (not installed): show "Condividi → Aggiungi alla schermata Home". */
  showIosHint: boolean;
  /** Service worker and installation require HTTPS (or localhost). */
  secureContext: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let snapshot = compute();

function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return (
    iosStandalone ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

function isIos(): boolean {
  const { userAgent, platform, maxTouchPoints } = navigator;
  // iPadOS 13+ reports itself as a Mac with a touch screen.
  return /iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
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
  return {
    standalone,
    canPrompt: !standalone && deferredPrompt !== null,
    showIosHint: !standalone && isIos(),
    secureContext: window.isSecureContext,
    promptInstall,
  };
}

function refresh(): void {
  snapshot = compute();
  for (const listener of listeners) listener();
}

// The event can fire before React mounts, so it is captured at module load.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  refresh();
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  refresh();
});

/** Install affordances for the current platform (Chromium prompt, iOS instructions). */
export function useInstall(): InstallState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}
