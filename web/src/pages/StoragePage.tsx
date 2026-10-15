import type { StorageInfo } from '@shared/api';
import { useApp, useFeatures } from '@/boot';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Notice } from '@/ui/Notice';
import { Page, PageHeader } from '@/ui/Page';
import { Skeleton } from '@/ui/Skeleton';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { HealthSection } from './storage/HealthSection';
import {
  poolViews,
  problemDisks,
  type SmartView,
  smartView,
  standaloneVolumes,
} from './storage/derive';
import { PoolSection } from './storage/PoolSection';
import { baysOf, VolumesSection } from './storage/Volumes';
import styles from './storage/storage.module.css';

function StorageSkeleton() {
  const t = useT();
  return (
    <div className={styles.page} aria-busy="true" aria-label={t('storage.loading')}>
      <Skeleton height={300} radius={10} />
      <Skeleton height={260} radius={10} />
    </div>
  );
}

/** Every section appears only when the data behind it exists on this instance. */
function StorageSections({ storage, smart }: { storage: StorageInfo; smart: SmartView | null }) {
  const t = useT();
  const pools = poolViews(storage);
  const volumes = standaloneVolumes(storage);

  if (pools.length === 0 && volumes.length === 0 && smart === null) {
    return (
      <EmptyState
        icon="disk"
        title={t('storage.empty.title')}
        description={t('storage.empty.description')}
      />
    );
  }

  const health = smart && <HealthSection {...smart} />;
  const pool = pools.length > 0 && <PoolSection views={pools} />;
  const bays = baysOf(pools, volumes, smart?.disks ?? []);
  const main = (pool || bays.length > 0) && (
    <div className={styles.main}>
      {pool}
      <VolumesSection bays={bays} />
    </div>
  );
  // A disk that needs attention comes first on narrow screens; wide screens keep the columns.
  const attention = smart !== null && problemDisks(smart.disks).length > 0;
  return (
    <div className={styles.layout} data-solo={!(main && health) || undefined}>
      {attention ? health : main}
      {attention ? main : health}
    </div>
  );
}

export default function StoragePage() {
  const t = useT();
  const app = useApp();
  const { smart: smartEnabled } = useFeatures();
  const storage = useSnapshot('storage');
  const data = storage.data;
  const smart = data ? smartView(data, smartEnabled) : null;

  let body;
  if (data) {
    body = (
      <div className={styles.page}>
        {storage.status === 'stale' && storage.error && (
          <Notice tone="warn" title={t('storage.stale')}>
            {storage.error}
          </Notice>
        )}
        <StorageSections storage={data} smart={smart} />
      </div>
    );
  } else if (storage.status === 'loading') {
    body = <StorageSkeleton />;
  } else if (storage.status === 'offline') {
    body = (
      <EmptyState
        icon="wifi-off"
        title={t('storage.offline.title', { name: app.name })}
        description={t('storage.offline.description')}
        action={
          <Button icon="refresh" onClick={() => void storage.refresh()}>
            {t('storage.retry')}
          </Button>
        }
      />
    );
  } else {
    body = (
      <ErrorState
        title={t('storage.error')}
        description={storage.error ?? undefined}
        onRetry={() => void storage.refresh()}
      />
    );
  }

  return (
    <Page>
      <PageHeader
        title={t('storage.title')}
        subtitle={<UpdatedAt fetchedAt={storage.fetchedAt} status={storage.status} />}
      />
      {body}
    </Page>
  );
}
