/** Internal routes are absolute paths (`/services/jellyfin`); everything else is external. */
export function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * Service launch URLs contain `{host}`, replaced by the hostname the app was opened on so links
 * work over LAN, VPN addresses or MagicDNS names. Returns null for services without a UI.
 */
export function resolveServiceUrl(url: string | null): string | null {
  return url === null ? null : url.replaceAll('{host}', window.location.hostname);
}
