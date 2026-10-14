# Installing the app and getting HTTPS

Orbis Homelab works over plain HTTP (`http://192.168.1.50:3100`). HTTPS is **not required** to use the dashboard, and most browsers can still open it as an app window. HTTPS is what unlocks the rest. This page says exactly what each address gives you and, when you want more, how to get a secure address with the tools you may already have.

- [What each address gives you](#what-each-address-gives-you)
- [Installing from a plain HTTP address](#installing-from-a-plain-http-address)
- [Installing from an HTTPS address](#installing-from-an-https-address)
- [Getting an HTTPS address](#getting-an-https-address): [Tailscale](#option-1-tailscale-serve), [your reverse proxy](#option-2-a-reverse-proxy-you-already-run), [Caddy with a domain](#option-3-caddy-with-a-domain-name), [a local CA](#option-4-a-local-certificate-authority-home-network-only), [localhost](#option-5-localhost-on-one-computer)
- [Offline use and notifications](#offline-use-and-notifications)
- [Checking that it works](#checking-that-it-works)

## What each address gives you

A browser calls an address a _secure context_ when it is served over HTTPS, or when it is `localhost` / `127.0.0.1`. The service worker (offline shell, updates), the install dialog and Web Push exist **only** in a secure context; there is no setting, flag or configuration of Orbis Homelab that changes that.

| Address                                                        | Dashboard | Installs as                                                               | Offline shell | Notifications                            |
| -------------------------------------------------------------- | --------- | ------------------------------------------------------------------------- | ------------- | ---------------------------------------- |
| `http://192.168.1.50:3100` (plain HTTP on the LAN)             | yes       | Depends on the browser: an app window, a shortcut, or nothing (see below) | no            | no                                       |
| `https://orbis.example.com` or any other HTTPS address         | yes       | A full app (own window and icon) where the browser can install apps       | yes           | yes, with full access and `push.enabled` |
| `http://localhost:3100` (on the machine that runs the browser) | yes       | A full app                                                                | yes           | yes                                      |

Settings → Installation shows the same information for the browser you are using, live: what it installs as, whether the offline shell is ready, whether notifications can work, and the next step.

`publicUrl` in `config.yaml` is **optional**. You never need it when you already open Orbis Homelab over HTTPS: the app works from whatever address the browser used. Set it only if you have an HTTPS address and want people who open the plain-HTTP address to get a link to it in Settings. Only `https://` addresses are offered.

## Installing from a plain HTTP address

What exists depends on the browser, and Settings → Installation only shows what your browser offers. Menu names change with language and version. The entries below are documented by the vendors and were also found in the menu strings of Brave 1.97 and Microsoft Edge 155 (Chromium 155). Older versions offered **Create shortcut… → Open as window**; it was not found in those menus, so it is not listed.

| Browser                                              | What you can do over plain HTTP                                                                                                                                                                         | Result                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Chrome, Edge, Brave (desktop)                        | Chrome: menu → Cast, save, and share → **Install page as app…**. Edge: Settings and more → More tools → Apps → **Install this site as an app**. Brave: menu → Save and share → **Install page as app…** | An app window. No offline shell, no notifications           |
| Chrome, Samsung Internet (Android)                   | Menu → **Add to Home screen** / **Create shortcut**                                                                                                                                                     | A shortcut; it opens in the browser. A real app needs HTTPS |
| Other Android browsers                               | Menu → **Add to Home screen**                                                                                                                                                                           | A browser-badged shortcut                                   |
| Safari on iPhone and iPad                            | Share → **Add to Home Screen** (keep **Open as Web App** on)                                                                                                                                            | Opens as an app; offline shell and notifications need HTTPS |
| Chrome, Edge, Firefox on iPhone and iPad (iOS 16.4+) | Share → **Add to Home Screen**                                                                                                                                                                          | Same as Safari                                              |
| Safari on Mac (macOS Sonoma 14, Safari 17)           | File → **Add to Dock…**                                                                                                                                                                                 | An app in the Dock                                          |
| Firefox (desktop)                                    | Not possible: Firefox does not install web apps on desktop                                                                                                                                              | Bookmark it or pin the tab                                  |
| In-app browsers (inside a chat or social app)        | Not possible: open the address in your real browser first                                                                                                                                               | -                                                           |

The page never shows an "Install" button over HTTP: the browser's install event does not fire there, so such a button could not work. On HTTP the steps are described, not triggered.

## Installing from an HTTPS address

Open the HTTPS address and Settings → Installation shows an **Install** button when the browser fires its install event (Chrome, Edge, Brave and most Chromium browsers). On iPhone/iPad and Safari on Mac it shows the Share steps, because those browsers have no install event.

Requirements that Orbis Homelab already meets: a web manifest with name, icons (192 and 512 px, maskable), `start_url`, `display: standalone`, and a service worker. Chrome also wants a little interaction with the page before offering the button, so it may appear a few seconds after you start using it.

## Getting an HTTPS address

Orbis Homelab does not ship a TLS stack, does not ask for your domain and never reaches out to a certificate authority. HTTPS is something you put in front of it with a tool you choose. Pick the first option that applies to you.

> Whatever you choose, publish the Orbis container only to the proxy where you can (see the comments in `compose.yaml`) and read [Access modes](configuration.md#access-modes): a proxy changes the address requests come from, so with `trusted-network` make sure the proxy's address is **not** inside the trusted range unless you want everyone behind it to have full access.

### Option 1: Tailscale Serve

Best if your phone and computers are already on your tailnet and you only need access from there. The address is private to your tailnet (it is not exposed to the internet) and the certificate is a real one, so no device needs to be configured.

Requirements: MagicDNS and **HTTPS Certificates** enabled in the Tailscale admin console (DNS page); the Tailscale client on the Orbis host and on every device.

Check what is already served on the host, then choose an HTTPS port that is **not** in the list:

```sh
tailscale serve status
tailscale serve --bg --https=8443 3100
```

`3100` is the port Orbis Homelab listens on on the host (`ORBIS_PORT`). Your address is then `https://<host>.<tailnet>.ts.net:8443`. Add it as `publicUrl` if you want the link in Settings.

`tailscale serve --https=<port>` only affects that port; `tailscale serve reset` removes the **entire** Serve configuration of the node, including things other services depend on, so do not run it unless you know it is only yours. To remove only this one: `tailscale serve --https=8443 off`.

### Option 2: A reverse proxy you already run

If you run Caddy, Nginx Proxy Manager, Traefik, nginx or similar with HTTPS already working, add Orbis Homelab like any other service: forward your hostname to the Orbis container (or `host:3100`). Nothing in Orbis Homelab is specific to a proxy; it only needs the usual forwarded headers if you use [`identity-proxy`](configuration.md#access-modes).

nginx example:

```nginx
server {
    listen 443 ssl;
    server_name orbis.example.com;
    # ssl_certificate / ssl_certificate_key as for your other sites
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option 3: Caddy with a domain name

Best if you own a domain (or have a free dynamic-DNS name) and want a certificate that every device trusts without setup. [Caddy](https://caddyserver.com/docs/automatic-https) requests and renews certificates by itself.

If Orbis Homelab is reachable from the internet only through Caddy you need a DNS record for the name pointing at your IP, and ports 80 and 443 forwarded to Caddy (for the HTTP-01 challenge). If you do not want to expose anything, use a DNS challenge with a Caddy build that includes your DNS provider's module (see Caddy's documentation): then the name can resolve to a private address.

```caddyfile
orbis.example.com {
    reverse_proxy orbis-homelab:3100
}
```

Run Caddy in the same Compose network as Orbis, or point `reverse_proxy` at `host:3100`.

### Option 4: A local certificate authority (home network only)

For a network that is never exposed and where you do not want a domain: create a private certificate authority, issue a certificate for the host name, and **install the authority's root certificate on every device**. [Caddy's internal CA](https://caddyserver.com/docs/automatic-https#local-https) (`tls internal`) and [mkcert](https://github.com/FiloSottile/mkcert) do this.

Be clear about the cost: until a device trusts your root certificate it shows a security warning, and clicking through that warning does **not** make the connection a secure context for installation. Each device needs the root installed once (and again if it expires or you change it):

- Desktop browsers: import it in the operating system or browser certificate store (mkcert does this on the machine where you run `mkcert -install`).
- iPhone and iPad: send yourself the `.crt`/`.pem`, install the profile in Settings, then enable it under Settings → General → About → **Certificate Trust Settings**.
- Android: install it as a CA certificate in the security settings; Chrome accepts it, apps that ignore user certificates do not.
- Never share the root key (`rootCA-key.pem`); anyone who has it can impersonate any site to your devices.

Orbis Homelab does not generate or install certificates for you and will never ask you to disable browser security checks.

### Option 5: `localhost` on one computer

Browsers treat `http://localhost` and `http://127.0.0.1` as secure contexts without TLS. If you only need it on one computer, an SSH tunnel is enough:

```sh
ssh -L 3100:127.0.0.1:3100 user@server
```

and open `http://localhost:3100`. It is not reachable from other devices.

## Offline use and notifications

Both need a secure context (above) plus:

- **Offline shell:** nothing to configure. After the first visit over HTTPS the service worker caches the app shell; Settings → Installation shows "Ready" once it is active. Without a connection the app opens and shows the shared (limited) data it last had; private data is never cached (see [what the browser keeps](ARCHITECTURE.md#what-the-browser-keeps)).
- **Notifications:** `push.enabled: true` with a `subject` in `config.yaml` ([push settings](configuration.md#push)), **full access** for the device, then turn them on in Settings → Notifications. On iPhone and iPad the app must first be added to the Home Screen and opened from there (an Apple requirement). Brave needs an extra browser setting first: see [the browser push service is unreachable](troubleshooting.md#the-browser-push-service-is-unreachable).

## Checking that it works

Open Settings → Installation (Diagnostics shows the same facts in detail):

- **Installs as** tells you what the steps produce (a full app, an app window, a shortcut or nothing).
- **Offline use** goes to _Ready_ when the service worker is active; _Getting ready_ means reload once.
- **Notifications** says whether the address, the browser and the server allow them.
- In Chromium browsers, DevTools → Application → _Manifest_ lists installability problems; `chrome://serviceworker-internals` shows registered workers.

If something is off, see [Troubleshooting](troubleshooting.md#the-app-cannot-be-installed-or-is-not-offline-capable).
