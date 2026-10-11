import type { ServiceProbeResult } from '../../shared/api.js';
import type { ServiceDef } from './config/schema.js';
import { errorMessage, httpRequest } from './lib/http.js';

export interface ProbeState {
  result: ServiceProbeResult;
  /** Consecutive failed probes; a service is only flagged after 2 to ride out blips. */
  failures: number;
}

export type ProbeMap = Record<string, ProbeState>;

export async function probeService(def: ServiceDef): Promise<ServiceProbeResult> {
  const probe = def.probe;
  if (!probe) throw new Error(`service ${def.id} has no probe`);
  const checkedAt = new Date().toISOString();
  try {
    const res = await httpRequest(probe.url, {
      headers: probe.headers,
      insecureTls: probe.insecureTls,
      timeoutMs: 5000,
      maxBytes: 64 * 1024,
    });
    const ok = probe.okStatus
      ? probe.okStatus.includes(res.status)
      : res.status >= 200 && res.status < 400;
    return {
      ok,
      httpStatus: res.status,
      latencyMs: res.latencyMs,
      checkedAt,
      error: ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { ok: false, httpStatus: null, latencyMs: null, checkedAt, error: errorMessage(err) };
  }
}

/** Probes every service that declares one, at most `concurrency` at a time. */
export async function probeAll(
  defs: ServiceDef[],
  previous: ProbeMap,
  concurrency = 6,
): Promise<ProbeMap> {
  const probed = defs.filter((d) => d.probe);
  const next: ProbeMap = {};
  let cursor = 0;
  const worker = async (): Promise<void> => {
    for (let def = probed[cursor++]; def; def = probed[cursor++]) {
      const result = await probeService(def);
      next[def.id] = {
        result,
        failures: result.ok ? 0 : (previous[def.id]?.failures ?? 0) + 1,
      };
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, probed.length) }, worker));
  return next;
}
