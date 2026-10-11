import { useSyncExternalStore } from 'react';
import type { AppInfo } from '@shared/api';

/** `auto` follows the system colour scheme (the instance setting `system`). */
export type ThemePref = 'auto' | 'light' | 'dark';

export interface Prefs {
  theme: ThemePref;
  /** Service ids shown in the Home launcher row, in order. */
  favorites: string[];
  /** Show catalog services that have no web UI (they are listed but cannot be opened). */
  showServicesWithoutUi: boolean;
}

/** Instance values a device falls back to until its user chooses something else. */
export type PrefsSource = Pick<AppInfo, 'id' | 'theme' | 'defaultFavorites'>;

export interface PrefsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Same rule as `public/theme-init.js`. */
export function prefsKey(appId: string): string {
  return `${appId}.prefs.v1`;
}

export function defaultPrefs(source: Pick<PrefsSource, 'theme' | 'defaultFavorites'>): Prefs {
  return {
    theme: source.theme === 'system' ? 'auto' : source.theme,
    favorites: [...source.defaultFavorites],
    showServicesWithoutUi: true,
  };
}

const THEMES: readonly ThemePref[] = ['auto', 'light', 'dark'];

/** Tolerates anything a previous version (or a user) may have stored. */
export function sanitizePrefs(raw: unknown, defaults: Prefs): Prefs {
  const input = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const stored = input.theme === 'system' ? 'auto' : input.theme;
  const theme = THEMES.find((value) => value === stored) ?? defaults.theme;
  const favorites = Array.isArray(input.favorites)
    ? [...new Set(input.favorites.filter((id): id is string => typeof id === 'string'))]
    : defaults.favorites;
  const showServicesWithoutUi =
    typeof input.showServicesWithoutUi === 'boolean'
      ? input.showServicesWithoutUi
      : defaults.showServicesWithoutUi;
  return { theme, favorites, showServicesWithoutUi };
}

function browserStorage(): PrefsStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** One device's preferences: persisted under `<app.id>.prefs.v1`, observable. */
export class PrefsStore {
  private current: Prefs;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly key: string,
    private readonly defaults: Prefs,
    private readonly storage: PrefsStorage | null,
  ) {
    this.current = this.read();
  }

  get = (): Prefs => this.current;

  set(patch: Partial<Prefs>): void {
    this.current = sanitizePrefs({ ...this.current, ...patch }, this.defaults);
    try {
      this.storage?.setItem(this.key, JSON.stringify(this.current));
    } catch {
      /* storage full or unavailable: the preference still applies for this session */
    }
    this.emit();
  }

  /** Re-reads storage (another window changed it). */
  reload(): void {
    this.current = this.read();
    this.emit();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private read(): Prefs {
    try {
      const raw = this.storage?.getItem(this.key);
      return sanitizePrefs(raw ? JSON.parse(raw) : null, this.defaults);
    } catch {
      return sanitizePrefs(null, this.defaults);
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

const FALLBACK_SOURCE: PrefsSource = { id: 'orbis-homelab', theme: 'system', defaultFavorites: [] };

let store = new PrefsStore(prefsKey(FALLBACK_SOURCE.id), defaultPrefs(FALLBACK_SOURCE), null);
let stopSync: (() => void) | undefined;

/**
 * Binds preferences to the instance. Call once at startup, before React renders: the storage key
 * and the first-launch defaults (theme, favourites) come from the boot config.
 */
export function initPrefs(source: PrefsSource, storage: PrefsStorage | null = browserStorage()) {
  stopSync?.();
  const key = prefsKey(source.id);
  store = new PrefsStore(key, defaultPrefs(source), storage);
  // Keep several open windows (browser tab + installed app) in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) store.reload();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
    stopSync = () => window.removeEventListener('storage', onStorage);
  }
}

export const getPrefs = (): Prefs => store.get();
export const setPrefs = (patch: Partial<Prefs>): void => store.set(patch);
export const subscribePrefs = (listener: () => void): (() => void) => store.subscribe(listener);

export function toggleFavorite(serviceId: string): void {
  const { favorites } = store.get();
  store.set({
    favorites: favorites.includes(serviceId)
      ? favorites.filter((id) => id !== serviceId)
      : [...favorites, serviceId],
  });
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribePrefs, getPrefs);
}
