import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import type { UiTone } from '@/lib/tone';
import styles from './Badge.module.css';

export interface StatusDotProps extends HTMLAttributes<HTMLSpanElement> {
  tone: UiTone;
  /** Soft pulsing halo for live/active states (disabled with reduced motion). */
  pulse?: boolean;
  /** Accessible text. Without it the dot is decorative. */
  label?: string;
}

export function StatusDot({ tone, pulse, label, className, ...rest }: StatusDotProps) {
  return (
    <span
      className={cx(styles.dot, pulse && styles.pulse, className)}
      data-tone={tone}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...rest}
    />
  );
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: UiTone;
  /** Prefix the label with a status dot. */
  dot?: boolean;
  children: ReactNode;
}

/** Compact status label: "Online", "Critico", "3 attivi". */
export function Badge({ tone = 'neutral', dot, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(styles.badge, className)} data-tone={tone} {...rest}>
      {dot && <span className={styles.badgeDot} aria-hidden />}
      {children}
    </span>
  );
}
