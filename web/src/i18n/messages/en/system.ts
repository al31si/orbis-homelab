import type { Localized } from '@shared/i18n';
import type { system as ref } from '../it/system';

export const system: Localized<typeof ref> = {
  // page
  'system.title': 'System',
  'system.tabs.label': 'Section',
  'system.tabs.resources': 'Resources',
  'system.tabs.docker': 'Docker',
  'system.loading': 'Loading',
  'system.retry': 'Retry',
  'system.stale': 'Data out of date',
  'system.offline.title': (p) => `${p.name} is unreachable`,
  'system.offline.description':
    'No data has been saved on this device yet. It will load as soon as the connection is back.',
  'system.error.system': 'System data unavailable',
  'system.error.containers': 'Container list unavailable',
  'system.section.docker': 'Docker',
  'system.section.containers': 'Containers',

  // host
  'system.host.title': 'Host',
  'system.host.host': 'Name',
  'system.host.uptime': 'Uptime',
  'system.host.os': 'System',
  'system.host.kernel': 'Kernel',
  'system.host.cores': 'Cores',

  // shared by the charts
  'system.stats.avg': (p) => `avg ${p.value}`,
  'system.stats.peak': (p) => `peak ${p.value}`,
  'system.chart.label': (p) => `${p.label} trend`,
  'system.chart.summary': (p) =>
    `${p.label} over the last ${p.span}: minimum ${p.min}, maximum ${p.max}, now ${p.now}.`,
  'system.chart.ago': (p) => `${p.span} ago`,
  'system.chart.now': 'now',

  // cpu
  'system.cpu.title': 'CPU',
  'system.cpu.inUse': (p) => `in use across ${p.cores} ${p.cores === 1 ? 'core' : 'cores'}`,
  'system.cpu.user': 'User',
  'system.cpu.system': 'System',
  'system.cpu.iowait': 'I/O wait',
  'system.cpu.breakdown': 'CPU usage breakdown',
  'system.cpu.chartLabel': 'CPU chart',
  'system.cpu.metricUsage': 'Usage',
  'system.cpu.metricLoad': 'Load',
  'system.cpu.usageSeries': 'CPU usage',
  'system.cpu.loadSeries': '1-minute load average',
  'system.cpu.loadTitle': 'Load average',
  'system.cpu.loadScale': (p) => `${p.cores} ${p.cores === 1 ? 'core' : 'cores'} = full scale`,
  'system.cpu.window': (p) => `${p.minutes} min`,
  'system.cpu.loadAt': (p) => `Load over ${p.window}`,
  'system.cpu.perCore': 'Per core',
  'system.cpu.core': (p) => `Core ${p.n}`,

  // memory
  'system.memory.title': 'Memory',
  'system.memory.used': 'In use',
  'system.memory.usedText': (p) => `In use ${p.value}`,
  'system.memory.cache': 'Reclaimable cache',
  'system.memory.cacheText': (p) => `Cache ${p.value}`,
  'system.memory.free': 'Free',
  'system.memory.freeText': (p) => `Free ${p.value}`,
  'system.memory.ofTotal': (p) => `${p.used} of ${p.total}`,
  'system.memory.availableOf': (p) => `${p.value} available`,
  'system.memory.series': 'Memory usage',
  'system.swap.title': 'Swap',
  'system.swap.usage': (p) => `${p.used} of ${p.total}`,
  'system.swap.none': 'Not configured',
  'system.swap.bar': 'Swap used',
  'system.swap.lowMemory.title': 'Very little RAM available',
  'system.swap.lowMemory.text': (p) =>
    `Less than ${p.critical}% of RAM is left: the system may start terminating processes.`,
  'system.swap.pressure.title': 'Swap almost full and RAM running low',
  'system.swap.pressure.text': (p) =>
    `Swap is at ${p.swap}% or more and available RAM is below ${p.low}%: the disk is acting as memory.`,
  'system.swap.normal.title': 'High swap, but normal',
  'system.swap.normal.text': (p) =>
    `Linux moves rarely used pages to swap even with free RAM. You only get an alert if available RAM drops below ${p.critical}%, or below ${p.low}% with swap at ${p.swap}% or more.`,

  // temperature
  'system.temperature.title': 'Temperature',
  'system.temperature.empty': 'No temperature sensors available.',
  'system.temperature.cores': 'CPU cores',
  'system.temperature.others': 'Other sensors',
  'system.temperature.ok': 'Normal',
  'system.temperature.warn': 'High',
  'system.temperature.crit': 'Critical',
  'system.temperature.noLimits': 'No limits',
  'system.temperature.warnAt': (p) => `warning at ${p.value}`,
  'system.temperature.critAt': (p) => `critical at ${p.value}`,
  'system.temperature.limits': (p) => `Thresholds: ${p.parts}.`,

  // disk I/O
  'system.diskIo.title': 'Disk I/O',
  'system.diskIo.empty': 'No I/O data available.',
  'system.diskIo.list': 'Read and write speed per disk',
  'system.diskIo.colDisk': 'Disk',
  'system.diskIo.read': 'Read',
  'system.diskIo.write': 'Write',

  // docker
  'system.docker.runningOf': (p) => `of ${p.total}`,
  'system.docker.running': 'containers running',
  'system.docker.runningBar': 'Running containers',
  'system.docker.summary': (p) => {
    const parts = [
      p.healthy > 0 && `${p.healthy} healthy`,
      p.unhealthy > 0 && `${p.unhealthy} unhealthy`,
      p.starting > 0 && `${p.starting} starting`,
    ].filter(Boolean);
    return parts.length > 0 ? `${parts.join(', ')}.` : 'No health checks active.';
  },
  'system.docker.traffic': 'Container traffic',
  'system.docker.received': 'received',
  'system.docker.sent': 'sent',
  'system.docker.trafficNote': 'Sum of all containers, not of the host’s network adapter.',

  // containers
  'system.state.healthy': 'Healthy',
  'system.state.running': 'Running',
  'system.state.starting': 'Starting',
  'system.state.unhealthy': 'Unhealthy',
  'system.state.paused': 'Paused',
  'system.state.restarting': 'Restarting',
  'system.state.exited': 'Exited',
  'system.state.dead': 'Dead',
  'system.state.unknown': 'Unknown',
  'system.containers.sortState': 'State',
  'system.containers.sortCpu': 'CPU',
  'system.containers.sortMemory': 'RAM',
  'system.containers.sortName': 'Name',
  'system.containers.sortLabel': 'Sort containers by',
  'system.containers.search': 'Search containers or services',
  'system.containers.all': 'All',
  'system.containers.problems': 'With problems',
  'system.containers.none': 'No containers found.',
  'system.containers.allFine': 'No containers with problems: all good.',
  'system.containers.noMatch': 'No containers match your search.',
  'system.containers.list': 'Containers',
  'system.containers.colContainer': 'Container',
  'system.containers.colCpu': 'CPU',
  'system.containers.colMemory': 'Memory',
  'system.containers.colUptime': 'Uptime',

  // The source already reports English phrases ("2 mins", "a week").
  'system.uptime': (p) => p.text,
};
