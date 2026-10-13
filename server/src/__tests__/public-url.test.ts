import { describe, expect, it } from 'vitest';
import { secureAddress } from '../config/public-url.js';

describe('secureAddress', () => {
  it('offers an https address as it is written', () => {
    expect(secureAddress('https://orbis.example.com')).toBe('https://orbis.example.com');
    expect(secureAddress('https://nas.example.ts.net:8443/orbis')).toBe(
      'https://nas.example.ts.net:8443/orbis',
    );
  });

  it('has nothing to offer when publicUrl is not set (HTTPS or not, nothing is required)', () => {
    expect(secureAddress(undefined)).toBeNull();
  });

  it('never offers an http address: it would lead to the same insecure context', () => {
    expect(secureAddress('http://192.168.1.50:3100')).toBeNull();
    expect(secureAddress('HTTP://media-server.lan')).toBeNull();
  });

  it('ignores what is not a URL', () => {
    expect(secureAddress('orbis.example.com')).toBeNull();
    expect(secureAddress('')).toBeNull();
  });
});
