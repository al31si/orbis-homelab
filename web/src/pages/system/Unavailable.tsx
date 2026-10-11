import type { ReactNode } from 'react';
import type { SnapshotResult } from '@/data';
import { useApp } from '@/boot';
import { useT } from '@/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';

export interface UnavailableProps {
  snapshot: SnapshotResult<unknown>;
  /** Shown while the first load is running. */
  skeleton: ReactNode;
  /** Title of the error block. */
  title: string;
}

/** Placeholder, offline and error blocks for a panel whose snapshot has no data yet. */
export function Unavailable({ snapshot, skeleton, title }: UnavailableProps) {
  const t = useT();
  const app = useApp();
  if (snapshot.status === 'loading') return skeleton;
  if (snapshot.status === 'offline') {
    return (
      <EmptyState
        icon="wifi-off"
        title={t('system.offline.title', { name: app.name })}
        description={t('system.offline.description')}
        action={
          <Button icon="refresh" onClick={() => void snapshot.refresh()}>
            {t('system.retry')}
          </Button>
        }
      />
    );
  }
  return (
    <ErrorState
      title={title}
      description={snapshot.error ?? undefined}
      onRetry={() => void snapshot.refresh()}
    />
  );
}
