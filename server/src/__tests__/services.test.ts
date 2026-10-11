import { describe, expect, it } from 'vitest';
import type { ServiceView } from '../../../shared/api.js';
import { parseUpdate } from '../integrations/arr.js';
import { summarize } from '../integrations/qbittorrent.js';
import { createTranslator } from '../i18n/index.js';
import type { ProbeMap } from '../probes.js';
import { buildServiceViews } from '../services.js';
import type { RawContainer } from '../sources/provider.js';
import { servicesFile } from './support/core.js';

const defs = servicesFile([
  {
    id: 'app',
    name: 'App',
    containers: ['app', 'app-db'],
    probe: 'http://app.example.com/health',
  },
  { id: 'host', name: 'Host service', probe: 'http://host.example.com/' },
  { id: 'bare', name: 'Bare link', url: 'https://bare.example.com' },
  { id: 'boxed', name: 'Boxed', containers: ['boxed'] },
]).services;

const container = (name: string, state: RawContainer['state']): RawContainer => ({
  name,
  state,
  image: '',
  uptime: '1 day',
  cpuPercent: 1,
  memoryBytes: 10,
  rxBytesPerSec: 0,
  txBytesPerSec: 0,
  ioReadBytesPerSec: 0,
  ioWriteBytesPerSec: 0,
  ports: '',
});

const probe = (ok: boolean, failures: number): ProbeMap[string] => ({
  result: {
    ok,
    httpStatus: ok ? 200 : null,
    latencyMs: 5,
    checkedAt: '',
    error: ok ? null : 'ECONNREFUSED',
  },
  failures,
});

const views = (containers: RawContainer[] | null, probes: ProbeMap): Record<string, ServiceView> =>
  Object.fromEntries(
    buildServiceViews({ defs, containers, probes, readings: [], t: createTranslator('en') }).map(
      (v) => [v.id, v],
    ),
  );

describe('buildServiceViews', () => {
  it('is up when all containers run and the probe passes', () => {
    const v = views([container('app', 'healthy'), container('app-db', 'running')], {
      app: probe(true, 0),
      host: probe(true, 0),
    });
    expect(v.app?.state).toBe('up');
  });

  it('is down when the primary container is missing, degraded when only a secondary is', () => {
    expect(views([container('app-db', 'running')], {}).app?.state).toBe('down');
    expect(views([container('app', 'running')], {}).app?.state).toBe('degraded');
  });

  it('degrades on unhealthy primary and on repeated probe failures, but not on a single blip', () => {
    const ok = [container('app', 'running'), container('app-db', 'running')];
    expect(
      views([container('app', 'unhealthy'), container('app-db', 'running')], {}).app?.state,
    ).toBe('degraded');
    expect(views(ok, { app: probe(false, 1) }).app?.state).toBe('up');
    expect(views(ok, { app: probe(false, 2) }).app?.state).toBe('degraded');
  });

  it('lets the probe decide for host services and when container data is unavailable', () => {
    expect(views(null, { host: probe(false, 2) }).host?.state).toBe('down');
    expect(views(null, { host: probe(true, 0) }).host?.state).toBe('up');
    expect(views(null, {}).app?.state).toBe('unknown');
  });

  it('marks a service with neither containers nor a probe as not monitored', () => {
    const v = views([], {});
    expect(v.bare).toMatchObject({ monitored: false, state: 'unknown' });
    expect(v.host?.monitored).toBe(true);
    expect(v.boxed?.monitored).toBe(true);
  });

  it('works with no provider data at all (a minimal installation)', () => {
    const v = views(null, { host: probe(true, 0) });
    expect(v.host?.state).toBe('up');
    expect(v.bare?.state).toBe('unknown');
  });
});

describe('integration parsers', () => {
  it('extracts the available arr version', () => {
    expect(parseUpdate([{ message: 'New update is available: v6.4.4.10685' }])).toBe('6.4.4.10685');
    expect(parseUpdate([{ message: 'Indexers unavailable' }])).toBeNull();
  });

  it('classifies qBittorrent torrent states', () => {
    const s = summarize({ connection_status: 'connected', dl_info_speed: 5 }, [
      { state: 'downloading', dlspeed: 5 },
      { state: 'stalledDL' },
      { state: 'stalledUP' },
      { state: 'stoppedUP' },
      { state: 'error' },
    ]);
    expect(s).toMatchObject({
      connected: true,
      downloading: 2,
      seeding: 1,
      paused: 1,
      errored: 1,
      active: 1,
    });
  });
});
