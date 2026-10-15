import type { PlaybackInfo, Snapshot } from '@shared/api';
import { t } from '@/i18n';
import { Badge, StatusDot } from '@/ui/Badge';
import { Icon } from '@/ui/icons';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { SourceHead } from './parts';
import { SnapshotSection } from './SnapshotSection';
import styles from './activity.module.css';

type Session = PlaybackInfo['sessions'][number];

function SessionRow({ session }: { session: Session }) {
  return (
    <li className={styles.session}>
      <span className={styles.sessionText}>
        <span className={styles.sessionTitle}>{session.title}</span>
        <span className={styles.sessionWho}>
          <span>{session.user}</span>
          <span className={styles.sessionDevice}>{session.device}</span>
        </span>
      </span>
      <span className={styles.sessionState}>
        {session.paused ? (
          <Badge>{t('activity.playback.paused')}</Badge>
        ) : (
          <span className={styles.lampText}>
            <StatusDot tone="ok" />
            {t('activity.playback.playing')}
          </span>
        )}
        {session.transcoding && <Badge tone="info">{t('activity.playback.transcoding')}</Badge>}
      </span>
    </li>
  );
}

function Playback({ data }: { data: PlaybackInfo }) {
  return (
    <div className={styles.source}>
      <SourceHead
        logo={<ServiceIcon name="jellyfin" label="Jellyfin" integration="jellyfin" />}
        name="Jellyfin"
        detail={
          data.activeCount === 0
            ? t('activity.playback.none')
            : t('activity.playback.count', { n: data.activeCount })
        }
      />
      {data.restricted ? (
        <p className={styles.restricted}>
          <Icon name="lock" size={16} />
          {t('activity.playback.restricted')}
        </p>
      ) : (
        data.sessions.length > 0 && (
          <ul className={styles.rows} aria-label={t('activity.playback.listLabel')}>
            {data.sessions.map((session, index) => (
              <SessionRow key={`${session.user}:${session.device}:${index}`} session={session} />
            ))}
          </ul>
        )
      )}
    </div>
  );
}

export function PlaybackSection({ snapshot }: { snapshot: Snapshot<PlaybackInfo> }) {
  return (
    <SnapshotSection title={t('activity.playback.title')} label="Jellyfin" snapshot={snapshot}>
      {(data) => <Playback data={data} />}
    </SnapshotSection>
  );
}
