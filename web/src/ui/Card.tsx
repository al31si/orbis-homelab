import { createElement, type HTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import type { UiTone } from '@/lib/tone';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside';
  /** Inner padding: none (for lists/media), sm 12px, md 16px (default), lg 24px. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Tints the surface and adds an accent edge, for alerts and states. */
  tone?: UiTone;
}

/** The single elevated surface of the app. Use it only where grouping earns its keep. */
export function Card({ as = 'div', padding = 'md', tone, className, ...rest }: CardProps) {
  return createElement(as, {
    className: cx(styles.card, styles[padding], tone && styles.toned, className),
    'data-tone': tone,
    ...rest,
  });
}
