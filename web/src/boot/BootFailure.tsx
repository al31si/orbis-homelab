import { t } from '@/i18n';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import styles from './BootFailure.module.css';

/** Shown when the boot config can neither be read from index.html nor fetched from the server. */
export function BootFailure() {
  return (
    <main className={styles.screen} data-tone="crit">
      <EmptyState
        icon="alert-circle"
        title={t('shell.boot.failedTitle')}
        description={t('shell.boot.failedDescription')}
        action={
          <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
        }
      />
    </main>
  );
}
