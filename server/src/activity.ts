import type {
  AccessLevel,
  ActivityInfo,
  EventLogEntry,
  MediaQueueInfo,
  PlaybackInfo,
  Snapshot,
  TasksInfo,
  UsageEntry,
} from '../../shared/api.js';
import type { ArrApp } from './integrations/arr.js';
import { ARR_TYPES } from './integrations/arr.js';
import type { JellyfinData } from './integrations/jellyfin.js';
import type { Integration } from './integrations/index.js';

/** Snapshot with the data mapped, metadata untouched. */
function mapSnapshot<T, U>(snap: Snapshot<T>, fn: (data: T) => U): Snapshot<U> {
  return { ...snap, data: snap.data === null ? null : fn(snap.data) };
}

/** Oldest time of the list; null as soon as one entry never succeeded. */
function oldest(times: (string | null)[]): string | null {
  const valid = times.filter((t): t is string => t !== null).sort();
  return times.some((t) => t === null) ? null : (valid[0] ?? null);
}

export interface ActivityInputs {
  level: AccessLevel;
  events: EventLogEntry[];
  usage: UsageEntry[];
  /** Built-in integrations only (extensions render their own sections). */
  integrations: readonly Integration[];
}

/**
 * Each optional section is `null` unless an integration of its type is declared and running;
 * with `level !== 'full'` private fields (task titles, playback sessions) are withheld.
 */
export function buildActivity(input: ActivityInputs): ActivityInfo {
  const { integrations } = input;
  const restricted = input.level !== 'full';
  const snap = <T>(type: Integration['type']): Snapshot<T> | null =>
    (integrations.find((i) => i.type === type)?.collector?.snapshot() as Snapshot<T> | undefined) ??
    null;

  const tasks = snap<Omit<TasksInfo, 'restricted'>>('vikunja');
  const playback = snap<JellyfinData>('jellyfin');
  const arrApps = integrations
    .filter((i) => (ARR_TYPES as string[]).includes(i.type) && i.collector)
    .map((i) => i.collector!.snapshot() as Snapshot<ArrApp>);
  const mediaQueue: Snapshot<MediaQueueInfo> | null =
    arrApps.length === 0
      ? null
      : {
          data: { apps: arrApps.flatMap((a) => (a.data ? [a.data] : [])) },
          fetchedAt: oldest(arrApps.map((a) => a.fetchedAt)),
          error: arrApps.find((a) => a.error)?.error ?? null,
          intervalMs: arrApps[0]!.intervalMs,
        };

  return {
    events: input.events,
    usage: input.usage,
    tasks:
      tasks && mapSnapshot(tasks, (t) => ({ ...t, restricted, items: restricted ? [] : t.items })),
    downloads: snap('qbittorrent'),
    mediaQueue,
    playback:
      playback &&
      mapSnapshot(playback, ({ version: _version, ...p }): PlaybackInfo => ({
        ...p,
        restricted,
        sessions: restricted ? [] : p.sessions,
      })),
  };
}
