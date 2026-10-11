import type { MediaQueueInfo, Snapshot } from '@shared/api';
import { t } from '@/i18n';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { ServiceIcon } from '@/ui/ServiceIcon';
import type { UiTone } from '@/lib/tone';
import { SnapshotSection } from './SnapshotSection';
import styles from './activity.module.css';

type App = MediaQueueInfo['apps'][number];

const HEALTH_TONE: Record<App['health'][number]['type'], UiTone> = {
  ok: 'ok',
  notice: 'info',
  warning: 'warn',
  error: 'crit',
};

function AppRow({ app }: { app: App }) {
  const health = app.health.filter((entry) => entry.type !== 'ok');
  const queueTone: UiTone = app.queueErrors ? 'crit' : app.queueWarnings ? 'warn' : 'neutral';
  return (
    <ListRow
      href={`/services/${encodeURIComponent(app.id)}`}
      multiline
      leading={<ServiceIcon name={app.id} size={36} />}
      title={app.name}
      subtitle={
        <>
          <span className={styles.rowLine}>
            {app.version
              ? t('activity.media.version', { version: app.version })
              : t('activity.media.versionUnknown')}
          </span>
          {app.queueErrors && (
            <span className={styles.rowLine} data-tone="crit">
              {t('activity.media.queueErrors')}
            </span>
          )}
          {!app.queueErrors && app.queueWarnings && (
            <span className={styles.rowLine} data-tone="warn">
              {t('activity.media.queueWarnings')}
            </span>
          )}
          {health.map((entry) => (
            <span
              key={`${entry.type}:${entry.message}`}
              className={styles.rowLine}
              data-tone={HEALTH_TONE[entry.type]}
            >
              {entry.message}
            </span>
          ))}
          {app.updateAvailable && (
            <span className={styles.rowLine} data-tone="info">
              <span className={styles.updateLine}>
                <Icon name="arrow-up" size={13} />
                {t('activity.media.update', { version: app.updateAvailable })}
              </span>
            </span>
          )}
        </>
      }
      trailing={
        app.queueCount === 0 ? (
          <span className={styles.queueEmpty}>{t('activity.media.queueEmpty')}</span>
        ) : (
          <Badge tone={queueTone} dot={queueTone !== 'neutral'}>
            {t('activity.media.queued', { n: app.queueCount })}
          </Badge>
        )
      }
    />
  );
}

export function MediaSection({ snapshot }: { snapshot: Snapshot<MediaQueueInfo> }) {
  return (
    <SnapshotSection
      title={t('activity.media.title')}
      label={t('activity.media.label')}
      snapshot={snapshot}
    >
      {(data) =>
        data.apps.length === 0 ? (
          <Card>
            <p className={styles.muted}>{t('activity.media.none')}</p>
          </Card>
        ) : (
          <Card padding="none">
            <List variant="plain" aria-label={t('activity.media.listLabel')}>
              {data.apps.map((app) => (
                <AppRow key={app.id} app={app} />
              ))}
            </List>
          </Card>
        )
      }
    </SnapshotSection>
  );
}
