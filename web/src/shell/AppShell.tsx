import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useRefreshAll } from '@/data';
import { t } from '@/i18n';
import { PullToRefresh } from '@/ui/PullToRefresh';
import { AppHeader } from './AppHeader';
import { CommandPalette } from './CommandPalette';
import { Nav } from './Nav';
import { ScrollRestoration } from './ScrollRestoration';
import { ShellContext, type ShellApi } from './ShellContext';
import { UpdatePrompt } from './UpdatePrompt';
import { usePaletteHotkeys } from './usePaletteHotkeys';
import styles from './AppShell.module.css';

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Adaptive frame: header, navigation (tab bar / rail / sidebar), pull-to-refresh, content, and
 * the command palette (header search, Cmd/Ctrl+K, `/`).
 */
export function AppShell({ children }: AppShellProps) {
  const [collapsedTitle, setCollapsedTitle] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const refreshAll = useRefreshAll();
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const shell = useMemo<ShellApi>(() => ({ openPalette, setCollapsedTitle }), [openPalette]);
  usePaletteHotkeys(paletteOpen, setPaletteOpen);

  return (
    <ShellContext value={shell}>
      <a className={styles.skip} href="#main">
        {t('shell.skip')}
      </a>
      <Nav />
      <div className={styles.content}>
        <AppHeader collapsedTitle={collapsedTitle} />
        <PullToRefresh onRefresh={refreshAll}>
          <main id="main" className={styles.main} tabIndex={-1}>
            {children}
          </main>
        </PullToRefresh>
      </div>
      <ScrollRestoration />
      <UpdatePrompt />
      {paletteOpen && <CommandPalette onClose={closePalette} />}
    </ShellContext>
  );
}
