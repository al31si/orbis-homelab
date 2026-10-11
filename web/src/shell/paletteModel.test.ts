import { describe, expect, it } from 'vitest';
import { arrangeResults, pushRecent, type ArrangeContext, type PaletteItem } from './paletteModel';

function item(id: string, group: PaletteItem['group'], title: string, keywords?: string[]) {
  return { id, group, title, keywords, icon: { kind: 'icon', name: 'home' } } as PaletteItem;
}

const items = [
  item('service:homepage', 'services', 'Homepage'),
  item('service:jellyfin', 'services', 'Jellyfin', ['streaming']),
  item('service:radarr', 'services', 'Radarr', ['film']),
  item('page:/', 'pages', 'Home', ['panoramica']),
  item('page:/storage', 'pages', 'Storage', ['dischi']),
  item('action:refresh', 'actions', 'Aggiorna dati'),
];

const context: ArrangeContext = { recentIds: [], favoriteIds: [] };
const layout = (query: string, ctx = context) =>
  arrangeResults(query, items, ctx).map((group) => [group.id, group.items.map((i) => i.id)]);

describe('arrangeResults', () => {
  it('shows recents, favorites, pages and actions for an empty query', () => {
    const groups = layout('', {
      recentIds: ['page:/storage', 'service:gone', 'service:radarr'],
      favoriteIds: ['jellyfin', 'radarr', 'missing'],
    });
    expect(groups).toEqual([
      ['recent', ['page:/storage', 'service:radarr']],
      ['favorites', ['service:jellyfin']],
      ['pages', ['page:/', 'page:/storage']],
      ['actions', ['action:refresh']],
    ]);
  });

  it('leaves out empty groups', () => {
    expect(layout('')).toEqual([
      ['pages', ['page:/', 'page:/storage']],
      ['actions', ['action:refresh']],
    ]);
  });

  it('puts the group with the best match first', () => {
    expect(layout('home')[0]).toEqual(['pages', ['page:/']]);
    expect(layout('homepage')[0]).toEqual(['services', ['service:homepage']]);
    expect(layout('film')).toEqual([['services', ['service:radarr']]]);
  });

  it('keeps every matching group, ordered by best score', () => {
    expect(layout('o').map(([id]) => id)).toEqual(['pages', 'services', 'actions']);
  });

  it('matches keywords and ignores accents', () => {
    expect(layout('dischi')).toEqual([['pages', ['page:/storage']]]);
    expect(layout('AGGIORNA')).toEqual([['actions', ['action:refresh']]]);
  });

  it('falls back to in-order characters only without proper matches', () => {
    expect(layout('jlf')).toEqual([['services', ['service:jellyfin']]]);
    expect(layout('rad')).toEqual([['services', ['service:radarr']]]);
  });

  it('returns nothing when nothing matches', () => {
    expect(layout('zzzz')).toEqual([]);
  });
});

describe('pushRecent', () => {
  it('moves an existing id to the front without duplicates', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it('keeps at most eight entries', () => {
    const many = ['1', '2', '3', '4', '5', '6', '7', '8'];
    expect(pushRecent(many, 'new')).toEqual(['new', '1', '2', '3', '4', '5', '6', '7']);
  });
});
