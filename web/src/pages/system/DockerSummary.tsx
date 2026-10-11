import type { SystemInfo } from '@shared/api';
import { useT } from '@/i18n';
import { formatBytesPerSec, formatNumber } from '@/lib/format';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { ProgressBar } from '@/ui/ProgressBar';
import styles from './system.module.css';

export interface DockerSummaryProps {
  counts: SystemInfo['docker'];
  /** Null when the system snapshot is unavailable. */
  network: SystemInfo['dockerNetwork'] | null;
}

export function DockerSummary({ counts, network }: DockerSummaryProps) {
  const t = useT();
  const allRunning = counts.total > 0 && counts.running === counts.total;
  const stats = [
    {
      id: 'healthy',
      label: t('system.docker.healthy'),
      value: counts.healthy,
      tone: 'ok' as const,
    },
    {
      id: 'unhealthy',
      label: t('system.docker.unhealthy'),
      value: counts.unhealthy,
      tone: counts.unhealthy > 0 ? ('crit' as const) : ('neutral' as const),
    },
    {
      id: 'starting',
      label: t('system.docker.starting'),
      value: counts.starting,
      tone: counts.starting > 0 ? ('warn' as const) : ('neutral' as const),
    },
  ];
  return (
    <div className={styles.dockerSummary}>
      <Card className={styles.stack}>
        <div className={styles.figure}>
          <span className={styles.bigValue}>
            {formatNumber(counts.running)}
            <span className={styles.bigUnit}>
              {t('system.docker.runningOf', { total: formatNumber(counts.total) })}
            </span>
          </span>
          <span className={styles.figureLabel}>{t('system.docker.running')}</span>
        </div>
        <ProgressBar
          value={counts.running}
          max={Math.max(1, counts.total)}
          tone={allRunning ? 'ok' : 'warn'}
          label={t('system.docker.runningBar')}
          size="sm"
        />
        <dl className={styles.counts}>
          {stats.map((stat) => (
            <div key={stat.id} className={styles.count} data-tone={stat.tone}>
              <dd>{formatNumber(stat.value)}</dd>
              <dt>{stat.label}</dt>
            </div>
          ))}
        </dl>
      </Card>

      {network && (
        <Card className={styles.stack}>
          <div className={styles.figureLabel}>{t('system.docker.traffic')}</div>
          <div className={styles.traffic}>
            <div className={styles.trafficItem}>
              <Icon name="arrow-down" size={16} />
              <span className={styles.trafficValue}>
                {formatBytesPerSec(network.rxBytesPerSec)}
              </span>
              <span className={styles.caption}>{t('system.docker.received')}</span>
            </div>
            <div className={styles.trafficItem}>
              <Icon name="arrow-up" size={16} />
              <span className={styles.trafficValue}>
                {formatBytesPerSec(network.txBytesPerSec)}
              </span>
              <span className={styles.caption}>{t('system.docker.sent')}</span>
            </div>
          </div>
          <p className={styles.footnote}>{t('system.docker.trafficNote')}</p>
        </Card>
      )}
    </div>
  );
}
