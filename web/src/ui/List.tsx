import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { AppLink } from './AppLink';
import { Icon } from './icons';
import styles from './List.module.css';

export interface ListProps {
  children: ReactNode;
  /** `card` (default) is a grouped surface; `plain` has no background (use inside a Card). */
  variant?: 'card' | 'plain';
  className?: string;
  'aria-label'?: string;
}

/** Vertical list of `ListRow`s with hairline separators. */
export function List({ children, variant = 'card', className, ...rest }: ListProps) {
  return (
    <ul className={cx(styles.list, variant === 'card' && styles.card, className)} {...rest}>
      {children}
    </ul>
  );
}

export interface ListRowProps {
  /** Icon, ServiceIcon, avatar... shown before the text. */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Value, badge or control aligned to the right. */
  trailing?: ReactNode;
  /** Show a disclosure chevron (implied by `href` to an internal route). */
  chevron?: boolean;
  /** Internal path or external URL: the row becomes a link. */
  href?: string;
  /** The row becomes a button. */
  onClick?: () => void;
  /** Let title and subtitle wrap instead of truncating (alerts, error messages). */
  multiline?: boolean;
  className?: string;
}

/** Touch friendly row (min 48px). Interactive when `href` or `onClick` is given. */
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  chevron,
  href,
  onClick,
  multiline,
  className,
}: ListRowProps) {
  const content = (
    <>
      {leading && <span className={styles.leading}>{leading}</span>}
      <span className={styles.main}>
        <span className={styles.title}>{title}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
      {(chevron ?? href?.startsWith('/')) && (
        <Icon name="chevron-right" size={18} className={styles.chevron} />
      )}
    </>
  );
  const rowClass = cx(
    styles.row,
    (href || onClick) && styles.interactive,
    multiline && styles.multiline,
    className,
  );

  return (
    <li className={styles.item}>
      {href ? (
        <AppLink href={href} className={rowClass}>
          {content}
        </AppLink>
      ) : onClick ? (
        <button type="button" className={rowClass} onClick={onClick}>
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}
