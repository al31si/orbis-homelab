# Glances: the system provider

The System page, container states and filesystem usage come from [Glances](https://nicolargo.github.io/glances/) running in web server mode. Orbis Homelab only makes `GET` requests to it. This page explains how to run it, what it can do on your host, and which part of that is Orbis Homelab's responsibility and which part is Glances'.

## Two security domains

|                     | Orbis Homelab                                                                        | The Glances container                                                            |
| ------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Docker socket       | **Never mounted.** No Docker API call is made by Orbis Homelab.                      | Mounted by you: this is how Glances lists containers.                            |
| Host filesystem     | Not mounted (only your `config/`, `data/`, optional `extensions/`).                  | Whatever you mount for the filesystem figures.                                   |
| Host processes      | Not visible.                                                                         | Visible only with `pid: host`, which Orbis Homelab does **not** need.            |
| Network             | Publishes the app port; makes outbound `GET` requests.                               | Should publish nothing: Orbis Homelab reaches it over a private Compose network. |
| Authentication      | Access levels (`limited`/`full`), see [Access modes](configuration.md#access-modes). | None by default: the Glances web server answers anyone who can reach it.         |
| Container hardening | Non-root, read-only filesystem, no capabilities, `no-new-privileges`.                | None of this is applied by the example; Glances needs more privileges.           |

Orbis Homelab's own protections do not extend to Glances. Adding the System page means adding one more container with powerful access to the host, and that container's security is yours to manage.

## What the Glances container can do

- **Docker socket.** To list containers, Glances talks to `/var/run/docker.sock`. Mounting it `:ro` makes the socket **file** read-only, which is not what people expect: it does **not** restrict the Docker API. Anything that can reach the socket can still start a privileged container and become root on the host. A compromised Glances container is therefore equivalent to a compromised host. The same is true of every container that mounts the socket (Portainer, Traefik, Watchtower, ...).
- **Host filesystem.** The example mounts a directory of the host read-only so Glances can report disk usage. Everything under that directory is readable by the Glances process: mount the narrowest one that holds your data disks, not `/`.
- **Unauthenticated API.** `glances -w` answers every request without credentials (verified with Glances 4.5.6: `GET /api/4/cpu` returns `200` with no header). Besides the figures Orbis Homelab reads, the API also serves things like the process list. Nobody who is not trusted with that should be able to reach the port.
- **Processes.** With `pid: host`, Glances lists every process of the host with its full command line, and serves it over that unauthenticated API. Command lines often contain secrets passed as arguments. **Orbis Homelab does not use the process list**, so the example does not set `pid: host`.

## What Orbis Homelab reads

Exactly these endpoints of the Glances REST API (version 4), with `GET`: `cpu`, `percpu`, `mem`, `memswap`, `load`, `uptime`, `system`, `sensors`, `diskio`, `containers`, `fs`. Nothing else is requested and nothing is ever written to Glances.

## Recommended setup

Add this service to your `compose.yaml` (the same text is in the comments of that file) and enable the provider in `config/config.yaml`:

```yaml
services:
  glances:
    image: nicolargo/glances:latest # pin a version once it works for you, for example 4.5.6
    restart: unless-stopped
    environment:
      GLANCES_OPT: '-w'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Parent folder of your data disks (`/mnt` here), mounted under /host.
      - /mnt:/host/mnt:ro
```

```yaml
# config/config.yaml
sources:
  system:
    type: glances
    url: http://glances:61208
    hostPrefix: /host
```

- **Do not publish a port** for Glances: no `ports:` entry. Orbis Homelab reaches it by name because both services are on the same default Compose network.
- **Do not put Glances on other networks** (a proxy network, the network of unrelated stacks): anything on that network could query it.
- **Do not add `pid: host`** and do not mount `/` unless you want the root filesystem in the Storage page and accept that Glances can read the whole host.

What was checked for this recommendation (Glances 4.5.6, Docker, a host with several data disks): with the setup above every endpoint listed in the previous section answers, the container list is complete, the data disks appear under `/host/mnt/...` with `hostPrefix: /host`, and the process list shows only Glances' own process. Without any host mount only the container's own mounts are reported, so the Storage page shows no disks. These checks used Glances directly; they say what Glances exposes, not that your own host layout needs no adjustment.

## Reducing the Docker socket risk

If the socket access is a concern, two options exist outside of Orbis Homelab. Neither is part of Orbis Homelab's tests, so try them on a non-critical setup first:

- Put a filtering proxy such as `tecnativa/docker-socket-proxy` between Glances and the socket, allowing only the read-only container endpoints, and point Glances at it with `DOCKER_HOST`. This limits the damage of a compromised Glances container, since the proxy refuses requests that create or change containers.
- Skip Glances and the container page altogether. Without `sources.system` Orbis Homelab still works: the service catalog, HTTP probes, integrations and alerts need no privileged container. The System, container and filesystem views are simply absent.

## If something does not show up

See [Troubleshooting](troubleshooting.md#docker-health-shows-nothing-for-my-containers). In short: `sources.system.url` must be reachable from the Orbis Homelab container by name, and `hostPrefix` must match where you mounted the host folder.
