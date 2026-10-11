/** Namespaced by the instance id so two installations on one origin never share recents. */
const storageKey = (appId: string): string => `${appId}.palette.recent.v1`;

/** Ids of the palette entries picked lately, newest first (empty when storage is unavailable). */
export function loadRecents(appId: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(appId)) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveRecents(appId: string, ids: readonly string[]): void {
  try {
    localStorage.setItem(storageKey(appId), JSON.stringify(ids));
  } catch {
    /* storage full or unavailable: recents just do not persist */
  }
}
