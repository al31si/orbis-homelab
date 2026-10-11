import { API_PREFIX, SCOPE_HEADER, VIEWER_HEADER, type ResponseScope } from '@shared/api';
import { t } from '@/i18n';

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status: number | null = null,
    /** Machine code from a BFF error body (`{ error, message }`), when there was one. */
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** True when the BFF itself did not answer (as opposed to answering with an error). */
export function isUnreachable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.kind === 'network' || error.kind === 'timeout') return true;
  return error.status === 502 || error.status === 503 || error.status === 504;
}

export interface ApiRequest {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 12_000;

/** A parsed answer plus who the server says it is for (see `SCOPE_HEADER`). */
export interface ApiResult<T> {
  body: T;
  /** Anything but `shared` or `limited` counts as `full`: unknown means possibly private. */
  scope: ResponseScope;
  /** Opaque tag of the identity the answer was produced for; null when the server sent none. */
  viewer: string | null;
}

function scopeOf(headers: Headers): ResponseScope {
  const value = headers.get(SCOPE_HEADER);
  return value === 'shared' || value === 'limited' ? value : 'full';
}

/** Same-origin JSON request against the BFF (`path` is relative to `/api`, e.g. `/overview`). */
export async function apiFetch<T>(path: string, request: ApiRequest = {}): Promise<T> {
  return (await apiFetchMeta<T>(path, request)).body;
}

/** Like `apiFetch`, keeping the scope and viewer tag the server attached to the answer. */
export async function apiFetchMeta<T>(
  path: string,
  request: ApiRequest = {},
): Promise<ApiResult<T>> {
  const { method = 'GET', body, headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = request;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  if (signal?.aborted) controller.abort();

  try {
    const response = await fetch(`${API_PREFIX}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...headers,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'same-origin',
    });

    // The service worker marks answers it served from its cache because the BFF was unreachable.
    if (response.headers.get('X-Orbis-From-Cache') === '1') {
      throw new ApiError(t('common.error.unreachable'), 'network');
    }
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      const code = typeof failure?.error === 'string' ? failure.error : null;
      const message = typeof failure?.message === 'string' ? failure.message : null;
      throw new ApiError(
        message ?? t('common.error.http', { status: response.status }),
        'http',
        response.status,
        code,
      );
    }
    try {
      return {
        body: (await response.json()) as T,
        scope: scopeOf(response.headers),
        viewer: response.headers.get(VIEWER_HEADER),
      };
    } catch {
      throw new ApiError(t('common.error.parse'), 'parse', response.status);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted && !timedOut) throw error;
    if (timedOut) throw new ApiError(t('common.error.timeout'), 'timeout');
    throw new ApiError(t('common.error.unreachable'), 'network');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
