import { useT } from '@/i18n';
import { formatBytes, formatNumber, formatPercent } from '@/lib/format';
import { StatusDot } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import { SegmentedGauge } from '@/ui/SegmentedGauge';
import {
  memberShares,
  POOL_CRITICAL_PERCENT,
  POOL_WARN_PERCENT,
  usageTone,
  usageVerdict,
  type PoolView,
} from './derive';
import styles from './storage.module.css';

function PoolPlate({ view }: { view: PoolView }) {
  const t = useT();
  const { pool, members } = view;
  const tone = usageTone(pool.percent);
  const verdict = usageVerdict(pool.percent);
  const shares = memberShares(members);

  return (
    <Card padding="none" className={styles.plate} tone={tone === 'ok' ? undefined : tone}>
      <div className={styles.plateBody}>
        <div className={styles.plateHead}>
          <div className={styles.poolName}>
            <h3 className={styles.poolTitle}>{pool.label}</h3>
            <span className={styles.path}>{pool.mount}</span>
          </div>
          <span className={styles.verdict} data-tone={tone}>
            <StatusDot tone={tone} />
            {verdict}
          </span>
        </div>

        <div className={styles.figure}>
          <span className={styles.bigValue} data-tone={tone}>
            {formatNumber(pool.percent)}
            <span className={styles.bigUnit}>%</span>
          </span>
          <span className={styles.figureText}>
            <span className={styles.figureLabel}>{t('storage.pool.usage')}</span>
            <span className={styles.figureOf}>
              {t('storage.pool.usedOf', {
                used: formatBytes(pool.usedBytes),
                total: formatBytes(pool.sizeBytes),
              })}
            </span>
          </span>
        </div>

        <SegmentedGauge
          value={pool.percent}
          warnAt={POOL_WARN_PERCENT}
          critAt={POOL_CRITICAL_PERCENT}
          label={t('storage.pool.gauge')}
        />

        <div className={styles.plateDetail}>
          <dl className={styles.facts}>
            <div>
              <dt>{t('storage.pool.used')}</dt>
              <dd>{formatBytes(pool.usedBytes)}</dd>
            </div>
            <div>
              <dt>{t('storage.pool.free')}</dt>
              <dd>{formatBytes(pool.availableBytes)}</dd>
            </div>
            <div>
              <dt>{t('storage.pool.total')}</dt>
              <dd>{formatBytes(pool.sizeBytes)}</dd>
            </div>
          </dl>

          {shares.length > 0 && (
            <div className={styles.share}>
              <h4 className={styles.subhead}>{t('storage.pool.share')}</h4>
              <ul className={styles.shareRows}>
                {shares.map((share) => (
                  <li key={share.mount} className={styles.shareRow}>
                    <span className={styles.shareName} title={share.label}>
                      {share.label}
                    </span>
                    <ProgressBar
                      value={share.percent}
                      tone="neutral"
                      label={t('storage.pool.shareText', {
                        name: share.label,
                        size: formatBytes(share.usedBytes),
                        percent: formatPercent(share.percent),
                      })}
                      size="sm"
                      cells={20}
                    />
                    <span className={styles.sharePercent}>{formatPercent(share.percent)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/** One plate per pool: capacity, thresholds, and how its member volumes share the used space. */
export function PoolSection({ views }: { views: readonly PoolView[] }) {
  const t = useT();
  return (
    <Section title={views.length === 1 ? t('storage.pool.section') : t('storage.pool.sectionMany')}>
      <div className={styles.pools}>
        {views.map((view) => (
          <PoolPlate key={view.pool.id} view={view} />
        ))}
      </div>
    </Section>
  );
}
