import { createContext, useContext, type ReactNode } from 'react';
import type { AppInfo, BootConfig, FeatureFlags } from '@shared/api';

export { BOOT_META_NAME, parseBootConfig, readBootConfig } from './parse';
export { loadBootConfig } from './load';

const BootContext = createContext<BootConfig | null>(null);

export function BootProvider({ config, children }: { config: BootConfig; children: ReactNode }) {
  return <BootContext.Provider value={config}>{children}</BootContext.Provider>;
}

export function useBoot(): BootConfig {
  const boot = useContext(BootContext);
  if (!boot) throw new Error('useBoot must be used inside <BootProvider>');
  return boot;
}

/** Branding and presentation of this instance (name, categories, links, language...). */
export function useApp(): AppInfo {
  return useBoot().app;
}

/** Which pages and capabilities exist on this instance. */
export function useFeatures(): FeatureFlags {
  return useBoot().features;
}
