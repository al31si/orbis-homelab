import { useEffect, useState, useSyncExternalStore } from 'react';
import { SW_FAILED_EVENT, serviceWorkerRegistrationFailed } from './register';
import { useInstall } from './useInstall';

export type ServiceWorkerStatus =
  | 'unsupported'
  | 'insecure'
  /** Development server: the worker is only registered in production builds. */
  | 'development'
  | 'none'
  /** Secure origin but the browser refused the worker: usually a certificate it does not trust. */
  | 'failed'
  | 'installing'
  | 'waiting'
  | 'active';

export interface ClientInfo {
  serviceWorker: ServiceWorkerStatus;
  /** Build id baked into the active service worker (identifies the installed app version). */
  buildId: string | null;
  standalone: boolean;
  secureContext: boolean;
  displayMode: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  online: boolean;
  viewport: {
    innerWidth: number;
    innerHeight: number;
    screenWidth: number;
    screenHeight: number;
    safeAreaInsets: { top: number; bottom: number };
  };
}

const VERSION_TIMEOUT_MS = 2_000;

/** Resolve CSS environment values to rounded CSS pixels without affecting the document height. */
export function readSafeAreaInsets(): ClientInfo['viewport']['safeAreaInsets'] {
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = `
    position: fixed;
    visibility: hidden;
    pointer-events: none;
    width: 0;
    height: 0;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  `;
  document.body.appendChild(probe);
  try {
    const style = getComputedStyle(probe);
    return {
      top: Math.round(Number.parseFloat(style.paddingTop) || 0),
      bottom: Math.round(Number.parseFloat(style.paddingBottom) || 0),
    };
  } finally {
    probe.remove();
  }
}

function readViewport(): ClientInfo['viewport'] {
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    safeAreaInsets: readSafeAreaInsets(),
  };
}

function displayMode(): ClientInfo['displayMode'] {
  for (const mode of ['standalone', 'fullscreen', 'minimal-ui'] as const) {
    if (window.matchMedia(`(display-mode: ${mode})`).matches) return mode;
  }
  return 'browser';
}

function subscribeOnline(listener: () => void): () => void {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

async function workerStatus(): Promise<ServiceWorkerStatus> {
  if (!('serviceWorker' in navigator)) return 'unsupported';
  if (!window.isSecureContext) return 'insecure';
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    if (!import.meta.env.PROD) return 'development';
    return serviceWorkerRegistrationFailed() ? 'failed' : 'none';
  }
  if (registration.waiting) return 'waiting';
  if (registration.installing) return 'installing';
  return registration.active ? 'active' : 'none';
}

function askBuildId(worker: ServiceWorker): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => finish(null), VERSION_TIMEOUT_MS);
    function finish(value: string | null) {
      window.clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('message', onMessage);
      resolve(value);
    }
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; buildId?: unknown } | null;
      if (data?.type === 'VERSION') finish(typeof data.buildId === 'string' ? data.buildId : null);
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'GET_VERSION' });
  });
}

/** What this device/browser can do and which app build it runs (for settings and diagnostics). */
export function useClientInfo(): ClientInfo {
  const install = useInstall();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
  const [viewport, setViewport] = useState(readViewport);
  const [worker, setWorker] = useState<{ status: ServiceWorkerStatus; buildId: string | null }>({
    status: 'none',
    buildId: null,
  });

  useEffect(() => {
    let frame: number | null = null;
    const refresh = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        setViewport(readViewport());
      });
    };
    refresh();
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    window.addEventListener('pageshow', refresh);
    window.visualViewport?.addEventListener('resize', refresh);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      window.removeEventListener('pageshow', refresh);
      window.visualViewport?.removeEventListener('resize', refresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function read() {
      const status = await workerStatus();
      const controller = 'serviceWorker' in navigator ? navigator.serviceWorker.controller : null;
      const buildId = controller ? await askBuildId(controller) : null;
      if (!cancelled) setWorker({ status, buildId });
    }
    void read();
    if (!('serviceWorker' in navigator)) return;
    const onChange = () => void read();
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    window.addEventListener(SW_FAILED_EVENT, onChange);
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      window.removeEventListener(SW_FAILED_EVENT, onChange);
    };
  }, []);

  return {
    serviceWorker: worker.status,
    buildId: worker.buildId,
    standalone: install.standalone,
    secureContext: install.secureContext,
    displayMode: displayMode(),
    online,
    viewport,
  };
}
