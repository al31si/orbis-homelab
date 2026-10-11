import type { Localized } from '../../../../shared/i18n.js';
import type { integrations as ref } from '../it/integrations.js';

export const integrations: Localized<typeof ref> = {
  'integrations.metricVersion': 'Version',

  'integrations.arrUpdate': (p) => `Update ${p.version}`,
  'integrations.arrError': 'Error',
  'integrations.arrWarning': 'Warning',
  'integrations.arrQueueErrors': 'Queue errors',
  'integrations.arrQueueWarnings': 'Queue warnings',
  'integrations.arrQueued': 'Queued',
  'integrations.arrHealthTitle': (p) => `${p.name}: health error`,
  'integrations.arrQueueTitle': (p) => `${p.name}: queue errors`,
  'integrations.arrQueueDetail': (p) =>
    `${p.count} ${p.count === 1 ? 'item' : 'items'} queued, at least one with an error`,

  'integrations.qbitDisconnected': 'Disconnected',
  'integrations.qbitErrored': (p) => `${p.count} with errors`,
  'integrations.qbitDownload': 'Download',
  'integrations.qbitUpload': 'Upload',
  'integrations.qbitDownloading': 'Downloading',
  'integrations.qbitSeeding': 'Seeding',
  'integrations.qbitAlertTitle': 'qBittorrent disconnected',
  'integrations.qbitAlertDetail': 'The client has no network connectivity.',

  'integrations.jellyfinPlaying': (p) => `${p.count} playing`,
  'integrations.jellyfinActive': 'Active streams',
  'integrations.jellyfinUnknownUser': 'Unknown',

  'integrations.vikunjaOverdueBadge': (p) => `${p.count} overdue`,
  'integrations.vikunjaOpen': 'Open tasks',
  'integrations.vikunjaOverdue': 'Overdue',
};
