import type { AlertSource, FeatureFlags } from '@shared/api';
import type { IconName } from '@/ui/icons';

export type NavLabelKey =
  | 'shell.nav.home'
  | 'shell.nav.services'
  | 'shell.nav.system'
  | 'shell.nav.storage'
  | 'shell.nav.activity'
  | 'shell.nav.settings';

export interface NavItem {
  path: string;
  labelKey: NavLabelKey;
  icon: IconName;
  /** Alert sources that light the badge dot on this item. */
  alertSources: readonly (AlertSource | 'any')[];
}

/** Settings sits in the header on compact screens and at the bottom of the rail / sidebar. */
export const SETTINGS_ITEM: NavItem = {
  path: '/more',
  labelKey: 'shell.nav.settings',
  icon: 'settings',
  alertSources: [],
};

/**
 * Main navigation of this instance: Home and Services always, then a page for every enabled
 * feature. With fewer pages the tab bar simply has fewer tabs (3 to 5).
 */
export function buildNavItems(features: FeatureFlags): NavItem[] {
  const items: NavItem[] = [
    { path: '/', labelKey: 'shell.nav.home', icon: 'home', alertSources: ['any'] },
    {
      path: '/services',
      labelKey: 'shell.nav.services',
      icon: 'services',
      alertSources: ['service'],
    },
  ];
  if (features.system) {
    items.push({
      path: '/system',
      labelKey: 'shell.nav.system',
      icon: 'system',
      alertSources: ['system'],
    });
  }
  if (features.storage) {
    items.push({
      path: '/storage',
      labelKey: 'shell.nav.storage',
      icon: 'storage',
      alertSources: ['storage'],
    });
  }
  if (features.activity) {
    items.push({
      path: '/activity',
      labelKey: 'shell.nav.activity',
      icon: 'activity',
      alertSources: [],
    });
  }
  return items;
}

export function isActivePath(current: string, path: string): boolean {
  return path === '/' ? current === '/' : current === path || current.startsWith(`${path}/`);
}
