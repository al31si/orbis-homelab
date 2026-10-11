import type { QuotaInfo } from '../../../shared/api.js';
import type { Config } from '../config/schema.js';
import { readTextIfExists } from '../lib/files.js';
import { getJson } from '../lib/http.js';

export type UsageProvider = Config['sources']['usage'][number];

/** Shape of the `weekly-quota` document written by the usage provider's own updater. */
export interface WeeklyQuotaDocument {
  weekly_remaining_percent?: number;
  weekly_resets_at?: string;
  plan?: string | null;
  updated_at?: string;
}

/**
 * The weekly window is mandatory: a document without it is an error, never a guessed value.
 * With `maxAgeMinutes` the document must also carry `updated_at`, and an old one means the
 * writer is stalled (the PWA then shows the data as stale).
 */
export function parseWeeklyQuota(
  raw: unknown,
  opts: { maxAgeMinutes?: number } = {},
  now = Date.now(),
): QuotaInfo {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('usage document is not a JSON object');
  }
  const doc = raw as WeeklyQuotaDocument;
  const remaining = doc.weekly_remaining_percent;
  if (
    typeof remaining !== 'number' ||
    !Number.isFinite(remaining) ||
    typeof doc.weekly_resets_at !== 'string' ||
    Number.isNaN(Date.parse(doc.weekly_resets_at))
  ) {
    throw new Error('weekly usage missing in the document');
  }
  if (opts.maxAgeMinutes !== undefined) {
    const updated = Date.parse(doc.updated_at ?? '');
    if (Number.isNaN(updated)) throw new Error('usage document has no updated_at');
    if (now - updated > opts.maxAgeMinutes * 60_000) {
      throw new Error(`usage updater stalled since ${new Date(updated).toISOString()}`);
    }
  }
  return {
    plan: doc.plan ?? null,
    weekly: {
      remainingPercent: Math.max(0, Math.min(100, remaining)),
      resetsAt: new Date(doc.weekly_resets_at).toISOString(),
    },
  };
}

/**
 * Reads one usage provider. Resolves to null when its `file` does not exist yet: the writer is not
 * set up, which is "pending", not a failure. Anything else wrong is thrown.
 */
export async function readUsage(
  provider: UsageProvider,
  now = Date.now(),
): Promise<QuotaInfo | null> {
  let raw: unknown;
  if (provider.url) {
    raw = await getJson<unknown>(provider.url, { timeoutMs: 8000 });
  } else {
    const text = await readTextIfExists(provider.file ?? '');
    if (text === null) return null;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('usage file is not valid JSON');
    }
  }
  return parseWeeklyQuota(raw, { maxAgeMinutes: provider.maxAgeMinutes }, now);
}
