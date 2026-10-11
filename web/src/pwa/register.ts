import { useSyncExternalStore } from 'react';

let waiting: ServiceWorker | null = null;
let updateRequested = false;
const listeners = new Set<() => void>();

function setWaiting(worker: ServiceWorker | null): void {
  waiting = worker;
  for (const listener of listeners) listener();
}

function track(registration: ServiceWorkerRegistration): void {
  // A worker that finished installing while another one controls the page waits for our OK.
  if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    installing?.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        setWaiting(installing);
      }
    });
  });
}

/**
 * Registers `/sw.js` in production builds on secure origins (HTTPS or localhost). Failures are
 * logged and otherwise ignored: the app works without a service worker.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // The very first install also claims the page; only reload for an update the user confirmed.
    if (updateRequested) window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        track(registration);
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) void registration.update().catch(() => undefined);
        });
      })
      .catch((error: unknown) => console.warn('Service worker non registrato', error));
  });
}

/**
 * Asks the waiting worker to take over; the page reloads once it does.
 * Returns false when there is no update waiting (nothing was done).
 */
export function applyServiceWorkerUpdate(): boolean {
  if (!waiting) return false;
  updateRequested = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  return true;
}

/** True when a new version of the app is installed and waiting for confirmation. */
export function useServiceWorkerUpdate(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waiting !== null,
  );
}
