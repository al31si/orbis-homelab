import { beforeEach, describe, expect, it } from 'vitest';
import type { DiskInfo, PoolInfo, StorageInfo, VolumeInfo } from '@shared/api';
import { setLanguage } from '@/i18n';
import {
  activeCounters,
  counterTone,
  diskCounterTone,
  diskProblemLine,
  diskTemperatureTone,
  explainProblems,
  isSmartReportStale,
  memberColors,
  memberShares,
  poolViews,
  powerOnSpan,
  problemDisks,
  smartView,
  standaloneVolumes,
  storageSummary,
  usageTone,
  usageVerdict,
  volumeSubtitle,
  volumeTitle,
} from './derive';
import { diskColor } from './diskColors';

const disk = (over: Partial<DiskInfo>): DiskInfo => ({
  label: 'media-1',
  device: '/dev/sdb',
  model: 'Model',
  serialTail: '1234',
  smart: 'PASSED',
  status: 'OK',
  message: '',
  temperatureC: 36,
  reallocated: 0,
  pending: 0,
  uncorrectable: 0,
  uncorrectableHistorical: false,
  smartErrors: 0,
  powerOnHours: 100,
  mount: '/mnt/disk1',
  sizeBytes: 1000,
  usedBytes: 100,
  availableBytes: 900,
  percent: 10,
  ...over,
});

const volume = (over: Partial<VolumeInfo>): VolumeInfo => ({
  mount: '/mnt/disk1',
  label: null,
  device: '/dev/sdb1',
  type: 'ext4',
  sizeBytes: 1000,
  usedBytes: 100,
  availableBytes: 900,
  percent: 10,
  ...over,
});

const pool = (over: Partial<PoolInfo>): PoolInfo => ({
  id: 'media',
  label: 'Media',
  mount: '/srv/media',
  sizeBytes: 3000,
  usedBytes: 400,
  availableBytes: 2600,
  percent: 13,
  members: ['/mnt/disk1', '/mnt/disk2'],
  ...over,
});

const storage = (over: Partial<StorageInfo>): StorageInfo => ({
  volumes: [],
  pools: [],
  disks: [],
  smart: null,
  ...over,
});

const smartSummary = {
  status: 'OK' as const,
  checkedAt: '2026-01-01T00:00:00Z',
  ageSeconds: 60,
  temperatureWarnC: 45,
  temperatureCriticalC: 55,
};

beforeEach(() => setLanguage('it'));

describe('usage thresholds', () => {
  it('turns amber at 85% and red at 95%', () => {
    expect(usageTone(84.9)).toBe('ok');
    expect(usageTone(85)).toBe('warn');
    expect(usageTone(94.9)).toBe('warn');
    expect(usageTone(95)).toBe('crit');
  });

  it('words the verdict in the instance language', () => {
    setLanguage('it');
    expect(usageVerdict(12)).toBe('Capienza in ordine');
    expect(usageVerdict(90)).toBe('Spazio in esaurimento');
    expect(usageVerdict(97)).toBe('Spazio quasi esaurito');
    setLanguage('en');
    expect(usageVerdict(12)).toBe('Plenty of space');
    expect(usageVerdict(90)).toBe('Running low on space');
    expect(usageVerdict(97)).toBe('Almost out of space');
  });
});

describe('isSmartReportStale', () => {
  it('flags reports older than 45 minutes only', () => {
    expect(isSmartReportStale(15 * 60)).toBe(false);
    expect(isSmartReportStale(45 * 60)).toBe(false);
    expect(isSmartReportStale(45 * 60 + 1)).toBe(true);
  });
});

describe('powerOnSpan', () => {
  it('splits hours into years and days in both languages', () => {
    expect(powerOnSpan(24)).toBe('1 giorno');
    expect(powerOnSpan(24 * 40)).toBe('40 giorni');
    expect(powerOnSpan(24 * 365)).toBe('1 anno');
    expect(powerOnSpan(24 * (365 * 2 + 1))).toBe('2 anni e 1 giorno');
    setLanguage('en');
    expect(powerOnSpan(24)).toBe('1 day');
    expect(powerOnSpan(24 * 365)).toBe('1 year');
    expect(powerOnSpan(24 * (365 * 2 + 5))).toBe('2 years and 5 days');
  });

  it('never goes negative', () => {
    expect(powerOnSpan(-5)).toBe('0 giorni');
  });
});

describe('disk temperature and counters', () => {
  it('judges the temperature against the report limits', () => {
    expect(diskTemperatureTone(null, smartSummary)).toBe('neutral');
    expect(diskTemperatureTone(40, smartSummary)).toBe('ok');
    expect(diskTemperatureTone(45, smartSummary)).toBe('warn');
    expect(diskTemperatureTone(55, smartSummary)).toBe('crit');
  });

  it('is neutral at zero and severe only for sectors that put data at risk', () => {
    expect(counterTone('pending', 0)).toBe('neutral');
    expect(counterTone('reallocated', 3)).toBe('warn');
    expect(counterTone('pending', 1)).toBe('crit');
    expect(counterTone('uncorrectable', 1)).toBe('crit');
    expect(counterTone('smartErrors', 2)).toBe('warn');
  });

  it('treats a historical uncorrectable counter as information, not a fault', () => {
    const historical = disk({ uncorrectable: 2, uncorrectableHistorical: true });
    expect(diskCounterTone(historical, 'uncorrectable')).toBe('neutral');
    expect(activeCounters(historical)).toEqual([]);
    const active = disk({ uncorrectable: 2 });
    expect(diskCounterTone(active, 'uncorrectable')).toBe('crit');
    expect(activeCounters(active)).toEqual(['uncorrectable']);
  });
});

describe('problemDisks', () => {
  it('lists disks that are not OK, critical first, keeping the order otherwise', () => {
    const list = [
      disk({ label: 'a', status: 'WARNING' }),
      disk({ label: 'b' }),
      disk({ label: 'c', status: 'CRITICAL' }),
      disk({ label: 'd', status: 'WARNING' }),
    ];
    expect(problemDisks(list).map((d) => d.label)).toEqual(['c', 'a', 'd']);
  });
});

describe('diskProblemLine', () => {
  it('uses the message and the temperature, else the SMART verdict', () => {
    expect(diskProblemLine(disk({ message: 'pending sectors', temperatureC: 41.6 }))).toBe(
      'pending sectors · 42\u00a0°C',
    );
    expect(diskProblemLine(disk({ message: ' ', temperatureC: null, smart: 'FAILED' }))).toBe(
      'Stato SMART: Fallito',
    );
    setLanguage('en');
    expect(diskProblemLine(disk({ message: '', temperatureC: null, smart: 'PASSED' }))).toBe(
      'SMART status: Passed',
    );
  });
});

describe('explainProblems', () => {
  it('explains only the defects that are present', () => {
    const { meanings, advice } = explainProblems([disk({ pending: 2, smart: 'PASSED' })]);
    expect(meanings).toHaveLength(2);
    expect(meanings[0]).toContain('pending');
    expect(meanings[1]).toContain('«superato»');
    expect(advice).toContain('backup');
  });

  it('ignores a historical uncorrectable counter', () => {
    const { meanings } = explainProblems([
      disk({ uncorrectable: 3, uncorrectableHistorical: true, smart: 'UNAVAILABLE' }),
    ]);
    expect(meanings).toEqual([]);
  });

  it('prefers the failed verdict over the passed one', () => {
    const { meanings } = explainProblems([
      disk({ smart: 'PASSED', reallocated: 1 }),
      disk({ smart: 'FAILED' }),
    ]);
    expect(meanings.some((line) => line.includes('«fallito»'))).toBe(true);
    expect(meanings.some((line) => line.includes('«superato»'))).toBe(false);
  });

  it('is available in English', () => {
    setLanguage('en');
    const { meanings } = explainProblems([disk({ smart: 'FAILED', reallocated: 1 })]);
    expect(meanings[0]).toContain('reallocated sector');
    expect(meanings[1]).toContain('“failed”');
  });
});

describe('pool and volume grouping', () => {
  const root = volume({ mount: '/', device: '/dev/sda2', label: 'System' });
  const first = volume({ mount: '/mnt/disk1', usedBytes: 300 });
  const second = volume({ mount: '/mnt/disk2', device: '/dev/sdc1', usedBytes: 100 });
  const unrelated = volume({ mount: '/mnt/backup', device: '/dev/sdd1' });

  it('resolves pool members to their volumes in the pool order', () => {
    const [view] = poolViews(
      storage({
        pools: [pool({ members: ['/mnt/disk2', '/mnt/disk1'] })],
        volumes: [root, first, second],
      }),
    );
    expect(view?.members.map((member) => member.volume.mount)).toEqual([
      '/mnt/disk2',
      '/mnt/disk1',
    ]);
  });

  it('drops members without a volume and repeated mounts', () => {
    const [view] = poolViews(
      storage({
        pools: [pool({ members: ['/mnt/disk1', '/mnt/disk1', '/mnt/gone'] })],
        volumes: [first],
      }),
    );
    expect(view?.members).toHaveLength(1);
  });

  it('keeps pool members out of the volume list, and the pool mount too', () => {
    const data = storage({
      pools: [pool({})],
      volumes: [root, first, second, unrelated, volume({ mount: '/srv/media' })],
    });
    expect(standaloneVolumes(data).map((v) => v.mount)).toEqual(['/', '/mnt/backup']);
  });

  it('lists every volume when there are no pools', () => {
    const data = storage({ volumes: [root, first] });
    expect(poolViews(data)).toEqual([]);
    expect(standaloneVolumes(data)).toEqual([root, first]);
  });

  it('shares the used space across members by volume', () => {
    const [view] = poolViews(storage({ pools: [pool({})], volumes: [first, second] }));
    const shares = memberShares(view?.members ?? []);
    expect(shares.map((share) => [share.label, share.percent])).toEqual([
      ['/mnt/disk1', 75],
      ['/mnt/disk2', 25],
    ]);
  });

  it('labels a share with the volume label when there is one', () => {
    const [view] = poolViews(
      storage({
        pools: [pool({ members: ['/mnt/disk1'] })],
        volumes: [volume({ mount: '/mnt/disk1', label: 'Photos' })],
      }),
    );
    expect(memberShares(view?.members ?? [])[0]?.label).toBe('Photos');
  });

  it('does not divide by zero on an empty pool', () => {
    const [view] = poolViews(
      storage({
        pools: [pool({ members: ['/mnt/disk1'] })],
        volumes: [volume({ usedBytes: 0 })],
      }),
    );
    expect(memberShares(view?.members ?? [])[0]?.percent).toBe(0);
  });

  it('gives every member its own tint, keyed by mount, from its index in the pool', () => {
    const views = poolViews(
      storage({
        pools: [pool({}), pool({ id: 'other', mount: '/srv/other', members: ['/mnt/backup'] })],
        volumes: [first, second, unrelated],
      }),
    );
    const colors = memberColors(views);
    expect(colors.get('/mnt/disk1')).toBe('var(--accent)');
    expect(colors.get('/mnt/disk2')).not.toBe(colors.get('/mnt/disk1'));
    expect(colors.get('/mnt/backup')).toBe('var(--accent)');
    expect(colors.get('/')).toBeUndefined();
  });
});

describe('volume text', () => {
  it('uses the label as title, else the mount, and never repeats the mount', () => {
    const labelled = volume({ label: 'Photos' });
    expect(volumeTitle(labelled)).toBe('Photos');
    expect(volumeSubtitle(labelled)).toBe('/mnt/disk1 · /dev/sdb1 · ext4');
    const plain = volume({});
    expect(volumeTitle(plain)).toBe('/mnt/disk1');
    expect(volumeSubtitle(plain)).toBe('/dev/sdb1 · ext4');
  });

  it('skips empty parts', () => {
    expect(volumeSubtitle(volume({ device: '', type: 'zfs' }))).toBe('zfs');
  });
});

describe('diskColor', () => {
  it('starts with the accent and fades evenly towards the last item', () => {
    expect(diskColor(0, 4)).toBe('var(--accent)');
    expect(diskColor(3, 4)).toBe('color-mix(in srgb, var(--accent) 28%, transparent)');
    expect(diskColor(1, 4)).not.toBe(diskColor(2, 4));
  });

  it('copes with a single item and with an index past the end', () => {
    expect(diskColor(0, 1)).toBe('var(--accent)');
    expect(diskColor(9, 3)).toBe(diskColor(2, 3));
  });
});

describe('smartView', () => {
  const withDisks = storage({ disks: [disk({})], smart: smartSummary });

  it('exists only when enabled, with a report and with disks', () => {
    expect(smartView(withDisks, true)?.disks).toHaveLength(1);
    expect(smartView(withDisks, false)).toBeNull();
    expect(smartView({ ...withDisks, smart: null }, true)).toBeNull();
    expect(smartView({ ...withDisks, disks: [] }, true)).toBeNull();
    expect(smartView(storage({}), true)).toBeNull();
  });
});

describe('storageSummary', () => {
  it('counts only what the instance has', () => {
    const full = storage({
      pools: [pool({})],
      volumes: [volume({}), volume({ mount: '/' })],
      disks: [disk({})],
      smart: smartSummary,
    });
    expect(storageSummary(full, smartView(full, true))).toBe('1 pool · 2 volumi · 1 disco');
    setLanguage('en');
    expect(storageSummary(full, smartView(full, true))).toBe('1 pool · 2 volumes · 1 disk');
  });

  it('is just the volumes on a volumes-only installation', () => {
    const only = storage({
      volumes: [volume({}), volume({ mount: '/' }), volume({ mount: '/b' })],
    });
    expect(storageSummary(only, smartView(only, true))).toBe('3 volumi');
  });
});
