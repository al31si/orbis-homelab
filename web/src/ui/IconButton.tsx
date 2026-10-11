import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';
import { AppLink } from './AppLink';
import { Icon, type IconName } from './icons';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Required: icon-only controls need an accessible name (also used as tooltip). */
  label: string;
  filled?: boolean;
  iconSize?: number;
  /** `plain` has no background until pressed; `soft` sits on a subtle disc. */
  variant?: 'plain' | 'soft';
}

export function IconButton({
  icon,
  label,
  filled,
  iconSize = 22,
  variant = 'plain',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, variant === 'soft' && styles.soft, className)}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={iconSize} filled={filled} />
    </button>
  );
}

export interface IconLinkProps {
  icon: IconName;
  /** Required accessible name (also used as tooltip). */
  label: string;
  href: string;
  filled?: boolean;
  iconSize?: number;
  variant?: 'plain' | 'soft';
  className?: string;
}

/** `IconButton` look for navigation: a link to an internal route or external URL. */
export function IconLink({
  icon,
  label,
  href,
  filled,
  iconSize = 22,
  variant = 'plain',
  className,
}: IconLinkProps) {
  return (
    <AppLink
      href={href}
      className={cx(styles.button, variant === 'soft' && styles.soft, className)}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} size={iconSize} filled={filled} />
    </AppLink>
  );
}
