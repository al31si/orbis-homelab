import { beforeEach, describe, expect, it } from 'vitest';
import type { ContainerInfo, SystemInfo } from '@shared/api';
import { setLanguage } from '@/i18n';
import {
  assessSwap,
  dockerCounts,
  diskIoLabel,
  filterContainers,
  groupTemperatures,
  loadScaleMax,
  loadTone,
  localizeUptime,
  memorySegments,
  needsAttention,
  seriesStats,
  sortContainers,
  temperatureTone,
} from './derive';

const GB = 1024 ** 3;
const memory = (availableGb: number) => ({ totalBytes: 24 * GB, availableBytes: availableGb * GB });

describe('assessSwap', () => {
  it('keeps high swap neutral while plenty of RAM is available', () => {
    expect(assessSwap(memory(13), { totalBytes: 4 * GB, percent: 83.5 })).toMatchObject({
      kind: 'normal',
      tone: 'neutral',
    });
    expect(assessSwap(memory(12), { totalBytes: 4 * GB, percent: 99 }).kind).toBe('normal');
  });

  it('alerts when swap is nearly full and RAM is getting scarce', () => {
    expect(assessSwap(memory(5), { totalBytes: 4 * GB, percent: 85 })).toMatchObject({
      kind: 'pressure',
      tone: 'warn',
    });
    expect(assessSwap(memory(5), { totalBytes: 4 * GB, percent: 84.9 }).kind).toBe('normal');
    expect(assessSwap(memory(6), { totalBytes: 4 * GB, percent: 90 }).kind).toBe('normal');
  });

  it('alerts on very low available RAM whatever the swap says', () => {
    expect(assessSwap(memory(2.3), { totalBytes: 4 * GB, percent: 0 })).toMatchObject({
      kind: 'low-memory',
      tone: 'crit',
    });
    expect(assessSwap(memory(2.5), { totalBytes: 4 * GB, percent: 0 }).kind).toBe('normal');
  });

  it('has nothing to judge without swap', () => {
    expect(assessSwap(memory(1), { totalBytes: 0, percent: 0 }).kind).toBe('absent');
  });
});

describe('memorySegments', () => {
  it('keeps the cache inside the available part and never exceeds the total', () => {
    const parts = memorySegments({
      totalBytes: 24 * GB,
      usedBytes: 11 * GB,
      availableBytes: 13 * GB,
      cachedBytes: 14 * GB,
      percent: 45,
    });
    expect(parts).toEqual({ used: 11 * GB, cache: 13 * GB, free: 0 });
    const spare = memorySegments({
      totalBytes: 24 * GB,
      usedBytes: 4 * GB,
      availableBytes: 20 * GB,
      cachedBytes: 6 * GB,
      percent: 17,
    });
    expect(spare.used + spare.cache + spare.free).toBe(24 * GB);
  });
});

describe('loadTone', () => {
  it('compares the load with the core count', () => {
    expect(loadTone(2.2, 4)).toBe('ok');
    expect(loadTone(4, 4)).toBe('warn');
    expect(loadTone(6.5, 4)).toBe('crit');
  });
});

describe('series helpers', () => {
  it('computes min, max and average', () => {
    expect(seriesStats([])).toBeNull();
    expect(seriesStats([10, 30, 20])).toEqual({ min: 10, max: 30, avg: 20 });
  });

  it('never scales the load chart below the core count', () => {
    expect(loadScaleMax([0.5, 1.2], 4)).toBe(4);
    expect(loadScaleMax([3, 7], 4)).toBe(9);
    expect(loadScaleMax([], 4)).toBe(4);
  });
});

describe('temperatures', () => {
  const sensors: SystemInfo['temperatures'] = [
    { label: 'Core 0', celsius: 51, warn: 85, crit: 105 },
    { label: 'Package id 0', celsius: 55, warn: 85, crit: 105 },
    { label: 'Core 1', celsius: 54, warn: 85, crit: 105 },
    { label: 'acpitz 0', celsius: 27, warn: null, crit: null },
  ];

  it('groups package, cores and the rest', () => {
    const groups = groupTemperatures(sensors);
    expect(groups.headline?.label).toBe('Package id 0');
    expect(groups.cores.map((sensor) => sensor.label)).toEqual(['Core 0', 'Core 1']);
    expect(groups.other.map((sensor) => sensor.label)).toEqual(['acpitz 0']);
  });

  it('falls back to the hottest sensor that has limits', () => {
    const groups = groupTemperatures(sensors.filter((sensor) => sensor.label !== 'Package id 0'));
    expect(groups.headline?.label).toBe('Core 1');
    expect(groupTemperatures([sensors[3] as (typeof sensors)[number]]).headline?.label).toBe(
      'acpitz 0',
    );
    expect(groupTemperatures([]).headline).toBeNull();
  });

  it('judges only against the limits the source provides', () => {
    expect(temperatureTone({ celsius: 90, warn: 85, crit: 105 })).toBe('warn');
    expect(temperatureTone({ celsius: 105, warn: 85, crit: 105 })).toBe('crit');
    expect(temperatureTone({ celsius: 60, warn: 85, crit: 105 })).toBe('ok');
    expect(temperatureTone({ celsius: 200, warn: null, crit: null })).toBe('neutral');
    expect(temperatureTone({ celsius: 90, warn: null, crit: 80 })).toBe('crit');
  });
});

describe('diskIoLabel', () => {
  const disks = [{ label: 'media-1', device: '/dev/sdb' }];
  const volumes = [
    { label: 'System', device: '/dev/sda2' },
    { label: null, device: '/dev/sda1' },
    { label: 'Photos', device: '/dev/nvme0n1p1' },
    { label: 'Scratch', device: '/dev/sdc1' },
    { label: 'Archive', device: '/dev/sdc2' },
  ];

  it('labels devices from SMART disks and from labelled volumes', () => {
    expect(diskIoLabel('sdb', disks, volumes)).toBe('media-1');
    expect(diskIoLabel('sda', disks, volumes)).toBe('System');
    expect(diskIoLabel('nvme0n1', disks, volumes)).toBe('Photos');
  });

  it('assumes no name for unknown or ambiguous devices', () => {
    expect(diskIoLabel('sd', disks, volumes)).toBeUndefined();
    expect(diskIoLabel('sdz', disks, volumes)).toBeUndefined();
    expect(diskIoLabel('sdc', disks, volumes)).toBeUndefined();
    expect(diskIoLabel('sda', [], [{ label: null, device: '/dev/sda1' }])).toBeUndefined();
  });

  it('does not read the device name as a pattern', () => {
    expect(diskIoLabel('s.b', disks, volumes)).toBeUndefined();
  });
});

describe('localizeUptime', () => {
  beforeEach(() => setLanguage('it'));

  it('translates the source durations into Italian', () => {
    expect(localizeUptime('16 secs')).toBe('16\u00a0s');
    expect(localizeUptime('2 mins')).toBe('2\u00a0min');
    expect(localizeUptime('12 hours')).toBe('12\u00a0h');
    expect(localizeUptime('6 days')).toBe('6\u00a0g');
    expect(localizeUptime('a week')).toBe('1\u00a0sett');
    expect(localizeUptime('2 weeks')).toBe('2\u00a0sett');
    expect(localizeUptime('a month')).toBe('1\u00a0mese');
    expect(localizeUptime('3 months')).toBe('3\u00a0mesi');
    expect(localizeUptime('a year')).toBe('1\u00a0anno');
    expect(localizeUptime('2 years')).toBe('2\u00a0anni');
    expect(localizeUptime('an hour')).toBe('1\u00a0h');
    expect(localizeUptime('a minute')).toBe('1\u00a0min');
    expect(localizeUptime('30 seconds')).toBe('30\u00a0s');
  });

  it('keeps the natural English phrase in English', () => {
    setLanguage('en');
    expect(localizeUptime('2 mins')).toBe('2 mins');
    expect(localizeUptime('a week')).toBe('a week');
    expect(localizeUptime('3 months')).toBe('3 months');
  });

  it('leaves anything unexpected untouched in both languages', () => {
    expect(localizeUptime('Up 3 days (healthy)')).toBe('Up 3 days (healthy)');
    expect(localizeUptime('')).toBe('');
    setLanguage('en');
    expect(localizeUptime('Up 3 days (healthy)')).toBe('Up 3 days (healthy)');
  });
});

const container = (over: Partial<ContainerInfo>): ContainerInfo => ({
  name: 'app',
  image: 'app:1',
  state: 'healthy',
  uptime: '1 day',
  cpuPercent: 0,
  memoryBytes: 0,
  rxBytesPerSec: 0,
  txBytesPerSec: 0,
  ioReadBytesPerSec: 0,
  ioWriteBytesPerSec: 0,
  ports: '',
  serviceId: null,
  ...over,
});

describe('containers', () => {
  const list = [
    container({
      name: 'radarr',
      state: 'healthy',
      cpuPercent: 4,
      memoryBytes: 300,
      serviceId: 'radarr',
    }),
    container({
      name: 'n8n',
      state: 'unhealthy',
      cpuPercent: 1,
      memoryBytes: 900,
      serviceId: 'n8n',
    }),
    container({ name: 'redis-10', state: 'running', cpuPercent: 4, memoryBytes: 10 }),
    container({ name: 'redis-2', state: 'exited', cpuPercent: 0, memoryBytes: 0 }),
    container({ name: 'boot', state: 'starting' }),
  ];
  const names = (containers: readonly ContainerInfo[]) => containers.map((c) => c.name);

  it('flags every state that is neither running nor booting', () => {
    expect(list.filter((c) => needsAttention(c.state)).map((c) => c.name)).toEqual([
      'n8n',
      'redis-2',
    ]);
  });

  it('sorts names naturally in either language', () => {
    for (const language of ['it', 'en'] as const) {
      setLanguage(language);
      expect(names(sortContainers(list, 'name'))).toEqual([
        'boot',
        'n8n',
        'radarr',
        'redis-2',
        'redis-10',
      ]);
    }
  });

  it('sorts by state with the worst first, then by name', () => {
    expect(names(sortContainers(list, 'state'))).toEqual([
      'n8n',
      'redis-2',
      'boot',
      'redis-10',
      'radarr',
    ]);
  });

  it('sorts by load with the name as tie-breaker, and by name naturally', () => {
    expect(names(sortContainers(list, 'cpu'))).toEqual([
      'radarr',
      'redis-10',
      'n8n',
      'boot',
      'redis-2',
    ]);
    expect(names(sortContainers(list, 'memory'))[0]).toBe('n8n');
    expect(names(sortContainers(list, 'name'))).toEqual([
      'boot',
      'n8n',
      'radarr',
      'redis-2',
      'redis-10',
    ]);
  });

  it('filters by problems and by text over name, image and service', () => {
    const services = new Map([['radarr', 'Radarr']]);
    expect(names(filterContainers(list, 'problems', '', services))).toEqual(['n8n', 'redis-2']);
    expect(names(filterContainers(list, 'all', ' RADARR ', services))).toEqual(['radarr']);
    expect(names(filterContainers(list, 'problems', 'redis', services))).toEqual(['redis-2']);
    expect(filterContainers(list, 'all', 'zzz', services)).toEqual([]);
  });

  it('prefers the reported counts and derives them otherwise', () => {
    const reported = { total: 9, running: 8, healthy: 5, unhealthy: 1, starting: 0 };
    expect(dockerCounts(reported, list)).toBe(reported);
    expect(dockerCounts(undefined, list)).toEqual({
      total: 5,
      running: 2,
      healthy: 1,
      unhealthy: 1,
      starting: 1,
    });
    expect(dockerCounts(undefined, null)).toBeNull();
  });
});
