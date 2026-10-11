import { useSyncExternalStore } from 'react';
import { getLanguage } from '@/i18n';
import {
  CLIENT_EXTENSION_API_VERSION,
  type ClientExtension,
  type ExtensionActivitySection,
  type ExtensionPage,
} from '../../../sdk/client-types';
import { resolveExtensionMessage } from './messages';

/**
 * Client extensions register themselves here (through `window.__ORBIS__.registerExtension`,
 * wired by the extension host). Components subscribe with the hooks below, so a page that is
 * contributed after first paint (the bundle loads asynchronously) appears as soon as it registers.
 */
interface RegistryView {
  extensions: readonly ClientExtension[];
  /** Pages with `title` and `description` already translated into the instance language. */
  pages: readonly ExtensionPage[];
  /** Lowest `order` first. */
  sections: readonly ExtensionActivitySection[];
}

const registered = new Map<string, ClientExtension>();
const listeners = new Set<() => void>();
let view: RegistryView = { extensions: [], pages: [], sections: [] };

function buildView(): RegistryView {
  const language = getLanguage();
  const extensions = [...registered.values()];
  const pages = extensions.flatMap((extension) =>
    (extension.pages ?? []).map((page) => ({
      ...page,
      title: resolveExtensionMessage(extension.messages, language, page.title),
      description: resolveExtensionMessage(extension.messages, language, page.description),
    })),
  );
  const sections = extensions
    .flatMap((extension) => extension.activitySections ?? [])
    .sort((a, b) => a.order - b.order);
  return { extensions, pages, sections };
}

export function registerClientExtension(extension: ClientExtension): void {
  if (registered.has(extension.id)) return;
  if (extension.apiVersion !== CLIENT_EXTENSION_API_VERSION) {
    console.warn(
      `Extension "${extension.id}" targets client API ${String(extension.apiVersion)}, this app provides ${CLIENT_EXTENSION_API_VERSION}`,
    );
    return;
  }
  registered.set(extension.id, extension);
  view = buildView();
  for (const listener of listeners) listener();
}

/** The extension registered under `id`, if its bundle has loaded. */
export function getClientExtension(id: string): ClientExtension | undefined {
  return registered.get(id);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getView = (): RegistryView => view;

export function useClientExtensions(): readonly ClientExtension[] {
  return useSyncExternalStore(subscribe, getView).extensions;
}

/** Pages contributed by extensions, in registration order, with translated title/description. */
export function useExtensionPages(): readonly ExtensionPage[] {
  return useSyncExternalStore(subscribe, getView).pages;
}

/** Activity sections contributed by extensions, lowest `order` first. */
export function useExtensionActivitySections(): readonly ExtensionActivitySection[] {
  return useSyncExternalStore(subscribe, getView).sections;
}
