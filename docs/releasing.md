# Releasing

This page describes how images are tagged, what a release contains and how to publish one. Verification and publishing are separate: the CI workflow (`ci.yml`) only checks and builds, it never logs in to a registry, pushes an image or creates a release. Publishing is the manual workflow `release.yml` (or the equivalent commands below), started by a maintainer.

## Image

`ghcr.io/al31si/orbis-homelab`, multi-architecture (`linux/amd64` and `linux/arm64`) under one tag.

## Tags

| Tag           | Meaning                                                        | Moves?                   |
| ------------- | -------------------------------------------------------------- | ------------------------ |
| `X.Y.Z`       | A release, for example `0.1.0`                                 | Never                    |
| `X.Y`         | The newest patch of that minor, for example `0.1`              | With each patch          |
| `X`           | The newest release of that major, from `1.0.0` on              | With each minor/patch    |
| `latest`      | The newest **stable** release. Never a pre-release             | With each stable release |
| `sha-<short>` | A CI build of a commit (first 7 characters of the commit hash) | Never                    |

Pre-releases (`1.5.0-rc.1`) get only their exact tag. There is no `X` tag for `0.x`: a `0.x` line makes no promise of compatibility between minors. Semantic versioning applies from `1.0.0`; during `0.x` a minor version may change the configuration format or the extension API, and the release notes say so.

## What a release contains

The Compose file and the example configuration are read by the user's tooling and by the user, so they are part of the release, not of `main`:

- the git tag `vX.Y.Z` holds `compose.yaml`, `config.example.yaml`, `services.example.yaml` and `.env.example` that match the image `X.Y.Z`;
- the Quick Start in `README.md` and `docs/install.md` downloads them from `.../al31si/orbis-homelab/vX.Y.Z/...` and writes `ORBIS_VERSION=X.Y.Z` into `.env`; `compose.yaml` has no default version, so the image can never be older or newer than the files by accident;
- documents never point at `main` for something that is installed, and never at `latest` together with files from another ref;
- the GitHub Release carries the same four files and a `SHA256SUMS`, with `docs/release-notes/X.Y.Z.md` as its notes.

## Build

Locally, for the current machine:

```sh
docker build -t orbis-homelab:dev .
```

Both architectures, without emulation (the Dockerfile runs every build step on the build machine and only copies files into the target image, because all production dependencies are pure JavaScript). Export to a file to inspect the result without pushing:

```sh
docker buildx create --name orbis-oci --driver docker-container   # once
docker buildx build --builder orbis-oci --platform linux/amd64,linux/arm64 \
  --build-arg VERSION=0.1.0 --build-arg REVISION=$(git rev-parse HEAD) \
  --output type=oci,dest=orbis-homelab-oci.tar .
node scripts/verify-oci.mjs orbis-homelab-oci.tar 0.1.0
```

`verify-oci.mjs` checks the platforms, the OCI labels (`title`, `licenses`, `source`, `version`), the non-root user, that the application files and the licence files are present and that no layer contains a native executable of the wrong architecture. **It does not run the image.** The `arm64` image is therefore built and inspected, never executed, by this repository's automation (QEMU is not used); only `amd64` runs in the clean-install test. State this in the release notes until an `arm64` run has been done on real hardware.

The build arguments only set the OCI labels (`org.opencontainers.image.version`, `.revision`, `.source`); the version shown in the application comes from `server/src/version.ts`.

Targets: `runtime` (default: backend and web app) and `server` (backend only).

## Checklist

1. `npm ci && npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run licenses:check`.
2. `scripts/test-clean-install.sh` passes on a machine with only Docker (the CI job `clean-install` runs it). It also starts two installations from the shipped files and checks the default access level.
3. The version is the same everywhere: `server/src/version.ts`, the four `package.json` files, `package-lock.json`, the Quick Start (`VERSION=` in `README.md`, `docs/install.md`, `compose.yaml`) and `docs/release-notes/X.Y.Z.md` exists. A test (`examples.test.ts`) and the first step of `release.yml` check it.
4. `THIRD_PARTY_NOTICES.md` is current (`npm run licenses` regenerates it; `npm run licenses:check` is part of CI).
5. Run `release.yml` with **`dry_run` on** (the default) on the commit to release and read the result.
6. Publish: run `release.yml` again with `dry_run` off, or by hand (below).

## Publishing `0.1.0` (not done yet)

Nothing has been published: the repository is private, no image exists on GHCR and there is no release. When the owner approves publication:

1. Make the repository public (Settings, General, Danger Zone) if it should be. Check **Settings, Code security**: enable _Private vulnerability reporting_, because `SECURITY.md` tells people to use it.
2. Actions tab, **Release (manual)**, `version` = `0.1.0`, `dry_run` on: it must be green.
3. Run it again with `dry_run` off. It builds and pushes `ghcr.io/al31si/orbis-homelab:0.1.0`, `:0.1` and `:latest`, tags `v0.1.0` on the commit and creates the GitHub Release with the four files and `SHA256SUMS`.
4. The first push of a GHCR package is **private** by default: open the package settings (Packages, `orbis-homelab`) and set its visibility to _Public_, and link it to the repository. Until then `docker compose pull` fails for everybody else.
5. Verify as a user would, on a machine without a checkout: the Quick Start of the README on a clean directory, `docker compose pull`, `docker compose up -d`, healthy, `http://<host>:3100` answers and the Settings page shows access `limited`. Check `docker buildx imagetools inspect ghcr.io/al31si/orbis-homelab:0.1.0` lists both platforms.

By hand instead of `release.yml` (after `docker login ghcr.io`):

```sh
docker buildx build --builder orbis-oci --platform linux/amd64,linux/arm64 \
  --build-arg VERSION=0.1.0 --build-arg REVISION=$(git rev-parse HEAD) \
  --build-arg SOURCE=https://github.com/al31si/orbis-homelab \
  -t ghcr.io/al31si/orbis-homelab:0.1.0 -t ghcr.io/al31si/orbis-homelab:0.1 -t ghcr.io/al31si/orbis-homelab:latest \
  --push .
git tag -a v0.1.0 -m "Orbis Homelab 0.1.0" && git push origin v0.1.0
gh release create v0.1.0 compose.yaml config.example.yaml services.example.yaml .env.example \
  --title "Orbis Homelab 0.1.0" --notes-file docs/release-notes/0.1.0.md
```

Later releases: update the version everywhere (checklist item 3), add `docs/release-notes/X.Y.Z.md`, and repeat. Move `latest`, `X` and `X.Y` only for stable releases.
