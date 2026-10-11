import fs from 'node:fs';
import path from 'node:path';
import { safeRelativePath } from './safe-path.js';

export interface BrandingFile {
  /** Directory the file was found in (to give to `reply.sendFile`). */
  root: string;
  /** Path relative to `root`. */
  rel: string;
}

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

/**
 * Branding resolution: `<CONFIG_DIR>/branding/<path>` first, then the neutral built-in asset at
 * `<WEB_DIR>/<path>`. Used for `icons/*` and `splash/*`.
 */
export function resolveBranding(
  dirs: { brandingDir: string; webDir: string },
  rel: string,
): BrandingFile | null {
  const safe = safeRelativePath(rel);
  if (!safe) return null;
  for (const root of [dirs.brandingDir, dirs.webDir]) {
    if (isFile(path.join(root, safe))) return { root, rel: safe };
  }
  return null;
}

/** Custom service icons: only `<CONFIG_DIR>/branding/icons/<file>`, never the web bundle. */
export function resolveServiceIcon(brandingDir: string, rel: string): BrandingFile | null {
  const safe = safeRelativePath(rel);
  if (!safe) return null;
  const root = path.join(brandingDir, 'icons');
  return isFile(path.join(root, safe)) ? { root, rel: safe } : null;
}
