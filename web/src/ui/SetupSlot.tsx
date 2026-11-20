import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Icon } from './icons';
import styles from './SetupSlot.module.css';

export interface SetupSlotProps {
  /** The product's logo or an icon tile. */
  leading: ReactNode;
  /** What to do, as an action: "Connect Vikunja". */
  title: string;
  /** What switching it on adds: one sentence. */
  benefit: string;
  /** The steps, in order. Short, one action each. */
  steps: readonly ReactNode[];
  /** Where the details are written down. */
  help?: { href: string; label: string };
  className?: string;
}

/**
 * Something that is not set up yet, drawn as an empty bay: a dashed outline, what it will show,
 * and the few steps that fill it. It is not an error and not a warning.
 */
export function SetupSlot({ leading, title, benefit, steps, help, className }: SetupSlotProps) {
  return (
    <section className={cx(styles.slot, className)}>
      <div className={styles.head}>
        {leading}
        <div className={styles.text}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.benefit}>{benefit}</p>
        </div>
      </div>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={index} className={styles.step}>
            <span className={styles.stepText}>{step}</span>
          </li>
        ))}
      </ol>
      {help && (
        <a className={styles.help} href={help.href} target="_blank" rel="noopener noreferrer">
          {help.label}
          <Icon name="external-link" size={14} />
        </a>
      )}
    </section>
  );
}
