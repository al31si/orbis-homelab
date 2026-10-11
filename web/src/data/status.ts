export type SnapshotStatus = 'loading' | 'ready' | 'stale' | 'error' | 'offline';

/** A snapshot older than this many collector intervals is considered stale. */
export const STALE_FACTOR = 2.5;

export interface StatusInput {
  hasData: boolean;
  /** Epoch ms of the last successful collection, null if unknown. */
  fetchedAt: number | null;
  intervalMs: number;
  /** Error carried by the BFF snapshot (collector failing upstream). */
  snapshotError: string | null;
  /** Error of the last request made by this client. */
  fetchError: string | null;
  /** The BFF itself is not answering. */
  offline: boolean;
}

export function deriveStatus(input: StatusInput, now: number): SnapshotStatus {
  const { hasData, fetchedAt, intervalMs, snapshotError, fetchError, offline } = input;
  if (!hasData) {
    if (offline) return 'offline';
    return snapshotError || fetchError ? 'error' : 'loading';
  }
  if (offline) return 'offline';
  if (snapshotError || fetchError) return 'stale';
  if (fetchedAt === null || now - fetchedAt > STALE_FACTOR * intervalMs) return 'stale';
  return 'ready';
}
