import type { Alert, FeatureFlags, OverallStatus, Overview } from '@shared/api';
import { t, type Messages } from '@/i18n';

const STATUS_KEY = {
  ok: 'home.status.ok',
  warning: 'home.status.warning',
  critical: 'home.status.critical',
  unknown: 'home.status.unknown',
} as const satisfies Record<OverallStatus, keyof Messages>;

export function statusWord(status: OverallStatus): string {
  return t(STATUS_KEY[status]);
}

/**
 * The status to show in the hero. The BFF reports `unknown` when it has nothing to judge by; that
 * is only worth saying when a data source is actually failing. An instance with no failing source
 * (a plain service catalog, say) has nothing to be unhealthy about.
 */
export function heroStatus(overview: Pick<Overview, 'status' | 'sources'>): OverallStatus {
  if (overview.status !== 'unknown') return overview.status;
  return overview.sources.some((source) => !source.ok) ? 'unknown' : 'ok';
}

/** One line under the status word: the open alerts, or why the status is unknown. */
export function heroSummary(
  overview: Pick<Overview, 'alerts' | 'sources'>,
  status: OverallStatus,
): string {
  const hasAlerts = overview.alerts.some((alert) => alert.severity !== 'info');
  if (!hasAlerts && status === 'unknown') {
    return t('home.summary.sources', {
      n: overview.sources.filter((source) => !source.ok).length,
    });
  }
  return summarizeAlerts(overview.alerts);
}

/** One line describing the open alerts: "1 problema da controllare", "1 critico e 2 da controllare". */
export function summarizeAlerts(alerts: readonly Pick<Alert, 'severity'>[]): string {
  const critical = alerts.filter((alert) => alert.severity === 'critical').length;
  const warning = alerts.filter((alert) => alert.severity === 'warning').length;
  if (critical === 0 && warning === 0) return t('home.summary.none');
  if (warning === 0) return t('home.summary.critical', { n: critical });
  if (critical === 0) return t('home.summary.warning', { n: warning });
  return t('home.summary.mixed', { critical, warning });
}

/**
 * Where tapping an alert should lead. Alerts that belong to no page go to Activity, or to
 * Diagnostics when the instance has no Activity page.
 */
export function alertHref(
  alert: Pick<Alert, 'source' | 'serviceId'>,
  features: Pick<FeatureFlags, 'activity'>,
): string {
  if (alert.serviceId) return `/services/${encodeURIComponent(alert.serviceId)}`;
  switch (alert.source) {
    case 'system':
      return '/system';
    case 'storage':
      return '/storage';
    case 'service':
    case 'integration':
      return '/services';
    default:
      return features.activity ? '/activity' : '/more/diagnostics';
  }
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

/** Critical first, then warnings, then info; oldest first within a severity. */
export function sortAlerts(alerts: readonly Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.since.localeCompare(b.since),
  );
}

export type VitalId = 'cpu' | 'memory' | 'storage' | 'temperature';

/**
 * The tiles of "In sintesi", in display order. CPU, memory and temperature need a system source;
 * storage needs a storage source. A host that reports no temperature sensor gets no temperature
 * tile. An empty list means the whole section is left out.
 */
export function visibleVitals(
  features: Pick<FeatureFlags, 'system' | 'storage'>,
  live: Overview['system'],
): VitalId[] {
  const tiles: VitalId[] = [];
  if (features.system) tiles.push('cpu', 'memory');
  if (features.storage) tiles.push('storage');
  if (features.system && (live === null || live.cpuTempC !== null)) tiles.push('temperature');
  return tiles;
}

/** Temperature limits for the CPU tile: the hottest sensor's own limits, else sane defaults. */
export function tempLimits(
  sensors: readonly { celsius: number; warn: number | null; crit: number | null }[] | undefined,
): { warn: number; crit: number } {
  const hottest = sensors?.reduce<(typeof sensors)[number] | null>(
    (best, sensor) => (best === null || sensor.celsius > best.celsius ? sensor : best),
    null,
  );
  return { warn: hottest?.warn ?? 70, crit: hottest?.crit ?? 85 };
}

export interface ServicesSummary {
  /** Services somebody checks: `total - unmonitored`. */
  monitored: number;
  up: number;
  unmonitored: number;
  /** Every monitored service is up (and there is at least one). */
  allUp: boolean;
}

/** Counts only monitored services; unmonitored ones are neither up nor failing. */
export function summarizeServices(services: Overview['services']): ServicesSummary {
  const monitored = services.total - services.unmonitored;
  return {
    monitored,
    up: services.up,
    unmonitored: services.unmonitored,
    allUp: monitored > 0 && services.up === monitored,
  };
}
