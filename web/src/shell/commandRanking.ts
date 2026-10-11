/**
 * Fuzzy-ish ranking shared by the command palette and the Services search field.
 *
 * Every whitespace separated token of the query must match. A token scores by where it hits the
 * title: exact > prefix > start of a later word > substring > (optional) subsequence, and hits in
 * the secondary keywords count half as much (keywords only match at the start of a word).
 */

export interface Searchable {
  title: string;
  /** Secondary text that should also be findable: description, category, synonyms. */
  keywords?: readonly string[];
}

export interface RankOptions {
  /** Titles may also match with characters in order ("jlf" finds "Jellyfin"). Off for filtering. */
  fuzzy?: boolean;
}

export interface Ranked<T> {
  item: T;
  score: number;
}

const WORD_SPLIT = /[^\p{L}\p{N}]+/u;
const KEYWORD_WEIGHT = 0.5;

/** Lowercase without accents, so "attivita" finds "Attività". */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function isSubsequence(token: string, text: string): boolean {
  let at = 0;
  for (const char of text) {
    if (char === token[at]) at += 1;
    if (at === token.length) return true;
  }
  return false;
}

/** `loose` also accepts a hit inside a word and (with `fuzzy`) characters in order: titles only. */
function scoreToken(token: string, text: string, loose: boolean, fuzzy: boolean): number {
  if (text === token) return 100;
  if (text.startsWith(token)) return 90;
  const wordIndex = text.split(WORD_SPLIT).findIndex((word) => word.startsWith(token));
  if (wordIndex >= 0) return 80 - Math.min(wordIndex, 5) * 2;
  if (!loose) return 0;
  if (text.includes(token)) return 50;
  if (fuzzy && token.length >= 2 && isSubsequence(token, text)) return 20;
  return 0;
}

function tokens(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

/** 0 when the query does not match; higher is better. An empty query matches with score 1. */
export function scoreMatch(query: string, target: Searchable, options: RankOptions = {}): number {
  const parts = tokens(query);
  if (parts.length === 0) return 1;
  const fuzzy = options.fuzzy ?? false;
  const title = normalizeText(target.title);
  const keywords = (target.keywords ?? []).map(normalizeText);

  let total = 0;
  for (const token of parts) {
    let best = scoreToken(token, title, true, fuzzy);
    for (const keyword of keywords) {
      best = Math.max(best, scoreToken(token, keyword, false, false) * KEYWORD_WEIGHT);
    }
    if (best === 0) return 0;
    total += best;
  }
  // Shorter titles are a slightly better answer to the same query.
  return total / parts.length - title.length * 0.01;
}

/**
 * Items that match the query, best first. Ties keep the input order. An empty query returns
 * everything in the input order.
 */
export function rankItems<T>(
  query: string,
  items: readonly T[],
  get: (item: T) => Searchable,
  options: RankOptions = {},
): Ranked<T>[] {
  const ranked = items.map((item) => ({ item, score: scoreMatch(query, get(item), options) }));
  if (tokens(query).length === 0) return ranked;
  return ranked.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);
}
