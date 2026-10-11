import type { PlaybackInfo, Snapshot } from '@shared/api';
import { t } from '@/i18n';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { SnapshotSection } from './SnapshotSection';
import styles from './activity.module.css';

function Playback({ data }: { data: PlaybackInfo }) {
  return (
    <Card padding="none">
      <div className={styles.cardHead}>
        <ServiceIcon name="jellyfin" size={36} />
        <div className={styles.cardHeadText}>
          <p className={styles.cardTitle}>Jellyfin</p>
          <p className={styles.cardSubtitle}>
            {data.activeCount === 0
              ? t('activity.playback.none')
              : t('activity.playback.count', { n: data.activeCount })}
          </p>
        </div>
      </div>
      {data.restricted ? (
        <p className={styles.restricted}>
          <Icon name="lock" size={16} />
          {t('activity.playback.restricted')}
        </p>
      ) : (
        data.sessions.length > 0 && (
          <div className={styles.divided}>
            <List variant="plain" aria-label={t('activity.playback.listLabel')}>
              {data.sessions.map((session, index) => (
                <ListRow
                  key={`${session.user}:${session.device}:${index}`}
                  multiline
                  title={session.title}
                  subtitle={`${session.user} · ${session.device}`}
                  trailing={
                    <>
                      {session.paused && <Badge>{t('activity.playback.paused')}</Badge>}
                      {session.transcoding && (
                        <Badge tone="info">{t('activity.playback.transcoding')}</Badge>
                      )}
                    </>
                  }
                />
              ))}
            </List>
          </div>
        )
      )}
    </Card>
  );
}

export function PlaybackSection({ snapshot }: { snapshot: Snapshot<PlaybackInfo> }) {
  return (
    <SnapshotSection title={t('activity.playback.title')} label="Jellyfin" snapshot={snapshot}>
      {(data) => <Playback data={data} />}
    </SnapshotSection>
  );
}
