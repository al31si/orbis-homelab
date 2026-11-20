import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { toneForSeverity } from '@/lib/tone';
import { AppLink } from '@/ui/AppLink';
import { StatusDot } from '@/ui/Badge';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { eventsForService } from './catalog';
import styles from './detail.module.css';

/**
 * The last five events that concern this service. Mount it only when `features.activity` is on:
 * it subscribes to the activity snapshot, which does not exist otherwise.
 */
export function ServiceEvents({ serviceId }: { serviceId: string }) {
  const t = useT();
  const activity = useSnapshot('activity');
  const events = activity.data ? eventsForService(activity.data.events, serviceId) : [];

  let body;
  if (!activity.data) {
    body =
      activity.status === 'loading' ? (
        <Skeleton height={64} radius={8} />
      ) : (
        <p className={styles.empty}>{t('services.events.unavailable')}</p>
      );
  } else if (events.length === 0) {
    body = <p className={styles.empty}>{t('services.events.none')}</p>;
  } else {
    body = (
      <ul className={styles.rows} aria-label={t('services.events.list')}>
        {events.map((event) => {
          const tone = toneForSeverity(event.severity);
          return (
            <li key={event.id} className={styles.row} data-tone={tone}>
              <StatusDot tone={tone} className={styles.rowLamp} />
              <span className={styles.rowMain}>
                <span className={styles.rowTitleWrap}>{event.title}</span>
                {event.detail && <span className={styles.rowSub}>{event.detail}</span>}
              </span>
              <RelativeTime value={event.at} className={styles.eventTime} />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Section
      title={t('services.events.title')}
      action={
        <AppLink href="/activity" className={styles.sectionLink}>
          {t('services.events.link')}
        </AppLink>
      }
    >
      {body}
    </Section>
  );
}
