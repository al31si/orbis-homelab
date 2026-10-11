import type { Localized } from '@shared/i18n';
import type { storage as ref } from '../it/storage';

export const storage: Localized<typeof ref> = {
  // page
  'storage.title': 'Storage',
  'storage.loading': 'Loading',
  'storage.retry': 'Retry',
  'storage.stale': 'Data out of date',
  'storage.offline.title': (p) => `${p.name} is unreachable`,
  'storage.offline.description':
    'No data has been saved on this device yet. It will load as soon as the connection is back.',
  'storage.error': 'Storage data unavailable',
  'storage.empty.title': 'No storage data',
  'storage.empty.description': 'No volumes or disks to show were found.',
  'storage.summary.pools': (p) => (p.n === 1 ? '1 pool' : `${p.n} pools`),
  'storage.summary.volumes': (p) => (p.n === 1 ? '1 volume' : `${p.n} volumes`),
  'storage.summary.disks': (p) => (p.n === 1 ? '1 disk' : `${p.n} disks`),

  // usage verdicts (pools and volumes)
  'storage.verdict.critical': 'Almost out of space',
  'storage.verdict.warn': 'Running low on space',
  'storage.verdict.ok': 'Plenty of space',

  // pools
  'storage.pool.section': 'Pool',
  'storage.pool.sectionMany': 'Pools',
  'storage.pool.usage': 'pool usage',
  'storage.pool.used': 'Used',
  'storage.pool.free': 'Free',
  'storage.pool.total': 'Total',
  'storage.pool.gauge': 'Pool space used',
  'storage.pool.share': 'Used space by volume',
  'storage.pool.shareText': (p) => `${p.name} ${p.size}, ${p.percent} of the used space`,
  'storage.pool.members': 'Pool volumes',

  // volumes
  'storage.volumes.section': 'Volumes',
  'storage.volumes.others': 'Other volumes',
  'storage.volume.usage': (p) => `Space used on ${p.name}`,
  'storage.volume.line': (p) => `${p.used} used · ${p.free} free · ${p.total} total`,

  // disk health
  'storage.status.OK': 'Healthy',
  'storage.status.WARNING': 'Warning',
  'storage.status.CRITICAL': 'Critical',
  'storage.health.section': 'Disk health',
  'storage.health.allHealthy': 'All disks healthy',
  'storage.health.check': 'SMART check',
  'storage.health.lastCheck': 'Last SMART check',
  'storage.health.staleTitle': 'SMART report out of date',
  'storage.health.staleText': (p) =>
    `The report has not been updated for more than ${p.minutes} minutes: the disk status shown here may be outdated.`,
  'storage.health.unavailableAll': 'SMART data unavailable',
  'storage.health.unavailableSome': (p) => `SMART data unavailable for ${p.names}`,
  'storage.health.unavailableText':
    'The report has no SMART readings for these disks: temperature and counters cannot be assessed.',
  'storage.health.meaningsSummary': 'What these values mean',
  'storage.health.advice':
    'The disk may keep working for a long time, but this is an early sign of wear: make sure you have an up-to-date backup of your important data.',
  'storage.health.smartState': (p) => `SMART status: ${p.state}`,

  // SMART counters
  'storage.counter.reallocated': 'Reallocated',
  'storage.counter.pending': 'Pending',
  'storage.counter.uncorrectable': 'Uncorrectable',
  'storage.counter.smartErrors': 'SMART errors',
  'storage.counterInline.reallocated': 'reallocated',
  'storage.counterInline.pending': 'pending',
  'storage.counterInline.uncorrectable': 'uncorrectable',
  'storage.counterInline.smartErrors': 'SMART errors',
  'storage.meaning.pending':
    'A pending sector is a block the disk cannot read reliably: it waits to be rewritten or replaced.',
  'storage.meaning.uncorrectable':
    'An uncorrectable sector is a block the disk could not read even with error correction: the data stored there may be lost.',
  'storage.meaning.reallocated':
    'A reallocated sector is a defective block replaced by a spare one. A few are normal, but a count that keeps growing points to wear.',
  'storage.meaning.smartErrors':
    'SMART errors are anomalies the disk has recorded in its own internal log.',
  'storage.meaning.failed':
    'The overall SMART verdict is “failed”: the disk is reporting an imminent failure.',
  'storage.meaning.passed':
    'The overall SMART verdict is “passed”: the disk does not report an imminent failure, but the counters show problem sectors.',

  // disks
  'storage.disks.section': 'Disks',
  'storage.disks.list': 'Disks',
  'storage.disks.colDisk': 'Disk',
  'storage.disks.colStatus': 'Status',
  'storage.disks.colUsage': 'Usage',
  'storage.disks.colSmart': 'SMART',
  'storage.disks.colTemperature': 'Temp.',
  'storage.disks.colPowerOn': 'Power-on',
  'storage.disks.colCounters': 'Sectors and errors',
  'storage.disks.serial': (p) => `Serial …${p.tail} · ${p.device}`,
  'storage.disks.unverified': 'Unverified',
  'storage.disks.usageOf': (p) => `${p.used} of ${p.total}`,
  'storage.disks.free': (p) => `${p.value} free`,
  'storage.disks.noSpace': 'Space not available',
  'storage.disks.smart': 'SMART',
  'storage.disks.temperature': 'Temperature',
  'storage.disks.powerOn': 'Power-on time',
  'storage.disks.hours': (p) => `${p.n} h`,
  'storage.disks.limits': (p) => `Temperature: warning from ${p.warn}, critical from ${p.crit}.`,
  'storage.smart.PASSED': 'Passed',
  'storage.smart.FAILED': 'Failed',
  'storage.smart.UNAVAILABLE': 'Unavailable',
  'storage.span.days': (p) => `${p.n} ${p.n === 1 ? 'day' : 'days'}`,
  'storage.span.years': (p) => `${p.n} ${p.n === 1 ? 'year' : 'years'}`,
  'storage.span.yearsAndDays': (p) => `${p.years} and ${p.days}`,
};
