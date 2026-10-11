import path from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { servableAssetPath } from '../extensions/assets.js';
import { resolveBranding, resolveServiceIcon } from './branding.js';
import type { Pwa } from './pwa.js';
import { safeRelativePath } from './safe-path.js';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const REVALIDATE = 'no-cache';

export interface PwaRoutesOptions {
  /** The built web bundle (`WEB_DIR`). */
  webDir: string;
  /** `<CONFIG_DIR>/branding`. */
  brandingDir: string;
  pwa: Pwa;
  /** Public directory of a loaded extension, null for any other id. */
  extensionRoot: (id: string) => string | null;
}

interface FileLocation {
  root: string;
  rel: string;
}

/**
 * Serves the web bundle and everything instance-specific:
 *  - `/`, SPA routes, `/index.html`: the rendered index page; `/sw.js`, `/manifest.webmanifest`
 *    rendered as well;
 *  - `/assets/*`: immutable; other bundle files: revalidated;
 *  - `/icons/*`, `/splash/*`: instance branding first, built-in asset as fallback;
 *  - `/branding/icons/*`: custom service icons from the instance only;
 *  - `/extensions/<id>/*`: public files of loaded extensions only.
 * Every URL-derived path goes through `safeRelativePath` before it touches the filesystem.
 */
export function registerPwaRoutes(app: FastifyInstance, opts: PwaRoutesOptions): void {
  const { webDir, brandingDir, pwa } = opts;
  const dirs = { brandingDir, webDir };
  // Only decorates `reply.sendFile`: every route below is declared here.
  void app.register(fastifyStatic, { serve: false, cacheControl: false, dotfiles: 'ignore' });

  const wildcard = (req: { params: unknown }): string =>
    (req.params as Record<string, string>)['*'] ?? '';
  const send = (reply: FastifyReply, file: FileLocation | null, cache: string): FastifyReply => {
    if (!file) {
      reply.callNotFound();
      return reply;
    }
    return reply.header('Cache-Control', cache).sendFile(file.rel, file.root);
  };
  const within = (root: string, rel: string | null): FileLocation | null =>
    rel === null ? null : { root, rel };
  const html = (reply: FastifyReply): FastifyReply =>
    reply
      .header('Cache-Control', REVALIDATE)
      .type('text/html; charset=utf-8')
      .send(pwa.indexHtml());

  app.get('/sw.js', async (_req, reply) =>
    reply
      .header('Cache-Control', REVALIDATE)
      .type('text/javascript; charset=utf-8')
      .send(pwa.serviceWorker()),
  );
  app.get('/manifest.webmanifest', async (_req, reply) =>
    reply
      .header('Cache-Control', REVALIDATE)
      .type('application/manifest+json; charset=utf-8')
      .send(pwa.manifestJson()),
  );

  app.get('/assets/*', async (req, reply) =>
    send(reply, within(webDir, safeRelativePath(`assets/${wildcard(req)}`)), IMMUTABLE),
  );
  app.get('/icons/*', async (req, reply) =>
    send(reply, resolveBranding(dirs, `icons/${wildcard(req)}`), REVALIDATE),
  );
  app.get('/splash/*', async (req, reply) =>
    send(reply, resolveBranding(dirs, `splash/${wildcard(req)}`), REVALIDATE),
  );
  app.get('/branding/icons/*', async (req, reply) =>
    send(reply, resolveServiceIcon(brandingDir, wildcard(req)), REVALIDATE),
  );
  app.get<{ Params: { id: string; '*': string } }>('/extensions/:id/*', async (req, reply) => {
    const root = opts.extensionRoot(req.params.id);
    const rel = root ? servableAssetPath(req.params['*']) : null;
    return send(reply, root ? within(root, rel) : null, REVALIDATE);
  });

  app.get('/*', async (req, reply) => {
    const requested = wildcard(req);
    // Real files (theme script, ...) are served as they are; every other path is a SPA route.
    // `index.html` itself is a template: it is only ever served rendered.
    if (requested === '' || requested === 'index.html' || path.extname(requested) === '') {
      return html(reply);
    }
    return send(reply, within(webDir, safeRelativePath(requested)), REVALIDATE);
  });
}
