import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import type { UiTone } from '@/lib/tone';
import { Icon, type IconName } from './icons';
import styles from './Notice.module.css';

export interface NoticeProps {
  tone?: UiTone;
  icon?: IconName;
  /** Bold first line. */
  title?: string;
  children?: ReactNode;
  className?: string;
}

const DEFAULT_ICON: Record<UiTone, IconName> = {
  ok: 'check-circle',
  warn: 'alert',
  crit: 'alert-circle',
  info: 'info',
  neutral: 'info',
};

/** Inline, non-blocking message: a stale report, a caveat, an explanation. */
export function Notice({ tone = 'info', icon, title, children, className }: NoticeProps) {
  return (
    <div className={cx(styles.notice, className)} data-tone={tone}>
      <Icon name={icon ?? DEFAULT_ICON[tone]} size={18} className={styles.icon} />
      <div className={styles.body}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.text}>{children}</div>}
      </div>
    </div>
  );
}
