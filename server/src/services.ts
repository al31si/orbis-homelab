import type {
  Badge,
  ContainerInfo,
  ContainerState,
  Metric,
  ServiceState,
  ServiceView,
} from '../../shared/api.js';
import type { ServiceDef } from './config/schema.js';
import type { T } from './i18n/index.js';
import type { Integration } from './integrations/index.js';
import { iconUrl } from './lib/icons.js';
import type { ProbeMap } from './probes.js';
import type { RawContainer } from './sources/provider.js';

export interface IntegrationReading {
  integration: Integration;
  data: unknown;
  error: string | null;
}

export interface ServiceInputs {
  defs: readonly ServiceDef[];
  /** null when provider data is missing or too old: container state is then unknown. */
  containers: RawContainer[] | null;
  probes: ProbeMap;
  readings: IntegrationReading[];
  t: T;
}

const STOPPED: ContainerState[] = ['exited', 'dead', 'paused', 'restarting'];

export function containerOwners(defs: readonly ServiceDef[]): Map<string, string> {
  const owners = new Map<string, string>();
  for (const s of defs) for (const c of s.containers) owners.set(c, s.id);
  return owners;
}

export function withServiceIds(
  containers: RawContainer[],
  defs: readonly ServiceDef[],
): ContainerInfo[] {
  const owners = containerOwners(defs);
  return containers.map((c) => ({ ...c, serviceId: owners.get(c.name) ?? null }));
}

/** Services whose probe URL has the given origin (e.g. the probe of the system source itself). */
export function serviceIdsAtOrigin(defs: readonly ServiceDef[], url: string): string[] {
  const origin = new URL(url).origin;
  return defs.filter((d) => d.probe && new URL(d.probe.url).origin === origin).map((d) => d.id);
}

interface Verdict {
  state: ServiceState;
  detail: string | null;
}

function judge(
  def: ServiceDef,
  live: (RawContainer | undefined)[],
  containersKnown: boolean,
  probeFailure: string | null,
  probeSeen: boolean,
  t: T,
): Verdict {
  const hasContainers = def.containers.length > 0;

  if (hasContainers && containersKnown) {
    const primary = live[0];
    if (!primary) {
      return {
        state: 'down',
        detail: t('services.containerMissing', { name: def.containers[0] ?? '' }),
      };
    }
    if (STOPPED.includes(primary.state)) {
      return {
        state: 'down',
        detail: t('services.containerState', { name: primary.name, state: primary.state }),
      };
    }
    if (primary.state === 'unhealthy') {
      return {
        state: 'degraded',
        detail: t('services.healthcheckFailed', { name: primary.name }),
      };
    }
    const bad = live.flatMap((c, i) =>
      !c
        ? [t('services.partMissing', { name: def.containers[i] ?? '' })]
        : STOPPED.includes(c.state) || c.state === 'unhealthy'
          ? [t('services.partState', { name: c.name, state: c.state })]
          : [],
    );
    if (bad.length > 0) return { state: 'degraded', detail: bad.join(', ') };
    if (probeFailure) {
      return { state: 'degraded', detail: t('services.notResponding', { error: probeFailure }) };
    }
    if (live.some((c) => c?.state === 'starting')) {
      return { state: 'degraded', detail: t('services.starting') };
    }
    return { state: 'up', detail: null };
  }

  // No container information (host service, or provider unavailable): the probe decides.
  if (probeSeen) {
    return probeFailure
      ? { state: 'down', detail: t('services.notResponding', { error: probeFailure }) }
      : { state: 'up', detail: null };
  }
  return {
    state: 'unknown',
    detail: hasContainers ? t('services.containersUnavailable') : null,
  };
}

const RANK: Record<ServiceState, number> = { down: 0, degraded: 1, unknown: 2, up: 3 };
export const stateRank = (s: ServiceState): number => RANK[s];

export function buildServiceViews(input: ServiceInputs): ServiceView[] {
  const { defs, containers, probes, readings, t } = input;
  const byName = new Map((containers ?? []).map((c) => [c.name, c]));
  const readingByService = new Map(readings.map((r) => [r.integration.serviceId, r]));

  return defs.map((def): ServiceView => {
    const live = def.containers.map((name) => byName.get(name));
    const probeState = probes[def.id];
    const probeFailure = probeState && probeState.failures >= 2 ? probeState.result.error : null;
    const verdict = judge(def, live, containers !== null, probeFailure, Boolean(probeState), t);

    const present = live.filter((c): c is RawContainer => Boolean(c));
    const reading = readingByService.get(def.id);
    let badges: Badge[] = [];
    let metrics: Metric[] = [];
    if (reading?.data) {
      const described = reading.integration.describe(reading.data);
      badges = described.badges;
      metrics = described.metrics;
    }

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category ?? null,
      icon: def.icon,
      iconUrl: iconUrl(def.icon),
      url: def.url ?? null,
      state: verdict.state,
      monitored: def.containers.length > 0 || def.probe !== undefined,
      stateDetail: verdict.detail,
      containers: def.containers.map((name, i) => ({
        name,
        state: live[i]?.state ?? 'unknown',
        cpuPercent: live[i]?.cpuPercent ?? 0,
        memoryBytes: live[i]?.memoryBytes ?? 0,
      })),
      probe: probeState?.result ?? null,
      cpuPercent: Math.round(present.reduce((sum, c) => sum + c.cpuPercent, 0) * 10) / 10,
      memoryBytes: present.reduce((sum, c) => sum + c.memoryBytes, 0),
      uptime: present[0]?.uptime || null,
      badges,
      metrics,
      core: def.core,
      integration: reading
        ? {
            id: reading.integration.type,
            configured: reading.integration.configured,
            ok: reading.integration.configured
              ? reading.error === null && reading.data !== null
              : null,
            error: reading.error,
          }
        : null,
    };
  });
}
