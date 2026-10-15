import { useApp } from '@/boot';
import { useSnapshot } from '@/data';
import { getLocale, t } from '@/i18n';
import { useNow } from '@/lib/useNow';
import { ErrorState } from '@/ui/ErrorState';
import { EmptyState } from '@/ui/EmptyState';
import { Button } from '@/ui/Button';
import { Page, PageHeader } from '@/ui/Page';
import { Skeleton } from '@/ui/Skeleton';
import { HomeFavorites } from './home/HomeFavorites';
import { HomeHero } from './home/HomeHero';
import { HomeServices } from './home/HomeServices';
import { HomeVitals } from './home/HomeVitals';
import { InstallHint } from './home/InstallHint';
import styles from './home/home.module.css';

/** "Wednesday 30 September" in the instance language, first letter capitalised. */
function formatToday(now: number): string {
  const text = new Intl.DateTimeFormat(getLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
  return text.replace(/^./, (letter) => letter.toUpperCase());
}

function HomeSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label={t('home.loading')}>
      <div className={styles.column}>
        <Skeleton height={132} radius="var(--radius-lg)" />
        <Skeleton height={236} radius="var(--radius-lg)" />
      </div>
      <div className={styles.column}>
        <Skeleton height={160} radius="var(--radius-lg)" />
        <Skeleton height={104} radius="var(--radius-lg)" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const overview = useSnapshot('overview');
  const services = useSnapshot('services');
  const app = useApp();
  const now = useNow(60_000);

  const eyebrow = formatToday(now);
  const data = overview.data;

  let body;
  if (data) {
    body = (
      <div className={styles.home}>
        <div className={styles.layout}>
          <div className={styles.column}>
            <HomeHero overview={data} status={overview.status} fetchedAt={overview.fetchedAt} />
            <HomeVitals overview={data} />
          </div>
          <div className={styles.column}>
            <HomeServices
              summary={data.services}
              problemServiceIds={data.problemServiceIds}
              services={services.data}
            />
            {services.data && <HomeFavorites services={services.data} />}
          </div>
        </div>
        <InstallHint />
      </div>
    );
  } else if (overview.status === 'loading') {
    body = <HomeSkeleton />;
  } else if (overview.status === 'offline') {
    body = (
      <EmptyState
        icon="wifi-off"
        title={t('home.offline.title', { name: app.name })}
        description={t('home.offline.description')}
        action={
          <Button icon="refresh" onClick={() => void overview.refresh()}>
            {t('home.offline.retry')}
          </Button>
        }
      />
    );
  } else {
    body = (
      <ErrorState
        description={overview.error ?? undefined}
        onRetry={() => void overview.refresh()}
      />
    );
  }

  return (
    <Page>
      <PageHeader title={app.name} eyebrow={eyebrow} />
      {body}
    </Page>
  );
}
