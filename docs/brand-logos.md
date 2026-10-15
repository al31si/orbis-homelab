# Service logos

Services are shown with the logo of the product when Orbis Homelab is sure which product it is, and with a neutral monogram tile when it is not. Nothing is fetched at run time: the logos are files in the web app (`web/src/ui/brand/logos/`), served by your own instance and available offline.

## What is recognised

A logo is used when, ignoring case and punctuation, one of these equals the name or spelling of a known product (never a substring, never a similarity):

1. the `icon:` key of the service in `services.yaml` (an explicit choice always wins: `icon: sonarr`);
2. otherwise the service `id`, its `name` and the type of its `integration`. If they point at different products, nothing is guessed.

So `name: Jellyfin`, `id: jellyfin` or `integration: { type: jellyfin }` show the Jellyfin logo, while `Radarr 4K` or `My media server` show a monogram. To pick a logo for such a service set its key: `icon: radarr`.

Your own image always takes precedence: put an SVG or PNG in `config/branding/icons/` and use its file name as `icon:` ([Branding](configuration.md#branding)).

Known products (48): AdGuard Home, Audiobookshelf, Bazarr, Caddy, Deluge, Emby, FlareSolverr, Gitea, Glances, Grafana, Home Assistant, Immich, Jellyfin, Jellyseerr, Kavita, Lidarr, Mealie, n8n, Navidrome, Nextcloud, Nginx Proxy Manager, NZBGet, OliveTin, Overseerr, Paperless-ngx, Pi-hole, Plex, Portainer, Prometheus, Prowlarr, Proxmox VE, qBittorrent, Radarr, Readarr, SABnzbd, Seafile, Seerr, Sonarr, Syncthing, Tailscale, Tautulli, Traefik, Transmission, TrueNAS, Unraid, Uptime Kuma, Vaultwarden and Vikunja. The list is `web/src/ui/brand/brands.json`.

## Where the logos come from

The files are copied unchanged from the [dashboard-icons](https://github.com/homarr-labs/dashboard-icons) collection (Apache-2.0), commit `6d31345986eba2067a63eb41c1a5a87d4e8e850a`, folder `svg/`. The product names and logos belong to their owners and are used here only to tell your services apart in your own dashboard; their use does not imply any endorsement of, or by, those projects. The Apache-2.0 licence covers the collection, not the trademarks.

## Adding a product

1. Check the logo exists in the collection (`svg/<name>.svg`) and that the product is certain to be what the name says.
2. Add `{ "id": "<file name without .svg>", "name": "<the product's spelling>" }` to `web/src/ui/brand/brands.json`, with `"aliases": [...]` only for other spellings that name that very product (for example `pihole` for Pi-hole). Avoid short or generic aliases.
3. `node scripts/sync-brand-logos.mjs` downloads the file from the pinned commit.
4. `npm test` checks that every brand has a file and every file a brand, and that no spelling leads to two products.

To move to a newer revision of the collection change `source.commit` in `brands.json`, run the script with `--force` and look at the logos.
