import type { Alert, EventLogEntry } from '../../shared/api.js';
import type { AlertNotification } from './core/types.js';
import type { T } from './i18n/index.js';
import type { JsonStore } from './lib/store.js';
import type { Candidate } from './rules.js';

export interface AlertState {
  /** Raised alerts by id. `notified` marks critical alerts that already triggered a push. */
  alerts: Record<string, Alert & { notified: boolean }>;
  events: EventLogEntry[];
}

export const EMPTY_ALERT_STATE: AlertState = { alerts: {}, events: [] };

const MAX_EVENTS = 300;

/**
 * Turns per-cycle rule candidates into stable alerts.
 * - A condition must persist for `graceMs` before it is raised (rides out restarts/blips).
 * - `since` is the first observation time and survives BFF restarts.
 * - Raising/clearing writes the activity log; critical alerts also emit a notification.
 */
export class AlertEngine {
  private readonly pending = new Map<string, number>();
  private counter = 0;

  constructor(
    private readonly store: JsonStore<AlertState>,
    private readonly graceMs: number,
    private readonly notify: (n: AlertNotification) => void,
    private readonly t: T,
  ) {}

  active(): Alert[] {
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    return Object.values(this.store.get().alerts)
      .map(({ notified: _notified, ...alert }) => alert)
      .sort((a, b) => rank[a.severity] - rank[b.severity] || a.since.localeCompare(b.since));
  }

  events(limit = 100): EventLogEntry[] {
    return this.store.get().events.slice(0, limit);
  }

  logStartup(appName: string, version: string, now = Date.now()): void {
    this.store.update((s) => {
      this.pushEvent(s, now, {
        kind: 'startup',
        severity: 'info',
        title: this.t('alerts.startupTitle', { name: appName }),
        detail: this.t('alerts.startupDetail', { version }),
        serviceId: null,
      });
    });
  }

  evaluate(candidates: Candidate[], now = Date.now()): void {
    const seen = new Set<string>();
    const notifications: AlertNotification[] = [];

    this.store.update((state) => {
      for (const c of candidates) {
        seen.add(c.id);
        const existing = state.alerts[c.id];
        if (existing) {
          const escalated = existing.severity !== 'critical' && c.severity === 'critical';
          existing.severity = c.severity;
          existing.title = c.title;
          existing.detail = c.detail;
          if (escalated && !existing.notified) {
            existing.notified = true;
            notifications.push({ kind: 'raised', alert: strip(existing) });
          }
          continue;
        }
        const firstSeen = this.pending.get(c.id) ?? now;
        this.pending.set(c.id, firstSeen);
        if (now - firstSeen < this.graceMs) continue;

        const alert: Alert & { notified: boolean } = {
          id: c.id,
          severity: c.severity,
          source: c.source,
          title: c.title,
          detail: c.detail,
          since: new Date(firstSeen).toISOString(),
          serviceId: c.serviceId,
          notified: c.severity === 'critical',
        };
        state.alerts[c.id] = alert;
        this.pending.delete(c.id);
        this.pushEvent(state, now, {
          kind: c.source === 'service' && c.serviceId ? 'service-state' : 'alert-raised',
          severity: c.severity,
          title: c.title,
          detail: c.detail || null,
          serviceId: c.serviceId,
        });
        if (c.severity === 'critical') notifications.push({ kind: 'raised', alert: strip(alert) });
      }

      for (const id of [...this.pending.keys()]) if (!seen.has(id)) this.pending.delete(id);

      for (const [id, alert] of Object.entries(state.alerts)) {
        if (seen.has(id)) continue;
        delete state.alerts[id];
        this.pushEvent(state, now, {
          kind: alert.source === 'service' && alert.serviceId ? 'service-state' : 'alert-cleared',
          severity: 'info',
          title: this.t('alerts.resolved', { title: alert.title }),
          detail: null,
          serviceId: alert.serviceId,
        });
        if (alert.notified) notifications.push({ kind: 'cleared', alert: strip(alert) });
      }
    });

    for (const n of notifications) this.notify(n);
  }

  private pushEvent(state: AlertState, now: number, e: Omit<EventLogEntry, 'id' | 'at'>): void {
    state.events.unshift({ id: `${now}-${this.counter++}`, at: new Date(now).toISOString(), ...e });
    if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
  }
}

function strip({ notified: _n, ...alert }: Alert & { notified: boolean }): Alert {
  return alert;
}
