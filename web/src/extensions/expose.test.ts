import { describe, expect, it } from 'vitest';
import { CLIENT_EXTENSION_API_VERSION, type ClientExtension } from '../../../sdk/client-types';
import { exposeHostGlobals } from './expose';
import { getClientExtension } from './registry';

const host = (): Window => ({}) as Window;

describe('exposeHostGlobals', () => {
  it('publishes the extension contract as __ORBIS__', () => {
    const target = host();
    exposeHostGlobals(target);
    expect(target.__ORBIS__).toMatchObject({ apiVersion: CLIENT_EXTENSION_API_VERSION });
    expect(typeof target.__ORBIS__?.registerExtension).toBe('function');
  });

  // Extensions built under the old name register through this global.
  it('publishes the very same object as the legacy __BELVEDERE__', () => {
    const target = host();
    exposeHostGlobals(target);
    expect(target.__BELVEDERE__).toBe(target.__ORBIS__);
  });

  it('registers an extension that only knows the legacy global', () => {
    const target = host();
    exposeHostGlobals(target);
    const legacy: ClientExtension = { id: 'legacy-extension', apiVersion: 1 };
    target.__BELVEDERE__?.registerExtension(legacy);
    expect(getClientExtension('legacy-extension')).toBe(legacy);
  });
});
