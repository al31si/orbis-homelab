import type { DiskInfo, SmartSummary } from '@shared/api';
import { useT } from '@/i18n';
import {
  formatBytes,
  formatNumber,
  formatPercent,
  formatTemperature,
  PLACEHOLDER,
} from '@/lib/format';
import { Badge } from '@/ui/Badge';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import {
  COUNTER_KEYS,
  diskCounterTone,
  diskTemperatureTone,
  powerOnSpan,
  toneForDiskStatus,
  usageTone,
  type SmartView,
} from './derive';
import styles from './storage.module.css';

interface DiskProps {
  disk: DiskInfo;
  limits: SmartSummary;
  /** Tint of the pool legend entry this disk belongs to, if any. */
  color: string | undefined;
}

function Disk({ disk, limits, color }: DiskProps) {
  const t = useT();
  const readable = disk.smart !== 'UNAVAILABLE';
  // An unreadable report says nothing about health: do not paint it green.
  const unverified = !readable && disk.status === 'OK';
  const statusTone = unverified ? 'neutral' : toneForDiskStatus(disk.status);
  const temperatureTone = diskTemperatureTone(disk.temperatureC, limits);
  const smartTone = disk.smart === 'FAILED' ? 'crit' : disk.smart === 'PASSED' ? 'ok' : 'neutral';

  return (
    <li className={styles.disk} data-status={disk.status} data-tone={statusTone}>
      <div className={styles.dId}>
        {color && <span className={styles.swatch} style={{ background: color }} aria-hidden />}
        <div className={styles.dName}>
          <h3 className={styles.dTitle}>{disk.label}</h3>
          <p className={styles.dSub}>{disk.model}</p>
          <p className={styles.dSub}>
            {t('storage.disks.serial', { tail: disk.serialTail, device: disk.device })}
          </p>
          {disk.mount && <p className={styles.dSub}>{disk.mount}</p>}
          {disk.status !== 'OK' && disk.message && (
            <p className={styles.dMessage} data-tone={statusTone}>
              {disk.message}
            </p>
          )}
        </div>
      </div>

      <Badge className={styles.dBadge} tone={statusTone} dot>
        {unverified ? t('storage.disks.unverified') : t(`storage.status.${disk.status}`)}
      </Badge>

      <div className={styles.dUsage}>
        {disk.percent !== null && disk.sizeBytes !== null ? (
          <>
            <div className={styles.dUsageHead}>
              <span className={styles.dPercent}>{formatPercent(disk.percent, 1)}</span>
              <span className={styles.dMuted}>
                {t('storage.disks.usageOf', {
                  used: formatBytes(disk.usedBytes),
                  total: formatBytes(disk.sizeBytes),
                })}
              </span>
            </div>
            <ProgressBar
              value={disk.percent}
              tone={usageTone(disk.percent)}
              label={t('storage.volume.usage', { name: disk.label })}
              size="sm"
            />
            <span className={styles.dMuted}>
              {t('storage.disks.free', { value: formatBytes(disk.availableBytes) })}
            </span>
          </>
        ) : (
          <span className={styles.dMuted}>{t('storage.disks.noSpace')}</span>
        )}
      </div>

      <dl className={styles.dMetrics}>
        <div className={styles.dMetric}>
          <dt>{t('storage.disks.smart')}</dt>
          <dd data-tone={smartTone}>{t(`storage.smart.${disk.smart}`)}</dd>
        </div>
        <div className={styles.dMetric}>
          <dt>{t('storage.disks.temperature')}</dt>
          <dd data-tone={temperatureTone}>{formatTemperature(disk.temperatureC)}</dd>
        </div>
        <div className={styles.dMetric}>
          <dt>{t('storage.disks.powerOn')}</dt>
          <dd>
            {disk.powerOnHours === null ? (
              PLACEHOLDER
            ) : (
              <>
                {t('storage.disks.hours', { n: formatNumber(disk.powerOnHours) })}
                <span className={styles.dHint}>{powerOnSpan(disk.powerOnHours)}</span>
              </>
            )}
          </dd>
        </div>
      </dl>

      <dl className={styles.dCounters}>
        {COUNTER_KEYS.map((key) => (
          <div
            key={key}
            className={styles.dCounter}
            data-tone={readable ? diskCounterTone(disk, key) : 'neutral'}
          >
            <dt>{t(`storage.counter.${key}`)}</dt>
            <dd>{readable ? formatNumber(disk[key]) : PLACEHOLDER}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export interface DiskListProps extends SmartView {
  /** Pool member mount -> legend tint. */
  colors: ReadonlyMap<string, string>;
}

export function DiskList({ disks, smart, colors }: DiskListProps) {
  const t = useT();
  return (
    <Section title={t('storage.disks.section')}>
      <div className={styles.disks}>
        <div className={styles.dHead} aria-hidden>
          <span>{t('storage.disks.colDisk')}</span>
          <span>{t('storage.disks.colStatus')}</span>
          <span>{t('storage.disks.colUsage')}</span>
          <span>{t('storage.disks.colSmart')}</span>
          <span>{t('storage.disks.colTemperature')}</span>
          <span>{t('storage.disks.colPowerOn')}</span>
          <span>{t('storage.disks.colCounters')}</span>
        </div>
        <ul className={styles.dList} aria-label={t('storage.disks.list')}>
          {disks.map((disk) => (
            <Disk
              key={disk.label}
              disk={disk}
              limits={smart}
              color={disk.mount === null ? undefined : colors.get(disk.mount)}
            />
          ))}
        </ul>
      </div>
      <p className={styles.footnote}>
        {t('storage.disks.limits', {
          warn: formatTemperature(smart.temperatureWarnC),
          crit: formatTemperature(smart.temperatureCriticalC),
        })}
      </p>
    </Section>
  );
}
