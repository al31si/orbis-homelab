import { useApp } from '@/boot';
import { useConnection } from '@/data';
import { t } from '@/i18n';
import { formatClock } from '@/lib/format';
import { Icon } from '@/ui/icons';
import styles from './ConnectionBanner.module.css';

/** Calm, persistent notice while the BFF is unreachable; last known data stays on screen. */
export function ConnectionBanner() {
  const { name } = useApp();
  const { status, lastDataAt } = useConnection();
  if (status !== 'offline') return null;
  return (
    <div className={styles.banner} role="status" data-tone="warn">
      <Icon name="wifi-off" size={16} />
      <span>
        {lastDataAt === null
          ? t('shell.connection.offline', { name })
          : t('shell.connection.offlineSince', { name, time: formatClock(lastDataAt) })}
      </span>
    </div>
  );
}
