import type { IncomingMessage } from 'node:http';
import { isIP } from 'node:net';
import type { Config } from './config/schema.js';
import type { Access } from './core/types.js';

/** Header names of Tailscale Serve (`access.identityProxy.preset: tailscale`). */
const TAILSCALE_HEADERS = { user: 'Tailscale-User-Login', name: 'Tailscale-User-Name' } as const;

/** Source address range of a trusted proxy: `bytes` of an IPv4 (4) or IPv6 (16) network. */
interface Cidr {
  bytes: Uint8Array;
  prefix: number;
}

export type AccessPolicy =
  | { mode: 'limited' }
  | { mode: 'trusted-network' }
  | {
      mode: 'identity-proxy';
      /** Listener reserved for the proxy; null = identity is honoured on every listener. */
      trustedPort: number | null;
      trustedProxies: Cidr[];
      /** Lower-cased header names. */
      userHeader: string;
      nameHeader: string | null;
      /** Lower-cased identities. */
      allowedUsers: Set<string>;
    };

const LIMITED: Access = { level: 'limited', user: null };

/** Compiles `config.access` once so every request only does cheap comparisons. */
export function createAccessPolicy(access: Config['access']): AccessPolicy {
  if (access.mode !== 'identity-proxy') return { mode: access.mode };
  const proxy = access.identityProxy;
  const userHeader = proxy.userHeader ?? (proxy.preset ? TAILSCALE_HEADERS.user : undefined);
  const nameHeader = proxy.nameHeader ?? (proxy.preset ? TAILSCALE_HEADERS.name : undefined);
  if (!userHeader) throw new Error('access.identityProxy needs a preset or userHeader');
  return {
    mode: 'identity-proxy',
    trustedPort: proxy.trustedPort ?? null,
    trustedProxies: proxy.trustedProxies.map(parseCidr),
    userHeader: userHeader.toLowerCase(),
    nameHeader: nameHeader?.toLowerCase() ?? null,
    allowedUsers: new Set(proxy.allowedUsers.map((u) => u.toLowerCase())),
  };
}

/**
 * Who is calling. `full` requires, depending on the mode:
 *  - `trusted-network`: nothing (use only on a network you control);
 *  - `identity-proxy`: ALL of
 *      1. the request arrived on the trusted listener (when `trustedPort` is set),
 *      2. from an address configured as the proxy (so other containers on shared Docker networks
 *         cannot forge identity headers),
 *      3. carrying the identity header with an allowed user.
 * Everything else is `limited`: a failed check is never an error.
 */
export function resolveAccess(req: IncomingMessage, policy: AccessPolicy): Access {
  if (policy.mode === 'limited') return LIMITED;
  if (policy.mode === 'trusted-network') return { level: 'full', user: null };

  if (policy.trustedPort !== null && req.socket.localPort !== policy.trustedPort) return LIMITED;
  const source = parseAddress(req.socket.remoteAddress);
  if (!source || !policy.trustedProxies.some((cidr) => contains(cidr, source))) return LIMITED;

  const login = header(req, policy.userHeader);
  if (!login || !policy.allowedUsers.has(login.toLowerCase())) return LIMITED;
  const name = policy.nameHeader ? header(req, policy.nameHeader) : undefined;
  return { level: 'full', user: { login, name: name ?? null } };
}

function header(req: IncomingMessage, name: string): string | undefined {
  const v = req.headers[name];
  const value = Array.isArray(v) ? v[0] : v;
  if (!value || value.trim() === '') return undefined;
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim();
  }
}

/** State-changing requests must be same-origin JSON: blocks cross-site form posts. */
export function isSameOriginJson(req: IncomingMessage): boolean {
  if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ addresses */

/**
 * Parses an IPv4/IPv6 address to its bytes. IPv4-mapped IPv6 (`::ffff:a.b.c.d`, whatever the
 * notation) is normalised to the 4-byte IPv4 form so one rule matches both families of socket.
 */
function parseAddress(addr: string | undefined): Uint8Array | null {
  if (!addr) return null;
  const unzoned = addr.split('%')[0] ?? '';
  const version = isIP(unzoned);
  if (version === 4) return Uint8Array.from(unzoned.split('.').map(Number));
  if (version !== 6) return null;
  const bytes = parseV6(unzoned);
  return bytes && isMapped(bytes) ? bytes.slice(12) : bytes;
}

function parseV6(addr: string): Uint8Array | null {
  let text = addr;
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    // Embedded IPv4 (`::ffff:10.0.0.1`) becomes two hex groups.
    const [a = 0, b = 0, c = 0, d = 0] = tail.split('.').map(Number);
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const groups = (part: string): string[] => (part === '' ? [] : part.split(':'));
  const head = groups(halves[0] ?? '');
  const rest = groups(halves[1] ?? '');
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const all = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  const bytes = new Uint8Array(16);
  for (const [i, group] of all.entries()) {
    const value = Number.parseInt(group, 16);
    if (Number.isNaN(value)) return null;
    bytes[i * 2] = value >> 8;
    bytes[i * 2 + 1] = value & 0xff;
  }
  return bytes;
}

function isMapped(bytes: Uint8Array): boolean {
  return (
    bytes.length === 16 &&
    bytes.subarray(0, 10).every((b) => b === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff
  );
}

/** `10.0.0.1`, `10.0.0.0/8`, `fd00::/8`. The schema already validated the syntax. */
function parseCidr(value: string): Cidr {
  const [addr = '', prefixText] = value.split('/');
  const bytes = parseAddress(addr);
  if (!bytes) throw new Error(`invalid trusted proxy: ${value}`);
  const written = isIP(addr) === 6 ? 128 : 32;
  const prefix = prefixText === undefined ? written : Number(prefixText);
  // A mapped IPv6 network is an IPv4 network: drop the 96 mapped bits from the prefix.
  return {
    bytes,
    prefix: written === 128 && bytes.length === 4 ? Math.max(prefix - 96, 0) : prefix,
  };
}

function contains(cidr: Cidr, addr: Uint8Array): boolean {
  if (cidr.bytes.length !== addr.length) return false;
  const whole = cidr.prefix >> 3;
  for (let i = 0; i < whole; i += 1) if (cidr.bytes[i] !== addr[i]) return false;
  const rest = cidr.prefix & 7;
  if (rest === 0) return true;
  const mask = (0xff << (8 - rest)) & 0xff;
  return ((cidr.bytes[whole] ?? 0) & mask) === ((addr[whole] ?? 0) & mask);
}
