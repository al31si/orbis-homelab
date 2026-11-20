import { BRAND_LIST } from './registry';

const modules = import.meta.glob<string>('./logos/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Hashed URL of each bundled logo, keyed by brand id. */
const urls = new Map(
  Object.entries(modules).map(([path, url]) => [
    path.slice('./logos/'.length, -'.svg'.length),
    url,
  ]),
);

/** URL of the logo of a brand from the registry (they are checked against each other in tests). */
export function brandLogoUrl(id: string): string | null {
  return BRAND_LIST.some((brand) => brand.id === id) ? (urls.get(id) ?? null) : null;
}
