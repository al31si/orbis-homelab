import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createAccessPolicy, isSameOriginJson, resolveAccess } from '../access.js';
import type { Config } from '../config/schema.js';
import { makeConfig } from './helpers/fixtures.js';

const identityProxy = (overrides: Record<string, unknown> = {}): Config['access'] =>
  makeConfig({
    access: {
      mode: 'identity-proxy',
      identityProxy: {
        trustedProxies: ['10.0.0.1'],
        trustedPort: 3101,
        userHeader: 'X-Forwarded-User',
        nameHeader: 'X-Forwarded-Name',
        allowedUsers: ['me@example.com'],
        ...overrides,
      },
    },
  }).access;

const req = (o: {
  port?: number;
  addr?: string;
  headers?: Record<string, string>;
}): IncomingMessage =>
  ({
    socket: { localPort: o.port ?? 3101, remoteAddress: o.addr ?? '::ffff:10.0.0.1' },
    headers: o.headers ?? {},
  }) as unknown as IncomingMessage;

const asMe = { 'x-forwarded-user': 'me@example.com' };
const levelOf = (r: IncomingMessage, access: Config['access']) =>
  resolveAccess(r, createAccessPolicy(access)).level;

describe('access modes', () => {
  it('limited: everybody is limited, whatever they send', () => {
    const access = makeConfig({ access: { mode: 'limited' } }).access;
    expect(levelOf(req({ headers: asMe }), access)).toBe('limited');
  });

  it('defaults to limited when `access` is omitted', () => {
    expect(levelOf(req({}), makeConfig().access)).toBe('limited');
  });

  it('trusted-network: everybody is full and anonymous', () => {
    const policy = createAccessPolicy(makeConfig({ access: { mode: 'trusted-network' } }).access);
    expect(resolveAccess(req({ addr: '203.0.113.9', port: 1 }), policy)).toEqual({
      level: 'full',
      user: null,
    });
  });
});

describe('identity-proxy', () => {
  const access = identityProxy();

  it('grants full access only via the trusted port, proxy address and allowed user', () => {
    const policy = createAccessPolicy(access);
    expect(resolveAccess(req({ headers: { ...asMe, 'x-forwarded-name': 'Me' } }), policy)).toEqual({
      level: 'full',
      user: { login: 'me@example.com', name: 'Me' },
    });
  });

  it('matches the identity case-insensitively and keeps the name optional', () => {
    const policy = createAccessPolicy(access);
    const got = resolveAccess(req({ headers: { 'x-forwarded-user': 'ME@Example.com' } }), policy);
    expect(got).toEqual({ level: 'full', user: { login: 'ME@Example.com', name: null } });
  });

  it('decodes percent-encoded header values', () => {
    const policy = createAccessPolicy(identityProxy({ allowedUsers: ['jörg@example.com'] }));
    const r = req({ headers: { 'x-forwarded-user': 'j%C3%B6rg%40example.com' } });
    expect(resolveAccess(r, policy).level).toBe('full');
  });

  it('ignores a forged identity header on the public listener', () => {
    expect(levelOf(req({ port: 3100, headers: asMe }), access)).toBe('limited');
  });

  it('ignores the header from another container on the trusted port', () => {
    expect(levelOf(req({ addr: '172.22.0.5', headers: asMe }), access)).toBe('limited');
  });

  it('rejects unlisted users and an absent or blank header', () => {
    expect(levelOf(req({ headers: { 'x-forwarded-user': 'other@example.com' } }), access)).toBe(
      'limited',
    );
    expect(levelOf(req({}), access)).toBe('limited');
    expect(levelOf(req({ headers: { 'x-forwarded-user': '  ' } }), access)).toBe('limited');
  });

  it('ignores headers of another name (other proxies, other presets)', () => {
    const headers = { 'tailscale-user-login': 'me@example.com', 'remote-user': 'me@example.com' };
    expect(levelOf(req({ headers }), access)).toBe('limited');
  });

  it('honours identity on every listener when no trustedPort is set', () => {
    const open = identityProxy({ trustedPort: undefined });
    expect(levelOf(req({ port: 3100, headers: asMe }), open)).toBe('full');
    expect(levelOf(req({ port: 3100, addr: '172.22.0.5', headers: asMe }), open)).toBe('limited');
  });

  it('never throws on a missing or malformed source address', () => {
    const policy = createAccessPolicy(access);
    const noAddr = { socket: { localPort: 3101 }, headers: asMe } as unknown as IncomingMessage;
    expect(resolveAccess(noAddr, policy).level).toBe('limited');
    expect(levelOf(req({ addr: 'not-an-ip', headers: asMe }), access)).toBe('limited');
  });

  it('takes the Tailscale header names from the preset', () => {
    const tailscale = identityProxy({
      preset: 'tailscale',
      userHeader: undefined,
      nameHeader: undefined,
    });
    const policy = createAccessPolicy(tailscale);
    const headers = { 'tailscale-user-login': 'me@example.com', 'tailscale-user-name': 'Me' };
    expect(resolveAccess(req({ headers }), policy).user).toEqual({
      login: 'me@example.com',
      name: 'Me',
    });
    expect(resolveAccess(req({ headers: asMe }), policy).level).toBe('limited');
  });
});

describe('trusted proxy addresses', () => {
  const full = (proxies: string[], addr: string) =>
    levelOf(
      req({ addr, headers: asMe }),
      identityProxy({ trustedProxies: proxies, trustedPort: undefined }),
    ) === 'full';

  it('matches exact IPv4 addresses, including the ::ffff: mapped form', () => {
    expect(full(['10.0.0.1'], '10.0.0.1')).toBe(true);
    expect(full(['10.0.0.1'], '::ffff:10.0.0.1')).toBe(true);
    expect(full(['10.0.0.1'], '::ffff:a00:1')).toBe(true);
    expect(full(['10.0.0.1'], '10.0.0.2')).toBe(false);
    expect(full(['10.0.0.1'], '::ffff:10.0.0.2')).toBe(false);
  });

  it('matches IPv4 CIDR ranges at the boundaries', () => {
    expect(full(['172.16.0.0/12'], '172.16.0.0')).toBe(true);
    expect(full(['172.16.0.0/12'], '172.31.255.255')).toBe(true);
    expect(full(['172.16.0.0/12'], '172.32.0.0')).toBe(false);
    expect(full(['172.16.0.0/12'], '172.15.255.255')).toBe(false);
    expect(full(['192.168.1.64/26'], '192.168.1.127')).toBe(true);
    expect(full(['192.168.1.64/26'], '192.168.1.128')).toBe(false);
    expect(full(['203.0.113.7/32'], '203.0.113.7')).toBe(true);
    expect(full(['203.0.113.7/32'], '203.0.113.8')).toBe(false);
  });

  it('a /0 range trusts every address of its family, a mapped source included', () => {
    expect(full(['0.0.0.0/0'], '198.51.100.4')).toBe(true);
    expect(full(['0.0.0.0/0'], '::ffff:198.51.100.4')).toBe(true);
    expect(full(['0.0.0.0/0'], '2001:db8::1')).toBe(false);
  });

  it('matches IPv6 addresses and ranges, in any notation', () => {
    expect(full(['fd00::1'], 'fd00::1')).toBe(true);
    expect(full(['fd00::1'], 'fd00:0:0:0:0:0:0:1')).toBe(true);
    expect(full(['fd00::1'], 'fd00::2')).toBe(false);
    expect(full(['fd00::/8'], 'fdab:1234::5')).toBe(true);
    expect(full(['fd00::/8'], 'fe80::1')).toBe(false);
    expect(full(['2001:db8:1::/48'], '2001:db8:1:ffff::1')).toBe(true);
    expect(full(['2001:db8:1::/48'], '2001:db8:2::1')).toBe(false);
    expect(full(['fe80::/10'], 'fe80::1%eth0')).toBe(true);
  });

  it('never mixes families: an IPv4 rule does not match an IPv6 source and back', () => {
    expect(full(['10.0.0.0/8'], 'fd00::1')).toBe(false);
    expect(full(['fd00::/8'], '10.0.0.1')).toBe(false);
  });

  it('accepts a list and an IPv4-mapped rule', () => {
    expect(full(['192.0.2.1', '10.0.0.0/8'], '10.9.9.9')).toBe(true);
    expect(full(['::ffff:10.0.0.1'], '10.0.0.1')).toBe(true);
    expect(full(['::ffff:10.0.0.1'], '10.0.0.2')).toBe(false);
  });
});

describe('isSameOriginJson', () => {
  const post = (headers: Record<string, string>) => isSameOriginJson(req({ headers }));
  it('requires JSON and a matching Origin when present', () => {
    expect(post({ 'content-type': 'application/json', host: 'a:1' })).toBe(true);
    expect(post({ 'content-type': 'application/json', host: 'a:1', origin: 'https://a:1' })).toBe(
      true,
    );
    expect(
      post({ 'content-type': 'application/json', host: 'a:1', origin: 'https://evil.test' }),
    ).toBe(false);
    expect(post({ 'content-type': 'text/plain', host: 'a:1' })).toBe(false);
  });

  it('rejects an unparsable Origin', () => {
    expect(post({ 'content-type': 'application/json', host: 'a:1', origin: 'null' })).toBe(false);
  });
});
