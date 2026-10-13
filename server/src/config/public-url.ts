/**
 * The address Settings > Installation offers to people who opened the app over plain HTTP.
 *
 * `publicUrl` is optional and only that: nothing breaks without it, and it is never needed when
 * the page is already served over HTTPS (the manifest, the service worker and the install dialog
 * all work from whatever origin the browser used). Only an `https:` URL qualifies, because the
 * whole point of the address is to reach a secure context: an `http:` one would send people to the
 * same place they already are. Older configurations that hold an `http:` URL keep loading.
 */
export function secureAddress(publicUrl: string | undefined): string | null {
  if (publicUrl === undefined) return null;
  try {
    return new URL(publicUrl).protocol === 'https:' ? publicUrl : null;
  } catch {
    return null;
  }
}
