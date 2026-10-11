import { useT } from '@/i18n';
import { formatBytes, formatNumber, formatPercent } from '@/lib/format';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';
import { SegmentedGauge } from '@/ui/SegmentedGauge';
import { StackedBar } from '@/ui/StackedBar';
import { memberShares, usageTone, usageVerdict, type PoolView } from './derive';
import { VolumeCards } from './Volumes';
import styles from './storage.module.css';

function PoolCard({ view }: { view: PoolView }) {
  const t = useT();
  const { pool, members } = view;
  const tone = usageTone(pool.percent);
  const segments = memberShares(members).map((share) => ({
    id: share.mount,
    label: share.label,
    value: share.usedBytes,
    color: share.color,
    detail: `${formatBytes(share.usedBytes)} · ${formatPercent(share.percent)}`,
    text: t('storage.pool.shareText', {
      name: share.label,
      size: formatBytes(share.usedBytes),
      percent: formatPercent(share.percent),
    }),
  }));

  return (
    <div className={styles.pool}>
      <Card padding="lg" className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroTop}>
            <div className={styles.poolName}>
              <h3 className={styles.poolTitle}>{pool.label}</h3>
              <span className={styles.mount}>{pool.mount}</span>
            </div>
            <Badge tone={tone} dot>
              {usageVerdict(pool.percent)}
            </Badge>
          </div>
          <div className={styles.figure}>
            <span className={styles.bigValue} data-tone={tone}>
              {formatNumber(pool.percent, 1)}
              <span className={styles.bigUnit}>%</span>
            </span>
            <span className={styles.figureLabel}>{t('storage.pool.usage')}</span>
          </div>
          <dl className={styles.heroStats}>
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
        </div>

        <div className={styles.heroSide}>
          <SegmentedGauge value={pool.percent} label={t('storage.pool.gauge')} />
          {segments.length > 0 && (
            <div className={styles.share}>
              <h4 className={styles.subhead}>{t('storage.pool.share')}</h4>
              <StackedBar segments={segments} label={t('storage.pool.share')} height={12} />
            </div>
          )}
        </div>
      </Card>

      {members.length > 0 && (
        <div className={styles.members}>
          <h4 className={styles.subhead}>{t('storage.pool.members')}</h4>
          <VolumeCards items={members} />
        </div>
      )}
    </div>
  );
}

/** One hero per pool: capacity, thresholds, and how its member volumes share the used space. */
export function PoolSection({ views }: { views: readonly PoolView[] }) {
  const t = useT();
  return (
    <Section title={views.length === 1 ? t('storage.pool.section') : t('storage.pool.sectionMany')}>
      <div className={styles.pools}>
        {views.map((view) => (
          <PoolCard key={view.pool.id} view={view} />
        ))}
      </div>
    </Section>
  );
}
