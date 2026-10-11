import { useMemo, useState } from 'react';
import type { EventLogEntry } from '@shared/api';
import { t } from '@/i18n';
import { formatClock } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { Section } from '@/ui/Section';
import { INITIAL_EVENTS, eventIcon, eventTone, groupEventsByDay, latestEvents } from './derive';
import styles from './activity.module.css';

/** Event log grouped by day, newest first; shows the latest ten, up to thirty on request. */
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
        <Card className={styles.allClear}>
          <Icon name="clock" size={20} />
          <p>{t('activity.events.none')}</p>
        </Card>
      ) : (
        <Card padding="none">
          {days.map((day) => (
            <div key={day.key} className={styles.day}>
              <h3 className={styles.dayTitle}>{day.label}</h3>
              <List variant="plain">
                {day.events.map((event) => {
                  const tone = eventTone(event);
                  return (
                    <ListRow
                      key={event.id}
                      href={
                        event.serviceId
                          ? `/services/${encodeURIComponent(event.serviceId)}`
                          : undefined
                      }
                      multiline
                      leading={
                        <span className={styles.eventIcon} data-tone={tone}>
                          <Icon name={eventIcon(event)} size={18} />
                        </span>
                      }
                      title={event.title}
                      subtitle={event.detail ?? undefined}
                      trailing={
                        <time className={styles.eventTime} dateTime={event.at}>
                          {formatClock(event.at)}
                        </time>
                      }
                    />
                  );
                })}
              </List>
            </div>
          ))}
          {hidden > 0 && (
            <div className={styles.more}>
              <Button variant="ghost" size="sm" fullWidth onClick={() => setExpanded(true)}>
                {t('activity.events.showMore', { n: hidden })}
              </Button>
            </div>
          )}
        </Card>
      )}
    </Section>
  );
}
