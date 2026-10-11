# Orbis Homelab

A self-hosted control center for your homelab: one installable web app (PWA) that shows what is running, what is wrong and where to click, with no cloud account and no agent on your hosts.

Orbis Homelab is a small Node.js backend that collects data from the services you already run, and a mobile-friendly interface served by the same container. Only the backend holds credentials and talks to your services; the browser talks to the backend.

> **Status: 0.1.0, the first release.** It is used on a real homelab, but the configuration format and the extension API may still change between `0.x` minor versions; changes are listed in the [release notes](docs/release-notes/0.1.0.md) and a breaking change is never silent (the configuration is validated at startup and errors name the file and the field).

- **Everything optional.** You start with a service catalog and HTTP checks. Add a system provider, storage, usage trackers, integrations, push notifications and extensions when you want them; whatever is not configured does not exist (no page, no request, no placeholder).
- **Configured, not built.** Two YAML files and a `.env`. Updating the image never touches them.
- **Safe by default.** Visitors get a limited view; full access is an explicit decision (trusted network or an identity-aware reverse proxy). Read-only container, no Docker socket in the app, and the built-in integrations only send `GET` requests to your services.
- **Installable.** PWA for iOS, Android and desktop, with offline shell, dark/light themes, your own name, accent color and icons.
- **English and Italian.** One language per instance.

## Features

| Page        | Shows                                                                                        | Needs                                          |
| ----------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Home        | Overall status and health score, active alerts, key metrics, problem services, favorites     | nothing (richer with more sources)             |
| Services    | Every service of your catalog with its real state, details, badges, launch links             | `services.yaml`                                |
| System      | CPU, load, memory, swap, temperatures, disk I/O, Docker containers                           | `sources.system` (Glances)                     |
| Storage     | Volumes, pools (mergerfs, ZFS, ...), SMART disk health                                       | `sources.storage` or a SMART report            |
| Activity    | Event log, weekly AI usage, tasks (Vikunja), downloads (qBittorrent), media queues, playback | an integration, a usage source or an extension |
| Settings    | Theme, install, push notifications, quick links, extension pages, access mode                | nothing                                        |
| Diagnostics | Health of every data source, unclassified containers, extension status                       | nothing                                        |

Supported integrations: Radarr, Sonarr, Lidarr, Prowlarr, qBittorrent, Jellyfin, Vikunja. Alerts (with a grace period) cover services, containers, resources, disks and data sources, and can be pushed to your devices (Web Push, no third party account).

Extensions let you add your own collectors, alert rules, API routes and PWA pages without forking: see [docs/extensions.md](docs/extensions.md).

## Quick start

You need Docker with the Compose plugin. The image is published for `linux/amd64` and `linux/arm64`.

```sh
VERSION=0.1.0   # the release to install
BASE=https://raw.githubusercontent.com/al31si/orbis-homelab/v$VERSION

mkdir -p orbis-homelab/config orbis-homelab/data && cd orbis-homelab
curl -fsSLO $BASE/compose.yaml
curl -fsSL $BASE/config.example.yaml -o config/config.yaml
curl -fsSL $BASE/services.example.yaml -o config/services.yaml
curl -fsSL $BASE/.env.example -o .env
chmod 600 .env
echo "ORBIS_VERSION=$VERSION" >> .env   # the image of the same release as these files
sudo chown 1000:1000 data               # the container runs as uid 1000

docker compose up -d
```

Open `http://<host>:3100`. Then edit `config/services.yaml` with your own services and `docker compose restart`.

The files and the image are versioned together: `BASE` points at the tag of the release and `ORBIS_VERSION` pins the image `ghcr.io/al31si/orbis-homelab:$VERSION` to it, so the configuration you download always matches the code that reads it. Compose refuses to start without `ORBIS_VERSION`; `latest` is not the default. To build from a checkout instead, see [docs/install.md](docs/install.md).

**Safe by default.** The example configuration has `access.mode: limited`: everybody who opens the app sees services and their state, private details are withheld and push notifications are off. Full access is an explicit choice (`trusted-network` for a network you control, `identity-proxy` behind an authenticating proxy or VPN): see [Security model](#security-model) and [Access modes](docs/configuration.md#access-modes).

Two installations on one host: give each its own `ORBIS_PORT` and, if their folders have the same name, its own `COMPOSE_PROJECT_NAME` in `.env` ([details](docs/install.md#several-installations-on-one-host)).

## Configuration

An instance is made of files that live outside the image:

| What                   | Where                              | Contains                                               |
| ---------------------- | ---------------------------------- | ------------------------------------------------------ |
| `config/config.yaml`   | mounted read-only at `/config`     | name, language, access mode, sources, push, links, ... |
| `config/services.yaml` | mounted read-only at `/config`     | the service catalog: probes, containers, integrations  |
| `config/branding/`     | mounted read-only at `/config`     | optional icons, splash images, custom service icons    |
| `.env`                 | read by Compose (`env_file`)       | secrets only: API keys and tokens                      |
| `data/`                | mounted read-write at `/data`      | alert history, push keys and subscriptions             |
| `extensions/`          | optional, mounted at `/extensions` | extensions you installed                               |

The rule: **non-sensitive settings go in YAML, secrets go in the environment or in files** and are referenced from YAML (`{ env: NAME }` or `{ file: /run/secrets/name }`). Both YAML files are validated strictly at startup; a typo stops the container with the exact field and reason instead of silently disabling a feature.

Every key is documented in [docs/configuration.md](docs/configuration.md); `config.example.yaml` has a ready-to-uncomment block for each optional capability (the instructions are at the top of the file and every combination of blocks is tested).

## Security model

- **No accounts, no passwords.** Orbis Homelab decides an access level per request: `limited` or `full`. Limited hides private details (task titles, playback sessions, ...) and disables push. Full shows everything.
- **`limited` is the default.** Full access is configured explicitly in `config.yaml` (`access.mode`):
  - `trusted-network`: everyone who reaches the port gets full access. An explicit opt-in, only for a network you control: it is not what the example configuration does.
  - `identity-proxy`: full access only for requests that arrive from your reverse proxy **and** carry an allowed identity header. Anything else is limited.
- **Do not expose Orbis Homelab to the Internet** without an identity-aware reverse proxy in front of it.
- Credentials never leave the backend: not in the bundle, the API, the logs or the error messages.
- The built-in integrations and providers send outbound `GET` requests only, with timeouts and size limits. The app itself has no Docker socket access: container state comes from a provider such as Glances. Extensions are not bound by this: the extension SDK can also send `POST` requests (see below).
- **Glances is a separate, more privileged container.** If you add it for the System page, it needs the Docker socket (which is control of the host, even mounted `:ro`) and its web server has no authentication. Orbis Homelab's protections do not extend to it: read [docs/glances.md](docs/glances.md) before adding it.
- Hardened container: non-root, read-only filesystem, no capabilities, `no-new-privileges`. Strict content security policy, no inline script.
- Extensions run inside the backend process with its privileges and are not limited to `GET`: they can make `GET` and `POST` requests, read the secrets you give them and mount their own API routes. Install only code you trust.
- **Private data stays out of the browser's caches.** A response produced for a visitor with full access is held in memory only: it is never written to the service worker cache or to local storage, and it is dropped on a change of identity, an access downgrade, a rejected request or a lost connection. Offline, the limited and shared data stay available; private sections are empty. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#what-the-browser-keeps).

Details and reporting instructions: [SECURITY.md](SECURITY.md).

## Platforms

The image is built for `linux/amd64` and `linux/arm64`. The `amd64` image is what the automated tests run. The `arm64` image is built on the same pipeline and inspected (platforms, labels, no native code of another architecture), but it is **not executed** by the project's tests: if you run it on a Raspberry Pi or another ARM machine, your feedback is welcome.

## Documentation

- [Installation](docs/install.md)
- [Configuration reference](docs/configuration.md)
- [Updating](docs/update.md)
- [Backup and restore](docs/backup-restore.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Glances: the system provider](docs/glances.md)
- [SMART report format](docs/smart-report.md)
- [Usage providers](docs/usage-providers.md) and the optional [Claude Code usage writer](contrib/claude-usage/README.md)
- [Extensions](docs/extensions.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Releasing](docs/releasing.md) and the [release notes](docs/release-notes/0.1.0.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

## License

Orbis Homelab is released under the [Apache License 2.0](LICENSE) (see also [NOTICE](NOTICE)). It bundles open source packages under their own licenses, listed with their texts in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The interface uses the fonts of the visitor's system and the project's own icons and logo, which are original work covered by the same Apache license.

Orbis Homelab is an independent project. Other software uses the name "Orbis"; this one is always called Orbis Homelab and is not affiliated with any of them.
