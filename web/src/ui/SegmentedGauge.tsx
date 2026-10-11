import { cx } from '@/lib/cx';
import { toneForThreshold } from '@/lib/tone';
import styles from './SegmentedGauge.module.css';

export interface SegmentedGaugeProps {
  /** 0..100 */
  value: number;
  /** Percent from which the scale turns warning (default 85). */
  warnAt?: number;
  /** Percent from which the scale turns critical (default 95). */
  critAt?: number;
  /** Number of cells (default 40). */
  cells?: number;
  /** Accessible name, e.g. "Pool space used". */
  label: string;
  className?: string;
}

/**
 * Instrument style gauge: discrete cells that are green up to `warnAt`, amber up to `critAt`
 * and red beyond. The unlit part of the scale keeps a faint tint of its zone, so the thresholds
 * are visible before they are reached.
 */
export function SegmentedGauge({
  value,
  warnAt = 85,
  critAt = 95,
  cells = 40,
  label,
  className,
}: SegmentedGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const lit = clamped > 0 ? Math.max(1, Math.round((clamped / 100) * cells)) : 0;
  return (
    <div className={cx(styles.root, className)}>
      <div
        className={styles.cells}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
      >
        {Array.from({ length: cells }, (_, index) => (
          <span
            key={index}
            className={styles.cell}
            data-lit={index < lit || undefined}
            data-tone={toneForThreshold((index / cells) * 100, warnAt, critAt)}
          />
        ))}
      </div>
      <div className={styles.scale} aria-hidden>
        <span style={{ left: `${warnAt}%` }}>{warnAt}</span>
        <span style={{ left: `${critAt}%` }}>{critAt}</span>
      </div>
    </div>
  );
}
