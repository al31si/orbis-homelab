import type { AppInfo, FeatureFlags } from '../../../shared/api.js';
import type { T } from '../i18n/index.js';

/** Dark surface color of the built-in theme: splash background and browser chrome. */
export const THEME_COLOR = '#070e1b';

interface Icon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface WebManifest {
  id: string;
  name: string;
  short_name: string;
  description: string;
  lang: string;
  dir: 'ltr';
  start_url: string;
  scope: string;
  display: 'standalone';
  display_override: string[];
  orientation: 'any';
  theme_color: string;
  background_color: string;
  categories: string[];
  icons: Icon[];
  shortcuts: { name: string; url: string; icons: Icon[] }[];
}

const ICON_192: Icon = { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' };

/**
 * `/manifest.webmanifest`. The icon URLs are the stable `/icons/*` ones: the server resolves them
 * branding-first, so the manifest does not depend on which files an instance provides.
 */
export function renderManifest(
  app: AppInfo,
  features: Pick<FeatureFlags, 'system' | 'storage'>,
  t: T,
): WebManifest {
  const shortcut = (name: string, route: string) => ({
    name,
    url: `${route}?source=shortcut`,
    icons: [ICON_192],
  });
  return {
    id: '/',
    name: app.name,
    short_name: app.shortName,
    description: app.description,
    lang: app.language,
    dir: 'ltr',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    theme_color: THEME_COLOR,
    background_color: THEME_COLOR,
    categories: ['utilities'],
    icons: [
      { ...ICON_192, purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      shortcut(t('http.shortcut.services'), '/services'),
      ...(features.system ? [shortcut(t('http.shortcut.system'), '/system')] : []),
      ...(features.storage ? [shortcut(t('http.shortcut.storage'), '/storage')] : []),
    ],
  };
}
