import { useApp } from '@/boot';
import { useSession, useSnapshot } from '@/data';
import { ExtensionActivitySections } from '@/extensions/ActivitySections';
import { t } from '@/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Page, PageHeader } from '@/ui/Page';
import { Skeleton } from '@/ui/Skeleton';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { ActivityAlerts } from './activity/ActivityAlerts';
import { missingIntegrations } from './activity/derive';
import { DownloadsSection } from './activity/DownloadsSection';
import { EventsSection } from './activity/EventsSection';
import { MediaSection } from './activity/MediaSection';
import { NotConfigured } from './activity/NotConfigured';
import { PlaybackSection } from './activity/PlaybackSection';
import { TasksSection } from './activity/TasksSection';
import { UsageSection } from './activity/UsageSection';
import styles from './activity/activity.module.css';

function ActivitySkeleton() {
  return (
    <div className={styles.stack} aria-busy="true" aria-label={t('activity.loading')}>
      <div className={styles.column}>
        <Skeleton height={72} radius={20} />
        <Skeleton height={250} radius={20} />
        <Skeleton height={190} radius={20} />
      </div>
      <div className={styles.column}>
        <Skeleton height={150} radius={20} />
        <Skeleton height={96} radius={20} />
        <Skeleton height={320} radius={20} />
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const app = useApp();
  const activity = useSnapshot('activity');
  const overview = useSnapshot('overview');
  const session = useSession();
  const data = activity.data;

  let body;
  if (data) {
    const { downloads, mediaQueue, tasks, playback } = data;
    body = (
      <div className={styles.stack}>
        <div className={styles.column}>
          <ActivityAlerts overview={overview} />
          <ExtensionActivitySections />
          {downloads ? (
            <DownloadsSection snapshot={downloads} />
          ) : (
            <NotConfigured
              title={t('activity.downloads.title')}
              icon="download"
              missing={missingIntegrations(session, 'downloads')}
              benefit={t('activity.downloads.benefit')}
              credential={t('activity.downloads.credential')}
            />
          )}
          {mediaQueue ? (
            <MediaSection snapshot={mediaQueue} />
          ) : (
            <NotConfigured
              title={t('activity.media.title')}
              icon="services"
              missing={missingIntegrations(session, 'media')}
              benefit={t('activity.media.benefit')}
              credential={t('activity.media.credential')}
            />
          )}
        </div>
        <div className={styles.column}>
          {tasks ? (
            <TasksSection snapshot={tasks} />
          ) : (
            <NotConfigured
              title={t('activity.tasks.title')}
              icon="list"
              missing={missingIntegrations(session, 'tasks')}
              benefit={t('activity.tasks.benefit')}
              credential={t('activity.tasks.credential')}
            />
          )}
          {playback ? (
            <PlaybackSection snapshot={playback} />
          ) : (
            <NotConfigured
              title={t('activity.playback.title')}
              icon="play"
              missing={missingIntegrations(session, 'playback')}
              benefit={t('activity.playback.benefit')}
              credential={t('activity.playback.credential')}
            />
          )}
          <UsageSection usage={data.usage} />
          <EventsSection events={data.events} />
        </div>
      </div>
    );
  } else if (activity.status === 'loading') {
    body = <ActivitySkeleton />;
  } else if (activity.status === 'offline') {
    body = (
      <EmptyState
        icon="wifi-off"
        title={t('activity.offline.title', { name: app.name })}
        description={t('activity.offline.description')}
        action={
          <Button icon="refresh" onClick={() => void activity.refresh()}>
            {t('activity.retry')}
          </Button>
        }
      />
    );
  } else {
    body = (
      <ErrorState
        description={activity.error ?? undefined}
        onRetry={() => void activity.refresh()}
      />
    );
  }

  return (
    <Page>
      <PageHeader
        title={t('activity.title')}
        subtitle={
          <>
            {t('activity.subtitle', { name: app.name })}
            <UpdatedAt
              fetchedAt={activity.fetchedAt}
              status={activity.status}
              className={styles.headUpdated}
            />
          </>
        }
      />
      {body}
    </Page>
  );
}
