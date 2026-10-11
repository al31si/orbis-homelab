import type { DownloadsInfo, Snapshot } from '@shared/api';
import { t } from '@/i18n';
import { formatBytesPerSec, formatNumber } from '@/lib/format';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { SnapshotSection } from './SnapshotSection';
import styles from './activity.module.css';

const NBSP = '\u00a0';

function Speed({
  label,
  icon,
  bytes,
}: {
  label: string;
  icon: 'arrow-down' | 'arrow-up';
  bytes: number;
}) {
  const [value = '0', unit] = formatBytesPerSec(bytes).split(NBSP);
  return (
    <div className={styles.speed} data-tone={bytes > 0 ? 'info' : 'neutral'}>
      <span className={styles.speedLabel}>
        <Icon name={icon} size={16} />
        {label}
      </span>
      <span className={styles.speedFigure}>
        <span className={styles.speedValue}>{value}</span>
        {unit && <span className={styles.speedUnit}>{unit}</span>}
      </span>
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone?: 'crit' }) {
  return (
    <div className={styles.count} data-tone={value > 0 ? tone : undefined}>
      <dd className={styles.countValue}>{formatNumber(value)}</dd>
      <dt className={styles.countLabel}>{label}</dt>
    </div>
  );
}

function Downloads({ data }: { data: DownloadsInfo }) {
  return (
    <Card padding="none">
      <div className={styles.cardHead}>
        <ServiceIcon name="qbittorrent" size={36} />
        <div className={styles.cardHeadText}>
          <p className={styles.cardTitle}>qBittorrent</p>
          {data.version && <p className={styles.cardSubtitle}>{data.version}</p>}
        </div>
        <Badge tone={data.connected ? 'ok' : 'warn'} dot>
          {data.connected
            ? t('activity.downloads.connected')
            : t('activity.downloads.disconnected')}
        </Badge>
      </div>
      <div className={styles.speeds}>
        <Speed
          label={t('activity.downloads.download')}
          icon="arrow-down"
          bytes={data.downloadBytesPerSec}
        />
        <Speed
          label={t('activity.downloads.upload')}
          icon="arrow-up"
          bytes={data.uploadBytesPerSec}
        />
      </div>
      <dl className={styles.counts}>
        <Count label={t('activity.downloads.active')} value={data.active} />
        <Count label={t('activity.downloads.downloading')} value={data.downloading} />
        <Count label={t('activity.downloads.seeding')} value={data.seeding} />
        <Count label={t('activity.downloads.paused')} value={data.paused} />
        <Count label={t('activity.downloads.errored')} value={data.errored} tone="crit" />
      </dl>
    </Card>
  );
}

export function DownloadsSection({ snapshot }: { snapshot: Snapshot<DownloadsInfo> }) {
  return (
    <SnapshotSection title={t('activity.downloads.title')} label="qBittorrent" snapshot={snapshot}>
      {(data) => <Downloads data={data} />}
    </SnapshotSection>
  );
}
