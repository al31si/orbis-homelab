import { t } from '@/i18n';
import { cx } from '@/lib/cx';
import { Icon } from '@/ui/icons';
import { IconLink } from '@/ui/IconButton';
import { AccessChip } from './AccessChip';
import { ConnectionBanner } from './ConnectionBanner';
import { SETTINGS_ITEM } from './navItems';
import { useShell } from './ShellContext';
import styles from './AppHeader.module.css';

/**
 * Sticky top bar. Compact: collapsed page title + search + settings. Wide: search field and
 * status chips. Draws under the iOS status bar (safe-area-inset-top).
 */
export function AppHeader({ collapsedTitle }: { collapsedTitle: string | null }) {
  const { openPalette } = useShell();
  const collapsed = collapsedTitle !== null;
  return (
    <div className={cx(styles.header, collapsed && styles.collapsed)} data-app-header>
      <div className={styles.bar}>
        <p className={styles.title} aria-hidden>
          {collapsedTitle}
        </p>
        <div className={styles.actions}>
          <AccessChip />
          <button
            type="button"
            className={styles.search}
            onClick={openPalette}
            aria-label={t('shell.search')}
          >
            <Icon name="search" size={20} />
            <span className={styles.searchLabel}>{t('shell.search')}</span>
          </button>
          <IconLink
            href={SETTINGS_ITEM.path}
            icon={SETTINGS_ITEM.icon}
            label={t(SETTINGS_ITEM.labelKey)}
            className={styles.more}
          />
        </div>
      </div>
      <ConnectionBanner />
    </div>
  );
}
