import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRAND_LIST, normalizeBrandKey, resolveBrand } from './registry';

const id = (query: Parameters<typeof resolveBrand>[0]) => resolveBrand(query)?.id ?? null;

describe('resolveBrand', () => {
  it('recognises a product by id, display name or integration type', () => {
    expect(id({ id: 'radarr' })).toBe('radarr');
    expect(id({ name: 'Home Assistant' })).toBe('home-assistant');
    expect(id({ name: 'qBittorrent' })).toBe('qbittorrent');
    expect(id({ integration: 'jellyfin' })).toBe('jellyfin');
    expect(id({ id: 'pihole', name: 'Pi-hole' })).toBe('pi-hole');
  });

  it('lets an explicit icon key win over everything else', () => {
    expect(id({ icon: 'sonarr', id: 'media-server', name: 'Media server' })).toBe('sonarr');
    expect(id({ icon: 'sonarr', name: 'Radarr' })).toBe('sonarr');
  });

  it('ignores the default icon and keys it does not know, and falls back to the name', () => {
    expect(id({ icon: 'generic', name: 'Jellyfin' })).toBe('jellyfin');
    expect(id({ icon: 'my-custom-icon.svg', name: 'Plex' })).toBe('plex');
    expect(id({ icon: 'generic' })).toBeNull();
  });

  it('never matches by substring or similarity', () => {
    expect(id({ name: 'Radarr 4K' })).toBeNull();
    expect(id({ name: 'My Jellyfin server' })).toBeNull();
    expect(id({ name: 'Plexiglass' })).toBeNull();
    expect(id({ id: 'sonar' })).toBeNull();
    expect(id({ name: 'Homepage' })).toBeNull();
    expect(id({ id: 'lidseeker', name: 'Lidseeker' })).toBeNull();
  });

  it('guesses nothing when the clues name different products', () => {
    expect(id({ id: 'radarr', name: 'Sonarr' })).toBeNull();
    expect(id({ integration: 'radarr', name: 'Jellyfin' })).toBeNull();
    expect(id({ id: 'radarr', name: 'Radarr', integration: 'radarr' })).toBe('radarr');
  });

  it('treats case and punctuation as the same spelling', () => {
    expect(normalizeBrandKey('Nginx Proxy-Manager')).toBe('nginxproxymanager');
    expect(id({ name: 'NGINX PROXY MANAGER' })).toBe('nginx-proxy-manager');
    expect(id({ name: 'uptime_kuma' })).toBe('uptime-kuma');
  });
});

describe('the brand registry and the logo files', () => {
  const files = readdirSync(new URL('./logos', import.meta.url))
    .filter((name) => name.endsWith('.svg'))
    .map((name) => name.slice(0, -'.svg'.length))
    .sort();

  it('has a logo file for every brand and no logo without a brand', () => {
    expect(BRAND_LIST.map((brand) => brand.id).sort()).toEqual(files);
  });

  it('gives every brand a distinct spelling, so no key leads to two products', () => {
    const keys = BRAND_LIST.map((brand) => normalizeBrandKey(brand.name));
    expect(new Set(keys).size).toBe(keys.length);
    for (const brand of BRAND_LIST) expect(resolveBrand({ name: brand.name })?.id).toBe(brand.id);
  });
});
