import { t } from '@/i18n';
import { networkHint } from '@/lib/networkHint';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import styles from './BootFailure.module.css';

/** Shown when the boot config can neither be read from index.html nor fetched from the server. */
export function BootFailure() {
  // The server-rendered title keeps the instance name available even when boot config is missing.
  const name = document.title;
  return (
    <main className={styles.screen} data-tone="crit">
      <EmptyState
        icon="alert-circle"
        title={t('shell.boot.failedTitle')}
        description={
          <>
            {t('shell.boot.failedDescription')}
            <span className={styles.hint}>
              {networkHint(window.location.hostname) === 'tailscale'
                ? t('shell.networkHint.tailscale')
                : t('shell.networkHint.generic', { name })}
            </span>
          </>
        }
        action={
          <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
        }
      />
    </main>
  );
}
