import type { ReactNode } from 'react';
import type { Snapshot } from '@shared/api';
import { useConnection } from '@/data';
import { t } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { Badge } from '@/ui/Badge';
import { Notice } from '@/ui/Notice';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { snapshotStatus } from './derive';
import styles from './activity.module.css';

/** Whether the data of an integration is old (or the device is offline), and when it was read. */
export function useFreshness(snapshot: Snapshot<unknown>): {
  stale: boolean;
  fetchedAt: number | null;
} {
  const now = useNow(5_000);
  const offline = useConnection().status === 'offline';
  const { status, fetchedAt } = snapshotStatus(snapshot, now, offline);
  return {
    stale: snapshot.data !== null && (status === 'stale' || status === 'offline'),
    fetchedAt,
  };
}

/** "Out of date", then how long ago the data was read. */
export function StaleNote({ fetchedAt }: { fetchedAt: number | null }) {
  return (
    <span className={styles.stale}>
      <Badge tone="warn" dot>
        {t('activity.snapshot.stale')}
      </Badge>
      <RelativeTime value={fetchedAt} />
    </span>
  );
}

export interface SnapshotBodyProps<T> {
  /** Name of the data source in error messages ("qBittorrent"). */
  label: string;
  snapshot: Snapshot<T>;
  children: (data: T) => ReactNode;
}

/** The data when there is some, else the reason why not: the integration's own error, or loading. */
export function SnapshotBody<T>({ label, snapshot, children }: SnapshotBodyProps<T>) {
  if (snapshot.data !== null) return <>{children(snapshot.data)}</>;
  if (snapshot.error) {
    return (
      <div role="alert">
        <Notice tone="warn" title={t('activity.snapshot.failed', { label })}>
          {snapshot.error}
        </Notice>
      </div>
    );
  }
  return <Skeleton height={96} radius="var(--radius-lg)" />;
}

export interface SnapshotSectionProps<T> extends SnapshotBodyProps<T> {
  title: string;
}

/**
 * A page section fed by one integration snapshot. It owns its loading, error and stale
 * presentation, so one failing integration never affects the others.
 */
export function SnapshotSection<T>({ title, label, snapshot, children }: SnapshotSectionProps<T>) {
  const { stale, fetchedAt } = useFreshness(snapshot);
  return (
    <Section title={title} action={stale && <StaleNote fetchedAt={fetchedAt} />}>
      <SnapshotBody label={label} snapshot={snapshot}>
        {children}
      </SnapshotBody>
    </Section>
  );
}
