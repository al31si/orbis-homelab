import * as react from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { CLIENT_EXTENSION_API_VERSION, type OrbisGlobal } from '../../../sdk/client-types';
import * as sdk from '../../../sdk/client';
import { registerClientExtension } from './registry';

/**
 * Publishes what extension bundles are built against (see `sdk/client-types.ts`). Must run before
 * any extension script is injected: the generated shims read these globals at module evaluation.
 */
export function exposeHostGlobals(target: Window = window): void {
  const host: OrbisGlobal = {
    apiVersion: CLIENT_EXTENSION_API_VERSION,
    react,
    jsxRuntime,
    sdk,
    registerExtension: registerClientExtension,
  };
  target.__ORBIS__ = host;
  // The product used to be called Belvedere and extension bundles built under that name read
  // `window.__BELVEDERE__`. The same object keeps them working without a rebuild.
  target.__BELVEDERE__ = host;
}
