import { describe, expect, it } from 'vitest';
import {
  normalizeContainers,
  normalizeFs,
  normalizeSystem,
  parseUptime,
} from '../sources/glances.js';
import type { FsEntry } from '../sources/provider.js';
import { buildPools, buildStorage, buildVolumes } from '../sources/storage.js';
import { parseWeeklyQuota } from '../sources/usage.js';
import { config } from './support/core.js';

describe('glances normalisation', () => {
  it('parses uptime formats', () => {
    expect(parseUptime('16 days, 0:16:00')).toBe(16 * 86400 + 16 * 60);
    expect(parseUptime('1 day, 3:04:05')).toBe(86400 + 3 * 3600 + 4 * 60 + 5);
    expect(parseUptime('3:04:05')).toBe(3 * 3600 + 4 * 60 + 5);
    expect(parseUptime('garbage')).toBe(0);
  });

  it('derives memory usage from available bytes and keeps only physical disks and C sensors', () => {
    const s = normalizeSystem(
      {
        cpu: { total: 10.34, user: 8, system: 2, iowait: 0.3, cpucore: 4 },
        percpu: [{ total: 10 }, { total: 20 }],
        mem: { total: 1000, available: 250, cached: 100 },
        memswap: { total: 100, used: 77, percent: 77 },
        load: { min1: 0.4, min5: 0.5, min15: 0.6, cpucore: 4 },
        uptime: '1:00:00',
        system: { linux_distro: 'Ubuntu 26.04', os_version: '7.0.0' },
        sensors: [
          { label: 'Package id 0', unit: 'C', value: 53, warning: 85, critical: 105 },
          { label: 'fan1', unit: 'RPM', value: 900 },
        ],
        diskio: [
          { disk_name: 'sdb', read_bytes_rate_per_sec: 1, write_bytes_rate_per_sec: 2 },
          { disk_name: 'loop3', read_bytes_rate_per_sec: 9, write_bytes_rate_per_sec: 9 },
          { disk_name: 'sdb1', read_bytes_rate_per_sec: 9, write_bytes_rate_per_sec: 9 },
        ],
      },
      'nas',
    );
    expect(s.memory).toMatchObject({ usedBytes: 750, percent: 75 });
    expect(s.cpu.percent).toBe(10.3);
    expect(s.temperatures).toHaveLength(1);
    expect(s.diskIo.map((d) => d.name)).toEqual(['sdb']);
  });

  it('converts container counters to per-second rates', () => {
    const [c] = normalizeContainers([
      {
        name: 'x',
        status: 'healthy',
        image: ['img:1'],
        network: { rx: 3000, tx: 600, time_since_update: 30 },
        io: { ior: 300, iow: 0, time_since_update: 30 },
      },
    ]);
    expect(c).toMatchObject({
      state: 'healthy',
      image: 'img:1',
      rxBytesPerSec: 100,
      txBytesPerSec: 20,
    });
  });

  it('maps unknown container statuses to unknown', () => {
    expect(normalizeContainers([{ name: 'a', status: 'weird' }])[0]?.state).toBe('unknown');
  });

  it('rewrites host mount points and ignores everything outside the host prefix', () => {
    const fs = normalizeFs(
      [
        {
          mnt_point: '/host',
          size: 100,
          used: 67,
          free: 33,
          fs_type: 'ext4',
          device_name: '/dev/sda2',
        },
        {
          mnt_point: '/host/mnt/disk4',
          size: 100,
          used: 10,
          free: 90,
          fs_type: 'ext4',
          device_name: 'd',
        },
        { mnt_point: '/etc/hosts', size: 1, used: 1, free: 0, fs_type: 'ext4', device_name: 'x' },
      ],
      '/host',
    );
    expect(fs.map((f) => f.mount)).toEqual(['/', '/mnt/disk4']);
    expect(fs[0]?.percent).toBe(67);
  });
});

const fsEntry = (mount: string, over: Partial<FsEntry> = {}): FsEntry => ({
  mount,
  device: `/dev/${mount.replace(/\W+/g, '') || 'root'}`,
  type: 'ext4',
  sizeBytes: 100,
  usedBytes: 10,
  availableBytes: 90,
  percent: 10,
  ...over,
});

const storageConfig = (storage: unknown = {}) => {
  const parsed = config({
    sources: { system: { type: 'glances', url: 'http://glances:61208' }, storage },
  });
  return parsed.sources.storage!;
};

describe('storage volumes', () => {
  it('auto lists real filesystems once per device and skips pseudo filesystems', () => {
    const volumes = buildVolumes(
      [
        fsEntry('/', { device: '/dev/sda2' }),
        fsEntry('/etc/hosts', { device: '/dev/sda2' }),
        fsEntry('/data', { device: '/dev/sdb1' }),
        fsEntry('/run', { device: 'tmpfs', type: 'tmpfs' }),
        fsEntry('/boot/efi', { device: '/dev/sda1', type: 'vfat' }),
      ],
      storageConfig(),
    );
    expect(volumes.map((v) => v.mount)).toEqual(['/', '/boot/efi', '/data']);
  });

  it('an explicit list keeps exactly those mounts and applies labels', () => {
    const volumes = buildVolumes(
      [fsEntry('/'), fsEntry('/data'), fsEntry('/backup')],
      storageConfig({ volumes: { include: ['/data'], labels: { '/data': 'Media' } } }),
    );
    expect(volumes).toHaveLength(1);
    expect(volumes[0]).toMatchObject({ mount: '/data', label: 'Media' });
  });

  it('keeps pool members and the pool mount even when the type is not listed', () => {
    const cfg = storageConfig({
      volumes: { include: ['/'] },
      pools: [{ id: 'main', label: 'Main', mount: '/pool', members: ['/d1', '/d2'] }],
    });
    const volumes = buildVolumes(
      [fsEntry('/'), fsEntry('/pool', { type: 'fuse.custom' }), fsEntry('/d1'), fsEntry('/d2')],
      cfg,
    );
    expect(volumes.map((v) => v.mount)).toEqual(['/', '/d1', '/d2', '/pool']);
  });
});

describe('storage pools', () => {
  const pools = [{ id: 'main', label: 'Main', mount: '/pool', members: ['/d1', '/d2'] }];
  const member = (mount: string, size: number, used: number) =>
    fsEntry(mount, { sizeBytes: size, usedBytes: used, availableBytes: size - used, percent: 0 });

  it('takes capacity from the filesystem at the pool mount when the provider reports it', () => {
    const [pool] = buildPools(
      [
        fsEntry('/pool', { sizeBytes: 300, usedBytes: 60, availableBytes: 240, percent: 20 }),
        member('/d1', 100, 10),
        member('/d2', 100, 10),
      ],
      pools,
    );
    expect(pool).toMatchObject({
      id: 'main',
      sizeBytes: 300,
      percent: 20,
      members: ['/d1', '/d2'],
    });
  });

  it('sums the members when the pool mount is not reported (FUSE unions are hidden)', () => {
    const [pool] = buildPools([member('/d1', 1000, 250), member('/d2', 500, 0)], pools);
    expect(pool).toMatchObject({
      sizeBytes: 1500,
      usedBytes: 250,
      availableBytes: 1250,
      percent: 16.7,
    });
  });

  it('leaves the pool out when a member is missing, instead of showing a wrong total', () => {
    expect(buildPools([member('/d1', 1000, 250)], pools)).toEqual([]);
  });

  it('has no pool when neither its mount nor members are reported', () => {
    expect(buildPools([fsEntry('/other')], pools)).toEqual([]);
    expect(buildPools([], [{ id: 'p', label: 'P', mount: '/pool', members: [] }])).toEqual([]);
  });
});

describe('buildStorage', () => {
  it('without a SMART report has no disks and no summary', () => {
    const info = buildStorage({
      config: storageConfig(),
      filesystems: [fsEntry('/')],
      report: null,
    });
    expect(info.disks).toEqual([]);
    expect(info.smart).toBeNull();
    expect(info.volumes).toHaveLength(1);
  });

  it('without a system provider has no volumes or pools but keeps the SMART report', () => {
    const info = buildStorage({
      config: storageConfig({ smart: { type: 'report-json', file: '/x.json' } }),
      filesystems: null,
      report: {
        status: 'OK',
        checked_at: new Date().toISOString(),
        disks: [{ label: 'D1', smart: 'PASSED', status: 'OK' }],
      },
    });
    expect(info.volumes).toEqual([]);
    expect(info.pools).toEqual([]);
    expect(info.disks).toHaveLength(1);
  });

  it('never turns missing SMART data into a healthy state, masks serials and maps disks to mounts', () => {
    const info = buildStorage({
      config: storageConfig({
        smart: { type: 'report-json', file: '/x.json', disks: { DISK_B: '/data' } },
      }),
      filesystems: [fsEntry('/data', { percent: 9 })],
      report: {
        status: 'CRITICAL',
        disks: [{ label: 'DISK_B', serial: 'SN-0000001234', status: 'CRITICAL', pending: 1 }],
      },
    });
    expect(info.disks[0]).toMatchObject({
      serialTail: '1234',
      smart: 'UNAVAILABLE',
      status: 'CRITICAL',
      mount: '/data',
      percent: 9,
    });
  });

  it('ignores a historical uncorrectable counter after pending sectors are cleared', () => {
    const info = buildStorage({
      config: storageConfig({ smart: { type: 'report-json', file: '/x.json' } }),
      filesystems: null,
      report: {
        status: 'WARNING',
        disks: [
          {
            label: 'D1',
            status: 'WARNING',
            smart: 'PASSED',
            pending: 0,
            uncorrectable: 1,
            smart_errors: 0,
            message: 'offline-uncorrectable historical counter: 1; pending=0',
          },
        ],
      },
    });
    expect(info.smart?.status).toBe('OK');
    expect(info.disks[0]).toMatchObject({
      status: 'OK',
      uncorrectable: 1,
      uncorrectableHistorical: true,
    });
  });
});

describe('parseWeeklyQuota', () => {
  const now = Date.parse('2026-10-01T20:30:00Z');
  const fresh = {
    weekly_remaining_percent: 55,
    weekly_resets_at: '2026-10-07T01:59:59+00:00',
    plan: 'pro',
    updated_at: '2026-10-01T20:25:00Z',
  };

  it('maps the weekly window and normalises the reset to UTC ISO', () => {
    expect(parseWeeklyQuota({ ...fresh, weekly_resets_at: '2026-10-03T20:19:30+02:00' })).toEqual({
      plan: 'pro',
      weekly: { remainingPercent: 55, resetsAt: '2026-10-03T18:19:30.000Z' },
    });
  });

  it('clamps the percentage and defaults the plan to null', () => {
    const q = parseWeeklyQuota({
      weekly_remaining_percent: 140,
      weekly_resets_at: fresh.weekly_resets_at,
    });
    expect(q.weekly.remainingPercent).toBe(100);
    expect(q.plan).toBeNull();
  });

  it('rejects a document without the weekly window instead of guessing', () => {
    expect(() => parseWeeklyQuota({})).toThrow(/weekly/);
    expect(() => parseWeeklyQuota([])).toThrow(/object/);
  });

  it('fails when the writer has stalled, only if a max age is configured', () => {
    const old = { ...fresh, updated_at: '2026-10-01T19:00:00Z' };
    expect(() => parseWeeklyQuota(old, { maxAgeMinutes: 30 }, now)).toThrow(/stalled/);
    expect(() => parseWeeklyQuota(old, {}, now)).not.toThrow();
    expect(() =>
      parseWeeklyQuota({ ...fresh, updated_at: undefined }, { maxAgeMinutes: 30 }, now),
    ).toThrow(/updated_at/);
  });
});
