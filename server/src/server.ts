import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import Fastify, {
  LogController,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import type {
  ActivityInfo,
  BootConfig,
  FeatureFlags,
  PushConfig,
  Session,
} from '../../shared/api.js';
import type { RouteHelpers } from '../../sdk/server.js';
import { createAccessPolicy, isSameOriginJson, resolveAccess } from './access.js';
import type { Config, Env } from './config/schema.js';
import type { ControlCenterApi } from './core/control-center-api.js';
import type { Access } from './core/types.js';
import type { ExtensionHost } from './extensions/host.js';
import type { T } from './i18n/index.js';
import { createPwa } from './pwa/pwa.js';
import { registerPwaRoutes } from './pwa/routes.js';
import { type PushService, parseSubscription } from './push.js';
import { VERSION } from './version.js';

export interface ServerDeps {
  env: Env;
  config: Config;
  core: ControlCenterApi;
  /** null when `push.enabled` is false: the subscribe/unsubscribe/test routes do not exist. */
  push: PushService | null;
  extensions: ExtensionHost;
  t: T;
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

/** Stable machine-readable `error` codes of API failures (the `message` is translated). */
const ERROR_CODES = {
  forbidden: 'forbidden',
  notFound: 'not found',
  sameOriginJson: 'json same-origin only',
  invalidSubscription: 'invalid subscription',
  tooManySubscriptions: 'too many subscriptions',
  invalidBody: 'invalid body',
} as const;
type ErrorName = keyof typeof ERROR_CODES;

const EMPTY_ACTIVITY: ActivityInfo = {
  events: [],
  usage: [],
  tasks: null,
  downloads: null,
  mediaQueue: null,
  playback: null,
};

export function buildApp(deps: ServerDeps): {
  app: FastifyInstance;
  /** Starts the public listener and, when configured, the trusted one. */
  listen: () => Promise<void>;
} {
  const { env, config, core, push, extensions, t } = deps;
  const policy = createAccessPolicy(config.access);
  const trustedPort =
    config.access.mode === 'identity-proxy'
      ? (config.access.identityProxy.trustedPort ?? null)
      : null;

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    // Polling clients would flood the log: only failures and mutations are logged (see hook below).
    logController: new LogController({ disableRequestLogging: true }),
    trustProxy: false,
  });

  const accessOf = (req: FastifyRequest): Access => resolveAccess(req.raw, policy);
  const apiError = (name: ErrorName) => ({
    error: ERROR_CODES[name],
    message: t(`http.error.${name}`),
  });
  const deny = (reply: FastifyReply, status: number, name: ErrorName): FastifyReply =>
    reply.code(status).send(apiError(name));

  const features = (): FeatureFlags => {
    const base = core.features();
    return { ...base, activity: base.activity || extensions.hasActivity() };
  };
  const bootConfig = (): BootConfig => {
    const appInfo = core.app();
    return {
      app: { ...appInfo, description: appInfo.description || t('http.app.description') },
      features: features(),
      extensions: extensions.refs(),
    };
  };
  const session = (access: Access): Session => ({
    ...bootConfig(),
    access: access.level,
    accessMode: config.access.mode,
    user: access.user,
    version: VERSION,
    startedAt: core.startedAt.toISOString(),
    secureUrl: config.publicUrl ?? null,
    integrations: core.integrationsInfo(),
  });

  /** Common guard of the mutating push routes: full access, same-origin JSON. */
  const pushGuard = (req: FastifyRequest, reply: FastifyReply): FastifyReply | null => {
    if (accessOf(req).level !== 'full') return deny(reply, 403, 'forbidden');
    if (!isSameOriginJson(req.raw)) return deny(reply, 400, 'sameOriginJson');
    return null;
  };

  app.addHook('onResponse', async (req, reply) => {
    if (reply.statusCode >= 400 || req.method !== 'GET') {
      req.log.info({ method: req.method, url: req.url, status: reply.statusCode }, 'request');
    }
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    reply.header('Content-Security-Policy', CSP);
    if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
  });

  /* ------------------------------------------------------------------ API */

  app.get('/api/health', async () => ({ ok: true }));
  app.get('/api/session', async (req) => session(accessOf(req)));
  app.get('/api/overview', async () => core.overview());
  app.get('/api/services', async () => core.services());

  const gated = (route: string, read: () => object | null): void => {
    app.get(`/api/${route}`, async (_req, reply) => read() ?? deny(reply, 404, 'notFound'));
  };
  gated('system', () => core.system());
  gated('containers', () => core.containers());
  gated('storage', () => core.storage());
  app.get('/api/activity', async (req, reply) => {
    if (!features().activity) return deny(reply, 404, 'notFound');
    // Activity can be on only because an extension contributes sections: nothing core to show.
    return core.activity(accessOf(req).level) ?? EMPTY_ACTIVITY;
  });

  app.get('/api/diagnostics', async () =>
    core.diagnostics(extensions.status(), {
      enabled: push !== null,
      subscriptions: push?.count() ?? 0,
    }),
  );

  app.get('/api/push/config', async (req): Promise<PushConfig> => {
    const service = accessOf(req).level === 'full' ? push : null;
    return {
      available: service !== null,
      publicKey: service?.publicKey ?? null,
      subscriptions: service?.count() ?? 0,
    };
  });

  if (push) {
    app.post('/api/push/subscribe', async (req, reply) => {
      const denied = pushGuard(req, reply);
      if (denied) return denied;
      const sub = parseSubscription(req.body);
      if (!sub) return deny(reply, 400, 'invalidSubscription');
      if (!push.add(sub)) return deny(reply, 409, 'tooManySubscriptions');
      return { ok: true, subscriptions: push.count() };
    });

    app.post('/api/push/unsubscribe', async (req, reply) => {
      const denied = pushGuard(req, reply);
      if (denied) return denied;
      const endpoint = (req.body as { endpoint?: unknown } | null)?.endpoint;
      if (typeof endpoint !== 'string') return deny(reply, 400, 'invalidBody');
      push.remove(endpoint);
      return { ok: true, subscriptions: push.count() };
    });

    app.post('/api/push/test', async (req, reply) => {
      const denied = pushGuard(req, reply);
      if (denied) return denied;
      return { sent: await push.sendTest() };
    });
  }

  /* ----------------------------------------------------------- extensions */

  const helpers: RouteHelpers = {
    accessOf: (req) => accessOf(req).level,
    requireFull: (req, reply) => {
      if (accessOf(req).level === 'full') return true;
      void deny(reply, 403, 'forbidden');
      return false;
    },
    isSameOriginJson: (req) => isSameOriginJson(req.raw),
  };
  extensions.mountRoutes(app, helpers, () => apiError('notFound'));

  app.all('/api/*', async (_req, reply) => deny(reply, 404, 'notFound'));

  /* ------------------------------------------------------------ static PWA */

  const webDir = path.resolve(env.WEB_DIR);
  const brandingDir = path.join(path.resolve(env.CONFIG_DIR), 'branding');
  if (fs.existsSync(path.join(webDir, 'index.html'))) {
    registerPwaRoutes(app, {
      webDir,
      brandingDir,
      pwa: createPwa({
        webDir,
        brandingDir,
        boot: bootConfig,
        t,
      }),
      extensionRoot: (id) => extensions.assetRoot(id),
    });
  } else {
    app.log.warn({ webDir }, 'web bundle not found: serving API only');
  }

  /**
   * Fastify owns the public listener (`server.port`). When `identityProxy.trustedPort` is set, a
   * second http.Server shares its request handler on that port, the upstream of the identity
   * proxy; the access level is then derived from the local port.
   */
  let trusted: http.Server | null = null;
  app.addHook('onClose', (_i, done) => {
    if (trusted) trusted.close(() => done());
    else done();
  });
  const listen = async (): Promise<void> => {
    if (trustedPort === config.server.port) {
      throw new Error('access.identityProxy.trustedPort must differ from server.port');
    }
    await app.ready();
    if (trustedPort !== null) {
      const server = http.createServer(app.routing);
      trusted = server;
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(trustedPort, '0.0.0.0', resolve);
      });
    }
    await app.listen({ port: config.server.port, host: '0.0.0.0' });
  };

  return { app, listen };
}
