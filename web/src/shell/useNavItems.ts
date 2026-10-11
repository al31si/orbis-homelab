import { useMemo } from 'react';
import { useFeatures } from '@/boot';
import { buildNavItems, type NavItem } from './navItems';

/** The navigation entries enabled on this instance (stable while the features do not change). */
export function useNavItems(): NavItem[] {
  const features = useFeatures();
  return useMemo(() => buildNavItems(features), [features]);
}
