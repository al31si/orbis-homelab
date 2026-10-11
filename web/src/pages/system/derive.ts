import type { ContainerInfo, ContainerState, SystemInfo } from '@shared/api';
import { getLocale, t } from '@/i18n';
import { toneForThreshold, type UiTone } from '@/lib/tone';

/* ------------------------------------------------------------------- memory */

/** Available RAM below this share is an alert on its own. */
export const AVAILABLE_CRITICAL_PERCENT = 10;
/** Swap at or above this share only matters when RAM is also getting scarce... */
export const SWAP_HIGH_PERCENT = 85;
/** ...meaning less than this share available. */
export const AVAILABLE_LOW_PERCENT = 25;

export type SwapKind = 'absent' | 'normal' | 'low-memory' | 'pressure';

export interface SwapAssessment {
  kind: SwapKind;
  tone: UiTone;
  /** Available RAM as a share of the total. */
  availablePercent: number;
}

/**
 * Mirrors the BFF alert rule. Linux parks idle pages in swap even with plenty of free RAM, so a
 * high swap figure alone is normal (neutral); it is only a problem when available RAM is below
 * 10%, or when swap is at least 85% full and available RAM is below 25%.
 */
export function assessSwap(
  memory: Pick<SystemInfo['memory'], 'totalBytes' | 'availableBytes'>,
  swap: Pick<SystemInfo['swap'], 'totalBytes' | 'percent'>,
): SwapAssessment {
  const availablePercent =
    memory.totalBytes > 0 ? (memory.availableBytes / memory.totalBytes) * 100 : 100;
  if (swap.totalBytes <= 0) return { kind: 'absent', tone: 'neutral', availablePercent };
  if (availablePercent < AVAILABLE_CRITICAL_PERCENT) {
    return { kind: 'low-memory', tone: 'crit', availablePercent };
  }
  if (swap.percent >= SWAP_HIGH_PERCENT && availablePercent < AVAILABLE_LOW_PERCENT) {
    return { kind: 'pressure', tone: 'warn', availablePercent };
  }
  return { kind: 'normal', tone: 'neutral', availablePercent };
}

/** Split of the RAM bar: in use, reclaimable cache inside the available part, and the rest. */
export function memorySegments(memory: SystemInfo['memory']) {
  const used = Math.max(0, Math.min(memory.totalBytes, memory.usedBytes));
  const available = Math.max(0, memory.availableBytes);
  const cache = Math.min(Math.max(0, memory.cachedBytes), available);
  return { used, cache, free: Math.max(0, available - cache) };
}

/* ---------------------------------------------------------------------- cpu */

/** Load average per core: from 1 the run queue is longer than the CPU can serve. */
export function loadTone(load: number, cores: number): UiTone {
  return toneForThreshold(load / Math.max(1, cores), 1, 1.5);
}

export function seriesStats(values: readonly number[]) {
  if (values.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }
  return { min, max, avg: sum / values.length };
}

/** Upper bound of the load chart: at least the core count, so "saturated" is always visible. */
export function loadScaleMax(values: readonly number[], cores: number): number {
  const peak = values.length > 0 ? Math.max(...values) : 0;
  return Math.max(cores, Math.ceil(peak * 1.15));
}

/* ------------------------------------------------------------ temperatures */

type Sensor = SystemInfo['temperatures'][number];

export interface TemperatureGroups {
  /** Package sensor when present, otherwise the hottest sensor (preferring those with limits). */
  headline: Sensor | null;
  cores: Sensor[];
  other: Sensor[];
}

export function groupTemperatures(sensors: readonly Sensor[]): TemperatureGroups {
  const pkg = sensors.find((sensor) => /^package/i.test(sensor.label));
  const cores = sensors.filter((sensor) => /^core\s*\d+/i.test(sensor.label));
  const other = sensors.filter((sensor) => sensor !== pkg && !cores.includes(sensor));
  // Without a package sensor, lead with the hottest one that has limits (any, as a last resort).
  const judged = sensors.filter((sensor) => sensor.crit !== null);
  const hottest = (judged.length > 0 ? judged : sensors).reduce<Sensor | null>(
    (best, sensor) => (best === null || sensor.celsius > best.celsius ? sensor : best),
    null,
  );
  return { headline: pkg ?? hottest, cores, other };
}

/** Sensors without limits stay neutral: the source gives nothing to judge them by. */
export function temperatureTone(sensor: Pick<Sensor, 'celsius' | 'warn' | 'crit'>): UiTone {
  if (sensor.warn === null && sensor.crit === null) return 'neutral';
  if (sensor.crit !== null && sensor.celsius >= sensor.crit) return 'crit';
  if (sensor.warn !== null && sensor.celsius >= sensor.warn) return 'warn';
  return 'ok';
}

/* ---------------------------------------------------------------- disk I/O */

/**
 * Friendly name for a kernel device name ("sdb" -> "media"): the label of the SMART disk or, when
 * exactly one labelled volume lives on the device, the label of that volume. Undefined otherwise;
 * no name is ever assumed.
 */
export function diskIoLabel(
  name: string,
  disks: readonly { label: string; device: string }[],
  volumes: readonly { label: string | null; device: string }[],
): string | undefined {
  const own = new RegExp(`^/dev/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(p?\\d+)?$`);
  const disk = disks.find((candidate) => own.test(candidate.device));
  if (disk) return disk.label;
  const labels = new Set(
    volumes.flatMap((volume) =>
      volume.label !== null && own.test(volume.device) ? [volume.label] : [],
    ),
  );
  return labels.size === 1 ? [...labels][0] : undefined;
}

/* --------------------------------------------------------------- containers */

type UptimeUnit = 'sec' | 'min' | 'hour' | 'day' | 'week' | 'month' | 'year';

/**
 * The source reports English durations ("2 mins", "a week"); the active language decides how
 * they read (Italian translates them, English keeps the phrase). Anything else is untouched.
 */
export function localizeUptime(text: string): string {
  const match = /^(a|an|\d+)\s+(sec|min|hour|day|week|month|year)(?:ute|ond)?s?$/i.exec(
    text.trim(),
  );
  if (!match) return text;
  const amount = match[1]?.toLowerCase();
  const unit = (match[2] as string).toLowerCase() as UptimeUnit;
  const n = amount === 'a' || amount === 'an' ? 1 : Number(amount);
  return t('system.uptime', { unit, n, text });
}

/** Everything except a container that is running (healthy or not yet checked) or booting. */
export function needsAttention(state: ContainerState): boolean {
  return state !== 'healthy' && state !== 'running' && state !== 'starting';
}

const STATE_RANK: Record<ContainerState, number> = {
  unhealthy: 0,
  dead: 1,
  restarting: 2,
  exited: 3,
  paused: 4,
  unknown: 5,
  starting: 6,
  running: 7,
  healthy: 8,
};

export type ContainerSort = 'state' | 'cpu' | 'memory' | 'name';
export type ContainerFilter = 'all' | 'problems';

/** State: worst first. CPU and memory: heaviest first. Name: A to Z. Ties fall back to the name. */
export function sortContainers(
  containers: readonly ContainerInfo[],
  sort: ContainerSort,
): ContainerInfo[] {
  // Resolved per call so it always follows the instance language.
  const collator = new Intl.Collator(getLocale(), { numeric: true, sensitivity: 'base' });
  const byName = (a: ContainerInfo, b: ContainerInfo) => collator.compare(a.name, b.name);
  return [...containers].sort((a, b) => {
    switch (sort) {
      case 'state':
        return STATE_RANK[a.state] - STATE_RANK[b.state] || byName(a, b);
      case 'cpu':
        return b.cpuPercent - a.cpuPercent || byName(a, b);
      case 'memory':
        return b.memoryBytes - a.memoryBytes || byName(a, b);
      default:
        return byName(a, b);
    }
  });
}

export function filterContainers(
  containers: readonly ContainerInfo[],
  filter: ContainerFilter,
  query: string,
  serviceNames: ReadonlyMap<string, string>,
): ContainerInfo[] {
  const needle = query.trim().toLowerCase();
  return containers.filter((container) => {
    if (filter === 'problems' && !needsAttention(container.state)) return false;
    if (needle === '') return true;
    const service = container.serviceId
      ? `${container.serviceId} ${serviceNames.get(container.serviceId) ?? ''}`
      : '';
    return `${container.name} ${container.image} ${service}`.toLowerCase().includes(needle);
  });
}

/** Counts shown in the summary; taken from the system snapshot, else derived from the list. */
export function dockerCounts(
  reported: SystemInfo['docker'] | undefined,
  containers: readonly ContainerInfo[] | null,
): SystemInfo['docker'] | null {
  if (reported) return reported;
  if (!containers) return null;
  const count = (state: ContainerState) =>
    containers.filter((container) => container.state === state).length;
  return {
    total: containers.length,
    running: containers.filter((c) => c.state === 'running' || c.state === 'healthy').length,
    healthy: count('healthy'),
    unhealthy: count('unhealthy'),
    starting: count('starting'),
  };
}
