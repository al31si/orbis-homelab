import type { DownloadsInfo, Snapshot } from '@shared/api';
import { t } from '@/i18n';
import { formatBytesPerSec, formatNumber } from '@/lib/format';
import { StatusDot } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { SourceHead } from './parts';
import { SnapshotSection } from './SnapshotSection';
import styles from './activity.module.css';

const NBSP = '\u00a0';

function Rate({
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
    <div className={styles.rate} data-dim={bytes === 0 || undefined}>
      <dt className={styles.rateLabel}>
        <Icon name={icon} size={16} />
        {label}
      </dt>
      <dd className={styles.rateFigure}>
        <span className={styles.rateValue}>{value}</span>
        {unit && <span className={styles.rateUnit}>{unit}</span>}
      </dd>
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone?: 'crit' }) {
  return (
    <div
      className={styles.count}
      data-tone={value > 0 ? tone : undefined}
      data-dim={!value || undefined}
    >
      <dt className={styles.countLabel}>{label}</dt>
      <dd className={styles.countValue}>{formatNumber(value)}</dd>
    </div>
  );
}

function Downloads({ data }: { data: DownloadsInfo }) {
  return (
    <Card className={styles.plate}>
      <SourceHead
        logo={<ServiceIcon name="qbittorrent" label="qBittorrent" integration="qbittorrent" />}
        name="qBittorrent"
        detail={data.version}
        aside={
          <span className={styles.lampText}>
            <StatusDot tone={data.connected ? 'ok' : 'warn'} />
            {data.connected
              ? t('activity.downloads.connected')
              : t('activity.downloads.disconnected')}
          </span>
        }
      />
      <dl className={styles.rates}>
        <Rate
          label={t('activity.downloads.download')}
          icon="arrow-down"
          bytes={data.downloadBytesPerSec}
        />
        <Rate
          label={t('activity.downloads.upload')}
          icon="arrow-up"
          bytes={data.uploadBytesPerSec}
        />
      </dl>
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
