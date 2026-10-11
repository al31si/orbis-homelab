import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './StackedBar.module.css';

export interface StackedBarSegment {
  id: string;
  label: ReactNode;
  value: number;
  /** Any CSS colour. Omit for the empty track colour (e.g. free space). */
  color?: string;
  /** Right-aligned text in the legend ("3.2 GB · 24%"). */
  detail?: ReactNode;
  /** Plain-text description used in the accessible name of the bar. */
  text: string;
}

export interface StackedBarProps {
  segments: readonly StackedBarSegment[];
  /** Full width of the bar; defaults to the sum of the segments. */
  total?: number;
  /** Accessible name of the bar, e.g. "Memory". */
  label: string;
  height?: number;
  legend?: boolean;
  className?: string;
}

/** One horizontal bar split into proportional segments, with an optional legend below. */
export function StackedBar({
  segments,
  total,
  label,
  height = 12,
  legend = true,
  className,
}: StackedBarProps) {
  const sum = total ?? segments.reduce((acc, segment) => acc + Math.max(0, segment.value), 0);
  return (
    <div className={cx(styles.root, className)}>
      <div
        className={styles.bar}
        style={{ height }}
        role="img"
        aria-label={`${label}: ${segments.map((segment) => segment.text).join(', ')}`}
      >
        {segments.map((segment) => {
          const share = sum > 0 ? Math.min(100, (Math.max(0, segment.value) / sum) * 100) : 0;
          if (share === 0) return null;
          const style: CSSProperties = { flexBasis: `${share}%`, background: segment.color };
          return (
            <span
              key={segment.id}
              className={segment.color === undefined ? styles.empty : styles.segment}
              style={style}
            />
          );
        })}
      </div>
      {legend && (
        <ul className={styles.legend}>
          {segments.map((segment) => (
            <li key={segment.id} className={styles.item}>
              <span
                className={cx(styles.swatch, segment.color === undefined && styles.swatchEmpty)}
                style={segment.color ? { background: segment.color } : undefined}
                aria-hidden
              />
              <span className={styles.name}>{segment.label}</span>
              {segment.detail !== undefined && (
                <span className={styles.detail}>{segment.detail}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
