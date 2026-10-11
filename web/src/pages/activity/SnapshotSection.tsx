import type { ReactNode } from 'react';
import type { Snapshot } from '@shared/api';
import { useConnection } from '@/data';
import { t } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { snapshotStatus } from './derive';
import styles from './activity.module.css';

export interface SnapshotSectionProps<T> {
  title: string;
  /** Name of the data source in error messages ("qBittorrent"). */
  label: string;
  snapshot: Snapshot<T>;
  children: (data: T) => ReactNode;
}

/**
 * A page section fed by one integration snapshot. It owns its loading, error and stale
 * presentation, so one failing integration never affects the others.
 */
export function SnapshotSection<T>({ title, label, snapshot, children }: SnapshotSectionProps<T>) {
  const now = useNow(5_000);
  const offline = useConnection().status === 'offline';
  const { status, fetchedAt } = snapshotStatus(snapshot, now, offline);
  const stale = snapshot.data !== null && (status === 'stale' || status === 'offline');

  let body: ReactNode;
  if (snapshot.data !== null) {
    body = children(snapshot.data);
  } else if (snapshot.error) {
    body = (
      <Card tone="warn" className={styles.failed} role="alert">
        <Icon name="alert" size={20} />
        <div>
          <p className={styles.failedTitle}>{t('activity.snapshot.failed', { label })}</p>
          <p className={styles.failedDetail}>{snapshot.error}</p>
        </div>
      </Card>
    );
  } else {
    body = <Skeleton height={96} radius={20} />;
  }

  return (
    <Section
      title={title}
      action={
        stale && (
          <Badge tone="warn" dot>
            {t('activity.snapshot.stale')} · <RelativeTime value={fetchedAt} />
          </Badge>
        )
      }
    >
      {body}
    </Section>
  );
}
