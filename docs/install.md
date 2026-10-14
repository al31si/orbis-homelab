# Installation

## Requirements

- A recent Docker Engine with the Compose plugin (`docker compose version`).
- A host reachable by the devices that will open the app. The image is built for `linux/amd64` and `linux/arm64` (Raspberry Pi 4/5, Apple silicon, most servers).
- Nothing else: plain `http://<host>:3100` works. Only the offline shell, push notifications and installation as a full app need an HTTPS address, which is optional (see [HTTPS](#https)).

Orbis Homelab needs no database and no other container..

## Install with Compose

1. Create a directory for the instance. It holds everything that is yours; the image holds nothing of yours.

   ```sh
   mkdir orbis-homelab && cd orbis-homelab
   ```

2. Download the Compose file and the examples **from the same release as the image** (or copy them from a checkout of that tag). They are versioned together: a newer `main` may use configuration keys that an older image does not know, and the reverse.

   ```sh
   VERSION=0.2.0   # the release these instructions belong to
   BASE=https://raw.githubusercontent.com/al31si/orbis-homelab/v$VERSION
   curl -fsSLO $BASE/compose.yaml
   curl -fsSLO $BASE/config.example.yaml
   curl -fsSLO $BASE/services.example.yaml
   curl -fsSLO $BASE/.env.example
   ```

3. Create the instance files, and pin the image to the release of the files you just downloaded (`compose.yaml` has no default version on purpose and refuses to start without it):

   ```sh
   mkdir -p config data
   cp config.example.yaml config/config.yaml
   cp services.example.yaml config/services.yaml
   cp .env.example .env
   chmod 600 .env
   echo "ORBIS_VERSION=$VERSION" >> .env
   ```

4. Give the container write access to `data/`. It runs as the unprivileged user `node` (uid 1000), and Docker would otherwise create a root-owned directory:

   ```sh
   sudo chown 1000:1000 data
   ```

   If your own user is uid 1000 nothing is needed.

5. Edit `config/config.yaml`: at least `app.name` and `app.language`, and decide the **access mode** (see [Configuration, Access modes](configuration.md#access-modes)). The example is `limited` (everybody sees services and their state, nobody sees private details, push is off), which is safe anywhere. Full access is an explicit opt-in: `trusted-network` only for a network you control, `identity-proxy` behind an authenticating proxy or VPN. The example file has a block for each, with the instructions at its top.

6. Start it:

   ```sh
   docker compose up -d
   docker compose ps          # State should become "healthy" within about 20 seconds
   docker compose logs orbis
   ```

7. Open `http://<host>:3100`. Replace the entries of `config/services.yaml` with your own services, then restart to apply (`docker compose restart orbis`). Configuration is read at startup.

If the container exits right after starting, the logs list every configuration problem with the file and the field. See [Troubleshooting](troubleshooting.md).

## Build from source instead of pulling the image

In `compose.yaml`, comment out the `image:` line and uncomment the `build:` block, then:

```sh
git clone https://github.com/al31si/orbis-homelab.git
cd orbis-homelab
mkdir -p config data
cp config.example.yaml config/config.yaml
cp services.example.yaml config/services.yaml
cp .env.example .env
docker compose up -d --build
```

The Dockerfile has two targets: `runtime` (default: backend plus the web app) and `server` (backend only, for development). Building on an arm64 or amd64 machine produces an image for that machine; the Dockerfile never needs emulation, so building both architectures on one machine works too:

```sh
docker buildx build --platform linux/amd64,linux/arm64 -t orbis-homelab:dev .
```

## What Compose mounts

| Host path             | Container path | Mode       | Purpose                                        |
| --------------------- | -------------- | ---------- | ---------------------------------------------- |
| `./config`            | `/config`      | read-only  | `config.yaml`, `services.yaml`, `branding/`    |
| `./data`              | `/data`        | read-write | alert history, Web Push keys and subscriptions |
| `./extensions` (opt.) | `/extensions`  | read-only  | extensions, see [extensions.md](extensions.md) |

The container filesystem is read-only; `/tmp` is a `tmpfs`. Secrets come from `.env` (`env_file`) or from files you mount (for example under `/run/secrets`).

## Reaching the services you monitor

The container joins its own network. Two things matter:

- **By address.** `http://192.168.1.20:8096` works from anywhere with a route to that host. This is the simplest option for services on other machines.
- **By container name.** `http://jellyfin:8096` works only if Orbis Homelab shares a Docker network with that container. List the network under `networks:` in `compose.yaml` and declare it as `external` at the bottom of the file (an example is included as comments). `docker network ls` shows the exact names; `docker inspect <container>` shows the networks a container uses.

Services published on the Docker host itself can be reached by the host's LAN address, or through the optional `extra_hosts: ['host.docker.internal:host-gateway']` entry in `compose.yaml`.

The built-in integrations only make outbound `GET` requests (an extension you install may do more, see [extensions](extensions.md)); nothing needs to be opened inbound except the app's own port.

## Optional: Glances (System and Storage pages)

The System page, container states and filesystem usage come from [Glances](https://nicolargo.github.io/glances/) running in web server mode. `compose.yaml` contains a commented `glances` service. Add it, then enable the provider in `config/config.yaml`:

```yaml
sources:
  system:
    type: glances
    url: http://glances:61208
```

Orbis Homelab never touches the Docker socket: the socket stays with the Glances container. That container is far more privileged than Orbis Homelab (Docker socket access is control of the host, and the Glances web server has no authentication), so read [Glances: the system provider](glances.md) before adding it: it explains the risks, what Orbis Homelab reads from it, and the narrowest mounts that work. Without Glances everything else still works.

## HTTPS

Optional. Over plain `http://<host>:3100` the dashboard works, and most browsers can open it as an app window or add it to the Home Screen (Settings → Installation lists what yours offers). Browsers enable the service worker (offline shell, updates), the install dialog for a full app and Web Push only on secure origins: HTTPS, or `localhost`. iOS and iPadOS additionally need the app on the Home Screen for push.

[Installing the app and getting HTTPS](https.md) explains what each kind of address gives you and how to get an HTTPS address with Tailscale Serve, a reverse proxy you already run, Caddy with a domain, or a local certificate authority. Setting `publicUrl` is optional and only adds a link to your HTTPS address in Settings for people who opened the HTTP one. If the proxy also authenticates users, use [`access.mode: identity-proxy`](configuration.md#access-modes) so the full view is available only to them, and publish the container port only to the proxy (see the comments in `compose.yaml`).

## Changing the port

Change the container port in `config.yaml` (`server.port`) and the container side of the mapping in `compose.yaml` together, for example `server.port: 8080` and `'8080:8080'`. To change only the host port, set `ORBIS_PORT` in `.env` (the left side of the mapping). The healthcheck built into the image reads `server.port` from `config.yaml`; if you override `healthcheck:` in your own Compose file, make sure it uses the same port.

## Several installations on one host

`compose.yaml` fixes neither the project name nor the container name, so two installations can live side by side. Compose derives the project name from the **name of the folder** that holds `compose.yaml`, and containers, networks and volumes are named after the project. Each installation needs:

- **a different project name.** Folders with different names (`orbis-home`, `orbis-lab`) already have one. Folders with the **same** name in different places (the Quick Start creates `orbis-homelab` wherever you run it) would be one project to Compose, and starting the second would replace the first: set a name in the second `.env`:

  ```sh
  echo "COMPOSE_PROJECT_NAME=orbis-homelab-lab" >> .env
  ```

- **a different host port**, since both would publish `3100`: set `ORBIS_PORT` in each `.env` (default `3100`):

  ```sh
  echo "ORBIS_PORT=3200" >> .env
  ```

Give each installation its own `app.id` in `config.yaml` if you open both from the same browser (the id namespaces the PWA caches and the stored preferences). Run `docker compose` from inside each folder. A pinned `ORBIS_VERSION` lets each run a different release. The clean-install test starts two installations from the shipped files this way and checks that they do not interfere.

## Uninstall

```sh
docker compose down            # keeps config/ and data/
docker compose down --rmi all  # also removes the image
```

Delete the directory to remove the instance completely.
