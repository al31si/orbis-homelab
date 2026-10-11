import http from 'node:http';
import https from 'node:https';

export interface HttpOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  /** Request payload (POST only). Sent as `application/json` unless the headers say otherwise. */
  body?: string;
  timeoutMs?: number;
  insecureTls?: boolean;
  maxBytes?: number;
}

export interface HttpResult {
  status: number;
  body: string;
  headers: http.IncomingHttpHeaders;
  latencyMs: number;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Minimal GET/POST client built on node:http(s). Unlike fetch it allows a custom Host header and
 * self-signed TLS, and it never puts request headers (which may carry credentials) in errors.
 */
export function httpRequest(url: string, opts: HttpOptions = {}): Promise<HttpResult> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 5000,
    insecureTls = false,
    maxBytes = 1024 * 1024,
  } = opts;
  const payload = method === 'POST' ? body : undefined;
  const hasContentType = Object.keys(headers).some((h) => h.toLowerCase() === 'content-type');
  const target = new URL(url);
  const client = target.protocol === 'https:' ? https : http;
  const started = performance.now();

  return new Promise((resolve, reject) => {
    const req = client.request(
      target,
      {
        method,
        headers: {
          accept: 'application/json, text/plain, */*',
          ...(method === 'POST'
            ? { 'content-length': String(payload === undefined ? 0 : Buffer.byteLength(payload)) }
            : {}),
          ...(payload !== undefined && !hasContentType
            ? { 'content-type': 'application/json' }
            : {}),
          ...headers,
        },
        timeout: timeoutMs,
        ...(insecureTls ? { rejectUnauthorized: false } : {}),
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new HttpError('response too large', res.statusCode ?? null));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: res.headers,
            latencyMs: Math.round(performance.now() - started),
          }),
        );
        res.on('error', reject);
      },
    );
    req.on('timeout', () => req.destroy(new HttpError(`timeout after ${timeoutMs} ms`, null)));
    req.on('error', (err) => reject(err instanceof HttpError ? err : toHttpError(err)));
    req.end(payload);
  });
}

function toHttpError(err: Error): HttpError {
  const code = (err as NodeJS.ErrnoException).code;
  return new HttpError(code ? `${code}` : err.message, null);
}

/** GET + JSON decode; throws HttpError on non-2xx or invalid JSON. */
export async function getJson<T>(url: string, opts: HttpOptions = {}): Promise<T> {
  return (await getJsonWithHeaders<T>(url, opts)).json;
}

export async function getJsonWithHeaders<T>(
  url: string,
  opts: HttpOptions = {},
): Promise<{ json: T; headers: http.IncomingHttpHeaders }> {
  const res = await httpRequest(url, opts);
  if (res.status < 200 || res.status >= 300) {
    throw new HttpError(`HTTP ${res.status}`, res.status);
  }
  try {
    return { json: JSON.parse(res.body) as T, headers: res.headers };
  } catch {
    throw new HttpError('invalid JSON response', res.status);
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
