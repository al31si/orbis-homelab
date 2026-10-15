import { useT } from '@/i18n';
import { formatTemperature } from '@/lib/format';
import { StatusDot } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Notice } from '@/ui/Notice';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { DiskList } from './DiskList';
import {
  COUNTER_KEYS,
  explainProblems,
  isSmartReportStale,
  problemDisks,
  SMART_STALE_SECONDS,
  toneForDiskStatus,
  type SmartView,
} from './derive';
import styles from './storage.module.css';

/** What the defects found on the not-OK disks mean, and what to do about them. */
function Advice({ disks }: { disks: SmartView['disks'] }) {
  const t = useT();
  const { meanings, advice } = explainProblems(disks);
  const tone = disks.some((disk) => disk.status === 'CRITICAL') ? 'crit' : 'warn';
  return (
    <Card tone={tone} role="alert" className={styles.advice}>
      <p>{advice}</p>
      {meanings.length > 0 && (
        <details className={styles.meanings}>
          <summary>{t('storage.health.meaningsSummary')}</summary>
          {meanings.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </details>
      )}
    </Card>
  );
}

export function HealthSection({ disks, smart }: SmartView) {
  const t = useT();
  const problems = problemDisks(disks);
  const unreadable = disks.filter((disk) => disk.smart === 'UNAVAILABLE');
  const stale = isSmartReportStale(smart.ageSeconds);
  const clean = disks.every((disk) => COUNTER_KEYS.every((key) => disk[key] === 0));
  const overallTone = toneForDiskStatus(smart.status);
  const summary =
    smart.status === 'OK'
      ? t('storage.health.allHealthy')
      : smart.status === 'CRITICAL'
        ? t('storage.health.critical')
        : t('storage.health.check');

  return (
    <Section
      title={t('storage.health.section')}
      action={t('storage.summary.disks', { n: disks.length })}
    >
      <div className={styles.health}>
        <div className={styles.summary}>
          <StatusDot tone={overallTone} className={styles.summaryLamp} />
          <div>
            <p className={styles.summaryTitle}>{summary}</p>
            <p className={styles.caption}>
              {t('storage.health.lastCheck')} <RelativeTime value={smart.checkedAt} />
            </p>
            {clean && <p className={styles.caption}>{t('storage.disks.countersClean')}</p>}
          </div>
        </div>

        {problems.length > 0 && <Advice disks={problems} />}

        {stale && (
          <Notice tone="warn" title={t('storage.health.staleTitle')}>
            {t('storage.health.staleText', { minutes: SMART_STALE_SECONDS / 60 })}
          </Notice>
        )}

        {unreadable.length > 0 && (
          <Notice
            tone="neutral"
            title={
              unreadable.length === disks.length
                ? t('storage.health.unavailableAll')
                : t('storage.health.unavailableSome', {
                    names: unreadable.map((disk) => disk.label).join(', '),
                  })
            }
          >
            {t('storage.health.unavailableText')}
          </Notice>
        )}

        <DiskList disks={disks} smart={smart} />

        <p className={styles.footnote}>
          {t('storage.disks.limits', {
            warn: formatTemperature(smart.temperatureWarnC),
            crit: formatTemperature(smart.temperatureCriticalC),
          })}
        </p>
      </div>
    </Section>
  );
}
