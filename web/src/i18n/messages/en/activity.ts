import type { Localized } from '@shared/i18n';
import type { activity as ref } from '../it/activity';

export const activity: Localized<typeof ref> = {
  'activity.title': 'Activity',
  'activity.subtitle': (p) => `What’s happening on ${p.name}`,
  'activity.loading': 'Loading',
  'activity.offline.title': (p) => `${p.name} is unreachable`,
  'activity.offline.description':
    'There is no saved data on this device yet. I’ll try again as soon as the connection is back.',
  'activity.retry': 'Retry',

  'activity.alerts.title': 'Alerts',
  'activity.alerts.none': 'No active alerts',
  'activity.alerts.failed': 'Can’t read the alerts',

  'activity.snapshot.failed': (p) => `Can’t read ${p.label}`,
  'activity.snapshot.stale': 'Out of date',

  'activity.usage.title': (p) => `${p.label} · weekly`,
  'activity.usage.remaining': 'Left this week',
  'activity.usage.resets': (p) => `Resets ${p.moment} · ${p.relative}`,
  'activity.usage.plan': (p) => `${p.plan} plan`,
  'activity.usage.ringLabel': (p) => `${p.label}: ${p.percent}% of the weekly quota left`,
  'activity.usage.pending': 'Waiting for data',
  'activity.usage.pendingText': 'The data for this source is not available yet.',

  'activity.notConfigured.title': (p) => `${p.names}: not configured`,
  'activity.notConfigured.text': (p) =>
    `${p.benefit} It needs ${p.credential}: set ${p.secrets} in the server environment (or point the integration in \`services.yaml\` to another secret).`,

  'activity.downloads.title': 'Downloads',
  'activity.downloads.benefit': 'Torrent speed and status will appear here.',
  'activity.downloads.credential': 'an API key',
  'activity.downloads.connected': 'Connected',
  'activity.downloads.disconnected': 'Not connected',
  'activity.downloads.download': 'Download',
  'activity.downloads.upload': 'Upload',
  'activity.downloads.active': 'Active',
  'activity.downloads.downloading': 'Downloading',
  'activity.downloads.seeding': 'Seeding',
  'activity.downloads.paused': 'Paused',
  'activity.downloads.errored': 'Errors',

  'activity.media.title': 'Media queues',
  'activity.media.label': 'the media queues',
  'activity.media.benefit': 'Queues, warnings and updates will appear here.',
  'activity.media.credential': 'an API key for each app',
  'activity.media.none': 'No media application is active.',
  'activity.media.listLabel': 'Media application queues',
  'activity.media.version': (p) => `v${p.version}`,
  'activity.media.versionUnknown': 'Unknown version',
  'activity.media.queueErrors': 'Errors in the queue',
  'activity.media.queueWarnings': 'Warnings in the queue',
  'activity.media.update': (p) => `Update ${p.version}`,
  'activity.media.queueEmpty': 'Queue empty',
  'activity.media.queued': (p) => `${p.n} queued`,

  'activity.tasks.title': 'Tasks',
  'activity.tasks.benefit': 'Open and overdue tasks will appear here.',
  'activity.tasks.credential': 'a read-only API token',
  'activity.tasks.open': 'Open',
  'activity.tasks.overdue': 'Overdue',
  'activity.tasks.overdueOn': (p) => `Overdue ${p.date}`,
  'activity.tasks.restricted': 'Titles hidden with limited access',
  'activity.tasks.none': 'No open tasks',
  'activity.tasks.listLabel': 'Tasks to do',

  'activity.playback.title': 'Playback',
  'activity.playback.benefit': 'Who is watching what will appear here.',
  'activity.playback.credential': 'a read-only API key',
  'activity.playback.none': 'Nothing playing',
  'activity.playback.count': (p) => (p.n === 1 ? '1 stream playing' : `${p.n} streams playing`),
  'activity.playback.restricted': 'Details hidden with limited access',
  'activity.playback.listLabel': 'Current streams',
  'activity.playback.paused': 'Paused',
  'activity.playback.transcoding': 'Transcoding',

  'activity.events.title': 'Event log',
  'activity.events.none': 'No events recorded',
  'activity.events.showMore': (p) => `Show more (${p.n})`,
  'activity.events.today': 'Today',
  'activity.events.yesterday': 'Yesterday',
};
