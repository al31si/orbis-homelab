import type { Language } from '@shared/api';
import { LOCALE_BY_LANGUAGE, type Localized, type TranslateFn, makeTranslator } from '@shared/i18n';
import { en } from './messages/en';
import { it } from './messages/it';

/**
 * UI texts. The language is a property of the instance: it is set once at startup, from the
 * boot config embedded in index.html, before React renders. Components may use `useT()` or the
 * plain `t` (for code outside React, e.g. label builders in `derive.ts`); both are the same
 * function and always follow the active language.
 *
 *   const t = useT();
 *   t('home.greeting');                 // string message
 *   t('home.problems', { n: 3 });       // function message with typed params
 */
export type Messages = Localized<typeof it>;
export type T = TranslateFn<Messages>;

const translators: Record<Language, T> = {
  it: makeTranslator<Messages>(it),
  en: makeTranslator<Messages>(en),
};

let active: Language = 'en';

export function setLanguage(language: Language): void {
  active = language;
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

export function getLanguage(): Language {
  return active;
}

/** BCP 47 locale for `Intl` formatting in the active language. */
export function getLocale(): string {
  return LOCALE_BY_LANGUAGE[active];
}

export const t: T = ((key: string, ...args: unknown[]) =>
  (translators[active] as (k: string, ...a: unknown[]) => string)(key, ...args)) as T;

export function useT(): T {
  return t;
}
