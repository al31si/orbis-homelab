import { useMemo, useState } from 'react';
import type { EventLogEntry } from '@shared/api';
import { t } from '@/i18n';
import { formatClock } from '@/lib/format';
import type { UiTone } from '@/lib/tone';
import { useNow } from '@/lib/useNow';
import { AppLink } from '@/ui/AppLink';
import { StatusDot } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Section } from '@/ui/Section';
import { INITIAL_EVENTS, eventTone, groupEventsByDay, latestEvents } from './derive';
import styles from './activity.module.css';

/** A lamp is for state: plain information stays unlit. */
function lampTone(event: EventLogEntry): Exclude<UiTone, 'info'> {
  const tone = eventTone(event);
  return tone === 'info' ? 'neutral' : tone;
}

function lampLabel(tone: Exclude<UiTone, 'info'>): string {
  switch (tone) {
    case 'ok':
      return t('activity.events.tone.ok');
    case 'warn':
      return t('activity.events.tone.warn');
    case 'crit':
      return t('activity.events.tone.crit');
    case 'neutral':
      return t('activity.events.tone.neutral');
  }
}

function EventRow({ event }: { event: EventLogEntry }) {
  const tone = lampTone(event);
  const content = (
    <>
      <time className={styles.eventTime} dateTime={event.at}>
        {formatClock(event.at)}
      </time>
      <span className={styles.eventRail}>
        <StatusDot tone={tone} label={lampLabel(tone)} className={styles.eventLamp} />
      </span>
      <span className={styles.eventBody}>
        <span className={styles.eventTitle}>{event.title}</span>
        {event.detail && <span className={styles.eventDetail}>{event.detail}</span>}
      </span>
    </>
  );
  return (
    <li>
      {event.serviceId ? (
        <AppLink href={`/services/${encodeURIComponent(event.serviceId)}`} className={styles.event}>
          {content}
        </AppLink>
      ) : (
        <div className={styles.event}>{content}</div>
      )}
    </li>
  );
}

/** Event log as a timeline, grouped by day, newest first; shows ten, up to thirty on request. */
export function EventsSection({ events }: { events: readonly EventLogEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const now = useNow(60_000);
  const latest = useMemo(() => latestEvents(events), [events]);
  const visible = expanded ? latest : latest.slice(0, INITIAL_EVENTS);
  const days = useMemo(() => groupEventsByDay(visible, now), [visible, now]);
  const hidden = latest.length - visible.length;

  return (
    <Section title={t('activity.events.title')}>
      {latest.length === 0 ? (
        <p className={styles.muted}>{t('activity.events.none')}</p>
      ) : (
        <div className={styles.log}>
          {days.map((day) => (
            <div key={day.key} className={styles.day}>
              <h3 className={styles.dayTitle}>{day.label}</h3>
              <ol className={styles.timeline}>
                {day.events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ol>
            </div>
          ))}
          {hidden > 0 && (
            <Button variant="secondary" fullWidth onClick={() => setExpanded(true)}>
              {t('activity.events.showMore', { n: hidden })}
            </Button>
          )}
        </div>
      )}
    </Section>
  );
}
