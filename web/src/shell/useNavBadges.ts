import { useMemo } from 'react';
import { useSnapshot } from '@/data';
import type { UiTone } from '@/lib/tone';
import { useNavItems } from './useNavItems';

/** Badge tone per nav path: `crit` beats `warn`; absent when nothing needs attention. */
export function useNavBadges(): Record<string, UiTone | undefined> {
  const { data } = useSnapshot('overview');
  const items = useNavItems();
  return useMemo(() => {
    const badges: Record<string, UiTone | undefined> = {};
    for (const alert of data?.alerts ?? []) {
      if (alert.severity === 'info') continue;
      const tone: UiTone = alert.severity === 'critical' ? 'crit' : 'warn';
      for (const item of items) {
        const relevant = item.alertSources.some(
          (source) => source === 'any' || source === alert.source,
        );
        if (relevant && badges[item.path] !== 'crit') badges[item.path] = tone;
      }
    }
    return badges;
  }, [data, items]);
}
