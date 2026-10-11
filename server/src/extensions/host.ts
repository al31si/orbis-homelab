import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import type { Diagnostics, ExtensionRef, Language } from '../../../shared/api.js';
import {
  EXTENSION_API_VERSION,
  type ExtensionAlertCandidate,
  type ExtensionCollector,
  type ExtensionCollectorOptions,
  type ExtensionIntegration,
  type RouteHelpers,
  type ServerExtension,
  type ServerExtensionContext,
} from '../../../sdk/server.js';
import { type Config, secretRefSchema } from '../config/schema.js';
import type { SecretResolver } from '../config/secrets.js';
import type { ControlCenterApi } from '../core/control-center-api.js';
import type { Logger } from '../core/types.js';
import { errorMessage } from '../lib/http.js';
import { createExtensionHttp } from './http.js';
import { parseManifest } from './manifest.js';

type RouteRegistrar = Parameters<ServerExtensionContext['registerRoutes']>[0];

export interface ExtensionHostOptions {
  extensionsDir: string;
  /** `config.extensions`: only the enabled entries are attempted. */
  entries: Config['extensions'];
  core: ControlCenterApi;
  secrets: SecretResolver;
  language: Language;
  log: Logger;
}

interface LoadedExtension {
  dir: string;
  client: { script: string; style: string | null; activity: boolean } | null;
  routes: RouteRegistrar[];
}

/** Single readable line, no stack: the text reaches Diagnostics and the alert detail. */
function failureText(err: unknown): string {
  return (errorMessage(err).split('\n')[0] ?? '').slice(0, 300);
}

/**
 * Runs the enabled server extensions. One extension failing (bad manifest, missing directory,
 * throwing `register`, unknown service id...) is logged, reported to the core and skipped: it
 * has no routes, no client bundle and (as far as the core can tell) no collectors.
 */
export class ExtensionHost {
  private readonly loaded = new Map<string, LoadedExtension>();
  private readonly failures = new Map<string, string>();
  private readonly attempted: string[] = [];

  private constructor(private readonly opts: ExtensionHostOptions) {}

  static async load(opts: ExtensionHostOptions): Promise<ExtensionHost> {
    const host = new ExtensionHost(opts);
    for (const entry of opts.entries) {
      if (!entry.enabled) continue;
      host.attempted.push(entry.id);
      try {
        host.loaded.set(entry.id, await host.loadOne(entry.id, entry.config));
      } catch (err) {
        host.fail(entry.id, err);
      }
    }
    return host;
  }

  /** What Diagnostics shows: every enabled extension, loaded or not. */
  status(): Diagnostics['extensions'] {
    return this.attempted.map((id) => ({
      id,
      loaded: this.loaded.has(id),
      error: this.failures.get(id) ?? null,
    }));
  }

  /** Client bundles of the loaded extensions (`BootConfig.extensions`). */
  refs(): ExtensionRef[] {
    const refs: ExtensionRef[] = [];
    for (const [id, ext] of this.loaded) {
      if (!ext.client) continue;
      refs.push({
        id,
        script: `/extensions/${id}/${ext.client.script}`,
        style: ext.client.style ? `/extensions/${id}/${ext.client.style}` : null,
      });
    }
    return refs;
  }

  /** True when a loaded extension declares Activity sections in its manifest. */
  hasActivity(): boolean {
    return [...this.loaded.values()].some((ext) => ext.client?.activity === true);
  }

  /** Directory whose public files may be served, or null if the extension is not loaded. */
  assetRoot(id: string): string | null {
    return this.loaded.get(id)?.dir ?? null;
  }

  /**
   * Mounts the routes of every loaded extension as an encapsulated plugin under
   * `/api/x/<id>/`. If one throws while registering, the extension is failed and everything it
   * had already mounted answers 404.
   */
  mountRoutes(app: FastifyInstance, helpers: RouteHelpers, notFound: () => unknown): void {
    for (const [id, ext] of this.loaded) {
      if (ext.routes.length === 0) continue;
      void app.register(
        async (scope) => {
          let failed = false;
          scope.addHook('onRequest', async (_req, reply) => {
            if (failed) return reply.code(404).send(notFound());
            return undefined;
          });
          try {
            for (const register of ext.routes) await register(scope, helpers);
          } catch (err) {
            failed = true;
            this.loaded.delete(id);
            this.fail(id, err);
          }
        },
        { prefix: `/api/x/${id}` },
      );
    }
  }

  private fail(id: string, err: unknown): void {
    const message = failureText(err);
    this.failures.set(id, message);
    this.opts.log.error({ extension: id, err: message }, 'extension failed to load');
    this.opts.core.reportExtensionFailure(id, message);
  }

  private async loadOne(id: string, config: Record<string, unknown>): Promise<LoadedExtension> {
    const dir = path.join(this.opts.extensionsDir, id);
    if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
      throw new Error(`directory ${id}/ not found in the extensions folder`);
    }
    const manifest = parseManifest(this.readFile(dir, 'manifest.json'), id);
    const client = manifest.client
      ? {
          script: manifest.client.script,
          style: manifest.client.style ?? null,
          activity: manifest.client.activity,
        }
      : null;
    for (const file of [client?.script, client?.style]) {
      if (file && !fs.statSync(path.join(dir, file), { throwIfNoEntry: false })?.isFile()) {
        throw new Error(`client file ${file} not found`);
      }
    }

    // Runtime-selected plugin: the module path is only known once the instance is configured.
    const module = (await import(pathToFileURL(path.join(dir, 'server.mjs')).href)) as {
      default?: unknown;
    };
    const extension = module.default as Partial<ServerExtension> | undefined;
    if (!extension || typeof extension !== 'object') {
      throw new Error('server.mjs has no default export');
    }
    if (extension.id !== id) throw new Error(`server.mjs declares id "${String(extension.id)}"`);
    if (extension.apiVersion !== EXTENSION_API_VERSION) {
      throw new Error(`unsupported apiVersion ${String(extension.apiVersion)}`);
    }
    if (typeof extension.register !== 'function') throw new Error('server.mjs has no register()');

    const routes: RouteRegistrar[] = [];
    const ctx = this.createContext(id, config, routes);
    try {
      await extension.register(ctx.context);
    } finally {
      ctx.seal();
    }
    if (ctx.registrationError) throw ctx.registrationError;
    return { dir, client, routes };
  }

  private readFile(dir: string, name: string): string {
    try {
      return fs.readFileSync(path.join(dir, name), 'utf8');
    } catch {
      throw new Error(`${name} not found`);
    }
  }

  /**
   * The narrow API of one extension. A registration the core rejects (unknown `serviceId`...)
   * is remembered even if the extension swallows the exception, so it still fails to load.
   */
  private createContext(
    id: string,
    config: Record<string, unknown>,
    routes: RouteRegistrar[],
  ): {
    context: ServerExtensionContext;
    seal: () => void;
    registrationError: unknown;
  } {
    const { core, secrets, language, log } = this.opts;
    const http = createExtensionHttp();
    let sealed = false;
    const state: { registrationError: unknown } = { registrationError: undefined };
    const register = <R>(action: () => R): R => {
      if (sealed) throw new Error('registration is only possible while register() runs');
      try {
        return action();
      } catch (err) {
        state.registrationError ??= err;
        throw err;
      }
    };

    const context: ServerExtensionContext = {
      apiVersion: EXTENSION_API_VERSION,
      id,
      config,
      language,
      log: {
        info: (msg) => log.info(`[${id}] ${msg}`),
        warn: (obj, msg) => log.warn({ ...obj, extension: id }, msg),
        error: (obj, msg) => log.error({ ...obj, extension: id }, msg),
      },
      http,
      secret: async (ref) => {
        if (ref === undefined || ref === null) return undefined;
        const parsed = secretRefSchema.safeParse(ref);
        if (!parsed.success) {
          throw new Error('invalid secret reference: use { env: NAME } or { file: PATH }');
        }
        return secrets(parsed.data);
      },
      createCollector: <T>(opts: ExtensionCollectorOptions<T>): ExtensionCollector<T> =>
        register(() => core.createExtensionCollector(id, opts)),
      registerIntegration: <T>(integration: ExtensionIntegration<T>) =>
        register(() => core.registerExtensionIntegration(id, integration)),
      registerAlertRules: (rules: () => ExtensionAlertCandidate[]) =>
        register(() => core.registerExtensionAlertRules(id, rules)),
      registerRoutes: (registrar) => register(() => void routes.push(registrar)),
    };

    return {
      context,
      seal: () => {
        sealed = true;
      },
      get registrationError() {
        return state.registrationError;
      },
    };
  }
}
