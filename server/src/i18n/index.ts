import type { Language } from '../../../shared/api.js';
import { type Localized, type TranslateFn, makeTranslator } from '../../../shared/i18n.js';
import { en } from './en/index.js';
import { it } from './it/index.js';

/** `Localized` widens literal strings, so both dictionaries are assignable to it. */
export type ServerMessages = Localized<typeof it>;
export type T = TranslateFn<ServerMessages>;

/** Translator for the instance language (one language per instance). */
export function createTranslator(language: Language): T {
  return makeTranslator<ServerMessages>(language === 'it' ? it : en);
}
