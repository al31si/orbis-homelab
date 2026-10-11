import { useId, type ReactNode } from 'react';
import { cx } from '@/lib/cx';
import styles from './Section.module.css';

export interface SectionProps {
  title: string;
  /** Right-aligned control next to the title, e.g. a "Tutti" link button. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Titled group of content. The title is an h2, so pages own the single h1. */
export function Section({ title, action, children, className }: SectionProps) {
  const id = useId();
  return (
    <section className={cx(styles.section, className)} aria-labelledby={id}>
      <div className={styles.header}>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {action && <div className={styles.action}>{action}</div>}
      </div>
      {children}
    </section>
  );
}
