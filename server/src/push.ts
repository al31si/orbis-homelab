import path from 'node:path';
import webpush from 'web-push';
import type { Alert, PushSubscriptionJson } from '../../shared/api.js';
import type { AlertNotification } from './core/types.js';
import type { T } from './i18n/index.js';
import { JsonStore } from './lib/store.js';

interface VapidFile {
  publicKey: string;
  privateKey: string;
}
interface SubscriptionsFile {
  subscriptions: PushSubscriptionJson[];
}

/** Only real browser push services are accepted: the BFF POSTs to whatever endpoint is stored. */
const ALLOWED_PUSH_HOSTS = [
  /(^|\.)push\.apple\.com$/,
  /^fcm\.googleapis\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
];
const MAX_SUBSCRIPTIONS = 20;

export function isAllowedEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && ALLOWED_PUSH_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

export function parseSubscription(body: unknown): PushSubscriptionJson | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const keys = b.keys as Record<string, unknown> | undefined;
  if (
    typeof b.endpoint !== 'string' ||
    !isAllowedEndpoint(b.endpoint) ||
    typeof keys?.p256dh !== 'string' ||
    typeof keys.auth !== 'string'
  ) {
    return null;
  }
  return { endpoint: b.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export function notificationUrl(alert: Alert): string {
  if (alert.serviceId && alert.source === 'service') return `/services/${alert.serviceId}`;
  if (alert.source === 'storage') return '/storage';
  if (alert.source === 'system') return '/system';
  return '/';
}

export interface PushServiceOptions {
  dataDir: string;
  /** VAPID contact claim (`mailto:` or `https:`), from `push.subject`. */
  subject: string;
  /** `app.id`: prefixes notification tags so several instances never replace each other's. */
  appId: string;
  /** Name shown in notification titles. */
  appName: string;
  t: T;
  log: PushService['log'];
}

export class PushService {
  private constructor(
    private readonly vapid: VapidFile,
    private readonly subs: JsonStore<SubscriptionsFile>,
    private readonly log: { warn: (o: object, m: string) => void; info: (m: string) => void },
    private readonly texts: Pick<PushServiceOptions, 'appId' | 'appName' | 't'>,
    subject: string,
  ) {
    webpush.setVapidDetails(subject, vapid.publicKey, vapid.privateKey);
  }

  /** `vapid.json` and `push.json` keep their format, so existing subscriptions survive. */
  static async create(opts: PushServiceOptions): Promise<PushService> {
    const vapidStore = await JsonStore.open<Partial<VapidFile>>(
      path.join(opts.dataDir, 'vapid.json'),
      {},
    );
    let keys = vapidStore.get();
    if (!keys.publicKey || !keys.privateKey) {
      keys = webpush.generateVAPIDKeys();
      vapidStore.update((v) => Object.assign(v, keys));
      await vapidStore.flush();
      opts.log.info('generated new VAPID keypair');
    }
    const subs = await JsonStore.open<SubscriptionsFile>(path.join(opts.dataDir, 'push.json'), {
      subscriptions: [],
    });
    return new PushService(keys as VapidFile, subs, opts.log, opts, opts.subject);
  }

  get publicKey(): string {
    return this.vapid.publicKey;
  }

  count(): number {
    return this.subs.get().subscriptions.length;
  }

  add(sub: PushSubscriptionJson): boolean {
    const list = this.subs.get().subscriptions;
    if (!list.some((s) => s.endpoint === sub.endpoint) && list.length >= MAX_SUBSCRIPTIONS) {
      return false;
    }
    this.subs.update((s) => {
      s.subscriptions = [...s.subscriptions.filter((x) => x.endpoint !== sub.endpoint), sub];
    });
    return true;
  }

  remove(endpoint: string): void {
    this.subs.update((s) => {
      s.subscriptions = s.subscriptions.filter((x) => x.endpoint !== endpoint);
    });
  }

  async sendAll(payload: {
    title: string;
    body: string;
    tag: string;
    url: string;
  }): Promise<number> {
    const message = JSON.stringify(payload);
    let sent = 0;
    for (const sub of [...this.subs.get().subscriptions]) {
      try {
        await webpush.sendNotification(sub, message, { TTL: 3600, urgency: 'high' });
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) this.remove(sub.endpoint);
        this.log.warn({ status }, 'push delivery failed');
      }
    }
    return sent;
  }

  async notifyAlert(n: AlertNotification): Promise<void> {
    if (this.count() === 0) return;
    const { appId, appName, t } = this.texts;
    const prefix = t(n.kind === 'raised' ? 'push.prefix.raised' : 'push.prefix.cleared', {
      app: appName,
    });
    await this.sendAll({
      title: `${prefix}: ${n.alert.title}`,
      body: n.alert.detail || t(n.kind === 'raised' ? 'push.body.raised' : 'push.body.cleared'),
      tag: `${appId}:${n.alert.id}`,
      url: notificationUrl(n.alert),
    });
  }

  /** Notification used by the "send a test" button in Settings. */
  sendTest(): Promise<number> {
    const { appId, appName, t } = this.texts;
    return this.sendAll({
      title: appName,
      body: t('push.test.body'),
      tag: `${appId}:test`,
      url: '/more',
    });
  }
}
