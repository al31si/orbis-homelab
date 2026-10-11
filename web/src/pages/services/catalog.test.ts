import type { ContainerInfo, EventLogEntry, ServiceView } from '@shared/api';
import { describe, expect, it } from 'vitest';
import {
  containerRows,
  eventsForService,
  filterServices,
  groupByCategory,
  keyMetricHint,
  shortContainerNames,
  problemServices,
} from './catalog';

function service(overrides: Partial<ServiceView> & { id: string }): ServiceView {
  return {
    name: overrides.id,
    description: '',
    category: 'media',
    icon: 'generic',
    iconUrl: null,
    url: `http://{host}/${overrides.id}`,
    state: 'up',
    monitored: true,
    stateDetail: null,
    containers: [],
    probe: null,
    cpuPercent: 0,
    memoryBytes: 0,
    uptime: null,
    badges: [],
    metrics: [],
    core: false,
    integration: null,
    ...overrides,
  };
}

const catalog = [
  service({ id: 'jellyfin', name: 'Jellyfin', description: 'Streaming video' }),
  service({ id: 'radarr', name: 'Radarr', description: 'Movie management', state: 'degraded' }),
  service({ id: 'worker', name: 'Job Worker', category: 'tools', url: null, state: 'down' }),
  service({ id: 'metrics', name: 'Metrics', category: 'infra', url: null }),
  service({ id: 'n8n', name: 'n8n', category: 'automation', core: true, state: 'unknown' }),
];

const categories = [
  { id: 'media', label: 'Media' },
  { id: 'automation', label: 'Automation' },
];
const base = {
  query: '',
  status: 'all',
  favorites: [],
  showWithoutUi: true,
  categories,
} as const;
const ids = (list: ServiceView[]) => list.map((entry) => entry.id);

describe('filterServices', () => {
  it('hides services without a UI only in the plain listing', () => {
    const hidden = { ...base, showWithoutUi: false };
    expect(ids(filterServices(catalog, hidden))).toEqual(['jellyfin', 'radarr', 'n8n']);
    expect(ids(filterServices(catalog, { ...hidden, status: 'problems' }))).toEqual([
      'radarr',
      'worker',
      'n8n',
    ]);
    expect(ids(filterServices(catalog, { ...hidden, query: 'metrics' }))).toEqual(['metrics']);
  });

  it('searches name, description and category label', () => {
    expect(ids(filterServices(catalog, { ...base, query: 'movie' }))).toEqual(['radarr']);
    expect(ids(filterServices(catalog, { ...base, query: 'automation' }))).toEqual(['n8n']);
    expect(ids(filterServices(catalog, { ...base, query: 'job wor' }))).toEqual(['worker']);
    expect(ids(filterServices(catalog, { ...base, query: 'zzz' }))).toEqual([]);
  });

  it('keeps catalog order when searching', () => {
    // "m" matches the Media category label and the name "Metrics": the result stays in
    // catalog order, not in relevance order.
    expect(ids(filterServices(catalog, { ...base, query: 'm' }))).toEqual([
      'jellyfin',
      'radarr',
      'metrics',
    ]);
  });

  it('filters favorites and combines with the query', () => {
    const favorites = ['radarr', 'n8n'];
    expect(ids(filterServices(catalog, { ...base, status: 'favorites', favorites }))).toEqual([
      'radarr',
      'n8n',
    ]);
    expect(
      ids(filterServices(catalog, { ...base, status: 'favorites', favorites, query: 'n8' })),
    ).toEqual(['n8n']);
  });
});

describe('problemServices', () => {
  it('orders down before degraded before unknown', () => {
    expect(ids(problemServices(catalog))).toEqual(['worker', 'radarr', 'n8n']);
  });

  it('puts core services first within the same state', () => {
    const list = [
      service({ id: 'a', state: 'down' }),
      service({ id: 'b', state: 'down', core: true }),
    ];
    expect(ids(problemServices(list))).toEqual(['b', 'a']);
  });
});

describe('groupByCategory', () => {
  it('lists declared categories first, in declared order, then the others as they appear', () => {
    const groups = groupByCategory(catalog, [
      { id: 'automation', label: 'Automation' },
      { id: 'media', label: 'Media' },
    ]);
    expect(groups.map((group) => group.category)).toEqual([
      'automation',
      'media',
      'tools',
      'infra',
    ]);
    expect(groups.map((group) => group.label)).toEqual(['Automation', 'Media', 'Tools', 'Infra']);
    expect(ids(groups[1]?.services ?? [])).toEqual(['jellyfin', 'radarr']);
  });

  it('puts ungrouped services last under "Other" and skips empty groups', () => {
    const loose = [service({ id: 'a', category: null }), service({ id: 'b', category: 'media' })];
    const groups = groupByCategory(loose, [
      { id: 'empty', label: 'Empty' },
      { id: 'media', label: 'Media' },
    ]);
    expect(groups.map((group) => group.category)).toEqual(['media', null]);
    expect(groups[1]?.label).toBe('Other');
  });

  it('prettifies the id of an undeclared category', () => {
    const groups = groupByCategory([service({ id: 'a', category: 'home-lab' })], []);
    expect(groups[0]?.label).toBe('Home lab');
  });
});

describe('keyMetricHint', () => {
  it('prefers a live metric over the version and skips long values', () => {
    expect(
      keyMetricHint({
        metrics: [
          { label: 'Version', value: '6.3.0' },
          { label: 'Gate', value: 'Manual approval required before start' },
          { label: 'Queue', value: '2' },
        ],
      }),
    ).toBe('Queue 2');
  });

  it('falls back to the version', () => {
    expect(keyMetricHint({ metrics: [{ label: 'Version', value: '2.5.2' }] })).toBe(
      'Version 2.5.2',
    );
  });

  it('is null without a short metric', () => {
    expect(keyMetricHint({ metrics: [] })).toBeNull();
    expect(
      keyMetricHint({
        metrics: [{ label: 'Gate', value: 'Manual approval required before start' }],
      }),
    ).toBeNull();
  });
});

describe('containerRows', () => {
  const docker = [{ name: 'a', uptime: '2 weeks', image: 'img:1' } as ContainerInfo];

  it('lists anomalies first and joins Docker uptime', () => {
    const rows = containerRows(
      {
        containers: [
          { name: 'b', state: 'healthy', cpuPercent: 0, memoryBytes: 0 },
          { name: 'a', state: 'healthy', cpuPercent: 1, memoryBytes: 2 },
          { name: 'c', state: 'unhealthy', cpuPercent: 0, memoryBytes: 0 },
        ],
      },
      docker,
    );
    expect(rows.map((row) => row.name)).toEqual(['c', 'a', 'b']);
    expect(rows[1]).toMatchObject({ uptime: '2 weeks', image: 'img:1' });
    expect(rows[2]?.uptime).toBeNull();
  });
});

describe('eventsForService', () => {
  const event = (id: string, at: string, serviceId: string | null): EventLogEntry => ({
    id,
    at,
    kind: 'service-state',
    severity: 'warning',
    title: id,
    detail: null,
    serviceId,
  });

  it('keeps the newest events of that service only', () => {
    const events = [
      event('old', '2026-09-01T10:00:00Z', 'radarr'),
      event('other', '2026-09-03T10:00:00Z', 'sonarr'),
      event('new', '2026-09-02T10:00:00Z', 'radarr'),
      event('global', '2026-09-04T10:00:00Z', null),
    ];
    expect(eventsForService(events, 'radarr').map((entry) => entry.id)).toEqual(['new', 'old']);
    expect(eventsForService(events, 'radarr', 1)).toHaveLength(1);
  });
});

describe('shortContainerNames', () => {
  it('drops the prefix shared by every container', () => {
    expect(shortContainerNames(['stack-api', 'stack-worker-a', 'stack-db'])).toEqual([
      'api',
      'worker-a',
      'db',
    ]);
  });

  it('keeps names that share nothing or belong to short lists', () => {
    expect(shortContainerNames(['seafile', 'seafile-db', 'seafile-mc'])).toEqual([
      'seafile',
      'seafile-db',
      'seafile-mc',
    ]);
    expect(shortContainerNames(['n8n', 'n8n-worker'])).toEqual(['n8n', 'n8n-worker']);
    expect(shortContainerNames(['a-x', 'b-y', 'c-z'])).toEqual(['a-x', 'b-y', 'c-z']);
  });
});
