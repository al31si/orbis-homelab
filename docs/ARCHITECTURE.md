# Orbis Homelab — architecture

Orbis Homelab is a self-hosted homelab control center: a PWA backed by a small BFF (backend-for-frontend). One container, no cloud dependency. The browser only talks to the BFF; the BFF holds every credential and talks to your services.

```
core (always)                     providers / integrations / modules (all optional)
─────────────                     ──────────────────────────────────────────────────
service catalog + HTTP probes     system provider   glances  → System, Docker, filesystems
alert engine + health score       storage           volumes, pools, SMART report (JSON)
access model                      usage providers   weekly-quota JSON (url or file)
PWA, branding, i18n (it, en)      integrations      radarr sonarr lidarr prowlarr qbittorrent jellyfin vikunja
Home · Services · Settings        push              Web Push (VAPID)
Diagnostics                       extensions        server + client bundles loaded at runtime
```

Everything on the right is absent unless configured: no collector, no alert, no page, no request, no placeholder environment variable.

## Software vs instance

| Software (this repository)                                        | Instance (yours, outside the repository)                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| code, built-in icons, `*.example.*` files, generic `compose.yaml` | `config/config.yaml`, `config/services.yaml`, `config/branding/`, `.env`, `data/`, `extensions/` |

Updating the software never touches the instance. Container mounts: `/config` (read-only), `/data` (read-write, state), `/extensions` (read-only, optional). Container-level environment (`CONFIG_DIR`, `DATA_DIR`, `WEB_DIR`, `EXTENSIONS_DIR`, `LOG_LEVEL`) only says where things are mounted.

Configuration rule: **non-sensitive → YAML, secrets → environment variable or file secret**, referenced from YAML as `{ env: NAME }` or `{ file: /run/secrets/name }`. The authoritative schema is `server/src/config/schema.ts`; it is strict, so an unknown key stops the container with the field path and the reason.

## Feature detection

`GET /api/session` returns `features`, derived from configuration (`config.yaml` `features.*` can only turn things off, except `activity: true`).

| Feature      | Enabled when                                                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `system`     | `sources.system` is configured                                                                                                                                                      |
| `containers` | the system provider reports containers (Glances does)                                                                                                                               |
| `storage`    | `sources.storage` is present (even `storage: {}`: volumes from the system provider) or a SMART report is configured                                                                 |
| `smart`      | `sources.storage.smart` is configured                                                                                                                                               |
| `activity`   | any integration of type vikunja / qbittorrent / arr / jellyfin is declared in `services.yaml`, any `sources.usage` entry exists, or an enabled extension declares activity sections |
| `push`       | `push.enabled`                                                                                                                                                                      |

Gated endpoints answer 404 when their feature is off. The PWA derives navigation and routes from `features`; with fewer pages the bottom bar simply has fewer tabs.

A declared integration without its secret is "not configured" (explained in the UI), never an error or an alert. A service with neither containers nor a probe is `monitored: false`.

## Providers

A provider hides a data source behind a stable output shape; the frontend never knows which one is used.

- **System provider** (`type: glances`): `SystemInfo` + `ContainerInfo[]` + filesystems. A Docker-based provider can be added later without changing the contract.
- **Storage**: volumes (all real filesystems, or an explicit list), pools (a mount that unions member volumes), optional SMART report (`type: report-json`, a JSON document described in `docs/smart-report.md`).
- **Usage** (`parser: weekly-quota`): a JSON document `{ weekly_remaining_percent, weekly_resets_at, plan?, updated_at? }` from a URL or file; `maxAgeMinutes` flags a stalled writer; a missing `file` is "pending" with the configured `hint`.

## Access model

`access.mode` in `config.yaml`:

| Mode                           | Behaviour                                                                                                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `limited` (default if omitted) | everybody gets `limited`: private fields withheld, push disabled                                                                                                                                                                                                                        |
| `trusted-network`              | everybody gets `full`. Only for a network you control                                                                                                                                                                                                                                   |
| `identity-proxy`               | `full` only if **all** hold: (1) request on the trusted listener (`trustedPort`, when set), (2) source address within `trustedProxies` (IP/CIDR), (3) identity header present and in `allowedUsers`. Otherwise `limited`. The `tailscale` preset fills the Tailscale Serve header names |

Identity headers from any other source are ignored. Mutating requests require JSON and a same-origin `Origin`. Push endpoints additionally require `push.enabled`.

## PWA and branding

The BFF renders what depends on the instance, so the static bundle is identical for everybody:

- `index.html`: title, description, apple title, `<html lang>`, icon / splash links, and `<meta name="orbis-boot">` with the `BootConfig` JSON (first paint knows language, features, accent and extensions without a request). No inline script (strict CSP).
- `/manifest.webmanifest`: name, short name, description, language, icons, shortcuts (from features, translated).
- `/sw.js`: cache prefix `<app.id>-`, offline texts in the instance language. Extension routes (`/api/x/`) are never cached.
- `/icons/*`, `/splash/*`: `config/branding/<same path>` first, built-in neutral assets as fallback. `/branding/icons/<file>`: custom service icons (SVG/PNG). Optional files: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png`, `emblem.png`, `splash/<W>x<H>.png`.
- localStorage keys are `<app.id>.…` (keep `app.id` stable when an installation is already in use: changing it resets the stored preferences of installed apps).

## Internationalisation

Italian and English, one language per instance (`app.language`). Dictionaries are typed; the Italian one defines keys and parameter types and English must match (`shared/i18n.ts`). Frontend: `web/src/i18n/messages/{it,en}/<area>.ts`, one file per area, keys prefixed by the area (`home.`, `services.`, …). Server-generated text (alerts, events, push, integration badges, API errors) uses `server/src/i18n/`. Service names, descriptions, categories and links are user text and are never translated.

## Extensions

A directory `<EXTENSIONS_DIR>/<id>/` with `server.mjs`, `manifest.json` and an optional client bundle, enabled in `config.yaml` (`extensions:`). Contracts: `sdk/server.ts` (BFF) and `sdk/client-types.ts` (PWA). Server extensions register collectors, integrations, alert rules and routes under `/api/x/<id>/`; client extensions register pages (listed in Settings and the command palette) and Activity sections. Extensions run in-process with the BFF's privileges: install only code you trust. A broken extension is reported in Diagnostics and as a warning alert; it never stops the app.

## Safety properties (must hold)

- No secret in the repository, the bundle, logs, API responses or error messages.
- No Docker socket access; container state comes from a provider.
- Outbound requests from the BFF are `GET` (extensions may add their own), with timeouts and size limits.
- Hardened container: non-root, read-only filesystem, no capabilities, `no-new-privileges`.
- Strict CSP (`script-src 'self'`), no inline script.
