import type { SystemInfo } from '@shared/api';
import { useT } from '@/i18n';
import { formatBytes, formatNumber, formatPercent } from '@/lib/format';
import { toneForThreshold } from '@/lib/tone';
import { Card } from '@/ui/Card';
import { LineChart } from '@/ui/LineChart';
import { Notice } from '@/ui/Notice';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import {
  assessSwap,
  AVAILABLE_CRITICAL_PERCENT,
  AVAILABLE_LOW_PERCENT,
  memorySegments,
  seriesStats,
  SWAP_HIGH_PERCENT,
} from './derive';
import { LedLegend, LedStack } from './LedStack';
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
      kind: 'on',
      label: t('system.memory.used'),
      value: parts.used,
      text: t('system.memory.usedText', { value: formatBytes(parts.used) }),
    },
    {
      id: 'cache',
      kind: 'dim',
      label: t('system.memory.cache'),
      value: parts.cache,
      text: t('system.memory.cacheText', { value: formatBytes(parts.cache) }),
    },
    {
      id: 'free',
      kind: 'off',
      label: t('system.memory.free'),
      value: parts.free,
      text: t('system.memory.freeText', { value: formatBytes(parts.free) }),
    },
  ] as const;

  return (
    <Section title={t('system.memory.title')}>
      <Card padding="none" className={styles.plate}>
        <div className={styles.block} data-tone={tone}>
          <div className={styles.headline}>
            <div className={styles.figure}>
              <span className={styles.value} data-tone={tone}>
                {formatNumber(memory.percent)}
                <span className={styles.unit}>%</span>
              </span>
              <span className={styles.figureLabel}>
                {t('system.memory.ofTotal', {
                  used: formatBytes(memory.usedBytes),
                  total: formatBytes(memory.totalBytes),
                })}
              </span>
            </div>
            <LedLegend
              className={styles.legend}
              tone={tone}
              items={segments.map((segment) => ({
                id: segment.id,
                kind: segment.kind,
                label: segment.label,
                value: formatBytes(segment.value),
              }))}
            />
          </div>
          <LedStack
            tone={tone}
            total={memory.totalBytes}
            label={t('system.memory.title')}
            segments={segments}
          />
          <p className={styles.caption}>
            {t('system.memory.availableOf', { value: formatBytes(memory.availableBytes) })}
          </p>
        </div>

        {history.length >= 2 && (
          <div className={styles.block}>
            <div className={styles.blockHead}>
              <h3 className={styles.subhead}>{t('system.memory.series')}</h3>
              {stats && (
                <p className={styles.stats}>
                  <span>{t('system.stats.avg', { value: formatPercent(stats.avg) })}</span>
                  <span>{t('system.stats.peak', { value: formatPercent(stats.max) })}</span>
                </p>
              )}
            </div>
            <LineChart
              times={times}
              values={values}
              label={t('system.memory.series')}
              tone={tone === 'ok' ? 'neutral' : tone}
              min={0}
              max={100}
              ticks={[50]}
              format={(value) => formatPercent(value)}
              height={104}
            />
          </div>
        )}

        <div className={styles.block}>
          <div className={styles.blockHead}>
            <h3 className={styles.subhead}>{t('system.swap.title')}</h3>
            <span className={styles.caption}>
              {swap.totalBytes > 0
                ? t('system.swap.usage', {
                    used: formatBytes(swap.usedBytes),
                    total: formatBytes(swap.totalBytes),
                  })
                : t('system.swap.none')}
            </span>
          </div>
          {swap.totalBytes > 0 && (
            <div className={styles.swapMeter}>
              <ProgressBar
                value={swap.percent}
                tone={assessment.tone}
                label={t('system.swap.bar')}
                size="sm"
                cells={24}
              />
              <span className={styles.rowValue}>{formatPercent(swap.percent)}</span>
            </div>
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
      </Card>
    </Section>
  );
}
