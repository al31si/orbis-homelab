import { describe, expect, it } from 'vitest';
import { networkHint } from './networkHint';

describe('networkHint', () => {
  it.each(['server.tailnet.ts.net', 'SERVER.TAILNET.TS.NET', 'server.Ts.NeT'])(
    'recognizes the Tailscale hostname %s regardless of case',
    (hostname) => {
      expect(networkHint(hostname)).toBe('tailscale');
    },
  );

  it.each(['100.64.0.0', '100.64.0.1', '100.100.100.100', '100.127.255.255'])(
    'recognizes %s within the Tailscale IPv4 range',
    (hostname) => {
      expect(networkHint(hostname)).toBe('tailscale');
    },
  );

  it.each([
    '100.63.255.255',
    '100.128.0.0',
    '99.100.100.100',
    '101.100.100.100',
    '192.168.1.10',
    '127.0.0.1',
    'localhost',
    'orbis.home',
    'example.com',
    'ts.net',
    'not-ts.net',
    'server.ts.net.example.com',
    '[fd7a:115c:a1e0::1]',
    '',
  ])('uses the generic hint for %s', (hostname) => {
    expect(networkHint(hostname)).toBe('generic');
  });

  it.each([
    '100.64.256.1',
    '100.64.1.256',
    '100.64.-1.1',
    '100.64.1',
    '100.64.1.1.1',
    '100.64.x.1',
  ])('does not mistake the malformed address %s for a Tailscale IPv4', (hostname) => {
    expect(networkHint(hostname)).toBe('generic');
  });
});
