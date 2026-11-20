import { t } from '@/i18n';
import { useToast } from '@/ui/Toast';
import { Button } from '@/ui/Button';
import { copyText } from './clipboard';
import styles from './more.module.css';

/** The HTTPS address of the app, ready to open in the browser or to copy and paste elsewhere. */
export function SecureAddress({ url }: { url: string }) {
  const toast = useToast();

  async function copy() {
    const copied = await copyText(url);
    toast.show(
      copied
        ? { id: 'copy-secure-url', message: t('more.secure.copied'), tone: 'ok', duration: 2500 }
        : { id: 'copy-secure-url', message: t('more.secure.copyFailed'), tone: 'warn' },
    );
  }

  return (
    <div className={styles.address}>
      <code className={styles.addressText}>{url}</code>
      <div className={styles.actions}>
        <Button variant="primary" icon="external-link" href={url}>
          {t('more.secure.open')}
        </Button>
        <Button variant="secondary" icon="copy" onClick={() => void copy()}>
          {t('more.secure.copy')}
        </Button>
      </div>
    </div>
  );
}
