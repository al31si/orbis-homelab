import { useT } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { Notice } from '@/ui/Notice';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import {
  activeCounters,
  diskCounterTone,
  diskProblemLine,
  explainProblems,
  isSmartReportStale,
  problemDisks,
  SMART_STALE_SECONDS,
  toneForDiskStatus,
  type SmartView,
} from './derive';
import styles from './storage.module.css';

/** The disks that are not OK, with the counters that made them so and what those mean. */
function Callout({ disks }: { disks: SmartView['disks'] }) {
  const t = useT();
  const { meanings, advice } = explainProblems(disks);
  const tone = disks.some((disk) => disk.status === 'CRITICAL') ? 'crit' : 'warn';
  return (
    <Card tone={tone} padding="none" role="alert">
      <ul className={styles.problems}>
        {disks.map((disk) => {
          const diskTone = toneForDiskStatus(disk.status);
          const counters = activeCounters(disk);
          return (
            <li key={disk.label} className={styles.problem} data-tone={diskTone}>
              <Icon
                name={diskTone === 'crit' ? 'alert-circle' : 'alert'}
                size={22}
                className={styles.problemIcon}
              />
              <div className={styles.problemBody}>
                <div className={styles.problemHead}>
                  <h3 className={styles.problemTitle}>{disk.label}</h3>
                  <Badge tone={diskTone} dot>
                    {t(`storage.status.${disk.status}`)}
                  </Badge>
                </div>
                <p className={styles.problemLine}>{diskProblemLine(disk)}</p>
                {counters.length > 0 && (
                  <ul className={styles.problemCounters}>
                    {counters.map((key) => (
                      <li key={key} data-tone={diskCounterTone(disk, key)}>
                        <strong>{formatNumber(disk[key])}</strong>{' '}
                        {t(`storage.counterInline.${key}`)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className={styles.explain}>
        <p className={styles.advice}>{advice}</p>
        {meanings.length > 0 && (
          <details className={styles.meanings}>
            <summary>{t('storage.health.meaningsSummary')}</summary>
            {meanings.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </details>
        )}
      </div>
    </Card>
  );
}

export function HealthSection({ disks, smart }: SmartView) {
  const t = useT();
  const problems = problemDisks(disks);
  const unreadable = disks.filter((disk) => disk.smart === 'UNAVAILABLE');
  const stale = isSmartReportStale(smart.ageSeconds);
  const overallTone = toneForDiskStatus(smart.status);

  return (
    <Section title={t('storage.health.section')}>
      <div className={styles.health}>
        {problems.length > 0 && <Callout disks={problems} />}

        <Card className={styles.summary}>
          <Icon name="shield" size={22} className={styles.summaryIcon} data-tone={overallTone} />
          <div className={styles.summaryText}>
            <p className={styles.summaryTitle}>
              {smart.status === 'OK' ? t('storage.health.allHealthy') : t('storage.health.check')}
            </p>
            <p className={styles.caption}>
              {t('storage.health.lastCheck')} <RelativeTime value={smart.checkedAt} />
            </p>
          </div>
          <Badge tone={overallTone} dot>
            {t(`storage.status.${smart.status}`)}
          </Badge>
        </Card>

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
      </div>
    </Section>
  );
}
