import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/boot';
import { useSession } from '@/data';
import { t } from '@/i18n';
import {
  currentSubscription,
  derivePushState,
  describePushError,
  detectPushSupport,
  disablePush,
  enablePush,
  fetchPushConfig,
  readNotificationPermission,
  sendTestPush,
  type PushEnvironment,
  type PushState,
} from './push';
import { useInstall } from './useInstall';

export type PushAction = 'enable' | 'disable' | 'test';

export type PushResult = { ok: true; sent?: number } | { ok: false; message: string };

export interface PushController {
  state: PushState;
  /** Devices registered on the server (this one included), null while unknown. */
  devices: number | null;
  /** Action in flight, if any. */
  busy: PushAction | null;
  enable: () => Promise<PushResult>;
  disable: () => Promise<PushResult>;
  sendTest: () => Promise<PushResult>;
  /** Re-reads the server configuration and this browser's subscription. */
  reload: () => Promise<void>;
}

interface Loaded {
  available: boolean;
  publicKey: string | null;
  devices: number;
  subscribed: boolean;
}

/** Server configuration plus this browser's subscription; null when either cannot be read. */
async function readState(): Promise<Loaded | null> {
  try {
    const [config, subscription] = await Promise.all([fetchPushConfig(), currentSubscription()]);
    return {
      available: config.available,
      publicKey: config.publicKey,
      devices: config.subscriptions,
      subscribed: subscription !== null,
    };
  } catch {
    return null;
  }
}

/** State machine behind the notification settings: what is possible, what is on, what to do next. */
export function usePush(): PushController {
  const app = useApp();
  const session = useSession();
  const install = useInstall();
  const [permission, setPermission] = useState(readNotificationPermission);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<PushAction | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const environment = useMemo<PushEnvironment>(
    () => ({
      secureContext: install.secureContext,
      support: detectPushSupport(),
      needsInstall: install.showIosHint,
      access: session?.access ?? null,
      permission,
      config: loaded && { available: loaded.available },
      subscribed: loaded?.subscribed ?? null,
      loadFailed,
    }),
    [install.secureContext, install.showIosHint, session?.access, permission, loaded, loadFailed],
  );
  const state = derivePushState(environment);

  // Nothing to fetch while the user still has something to fix first.
  const canLoad =
    derivePushState({
      ...environment,
      config: { available: true },
      subscribed: false,
      loadFailed: false,
    }).kind === 'inactive';

  const apply = useCallback((result: Loaded | null) => {
    if (!mounted.current) return;
    setPermission(readNotificationPermission());
    if (result) setLoaded(result);
    setLoadFailed(result === null);
  }, []);

  const reload = useCallback(async () => apply(await readState()), [apply]);

  useEffect(() => {
    if (!canLoad) return;
    let cancelled = false;
    void readState().then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [canLoad, apply]);

  // Coming back from the system settings: the permission may have changed meanwhile.
  useEffect(() => {
    function onVisible() {
      if (!document.hidden) setPermission(readNotificationPermission());
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const run = useCallback(
    async (action: PushAction, task: () => Promise<number | void>): Promise<PushResult> => {
      setBusy(action);
      try {
        const sent = await task();
        return typeof sent === 'number' ? { ok: true, sent } : { ok: true };
      } catch (error) {
        return { ok: false, message: describePushError(error, app.name) };
      } finally {
        if (mounted.current) setBusy(null);
        setPermission(readNotificationPermission());
      }
    },
    [app.name],
  );

  const enable = useCallback(async () => {
    const publicKey = loaded?.publicKey;
    if (!publicKey) return { ok: false, message: t('more.pushError.notConfigured') } as const;
    const result = await run('enable', () => enablePush(publicKey));
    await reload();
    return result;
  }, [loaded?.publicKey, reload, run]);

  const disable = useCallback(async () => {
    const result = await run('disable', disablePush);
    await reload();
    return result;
  }, [reload, run]);

  const sendTest = useCallback(() => run('test', sendTestPush), [run]);

  return { state, devices: loaded?.devices ?? null, busy, enable, disable, sendTest, reload };
}
