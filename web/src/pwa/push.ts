import type { AccessLevel, PushConfig, PushSubscriptionJson } from '@shared/api';
import { ApiError, apiFetch } from '@/data/api';
import { t } from '@/i18n';

/* ------------------------------------------------------------- pure helpers */

/** Web Push public keys travel as base64url; `pushManager.subscribe` wants raw bytes. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64Url.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export type PushBlockReason =
  | 'insecure'
  | 'needs-install'
  | 'unsupported'
  | 'worker-failed'
  | 'limited'
  | 'unavailable'
  | 'denied';

export type PushState =
  | { kind: 'checking' }
  | { kind: 'error' }
  | { kind: 'blocked'; reason: PushBlockReason }
  | { kind: 'inactive' }
  | { kind: 'active' };

export interface PushEnvironment {
  secureContext: boolean;
  support: { serviceWorker: boolean; pushManager: boolean; notification: boolean };
  /** The browser refused to register the service worker (usually an untrusted certificate). */
  workerFailed: boolean;
  /** iOS/iPadOS in a browser tab: web push only exists in the installed app. */
  needsInstall: boolean;
  /** Null until the session is known. */
  access: AccessLevel | null;
  /** Null when the Notification API is missing. */
  permission: NotificationPermission | null;
  /** Server configuration, null until fetched. */
  config: Pick<PushConfig, 'available'> | null;
  /** Whether this browser holds a push subscription, null until checked. */
  subscribed: boolean | null;
  /** The last attempt to read the server configuration failed. */
  loadFailed: boolean;
}

/**
 * The one place that decides what the notification settings should say. Blockers that can only
 * be fixed by the user (address, installation, browser) come first, network state last.
 */
export function derivePushState(env: PushEnvironment): PushState {
  if (!env.secureContext) return { kind: 'blocked', reason: 'insecure' };
  if (env.needsInstall) return { kind: 'blocked', reason: 'needs-install' };
  const { serviceWorker, pushManager, notification } = env.support;
  if (!serviceWorker || !pushManager || !notification) {
    return { kind: 'blocked', reason: 'unsupported' };
  }
  if (env.access === 'limited') return { kind: 'blocked', reason: 'limited' };
  if (env.workerFailed) return { kind: 'blocked', reason: 'worker-failed' };
  if (env.access === null) return { kind: 'checking' };
  if (env.permission === 'denied') return { kind: 'blocked', reason: 'denied' };
  if (env.config === null || env.subscribed === null) {
    return env.loadFailed ? { kind: 'error' } : { kind: 'checking' };
  }
  if (!env.config.available) return { kind: 'blocked', reason: 'unavailable' };
  return env.subscribed && env.permission === 'granted' ? { kind: 'active' } : { kind: 'inactive' };
}

/** Failures the push flow reports itself, as opposed to browser or HTTP errors. */
export class PushError extends Error {
  constructor(
    readonly code:
      'no-service-worker' | 'permission-denied' | 'permission-dismissed' | 'invalid-subscription',
  ) {
    super(code);
    this.name = 'PushError';
  }
}

/** User-facing explanation (in the instance language) of why a push action failed. */
export function describePushError(error: unknown, appName: string): string {
  if (error instanceof PushError) {
    switch (error.code) {
      case 'no-service-worker':
        return t('more.pushError.noServiceWorker');
      case 'permission-denied':
        return t('more.pushError.permissionDenied', { name: appName });
      case 'permission-dismissed':
        return t('more.pushError.permissionDismissed');
      case 'invalid-subscription':
        return t('more.pushError.incompleteSubscription');
    }
  }
  if (error instanceof ApiError) {
    if (error.kind === 'network' || error.kind === 'timeout') {
      return t('more.pushError.unreachable', { name: appName });
    }
    if (error.status === 403) return t('more.pushError.forbidden');
    if (error.status === 409) return t('more.pushError.tooManyDevices');
    if (error.status === 400) return t('more.pushError.rejected');
    return t('more.pushError.server', { status: error.status });
  }
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError') return t('more.pushError.browserDenied');
  if (name === 'AbortError' || name === 'NetworkError') return t('more.pushError.pushService');
  return t('more.pushError.generic');
}

/** `PushSubscription.toJSON()` with the keys the server requires checked. */
export function toSubscriptionJson(json: {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: Record<string, string>;
}): PushSubscriptionJson {
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new PushError('invalid-subscription');
  }
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { p256dh, auth },
  };
}

/* ------------------------------------------------------------ browser access */

export function detectPushSupport(): PushEnvironment['support'] {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
  };
}

export function readNotificationPermission(): NotificationPermission | null {
  return 'Notification' in window ? Notification.permission : null;
}

/** The registration of `/sw.js`; it only exists in production builds on secure origins. */
async function registration(): Promise<ServiceWorkerRegistration> {
  const found = await navigator.serviceWorker.getRegistration();
  if (!found) {
    throw new PushError('no-service-worker');
  }
  return found.active ? found : navigator.serviceWorker.ready;
}

/** This browser's push subscription, null when there is none (or no service worker yet). */
export async function currentSubscription(): Promise<PushSubscription | null> {
  const found = await navigator.serviceWorker.getRegistration();
  return found ? found.pushManager.getSubscription() : null;
}

export function fetchPushConfig(signal?: AbortSignal): Promise<PushConfig> {
  return apiFetch<PushConfig>('/push/config', { signal });
}

async function subscribeWithKey(reg: ServiceWorkerRegistration, key: Uint8Array<ArrayBuffer>) {
  const options = { userVisibleOnly: true, applicationServerKey: key };
  try {
    return await reg.pushManager.subscribe(options);
  } catch (error) {
    // A subscription made with a different server key blocks a new one: replace it.
    if (!(error instanceof DOMException) || error.name !== 'InvalidStateError') throw error;
    await (await reg.pushManager.getSubscription())?.unsubscribe();
    return reg.pushManager.subscribe(options);
  }
}

/**
 * Asks for permission, subscribes this browser and registers the subscription on the server.
 * Must run from a user gesture: the permission prompt is the very first await.
 */
export async function enablePush(publicKey: string): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new PushError(permission === 'denied' ? 'permission-denied' : 'permission-dismissed');
  }
  const reg = await registration();
  const subscription = await subscribeWithKey(reg, urlBase64ToUint8Array(publicKey));
  try {
    await apiFetch('/push/subscribe', {
      method: 'POST',
      body: toSubscriptionJson(subscription.toJSON()),
    });
  } catch (error) {
    // Do not leave a browser subscription the server does not know about.
    await subscription.unsubscribe().catch(() => false);
    throw error;
  }
}

/** Removes this browser's subscription from the server first, then from the browser. */
export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await apiFetch('/push/unsubscribe', {
    method: 'POST',
    body: { endpoint: subscription.endpoint },
  });
  await subscription.unsubscribe();
}

/** Sends a test notification to every registered device; resolves with how many were reached. */
export async function sendTestPush(): Promise<number> {
  const { sent } = await apiFetch<{ sent: number }>('/push/test', { method: 'POST', body: {} });
  return sent;
}
