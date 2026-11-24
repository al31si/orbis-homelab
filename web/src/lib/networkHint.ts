/** Suggest a network check from the page's hostname, without probing the device or server. */
export function networkHint(hostname: string): 'tailscale' | 'generic' {
  if (hostname.toLowerCase().endsWith('.ts.net')) return 'tailscale';

  const octets = hostname.split('.');
  if (
    octets.length === 4 &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255) &&
    Number(octets[0]) === 100 &&
    Number(octets[1]) >= 64 &&
    Number(octets[1]) <= 127
  ) {
    return 'tailscale';
  }

  return 'generic';
}
