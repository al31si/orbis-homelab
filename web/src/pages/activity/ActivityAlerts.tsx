import type { Overview } from '@shared/api';
import type { SnapshotResult } from '@/data';
import { t } from '@/i18n';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { HomeAlerts } from '../home/HomeAlerts';
import styles from './activity.module.css';

/** Active alerts from the overview, with a calm "all clear" line when there are none. */
export function ActivityAlerts({ overview }: { overview: SnapshotResult<Overview> }) {
  const alerts = overview.data?.alerts;
  if (alerts && alerts.length > 0) return <HomeAlerts alerts={alerts} />;

  return (
    <Section title={t('activity.alerts.title')}>
      {alerts ? (
        <Card className={styles.allClear} data-ok>
          <Icon name="check-circle" size={20} />
          <p>{t('activity.alerts.none')}</p>
        </Card>
      ) : overview.status === 'loading' ? (
        <Skeleton height={64} radius={20} />
      ) : (
        <Card tone="warn" className={styles.failed} role="alert">
          <Icon name="alert" size={20} />
          <div>
            <p className={styles.failedTitle}>{t('activity.alerts.failed')}</p>
            {overview.error && <p className={styles.failedDetail}>{overview.error}</p>}
          </div>
        </Card>
      )}
    </Section>
  );
}
