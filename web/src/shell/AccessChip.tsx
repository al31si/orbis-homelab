import { useSession } from '@/data';
import { t } from '@/i18n';
import { Icon } from '@/ui/icons';
import styles from './AccessChip.module.css';

/** Small "Limited access" chip shown while the instance withholds private data from this device. */
export function AccessChip() {
  const session = useSession();
  if (session?.access !== 'limited') return null;
  return (
    <span
      className={styles.chip}
      title={t('shell.access.hint')}
      aria-label={t('shell.access.hint')}
    >
      <Icon name="lock" size={14} />
      <span className={styles.text}>{t('shell.access.chip')}</span>
    </span>
  );
}
