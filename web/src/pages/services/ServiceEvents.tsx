import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { toneForSeverity } from '@/lib/tone';
import { StatusDot } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { List, ListRow } from '@/ui/List';
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
        <Skeleton height={64} radius={20} />
      ) : (
        <p className={styles.empty}>{t('services.events.unavailable')}</p>
      );
  } else if (events.length === 0) {
    body = <p className={styles.empty}>{t('services.events.none')}</p>;
  } else {
    body = (
      <List variant="plain" aria-label={t('services.events.list')}>
        {events.map((event) => (
          <ListRow
            key={event.id}
            multiline
            leading={<StatusDot tone={toneForSeverity(event.severity)} />}
            title={event.title}
            subtitle={event.detail ?? undefined}
            trailing={<RelativeTime value={event.at} className={styles.eventTime} />}
          />
        ))}
      </List>
    );
  }

  return (
    <Section
      title={t('services.events.title')}
      action={
        <Button href="/activity" variant="ghost" size="sm">
          {t('services.events.link')}
        </Button>
      }
    >
      <Card padding="none">{body}</Card>
    </Section>
  );
}
