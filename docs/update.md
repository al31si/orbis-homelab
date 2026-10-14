# Updating

Updating replaces the image. Your instance (`config/`, `.env`, `data/`, `extensions/`) lives outside it and is never touched.

## Update with Compose

An update changes the image **and** the files that go with it. Choose the new version, bring the example files of that release next to your configuration to see what changed, then set it:

```sh
VERSION=X.Y.Z   # the new release
BASE=https://raw.githubusercontent.com/al31si/orbis-homelab/v$VERSION
curl -fsSL $BASE/compose.yaml -o compose.yaml            # keep your own edits: diff first
curl -fsSL $BASE/config.example.yaml -o config.example.yaml
sed -i "s/^ORBIS_VERSION=.*/ORBIS_VERSION=$VERSION/" .env
docker compose pull
docker compose up -d
docker compose ps        # wait for "healthy"
docker compose logs --tail 50 orbis
```

`config.example.yaml` is only a reference (`diff config.example.yaml config/config.yaml` shows new options); your `config/` is never overwritten. Open the app on a device where it is installed: the service worker downloads the new app shell in the background and the app switches to it (reload or relaunch the app if it still shows the old version).

## From 0.1.0 to 0.2.0

No configuration change is required: `config.yaml`, `services.yaml`, `.env`, `data/` and extensions work as they are, and push keys and subscriptions in `data/` are read as before. Follow [Update with Compose](#update-with-compose) with `VERSION=0.2.0`. What you will notice:

- **Settings → Installation** is rewritten. It names what your browser can do on the address you are using (full app, app window, shortcut or nothing), shows the steps for it, and says plainly that offline use and notifications need HTTPS. See [Installing the app and getting HTTPS](https.md).
- **`publicUrl`** is optional and only an `https://` address is offered as a link in Settings. A value starting with `http://` still loads, is ignored and is mentioned in the startup log. You never need it when you already open Orbis over HTTPS.
- **Installed apps update by themselves**: the service worker downloads the new version and Settings offers **Update**. The address, the push subscriptions and the data stay. Notifications that already worked keep working; if the browser refuses the push service (Brave without its Google push setting) see [the browser push service is unreachable](troubleshooting.md#the-browser-push-service-is-unreachable).
- The `scripts/test-clean-install.sh` of a checkout refuses to run on a host that already has a Compose project named `orbis-homelab` (it would recreate it).

Roll back as described in [Roll back](#roll-back): set `ORBIS_VERSION=0.1.0`; the data written by 0.2.0 is the same format.

## Choosing a version

`compose.yaml` pulls `ghcr.io/al31si/orbis-homelab:$ORBIS_VERSION` and has no default: set it in `.env` to the release of your `compose.yaml` and example files.

| Value    | Follows                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------- |
| `1.2.3`  | Exactly that release (recommended: the same one as the files you downloaded)                          |
| `1.2`    | The newest `1.2.z`: fixes only, no change to the configuration                                        |
| `1`      | The newest `1.x.y`: new features and fixes, no breaking changes                                       |
| `latest` | The newest stable release. Convenient for a trial, but it can be newer than your compose and examples |

Pin an exact version in production if you want to decide when to update. Tags are described in [releasing.md](releasing.md).

## Before updating

- Read the release notes of the versions you skip: a new version can make configuration stricter or rename a key. Because the configuration is validated at startup, a problem is reported immediately with the file and the field, and the container does not run with a half-understood configuration.
- Back up `config/`, `.env` and `data/` ([Backup and restore](backup-restore.md)). It takes seconds.

## Roll back

Set `ORBIS_VERSION` to the previous exact version and run `docker compose up -d`. State in `data/` is forward-compatible within a major version; if a release notes entry says otherwise, restore the backup you made before updating.

## Updating a build from source

```sh
git pull
docker compose up -d --build
```

## Updating extensions

Extensions are files in `extensions/`, versioned by you. After replacing one, run `docker compose restart orbis`. An extension that fails to load is reported in Diagnostics and as a warning alert; the rest of the app keeps running. Check that the extension supports the API version of the new release.
