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
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  tone,
  warnAt = 75,
  critAt = 90,
  label,
  size = 'md',
  className,
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={cx(styles.track, size === 'sm' && styles.sm, className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      data-tone={tone ?? toneForThreshold(percent, warnAt, critAt)}
    >
      <div className={styles.fill} style={{ width: `${percent}%` }} />
    </div>
  );
}
