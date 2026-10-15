import type { DiskInfo, SmartSummary } from '@shared/api';
import { useT } from '@/i18n';
import { formatNumber, formatTemperature, PLACEHOLDER } from '@/lib/format';
import { Badge, StatusDot } from '@/ui/Badge';
import { ProgressBar } from '@/ui/ProgressBar';
import {
  activeCounters,
  COUNTER_KEYS,
  diskCounterTone,
  diskTemperatureTone,
  powerOnSpan,
  problemDisks,
  toneForDiskStatus,
} from './derive';
import styles from './storage.module.css';

interface DiskRowProps {
  disk: DiskInfo;
  limits: SmartSummary;
}

function DiskRow({ disk, limits }: DiskRowProps) {
  const t = useT();
  const readable = disk.smart !== 'UNAVAILABLE';
  // An unreadable report says nothing about health: do not paint it green.
  const unverified = !readable && disk.status === 'OK';
  const tone = unverified ? 'neutral' : toneForDiskStatus(disk.status);
  const status = unverified ? t('storage.disks.unverified') : t(`storage.status.${disk.status}`);
  const temperatureTone = diskTemperatureTone(disk.temperatureC, limits);
  const smartTone = disk.smart === 'FAILED' ? 'crit' : 'neutral';
  const message =
    disk.status === 'OK'
      ? ''
      : disk.message.trim() ||
        t('storage.health.smartState', { state: t(`storage.smart.${disk.smart}`) });
  const counters = readable ? activeCounters(disk) : [];
  const historical = readable && disk.uncorrectableHistorical && disk.uncorrectable > 0;

  return (
    <li className={styles.disk} data-tone={tone}>
      <div className={styles.diskHead}>
        <h3 className={styles.diskTitle}>{disk.label}</h3>
        <span className={styles.diskStatus}>
          <StatusDot tone={tone} />
          {status}
        </span>
      </div>

      <p className={styles.diskFacts}>
        <span>{disk.model}</span>
        <span>{t('storage.disks.serial', { tail: disk.serialTail })}</span>
        <span>{disk.device}</span>
        {disk.mount && <span className={styles.path}>{disk.mount}</span>}
      </p>

      {message && <p className={styles.diskMessage}>{message}</p>}

      <dl className={styles.readings}>
        <div>
          <dt>{t('storage.disks.temperature')}</dt>
          <dd className={styles.reading} data-tone={temperatureTone}>
            {formatTemperature(disk.temperatureC)}
          </dd>
          {disk.temperatureC !== null && (
            <ProgressBar
              value={disk.temperatureC}
              max={limits.temperatureCriticalC}
              tone={temperatureTone}
              label={t('storage.disks.temperatureMeter', { name: disk.label })}
              size="sm"
              cells={10}
            />
          )}
        </div>
        <div>
          <dt>{t('storage.disks.powerOn')}</dt>
          <dd className={styles.reading}>
            {disk.powerOnHours === null
              ? PLACEHOLDER
              : t('storage.disks.hours', { n: formatNumber(disk.powerOnHours) })}
          </dd>
          {disk.powerOnHours !== null && (
            <dd className={styles.readingHint}>{powerOnSpan(disk.powerOnHours)}</dd>
          )}
        </div>
        <div>
          <dt>{t('storage.disks.smart')}</dt>
          <dd className={styles.word} data-tone={smartTone}>
            {t(`storage.smart.${disk.smart}`)}
          </dd>
        </div>
      </dl>

      {(counters.length > 0 || historical) && (
        <ul className={styles.counters}>
          {COUNTER_KEYS.filter((key) => disk[key] > 0).map((key) => (
            <li key={key}>
              <Badge tone={diskCounterTone(disk, key)}>
                {formatNumber(disk[key])} {t(`storage.counterInline.${key}`)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export interface DiskListProps {
  disks: readonly DiskInfo[];
  smart: SmartSummary;
}

/** Disks that need attention come first; the listed order is kept within each group. */
export function DiskList({ disks, smart }: DiskListProps) {
  const t = useT();
  const sorted = [...problemDisks(disks), ...disks.filter((disk) => disk.status === 'OK')];
  return (
    <ul className={styles.disks} aria-label={t('storage.disks.list')}>
      {sorted.map((disk) => (
        <DiskRow key={disk.label} disk={disk} limits={smart} />
      ))}
    </ul>
  );
}
