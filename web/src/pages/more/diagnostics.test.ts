import { describe, expect, it } from 'vitest';
import type { SourceHealth } from '@shared/api';
import { sourceTone, summarizeSources } from './diagnostics';

const NOW = Date.parse('2026-09-29T12:00:00Z');

function source(overrides: Partial<SourceHealth> = {}): SourceHealth {
  return {
    id: 'glances-system',
    label: 'Glances · sistema',
    ok: true,
    fetchedAt: new Date(NOW - 5_000).toISOString(),
    error: null,
    intervalMs: 10_000,
    ...overrides,
  };
}

describe('sourceTone', () => {
  it('is ok for a fresh, healthy source', () => {
    expect(sourceTone(source(), NOW)).toBe('ok');
  });

  it('is critical when the source reports a failure, however recent the last success', () => {
    expect(sourceTone(source({ ok: false, error: 'timeout' }), NOW)).toBe('crit');
  });

  it('warns when data is older than the staleness window', () => {
    const late = source({ fetchedAt: new Date(NOW - 26_000).toISOString() });
    expect(sourceTone(late, NOW)).toBe('warn');
    expect(sourceTone(source({ fetchedAt: null }), NOW)).toBe('warn');
  });
});

describe('summarizeSources', () => {
  it('counts healthy sources and reports the worst tone', () => {
    const sources = [
      source(),
      source({ id: 'b', fetchedAt: null }),
      source({ id: 'c', ok: false }),
    ];
    expect(summarizeSources(sources, NOW)).toEqual({ healthy: 1, total: 3, tone: 'crit' });
    expect(summarizeSources([source()], NOW)).toEqual({ healthy: 1, total: 1, tone: 'ok' });
  });
});
