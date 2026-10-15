import type { ReactNode } from 'react';
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
  const radius = 'var(--radius-lg)';
  return (
    <div className={styles.stack} aria-busy="true" aria-label={t('activity.loading')}>
      <div className={styles.column}>
        <Skeleton height={24} radius={radius} />
        <Skeleton height={250} radius={radius} />
        <Skeleton height={230} radius={radius} />
      </div>
      <div className={styles.column}>
        <Skeleton height={190} radius={radius} />
        <Skeleton height={320} radius={radius} />
      </div>
    </div>
  );
}

/** An integration that is declared but not connected yet: an empty bay, kept below what is live. */
function Bay({ children }: { children: ReactNode }) {
  return <div className={styles.bay}>{children}</div>;
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
    const bays = [
      {
        group: 'downloads',
        present: downloads,
        title: t('activity.downloads.title'),
        benefit: t('activity.downloads.benefit'),
        credential: t('activity.downloads.credential'),
      },
      {
        group: 'media',
        present: mediaQueue,
        title: t('activity.media.title'),
        benefit: t('activity.media.benefit'),
        credential: t('activity.media.credential'),
      },
      {
        group: 'playback',
        present: playback,
        title: t('activity.playback.title'),
        benefit: t('activity.playback.benefit'),
        credential: t('activity.playback.credential'),
      },
      {
        group: 'tasks',
        present: tasks,
        title: t('activity.tasks.title'),
        benefit: t('activity.tasks.benefit'),
        credential: t('activity.tasks.credential'),
      },
    ] as const;
    body = (
      <div className={styles.stack}>
        <div className={styles.column}>
          <ActivityAlerts overview={overview} />
          <ExtensionActivitySections />
          {downloads && (
            <div className={styles.live}>
              <DownloadsSection snapshot={downloads} />
            </div>
          )}
          {mediaQueue && (
            <div className={styles.live}>
              <MediaSection snapshot={mediaQueue} />
            </div>
          )}
          {playback && (
            <div className={styles.live}>
              <PlaybackSection snapshot={playback} />
            </div>
          )}
          {tasks && (
            <div className={styles.live}>
              <TasksSection snapshot={tasks} />
            </div>
          )}
          {bays.map(({ group, present, ...copy }) => {
            const missing = present ? [] : missingIntegrations(session, group);
            return (
              missing.length > 0 && (
                <Bay key={group}>
                  <NotConfigured missing={missing} {...copy} />
                </Bay>
              )
            );
          })}
        </div>
        <div className={styles.column}>
          {data.usage.length > 0 && (
            <div className={styles.usage}>
              <UsageSection usage={data.usage} />
            </div>
          )}
          <div className={styles.history}>
            <EventsSection events={data.events} />
          </div>
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
