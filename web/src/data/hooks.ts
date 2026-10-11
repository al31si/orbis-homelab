import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Session } from '@shared/api';
import { useNow } from '@/lib/useNow';
import { useDataStore } from './DataProvider';
import type { EndpointKey, EndpointMap, RemoteSnapshotOptions } from './endpoints';
import { deriveStatus, type SnapshotStatus } from './status';
import type { ConnectionState, DataStore } from './store';

export interface SnapshotResult<T> {
  /** Last known payload (from memory or the persisted copy), null until the first success. */
  data: T | null;
  status: SnapshotStatus;
  /** Epoch ms of the last successful collection, null if unknown. */
  fetchedAt: number | null;
  /** Human readable reason when `status` is `error`, `stale` or `offline`. */
  error: string | null;
  /** A request is currently in flight (also true for background polls). */
  refreshing: boolean;
  intervalMs: number;
  /** Fetch now; resolves when the request settles. Never rejects. */
  refresh: () => Promise<void>;
}

/** How often derived status (staleness) is re-evaluated. */
const STATUS_TICK_MS = 5_000;

function useEntry<T>(store: DataStore, key: string): SnapshotResult<T> {
  const state = useSyncExternalStore(
    useCallback((listener) => store.subscribe(key, listener), [store, key]),
    () => store.getState<T>(key),
  );
  const connection = useConnection();
  const now = useNow(STATUS_TICK_MS);
  const refresh = useCallback(() => store.refresh(key), [store, key]);

  return useMemo(
    () => ({
      data: state.data,
      status: deriveStatus(
        {
          hasData: state.data !== null,
          fetchedAt: state.fetchedAt,
          intervalMs: state.intervalMs,
          snapshotError: state.snapshotError,
          fetchError: state.fetchError,
          offline: connection.status === 'offline',
        },
        now,
      ),
      fetchedAt: state.fetchedAt,
      error: state.fetchError ?? state.snapshotError,
      refreshing: state.refreshing,
      intervalMs: state.intervalMs,
      refresh,
    }),
    [state, connection.status, now, refresh],
  );
}

/**
 * Subscribes to one built-in endpoint. All components using the same key share one poller, which
 * runs only while the page is visible and at least one component is mounted.
 */
export function useSnapshot<K extends EndpointKey>(key: K): SnapshotResult<EndpointMap[K]> {
  return useEntry<EndpointMap[K]>(useDataStore(), key);
}

/**
 * Same machinery for any `/api` path (extension data): shared visibility-aware poller, backoff,
 * persisted last value. `path` is relative to `/api` (`/x/my-ext/status`; a leading `/api` is
 * tolerated). `options` are read when the path is first used; later differing options are ignored.
 */
export function useRemoteSnapshot<T>(
  path: string,
  options: RemoteSnapshotOptions,
): SnapshotResult<T> {
  const store = useDataStore();
  const key = store.defineRemote(path, options);
  return useEntry<T>(store, key);
}

/** Global BFF reachability plus the time of the latest data we hold. */
export function useConnection(): ConnectionState {
  const store = useDataStore();
  return useSyncExternalStore(
    useCallback((listener) => store.subscribeConnection(listener), [store]),
    () => store.getConnection(),
  );
}

/** Refreshes every endpoint currently on screen (pull-to-refresh, retry buttons). */
export function useRefreshAll(): () => Promise<void> {
  const store = useDataStore();
  return useCallback(() => store.refreshActive(), [store]);
}

/** The BFF session (`access`, `secureUrl`...), or null until known. */
export function useSession(): Session | null {
  return useSnapshot('session').data;
}
