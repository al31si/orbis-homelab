import { createContext, useContext } from 'react';

export interface ShellApi {
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
