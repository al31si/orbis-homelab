import type { SourceHealth } from '@shared/api';
import { STALE_FACTOR } from '@/data/status';
import type { UiTone } from '@/lib/tone';

/** `ok` when it answers and is fresh, `warn` when the data is late, `crit` when it fails. */
export function sourceTone(source: SourceHealth, now: number): UiTone {
  if (!source.ok) return 'crit';
  const fetchedAt = source.fetchedAt === null ? Number.NaN : Date.parse(source.fetchedAt);
  if (Number.isNaN(fetchedAt)) return 'warn';
  return now - fetchedAt > STALE_FACTOR * source.intervalMs ? 'warn' : 'ok';
}

export interface SourcesSummary {
  healthy: number;
  total: number;
  tone: UiTone;
}

/** "8 su 9 fonti in regola", worst tone wins. */
export function summarizeSources(sources: readonly SourceHealth[], now: number): SourcesSummary {
  const tones = sources.map((source) => sourceTone(source, now));
  return {
    healthy: tones.filter((tone) => tone === 'ok').length,
    total: sources.length,
    tone: tones.includes('crit') ? 'crit' : tones.includes('warn') ? 'warn' : 'ok',
  };
}
