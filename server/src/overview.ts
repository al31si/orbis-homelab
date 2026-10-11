import type { Overview, ServiceView, StorageInfo, SystemInfo } from '../../shared/api.js';
import { stateRank } from './services.js';

/** Hottest sensor, preferring the CPU package; rounded to whole degrees. */
export function maxTemperature(s: SystemInfo): number | null {
  const pkg = s.temperatures.find((t) => t.label.startsWith('Package'));
  if (pkg) return Math.round(pkg.celsius);
  const max = Math.max(...s.temperatures.map((t) => t.celsius));
  return Number.isFinite(max) ? Math.round(max) : null;
}

export function summarizeSystem(s: SystemInfo): NonNullable<Overview['system']> {
  return {
    cpuPercent: s.cpu.percent,
    memoryPercent: s.memory.percent,
    swapPercent: s.swap.percent,
    load1: s.cpu.load.m1,
    cores: s.host.cores,
    cpuTempC: maxTemperature(s),
    uptimeSeconds: s.host.uptimeSeconds,
  };
}

/** Headline capacity: the first configured pool, else the fullest volume; null if neither. */
export function summarizeStorage(storage: StorageInfo): Overview['storage'] {
  const pool = storage.pools[0];
  const fullest = [...storage.volumes].sort((a, b) => b.percent - a.percent)[0];
  const headline = pool ?? (fullest && { ...fullest, label: fullest.label ?? fullest.mount });
  if (!headline) return null;
  return {
    label: headline.label,
    percent: headline.percent,
    usedBytes: headline.usedBytes,
    sizeBytes: headline.sizeBytes,
    availableBytes: headline.availableBytes,
    disksTotal: storage.disks.length,
    disksOk: storage.disks.filter((d) => d.status === 'OK').length,
    rootPercent: storage.volumes.find((v) => v.mount === '/')?.percent ?? null,
  };
}

/** Unmonitored services are counted in `total` only, and never listed as problems. */
export function summarizeServices(
  views: readonly ServiceView[],
): Pick<Overview, 'services' | 'problemServiceIds'> {
  const monitored = views.filter((v) => v.monitored);
  const count = (state: ServiceView['state']): number =>
    monitored.filter((v) => v.state === state).length;
  return {
    services: {
      total: views.length,
      up: count('up'),
      degraded: count('degraded'),
      down: count('down'),
      unknown: count('unknown'),
      unmonitored: views.length - monitored.length,
    },
    problemServiceIds: monitored
      .filter((v) => v.state !== 'up')
      .sort((a, b) => stateRank(a.state) - stateRank(b.state))
      .map((v) => v.id),
  };
}
