/** A custom icon is a bare file name with an image extension (`my-app.svg`), never a path. */
const ICON_FILE = /^[\w.-]+\.(svg|png|webp|jpg)$/i;

/** URL under which the BFF serves `<CONFIG_DIR>/branding/icons/<file>`; null for built-in mark keys. */
export function iconUrl(icon: string): string | null {
  return ICON_FILE.test(icon) && !icon.includes('..') ? `/branding/icons/${icon}` : null;
}
