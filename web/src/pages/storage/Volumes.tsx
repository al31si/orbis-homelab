import type { VolumeInfo } from '@shared/api';
import { useT } from '@/i18n';
import { formatBytes, formatPercent } from '@/lib/format';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import { usageTone, volumeSubtitle, volumeTitle } from './derive';
import styles from './storage.module.css';

export interface VolumeItem {
  volume: VolumeInfo;
  /** Pool legend tint, for volumes that are members of a pool. */
  color?: string;
}

function VolumeCard({ volume, color }: VolumeItem) {
  const t = useT();
  const tone = usageTone(volume.percent);
  const title = volumeTitle(volume);
  return (
    <Card className={styles.fs} data-tone={tone}>
      <div className={styles.fsHead}>
        <div className={styles.fsId}>
          {color && <span className={styles.swatch} style={{ background: color }} aria-hidden />}
          <div className={styles.fsName}>
            <h3 className={styles.fsTitle}>{title}</h3>
            <p className={styles.dSub}>{volumeSubtitle(volume)}</p>
          </div>
        </div>
        <span className={styles.fsPercent} data-tone={tone}>
          {formatPercent(volume.percent, 1)}
        </span>
      </div>
      <ProgressBar
        value={volume.percent}
        tone={tone}
        label={t('storage.volume.usage', { name: title })}
        size="sm"
      />
      <p className={styles.dMuted}>
        {t('storage.volume.line', {
          used: formatBytes(volume.usedBytes),
          free: formatBytes(volume.availableBytes),
          total: formatBytes(volume.sizeBytes),
        })}
      </p>
    </Card>
  );
}

/** Usage cards, two per row from the tablet breakpoint up. */
export function VolumeCards({ items }: { items: readonly VolumeItem[] }) {
  return (
    <ul className={styles.filesystems}>
      {items.map((item) => (
        <li key={item.volume.mount}>
          <VolumeCard {...item} />
        </li>
      ))}
    </ul>
  );
}

export interface VolumesSectionProps {
  volumes: readonly VolumeInfo[];
  /** True when pools already show their own volumes above: this list is then the remainder. */
  afterPools: boolean;
}

export function VolumesSection({ volumes, afterPools }: VolumesSectionProps) {
  const t = useT();
  if (volumes.length === 0) return null;
  return (
    <Section title={afterPools ? t('storage.volumes.others') : t('storage.volumes.section')}>
      <VolumeCards items={volumes.map((volume) => ({ volume }))} />
    </Section>
  );
}
