/**
 * Orbis Homelab server extension contract (API version 1).
 *
 * An extension is a directory under EXTENSIONS_DIR:
 *
 *   <EXTENSIONS_DIR>/<id>/server.mjs     default export: ServerExtension (loaded by the BFF)
 *   <EXTENSIONS_DIR>/<id>/manifest.json  { "id", "apiVersion": 1, "client": { "script", "style"? } }
 *   <EXTENSIONS_DIR>/<id>/client.js      optional PWA bundle (see client-types.ts)
 *
 * and is switched on in config.yaml (`extensions: [{ id, enabled, config }]`). An extension that
 * is not listed is never loaded: no collector, no route, no UI.
 *
 * Extensions cannot touch core state. They get a narrow context: their own config block, secret
 * resolution, an HTTP client, and registration points for collectors, integrations, alert rules
 * and routes (mounted under /api/x/<id>/).
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AccessLevel, Badge, Language, Metric, Severity } from '../shared/api.js';

export const EXTENSION_API_VERSION = 1;

export interface ExtensionLogger {
  info(msg: string): void;
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

export interface ExtensionHttpOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  insecureTls?: boolean;
  maxBytes?: number;
}

export interface ExtensionHttp {
  /** GET, JSON decode, throws on non-2xx or invalid JSON. */
  getJson<T>(url: string, opts?: ExtensionHttpOptions): Promise<T>;
  /** Any method; JSON body is serialised. Errors never include request headers. */
  requestJson<T>(
    method: 'GET' | 'POST',
    url: string,
    opts?: ExtensionHttpOptions & { body?: unknown },
  ): Promise<{ status: number; json: T | null }>;
}

/** A collector as seen by an extension; the core starts, stops and reports on it. */
export interface ExtensionCollector<T> {
  readonly value: T | null;
  readonly consecutiveFailures: number;
  snapshot(): {
    data: T | null;
    fetchedAt: string | null;
    error: string | null;
    intervalMs: number;
  };
  refresh(): Promise<void>;
}

export interface ExtensionCollectorOptions<T> {
  /** Unique within the extension (prefixed with the extension id by the core). */
  id: string;
  label: string;
  intervalMs: number;
  run: () => Promise<T>;
}

export interface ExtensionAlertCandidate {
  /** Stable per condition; prefixed with the extension id by the core. */
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  serviceId: string | null;
}

/**
 * Attaches data to a catalog service (badges and metrics in its detail page, alerts).
 * Same shape as the built-in integrations (Radarr, qBittorrent...).
 */
export interface ExtensionIntegration<T> {
  /** Catalog service this integration decorates; unknown ids are a startup error. */
  serviceId: string;
  type: string;
  label: string;
  configured: boolean;
  collector: ExtensionCollector<T> | null;
  describe(data: T): { badges: Badge[]; metrics: Metric[] };
  alerts(data: T): { severity: Severity; title: string; detail: string }[];
}

export interface RouteHelpers {
  /** Access level of the request (`full` only on a trusted network or behind a trusted proxy). */
  accessOf(req: FastifyRequest): AccessLevel;
  /** Replies 403 and returns false unless the caller has full access. */
  requireFull(req: FastifyRequest, reply: FastifyReply): boolean;
  /** True for JSON requests whose Origin (if any) matches the Host: use on every POST. */
  isSameOriginJson(req: FastifyRequest): boolean;
}

export interface ServerExtensionContext {
  readonly apiVersion: typeof EXTENSION_API_VERSION;
  readonly id: string;
  /** The extension's block from config.yaml; validate it in `register`. */
  readonly config: Record<string, unknown>;
  readonly language: Language;
  readonly log: ExtensionLogger;
  readonly http: ExtensionHttp;
  /**
   * Resolves a secret reference found in `config`: `{ env: NAME }` or `{ file: PATH }`.
   * Files are read on every call (so rotation needs no restart). Returns undefined when absent.
   */
  secret(ref: unknown): Promise<string | undefined>;
  createCollector<T>(opts: ExtensionCollectorOptions<T>): ExtensionCollector<T>;
  registerIntegration<T>(integration: ExtensionIntegration<T>): void;
  registerAlertRules(rules: () => ExtensionAlertCandidate[]): void;
  /** Mounts routes under /api/x/<id>/. They are not registered at all when the extension is off. */
  registerRoutes(
    register: (app: FastifyInstance, helpers: RouteHelpers) => void | Promise<void>,
  ): void;
}

export interface ServerExtension {
  id: string;
  apiVersion: typeof EXTENSION_API_VERSION;
  register(ctx: ServerExtensionContext): void | Promise<void>;
}

export function defineServerExtension(extension: ServerExtension): ServerExtension {
  return extension;
}
