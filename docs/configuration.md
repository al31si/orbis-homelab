# Configuration reference

An instance is configured by two YAML files in the directory mounted at `/config`, plus secrets in the environment or in files.

| File                   | Purpose                                                                     |
| ---------------------- | --------------------------------------------------------------------------- |
| `config/config.yaml`   | The instance: name, language, access, data sources, push, links, extensions |
| `config/services.yaml` | The service catalog                                                         |
| `config/branding/`     | Optional icons and splash images                                            |

Ready-to-edit versions are `config.example.yaml` and `services.example.yaml` in the repository.

**Rules**

- Both files are validated strictly when the container starts. An unknown or misspelled key, a wrong type or an inconsistent combination stops the container and `docker compose logs` lists every problem with the file and the field path (for example `config.yaml: sources.system.url: must be an http(s) URL without spaces`). Nothing is silently ignored.
- Configuration is read once at startup: restart the container to apply changes (`docker compose restart orbis`).
- If `config.yaml` is missing, the defaults below apply (limited access, no data sources). If `services.yaml` is missing, the catalog is empty.
- What is not configured does not exist: no collector runs, no request is made, no page or alert appears.

## Secrets

**Non-sensitive settings live in YAML. Secrets never do.** A secret is referenced from YAML and resolved by the backend at startup:

```yaml
secret: { env: RADARR_API_KEY } # an environment variable
secret: { file: /run/secrets/radarr } # the contents of a file
```

| Source      | When to use it                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment | Default. Put the value in `.env` (loaded by Compose through `env_file`); the file must not be readable by others (`chmod 600`).                   |
| File        | Docker/Compose secrets or any file you manage. Read on every use, so a rotated secret needs no restart. Relative paths are relative to `/config`. |

Rules that apply everywhere:

- An unset or empty variable, or a missing file, means **"not configured"**: the integration is shown as such in the interface. It is never an error and never an alert. Other read errors (for example permissions) are reported without the value.
- Secret values are never logged, never returned by the API and never appear in error messages.
- Never put a secret directly in `config.yaml` or `services.yaml`; the schema has no field for it.
- For an integration with no `secret:` entry, the default variable is `<TYPE>_API_KEY` in upper case (`RADARR_API_KEY`, `SONARR_API_KEY`, `LIDARR_API_KEY`, `PROWLARR_API_KEY`, `QBITTORRENT_API_KEY`, `JELLYFIN_API_KEY`) and `VIKUNJA_API_TOKEN` for Vikunja. Use `secret:` when you run two instances of the same application.

Container-level environment variables only say where things are mounted. The image sets sensible values; you normally never change them.

| Variable         | Default       | Meaning                                                      |
| ---------------- | ------------- | ------------------------------------------------------------ |
| `CONFIG_DIR`     | `/config`     | Directory with `config.yaml`, `services.yaml`, `branding/`   |
| `DATA_DIR`       | `/data`       | State: alert history, Web Push keys and subscriptions        |
| `EXTENSIONS_DIR` | `/extensions` | Extensions                                                   |
| `WEB_DIR`        | `/app/web`    | The built web app                                            |
| `LOG_LEVEL`      | `info`        | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent` |

`TZ` is optional and only affects log timestamps.

## config.yaml

### `app`

Branding and presentation.

| Key                | Type / default                      | Meaning                                                                                                                                                                           |
| ------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | slug, `orbis-homelab`               | Lowercase letters, digits, dashes. Namespaces the PWA caches, browser storage keys and notification tags. Change it only to keep two instances apart on the same host name.       |
| `name`             | text (1-60), `Orbis Homelab`        | Header, browser tab, installed app name.                                                                                                                                          |
| `shortName`        | text (1-20), optional               | Name under the home-screen icon. Defaults to `name`; with the default name `Orbis Homelab` it is `Orbis`.                                                                         |
| `description`      | text (max 200), optional            | Description for the browser and the app manifest.                                                                                                                                 |
| `language`         | `en` or `it`, `en`                  | Language of the whole instance, including generated texts (alerts, push, errors).                                                                                                 |
| `theme`            | `system`, `light`, `dark`; `system` | Default for devices that never chose a theme. Each device can override it in Settings.                                                                                            |
| `accent`           | `#rrggbb`, optional                 | Accent color. Built-in accent if omitted.                                                                                                                                         |
| `categories`       | list of `{ id, label }`, `[]`       | Order and labels of the service groups. `id` is a slug used by `category` in `services.yaml`; `label` is 1-40 characters. The label and the order of a group come from this list. |
| `defaultFavorites` | list of service ids, `[]`           | Services starred the first time a device opens the app. Every id must exist in `services.yaml`.                                                                                   |

Service names, descriptions, category labels and links are your text and are never translated.

**Renaming an instance that is already installed.** Change `name` / `shortName` and restart the container. The header, the browser tab, the manifest and the notification title follow after the next load. An installed app may keep its old name for a while: Chromium browsers (Chrome, Edge, Brave) re-read the manifest periodically, usually within a day, and may ask to confirm the change; to see it at once, uninstall the app and install it again from the same address. On iPhone and iPad the name under the icon is fixed when it is added to the Home Screen: remove the icon and add it again, then turn notifications on again from the installed app if they show as off. Push subscriptions live on the server (`data/push.json`) and in the browser for that address, so they normally survive a rename; if notifications stop, turn them off and on again in Settings.

**Do not change `id` just to rename.** `id` names the offline caches and the browser storage of each device: after changing it, every device forgets its local preferences (favorites, theme, hidden services) once and keeps the old offline cache until its site data is cleared. Push subscriptions are not affected.

### `publicUrl`

Optional. The `https://` address of the instance, if you have one (see [HTTPS](https.md)). It is only shown as a link in Settings → Installation to people who opened the plain-HTTP address. It is **not needed** to use or install the app, and not needed when you already open it over HTTPS: the app then works from whatever address the browser used. An `http://` value is accepted for older configurations but never offered (it cannot give a secure context); the server logs a line at startup to say so.

### `server`

| Key    | Default | Meaning                                                                                                                                                      |
| ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `port` | `3100`  | Port the app listens on inside the container (1-65535). Keep it equal to the container side of `ports:` in `compose.yaml`. The image healthcheck follows it. |

### `access`

See [Access modes](#access-modes).

| Key                            | Meaning                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `mode`                         | `limited` (default), `trusted-network` or `identity-proxy`                                      |
| `identityProxy.preset`         | `tailscale`: fills `userHeader` and `nameHeader` with the headers Tailscale Serve sets          |
| `identityProxy.trustedProxies` | List of IPs or CIDRs (required, at least one) the proxy connects from, as seen by the container |
| `identityProxy.trustedPort`    | Optional second listening port reserved for the proxy                                           |
| `identityProxy.userHeader`     | Header carrying the authenticated identity (required without a preset)                          |
| `identityProxy.nameHeader`     | Optional header carrying a display name                                                         |
| `identityProxy.allowedUsers`   | Identities that get full access (required, at least one; compared case-insensitively)           |

### `sources`

Where data comes from. Each source is optional.

#### `sources.system`

The system provider: enables the System page, container states and filesystem usage.

| Key          | Default  | Meaning                                                                                                     |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| `type`       | required | `glances`                                                                                                   |
| `url`        | required | Base URL of the Glances web server, for example `http://glances:61208`                                      |
| `hostPrefix` | `/host`  | Where the host folder with your disks is mounted inside the Glances container; used to map filesystem paths |
| `hostname`   | optional | Hostname to display. Inside Docker, Glances reports the container id                                        |

#### `sources.storage`

Enables the Storage page. `storage: {}` is valid: it shows the filesystems reported by the system provider.

| Key               | Default | Meaning                                                                                                                                                                              |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `volumes.include` | `auto`  | `auto` shows every real filesystem; or an explicit list of mount points                                                                                                              |
| `volumes.labels`  | `{}`    | Mount point to friendly name                                                                                                                                                         |
| `pools`           | `[]`    | Pools: `id` (slug), `label`, `mount` (the pooled filesystem), `members` (mount points of the member volumes). A pool shows several volumes as one capacity (mergerfs, ZFS, LVM, ...) |
| `smart`           | none    | SMART disk health, see below                                                                                                                                                         |

`pools` and an explicit `volumes.include` need `sources.system`.

**How a pool gets its capacity.** If the system provider reports the filesystem mounted at the pool's `mount`, its numbers are used. Some providers hide FUSE filesystems (Glances does not list mergerfs, for example): then the capacity is the **sum of the member volumes**, which is what the union reports as well. A pool whose members are not all reported is left out rather than shown with a wrong total, so list every member mount point.

`sources.storage.smart` reads a JSON report that you produce ([format](smart-report.md)):

| Key     | Meaning                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| `type`  | `report-json`                                                                                                    |
| `url`   | URL serving the report. Exactly one of `url` / `file`                                                            |
| `file`  | Path of the report inside the container, for example `/data/smart-report.json`                                   |
| `disks` | Disk label (as written in the report) to the mount point of its filesystem, to show usage next to the SMART data |

#### `sources.usage`

A list of usage providers, one per tracked AI subscription. Each shows the remaining weekly quota in Activity. The document format is in [usage-providers.md](usage-providers.md).

| Key               | Default  | Meaning                                                                         |
| ----------------- | -------- | ------------------------------------------------------------------------------- |
| `id`              | required | Slug, unique                                                                    |
| `label`           | required | Shown name (1-40 characters)                                                    |
| `parser`          | required | `weekly-quota`                                                                  |
| `url` / `file`    | one of   | Where the JSON document is read from. Exactly one of the two                    |
| `maxAgeMinutes`   | none     | Data older than this is reported as stalled. Needs `updated_at` in the document |
| `hint`            | none     | Text (max 300) shown while a `file` source does not exist yet                   |
| `intervalSeconds` | `300`    | Refresh interval, at least 30                                                   |

### `features`

Automatic [feature detection](#feature-detection) can be overridden, but only to switch things off.

| Key        | Meaning                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| `system`   | `false` hides the System page even if a provider is configured. `true` without `sources.system` is an error |
| `storage`  | `false` hides the Storage page                                                                              |
| `activity` | `false` hides Activity. `true` shows it even with no sources (the event log only)                           |

### `alerts`

| Key                                                | Default     | Meaning                                                                 |
| -------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| `graceSeconds`                                     | `90`        | A condition must persist this long (seconds) before it becomes an alert |
| `thresholds.poolWarn` / `poolCrit`                 | `85` / `95` | Pool usage percent                                                      |
| `thresholds.fsWarn` / `fsCrit`                     | `80` / `90` | Volume usage percent                                                    |
| `thresholds.memAvailableWarn` / `memAvailableCrit` | `10` / `5`  | Available memory below this percent                                     |
| `thresholds.swapWarn`                              | `85`        | Swap usage percent...                                                   |
| `thresholds.swapWithLowMemory`                     | `25`        | ...that alerts only while available memory is below this percent        |
| `thresholds.loadFactorWarn`                        | `1.5`       | 15-minute load above `cores x factor`                                   |
| `thresholds.smartStaleSeconds`                     | `2700`      | A SMART report older than this is stale                                 |

All thresholds are optional; omit the ones you do not want to change.

### `push`

Web Push notifications for new alerts.

| Key       | Default | Meaning                                                                                                 |
| --------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `enabled` | `false` | Turns push on. VAPID keys are generated into `/data` on first start                                     |
| `subject` | none    | Required when enabled: contact claim sent to push services, `mailto:you@example.com` or an `https:` URL |

Push needs full access (it is disabled for `limited` visitors) and a secure address (HTTPS or `localhost`, see [HTTPS](https.md)); on iOS the app must be installed to the home screen first. Back up `/data`: see [Backup and restore](backup-restore.md).

### `links`

Quick links shown in Settings.

| Key           | Default   | Meaning                                                                   |
| ------------- | --------- | ------------------------------------------------------------------------- |
| `id`          | required  | Slug, unique                                                              |
| `title`       | required  | 1-60 characters                                                           |
| `description` | empty     | Max 160 characters                                                        |
| `url`         | required  | `{host}` is replaced in the browser by the hostname the app was opened on |
| `icon`        | `generic` | Built-in icon key or a file name under `branding/icons/`                  |

### `extensions`

Extensions to load from `/extensions`. Only listed extensions are loaded.

| Key       | Default  | Meaning                                                     |
| --------- | -------- | ----------------------------------------------------------- |
| `id`      | required | Slug: the directory name under `/extensions`, unique        |
| `enabled` | `true`   | `false` keeps the entry but does not load the extension     |
| `config`  | `{}`     | Free-form block passed to the extension, which validates it |

See [extensions.md](extensions.md).

## services.yaml

```yaml
services:
  - id: media-server
    name: Media server
    ...
```

| Key           | Default   | Meaning                                                                                                                                                                                                                                                                                     |
| ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | required  | Slug, unique                                                                                                                                                                                                                                                                                |
| `name`        | required  | 1-60 characters                                                                                                                                                                                                                                                                             |
| `description` | empty     | Max 160 characters                                                                                                                                                                                                                                                                          |
| `category`    | none      | Slug of a group; label and order come from `app.categories`                                                                                                                                                                                                                                 |
| `icon`        | `generic` | Product key (for example `jellyfin`, `radarr`: the logo of the product, see [Service logos](brand-logos.md)) or a file name under `config/branding/icons/` (SVG or PNG). Without `icon`, a service whose `id`, `name` or integration is a known product gets its logo, any other a monogram |
| `url`         | none      | Launch URL. `{host}` is replaced in the browser by the hostname the app was opened on. Without it the service has no link                                                                                                                                                                   |
| `core`        | `false`   | An outage of a core service is critical (and pushed); otherwise it is a warning                                                                                                                                                                                                             |
| `containers`  | `[]`      | Docker container names, main one first. Their state comes from the system provider. A container can belong to one service only                                                                                                                                                              |
| `probe`       | none      | HTTP check made by Orbis Homelab, see below                                                                                                                                                                                                                                                 |
| `integration` | none      | Extra data from a supported application, see below                                                                                                                                                                                                                                          |

**Probe.** `probe: true` checks `url` (which must not contain `{host}`). `probe: http://host:port/path` checks that URL. The object form adds options:

```yaml
probe:
  url: http://media-server:8096/health
  okStatus: [200] # accepted status codes; default: any 2xx or 3xx
  headers: { Host: media.example.com } # extra request headers
  insecureTls: true # accept a self-signed certificate
```

The probe URL must be reachable from the Orbis Homelab container (see [Reaching the services you monitor](install.md#reaching-the-services-you-monitor)).

**State.** A service with a probe and/or containers has a real state (`up`, `degraded`, `down`, `unknown`). A service with neither is **not monitored**: it is listed and linkable, counted in the total, and never raises an alert.

**Integration.** `integration: { type, url, secret? }` attaches an adapter:

| `type`                                   | Shows                                                | Credential            |
| ---------------------------------------- | ---------------------------------------------------- | --------------------- |
| `radarr`, `sonarr`, `lidarr`, `prowlarr` | Queue, health messages, available update             | `<TYPE>_API_KEY`      |
| `qbittorrent`                            | Transfer rates and torrent counts                    | `QBITTORRENT_API_KEY` |
| `jellyfin`                               | Active playback sessions (only `GET /Sessions`)      | `JELLYFIN_API_KEY`    |
| `vikunja`                                | Open and overdue tasks (titles only for full access) | `VIKUNJA_API_TOKEN`   |

`url` is the address of the application as seen from the container. `secret` is optional and overrides the default variable (see [Secrets](#secrets)). Use read-only credentials where the application allows it (a read-only Vikunja token). The adapters only issue `GET` requests.

An integration without its credential is "not configured": explained in the interface, no error, no alert.

## Feature detection

`GET /api/session` reports which features are on; the app builds its navigation from it, so with fewer sources there are simply fewer tabs. Endpoints of a disabled feature answer 404.

| Feature      | Enabled when                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `system`     | `sources.system` is configured                                                                                                                                                                   |
| `containers` | the system provider reports containers (Glances does)                                                                                                                                            |
| `storage`    | `sources.storage` is present (even `storage: {}`) or a SMART report is configured                                                                                                                |
| `smart`      | `sources.storage.smart` is configured                                                                                                                                                            |
| `activity`   | an integration of type vikunja, qbittorrent, an arr application or jellyfin is declared in `services.yaml`; any `sources.usage` entry exists; or an enabled extension declares Activity sections |
| `push`       | `push.enabled`                                                                                                                                                                                   |

`features.*` in `config.yaml` can switch system, storage and activity off (and activity on), nothing else.

## Access modes

The example configuration is `limited`. `trusted-network` and `identity-proxy` are explicit opt-ins: `config.example.yaml` has a commented block for each, marked `(replaces: mode: limited)` (comment out the active `mode: limited` line, then enable the block).

`access.mode` decides who gets the **full** view. Everybody else gets the **limited** view: private details (task titles, playback sessions, ...) are withheld and push is disabled. Mutating requests (push subscription) additionally require a JSON body and a same-origin `Origin` header.

| Mode                | Who gets full access                        | Use it when                                                                                                                   |
| ------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `limited` (default) | Nobody                                      | You want a read-only status page, or you have not decided yet                                                                 |
| `trusted-network`   | Everybody who can reach the port            | The port is reachable only from a network you control: a home LAN behind a firewall, a private VPN. **Never on the Internet** |
| `identity-proxy`    | Requests that pass **all** the checks below | A reverse proxy or VPN gateway in front of Orbis Homelab authenticates your users                                             |

For `identity-proxy`, full access requires all of:

1. the request arrived on the trusted listener (`trustedPort`, when set);
2. its source address is within `trustedProxies`;
3. the identity header (`userHeader`) is present and its value is in `allowedUsers`.

Otherwise the visitor is limited. Identity headers from any other source are ignored, so a container sharing a network with Orbis Homelab cannot forge them.

### Behind a reverse proxy that authenticates (forward auth)

```yaml
access:
  mode: identity-proxy
  identityProxy:
    trustedProxies: [172.18.0.0/16] # the Docker network the proxy shares with Orbis Homelab
    userHeader: Remote-User
    nameHeader: Remote-Name
    allowedUsers: [alice, bob@example.com]
```

Configure the proxy to **overwrite** the header on every request (never pass through a value sent by the client) and to authenticate before forwarding. Do not publish Orbis Homelab's port to the LAN: only the proxy should reach it (see the comments in `compose.yaml`). Find the subnet with `docker network inspect <network>`.

For the strongest setup, add `trustedPort` and publish it only to the proxy: identity is then honoured on that port alone, so nothing that merely reaches the public port can assert one.

### Behind Tailscale Serve

```yaml
access:
  mode: identity-proxy
  identityProxy:
    preset: tailscale
    trustedProxies: [172.18.0.1] # gateway of the Compose network
    trustedPort: 3101
    allowedUsers: [alice@example.com]
```

Publish the trusted port on the host's loopback only (`'127.0.0.1:3101:3101'` in `compose.yaml`) and point Tailscale Serve at it (`tailscale serve --bg --https=443 3101`). Requests relayed from the host loopback appear in the container with the gateway address of the Compose network: `docker network inspect orbis-homelab_default` shows it. The `tailscale` preset sets `userHeader` and `nameHeader` to the headers Tailscale Serve adds.

## Branding

Everything is optional: without it the built-in neutral icons are used. Put files in `config/branding/` (mounted read-only at `/config/branding`). The backend serves a file from there first and falls back to the built-in asset with the same path, so you can replace only some of them.

| File                          | Size                                      | Used for                                                                                                  |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `icons/icon-192.png`          | 192 x 192                                 | App icon (manifest)                                                                                       |
| `icons/icon-512.png`          | 512 x 512                                 | App icon (manifest)                                                                                       |
| `icons/icon-maskable-512.png` | 512 x 512                                 | Adaptive icon on Android: keep the artwork inside the central 80%                                         |
| `icons/apple-touch-icon.png`  | 180 x 180                                 | iOS home-screen icon (no transparency)                                                                    |
| `icons/favicon-32.png`        | 32 x 32                                   | Browser tab                                                                                               |
| `icons/emblem.png`            | 152 x 192 (shown at 34 x 43), transparent | Mark in the header                                                                                        |
| `splash/<W>x<H>.png`          | as named                                  | iOS launch screens: 750x1334, 1170x2532, 1179x2556, 1290x2796, 1620x2160, 1640x2360, 1668x2388, 2048x2732 |
| `icons/<name>.svg` or `.png`  | any square                                | Custom service icons: reference the file name in `icon:` of `services.yaml` or `links`                    |

Service icons share the folder with the reserved names above, so avoid those names. A service whose `icon` is neither a built-in key nor an existing file shows the generic mark. The accent color and the name are set in `app`, not in the branding folder.

Devices cache the app shell and its icons: after changing branding files, reload the app (on iOS, reinstall it to refresh the home-screen icon).

## Internationalisation

The instance has one language: `app.language` (`en` or `it`). It applies to the interface, the manifest, the service worker texts and everything generated by the backend (alerts, events, push notifications, integration badges, error messages).

Text you write yourself (service names and descriptions, category labels, link titles) is shown as written. To add a language, see [CONTRIBUTING.md](../CONTRIBUTING.md#internationalisation).
