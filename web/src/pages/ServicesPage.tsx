import { useApp } from '@/boot';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Page, PageHeader } from '@/ui/Page';
import { Skeleton } from '@/ui/Skeleton';
import { ServicesBrowser } from './services/ServicesBrowser';
import { ServicesSummary } from './services/ServicesSummary';
import styles from './services/services.module.css';

function ServicesSkeleton() {
  const t = useT();
  return (
    <div className={styles.layout} aria-busy="true" aria-label={t('services.loading')}>
      <Skeleton height={44} radius={8} />
      <Skeleton width={260} height={44} radius={5} />
      <div className={styles.skeletonRows}>
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className={styles.skeletonRow}>
            <Skeleton width={44} height={44} radius={10} />
            <div className={styles.skeletonText}>
              <Skeleton width="45%" height={18} radius={4} />
              <Skeleton width="70%" height={14} radius={4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const t = useT();
  const app = useApp();
  const services = useSnapshot('services');
  const data = services.data;

  let body;
  if (data) {
    body = (
      <ServicesBrowser services={data} fetchedAt={services.fetchedAt} status={services.status} />
    );
  } else if (services.status === 'loading') {
    body = <ServicesSkeleton />;
  } else if (services.status === 'offline') {
    body = (
      <EmptyState
        icon="wifi-off"
        title={t('services.offline.title', { name: app.name })}
        description={t('services.offline.description')}
        action={
          <Button icon="refresh" onClick={() => void services.refresh()}>
            {t('services.offline.retry')}
          </Button>
        }
      />
    );
  } else {
    body = (
      <ErrorState
        description={services.error ?? undefined}
        onRetry={() => void services.refresh()}
      />
    );
  }

  return (
    <Page>
      <PageHeader
        title={t('services.title')}
        subtitle={data && <ServicesSummary services={data} />}
      />
      {body}
    </Page>
  );
}
