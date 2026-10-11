import type { ServiceState } from '@shared/api';
import type { IconName } from '@/ui/icons';
import { rankItems } from './commandRanking';

export type PaletteGroupId = 'recent' | 'favorites' | 'services' | 'pages' | 'actions';

export interface PaletteItem {
  /** `service:<id>`, `page:<path>` or `action:<name>`. */
  id: string;
  group: 'services' | 'pages' | 'actions';
  title: string;
  subtitle?: string;
  keywords?: readonly string[];
  icon: { kind: 'service'; name: string } | { kind: 'icon'; name: IconName };
  /** Service entries only. */
  serviceId?: string;
  state?: ServiceState;
  /** Resolved launch URL of a service: the secondary "open it" action. */
  externalUrl?: string;
}

export interface PaletteGroup {
  id: PaletteGroupId;
  items: PaletteItem[];
}

export interface ArrangeContext {
  /** Item ids the user picked recently, newest first. */
  recentIds: readonly string[];
  /** Favorite service ids, in the user's order. */
  favoriteIds: readonly string[];
}

const SEARCH_GROUPS = ['services', 'pages', 'actions'] as const;
const MAX_SERVICE_RESULTS = 8;
const MAX_RECENT = 4;

/**
 * Empty query: recents, favorites, then all pages and actions.
 * With a query: matching services, pages and actions, the group holding the best match first;
 * in-order-characters matches ("jlf") are used only when nothing matches otherwise.
 */
export function arrangeResults(
  query: string,
  items: readonly PaletteItem[],
  { recentIds, favoriteIds }: ArrangeContext,
): PaletteGroup[] {
  const groups: PaletteGroup[] = [];

  if (query.trim() === '') {
    const recent = recentIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is PaletteItem => item !== undefined)
      .slice(0, MAX_RECENT);
    const shown = new Set(recent.map((item) => item.id));
    const favorites = favoriteIds
      .map((id) => items.find((item) => item.id === `service:${id}`))
      .filter((item): item is PaletteItem => item !== undefined && !shown.has(item.id));
    groups.push({ id: 'recent', items: recent }, { id: 'favorites', items: favorites });
    for (const id of ['pages', 'actions'] as const) {
      groups.push({ id, items: items.filter((item) => item.group === id) });
    }
    return groups.filter((group) => group.items.length > 0);
  }

  const rankGroups = (fuzzy: boolean) =>
    SEARCH_GROUPS.map((id, order) => {
      let ranked = rankItems(
        query,
        items.filter((item) => item.group === id),
        (item) => ({ title: item.title, keywords: item.keywords }),
        { fuzzy },
      );
      if (id === 'services') ranked = ranked.slice(0, MAX_SERVICE_RESULTS);
      return { id, order, best: ranked[0]?.score ?? 0, items: ranked.map((entry) => entry.item) };
    }).filter((group) => group.items.length > 0);

  // Loose "characters in order" matches only when nothing matches properly.
  let scored = rankGroups(false);
  if (scored.length === 0) scored = rankGroups(true);
  return scored
    .sort((a, b) => b.best - a.best || a.order - b.order)
    .map(({ id, items: groupItems }) => ({ id, items: groupItems }));
}

const MAX_STORED_RECENTS = 8;

/** Puts `id` first, drops earlier occurrences and keeps the list short. */
export function pushRecent(recentIds: readonly string[], id: string): string[] {
  return [id, ...recentIds.filter((existing) => existing !== id)].slice(0, MAX_STORED_RECENTS);
}
