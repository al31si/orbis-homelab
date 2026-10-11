import type { BootConfig } from '@shared/api';

/** Name of the meta tag the BFF fills when it renders index.html. */
export const BOOT_META_NAME = 'orbis-boot';

const LANGUAGES = ['it', 'en'];
const THEMES = ['system', 'light', 'dark'];
const FEATURE_FLAGS = ['system', 'containers', 'storage', 'smart', 'activity', 'push'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function hasApp(app: unknown): boolean {
  return (
    isRecord(app) &&
    typeof app.id === 'string' &&
    app.id !== '' &&
    typeof app.name === 'string' &&
    typeof app.shortName === 'string' &&
    typeof app.description === 'string' &&
    LANGUAGES.includes(app.language as string) &&
    THEMES.includes(app.theme as string) &&
    (app.accent === null || typeof app.accent === 'string') &&
    Array.isArray(app.categories) &&
    isStringArray(app.defaultFavorites) &&
    Array.isArray(app.links)
  );
}

function hasFeatures(features: unknown): boolean {
  return isRecord(features) && FEATURE_FLAGS.every((flag) => typeof features[flag] === 'boolean');
}

function hasExtensions(extensions: unknown): boolean {
  return (
    Array.isArray(extensions) &&
    extensions.every(
      (ref) =>
        isRecord(ref) &&
        typeof ref.id === 'string' &&
        typeof ref.script === 'string' &&
        (ref.style === null || typeof ref.style === 'string'),
    )
  );
}

/**
 * Parses the JSON of the boot meta tag (or of a `/api/session` body). Returns null when the value
 * is absent, still the build-time placeholder (dev server) or not a complete `BootConfig`: the
 * caller then asks the server.
 */
export function parseBootConfig(raw: unknown): BootConfig | null {
  let value = raw;
  if (typeof raw === 'string') {
    if (raw === '' || raw.startsWith('%%')) return null;
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(value)) return null;
  if (!hasApp(value.app) || !hasFeatures(value.features) || !hasExtensions(value.extensions)) {
    return null;
  }
  const { app, features, extensions } = value as unknown as BootConfig;
  return { app, features, extensions };
}

/** Minimal slice of `Document` the reader needs (keeps it testable without a DOM). */
export interface BootDocument {
  querySelector(selector: string): { getAttribute(name: string): string | null } | null;
}

/** Reads the boot config embedded in index.html, or null (see `parseBootConfig`). */
export function readBootConfig(doc: BootDocument = document): BootConfig | null {
  const raw = doc.querySelector(`meta[name="${BOOT_META_NAME}"]`)?.getAttribute('content');
  return parseBootConfig(raw);
}
