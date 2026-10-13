# Troubleshooting

Start with the logs and the container state:

```sh
docker compose ps
docker compose logs --tail 100 orbis
```

The Diagnostics page (Settings > Diagnostics) lists every data source with its last success and last error, the containers that are not part of the catalog, and the status of extensions.

## The container exits at startup: configuration errors

The logs list every problem with the file and the path of the field:

```
config.yaml: sources.system.url: must be an http(s) URL without spaces
services.yaml: services[2].id: duplicate id media-server
services.yaml: line 14: Implicit map keys need to be followed by map values
```

Fix the file and `docker compose up -d` again. The schema is strict: a misspelled key (`acess:`) is an error, not an ignored line. Common causes:

- YAML indentation or a missing space after a colon;
- a URL without `http://` or `https://`;
- `probe: true` on a service whose `url` contains `{host}` (the placeholder only exists in the browser: use a probe URL);
- a container name listed in two services;
- `defaultFavorites` naming a service that does not exist;
- `pools` or an explicit `volumes.include` without `sources.system`;
- two keys of the same name (for example `sources:` twice): merge them into one.

Compare with `config.example.yaml`; every optional block there validates as shipped.

## The container is "unhealthy" or restarts

- `docker compose logs orbis` shows why. A healthy container answers `GET /api/health`.
- Healthcheck port: the image healthcheck reads `server.port` from `/config/config.yaml`. If you changed the port, change the container side of `ports:` in `compose.yaml` too. If you wrote your own `healthcheck:` that calls a fixed port, it must use the configured one.
- `docker compose ps` shows `starting` for about 20 seconds after launch; that is normal.
- Permission denied on `/data`: the container runs as uid 1000. Run `sudo chown 1000:1000 data`.
- Out of memory (`OOMKilled` in `docker inspect orbis`): raise `mem_limit` in `compose.yaml`.

## The page does not load

- Check the port mapping (`docker compose ps` shows `0.0.0.0:3100->3100/tcp`) and any firewall on the host.
- A blank page after an update: reload once; the browser may hold the old app shell. On iOS, close the app and reopen it.
- Behind a reverse proxy, make sure it forwards plain HTTP to the container port and does not rewrite paths.

## No data, or pages are missing

Pages exist only when their data source is configured ([feature detection](configuration.md#feature-detection)).

| Missing                                             | Why / fix                                                                                                                                                                                                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System page                                         | `sources.system` is not configured (or `features.system: false`)                                                                                                                                                                                         |
| Storage page                                        | No `sources.storage` and no SMART report configured                                                                                                                                                                                                      |
| Activity page                                       | No integration, usage source or extension that feeds it. Declare an integration in `services.yaml` or add a `sources.usage` entry                                                                                                                        |
| Containers on a service                             | The system provider is off, or the container name in `containers:` does not match `docker ps` (names are exact)                                                                                                                                          |
| A service is "not monitored"                        | It has neither `probe` nor `containers`. Add one                                                                                                                                                                                                         |
| A service is "down" but works in the browser        | The probe URL must work **from inside the container**: `localhost` is the container itself. Use the container name on a shared network or the host's LAN address (see [Reaching the services you monitor](install.md#reaching-the-services-you-monitor)) |
| An integration says "not configured"                | Its secret is missing or empty: set `<TYPE>_API_KEY` in `.env` (or the variable named in `secret:`) and **recreate** the container: `docker compose up -d --force-recreate` (a plain `restart` does not reload `.env`)                                   |
| An integration says "unreachable" or shows an error | The `url` of the integration is wrong from the container's point of view, or the key was rejected. Diagnostics shows the last error without the key                                                                                                      |
| Usage shows a hint instead of numbers               | The file does not exist yet: the writer script has not run. See [usage-providers.md](usage-providers.md)                                                                                                                                                 |
| Usage says "stalled"                                | The document is older than `maxAgeMinutes`: check the writer's schedule                                                                                                                                                                                  |

## Everything looks "limited" (no private details, no push)

Visitors get the full view only when the access mode says so ([Access modes](configuration.md#access-modes)). The default is `limited`.

- The shipped example is `limited`: nobody is full until you choose a mode, so seeing the limited view on a fresh install is expected. Enable the `trusted-network` block of `config.example.yaml` (a network you control) or an `identity-proxy` block, then restart.
- With `trusted-network` everyone reaching the port is full. If you still see the limited view, the configuration was not applied: check that `config/config.yaml` is the file mounted and restart.
- With `identity-proxy`, **all** conditions must hold: the request arrives on `trustedPort` (when set), its source address is within `trustedProxies` as the **container** sees it, and the identity header carries a value in `allowedUsers`. The usual failure is the source address: from inside Docker the proxy often appears as the network gateway or another address than its published one. Run `docker network inspect <network>` and compare with `trustedProxies`.
- Headers are only honoured from trusted proxies; testing with `curl -H 'Remote-User: alice'` from your laptop correctly yields the limited view.

The Settings page shows the access mode and level of the current device.

## Push notifications do not arrive

- Push needs **full access**, a **secure address** (HTTPS, or `localhost`; Settings → Installation says whether yours is) and `push.enabled: true` with a `subject`.
- iOS and iPadOS: open the HTTPS address in Safari, **Add to Home Screen**, open the installed app, then enable notifications in Settings. It does not work from a Safari tab.
- Notifications stop after deleting `data/`: the keys changed; turn them off and on again on each device ([Backup and restore](backup-restore.md#what-happens-to-push-notifications)).
- The test notification in Settings tells you whether the server can reach your device.

## The app cannot be installed or is not offline-capable

Open Settings → Installation: it names the browser it detected and says what that browser can do on the address you are using.

- **"Installs as: a shortcut / an app window"** over `http://<ip>:3100`: expected. Browsers offer the offline shell, the install button and notifications only on a secure address (HTTPS or `localhost`); over plain HTTP they can at most add a shortcut or an app window. See [what each address gives you](https.md#what-each-address-gives-you).
- **No install entry in the browser menu:** Firefox on desktop cannot install web apps, and in-app browsers (inside a chat app) have no "Add to Home Screen"; open the address in Safari, Chrome, Edge or Brave. Chrome shows the install button after a little interaction with the page, and not at all when the app is already installed.
- **HTTPS, but no install button and no offline use:** the certificate must be trusted by the device (a warning you clicked through does not count). With a local certificate authority the root has to be installed on each device ([details](https.md#option-4-a-local-certificate-authority-home-network-only)). `chrome://inspect`/DevTools → Application → Manifest lists what Chrome objects to.
- **"The browser refused the service worker" under Offline use** (Diagnostics: _Refused by the browser_): on an HTTPS address this means the browser does not trust the certificate. Install your local CA's root on the device, or use a publicly trusted certificate ([HTTPS guide](https.md#getting-an-https-address)).
- **"Getting ready" under Offline use:** reload the page once; the service worker takes control on the next load.
- **Installed over HTTP, later moved to HTTPS** (or the other way): the browser treats a different address as a different app. Install again from the address you intend to keep, and remove the old icon.

## Container names do not resolve

The container only sees the networks you attached. Add the network of the target service under `networks:` in `compose.yaml`, declare it as `external`, and `docker compose up -d`. `docker network ls` shows the exact network names. See [Reaching the services you monitor](install.md#reaching-the-services-you-monitor).

## Docker health shows nothing for my containers

Container states come from the system provider (Glances, see [glances.md](glances.md)). Check that the Glances container sees the Docker socket, that `sources.system.url` is reachable from Orbis Homelab, and that container names in `services.yaml` match exactly.

## Still stuck

Set `LOG_LEVEL=debug` in `.env`, recreate the container and read the log. Secrets are never logged. When reporting a problem, include the version (Settings or Diagnostics), the relevant log lines and your configuration with hosts and identities anonymised.
