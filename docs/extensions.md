# Extensions

Extensions add your own data sources, alerts, API routes and pages without forking Orbis Homelab. The core stays generic; an extension is a directory you drop next to your configuration.

> **Security.** A server extension runs **inside the Orbis Homelab process with its privileges**: it can read every secret the backend can resolve, make any network request and touch `/data`. Install only code you have read or trust. Extensions are never loaded unless you list them in `config.yaml`, and the extensions volume is mounted read-only.

## Layout

```
extensions/                 mounted at /extensions (read-only)
└── my-extension/           the extension id (a slug)
    ├── manifest.json       required
    ├── server.mjs          required: default export is the server extension
    ├── client.js           optional: bundle for the web app (ES module)
    └── client.css          optional
```

`manifest.json`:

```json
{
  "id": "my-extension",
  "apiVersion": 1,
  "client": { "script": "client.js", "style": "client.css" }
}
```

`client` is only needed when the extension has a web part; `style` is optional. The `id` must match the directory name and the `id` in `config.yaml`.

## Enable it

Mount the directory and list the extension in `config/config.yaml`:

```yaml
extensions:
  - id: my-extension
    enabled: true
    config: # free-form: validated by the extension itself
      interval: 60
      token: { env: MY_EXTENSION_TOKEN } # secrets: reference them, never inline
```

```yaml
# compose.yaml
volumes:
  - ./extensions:/extensions:ro
```

Restart the container to load it. An extension that is not listed (or has `enabled: false`) is never loaded: no collector, no route, no script sent to the browser.

If an extension fails to load or to register, the problem is reported in Diagnostics and as a warning alert; the rest of the application keeps running.

## Server contract

The authoritative contract is [`sdk/server.ts`](../sdk/server.ts) (API version 1). In short, `server.mjs` default-exports an object `{ id, apiVersion: 1, register(ctx) }`. The context gives the extension:

- its own `config` block, the instance `language` and a `log`;
- `secret(ref)`: resolves `{ env: NAME }` and `{ file: PATH }` references found in the config (files are read on every call);
- `http`: an HTTP client with timeouts and size limits (`getJson`, `requestJson`), whose errors never include request headers;
- `createCollector({ id, label, intervalMs, run })`: a background collector that the core starts, stops and reports in Diagnostics;
- `registerIntegration(...)`: attaches badges, metrics and alerts to a catalog service, like the built-in Radarr or qBittorrent adapters;
- `registerAlertRules(() => candidates)`: contributes alerts (stable ids, severity, text);
- `registerRoutes((app, helpers) => ...)`: mounts Fastify routes under `/api/x/<id>/`. The helpers tell you the caller's access level (`accessOf`), reject non-full callers (`requireFull`) and check same-origin JSON for `POST`s (`isSameOriginJson`).

Rules the core enforces: routes live only under `/api/x/<id>/`, the service worker never caches them, and the extension has no handle on core state.

Minimal `server.mjs`:

```js
export default {
  id: 'my-extension',
  apiVersion: 1,
  register(ctx) {
    ctx.registerRoutes((app) => {
      app.get('/ping', async () => ({ ok: true }));
    });
  },
};
```

In a TypeScript project, `defineServerExtension` and the types in `sdk/server.ts` give you checking; compile to a single `server.mjs`.

## Client contract

The web app exposes `window.__ORBIS__` before it loads any extension script. The bundle (served from `/extensions/<id>/client.js`, only when the server lists it in the session) calls `registerExtension(...)` once with its pages, Activity sections and messages. The contract is [`sdk/client-types.ts`](../sdk/client-types.ts):

- **pages**: an absolute route, title, description, icon and a React component. A page can be listed in Settings and in the command palette;
- **Activity sections**: ordered components rendered on the Activity page (and a reason for that page to exist);
- **messages**: per-language dictionaries for the extension's own texts.

Bundles share the host's React instance: build them with `react`, `react/jsx-runtime` and the SDK aliased to the globals the host provides, so nothing is duplicated.

## Versioning

`apiVersion` in the manifest and in the exported object must be the API version the running Orbis Homelab supports (1 today); see `EXTENSION_API_VERSION` in `sdk/server.ts`.

## Extensions written before the rename

The project was called Belvedere before 0.1.0 and a few extensions were built under that name. They keep working on Orbis Homelab without being rebuilt or edited:

- the web app still publishes the client contract as `window.__BELVEDERE__` (the very same object as `window.__ORBIS__`);
- `sdk/scripts/make-shims.mjs` still writes `belvedere-sdk-client.js` next to `orbis-sdk-client.js`, so a build script that aliases `@belvedere/sdk/client` to that file keeps building;
- the file layout of the repository that extensions link against (`sdk/`, `web/src`, `shared/`) is unchanged, and the extension `apiVersion` is still 1.

New extensions should use the current names (`window.__ORBIS__`, `orbis-sdk-client.js`). The old names are compatibility aliases, not a second contract: they stay as long as API version 1 does.
