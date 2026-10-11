import { defineMessages } from '../../../../shared/i18n.js';

/** Server-generated texts (integration badges, metrics, alerts). Keys must start with 'integrations.'. */
export const integrations = defineMessages({
  'integrations.metricVersion': 'Versione',

  'integrations.arrUpdate': (p: { version: string }) => `Aggiornamento ${p.version}`,
  'integrations.arrError': 'Errore',
  'integrations.arrWarning': 'Avviso',
  'integrations.arrQueueErrors': 'Coda con errori',
  'integrations.arrQueueWarnings': 'Coda con avvisi',
  'integrations.arrQueued': 'In coda',
  'integrations.arrHealthTitle': (p: { name: string }) => `${p.name}: errore di health`,
  'integrations.arrQueueTitle': (p: { name: string }) => `${p.name}: coda con errori`,
  'integrations.arrQueueDetail': (p: { count: number }) =>
    `${p.count} elementi in coda, almeno uno con errore`,

  'integrations.qbitDisconnected': 'Non connesso',
  'integrations.qbitErrored': (p: { count: number }) => `${p.count} con errori`,
  'integrations.qbitDownload': 'Download',
  'integrations.qbitUpload': 'Upload',
  'integrations.qbitDownloading': 'In scaricamento',
  'integrations.qbitSeeding': 'In seeding',
  'integrations.qbitAlertTitle': 'qBittorrent non connesso',
  'integrations.qbitAlertDetail': 'Il client risulta senza connettività di rete.',

  'integrations.jellyfinPlaying': (p: { count: number }) => `${p.count} in riproduzione`,
  'integrations.jellyfinActive': 'Riproduzioni attive',
  'integrations.jellyfinUnknownUser': 'Sconosciuto',

  'integrations.vikunjaOverdueBadge': (p: { count: number }) => `${p.count} in ritardo`,
  'integrations.vikunjaOpen': 'Task aperti',
  'integrations.vikunjaOverdue': 'In ritardo',
});
