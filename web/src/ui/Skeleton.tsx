import type { CSSProperties } from 'react';
import { cx } from '@/lib/cx';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}

/** Placeholder block for first loads. Decorative; announce loading state on the container. */
export function Skeleton({ width = '100%', height = 16, radius, className }: SkeletonProps) {
  const style: CSSProperties = { width, height, borderRadius: radius };
  return <span className={cx(styles.skeleton, className)} style={style} aria-hidden />;
}
