/**
 * Tiny typed i18n core shared by the BFF and the PWA (no dependency).
 *
 * A dictionary maps a key to a string, or to a function when the text has parameters or plural
 * forms. The Italian dictionary is the source of truth for keys and parameter types; the English
 * one must be assignable to `Localized<typeof it>` or it does not compile.
 *
 *   export const it = defineMessages({
 *     'home.greeting': 'Ciao',
 *     'home.problems': (p: { n: number }) => (p.n === 1 ? '1 problema' : `${p.n} problemi`),
 *   });
 *   export const en: Localized<typeof it> = {
 *     'home.greeting': 'Hello',
 *     'home.problems': (p) => (p.n === 1 ? '1 problem' : `${p.n} problems`),
 *   };
 */

export type Message = string | ((params: never) => string);
export type Dictionary = Record<string, Message>;

/** Identity helper that keeps literal keys and parameter types. */
export function defineMessages<const T extends Dictionary>(messages: T): T {
  return messages;
}

/** The shape another language must have, given the reference dictionary. */
export type Localized<T extends Dictionary> = {
  [K in keyof T]: T[K] extends (params: infer P) => string ? (params: P) => string : string;
};

type ParamsOf<M> = M extends (params: infer P) => string ? P : never;

export type TranslateFn<D extends Dictionary> = <K extends keyof D & string>(
  key: K,
  ...args: [ParamsOf<D[K]>] extends [never] ? [] : [params: ParamsOf<D[K]>]
) => string;

/**
 * Builds `t` for one dictionary. A missing key (possible only with extension dictionaries or
 * stale data) renders the key itself so it is visible rather than blank.
 */
export function makeTranslator<D extends Dictionary>(dictionary: D): TranslateFn<D> {
  return ((key: string, params?: unknown) => {
    const message = (dictionary as Dictionary)[key];
    if (message === undefined) return key;
    return typeof message === 'function' ? (message as (p: unknown) => string)(params) : message;
  }) as TranslateFn<D>;
}

/** Locale used for number/date formatting. */
export const LOCALE_BY_LANGUAGE: Record<'it' | 'en', string> = {
  it: 'it-IT',
  en: 'en-GB',
};
