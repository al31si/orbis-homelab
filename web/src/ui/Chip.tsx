import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Icon, type IconName } from './icons';
import styles from './Chip.module.css';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  selected?: boolean;
  icon?: IconName;
  children: ReactNode;
}

/** Toggle/filter chip (`aria-pressed`). For read-only labels use `Badge`. */
export function Chip({
  selected = false,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      className={cx(styles.chip, selected && styles.selected, className)}
      aria-pressed={selected}
      {...rest}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}
