/* Service worker (hand written, no Workbox).
 *
 * - The build id and precache list are injected at build time by the Vite plugin in
 *   vite.config.ts; in development this file is never registered. The instance marker is replaced
 *   by the server when it serves this file.
 * - Shell: precached, versioned cache, cache-first. Navigations are network-first (the server
 *   renders index.html per instance) and fall back to the stored index.html. Branding, manifest
 *   and extension bundles (/icons, /splash, /branding, /extensions) are network-first as well.
 * - /api/* GET: network-first (4 s timeout) with the last cached response as fallback.
 *   /api/session, /api/push/*, /api/health and extension routes (/api/x/*) are never cached,
 *   non-GET requests are never intercepted.
 * - Updates: a new worker waits until the page posts SKIP_WAITING.
 */

const BUILD_ID = '__BUILD_ID__';
const PRECACHE_URLS = /*__PRECACHE_URLS__*/ [];

// Replaced by the server for each instance (cache prefix from app.id, texts in the instance
// language). The static bundle keeps these neutral defaults.
// prettier-ignore
const INSTANCE = /*__SW_INSTANCE__*/ { cachePrefix: 'orbis-homelab-', offlineText: 'Offline', notificationTitle: 'Orbis Homelab' };

const CACHE_PREFIX = INSTANCE.cachePrefix;
const SHELL_CACHE = `${CACHE_PREFIX}shell-${BUILD_ID}`;
const API_CACHE = `${CACHE_PREFIX}api-v1`;
const API_TIMEOUT_MS = 4000;
const API_UNCACHED = [
  /^\/api\/x(\/|$)/,
  /^\/api\/session(\/|$)/,
  /^\/api\/push(\/|$)/,
  /^\/api\/health(\/|$)/,
];
const NAVIGATION_TIMEOUT_MS = 3000;
const INSTANCE_ASSETS = /^\/(icons|splash|branding|extensions)\/|^\/manifest\.webmanifest$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))),
      ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, API_CACHE]);
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && !keep.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_VERSION' && event.source) {
    event.source.postMessage({ type: 'VERSION', buildId: BUILD_ID });
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    if (API_UNCACHED.some((re) => re.test(url.pathname))) return;
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Branding, manifest and extension bundles belong to the instance, not to this build.
  if (INSTANCE_ASSETS.test(url.pathname)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(appShell(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

/**
 * The server renders index.html per instance (boot config included), so a navigation asks the
 * network first and keeps the answer as the offline shell; the precached copy is the fallback.
 */
async function appShell(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS);
    if (response.ok) {
      cache.put('/index.html', response.clone());
      return response;
    }
  } catch {
    /* unreachable: use the stored shell */
  }
  const cached = await cache.match('/index.html');
  return (
    cached ||
    new Response(INSTANCE.offlineText, {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    cache.put(request, response.clone());
  }
  return response;
}

function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetchWithTimeout(request, API_TIMEOUT_MS);
    if (response.ok) {
      cache.put(request, response.clone());
      return response;
    }
    // A BFF outage surfaces as a gateway error from the proxy in front of it.
    if (response.status >= 502 && response.status <= 504) {
      return (await fromCache(cache, request)) || response;
    }
    return response;
  } catch (error) {
    const cached = await fromCache(cache, request);
    if (cached) return cached;
    throw error;
  }
}

/** Serves the stored response, flagged so the app knows it is not live data. */
async function fromCache(cache, request) {
  const cached = await cache.match(request);
  if (!cached) return null;
  const headers = new Headers(cached.headers);
  headers.set('X-Orbis-From-Cache', '1');
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers,
  });
}

/* ------------------------------------------------------------------- push */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  // Browsers (iOS in particular) require every push to display something.
  const title =
    typeof payload.title === 'string' && payload.title ? payload.title : INSTANCE.notificationTitle;
  const options = {
    body: typeof payload.body === 'string' ? payload.body : '',
    tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: typeof payload.url === 'string' ? payload.url : '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || '/',
    self.location.origin,
  );
  // Never navigate outside the app origin from a notification payload.
  const href = target.origin === self.location.origin ? target.href : self.location.origin + '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.focus();
        if ('navigate' in existing) await existing.navigate(href).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(href);
    })(),
  );
});
