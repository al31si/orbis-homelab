import { Link, useLocation } from 'wouter';
import { useSnapshot } from '@/data';
import { t } from '@/i18n';
import { cx } from '@/lib/cx';
import { toneForStatus, type UiTone } from '@/lib/tone';
import { Icon } from '@/ui/icons';
import { StatusDot } from '@/ui/Badge';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { Brand } from './Brand';
import { SETTINGS_ITEM, isActivePath, type NavItem } from './navItems';
import { useNavItems } from './useNavItems';
import { useNavBadges } from './useNavBadges';
import styles from './Nav.module.css';

function NavLink({
  item,
  badge,
  className,
}: {
  item: NavItem;
  badge?: UiTone;
  className?: string;
}) {
  const [location] = useLocation();
  const active = isActivePath(location, item.path);
  return (
    <Link
      href={item.path}
      className={cx(styles.item, className)}
      aria-current={active ? 'page' : undefined}
    >
      <span className={styles.icon}>
        <Icon name={item.icon} size={24} filled={active} />
        {badge && (
          <span className={styles.badge} data-tone={badge}>
            <span className="sr-only">
              {badge === 'crit' ? t('shell.nav.badge.crit') : t('shell.nav.badge.warn')}
            </span>
          </span>
        )}
      </span>
      <span className={styles.label}>{t(item.labelKey)}</span>
    </Link>
  );
}

function SidebarStatus() {
  const { data, status, fetchedAt } = useSnapshot('overview');
  const overall = data?.status ?? 'unknown';
  return (
    <div className={styles.footer}>
      <span className={styles.footerStatus}>
        <StatusDot tone={toneForStatus(overall)} />
        {t(`shell.status.${overall}`)}
      </span>
      <UpdatedAt fetchedAt={fetchedAt} status={status} />
    </div>
  );
}

/**
 * The one navigation component: a bottom tab bar (<700px), a left rail (700-1099px) or a sidebar
 * (>=1100px). Layout is pure CSS; the tab count follows the enabled features and Settings lives
 * in the header on compact screens.
 */
export function Nav() {
  const badges = useNavBadges();
  const items = useNavItems();
  return (
    <nav className={styles.nav} aria-label={t('shell.nav.label')}>
      <Brand />
      <ul className={styles.items}>
        {items.map((item) => (
          <li key={item.path} className={styles.cell}>
            <NavLink item={item} badge={badges[item.path]} />
          </li>
        ))}
      </ul>
      <div className={styles.bottom}>
        <NavLink item={SETTINGS_ITEM} />
        <SidebarStatus />
      </div>
    </nav>
  );
}
