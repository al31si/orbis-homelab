import type { SnapshotStatus } from '@/data';
import { t } from '@/i18n';
import { cx } from '@/lib/cx';
import { StatusDot } from './Badge';
import { RelativeTime } from './RelativeTime';
import styles from './UpdatedAt.module.css';

export interface UpdatedAtProps {
  fetchedAt: number | null;
  status: SnapshotStatus;
  className?: string;
}

/** "Updated 2 min ago", turning into "Outdated data" when stale or offline. */
export function UpdatedAt({ fetchedAt, status, className }: UpdatedAtProps) {
  if (status === 'loading' || (status === 'error' && fetchedAt === null)) {
    return (
      <span className={cx(styles.updated, className)} role="status">
        {status === 'loading' ? t('common.loading') : t('ui.updatedAt.failed')}
      </span>
    );
  }
  const degraded = status === 'stale' || status === 'offline' || status === 'error';
  return (
    <span className={cx(styles.updated, className)} role="status">
      <StatusDot tone={degraded ? 'warn' : 'ok'} />
      {degraded ? (
        <>
          <span>{status === 'offline' ? t('ui.updatedAt.offline') : t('ui.updatedAt.stale')}</span>
          <span className={styles.muted}>
            <RelativeTime value={fetchedAt} />
          </span>
        </>
      ) : (
        <span>
          {t('ui.updatedAt.updated')} <RelativeTime value={fetchedAt} />
        </span>
      )}
    </span>
  );
}
