import data from './brands.json';

export interface Brand {
  /** File name of the logo (`logos/<id>.svg`) and the canonical key (`icon: radarr`). */
  id: string;
  /** The product's own spelling. */
  name: string;
}

/** What is known about a service when its logo is looked up. */
export interface BrandQuery {
  /** The `icon` key of the service. Anything but the default `generic` is the owner's choice. */
  icon?: string;
  /** Service id from `services.yaml`. */
  id?: string;
  /** Display name of the service. */
  name?: string;
  /** Integration type (`radarr`, `jellyfin`...), when the service has one. */
  integration?: string;
}

interface BrandEntry extends Brand {
  aliases?: string[];
}

const brands: readonly BrandEntry[] = data.brands;

/** "Pi-hole" -> "pihole": the only fuzziness allowed is case and punctuation. */
export function normalizeBrandKey(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

const byKey = new Map<string, Brand>();
for (const brand of brands) {
  for (const key of [brand.id, brand.name, ...(brand.aliases ?? [])]) {
    byKey.set(normalizeBrandKey(key), { id: brand.id, name: brand.name });
  }
}

/** Every brand the app ships a logo for, in registry order. */
export const BRAND_LIST: readonly Brand[] = brands.map(({ id, name }) => ({ id, name }));

function lookup(text: string | undefined): Brand | null {
  return text ? (byKey.get(normalizeBrandKey(text)) ?? null) : null;
}

/**
 * The logo of a service, or null. A logo is only used when it is certain:
 *  - an explicit `icon` key wins (the owner asked for it);
 *  - otherwise the id, the display name and the integration type are compared with the known
 *    names and spellings, exactly (case and punctuation aside, never by substring);
 *  - if two of them name different products, nothing is guessed.
 */
export function resolveBrand(query: BrandQuery): Brand | null {
  if (query.icon && query.icon !== 'generic') {
    const explicit = lookup(query.icon);
    if (explicit) return explicit;
  }
  const hits = [query.integration, query.id, query.name]
    .map(lookup)
    .filter((brand): brand is Brand => brand !== null);
  const first = hits[0];
  return first && hits.every((hit) => hit.id === first.id) ? first : null;
}
