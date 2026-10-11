import { describe, expect, it } from 'vitest';
import { normalizeText, rankItems, scoreMatch } from './commandRanking';

const titles = (query: string, items: string[], fuzzy = false) =>
  rankItems(query, items, (title) => ({ title }), { fuzzy }).map((entry) => entry.item);

describe('normalizeText', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeText('  Attività ')).toBe('attivita');
  });
});

describe('scoreMatch', () => {
  it('ranks exact, prefix, word start and substring in that order', () => {
    const exact = scoreMatch('home', { title: 'Home' });
    const prefix = scoreMatch('home', { title: 'Homepage' });
    const wordStart = scoreMatch('home', { title: 'Lab Home' });
    const substring = scoreMatch('home', { title: 'Nonhome' });
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(wordStart);
    expect(wordStart).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(0);
  });

  it('scores keyword hits below the same hit in the title', () => {
    const inTitle = scoreMatch('film', { title: 'Film' });
    const inKeywords = scoreMatch('film', { title: 'Radarr', keywords: ['film'] });
    expect(inTitle).toBeGreaterThan(inKeywords);
    expect(inKeywords).toBeGreaterThan(0);
  });

  it('requires every token to match somewhere', () => {
    const target = { title: 'Lab Planner', keywords: ['AI'] };
    expect(scoreMatch('lab plan', target)).toBeGreaterThan(0);
    expect(scoreMatch('lab ai', target)).toBeGreaterThan(0);
    expect(scoreMatch('lab radarr', target)).toBe(0);
  });

  it('ignores accents on both sides', () => {
    expect(scoreMatch('attivita', { title: 'Attività' })).toBeGreaterThan(0);
    expect(scoreMatch('attività', { title: 'Attivita' })).toBeGreaterThan(0);
  });

  it('accepts in-order characters only in fuzzy mode', () => {
    expect(scoreMatch('jlf', { title: 'Jellyfin' })).toBe(0);
    expect(scoreMatch('jlf', { title: 'Jellyfin' }, { fuzzy: true })).toBeGreaterThan(0);
    expect(scoreMatch('fjl', { title: 'Jellyfin' }, { fuzzy: true })).toBe(0);
  });

  it('matches keywords only at the start of a word', () => {
    const target = { title: 'Seafile', keywords: ['Cloud personale'] };
    expect(scoreMatch('pers', target)).toBeGreaterThan(0);
    expect(scoreMatch('son', target)).toBe(0);
    expect(scoreMatch('cpl', target, { fuzzy: true })).toBe(0);
  });

  it('matches everything for an empty query', () => {
    expect(scoreMatch('   ', { title: 'Qualsiasi' })).toBe(1);
  });
});

describe('rankItems', () => {
  it('sorts best matches first and drops non matches', () => {
    expect(titles('son', ['Jellyfin', 'Sonarr', 'Prowlarr', 'Lessons of Son'])).toEqual([
      'Sonarr',
      'Lessons of Son',
    ]);
  });

  it('prefers the shorter title among equal matches', () => {
    expect(titles('ra', ['Radarr', 'Rad'])).toEqual(['Rad', 'Radarr']);
  });

  it('keeps the input order for an empty query', () => {
    expect(titles('', ['b', 'a', 'c'])).toEqual(['b', 'a', 'c']);
  });

  it('keeps the input order for equal scores', () => {
    expect(titles('x', ['x1', 'x2', 'x3'])).toEqual(['x1', 'x2', 'x3']);
  });
});
