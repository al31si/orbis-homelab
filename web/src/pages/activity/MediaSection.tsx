import type { MediaQueueInfo, Snapshot } from '@shared/api';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import type { UiTone } from '@/lib/tone';
import { AppLink } from '@/ui/AppLink';
import { Badge, StatusDot } from '@/ui/Badge';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { Figure } from './parts';
import { SnapshotSection } from './SnapshotSection';
import styles from './activity.module.css';

type App = MediaQueueInfo['apps'][number];

const HEALTH_TONE: Record<App['health'][number]['type'], UiTone> = {
  ok: 'ok',
  notice: 'neutral',
  warning: 'warn',
  error: 'crit',
};

/** One lamp and its sentence. */
function Note({ tone, children }: { tone: UiTone; children: string }) {
  return (
    <span className={styles.note} data-tone={tone}>
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}

function AppRow({ app }: { app: App }) {
  const health = app.health.filter((entry) => entry.type !== 'ok');
  const queueTone: UiTone | undefined = app.queueErrors
    ? 'crit'
    : app.queueWarnings
      ? 'warn'
      : undefined;
  return (
    <li>
      <AppLink href={`/services/${encodeURIComponent(app.id)}`} className={styles.appRow}>
        <ServiceIcon name={app.id} label={app.name} serviceId={app.id} integration={app.id} />
        <span className={styles.appText}>
          <span className={styles.appName}>{app.name}</span>
          <span className={styles.appVersion}>
            {app.version
              ? t('activity.media.version', { version: app.version })
              : t('activity.media.versionUnknown')}
          </span>
          {app.queueErrors && <Note tone="crit">{t('activity.media.queueErrors')}</Note>}
          {!app.queueErrors && app.queueWarnings && (
            <Note tone="warn">{t('activity.media.queueWarnings')}</Note>
          )}
          {health.map((entry) => (
            <Note key={`${entry.type}:${entry.message}`} tone={HEALTH_TONE[entry.type]}>
              {entry.message}
            </Note>
          ))}
          {app.updateAvailable && (
            <Badge className={styles.update}>
              {t('activity.media.update', { version: app.updateAvailable })}
            </Badge>
          )}
        </span>
        <Figure
          value={formatNumber(app.queueCount)}
          caption={t('activity.media.inQueue')}
          tone={queueTone}
          dim={app.queueCount === 0}
        />
      </AppLink>
    </li>
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
          <p className={styles.muted}>{t('activity.media.none')}</p>
        ) : (
          <ul className={styles.rows} aria-label={t('activity.media.listLabel')}>
            {data.apps.map((app) => (
              <AppRow key={app.id} app={app} />
            ))}
          </ul>
        )
      }
    </SnapshotSection>
  );
}
