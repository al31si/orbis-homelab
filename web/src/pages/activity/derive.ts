import type { EventLogEntry, Session, Snapshot, TaskItem, UsageEntry } from '@shared/api';
import { deriveStatus, type SnapshotStatus } from '@/data/status';
import { getLocale, t } from '@/i18n';
import type { UiTone } from '@/lib/tone';
import type { IconName } from '@/ui/icons';

const formats = new Map<string, Intl.DateTimeFormat>();

/** `Intl.DateTimeFormat` for the active locale, built once per locale and option set. */
function dateFormat(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const id = `${getLocale()}:${key}`;
  let format = formats.get(id);
  if (!format) {
    format = new Intl.DateTimeFormat(getLocale(), options);
    formats.set(id, format);
  }
  return format;
}

/** The event log keeps growing on the BFF; the page only ever shows the latest ones. */
export const MAX_EVENTS = 30;
export const INITIAL_EVENTS = 10;

/** Newest first, capped to `max`. */
export function latestEvents(events: readonly EventLogEntry[], max = MAX_EVENTS): EventLogEntry[] {
  return [...events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, max);
}

export interface EventDay {
  /** Local calendar day, `YYYY-MM-DD`. */
  key: string;
  label: string;
  events: EventLogEntry[];
}

function dayKey(time: number): string {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function dayLabel(time: number, now: number): string {
  const key = dayKey(time);
  if (key === dayKey(now)) return t('activity.events.today');
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === dayKey(yesterday.getTime())) return t('activity.events.yesterday');
  return dateFormat('day', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(time)
    .replace(/^./, (letter) => letter.toLocaleUpperCase(getLocale()));
}

/** Groups already sorted events (newest first) by local calendar day, keeping their order. */
export function groupEventsByDay(events: readonly EventLogEntry[], now: number): EventDay[] {
  const days: EventDay[] = [];
  for (const event of events) {
    const time = Date.parse(event.at);
    if (Number.isNaN(time)) continue;
    const key = dayKey(time);
    const last = days[days.length - 1];
    if (last?.key === key) last.events.push(event);
    else days.push({ key, label: dayLabel(time, now), events: [event] });
  }
  return days;
}

/** Recoveries are green, raised problems follow their severity, the rest is informational. */
export function eventTone(event: Pick<EventLogEntry, 'kind' | 'severity'>): UiTone {
  switch (event.kind) {
    case 'alert-cleared':
    case 'source-recovered':
      return 'ok';
    case 'startup':
      return 'info';
    default:
      // The BFF logs a service that recovered as an `info` service-state event.
      if (event.severity === 'critical') return 'crit';
      if (event.severity === 'warning') return 'warn';
      return event.kind === 'service-state' ? 'ok' : 'info';
  }
}

export function eventIcon(event: Pick<EventLogEntry, 'kind' | 'severity'>): IconName {
  switch (event.kind) {
    case 'alert-raised':
      return event.severity === 'critical' ? 'alert-circle' : 'alert';
    case 'alert-cleared':
    case 'source-recovered':
      return 'check-circle';
    case 'service-state':
      return eventTone(event) === 'ok' ? 'check-circle' : 'services';
    case 'source-error':
      return 'x-circle';
    case 'startup':
      return 'play';
  }
}

export function isOverdue(task: Pick<TaskItem, 'dueDate' | 'done'>, now: number): boolean {
  if (task.done || !task.dueDate) return false;
  const due = Date.parse(task.dueDate);
  return !Number.isNaN(due) && due < now;
}

/**
 * Open tasks worth a glance: overdue first (most overdue first), then by due date, then the
 * most recently touched ones.
 */
export function pickTasks(items: readonly TaskItem[], now: number, limit: number): TaskItem[] {
  const dueOf = (task: TaskItem) =>
    task.dueDate ? Date.parse(task.dueDate) : Number.POSITIVE_INFINITY;
  return items
    .filter((task) => !task.done)
    .sort((a, b) => {
      const overdue = Number(isOverdue(b, now)) - Number(isOverdue(a, now));
      if (overdue !== 0) return overdue;
      const due = dueOf(a) - dueOf(b);
      if (due !== 0 && !Number.isNaN(due)) return due;
      return Date.parse(b.updated) - Date.parse(a.updated);
    })
    .slice(0, limit);
}

/** Remaining quota: comfortable above 25 %, a warning from there, critical below 10 %. */
export function quotaTone(remainingPercent: number): UiTone {
  if (remainingPercent < 10) return 'crit';
  return remainingPercent < 25 ? 'warn' : 'ok';
}

/** "Fri 3 Oct, 20:19" (local time, active language) for a quota reset moment. */
export function formatResetMoment(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '—';
  return dateFormat('reset', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(time);
}

/** Per-integration status, derived exactly like the page-level snapshots. */
export function snapshotStatus(
  snapshot: Snapshot<unknown>,
  now: number,
  offline: boolean,
): { status: SnapshotStatus; fetchedAt: number | null } {
  const parsed = snapshot.fetchedAt === null ? Number.NaN : Date.parse(snapshot.fetchedAt);
  const fetchedAt = Number.isNaN(parsed) ? null : parsed;
  return {
    fetchedAt,
    status: deriveStatus(
      {
        hasData: snapshot.data !== null,
        fetchedAt,
        intervalMs: snapshot.intervalMs,
        snapshotError: snapshot.error,
        fetchError: null,
        offline,
      },
      now,
    ),
  };
}

/**
 * Integration groups behind the optional sections. A group is a section fed by one or more
 * integration ids declared in `services.yaml` (the media queues cover the whole *arr family).
 */
export const INTEGRATION_GROUPS = {
  downloads: ['qbittorrent'],
  media: ['radarr', 'sonarr', 'lidarr', 'prowlarr'],
  tasks: ['vikunja'],
  playback: ['jellyfin'],
} as const satisfies Record<string, readonly string[]>;

export type IntegrationGroup = keyof typeof INTEGRATION_GROUPS;

/**
 * The secret an integration reads when `services.yaml` does not name another one (the session
 * carries the integration id, not its secret reference).
 */
const DEFAULT_SECRET_OVERRIDES: Record<string, string> = { vikunja: 'VIKUNJA_API_TOKEN' };

export interface MissingIntegration {
  id: string;
  label: string;
  secret: string;
}

/**
 * The declared integrations of a group that lack credentials, only when none of the group is
 * configured (otherwise the group's snapshot exists and there is nothing to explain). Empty when
 * the session does not declare any integration of the group.
 */
export function missingIntegrations(
  session: Session | null,
  group: IntegrationGroup,
): MissingIntegration[] {
  const ids: readonly string[] = INTEGRATION_GROUPS[group];
  const declared = (session?.integrations ?? []).filter((entry) => ids.includes(entry.id));
  if (declared.some((entry) => entry.configured)) return [];
  return declared.map(({ id, label }) => ({
    id,
    label,
    secret: DEFAULT_SECRET_OVERRIDES[id] ?? `${id.toUpperCase()}_API_KEY`,
  }));
}

/**
 * A usage provider whose source exists in configuration but produced nothing yet is "pending":
 * it explains itself instead of reporting an error.
 */
export function usageState(entry: UsageEntry): 'pending' | 'snapshot' {
  return entry.pending && entry.snapshot.data === null ? 'pending' : 'snapshot';
}

/** "Radarr, Sonarr and Lidarr" in the active language. */
export function formatNames(names: readonly string[]): string {
  return new Intl.ListFormat(getLocale(), { style: 'long', type: 'conjunction' }).format(names);
}
