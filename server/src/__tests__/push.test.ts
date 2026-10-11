import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Alert, PushSubscriptionJson } from '../../../shared/api.js';
import { createTranslator } from '../i18n/index.js';
import { PushService, isAllowedEndpoint, notificationUrl, parseSubscription } from '../push.js';
import { tempDir, writeFiles } from './helpers/fixtures.js';

const log = { info: vi.fn(), warn: vi.fn() };

const sub = (n: number): PushSubscriptionJson => ({
  endpoint: `https://web.push.apple.com/${n}`,
  keys: { p256dh: 'k', auth: 'a' },
});

const alert = (over: Partial<Alert> = {}): Alert => ({
  id: 'service:media-server',
  severity: 'critical',
  source: 'service',
  title: 'Media Server is down',
  detail: '',
  since: '2026-01-01T00:00:00.000Z',
  serviceId: 'media-server',
  ...over,
});

const create = (dir: string, language: 'it' | 'en' = 'en') =>
  PushService.create({
    dataDir: dir,
    subject: 'mailto:ops@example.com',
    appId: 'demo',
    appName: 'Demo',
    t: createTranslator(language),
    log,
  });

afterEach(() => vi.restoreAllMocks());

describe('push subscription validation', () => {
  it('only accepts https endpoints of real push services (no SSRF)', () => {
    expect(isAllowedEndpoint('https://web.push.apple.com/abc')).toBe(true);
    expect(isAllowedEndpoint('https://fcm.googleapis.com/fcm/send/x')).toBe(true);
    expect(isAllowedEndpoint('https://updates.push.services.mozilla.com/x')).toBe(true);
    expect(isAllowedEndpoint('https://db5p.notify.windows.com/x')).toBe(true);
    expect(isAllowedEndpoint('http://web.push.apple.com/abc')).toBe(false);
    expect(isAllowedEndpoint('https://push.apple.com.evil.test/x')).toBe(false);
    expect(isAllowedEndpoint('https://127.0.0.1:8790/x')).toBe(false);
    expect(isAllowedEndpoint('not a url')).toBe(false);
  });

  it('requires keys and keeps only the known fields', () => {
    expect(
      parseSubscription({ endpoint: 'https://web.push.apple.com/x', keys: { p256dh: 'a' } }),
    ).toBeNull();
    expect(parseSubscription(null)).toBeNull();
    expect(
      parseSubscription({
        endpoint: 'https://web.push.apple.com/x',
        keys: { p256dh: 'a', auth: 'b' },
        extra: 'dropped',
      }),
    ).toEqual({ endpoint: 'https://web.push.apple.com/x', keys: { p256dh: 'a', auth: 'b' } });
  });
});

describe('notificationUrl', () => {
  it('points at the page of the source', () => {
    expect(notificationUrl(alert())).toBe('/services/media-server');
    expect(notificationUrl(alert({ source: 'storage', serviceId: null }))).toBe('/storage');
    expect(notificationUrl(alert({ source: 'system', serviceId: null }))).toBe('/system');
    expect(notificationUrl(alert({ source: 'monitor', serviceId: null }))).toBe('/');
  });
});

describe('PushService', () => {
  it('generates VAPID keys once and keeps them (vapid.json format)', async () => {
    const dir = tempDir();
    const first = await create(dir);
    await vi.waitFor(() => expect(fs.existsSync(path.join(dir, 'vapid.json'))).toBe(true));
    const second = await create(dir);
    expect(second.publicKey).toBe(first.publicKey);
    const file = JSON.parse(fs.readFileSync(path.join(dir, 'vapid.json'), 'utf8')) as object;
    expect(Object.keys(file).sort()).toEqual(['privateKey', 'publicKey']);
  });

  it('keeps the subscriptions of an existing install (push.json format)', async () => {
    const dir = tempDir();
    const keys = webpush.generateVAPIDKeys();
    writeFiles(dir, {
      'vapid.json': JSON.stringify(keys),
      'push.json': JSON.stringify({ subscriptions: [sub(1), sub(2)] }),
    });
    const service = await create(dir);
    expect(service.publicKey).toBe(keys.publicKey);
    expect(service.count()).toBe(2);
  });

  it('caps subscriptions but lets a known endpoint refresh', async () => {
    const service = await create(tempDir());
    for (let n = 0; n < 20; n += 1) expect(service.add(sub(n))).toBe(true);
    expect(service.add(sub(99))).toBe(false);
    expect(service.add(sub(3))).toBe(true);
    expect(service.count()).toBe(20);
    service.remove(sub(3).endpoint);
    expect(service.count()).toBe(19);
  });

  it('sends alert notifications with translated prefix, tag namespaced by app id and url', async () => {
    const send = vi.spyOn(webpush, 'sendNotification').mockResolvedValue({
      statusCode: 201,
      body: '',
      headers: {},
    });
    const service = await create(tempDir());
    service.add(sub(1));

    await service.notifyAlert({ kind: 'raised', alert: alert() });
    await service.notifyAlert({ kind: 'cleared', alert: alert({ detail: 'Back up' }) });

    const payloads = send.mock.calls.map((c) => JSON.parse(c[1] as string) as object);
    expect(payloads).toEqual([
      {
        title: 'Demo: Media Server is down',
        body: 'Critical problem detected.',
        tag: 'demo:service:media-server',
        url: '/services/media-server',
      },
      {
        title: 'Demo · resolved: Media Server is down',
        body: 'Back up',
        tag: 'demo:service:media-server',
        url: '/services/media-server',
      },
    ]);
  });

  it('writes notification texts in the instance language', async () => {
    const send = vi.spyOn(webpush, 'sendNotification').mockResolvedValue({
      statusCode: 201,
      body: '',
      headers: {},
    });
    const service = await create(tempDir(), 'it');
    service.add(sub(1));
    await service.notifyAlert({ kind: 'cleared', alert: alert() });
    await service.sendTest();
    const [cleared, test] = send.mock.calls.map((c) => JSON.parse(c[1] as string) as object);
    expect(cleared).toMatchObject({
      title: 'Demo · risolto: Media Server is down',
      body: 'Il problema è rientrato.',
    });
    expect(test).toEqual({
      title: 'Demo',
      body: 'Notifica di prova: le notifiche funzionano.',
      tag: 'demo:test',
      url: '/more',
    });
  });

  it('does not contact anyone without subscriptions, and drops expired ones', async () => {
    const send = vi
      .spyOn(webpush, 'sendNotification')
      .mockRejectedValue(Object.assign(new Error('gone'), { statusCode: 410 }));
    const service = await create(tempDir());
    await service.notifyAlert({ kind: 'raised', alert: alert() });
    expect(send).not.toHaveBeenCalled();

    service.add(sub(1));
    expect(await service.sendTest()).toBe(0);
    expect(service.count()).toBe(0);
  });
});
