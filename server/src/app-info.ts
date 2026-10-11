import type { AppInfo, CategoryInfo } from '../../shared/api.js';
import type { Config, ServiceDef } from './config/schema.js';
import type { T } from './i18n/index.js';
import { iconUrl } from './lib/icons.js';

/** `media-server` -> `Media server`: label of a category used by services but never declared. */
const humanize = (id: string): string => {
  const words = id.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Presentation data of the instance. Declared categories come first, in their configured order;
 * categories only used by services follow, in order of first use.
 */
export function buildAppInfo(config: Config, services: readonly ServiceDef[], t: T): AppInfo {
  const { app } = config;
  const categories: CategoryInfo[] = [...app.categories];
  for (const service of services) {
    if (service.category && !categories.some((c) => c.id === service.category)) {
      categories.push({ id: service.category, label: humanize(service.category) });
    }
  }
  return {
    id: app.id,
    name: app.name,
    shortName: app.shortName ?? app.name,
    description: app.description ?? t('services.appDescription'),
    language: app.language,
    theme: app.theme,
    accent: app.accent ?? null,
    categories,
    defaultFavorites: app.defaultFavorites,
    links: config.links.map((link) => ({ ...link, iconUrl: iconUrl(link.icon) })),
  };
}
