import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cx } from '@/lib/cx';
import { useT } from '@/i18n';
import { formatClock, formatDuration } from '@/lib/format';
import type { UiTone } from '@/lib/tone';
import styles from './LineChart.module.css';

export interface LineChartProps {
  /** Epoch ms of each sample, oldest first. */
  times: readonly number[];
  values: readonly number[];
  /** Name of the measurement, used by the tooltip and the accessible text ("CPU"). */
  label: string;
  tone?: UiTone;
  /** Fixed vertical scale. */
  min: number;
  max: number;
  /** Values that get a faint gridline and a small label. */
  ticks?: readonly number[];
  format: (value: number) => string;
  /** Plot height in px (default 120). */
  height?: number;
  className?: string;
}

const WIDTH = 100;
const PAD = 3;

/**
 * Minimal time series: faint gridlines, one line with a soft area, no axes. Hover, touch drag or
 * arrow keys scrub a tooltip. The plot is a `slider` for assistive tech, with a text summary.
 */
export function LineChart({
  times,
  values,
  label,
  tone = 'info',
  min,
  max,
  ticks = [],
  format,
  height = 120,
  className,
}: LineChartProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const summaryId = useId();
  const [active, setActive] = useState<number | null>(null);
  const count = Math.min(times.length, values.length);

  // Touch scrubbing has no "leave" event: dismiss when the user taps elsewhere.
  useEffect(() => {
    if (active === null) return;
    function dismiss(event: globalThis.PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setActive(null);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [active]);

  if (count < 2) return null;

  const first = times[0] as number;
  const last = times[count - 1] as number;
  const span = Math.max(1, last - first);
  const xOf = (index: number) => (((times[index] as number) - first) / span) * WIDTH;
  const yOf = (value: number) => PAD + (1 - (value - min) / (max - min || 1)) * (height - PAD * 2);
  const clampY = (value: number) => Math.min(height, Math.max(0, yOf(value)));

  const points = Array.from({ length: count }, (_, index) => {
    return `${xOf(index).toFixed(2)},${clampY(values[index] as number).toFixed(2)}`;
  });
  const line = `M${points.join('L')}`;

  const current = active ?? count - 1;
  const currentValue = values[current] as number;
  const currentTime = times[current] as number;
  const percentX = (xOf(current) / WIDTH) * 100;

  function indexAt(clientX: number): number {
    const rect = plot.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return count - 1;
    const target = first + Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * span;
    let best = 0;
    for (let index = 1; index < count; index += 1) {
      if (
        Math.abs((times[index] as number) - target) < Math.abs((times[best] as number) - target)
      ) {
        best = index;
      }
    }
    return best;
  }

  function onPointer(event: PointerEvent<HTMLDivElement>) {
    setActive(indexAt(event.clientX));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (event.key === 'Home') setActive(0);
    else if (event.key === 'End') setActive(count - 1);
    else if (step !== 0) setActive(Math.min(count - 1, Math.max(0, current + step)));
    else if (event.key === 'Escape') setActive(null);
    else return;
    event.preventDefault();
  }

  const spanLabel = formatDuration((last - first) / 1000, 1);
  const stats = values.slice(0, count);
  const summary = t('system.chart.summary', {
    label,
    span: spanLabel,
    min: format(Math.min(...stats)),
    max: format(Math.max(...stats)),
    now: format(values[count - 1] as number),
  });

  return (
    <div ref={root} className={cx(styles.root, className)} data-tone={tone}>
      <div
        ref={plot}
        className={styles.plot}
        style={{ height }}
        role="slider"
        tabIndex={0}
        aria-label={t('system.chart.label', { label })}
        aria-describedby={summaryId}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={current}
        aria-valuetext={`${formatClock(currentTime)}: ${format(currentValue)}`}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" aria-hidden>
          {ticks.map((tick) => (
            <line
              key={tick}
              className={styles.grid}
              x1={0}
              x2={WIDTH}
              y1={yOf(tick)}
              y2={yOf(tick)}
            />
          ))}
          <path className={styles.area} d={`${line}L${WIDTH},${height}L0,${height}Z`} />
          <path className={styles.line} d={line} />
        </svg>
        {ticks.map((tick) => (
          <span key={tick} className={styles.tick} style={{ top: yOf(tick) }} aria-hidden>
            {format(tick)}
          </span>
        ))}
        {active !== null && (
          <>
            <span className={styles.cursor} style={{ left: `${percentX}%` }} aria-hidden />
            <span
              className={styles.dot}
              style={{ left: `${percentX}%`, top: clampY(currentValue) }}
              aria-hidden
            />
            <div
              className={styles.tooltip}
              data-side={percentX > 55 ? 'left' : 'right'}
              style={{ left: `${percentX}%` }}
              aria-hidden
            >
              <span className={styles.tooltipTime}>{formatClock(currentTime)}</span>
              <span className={styles.tooltipValue}>{format(currentValue)}</span>
            </div>
          </>
        )}
      </div>
      <div className={styles.axis} aria-hidden>
        <span>{t('system.chart.ago', { span: spanLabel })}</span>
        <span>{t('system.chart.now')}</span>
      </div>
      <p id={summaryId} className="sr-only">
        {summary}
      </p>
    </div>
  );
}
