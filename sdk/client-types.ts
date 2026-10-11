/**
 * Orbis Homelab client (PWA) extension contract (API version 1).
 *
 * The PWA exposes a global before loading any extension script:
 *
 *   window.__ORBIS__ = { apiVersion: 1, react, jsxRuntime, sdk, registerExtension }
 *
 * - `react` / `jsxRuntime`: the host's React, so extension components share one React instance.
 * - `sdk`: the curated API in `sdk/client.ts` (UI primitives, data hooks, i18n, icons, formatters).
 * - `registerExtension(def)`: called once by the extension bundle (an ES module served from
 *   /extensions/<id>/client.js, only when the server reported it in `Session.extensions`).
 *
 * Extension bundles are built with `react`, `react/jsx-runtime` and `@orbis-homelab/sdk/client`
 * aliased to shims that read those globals, so nothing is duplicated.
 *
 * Compatibility: the contract used to live under the names `window.__BELVEDERE__` and
 * `@belvedere/sdk/*` (the product was called Belvedere before 0.1.0). The host still publishes the
 * global under the old name and `make-shims.mjs` still writes the shim file the old build scripts
 * look for, so extension bundles and build scripts written before the rename keep working.
 */
import type { ComponentType } from 'react';
import type { Language } from '../shared/api.js';

export const CLIENT_EXTENSION_API_VERSION = 1;

/** Per-language message dictionary; `{name}` placeholders are filled by the host `t()` helper. */
export type ExtensionMessages = Partial<Record<Language, Record<string, string>>>;

export interface ExtensionPage {
  /** Absolute route, e.g. `/x/my-ext`. Must be unique across extensions. */
  path: string;
  /** Message key (extension namespace) or literal text. */
  title: string;
  description: string;
  /** Built-in icon name (see the host icon set) or `generic`. */
  icon: string;
  component: ComponentType;
  /** Where the page can be reached from besides its URL: the Settings page and the palette. */
  listIn: ('more' | 'palette')[];
}

export interface ExtensionActivitySection {
  id: string;
  /** Lower first; core sections use multiples of 100. */
  order: number;
  component: ComponentType;
}

export interface ClientExtension {
  id: string;
  apiVersion: typeof CLIENT_EXTENSION_API_VERSION;
  pages?: ExtensionPage[];
  activitySections?: ExtensionActivitySection[];
  messages?: ExtensionMessages;
}

export interface OrbisGlobal {
  apiVersion: typeof CLIENT_EXTENSION_API_VERSION;
  react: unknown;
  jsxRuntime: unknown;
  sdk: unknown;
  registerExtension(extension: ClientExtension): void;
}

declare global {
  interface Window {
    __ORBIS__?: OrbisGlobal;
    /**
     * @deprecated Legacy name of `__ORBIS__` (the product was called Belvedere before 0.1.0): the
     * same object, kept so extension bundles built under that name keep running unchanged.
     */
    __BELVEDERE__?: OrbisGlobal;
  }
}
