import { getLanguage } from '@/i18n';
import { resolveExtensionMessage, type ExtensionParams } from './messages';
import { getClientExtension } from './registry';

export type ExtensionTranslator = (key: string, params?: ExtensionParams) => string;

/**
 * Translator for the dictionaries an extension ships (`ClientExtension.messages`), in the instance
 * language. `{name}` placeholders are filled from `params`; an unknown key renders as itself.
 */
export function extensionTranslator(extensionId: string): ExtensionTranslator {
  return (key, params) =>
    resolveExtensionMessage(getClientExtension(extensionId)?.messages, getLanguage(), key, params);
}
