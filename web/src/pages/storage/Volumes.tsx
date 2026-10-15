import type { DiskInfo, VolumeInfo } from '@shared/api';
import { useT } from '@/i18n';
import { formatBytes, formatPercent } from '@/lib/format';
import type { UiTone } from '@/lib/tone';
import { StatusDot } from '@/ui/Badge';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import {
  POOL_CRITICAL_PERCENT,
  POOL_WARN_PERCENT,
  toneForDiskStatus,
  usageTone,
  usageVerdict,
  volumeTitle,
  type PoolView,
} from './derive';
import styles from './storage.module.css';

/** One filesystem: its volume, the SMART disk behind it when known, and the pool it belongs to. */
export interface Bay {
  volume: VolumeInfo;
  disk: DiskInfo | undefined;
  poolLabel: string | undefined;
}

/** Pool members first, in pool order, then the filesystems no pool shows. */
export function baysOf(
  pools: readonly PoolView[],
  standalone: readonly VolumeInfo[],
  disks: readonly DiskInfo[],
): Bay[] {
  const diskAt = (mount: string) => disks.find((disk) => disk.mount === mount);
  return [
    ...pools.flatMap(({ pool, members }) =>
      members.map((volume) => ({ volume, disk: diskAt(volume.mount), poolLabel: pool.label })),
    ),
    ...standalone.map((volume) => ({ volume, disk: diskAt(volume.mount), poolLabel: undefined })),
  ];
}

/** A lamp is as bad as the worst of the space left and the SMART status of the disk behind it. */
function worst(a: UiTone, b: UiTone): UiTone {
  const rank: Record<string, number> = { ok: 0, warn: 1, crit: 2 };
  return (rank[b] ?? 0) > (rank[a] ?? 0) ? b : a;
}

function BayRow({ volume, disk, poolLabel }: Bay) {
  const t = useT();
  const usage = usageTone(volume.percent);
  const diskTone = disk && disk.status !== 'OK' ? toneForDiskStatus(disk.status) : 'ok';
  const tone = worst(usage, diskTone);
  const state =
    diskTone !== 'ok' && disk ? t(`storage.status.${disk.status}`) : usageVerdict(volume.percent);
  const title = volumeTitle(volume);
  const titleIsPath = volume.label === null;

  return (
    <li className={styles.bay} data-tone={tone}>
      <StatusDot tone={tone} label={state} className={styles.lamp} />
      <h3
        className={styles.bayTitle}
        data-path={titleIsPath || undefined}
        title={volume.label === null ? volume.mount : `${volume.label} ${volume.mount}`}
      >
        {title}
      </h3>
      <div className={styles.bayMeter}>
        <ProgressBar
          value={volume.percent}
          tone={usage}
          warnAt={POOL_WARN_PERCENT}
          critAt={POOL_CRITICAL_PERCENT}
          label={t('storage.volume.usage', { name: title })}
          size="sm"
          cells={24}
        />
        <span className={styles.bayPercent} data-tone={usage}>
          {formatPercent(volume.percent)}
        </span>
      </div>
      <p className={styles.bayFacts}>
        {!titleIsPath && <span className={styles.path}>{volume.mount}</span>}
        {volume.device !== '' && <span>{volume.device}</span>}
        {volume.type !== '' && <span>{volume.type}</span>}
        {poolLabel && <span>{poolLabel}</span>}
        {tone !== 'ok' && <span className={styles.state}>{state}</span>}
      </p>
      <p className={styles.bayUsed}>
        {t('storage.volume.usedOf', {
          used: formatBytes(volume.usedBytes),
          total: formatBytes(volume.sizeBytes),
        })}
      </p>
      <p className={styles.bayFree}>
        <strong>{formatBytes(volume.availableBytes)}</strong>
        <span>{t('storage.volume.free')}</span>
      </p>
    </li>
  );
}

export function VolumesSection({ bays }: { bays: readonly Bay[] }) {
  const t = useT();
  if (bays.length === 0) return null;
  return (
    <Section
      title={t('storage.volumes.section')}
      action={t('storage.summary.volumes', { n: bays.length })}
    >
      <ul className={styles.bays}>
        {bays.map((bay) => (
          <BayRow key={bay.volume.mount} {...bay} />
        ))}
      </ul>
    </Section>
  );
}
