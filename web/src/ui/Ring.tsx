import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import type { UiTone } from '@/lib/tone';
import styles from './Ring.module.css';

export interface RingProps {
  /** 0..100 */
  value: number;
  tone: UiTone;
  /** Outer diameter in px (default 96). */
  size?: number;
  /** Ring thickness in px (default 8). */
  stroke?: number;
  /** Accessible description, e.g. "Punteggio di salute 92 su 100". */
  label: string;
  /** Content centred inside the ring. */
  children?: ReactNode;
  className?: string;
}

/** Circular progress/score indicator (also usable as a gauge). */
export function Ring({
  value,
  tone,
  size = 96,
  stroke = 8,
  label,
  children,
  className,
}: RingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cx(styles.ring, className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
      data-tone={tone}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className={styles.value}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      {children && <div className={styles.center}>{children}</div>}
    </div>
  );
}
