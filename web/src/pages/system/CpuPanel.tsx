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
import { StackedBar } from '@/ui/StackedBar';
import { loadScaleMax, loadTone, seriesStats } from './derive';
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

  const breakdown = [
    { id: 'user', label: t('system.cpu.user'), value: cpu.user, color: 'var(--accent)' },
    {
      id: 'system',
      label: t('system.cpu.system'),
      value: cpu.system,
      color: 'color-mix(in srgb, var(--accent) 45%, transparent)',
    },
    { id: 'iowait', label: t('system.cpu.iowait'), value: cpu.iowait, color: 'var(--warn)' },
  ].map((segment) => ({
    ...segment,
    detail: formatPercent(segment.value, 1),
    text: `${segment.label} ${formatPercent(segment.value, 1)}`,
  }));

  return (
    <Section title={t('system.cpu.title')}>
      <Card className={styles.grow}>
        <div className={styles.stack}>
          <div className={styles.headline}>
            <div className={styles.figure}>
              <span className={styles.bigValue} data-tone={tone}>
                {formatNumber(cpu.percent)}
                <span className={styles.bigUnit}>%</span>
              </span>
              <span className={styles.figureLabel}>
                {t('system.cpu.inUse', { cores: host.cores })}
              </span>
            </div>
            <StackedBar
              className={styles.breakdown}
              segments={breakdown}
              total={100}
              label={t('system.cpu.breakdown')}
              height={8}
            />
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
                <p className={styles.caption}>
                  {stats &&
                    t(
                      'system.stats',
                      metric === 'cpu'
                        ? { avg: formatPercent(stats.avg), peak: formatPercent(stats.max) }
                        : { avg: formatNumber(stats.avg, 2), peak: formatNumber(stats.max, 2) },
                    )}
                </p>
              </div>
              {metric === 'cpu' ? (
                <LineChart
                  times={times}
                  values={values}
                  label={t('system.cpu.usageSeries')}
                  tone={tone === 'ok' ? 'info' : tone}
                  min={0}
                  max={100}
                  ticks={[50]}
                  format={(value) => formatPercent(value)}
                />
              ) : (
                <LineChart
                  times={times}
                  values={values}
                  label={t('system.cpu.loadSeries')}
                  tone={currentLoadTone === 'ok' ? 'info' : currentLoadTone}
                  min={0}
                  max={loadMax}
                  ticks={[host.cores]}
                  format={(value) => formatNumber(value, 2)}
                />
              )}
            </div>
          )}

          <div className={styles.block}>
            <div className={styles.blockHead}>
              <h3 className={styles.subhead}>{t('system.cpu.loadTitle')}</h3>
              <span className={styles.caption}>
                {t('system.cpu.loadScale', { cores: host.cores })}
              </span>
            </div>
            <ul className={styles.load}>
              {LOAD_WINDOWS.map(({ key, minutes }) => {
                const value = cpu.load[key];
                const window = t('system.cpu.window', { minutes });
                return (
                  <li key={key} className={styles.loadItem}>
                    <span className={styles.loadValue}>{formatNumber(value, 2)}</span>
                    <span className={styles.loadLabel}>{window}</span>
                    <ProgressBar
                      value={value}
                      max={host.cores}
                      tone={loadTone(value, host.cores)}
                      label={t('system.cpu.loadAt', { window })}
                      size="sm"
                    />
                  </li>
                );
              })}
            </ul>
          </div>

          {cpu.perCore.length > 0 && (
            <div className={styles.block}>
              <h3 className={styles.subhead}>{t('system.cpu.perCore')}</h3>
              <ul className={styles.cores}>
                {cpu.perCore.map((value, index) => (
                  <li key={index} className={styles.core}>
                    <span className={styles.coreLabel}>
                      {t('system.cpu.core', { n: index + 1 })}
                    </span>
                    <ProgressBar
                      value={value}
                      label={t('system.cpu.core', { n: index + 1 })}
                      size="sm"
                      warnAt={70}
                      critAt={90}
                    />
                    <span className={styles.coreValue}>{formatPercent(value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>
    </Section>
  );
}
