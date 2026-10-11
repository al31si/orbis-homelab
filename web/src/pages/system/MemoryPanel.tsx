import type { SystemInfo } from '@shared/api';
import { useT } from '@/i18n';
import { formatBytes, formatNumber, formatPercent } from '@/lib/format';
import { toneForThreshold } from '@/lib/tone';
import { Card } from '@/ui/Card';
import { LineChart } from '@/ui/LineChart';
import { Notice } from '@/ui/Notice';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import { StackedBar } from '@/ui/StackedBar';
import {
  assessSwap,
  AVAILABLE_CRITICAL_PERCENT,
  AVAILABLE_LOW_PERCENT,
  memorySegments,
  seriesStats,
  SWAP_HIGH_PERCENT,
} from './derive';
import styles from './system.module.css';

export function MemoryPanel({ system }: { system: SystemInfo }) {
  const t = useT();
  const { memory, swap, history } = system;
  const tone = toneForThreshold(memory.percent, 80, 92);
  const parts = memorySegments(memory);
  const assessment = assessSwap(memory, swap);
  const times = history.map((point) => point.t);
  const values = history.map((point) => point.mem);
  const stats = seriesStats(values);

  const segments = [
    {
      id: 'used',
      label: t('system.memory.used'),
      value: parts.used,
      color: 'var(--accent)',
      detail: formatBytes(parts.used),
      text: t('system.memory.usedText', { value: formatBytes(parts.used) }),
    },
    {
      id: 'cache',
      label: t('system.memory.cache'),
      value: parts.cache,
      color: 'color-mix(in srgb, var(--accent) 38%, transparent)',
      detail: formatBytes(parts.cache),
      text: t('system.memory.cacheText', { value: formatBytes(parts.cache) }),
    },
    {
      id: 'free',
      label: t('system.memory.free'),
      value: parts.free,
      detail: formatBytes(parts.free),
      text: t('system.memory.freeText', { value: formatBytes(parts.free) }),
    },
  ].filter((segment) => segment.value > 0);

  return (
    <Section title={t('system.memory.title')}>
      <Card className={styles.grow}>
        <div className={styles.stack}>
          <div className={styles.headline}>
            <div className={styles.figure}>
              <span className={styles.bigValue} data-tone={tone}>
                {formatNumber(memory.percent)}
                <span className={styles.bigUnit}>%</span>
              </span>
              <span className={styles.figureLabel}>
                {t('system.memory.ofTotal', {
                  used: formatBytes(memory.usedBytes),
                  total: formatBytes(memory.totalBytes),
                })}
              </span>
            </div>
            <dl className={styles.pair}>
              <div>
                <dt>{t('system.memory.available')}</dt>
                <dd>{formatBytes(memory.availableBytes)}</dd>
              </div>
              <div>
                <dt>{t('system.memory.cached')}</dt>
                <dd>{formatBytes(memory.cachedBytes)}</dd>
              </div>
            </dl>
          </div>

          <StackedBar
            segments={segments}
            total={memory.totalBytes}
            label={t('system.memory.title')}
            height={12}
          />

          {history.length >= 2 && (
            <div className={styles.block}>
              <p className={styles.caption}>
                {stats &&
                  t('system.stats', {
                    avg: formatPercent(stats.avg),
                    peak: formatPercent(stats.max),
                  })}
              </p>
              <LineChart
                times={times}
                values={values}
                label={t('system.memory.series')}
                tone={tone === 'ok' ? 'info' : tone}
                min={0}
                max={100}
                ticks={[50]}
                format={(value) => formatPercent(value)}
                height={96}
              />
            </div>
          )}

          <div className={styles.block}>
            <div className={styles.blockHead}>
              <h3 className={styles.subhead}>{t('system.swap.title')}</h3>
              <span className={styles.swapFigure}>
                {swap.totalBytes > 0
                  ? t('system.swap.usage', {
                      used: formatBytes(swap.usedBytes),
                      total: formatBytes(swap.totalBytes),
                      percent: formatPercent(swap.percent),
                    })
                  : t('system.swap.none')}
              </span>
            </div>
            {swap.totalBytes > 0 && (
              <ProgressBar
                value={swap.percent}
                tone={assessment.tone}
                label={t('system.swap.bar')}
                size="sm"
              />
            )}
            {assessment.kind === 'low-memory' && (
              <Notice tone={assessment.tone} title={t('system.swap.lowMemory.title')}>
                {t('system.swap.lowMemory.text', { critical: AVAILABLE_CRITICAL_PERCENT })}
              </Notice>
            )}
            {assessment.kind === 'pressure' && (
              <Notice tone={assessment.tone} title={t('system.swap.pressure.title')}>
                {t('system.swap.pressure.text', {
                  swap: SWAP_HIGH_PERCENT,
                  low: AVAILABLE_LOW_PERCENT,
                })}
              </Notice>
            )}
            {assessment.kind === 'normal' && swap.percent >= 50 && (
              <Notice tone="neutral" title={t('system.swap.normal.title')}>
                {t('system.swap.normal.text', {
                  critical: AVAILABLE_CRITICAL_PERCENT,
                  low: AVAILABLE_LOW_PERCENT,
                  swap: SWAP_HIGH_PERCENT,
                })}
              </Notice>
            )}
          </div>
        </div>
      </Card>
    </Section>
  );
}
