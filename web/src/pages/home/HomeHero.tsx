import type { Overview } from '@shared/api';
import type { SnapshotStatus } from '@/data';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { toneForStatus } from '@/lib/tone';
import { StatusDot } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { RelativeTime } from '@/ui/RelativeTime';
import { AlertRows } from './HomeAlerts';
import { heroStatus, heroSummary, statusWord } from './summary';
import styles from './home.module.css';

export interface HomeHeroProps {
  overview: Overview;
  status: SnapshotStatus;
  fetchedAt: number | null;
}

/** When the numbers were read; a lamp appears only when they are old or the link is down. */
function Updated({ fetchedAt, status }: Pick<HomeHeroProps, 'fetchedAt' | 'status'>) {
  const t = useT();
  if (status === 'loading' || (status === 'error' && fetchedAt === null)) {
    return (
      <p className={styles.updated} role="status">
        {status === 'loading' ? t('common.loading') : t('ui.updatedAt.failed')}
      </p>
    );
  }
  const degraded = status === 'stale' || status === 'offline' || status === 'error';
  return (
    <p className={styles.updated} role="status">
      {degraded ? (
        <>
          <StatusDot tone="warn" />
          <span>{status === 'offline' ? t('ui.updatedAt.offline') : t('ui.updatedAt.stale')}</span>
          <RelativeTime value={fetchedAt} className={styles.updatedAge} />
        </>
      ) : (
        <span>
          {t('ui.updatedAt.updated')} <RelativeTime value={fetchedAt} />
        </span>
      )}
    </p>
  );
}

/**
 * The state of the system as one sentence on a plate edged by the state lamp. The open alerts
 * sit in the same plate, so what is wrong is read together with the verdict.
 */
export function HomeHero({ overview, status, fetchedAt }: HomeHeroProps) {
  const overall = heroStatus(overview);
  const tone = toneForStatus(overall);
  const hasProblems = overview.alerts.some((alert) => alert.severity !== 'info');
  const sentence =
    overall === 'ok' || !(hasProblems || overall === 'unknown')
      ? statusWord(overall)
      : heroSummary(overview, overall);
  return (
    <Card padding="none" tone={tone} className={styles.state}>
      <div className={styles.stateHead}>
        <h2 className={cx(styles.sentence, (tone === 'warn' || tone === 'crit') && styles.alarm)}>
          {sentence}
        </h2>
        <Updated fetchedAt={fetchedAt} status={status} />
      </div>
      {overview.alerts.length > 0 && (
        <div className={styles.stateAlerts}>
          <AlertRows alerts={overview.alerts} />
        </div>
      )}
    </Card>
  );
}
