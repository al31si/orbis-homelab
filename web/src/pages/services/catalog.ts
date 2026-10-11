import type {
  CategoryInfo,
  ContainerInfo,
  ContainerState,
  EventLogEntry,
  ServiceState,
  ServiceView,
} from '@shared/api';
import { t, type Messages } from '@/i18n';
import { toneForServiceState, type UiTone } from '@/lib/tone';
import { rankItems, type Searchable } from '@/shell/commandRanking';

const STATE_KEY = {
  up: 'services.state.up',
  degraded: 'services.state.degraded',
  down: 'services.state.down',
  unknown: 'services.state.unknown',
} as const satisfies Record<ServiceState, keyof Messages>;

const CONTAINER_STATE_KEY = {
  healthy: 'services.container.healthy',
  running: 'services.container.running',
  starting: 'services.container.starting',
  unhealthy: 'services.container.unhealthy',
  paused: 'services.container.paused',
  restarting: 'services.container.restarting',
  exited: 'services.container.exited',
  dead: 'services.container.dead',
  unknown: 'services.container.unknown',
} as const satisfies Record<ContainerState, keyof Messages>;

type ServiceStatus = Pick<ServiceView, 'state' | 'monitored'>;

/** "Online", "Not responding"... or "Not monitored" for a service nobody checks. */
export function serviceStateLabel(service: ServiceStatus): string {
  return service.monitored ? t(STATE_KEY[service.state]) : t('services.state.unmonitored');
}

/** Unmonitored services stay neutral: their `unknown` state is not a failure. */
export function serviceTone(service: ServiceStatus): UiTone {
  return service.monitored ? toneForServiceState(service.state) : 'neutral';
}

export function containerStateLabel(state: ContainerState): string {
  return t(CONTAINER_STATE_KEY[state]);
}

const BUILTIN_INTEGRATIONS: readonly string[] = [
  'radarr',
  'sonarr',
  'lidarr',
  'prowlarr',
  'qbittorrent',
  'jellyfin',
  'vikunja',
];

/**
 * Name of the environment variable the server reads for a built-in integration when
 * `integration.secret` is not set (the name only, never a value). Null for other integrations.
 */
export function defaultSecretName(integrationId: string): string | null {
  if (!BUILTIN_INTEGRATIONS.includes(integrationId)) return null;
  return integrationId === 'vikunja'
    ? 'VIKUNJA_API_TOKEN'
    : `${integrationId.toUpperCase()}_API_KEY`;
}

export type StatusFilter = 'all' | 'problems' | 'favorites';

/** A monitored service that is not up. Unmonitored services are never "problems". */
export function needsAttention(service: ServiceStatus): boolean {
  return service.monitored && service.state !== 'up';
}

const STATE_SEVERITY: Record<ServiceState, number> = { down: 0, degraded: 1, unknown: 2, up: 3 };

/** Services that are not up, worst first (core services before the others within a state). */
export function problemServices(services: readonly ServiceView[]): ServiceView[] {
  return services
    .filter(needsAttention)
    .sort(
      (a, b) =>
        STATE_SEVERITY[a.state] - STATE_SEVERITY[b.state] || Number(b.core) - Number(a.core),
    );
}

export interface MonitoringCounts {
  total: number;
  monitored: number;
  online: number;
}

/** How many services are checked at all, and how many of those are up. */
export function monitoringCounts(
  services: readonly Pick<ServiceView, 'state' | 'monitored'>[],
): MonitoringCounts {
  const monitored = services.filter((service) => service.monitored);
  return {
    total: services.length,
    monitored: monitored.length,
    online: monitored.filter((service) => service.state === 'up').length,
  };
}

/** "home-lab" -> "Home lab": the label of a category the instance did not declare. */
export function prettifyCategory(id: string): string {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Declared label, else the prettified id; null for an ungrouped service. */
export function categoryLabel(
  category: string | null,
  declared: readonly CategoryInfo[],
): string | null {
  if (!category) return null;
  return declared.find((entry) => entry.id === category)?.label ?? prettifyCategory(category);
}

/** What the search field and the palette look at besides the name. */
export function serviceSearchable(
  service: ServiceView,
  declared: readonly CategoryInfo[],
): Searchable {
  const label = categoryLabel(service.category, declared);
  return {
    title: service.name,
    keywords: [service.description, label, service.category, service.id].filter(
      (keyword): keyword is string => Boolean(keyword),
    ),
  };
}

export interface ServiceFilters {
  query: string;
  status: StatusFilter;
  favorites: readonly string[];
  /** The `showServicesWithoutUi` preference. */
  showWithoutUi: boolean;
  /** `AppInfo.categories`: labels searched along with the name. */
  categories: readonly CategoryInfo[];
}

/**
 * Applies the search text and the status chip. Services without a UI are only hidden in the
 * plain, unfiltered listing: searching or filtering by problems/favorites must never lose them.
 */
export function filterServices(
  services: readonly ServiceView[],
  { query, status, favorites, showWithoutUi, categories }: ServiceFilters,
): ServiceView[] {
  const searching = query.trim() !== '';
  let result = [...services];
  if (status === 'problems') result = result.filter(needsAttention);
  if (status === 'favorites') result = result.filter((service) => favorites.includes(service.id));
  if (status === 'all' && !searching && !showWithoutUi) {
    result = result.filter((service) => service.url !== null);
  }
  if (searching) {
    const matching = new Set(
      rankItems(query, result, (service) => serviceSearchable(service, categories)).map(
        (entry) => entry.item.id,
      ),
    );
    result = result.filter((service) => matching.has(service.id));
  }
  return result;
}

export interface ServiceGroup {
  /** Null: the services without a category, listed last. */
  category: string | null;
  label: string;
  services: ServiceView[];
}

/**
 * Groups by category. Declared categories come first in their declared order, then the other
 * categories in the order they first appear, then the ungrouped services under "Other".
 * Services keep their catalog order inside a group; empty groups are not returned.
 */
export function groupByCategory(
  services: readonly ServiceView[],
  declared: readonly CategoryInfo[],
): ServiceGroup[] {
  const byCategory = new Map<string, ServiceView[]>();
  const ungrouped: ServiceView[] = [];
  for (const service of services) {
    if (!service.category) {
      ungrouped.push(service);
      continue;
    }
    const list = byCategory.get(service.category);
    if (list) list.push(service);
    else byCategory.set(service.category, [service]);
  }

  const order = [
    ...declared.map((entry) => entry.id),
    ...[...byCategory.keys()].filter((id) => !declared.some((entry) => entry.id === id)),
  ];
  const groups: ServiceGroup[] = [];
  for (const id of order) {
    const list = byCategory.get(id);
    if (list) {
      groups.push({ category: id, label: categoryLabel(id, declared) ?? id, services: list });
    }
  }
  if (ungrouped.length > 0) {
    groups.push({ category: null, label: t('services.category.other'), services: ungrouped });
  }
  return groups;
}

const MAX_HINT_VALUE_LENGTH = 16;

/** The most telling short metric ("Queue 0"), shown in a list row; the version comes last. */
export function keyMetricHint(service: Pick<ServiceView, 'metrics'>): string | null {
  const versionLabel = t('services.metric.version');
  const short = service.metrics.filter((metric) => metric.value.length <= MAX_HINT_VALUE_LENGTH);
  const best =
    short.find((metric) => metric.label !== versionLabel) ??
    short.find((metric) => metric.label === versionLabel);
  return best ? `${best.label} ${best.value}` : null;
}

const CONTAINER_SEVERITY: Record<ContainerState, number> = {
  dead: 0,
  unhealthy: 0,
  restarting: 1,
  exited: 1,
  paused: 2,
  starting: 2,
  unknown: 3,
  running: 4,
  healthy: 4,
};

export interface ContainerRow {
  name: string;
  state: ContainerState;
  cpuPercent: number;
  memoryBytes: number;
  /** Docker uptime, when the containers snapshot knows this container. */
  uptime: string | null;
  image: string | null;
}

/** Service containers joined with the Docker snapshot; anomalies first, then by name. */
export function containerRows(
  service: Pick<ServiceView, 'containers'>,
  docker: readonly ContainerInfo[] | null,
): ContainerRow[] {
  return service.containers
    .map((container) => {
      const info = docker?.find((candidate) => candidate.name === container.name);
      return { ...container, uptime: info?.uptime ?? null, image: info?.image ?? null };
    })
    .sort(
      (a, b) =>
        CONTAINER_SEVERITY[a.state] - CONTAINER_SEVERITY[b.state] || a.name.localeCompare(b.name),
    );
}

/** Latest events of one service, newest first. */
export function eventsForService(
  events: readonly EventLogEntry[],
  serviceId: string,
  limit = 5,
): EventLogEntry[] {
  return events
    .filter((event) => event.serviceId === serviceId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

/**
 * Container names without the "myapp-stack-" style prefix they all share, so long lists stay
 * scannable. Every name keeps at least one segment; short lists are left alone.
 */
export function shortContainerNames(names: readonly string[]): string[] {
  const parts = names.map((name) => name.split('-'));
  const first = parts[0];
  if (!first || names.length < 3) return [...names];
  let shared = 0;
  while (parts.every((part) => part.length > shared + 1 && part[shared] === first[shared])) {
    shared += 1;
  }
  return parts.map((part) => part.slice(shared).join('-'));
}
