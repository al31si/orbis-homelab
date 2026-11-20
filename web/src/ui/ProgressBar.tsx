import type { CSSProperties } from 'react';
import { cx } from '@/lib/cx';
import { toneForThreshold, type UiTone } from '@/lib/tone';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** Fixed tone. When omitted the tone follows the thresholds below. */
  tone?: UiTone;
  /** Percent of `max` from which the bar turns warning (default 75). */
  warnAt?: number;
  /** Percent of `max` from which the bar turns critical (default 90). */
  critAt?: number;
  /** Accessible name, e.g. "Spazio usato". */
  label: string;
  size?: 'sm' | 'md';
  /** Number of LED cells (default 20). */
  cells?: number;
  className?: string;
}

/**
 * The meter of the interface: a row of LED cells, lit from the left and coloured by thresholds.
 * Values are rounded up to a whole cell, so anything above zero shows at least one lit cell.
 */
export function ProgressBar({
  value,
  max = 100,
  tone,
  warnAt = 75,
  critAt = 90,
  label,
  size = 'md',
  cells = 20,
  className,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const lit = percent > 0 ? Math.min(cells, Math.max(1, Math.ceil((percent / 100) * cells))) : 0;
  return (
    <div
      className={cx(styles.track, size === 'sm' && styles.sm, className)}
      style={{ '--cells': cells } as CSSProperties}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      data-tone={tone ?? toneForThreshold(percent, warnAt, critAt)}
    >
      <div className={styles.fill} style={{ width: `${(lit / cells) * 100}%` }} />
    </div>
  );
}
