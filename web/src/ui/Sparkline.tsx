import { cx } from '@/lib/cx';
import type { UiTone } from '@/lib/tone';
import styles from './Sparkline.module.css';

export interface SparklineProps {
  values: readonly number[];
  tone?: UiTone;
  /** Fixed scale; otherwise it follows the data with at least `minSpan` of range. */
  min?: number;
  max?: number;
  /** Smallest vertical range shown when the data is flat (default 10). */
  minSpan?: number;
  /** Height in px; the width follows the container. */
  height?: number;
  className?: string;
}

const WIDTH = 100;

/** Tiny trend line. Decorative (`aria-hidden`): always pair it with the numeric value. */
export function Sparkline({
  values,
  tone = 'info',
  min,
  max,
  minSpan = 10,
  height = 32,
  className,
}: SparklineProps) {
  if (values.length < 2) return null;
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = Math.max(minSpan, dataMax - dataMin);
  const mid = (dataMin + dataMax) / 2;
  const lo = min ?? mid - span / 2;
  const hi = max ?? mid + span / 2;
  const pad = 2;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * WIDTH;
    const y = pad + (1 - (value - lo) / (hi - lo || 1)) * (height - pad * 2);
    return `${x.toFixed(2)},${Math.min(height, Math.max(0, y)).toFixed(2)}`;
  });
  const line = `M${points.join('L')}`;
  return (
    <svg
      className={cx(styles.spark, className)}
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      height={height}
      data-tone={tone}
      aria-hidden
    >
      <path className={styles.area} d={`${line}L${WIDTH},${height}L0,${height}Z`} />
      <path className={styles.line} d={line} />
    </svg>
  );
}
