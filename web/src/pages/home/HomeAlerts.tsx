import type { Alert } from '@shared/api';
import { useFeatures } from '@/boot';
import { useT } from '@/i18n';
import { toneForSeverity } from '@/lib/tone';
import { Card } from '@/ui/Card';
import { Icon, type IconName } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { alertHref, sortAlerts } from './summary';
import styles from './home.module.css';

const ICON_BY_SEVERITY: Record<Alert['severity'], IconName> = {
  critical: 'alert-circle',
  warning: 'alert',
  info: 'info',
};

/** Active alerts, critical first; each one leads to the page that explains it. */
export function HomeAlerts({ alerts }: { alerts: readonly Alert[] }) {
  const t = useT();
  const features = useFeatures();
  if (alerts.length === 0) return null;
  return (
    <Section title={t('home.alerts.title')}>
      <div className={styles.alerts}>
        {sortAlerts(alerts).map((alert) => {
          const tone = toneForSeverity(alert.severity);
          return (
            <Card key={alert.id} padding="none" tone={alert.severity === 'info' ? undefined : tone}>
              <List variant="plain">
                <ListRow
                  href={alertHref(alert, features)}
                  multiline
                  leading={
                    <span className={styles.alertIcon} data-tone={tone}>
                      <Icon name={ICON_BY_SEVERITY[alert.severity]} size={22} />
                    </span>
                  }
                  title={alert.title}
                  subtitle={alert.detail}
                  trailing={<RelativeTime value={alert.since} className={styles.since} />}
                />
              </List>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
