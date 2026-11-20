import { createContext, useContext, type RefObject } from 'react';

export interface ShellApi {
  /**
   * The element that scrolls the page content. The document itself never scrolls (see
   * `styles/base.css`), so scroll position, pull-to-refresh and anchors go through this element.
   */
  scroller: RefObject<HTMLDivElement | null>;
  /** Opens the command palette (search field, `/` and Cmd/Ctrl+K do the same). */
  openPalette: () => void;
  /** Called by `PageHeader`: the large title text once it scrolled away, null while visible. */
  setCollapsedTitle: (title: string | null) => void;
}

export const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error('useShell must be used inside <AppShell>');
  return shell;
}
