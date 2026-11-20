import type { Alert, Overview, Severity } from '@shared/api';
import { useFeatures } from '@/boot';
import type { SnapshotResult } from '@/data';
import { t } from '@/i18n';
import { toneForSeverity } from '@/lib/tone';
import { AppLink } from '@/ui/AppLink';
import { StatusDot } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon, type IconName } from '@/ui/icons';
import { Notice } from '@/ui/Notice';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { alertHref, sortAlerts } from '../home/summary';
import styles from './activity.module.css';

const ICON: Record<Severity, IconName> = {
  critical: 'alert-circle',
  warning: 'alert',
  info: 'info',
};

function severityLabel(severity: Severity): string {
  switch (severity) {
    case 'critical':
      return t('activity.alerts.critical');
    case 'warning':
      return t('activity.alerts.warning');
    case 'info':
      return t('activity.alerts.info');
  }
}

/** Critical first; the plate takes the tone of the worst one, so the edge lamp says how bad. */
function AlertList({ alerts }: { alerts: readonly Alert[] }) {
  const features = useFeatures();
  const sorted = sortAlerts(alerts);
  const worst = sorted[0]?.severity;
  return (
    <Section title={t('activity.alerts.title')}>
      <Card padding="none" tone={worst && worst !== 'info' ? toneForSeverity(worst) : undefined}>
        <ul className={styles.alerts}>
          {sorted.map((alert) => (
            <li key={alert.id}>
              <AppLink
                href={alertHref(alert, features)}
                className={styles.alert}
                data-tone={toneForSeverity(alert.severity)}
              >
                <span
                  className={styles.alertIcon}
                  role="img"
                  aria-label={severityLabel(alert.severity)}
                >
                  <Icon name={ICON[alert.severity]} size={22} />
                </span>
                <span className={styles.alertText}>
                  <span className={styles.alertTitle}>{alert.title}</span>
                  <span className={styles.alertDetail}>{alert.detail}</span>
                  <RelativeTime value={alert.since} className={styles.alertSince} />
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  );
}

/**
 * Active alerts, loud and first; without any, one calm line with a lamp. Failing to read them is
 * said plainly, since "nothing shown" would otherwise look like "nothing wrong".
 */
export function ActivityAlerts({ overview }: { overview: SnapshotResult<Overview> }) {
  const alerts = overview.data?.alerts;
  if (alerts && alerts.length > 0) return <AlertList alerts={alerts} />;

  if (alerts) {
    return (
      <p className={styles.calm}>
        <StatusDot tone="ok" />
        {t('activity.alerts.none')}
      </p>
    );
  }
  if (overview.status === 'loading') return <Skeleton height={24} radius="var(--radius-sm)" />;
  return (
    <div role="alert">
      <Notice tone="warn" title={t('activity.alerts.failed')}>
        {overview.error}
      </Notice>
    </div>
  );
}
