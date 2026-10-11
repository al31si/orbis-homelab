import { describe, expect, it } from 'vitest';
import type {
  EventLogEntry,
  QuotaInfo,
  Session,
  Snapshot,
  TaskItem,
  UsageEntry,
} from '@shared/api';
import { t } from '@/i18n';
import {
  MAX_EVENTS,
  eventTone,
  formatNames,
  groupEventsByDay,
  latestEvents,
  missingIntegrations,
  pickTasks,
  quotaTone,
  snapshotStatus,
  usageState,
} from './derive';

function event(at: Date, overrides: Partial<EventLogEntry> = {}): EventLogEntry {
  return {
    id: `${at.getTime()}`,
    at: at.toISOString(),
    kind: 'alert-raised',
    severity: 'warning',
    title: 'Event',
    detail: null,
    serviceId: null,
    ...overrides,
  };
}

// Local-time dates keep the day grouping assertions independent of the machine time zone.
const NOW = new Date(2026, 8, 29, 15, 0).getTime();

describe('latestEvents', () => {
  it('sorts newest first and caps the list', () => {
    const events = Array.from({ length: 40 }, (_, index) => event(new Date(NOW - index * 60_000)));
    const shuffled = [...events].reverse();
    const latest = latestEvents(shuffled);
    expect(latest).toHaveLength(MAX_EVENTS);
    expect(latest[0]?.id).toBe(events[0]?.id);
    expect(latest[MAX_EVENTS - 1]?.id).toBe(events[MAX_EVENTS - 1]?.id);
  });
});

describe('groupEventsByDay', () => {
  it('labels today and yesterday, then spells the date out', () => {
    const events = [
      event(new Date(2026, 8, 29, 9, 0)),
      event(new Date(2026, 8, 29, 0, 5)),
      event(new Date(2026, 8, 28, 23, 55)),
      event(new Date(2026, 8, 25, 12, 0)),
    ];
    const days = groupEventsByDay(events, NOW);
    expect(days.slice(0, 2).map((day) => day.label)).toEqual([
      t('activity.events.today'),
      t('activity.events.yesterday'),
    ]);
    expect(days[2]?.label).toMatch(/25/);
    expect(days.map((day) => day.events.length)).toEqual([2, 1, 1]);
  });

  it('skips entries with an unreadable timestamp', () => {
    const broken = { ...event(new Date(NOW)), at: 'not a date' };
    expect(groupEventsByDay([broken], NOW)).toEqual([]);
  });
});

describe('eventTone', () => {
  it('shows recoveries as ok, including a recovered service', () => {
    expect(eventTone({ kind: 'alert-cleared', severity: 'info' })).toBe('ok');
    expect(eventTone({ kind: 'source-recovered', severity: 'info' })).toBe('ok');
    expect(eventTone({ kind: 'service-state', severity: 'info' })).toBe('ok');
  });

  it('follows the severity of a raised problem', () => {
    expect(eventTone({ kind: 'alert-raised', severity: 'critical' })).toBe('crit');
    expect(eventTone({ kind: 'service-state', severity: 'warning' })).toBe('warn');
    expect(eventTone({ kind: 'source-error', severity: 'warning' })).toBe('warn');
  });

  it('keeps startup informational', () => {
    expect(eventTone({ kind: 'startup', severity: 'info' })).toBe('info');
  });
});

function task(id: number, overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id,
    title: `Task ${id}`,
    project: null,
    done: false,
    dueDate: null,
    priority: 0,
    updated: new Date(NOW - id * 3_600_000).toISOString(),
    url: null,
    ...overrides,
  };
}

describe('pickTasks', () => {
  it('puts overdue tasks first, then the nearest due dates, then the latest updated', () => {
    const items = [
      task(1),
      task(2, { dueDate: new Date(NOW + 86_400_000).toISOString() }),
      task(3, { dueDate: new Date(NOW - 2 * 86_400_000).toISOString() }),
      task(4, { dueDate: new Date(NOW - 86_400_000).toISOString() }),
      task(5, { done: true, dueDate: new Date(NOW - 86_400_000).toISOString() }),
      task(6),
    ];
    expect(pickTasks(items, NOW, 10).map((item) => item.id)).toEqual([3, 4, 2, 1, 6]);
  });

  it('respects the limit', () => {
    expect(pickTasks([task(1), task(2), task(3)], NOW, 2)).toHaveLength(2);
  });
});

describe('quotaTone', () => {
  it('warns as the quota runs out', () => {
    expect(quotaTone(96)).toBe('ok');
    expect(quotaTone(24)).toBe('warn');
    expect(quotaTone(9)).toBe('crit');
  });
});

describe('snapshotStatus', () => {
  const base = {
    data: 1,
    fetchedAt: new Date(NOW - 10_000).toISOString(),
    error: null,
    intervalMs: 30_000,
  };

  it('is ready for fresh data and stale when the collector reports an error', () => {
    expect(snapshotStatus(base, NOW, false).status).toBe('ready');
    expect(snapshotStatus({ ...base, error: 'timeout' }, NOW, false).status).toBe('stale');
  });

  it('is an error when nothing was ever collected', () => {
    const snapshot = { data: null, fetchedAt: null, error: 'timeout', intervalMs: 30_000 };
    expect(snapshotStatus(snapshot, NOW, false)).toEqual({ status: 'error', fetchedAt: null });
  });
});

const SESSION = {
  integrations: [
    { id: 'jellyfin', label: 'Jellyfin', configured: false },
    { id: 'radarr', label: 'Radarr', configured: true },
    { id: 'sonarr', label: 'Sonarr', configured: false },
    { id: 'lidarr', label: 'Lidarr', configured: false },
    { id: 'vikunja', label: 'Vikunja', configured: false },
  ],
} as Session;

describe('missingIntegrations', () => {
  it('names the declared integrations of the group that lack credentials', () => {
    expect(missingIntegrations(SESSION, 'playback')).toEqual([
      { id: 'jellyfin', label: 'Jellyfin', secret: 'JELLYFIN_API_KEY' },
    ]);
    expect(missingIntegrations(SESSION, 'tasks')).toEqual([
      { id: 'vikunja', label: 'Vikunja', secret: 'VIKUNJA_API_TOKEN' },
    ]);
  });

  it('stays silent when any member of the group is configured', () => {
    expect(missingIntegrations(SESSION, 'media')).toEqual([]);
  });

  it('stays silent for integrations the instance does not declare', () => {
    expect(missingIntegrations(SESSION, 'downloads')).toEqual([]);
    expect(missingIntegrations(null, 'playback')).toEqual([]);
  });

  it('lists every member when the whole group is unconfigured', () => {
    const session = {
      integrations: [
        { id: 'sonarr', label: 'Sonarr', configured: false },
        { id: 'lidarr', label: 'Lidarr', configured: false },
      ],
    } as Session;
    expect(missingIntegrations(session, 'media').map((entry) => entry.secret)).toEqual([
      'SONARR_API_KEY',
      'LIDARR_API_KEY',
    ]);
  });
});

describe('usageState', () => {
  const quota: Snapshot<QuotaInfo> = {
    data: { plan: null, weekly: { remainingPercent: 50, resetsAt: new Date(NOW).toISOString() } },
    fetchedAt: new Date(NOW).toISOString(),
    error: null,
    intervalMs: 300_000,
  };
  const empty: Snapshot<QuotaInfo> = {
    data: null,
    fetchedAt: null,
    error: null,
    intervalMs: 300_000,
  };
  const entry = (overrides: Partial<UsageEntry>): UsageEntry => ({
    id: 'quota',
    label: 'Quota',
    pending: false,
    hint: null,
    snapshot: empty,
    ...overrides,
  });

  it('is pending while the source exists but produced nothing', () => {
    expect(usageState(entry({ pending: true, hint: 'Writer not set up' }))).toBe('pending');
  });

  it('shows the snapshot (data, stale or error) once the source has answered', () => {
    expect(usageState(entry({ snapshot: quota }))).toBe('snapshot');
    expect(usageState(entry({ snapshot: { ...empty, error: 'timeout' } }))).toBe('snapshot');
    expect(usageState(entry({ pending: true, snapshot: quota }))).toBe('snapshot');
  });
});

describe('formatNames', () => {
  it('joins the names as a list in the active language', () => {
    const text = formatNames(['Radarr', 'Sonarr', 'Lidarr']);
    expect(text).toContain('Radarr');
    expect(text).toContain('Lidarr');
    expect(formatNames(['Radarr'])).toBe('Radarr');
  });
});
