import { describe, expect, it } from 'vitest';
import type { ServiceView, StorageInfo, SystemInfo } from '../../../shared/api.js';
import { createTranslator } from '../i18n/index.js';
import {
  THRESHOLDS,
  type RuleInputs,
  evaluateRules,
  healthScore,
  overallStatus,
  resolveThresholds,
} from '../rules.js';

const system = (over: Partial<SystemInfo> = {}): SystemInfo => ({
  host: { hostname: 'nas', os: 'Debian', kernel: '6', uptimeSeconds: 1, cores: 4 },
  cpu: {
    percent: 10,
    user: 5,
    system: 5,
    iowait: 0,
    perCore: [],
    load: { m1: 0.4, m5: 0.5, m15: 0.5 },
  },
  memory: { totalBytes: 100, usedBytes: 40, availableBytes: 60, cachedBytes: 0, percent: 40 },
  swap: { totalBytes: 100, usedBytes: 77, percent: 77 },
  temperatures: [{ label: 'Package id 0', celsius: 53, warn: 85, crit: 105 }],
  diskIo: [],
  dockerNetwork: { rxBytesPerSec: 0, txBytesPerSec: 0 },
  docker: { total: 0, running: 0, healthy: 0, unhealthy: 0, starting: 0 },
  history: [],
  ...over,
});

const smart = (over: Partial<NonNullable<StorageInfo['smart']>> = {}): StorageInfo['smart'] => ({
  status: 'OK',
  checkedAt: new Date().toISOString(),
  ageSeconds: 60,
  temperatureWarnC: 50,
  temperatureCriticalC: 55,
  ...over,
});

const storage = (over: Partial<StorageInfo> = {}): StorageInfo => ({
  volumes: [],
  pools: [],
  disks: [],
  smart: null,
  ...over,
});

const base = (over: Partial<RuleInputs> = {}): RuleInputs => ({
  t: createTranslator('en'),
  thresholds: THRESHOLDS,
  system: system(),
  systemDown: false,
  systemServiceIds: [],
  storage: storage(),
  smartDown: false,
  containers: [],
  services: [],
  readings: [],
  integrationFailures: {},
  ...over,
});

const service = (over: Partial<ServiceView>): ServiceView => ({
  id: 'x',
  name: 'X',
  description: '',
  category: null,
  icon: 'generic',
  iconUrl: null,
  url: null,
  state: 'up',
  monitored: true,
  stateDetail: null,
  containers: [],
  probe: null,
  cpuPercent: 0,
  memoryBytes: 0,
  uptime: null,
  badges: [],
  metrics: [],
  core: false,
  integration: null,
  ...over,
});

const volume = (mount: string, percent: number): StorageInfo['volumes'][number] => ({
  mount,
  label: null,
  device: '/dev/sdx',
  type: 'ext4',
  sizeBytes: 100,
  usedBytes: percent,
  availableBytes: 100 - percent,
  percent,
});

describe('evaluateRules', () => {
  it('is quiet on a healthy host (high swap alone is not an alert)', () => {
    expect(evaluateRules(base())).toEqual([]);
  });

  it('is quiet when no source is configured at all', () => {
    expect(evaluateRules(base({ system: null, storage: null }))).toEqual([]);
  });

  it('flags a critical SMART disk with its message and temperature', () => {
    const disks = [
      { label: 'DISK_B', status: 'CRITICAL', message: 'pending sectors', temperatureC: 42 },
    ] as StorageInfo['disks'];
    const [alert] = evaluateRules(base({ storage: storage({ disks, smart: smart() }) }));
    expect(alert).toMatchObject({ id: 'disk:DISK_B', severity: 'critical', source: 'storage' });
    expect(alert?.detail).toContain('42');
  });

  it('escalates swap only together with low available memory', () => {
    const tight = system({
      memory: { totalBytes: 100, usedBytes: 90, availableBytes: 10, cachedBytes: 0, percent: 90 },
      swap: { totalBytes: 100, usedBytes: 90, percent: 90 },
    });
    expect(evaluateRules(base({ system: tight })).map((a) => a.id)).toContain('system:swap');
  });

  it('makes a core outage critical and a non-core outage a warning', () => {
    const alerts = evaluateRules(
      base({
        services: [
          service({ id: 'a', name: 'A', state: 'down', core: true }),
          service({ id: 'b', name: 'B', state: 'down' }),
          service({ id: 'c', name: 'C', state: 'degraded', core: true }),
        ],
      }),
    );
    expect(Object.fromEntries(alerts.map((a) => [a.id, a.severity]))).toEqual({
      'service:a': 'critical',
      'service:b': 'warning',
      'service:c': 'warning',
    });
  });

  it('suppresses system rules and the provider own service alert when the system source is down', () => {
    const alerts = evaluateRules(
      base({
        systemDown: true,
        systemServiceIds: ['metrics'],
        system: system({
          temperatures: [{ label: 'Package id 0', celsius: 110, warn: 85, crit: 105 }],
        }),
        services: [service({ id: 'metrics', state: 'down', core: true })],
      }),
    );
    expect(alerts.map((a) => a.id)).toEqual(['monitor:system']);
  });

  it('never raises an alert for a service that is not monitored', () => {
    const alerts = evaluateRules(
      base({ services: [service({ id: 'u', state: 'unknown', monitored: false })] }),
    );
    expect(alerts).toEqual([]);
  });

  it('alerts on a stale SMART report only when a report exists', () => {
    const stale = storage({ smart: smart({ ageSeconds: 3 * 3600 }) });
    expect(evaluateRules(base({ storage: stale })).map((a) => a.id)).toContain(
      'storage:smart-stale',
    );
    expect(evaluateRules(base({ storage: storage() })).map((a) => a.id)).not.toContain(
      'storage:smart-stale',
    );
  });

  it('reports the SMART source failing only when it is configured to fail', () => {
    expect(evaluateRules(base({ smartDown: true })).map((a) => a.id)).toEqual(['monitor:smart']);
  });

  it('warns about a nearly full volume, with stable ids per mount', () => {
    const full = storage({ volumes: [volume('/data', 83), volume('/backup', 95)] });
    const sev = Object.fromEntries(
      evaluateRules(base({ storage: full })).map((a) => [a.id, a.severity]),
    );
    expect(sev).toEqual({ 'storage:fs:/data': 'warning', 'storage:fs:/backup': 'critical' });
  });

  it('applies threshold overrides from configuration', () => {
    const full = storage({ volumes: [volume('/data', 83)] });
    const relaxed = resolveThresholds({ fsWarn: 95 });
    expect(evaluateRules(base({ storage: full, thresholds: relaxed }))).toEqual([]);
    expect(relaxed.fsCrit).toBe(THRESHOLDS.fsCrit);
  });
});

describe('health score', () => {
  it('subtracts 20 per critical and 5 per warning, floored at 0', () => {
    expect(healthScore([{ severity: 'critical' }, { severity: 'warning' }])).toBe(75);
    expect(healthScore(Array(6).fill({ severity: 'critical' }))).toBe(0);
  });

  it('reports unknown only when nothing was ever collected', () => {
    expect(overallStatus([], false)).toBe('unknown');
    expect(overallStatus([], true)).toBe('ok');
    expect(overallStatus([{ severity: 'critical' }], false)).toBe('critical');
  });
});
