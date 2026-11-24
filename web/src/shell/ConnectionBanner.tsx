import { useApp } from '@/boot';
import { useConnection } from '@/data';
import { t } from '@/i18n';
import { formatClock } from '@/lib/format';
import { networkHint } from '@/lib/networkHint';
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
      <span className={styles.message}>
        {lastDataAt === null
          ? t('shell.connection.offline', { name })
          : t('shell.connection.offlineSince', { name, time: formatClock(lastDataAt) })}
        <span className={styles.hint}>
          {networkHint(window.location.hostname) === 'tailscale'
            ? t('shell.networkHint.tailscale')
            : t('shell.networkHint.generic', { name })}
        </span>
      </span>
    </div>
  );
}
