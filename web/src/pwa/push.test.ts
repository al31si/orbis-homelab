import { describe, expect, it } from 'vitest';
import { ApiError } from '@/data/api';
import { t } from '@/i18n';
import {
  PushError,
  derivePushState,
  describePushError,
  toSubscriptionJson,
  urlBase64ToUint8Array,
  type PushEnvironment,
} from './push';

const READY: PushEnvironment = {
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

describe('urlBase64ToUint8Array', () => {
  it('decodes base64url without padding', () => {
    // 0xfb 0xff 0xfe encodes to "-__-" in base64url and "+//+" in base64.
    expect([...urlBase64ToUint8Array('-__-')]).toEqual([0xfb, 0xff, 0xfe]);
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([1, 2, 3]);
    expect([...urlBase64ToUint8Array('AQI')]).toEqual([1, 2]);
    expect([...urlBase64ToUint8Array('AQ')]).toEqual([1]);
  });

  it('turns the 65 byte VAPID public key into 65 bytes', () => {
    const key =
      'BAK_8vFEDftHZIxeTpwKc3B--Oiqqe6Zqmb6db2bckuya6bChsDCdZ2_zZ4S_KTb3w-9fkEttufb8LWx4PzYX3g';
    const bytes = urlBase64ToUint8Array(key);
    expect(bytes).toHaveLength(65);
    expect(bytes[0]).toBe(4);
  });
});

describe('derivePushState', () => {
  it('is inactive when everything is in place but not subscribed', () => {
    expect(derivePushState(READY)).toEqual({ kind: 'inactive' });
  });

  it('is active only with both a subscription and the permission', () => {
    expect(derivePushState({ ...READY, subscribed: true, permission: 'granted' })).toEqual({
      kind: 'active',
    });
    expect(derivePushState({ ...READY, subscribed: true, permission: 'default' })).toEqual({
      kind: 'inactive',
    });
  });

  it('reports the blocker the user can act on first', () => {
    const insecure = derivePushState({
      ...READY,
      secureContext: false,
      access: 'limited',
      needsInstall: true,
    });
    expect(insecure).toEqual({ kind: 'blocked', reason: 'insecure' });
    expect(
      derivePushState({
        ...READY,
        needsInstall: true,
        support: { ...READY.support, pushManager: false },
      }),
    ).toEqual({
      kind: 'blocked',
      reason: 'needs-install',
    });
    expect(
      derivePushState({ ...READY, support: { ...READY.support, notification: false } }),
    ).toEqual({
      kind: 'blocked',
      reason: 'unsupported',
    });
    expect(derivePushState({ ...READY, workerFailed: true })).toEqual({
      kind: 'blocked',
      reason: 'worker-failed',
    });
    // limited access is the more fundamental blocker: a working worker would not help
    expect(derivePushState({ ...READY, workerFailed: true, access: 'limited' })).toEqual({
      kind: 'blocked',
      reason: 'limited',
    });
    expect(derivePushState({ ...READY, access: 'limited' })).toEqual({
      kind: 'blocked',
      reason: 'limited',
    });
    expect(derivePushState({ ...READY, permission: 'denied' })).toEqual({
      kind: 'blocked',
      reason: 'denied',
    });
    expect(derivePushState({ ...READY, config: { available: false } })).toEqual({
      kind: 'blocked',
      reason: 'unavailable',
    });
  });

  it('waits for the session and the server before deciding', () => {
    expect(derivePushState({ ...READY, access: null })).toEqual({ kind: 'checking' });
    expect(derivePushState({ ...READY, config: null, subscribed: null })).toEqual({
      kind: 'checking',
    });
  });

  it('offers a retry only when nothing could be loaded', () => {
    expect(derivePushState({ ...READY, config: null, subscribed: null, loadFailed: true })).toEqual(
      { kind: 'error' },
    );
    expect(derivePushState({ ...READY, loadFailed: true })).toEqual({ kind: 'inactive' });
  });
});

describe('toSubscriptionJson', () => {
  it('keeps the endpoint and both keys', () => {
    expect(
      toSubscriptionJson({
        endpoint: 'https://fcm.googleapis.com/x',
        keys: { p256dh: 'p', auth: 'a' },
      }),
    ).toEqual({
      endpoint: 'https://fcm.googleapis.com/x',
      expirationTime: null,
      keys: { p256dh: 'p', auth: 'a' },
    });
  });

  it('rejects an incomplete subscription instead of posting it', () => {
    expect(() =>
      toSubscriptionJson({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'p' } }),
    ).toThrow(PushError);
    expect(() => toSubscriptionJson({ keys: { p256dh: 'p', auth: 'a' } })).toThrow(PushError);
  });
});

describe('describePushError', () => {
  const NAME = 'Example';

  it('explains the server answers the user can act on', () => {
    expect(describePushError(new ApiError('x', 'http', 409), NAME)).toBe(
      t('more.pushError.tooManyDevices'),
    );
    expect(describePushError(new ApiError('x', 'http', 403), NAME)).toBe(
      t('more.pushError.forbidden'),
    );
    expect(describePushError(new ApiError('x', 'http', 400), NAME)).toBe(
      t('more.pushError.rejected'),
    );
    expect(describePushError(new ApiError('x', 'network'), NAME)).toBe(
      t('more.pushError.unreachable', { name: NAME }),
    );
    expect(describePushError(new ApiError('x', 'http', 500), NAME)).toBe(
      t('more.pushError.server', { status: 500 }),
    );
  });

  it('explains the failures the push flow raises itself', () => {
    expect(describePushError(new PushError('permission-denied'), NAME)).toBe(
      t('more.pushError.permissionDenied', { name: NAME }),
    );
    expect(describePushError(new PushError('permission-dismissed'), NAME)).toBe(
      t('more.pushError.permissionDismissed'),
    );
    expect(describePushError(new PushError('no-service-worker'), NAME)).toBe(
      t('more.pushError.noServiceWorker'),
    );
  });

  it('explains browser failures and never leaks raw error text', () => {
    const denied = new DOMException('secret internal text', 'NotAllowedError');
    expect(describePushError(denied, NAME)).toBe(t('more.pushError.browserDenied'));
    expect(describePushError(new DOMException('x', 'AbortError'), NAME)).toBe(
      t('more.pushError.pushService'),
    );
    const unknown = describePushError(new Error('boom'), NAME);
    expect(unknown).toBe(t('more.pushError.generic'));
    expect(unknown).not.toContain('boom');
  });
});
