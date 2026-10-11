import type {
  Alert,
  ContainerInfo,
  OverallStatus,
  ServiceView,
  Severity,
  StorageInfo,
  SystemInfo,
} from '../../shared/api.js';
import type { ThresholdOverrides } from './config/schema.js';
import type { T } from './i18n/index.js';
import type { IntegrationReading } from './services.js';

export interface Candidate {
  id: string;
  severity: Severity;
  source: Alert['source'];
  title: string;
  detail: string;
  serviceId: string | null;
}

export type Thresholds = Required<ThresholdOverrides>;

export const THRESHOLDS: Thresholds = {
  poolWarn: 85,
  poolCrit: 95,
  fsWarn: 80,
  fsCrit: 90,
  memAvailableWarn: 10,
  memAvailableCrit: 5,
  swapWarn: 85,
  swapWithLowMemory: 25,
  loadFactorWarn: 1.5,
  smartStaleSeconds: 45 * 60,
};

/** Defaults overridden by `config.alerts.thresholds`. */
export function resolveThresholds(overrides: ThresholdOverrides): Thresholds {
  const defined = Object.entries(overrides).filter(([, value]) => value !== undefined);
  return { ...THRESHOLDS, ...Object.fromEntries(defined) };
}

/**
 * What the rules look at. A source that is not configured is represented by `null`/`false`
 * here, so no rule can fire for it.
 */
export interface RuleInputs {
  t: T;
  thresholds: Thresholds;
  system: SystemInfo | null;
  /** The system source is configured and unreachable for several cycles. */
  systemDown: boolean;
  /** Services probed at the system source's own origin: their outage is the source's outage. */
  systemServiceIds: readonly string[];
  storage: StorageInfo | null;
  /** The SMART report source is configured and failing for several cycles. */
  smartDown: boolean;
  containers: ContainerInfo[] | null;
  services: ServiceView[];
  readings: IntegrationReading[];
  /** Consecutive failures per integration collector (by service id). */
  integrationFailures: Record<string, number>;
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function evaluateRules(input: RuleInputs): Candidate[] {
  const out: Candidate[] = [];
  const add = (c: Candidate): number => out.push(c);
  const { t, thresholds, system, storage, services, containers } = input;

  if (input.systemDown) {
    add({
      id: 'monitor:system',
      severity: 'critical',
      source: 'monitor',
      title: t('alerts.systemDownTitle'),
      detail: t('alerts.systemDownDetail'),
      serviceId: input.systemServiceIds[0] ?? null,
    });
  }

  if (system && !input.systemDown) {
    const { memory, swap, cpu, host } = system;
    const memAvailablePct = 100 - memory.percent;
    if (memAvailablePct < thresholds.memAvailableWarn) {
      add({
        id: 'system:memory',
        severity: memAvailablePct < thresholds.memAvailableCrit ? 'critical' : 'warning',
        source: 'system',
        title: t('alerts.memoryTitle'),
        detail: t('alerts.memoryDetail', { available: memAvailablePct, used: memory.percent }),
        serviceId: null,
      });
    }
    if (swap.percent >= thresholds.swapWarn && memAvailablePct < thresholds.swapWithLowMemory) {
      add({
        id: 'system:swap',
        severity: 'warning',
        source: 'system',
        title: t('alerts.swapTitle'),
        detail: t('alerts.swapDetail', { swap: swap.percent, available: memAvailablePct }),
        serviceId: null,
      });
    }
    if (cpu.load.m15 > host.cores * thresholds.loadFactorWarn) {
      add({
        id: 'system:load',
        severity: 'warning',
        source: 'system',
        title: t('alerts.loadTitle'),
        detail: t('alerts.loadDetail', { load: cpu.load.m15, cores: host.cores }),
        serviceId: null,
      });
    }
    const hottest = [...system.temperatures].sort((a, b) => b.celsius - a.celsius)[0];
    if (hottest) {
      const crit = hottest.crit !== null && hottest.celsius >= hottest.crit;
      const warn = hottest.warn !== null && hottest.celsius >= hottest.warn;
      if (crit || warn) {
        add({
          id: 'system:cpu-temp',
          severity: crit ? 'critical' : 'warning',
          source: 'system',
          title: t('alerts.temperatureTitle'),
          detail: t('alerts.temperatureDetail', { label: hottest.label, celsius: hottest.celsius }),
          serviceId: null,
        });
      }
    }
  }

  if (input.smartDown) {
    add({
      id: 'monitor:smart',
      severity: 'warning',
      source: 'monitor',
      title: t('alerts.smartDownTitle'),
      detail: t('alerts.smartDownDetail'),
      serviceId: null,
    });
  }

  if (storage) {
    for (const disk of storage.disks) {
      if (disk.status === 'OK') continue;
      const critical = disk.status === 'CRITICAL';
      add({
        id: `disk:${disk.label}`,
        severity: critical ? 'critical' : 'warning',
        source: 'storage',
        title: t(critical ? 'alerts.diskCritical' : 'alerts.diskWarning', { label: disk.label }),
        detail: t('alerts.diskDetail', { message: disk.message, temperatureC: disk.temperatureC }),
        serviceId: null,
      });
    }
    for (const pool of storage.pools) {
      if (pool.percent >= thresholds.poolWarn) {
        add({
          id: `storage:pool:${pool.id}`,
          severity: pool.percent >= thresholds.poolCrit ? 'critical' : 'warning',
          source: 'storage',
          title: t('alerts.poolTitle', { label: pool.label }),
          detail: t('alerts.poolDetail', { label: pool.label, percent: pool.percent }),
          serviceId: null,
        });
      }
    }
    // A pool is judged as a whole: its mount and its members are not alerted one by one.
    const pooled = new Set(storage.pools.flatMap((pool) => [pool.mount, ...pool.members]));
    for (const volume of storage.volumes) {
      if (pooled.has(volume.mount) || volume.percent < thresholds.fsWarn) continue;
      add({
        id: `storage:fs:${volume.mount}`,
        severity: volume.percent >= thresholds.fsCrit ? 'critical' : 'warning',
        source: 'storage',
        title: t('alerts.volumeTitle', { mount: volume.mount }),
        detail: t('alerts.volumeDetail', { mount: volume.mount, percent: volume.percent }),
        serviceId: null,
      });
    }
    if (storage.smart && storage.smart.ageSeconds > thresholds.smartStaleSeconds) {
      add({
        id: 'storage:smart-stale',
        severity: 'warning',
        source: 'storage',
        title: t('alerts.smartStaleTitle'),
        detail: t('alerts.smartStaleDetail', {
          minutes: Math.round(storage.smart.ageSeconds / 60),
        }),
        serviceId: null,
      });
    }
  }

  const suppressed = new Set(input.systemDown ? input.systemServiceIds : []);
  for (const service of services) {
    if (service.state !== 'down' && service.state !== 'degraded') continue;
    if (suppressed.has(service.id)) continue;
    add({
      id: `service:${service.id}`,
      severity: service.state === 'down' && service.core ? 'critical' : 'warning',
      source: 'service',
      title: t(service.state === 'down' ? 'alerts.serviceDown' : 'alerts.serviceDegraded', {
        name: service.name,
      }),
      detail: service.stateDetail ?? '',
      serviceId: service.id,
    });
  }

  for (const c of containers ?? []) {
    if (c.serviceId === null && (c.state === 'unhealthy' || c.state === 'restarting')) {
      add({
        id: `container:${c.name}`,
        severity: 'warning',
        source: 'service',
        title: t('alerts.containerTitle', { name: c.name, state: c.state }),
        detail: t('alerts.containerDetail'),
        serviceId: null,
      });
    }
  }

  const stateById = new Map(services.map((s) => [s.id, s.state]));
  for (const reading of input.readings) {
    const { integration } = reading;
    if (!integration.configured) continue;
    if (reading.data) {
      for (const a of integration.alerts(reading.data)) {
        add({
          id: `integration:${integration.serviceId}:${a.key ?? slug(a.title)}`,
          severity: a.severity,
          source: 'integration',
          title: a.title,
          detail: a.detail,
          serviceId: integration.serviceId,
        });
      }
    }
    if (
      reading.error &&
      (input.integrationFailures[integration.serviceId] ?? 0) >= 3 &&
      stateById.get(integration.serviceId) === 'up'
    ) {
      add({
        id: `integration-down:${integration.serviceId}`,
        severity: 'warning',
        source: 'integration',
        title: t('alerts.integrationDownTitle', { label: integration.label }),
        detail: t('alerts.integrationDownDetail', { error: reading.error }),
        serviceId: integration.serviceId,
      });
    }
  }

  return out;
}

export function healthScore(alerts: Pick<Alert, 'severity'>[]): number {
  const penalty = alerts.reduce(
    (sum, a) => sum + (a.severity === 'critical' ? 20 : a.severity === 'warning' ? 5 : 0),
    0,
  );
  return Math.max(0, 100 - penalty);
}

export function overallStatus(alerts: Pick<Alert, 'severity'>[], hasData: boolean): OverallStatus {
  if (alerts.some((a) => a.severity === 'critical')) return 'critical';
  if (!hasData) return 'unknown';
  return alerts.some((a) => a.severity === 'warning') ? 'warning' : 'ok';
}
