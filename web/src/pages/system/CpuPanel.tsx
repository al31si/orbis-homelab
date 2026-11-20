import { useState } from 'react';
import type { SystemInfo } from '@shared/api';
import { useT } from '@/i18n';
import { formatNumber, formatPercent } from '@/lib/format';
import { toneForThreshold } from '@/lib/tone';
import { Card } from '@/ui/Card';
import { LineChart } from '@/ui/LineChart';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import { Segmented } from '@/ui/Segmented';
import { loadScaleMax, loadTone, seriesStats } from './derive';
import { LedLegend, LedStack } from './LedStack';
import styles from './system.module.css';

type Metric = 'cpu' | 'load';

const LOAD_WINDOWS = [
  { key: 'm1', minutes: 1 },
  { key: 'm5', minutes: 5 },
  { key: 'm15', minutes: 15 },
] as const;

export function CpuPanel({ system }: { system: SystemInfo }) {
  const t = useT();
  const { cpu, host, history } = system;
  const [metric, setMetric] = useState<Metric>('cpu');
  const tone = toneForThreshold(cpu.percent, 70, 90);
  const times = history.map((point) => point.t);
  const values = history.map((point) => (metric === 'cpu' ? point.cpu : point.load1));
  const stats = seriesStats(values);
  const loadMax = loadScaleMax(values, host.cores);
  const currentLoadTone = loadTone(cpu.load.m1, host.cores);

  const parts = [
    { id: 'user', kind: 'on', label: t('system.cpu.user'), value: cpu.user },
    { id: 'system', kind: 'dim', label: t('system.cpu.system'), value: cpu.system },
    { id: 'iowait', kind: 'aux', label: t('system.cpu.iowait'), value: cpu.iowait },
  ] as const;

  return (
    <Section title={t('system.cpu.title')}>
      <Card padding="none" className={styles.plate}>
        <div className={styles.block} data-tone={tone}>
          <div className={styles.headline}>
            <div className={styles.figure}>
              <span className={styles.value} data-tone={tone}>
                {formatNumber(cpu.percent)}
                <span className={styles.unit}>%</span>
              </span>
              <span className={styles.figureLabel}>
                {t('system.cpu.inUse', { cores: host.cores })}
              </span>
            </div>
            <LedLegend
              className={styles.legend}
              tone={tone}
              items={parts.map((part) => ({
                id: part.id,
                kind: part.kind,
                label: part.label,
                value: formatPercent(part.value, 1),
              }))}
            />
          </div>
          <LedStack
            tone={tone}
            total={100}
            label={t('system.cpu.breakdown')}
            segments={parts.map((part) => ({
              id: part.id,
              kind: part.kind,
              value: part.value,
              text: `${part.label} ${formatPercent(part.value, 1)}`,
            }))}
          />
        </div>

        {cpu.perCore.length > 0 && (
          <div className={styles.block}>
            <h3 className={styles.subhead}>{t('system.cpu.perCore')}</h3>
            <ul className={styles.cores} data-many={cpu.perCore.length > 8 || undefined}>
              {cpu.perCore.map((value, index) => (
                <li key={index} className={styles.core}>
                  <span className={styles.coreIndex} aria-hidden>
                    {index + 1}
                  </span>
                  <ProgressBar
                    value={value}
                    label={t('system.cpu.core', { n: index + 1 })}
                    size="sm"
                    cells={12}
                    warnAt={70}
                    critAt={90}
                  />
                  <span className={styles.rowValue}>{formatPercent(value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.block}>
          <div className={styles.blockHead}>
            <h3 className={styles.subhead}>{t('system.cpu.loadTitle')}</h3>
            <span className={styles.caption}>
              {t('system.cpu.loadScale', { cores: host.cores })}
            </span>
          </div>
          <ul className={styles.meterRows}>
            {LOAD_WINDOWS.map(({ key, minutes }) => {
              const value = cpu.load[key];
              const window = t('system.cpu.window', { minutes });
              return (
                <li key={key} className={styles.meterRow}>
                  <span className={styles.rowLabel}>{window}</span>
                  <ProgressBar
                    value={value}
                    max={host.cores}
                    tone={loadTone(value, host.cores)}
                    label={t('system.cpu.loadAt', { window })}
                    size="sm"
                    cells={24}
                  />
                  <span className={styles.rowValue}>{formatNumber(value, 2)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {history.length >= 2 && (
          <div className={styles.block}>
            <div className={styles.blockHead}>
              <Segmented
                options={[
                  { value: 'cpu', label: t('system.cpu.metricUsage') },
                  { value: 'load', label: t('system.cpu.metricLoad') },
                ]}
                value={metric}
                onChange={setMetric}
                ariaLabel={t('system.cpu.chartLabel')}
              />
              {stats && (
                <p className={styles.stats}>
                  <span>
                    {t('system.stats.avg', {
                      value:
                        metric === 'cpu' ? formatPercent(stats.avg) : formatNumber(stats.avg, 2),
                    })}
                  </span>
                  <span>
                    {t('system.stats.peak', {
                      value:
                        metric === 'cpu' ? formatPercent(stats.max) : formatNumber(stats.max, 2),
                    })}
                  </span>
                </p>
              )}
            </div>
            {metric === 'cpu' ? (
              <LineChart
                times={times}
                values={values}
                label={t('system.cpu.usageSeries')}
                tone={tone === 'ok' ? 'neutral' : tone}
                min={0}
                max={100}
                ticks={[50]}
                format={(value) => formatPercent(value)}
                height={104}
              />
            ) : (
              <LineChart
                times={times}
                values={values}
                label={t('system.cpu.loadSeries')}
                tone={currentLoadTone === 'ok' ? 'neutral' : currentLoadTone}
                min={0}
                max={loadMax}
                ticks={[host.cores]}
                format={(value) => formatNumber(value, 2)}
                height={104}
              />
            )}
          </div>
        )}
      </Card>
    </Section>
  );
}
