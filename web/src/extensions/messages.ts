import type { Language } from '@shared/api';
import type { ExtensionMessages } from '../../../sdk/client-types';

export type ExtensionParams = Record<string, string | number>;

/**
 * Looks `key` up in the extension dictionary of `language` and fills `{name}` placeholders. A key
 * without translation renders as itself, so literal page titles also work.
 */
export function resolveExtensionMessage(
  messages: ExtensionMessages | undefined,
  language: Language,
  key: string,
  params?: ExtensionParams,
): string {
  const template = messages?.[language]?.[key];
  if (template === undefined) return key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}
