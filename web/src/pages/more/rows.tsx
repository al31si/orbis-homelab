import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { isInternalHref } from '@/lib/links';
import type { UiTone } from '@/lib/tone';
import { AppLink } from '@/ui/AppLink';
import { StatusDot } from '@/ui/Badge';
import { Icon } from '@/ui/icons';
import styles from './rows.module.css';

/** A ruled list: rows separated by hairlines, no surface behind them. */
export function Rows({
  children,
  label,
  ruled,
}: {
  children: ReactNode;
  label?: string;
  /** Also draws the line above the first row (when something other than a title precedes it). */
  ruled?: boolean;
}) {
  return (
    <ul className={cx(styles.rows, ruled && styles.ruled)} aria-label={label}>
      {children}
    </ul>
  );
}

export interface RowProps {
  title: ReactNode;
  /** Secondary text under the title. */
  help?: ReactNode;
  /** A lamp before the title; `label` is its text equivalent when the title does not say it. */
  lamp?: { tone: UiTone; label?: string };
  /** A glyph or logo before the title. */
  leading?: ReactNode;
  /** Value or control aligned to the right. */
  trailing?: ReactNode;
  /** Whole-row link: internal route (chevron) or external address (arrow out). */
  href?: string;
  /** Whole-row button. `action` is the small glyph that says what it does. */
  onClick?: () => void;
  action?: ReactNode;
  /** From 600px the title takes a fixed column and the help sits beside it. */
  split?: boolean;
  /** The trailing control is wide: it takes its own line on compact screens. */
  wideControl?: boolean;
  /** Content under the help text (buttons of a status). Not for interactive rows. */
  children?: ReactNode;
}

/** One setting or one fact of a list: label, optional help, optional value or control. */
export function Row({
  title,
  help,
  lamp,
  leading,
  trailing,
  href,
  onClick,
  action,
  split,
  wideControl,
  children,
}: RowProps) {
  const content = (
    <>
      {leading && <span className={styles.leading}>{leading}</span>}
      {lamp && <StatusDot tone={lamp.tone} label={lamp.label} className={styles.lamp} />}
      <span className={cx(styles.main, split && styles.split)}>
        <span className={styles.title}>{title}</span>
        {help && <span className={styles.help}>{help}</span>}
        {children && <span className={styles.extra}>{children}</span>}
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
      {href && (
        <Icon
          name={isInternalHref(href) ? 'chevron-right' : 'external-link'}
          size={16}
          className={styles.glyph}
        />
      )}
      {action && <span className={styles.glyph}>{action}</span>}
    </>
  );
  const className = cx(styles.row, wideControl && styles.wideControl);

  return (
    <li className={styles.item}>
      {href ? (
        <AppLink href={href} className={cx(className, styles.interactive)}>
          {content}
        </AppLink>
      ) : onClick ? (
        <button type="button" className={cx(className, styles.interactive)} onClick={onClick}>
          {content}
        </button>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}

/** Definition list: what it is on the left, its value on the right. */
export function Facts({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <dl className={styles.facts} aria-label={label}>
      {children}
    </dl>
  );
}

export interface FactProps {
  label: ReactNode;
  /** The value, right-aligned. */
  children: ReactNode;
  /** Value is code, a path or an identifier. */
  mono?: boolean;
  /** Extra lines under the label, one per item. */
  details?: readonly ReactNode[];
}

export function Fact({ label, children, mono, details }: FactProps) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={cx(styles.factValue, mono && styles.mono)}>{children}</dd>
      {details && details.length > 0 && (
        <dd className={styles.factDetails}>
          {details.map((line, index) => (
            <span key={index}>{line}</span>
          ))}
        </dd>
      )}
    </div>
  );
}

/** A lamp with its word, for values that are a state ("Yes", "Active"). */
export function Lit({ tone, children }: { tone: UiTone; children: ReactNode }) {
  return (
    <span className={styles.lit}>
      <StatusDot tone={tone} />
      {children}
    </span>
  );
}
