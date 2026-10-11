import { useApp } from '@/boot';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Page, PageHeader } from '@/ui/Page';
import { Skeleton } from '@/ui/Skeleton';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { monitoringCounts } from './services/catalog';
import { ServicesBrowser } from './services/ServicesBrowser';
import styles from './services/services.module.css';

function ServicesSkeleton() {
  const t = useT();
  return (
    <div className={styles.layout} aria-busy="true" aria-label={t('services.loading')}>
      <Skeleton height={44} radius={14} />
      <Skeleton width={260} height={36} radius={999} />
      <Skeleton height={232} radius={20} />
      <Skeleton height={156} radius={20} />
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
    body = <ServicesBrowser services={data} />;
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
        subtitle={
          data && (
            <>
              {t('services.summary', monitoringCounts(data))}
              <UpdatedAt
                fetchedAt={services.fetchedAt}
                status={services.status}
                className={styles.updated}
              />
            </>
          )
        }
      />
      {body}
    </Page>
  );
}
