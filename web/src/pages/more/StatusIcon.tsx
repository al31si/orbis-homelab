import type { UiTone } from '@/lib/tone';
import { Icon, type IconName } from '@/ui/icons';
import styles from './more.module.css';

/** Round tinted icon that leads a status row. */
export function StatusIcon({ icon, tone = 'neutral' }: { icon: IconName; tone?: UiTone }) {
  return (
    <span className={styles.statusIcon} data-tone={tone}>
      <Icon name={icon} size={20} />
    </span>
  );
}
