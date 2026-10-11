import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { AppLink } from './AppLink';
import { Icon, type IconName } from './icons';
import styles from './Button.module.css';

interface ButtonBase {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** md is 44px (touch), sm is 36px for dense desktop toolbars. */
  size?: 'md' | 'sm';
  icon?: IconName;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

export type ButtonProps = ButtonBase &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBase> & {
    loading?: boolean;
    /** Renders a link (router link for `/paths`, new-context anchor for external URLs). */
    href?: undefined;
  };

export type ButtonLinkProps = ButtonBase & { href: string; onClick?: () => void };

function classes({ variant = 'secondary', size = 'md', fullWidth, className }: ButtonBase) {
  return cx(styles.button, styles[variant], styles[size], fullWidth && styles.full, className);
}

export function Button(props: ButtonProps | ButtonLinkProps) {
  if (props.href !== undefined) {
    const { href, icon, children, onClick } = props;
    return (
      <AppLink href={href} className={classes(props)} onClick={onClick}>
        {icon && <Icon name={icon} size={18} />}
        {children}
      </AppLink>
    );
  }
  const { variant, size, icon, fullWidth, className, children, loading, type, ...rest } = props;
  return (
    <button
      type={type ?? 'button'}
      className={classes({ variant, size, fullWidth, className, children })}
      aria-busy={loading || undefined}
      {...rest}
      disabled={rest.disabled || loading}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden />
      ) : (
        icon && <Icon name={icon} size={18} />
      )}
      {children}
    </button>
  );
}
