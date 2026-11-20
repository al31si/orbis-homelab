import { useParams } from 'wouter';
import { useApp } from '@/boot';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { AppLink } from '@/ui/AppLink';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Icon } from '@/ui/icons';
import { Page, PageHeader } from '@/ui/Page';
import { Skeleton } from '@/ui/Skeleton';
import { ServiceDetail } from './services/ServiceDetail';
import styles from './services/detail.module.css';

function BackLink() {
  const t = useT();
  return (
    <AppLink href="/services" className={styles.back}>
      <Icon name="chevron-left" size={20} />
      {t('services.title')}
    </AppLink>
  );
}

function DetailSkeleton() {
  const t = useT();
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label={t('services.detail.loading')}>
      <div className={styles.skeletonHead}>
        <Skeleton width={72} height={72} radius={14} />
        <div className={styles.skeletonTitle}>
          <Skeleton width="55%" height={32} radius={4} />
          <Skeleton width="80%" height={18} radius={4} />
        </div>
      </div>
      <Skeleton height={44} radius={8} />
      <Skeleton height={120} radius={4} />
      <Skeleton height={140} radius={4} />
    </div>
  );
}

export default function ServiceDetailPage() {
  const t = useT();
  const app = useApp();
  const { id = '' } = useParams<{ id: string }>();
  const services = useSnapshot('services');

  const service = services.data?.find((candidate) => candidate.id === id);

  if (service) {
    return (
      <Page>
        <BackLink />
        <ServiceDetail service={service} fetchedAt={services.fetchedAt} status={services.status} />
      </Page>
    );
  }

  if (!services.data && services.status === 'loading') {
    return (
      <Page>
        <BackLink />
        <DetailSkeleton />
      </Page>
    );
  }

  let body;
  if (services.data) {
    body = (
      <EmptyState
        icon="services"
        title={t('services.detail.notFound.title')}
        description={t('services.detail.notFound.description', { id })}
        action={
          <Button href="/services" icon="chevron-left">
            {t('services.detail.notFound.back')}
          </Button>
        }
      />
    );
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
      <BackLink />
      <PageHeader title={t('services.detail.title')} />
      {body}
    </Page>
  );
}
