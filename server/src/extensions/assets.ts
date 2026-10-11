import { safeRelativePath } from '../pwa/safe-path.js';

/**
 * The only files of an extension directory that are public: `client.js`, `client.css` and
 * anything under `assets/`. Never `server.mjs`, `manifest.json` or dotfiles. Returns the
 * normalised relative path or null.
 */
export function servableAssetPath(rel: string): string | null {
  const safe = safeRelativePath(rel);
  if (!safe) return null;
  return safe === 'client.js' || safe === 'client.css' || safe.startsWith('assets/') ? safe : null;
}
