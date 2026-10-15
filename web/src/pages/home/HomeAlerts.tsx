import type { Alert } from '@shared/api';
import { useFeatures } from '@/boot';
import { useT } from '@/i18n';
import { toneForSeverity } from '@/lib/tone';
import { StatusDot } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { List, ListRow } from '@/ui/List';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { alertHref, sortAlerts } from './summary';
import styles from './home.module.css';

const SEVERITY_KEY = {
  critical: 'home.alerts.critical',
  warning: 'home.alerts.warning',
  info: 'home.alerts.info',
} as const satisfies Record<Alert['severity'], string>;

/** The alerts as hairline-separated rows, critical first; each row leads to the page that explains it. */
export function AlertRows({ alerts }: { alerts: readonly Alert[] }) {
  const t = useT();
  const features = useFeatures();
  return (
    <List variant="plain" aria-label={t('home.alerts.title')}>
      {sortAlerts(alerts).map((alert) => (
        <ListRow
          key={alert.id}
          href={alertHref(alert, features)}
          multiline
          leading={<StatusDot tone={toneForSeverity(alert.severity)} />}
          title={
            <>
              <span className="sr-only">{t(SEVERITY_KEY[alert.severity])}: </span>
              {alert.title}
            </>
          }
          subtitle={alert.detail}
          trailing={<RelativeTime value={alert.since} className={styles.since} />}
        />
      ))}
    </List>
  );
}

/** Active alerts as a titled section of their own (used where there is no state plate, e.g. Activity). */
export function HomeAlerts({ alerts }: { alerts: readonly Alert[] }) {
  const t = useT();
  if (alerts.length === 0) return null;
  return (
    <Section title={t('home.alerts.title')}>
      <Card padding="none">
        <AlertRows alerts={alerts} />
      </Card>
    </Section>
  );
}
