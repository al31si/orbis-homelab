# Contributing

Thanks for helping. Orbis Homelab is deliberately small and generic: new code should keep it that way (no instance-specific names, hosts or personal data anywhere in the repository).

## Setup

Requirements: Node.js 22 and npm.

```sh
git clone https://github.com/al31si/orbis-homelab.git
cd orbis-homelab
npm ci
```

The repository is an npm workspace: `server` (backend, Fastify), `web` (PWA, React + Vite), `sdk` (extension contracts) and `shared` (the API contract between backend and web, types only: `shared/api.ts`).

Run it for development with an instance directory outside the repository:

```sh
mkdir -p /tmp/orbis-homelab-dev/config /tmp/orbis-homelab-dev/data
cp config.example.yaml /tmp/orbis-homelab-dev/config/config.yaml
cp services.example.yaml /tmp/orbis-homelab-dev/config/services.yaml

CONFIG_DIR=/tmp/orbis-homelab-dev/config DATA_DIR=/tmp/orbis-homelab-dev/data npm run dev:server
npm run dev:web      # Vite dev server, proxies /api to the backend
```

## Scripts

| Command                         | What it does                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check`          | Prettier check (`npm run format` fixes)                                                                                |
| `npm run lint`                  | ESLint                                                                                                                 |
| `npm run typecheck`             | TypeScript, backend, web and SDK scripts                                                                               |
| `npm test`                      | Vitest, backend, web and SDK scripts                                                                                   |
| `npm run build`                 | Production build of web and server                                                                                     |
| `npm run licenses:check`        | Production dependency licences are allowed and `THIRD_PARTY_NOTICES.md` is current (`npm run licenses` regenerates it) |
| `scripts/test-clean-install.sh` | End-to-end test of the Docker image on a clean install (needs only Docker)                                             |

CI runs all of them, plus a multi-architecture Docker build that is exported and inspected (`scripts/verify-oci.mjs`), never pushed. Run them before opening a pull request.

## Code

- Strict TypeScript, no `any` without a reason, no dead code, no mocks or fixtures in product code.
- Small, focused modules. Real logic (configuration validation, feature gating, derivations, security rules) has tests; tests use neutral names (`example.com`, `media-server`, `nas`) and no real hostnames, addresses or personal data.
- The configuration schema (`server/src/config/schema.ts`) is the single source of truth for `config.yaml` and `services.yaml`. Changing it means updating `config.example.yaml`, `services.example.yaml`, `docs/configuration.md` and the example tests (`server/src/__tests__/examples.test.ts` validates every optional block of the example file).
- The API contract is `shared/api.ts`. Backend and web import it; change it deliberately and update both sides.
- A feature that is not configured must not exist: no collector, no request, no alert, no page, no error. Anything new needs feature detection (see `docs/ARCHITECTURE.md`).
- Security rules in the architecture document are not optional: no secret in code, logs or responses; outbound requests of built-in integrations are `GET` with timeouts (the extension SDK is the only place that may send `POST`); no Docker socket.

## Internationalisation

Orbis Homelab has two languages, Italian (`it`) and English (`en`), chosen per instance by `app.language`. Every user-visible string must exist in both.

- **Web:** `import { t, useT } from '@/i18n'`. Dictionaries are in `web/src/i18n/messages/{it,en}/<area>.ts`, one file per area (`common`, `shell`, `ui`, `home`, `services`, `system`, `storage`, `activity`, `more`, `diagnostics`, `palette`). Keys must start with the area name (`home.title`). `it` defines the keys and the parameter types; `en` is typed against it, so a missing key is a compile error. Use function messages for parameters and plurals.
- **Backend:** `createTranslator` from `server/src/i18n`; dictionaries in `server/src/i18n/{it,en}/<area>.ts` (areas: `alerts`, `services`, `integrations`, `push`, `http`). Everything the server generates for people (alert titles, events, push text, integration badges, API errors) goes through it.
- English is native UI copy: concise, sentence case, no literal translation of the Italian. Italian text lives only in the `it` dictionaries.
- Service names, descriptions, category labels and links are user text and are never translated.

Adding a language means adding a dictionary per area on both sides, extending the language union in `shared/api.ts` and `shared/i18n.ts`, and the `app.language` enum in the schema.

## Adding an integration

Integrations attach data to a catalog service (`integration: { type, url, secret? }`).

1. Add the type to `INTEGRATION_TYPES` in `server/src/config/schema.ts`.
2. Implement the adapter in `server/src/integrations/`, following the existing ones: `GET` only, through the shared HTTP client (timeouts, size limits), credentials only from the resolved secret, no secret in errors. It returns badges, metrics and alert candidates.
3. Default credential: `<TYPE>_API_KEY` (document the exception if any). Missing credential means "not configured", never an error.
4. Add its texts to the backend dictionaries (`integrations`, `alerts`) in both languages.
5. If it feeds the Activity page, extend `shared/api.ts` and add the section to the web app, hidden when the integration is absent.
6. Add tests for the parsing and the alert rules, a line in `.env.example`, and a row in `docs/configuration.md`.

If the integration is niche, prefer an [extension](docs/extensions.md) kept outside the core.

## Adding a provider

Providers hide a data source behind a stable output shape: the web app never knows which one is used.

- **System provider** (`sources.system`): implement the provider interface in `server/src/sources/provider.ts` and add its `type` to the schema. It must produce the same `SystemInfo`, containers and filesystems whatever the backend.
- **Usage provider** (`sources.usage`): a new `parser` next to `weekly-quota`, with the document format described in `docs/usage-providers.md`.
- **Storage / SMART:** the report format is documented in `docs/smart-report.md`; keep it backward compatible.

Every new key needs schema validation with a clear message, an optional block in `config.example.yaml`, documentation, and tests.

## Pull request checklist

- [ ] `npm run format:check`, `lint`, `typecheck`, `test`, `build` pass.
- [ ] `scripts/test-clean-install.sh` passes if you touched the Dockerfile, startup, routes or configuration loading.
- [ ] New strings exist in Italian and English.
- [ ] Docs and examples are updated; the example tests pass.
- [ ] No secrets, personal data, real hostnames or addresses in code, tests, docs or fixtures.
- [ ] Nothing is added that runs or appears when its source is not configured.
- [ ] Behaviour changes that affect configuration, state or the extension API are described in the pull request.

## License

By contributing you agree that your contributions are licensed under the [Apache License 2.0](LICENSE).

## Licensing of contributions

Orbis Homelab is licensed under the Apache License 2.0. Unless you state otherwise, a contribution you submit is licensed under the same terms (section 5 of the license). Do not contribute code, icons, fonts or images that you did not create or that are not under a licence compatible with Apache-2.0, and say where third-party material comes from. A new production dependency needs an allowed licence (`npm run licenses:check`) and a justification: the project keeps its dependency list short on purpose.
