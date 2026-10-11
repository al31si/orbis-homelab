import type { Localized } from '../../../../shared/i18n.js';
import type { alerts as ref } from '../it/alerts.js';

export const alerts: Localized<typeof ref> = {
  'alerts.resolved': (p) => `Resolved: ${p.title}`,
  'alerts.startupTitle': (p) => `${p.name} started`,
  'alerts.startupDetail': (p) => `Version ${p.version}`,

  'alerts.sourceSystem': 'System',
  'alerts.sourceContainers': 'Containers',
  'alerts.sourceStorage': 'Storage',
  'alerts.sourceSmart': 'SMART report',
  'alerts.sourceProbes': 'Service probes',

  'alerts.systemDownTitle': 'System source unreachable',
  'alerts.systemDownDetail':
    'Host metrics and container state are unavailable: the data shown is out of date.',
  'alerts.memoryTitle': 'Memory almost exhausted',
  'alerts.memoryDetail': (p) =>
    `Available RAM ${Math.round(p.available)}% (${Math.round(p.used)}% in use).`,
  'alerts.swapTitle': 'Heavy swap use with little free RAM',
  'alerts.swapDetail': (p) =>
    `Swap at ${Math.round(p.swap)}% and available RAM ${Math.round(p.available)}%.`,
  'alerts.loadTitle': 'High sustained load',
  'alerts.loadDetail': (p) => `15-minute load average ${p.load.toFixed(1)} on ${p.cores} cores.`,
  'alerts.temperatureTitle': 'CPU temperature high',
  'alerts.temperatureDetail': (p) => `${p.label}: ${Math.round(p.celsius)} °C.`,

  'alerts.smartDownTitle': 'SMART report unavailable',
  'alerts.smartDownDetail': 'The disk health report cannot be read.',
  'alerts.smartStaleTitle': 'SMART report out of date',
  'alerts.smartStaleDetail': (p) =>
    p.minutes === 1 ? 'Last checked 1 minute ago.' : `Last checked ${p.minutes} minutes ago.`,
  'alerts.diskCritical': (p) => `${p.label}: disk critical`,
  'alerts.diskWarning': (p) => `${p.label}: disk needs attention`,
  'alerts.diskDetail': (p) =>
    `${p.message || 'Abnormal SMART status'}${p.temperatureC === null ? '' : ` · ${p.temperatureC} °C`}`,
  'alerts.poolTitle': (p) => `${p.label} pool almost full`,
  'alerts.poolDetail': (p) => `${p.label} pool is ${Math.round(p.percent)}% full.`,
  'alerts.volumeTitle': (p) => `Filesystem ${p.mount} almost full`,
  'alerts.volumeDetail': (p) => `${p.mount} is ${Math.round(p.percent)}% full.`,

  'alerts.serviceDown': (p) => `${p.name} is down`,
  'alerts.serviceDegraded': (p) => `${p.name} is degraded`,
  'alerts.containerTitle': (p) => `Container ${p.name}: ${p.state}`,
  'alerts.containerDetail': 'Container is not in the service catalog.',

  'alerts.integrationDownTitle': (p) => `${p.label} integration not responding`,
  'alerts.integrationDownDetail': (p) =>
    `The service responds but its API does not (${p.error}). Check the credential.`,
  'alerts.extensionFailedTitle': (p) => `Extension ${p.id} failed`,
};
