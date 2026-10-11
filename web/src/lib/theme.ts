import { getPrefs, subscribePrefs, type ThemePref } from './prefs';

/** Must match --bg in styles/tokens.css and the <meta name="theme-color"> tags in index.html. */
const THEME_COLORS = { dark: '#070e1b', light: '#f2f5fa' } as const;

function applyTheme(theme: ThemePref): void {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;

  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme = theme === 'auto' ? (meta.media.includes('dark') ? 'dark' : 'light') : theme;
    meta.content = THEME_COLORS[scheme];
  }
}

/** Applies the stored theme now and whenever the preference changes. */
export function initTheme(): void {
  applyTheme(getPrefs().theme);
  let applied = getPrefs().theme;
  subscribePrefs(() => {
    const { theme } = getPrefs();
    if (theme !== applied) {
      applied = theme;
      applyTheme(theme);
    }
  });
}
