import type { DiskInfo, PoolInfo, SmartSummary, StorageInfo, VolumeInfo } from '@shared/api';
import { t } from '@/i18n';
import { toneForThreshold, type UiTone } from '@/lib/tone';

/** Pool and volume usage turns amber from here and red from `POOL_CRITICAL_PERCENT`. */
export const POOL_WARN_PERCENT = 85;
export const POOL_CRITICAL_PERCENT = 95;

/** A SMART report older than this is stale: three missed runs of a 15 minute schedule. */
export const SMART_STALE_SECONDS = 45 * 60;

const HOURS_PER_DAY = 24;
const DAYS_PER_YEAR = 365;

export function usageTone(percent: number): UiTone {
  return toneForThreshold(percent, POOL_WARN_PERCENT, POOL_CRITICAL_PERCENT);
}

export function usageVerdict(percent: number): string {
  if (percent >= POOL_CRITICAL_PERCENT) return t('storage.verdict.critical');
  if (percent >= POOL_WARN_PERCENT) return t('storage.verdict.warn');
  return t('storage.verdict.ok');
}

export function isSmartReportStale(ageSeconds: number): boolean {
  return ageSeconds > SMART_STALE_SECONDS;
}

/** "13.320 h" is unreadable at a glance: split the hours into whole years and days as well. */
export function powerOnSpan(hours: number): string {
  const days = Math.floor(Math.max(0, hours) / HOURS_PER_DAY);
  const years = Math.floor(days / DAYS_PER_YEAR);
  const rest = days - years * DAYS_PER_YEAR;
  const daysText = t('storage.span.days', { n: rest });
  if (years === 0) return daysText;
  const yearsText = t('storage.span.years', { n: years });
  return rest === 0
    ? yearsText
    : t('storage.span.yearsAndDays', { years: yearsText, days: daysText });
}

/* -------------------------------------------------------- pools and volumes */

export interface PoolView {
  pool: PoolInfo;
  /** Member volumes in the order the pool lists them; mounts without a volume are dropped. */
  members: VolumeInfo[];
}

type VolumeData = Pick<StorageInfo, 'pools' | 'volumes'>;

/** Resolves each pool's member mounts to their volumes. */
export function poolViews({ pools, volumes }: VolumeData): PoolView[] {
  const byMount = new Map(volumes.map((volume) => [volume.mount, volume]));
  return pools.map((pool) => ({
    pool,
    members: [...new Set(pool.members)].flatMap((mount) => byMount.get(mount) ?? []),
  }));
}

/** Volumes the pools do not already show: neither a member nor the pool's own mount. */
export function standaloneVolumes({ pools, volumes }: VolumeData): VolumeInfo[] {
  const shown = new Set(pools.flatMap((pool) => [pool.mount, ...pool.members]));
  return volumes.filter((volume) => !shown.has(volume.mount));
}

export function volumeTitle(volume: Pick<VolumeInfo, 'label' | 'mount'>): string {
  return volume.label ?? volume.mount;
}

export interface MemberShare {
  mount: string;
  label: string;
  usedBytes: number;
  /** Share of the space used by all members together, 0..100. */
  percent: number;
}

/** How the used space of a pool is spread across its member volumes. */
export function memberShares(members: readonly VolumeInfo[]): MemberShare[] {
  const total = members.reduce((sum, volume) => sum + volume.usedBytes, 0);
  return members.map((volume) => ({
    mount: volume.mount,
    label: volumeTitle(volume),
    usedBytes: volume.usedBytes,
    percent: total > 0 ? (volume.usedBytes / total) * 100 : 0,
  }));
}

/* ---------------------------------------------------------------- SMART */

export interface SmartView {
  disks: DiskInfo[];
  smart: SmartSummary;
}

/** The disk health data, only when the instance enables SMART and the report has disks. */
export function smartView(storage: StorageInfo, enabled: boolean): SmartView | null {
  if (!enabled || storage.smart === null || storage.disks.length === 0) return null;
  return { disks: storage.disks, smart: storage.smart };
}

export function diskTemperatureTone(
  celsius: number | null,
  limits: Pick<SmartSummary, 'temperatureWarnC' | 'temperatureCriticalC'>,
): UiTone {
  return celsius === null
    ? 'neutral'
    : toneForThreshold(celsius, limits.temperatureWarnC, limits.temperatureCriticalC);
}

export function toneForDiskStatus(status: DiskInfo['status']): UiTone {
  return status === 'CRITICAL' ? 'crit' : status === 'WARNING' ? 'warn' : 'ok';
}

export type CounterKey = 'reallocated' | 'pending' | 'uncorrectable' | 'smartErrors';

export const COUNTER_KEYS: readonly CounterKey[] = [
  'reallocated',
  'pending',
  'uncorrectable',
  'smartErrors',
];

/** Pending and uncorrectable sectors are the ones that put data at risk. */
const COUNTER_TONE: Record<CounterKey, UiTone> = {
  reallocated: 'warn',
  pending: 'crit',
  uncorrectable: 'crit',
  smartErrors: 'warn',
};

/** Tone of a SMART counter: neutral at zero, otherwise the severity of that kind of defect. */
export function counterTone(key: CounterKey, value: number): UiTone {
  return value > 0 ? COUNTER_TONE[key] : 'neutral';
}

/** Historical SMART 198 evidence is informative, not an active fault. */
export function diskCounterTone(disk: DiskInfo, key: CounterKey): UiTone {
  if (key === 'uncorrectable' && disk.uncorrectableHistorical) return 'neutral';
  return counterTone(key, disk[key]);
}

/** Counters that currently put the disk at risk (historical uncorrectable sectors do not). */
export function activeCounters(disk: DiskInfo): CounterKey[] {
  return COUNTER_KEYS.filter(
    (key) => disk[key] > 0 && !(key === 'uncorrectable' && disk.uncorrectableHistorical),
  );
}

const STATUS_RANK: Record<DiskInfo['status'], number> = { CRITICAL: 0, WARNING: 1, OK: 2 };

/** Disks that are not OK, critical first (the listed order is kept within a severity). */
export function problemDisks(disks: readonly DiskInfo[]): DiskInfo[] {
  return disks
    .filter((disk) => disk.status !== 'OK')
    .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
}

export interface ProblemExplanation {
  /** What each kind of defect on the given disks means, one sentence per kind. */
  meanings: string[];
  /** The practical takeaway, always present. */
  advice: string;
}

/** Plain-language explanation of the defects present on the given disks. */
export function explainProblems(disks: readonly DiskInfo[]): ProblemExplanation {
  const meanings = COUNTER_KEYS.filter((key) =>
    disks.some((disk) => activeCounters(disk).includes(key)),
  ).map((key) => t(`storage.meaning.${key}`));
  if (disks.some((disk) => disk.smart === 'FAILED')) {
    meanings.push(t('storage.meaning.failed'));
  } else if (disks.some((disk) => disk.smart === 'PASSED')) {
    meanings.push(t('storage.meaning.passed'));
  }
  return { meanings, advice: t('storage.health.advice') };
}
