import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
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
 * the command palette (header search, Cmd/Ctrl+K, `/`). The frame is as tall as the visible area
 * and the content scrolls inside it; the navigation is a grid cell, never a fixed bar.
 */
export function AppShell({ children }: AppShellProps) {
  const [collapsedTitle, setCollapsedTitle] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const refreshAll = useRefreshAll();
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const shell = useMemo<ShellApi>(
    () => ({ scroller, openPalette, setCollapsedTitle }),
    [openPalette],
  );
  usePaletteHotkeys(paletteOpen, setPaletteOpen);

  return (
    <ShellContext value={shell}>
      <a className={styles.skip} href="#main">
        {t('shell.skip')}
      </a>
      <div className={styles.frame}>
        <Nav />
        <div ref={scroller} className={styles.scroller}>
          <div className={styles.content}>
            <AppHeader collapsedTitle={collapsedTitle} />
            <PullToRefresh onRefresh={refreshAll}>
              <main id="main" className={styles.main} tabIndex={-1}>
                {children}
              </main>
            </PullToRefresh>
          </div>
        </div>
      </div>
      <ScrollRestoration />
      <UpdatePrompt />
      {paletteOpen && <CommandPalette onClose={closePalette} />}
    </ShellContext>
  );
}
