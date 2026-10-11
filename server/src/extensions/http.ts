import type { ExtensionHttp, ExtensionHttpOptions } from '../../../sdk/server.js';
import { getJson, httpRequest } from '../lib/http.js';

function assertHttpUrl(url: string): void {
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    throw new Error('invalid URL');
  }
  if (protocol !== 'http:' && protocol !== 'https:') throw new Error('only http(s) URLs');
}

/**
 * The extension HTTP client: the BFF's own (timeouts, size limit, custom TLS option) whose
 * errors never carry request headers, which may hold credentials.
 */
export function createExtensionHttp(): ExtensionHttp {
  return {
    getJson<T>(url: string, opts?: ExtensionHttpOptions): Promise<T> {
      assertHttpUrl(url);
      return getJson<T>(url, opts);
    },
    async requestJson<T>(
      method: 'GET' | 'POST',
      url: string,
      opts: ExtensionHttpOptions & { body?: unknown } = {},
    ) {
      assertHttpUrl(url);
      const { body, ...rest } = opts;
      const res = await httpRequest(url, {
        ...rest,
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      let json: T | null = null;
      try {
        json = JSON.parse(res.body) as T;
      } catch {
        // An empty or non-JSON body is reported as `json: null`; the status still tells.
      }
      return { status: res.status, json };
    },
  };
}
