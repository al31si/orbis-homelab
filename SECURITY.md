# Security policy

## Supported versions

Orbis Homelab is at version 0.x. Security fixes are released for the latest release only; older versions do not receive fixes, so update to the newest release (see [docs/update.md](docs/update.md)). From `1.0.0` the latest minor version of the latest major version is supported.

## Reporting a vulnerability

Please **do not open a public issue** for a vulnerability. Use GitHub's private vulnerability reporting: open the **Security** tab of the repository and choose **Report a vulnerability**. Include the version, the configuration involved (with secrets and hosts removed), and steps to reproduce.

You can expect an acknowledgement within a few days and a fix or a mitigation plan as soon as it is understood. Please allow time for a release before disclosing details publicly.

## Security model

Orbis Homelab is a dashboard for a network you control. Its built-in integrations only read from your services; extensions are an exception (see below).

- **Credentials stay in the backend.** API keys and tokens come from the environment or from files, are never part of the web bundle, API responses, logs or error messages, and the YAML schema has no field in which to write one.
- **No accounts.** The backend assigns each request an access level, `limited` or `full`. `limited` withholds private details (for example task titles and playback sessions) and disables push. `full` shows everything.
- **`limited` is the default.** `full` has to be configured:
  - `trusted-network`: everybody who can reach the port is trusted.
  - `identity-proxy`: only requests that come from a trusted proxy address (and, optionally, the trusted port) **and** carry an allowed identity header. Identity headers from any other source are ignored.
- **Outbound requests** of the built-in integrations and providers are `GET`, with timeouts and size limits. Orbis Homelab itself has no Docker socket access; the optional Glances container does (see below). This does **not** apply to extensions: the extension SDK offers an HTTP client that can also send `POST` requests.
- **Mutating requests** (push subscription) require full access, a JSON body and a same-origin `Origin`.
- **Hardened container:** non-root user, read-only filesystem, no Linux capabilities, `no-new-privileges`, resource limits. Strict content security policy, no inline script.
- **Extensions run in-process** with the privileges of the backend. They are only loaded when listed in `config.yaml`. Install only extensions you trust.

## Deployment advice

- **Do not expose Orbis Homelab directly to the Internet.** If it must be reachable from outside your network, put an identity-aware reverse proxy (or a VPN) in front of it, use `access.mode: identity-proxy`, and publish the container port only to the proxy. Make the proxy overwrite the identity header on every request.
- **`trusted-network` caveats.** It gives full access to anyone who can open the port: every device on that network, every container that can reach it, anyone who joins your Wi-Fi, and anything that can forward requests to it (a port forward, a tunnel, a misconfigured firewall). Use it only when that audience is acceptable. When in doubt, use `limited`.
- Serve it over HTTPS (needed for installation and push) and set `publicUrl`.
- Protect `.env` and `data/`: `chmod 600 .env`, keep both out of version control and out of unencrypted backups. `data/vapid.json` holds the Web Push private key.
- Use read-only credentials for integrations where the application allows it, and rotate a key if it may have leaked.
- **Glances is a separate, more privileged container.** The optional system provider needs the Docker socket (mounting it `:ro` does not restrict the Docker API: a compromised Glances container is a compromised host) and its web server has no authentication. Orbis Homelab's protections do not extend to it. Do not publish its port, keep it on the Compose network of Orbis Homelab only, avoid `pid: host`, mount only the folders you need, and read [docs/glances.md](docs/glances.md).
- Update regularly ([docs/update.md](docs/update.md)) and pin an exact version if you want control over when.
