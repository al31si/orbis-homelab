import { Link } from 'wouter';
import { useApp } from '@/boot';
import { t } from '@/i18n';
import styles from './Brand.module.css';

/** Instance emblem (+ name from 1100px). Links home. */
export function Brand() {
  const { name } = useApp();
  return (
    <Link href="/" className={styles.brand} aria-label={t('shell.brand.home', { name })}>
      <img src="/icons/emblem.png" alt="" width={34} height={34} className={styles.emblem} />
      <span className={styles.text}>
        <span className={styles.name}>{name}</span>
      </span>
    </Link>
  );
}
