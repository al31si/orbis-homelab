import type { SystemInfo } from '@shared/api';
import { useT } from '@/i18n';
import { formatBytesPerSec, formatNumber } from '@/lib/format';
import type { UiTone } from '@/lib/tone';
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
  const tone: UiTone =
    counts.unhealthy > 0 ? 'crit' : allRunning || counts.total === 0 ? 'ok' : 'warn';
  return (
    <Card padding="none" className={styles.plate}>
      <div className={styles.dockerBlocks}>
        <div className={styles.block} data-tone={tone}>
          <div className={styles.figure}>
            <span className={styles.value} data-tone={tone}>
              {formatNumber(counts.running)}
              <span className={styles.unit}>
                {t('system.docker.runningOf', { total: formatNumber(counts.total) })}
              </span>
            </span>
            <span className={styles.figureLabel}>{t('system.docker.running')}</span>
          </div>
          <ProgressBar
            value={counts.running}
            max={Math.max(1, counts.total)}
            tone={allRunning || counts.total === 0 ? 'ok' : 'warn'}
            label={t('system.docker.runningBar')}
            cells={Math.min(48, Math.max(10, counts.total))}
          />
          <p className={styles.sentence}>{t('system.docker.summary', counts)}</p>
        </div>

        {network && (
          <div className={styles.block}>
            <h3 className={styles.subhead}>{t('system.docker.traffic')}</h3>
            <div className={styles.traffic}>
              <div className={styles.trafficItem}>
                <Icon name="arrow-down" size={18} />
                <span className={styles.trafficValue}>
                  {formatBytesPerSec(network.rxBytesPerSec)}
                </span>
                <span className={styles.caption}>{t('system.docker.received')}</span>
              </div>
              <div className={styles.trafficItem}>
                <Icon name="arrow-up" size={18} />
                <span className={styles.trafficValue}>
                  {formatBytesPerSec(network.txBytesPerSec)}
                </span>
                <span className={styles.caption}>{t('system.docker.sent')}</span>
              </div>
            </div>
            <p className={styles.caption}>{t('system.docker.trafficNote')}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
