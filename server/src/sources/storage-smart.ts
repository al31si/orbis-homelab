import { readFile } from 'node:fs/promises';
import type { DiskInfo, SmartSummary } from '../../../shared/api.js';
import type { Config } from '../config/schema.js';
import { getJson } from '../lib/http.js';
import type { FsEntry } from './provider.js';

export type SmartSource = NonNullable<NonNullable<Config['sources']['storage']>['smart']>;

export interface HddDisk {
  label?: string;
  device?: string;
  model?: string;
  serial?: string;
  smart?: string;
  temperature_c?: number | null;
  reallocated?: number;
  pending?: number;
  uncorrectable?: number;
  power_on_hours?: number | null;
  smart_errors?: number;
  status?: string;
  message?: string;
}

/** The documented SMART report (`docs/smart-report.md`). Every field is optional on input. */
export interface HddReport {
  status?: string;
  checked_at?: string;
  temperature_warn_c?: number;
  temperature_critical_c?: number;
  disks?: HddDisk[];
}

/** Reads the report from its URL or file. A configured source that cannot be read is an error. */
export async function readSmartReport(source: SmartSource): Promise<HddReport> {
  let raw: unknown;
  if (source.url) {
    raw = await getJson<unknown>(source.url, { timeoutMs: 5000 });
  } else {
    let text: string;
    try {
      text = await readFile(source.file ?? '', 'utf8');
    } catch (err) {
      throw new Error(`cannot read SMART report file (${(err as NodeJS.ErrnoException).code})`, {
        cause: err,
      });
    }
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error('SMART report file is not valid JSON');
    }
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('SMART report is not a JSON object');
  }
  return raw as HddReport;
}

const level = (v: unknown): 'OK' | 'WARNING' | 'CRITICAL' =>
  v === 'CRITICAL' ? 'CRITICAL' : v === 'WARNING' ? 'WARNING' : 'OK';

/**
 * A completed repair can leave SMART attribute 198 as historical evidence.
 * The report writer marks that exact case explicitly; it is not an active disk
 * fault when SMART passed, pending is zero, and the SMART error log is empty.
 */
export function isHistoricalUncorrectable(disk: HddDisk): boolean {
  return (
    (disk.uncorrectable ?? 0) > 0 &&
    (disk.pending ?? 0) === 0 &&
    disk.smart === 'PASSED' &&
    (disk.smart_errors ?? 0) === 0 &&
    /offline-uncorrectable (storico|historical)/i.test(disk.message ?? '')
  );
}

/**
 * A missing SMART field never becomes a healthy default: unknown stays unknown.
 * `diskMounts` maps a disk label to its filesystem mount point (`smart.disks`).
 */
export function buildDisks(
  report: HddReport,
  diskMounts: Record<string, string>,
  filesystems: readonly FsEntry[],
): DiskInfo[] {
  const byMount = new Map(filesystems.map((f) => [f.mount, f]));
  return (report.disks ?? []).map((d) => {
    const label = d.label ?? 'UNKNOWN';
    const mount = diskMounts[label] ?? null;
    const usage = mount ? byMount.get(mount) : undefined;
    const uncorrectableHistorical = isHistoricalUncorrectable(d);
    return {
      label,
      device: d.device ?? '',
      model: d.model ?? 'N/A',
      serialTail: (d.serial ?? '').slice(-4),
      smart: d.smart === 'PASSED' || d.smart === 'FAILED' ? d.smart : 'UNAVAILABLE',
      status: uncorrectableHistorical ? 'OK' : level(d.status),
      message: d.message ?? '',
      temperatureC: typeof d.temperature_c === 'number' ? d.temperature_c : null,
      reallocated: d.reallocated ?? 0,
      pending: d.pending ?? 0,
      uncorrectable: d.uncorrectable ?? 0,
      uncorrectableHistorical,
      smartErrors: d.smart_errors ?? 0,
      powerOnHours: typeof d.power_on_hours === 'number' ? d.power_on_hours : null,
      mount,
      sizeBytes: usage?.sizeBytes ?? null,
      usedBytes: usage?.usedBytes ?? null,
      availableBytes: usage?.availableBytes ?? null,
      percent: usage?.percent ?? null,
    };
  });
}

export function buildSmartSummary(report: HddReport, now: number): SmartSummary {
  const disks = report.disks ?? [];
  const historicalWarningsOnly =
    report.status === 'WARNING' &&
    disks.length > 0 &&
    disks.every((disk) => (disk.status ?? 'OK') === 'OK' || isHistoricalUncorrectable(disk));
  const checkedAt = report.checked_at ?? new Date(0).toISOString();
  const checkedMs = Date.parse(checkedAt);
  return {
    status: historicalWarningsOnly ? 'OK' : level(report.status),
    checkedAt,
    ageSeconds: Number.isFinite(checkedMs) ? Math.max(0, Math.round((now - checkedMs) / 1000)) : 0,
    temperatureWarnC: report.temperature_warn_c ?? 50,
    temperatureCriticalC: report.temperature_critical_c ?? 55,
  };
}
