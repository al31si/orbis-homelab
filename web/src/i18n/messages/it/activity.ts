import { defineMessages } from '@shared/i18n';

/** Keys must start with 'activity.'. Italian is the reference dictionary. */
export const activity = defineMessages({
  'activity.title': 'Attività',
  'activity.subtitle': (p: { name: string }) => `Cosa sta succedendo su ${p.name}`,
  'activity.loading': 'Caricamento',
  'activity.offline.title': (p: { name: string }) => `${p.name} non raggiungibile`,
  'activity.offline.description':
    'Non ci sono ancora dati salvati su questo dispositivo. Riproverò appena la connessione torna.',
  'activity.retry': 'Riprova',

  'activity.alerts.title': 'Avvisi',
  'activity.alerts.none': 'Nessun avviso attivo',
  'activity.alerts.failed': 'Non riesco a leggere gli avvisi',

  'activity.snapshot.failed': (p: { label: string }) => `Non riesco a leggere ${p.label}`,
  'activity.snapshot.stale': 'Non aggiornato',

  'activity.usage.title': (p: { label: string }) => `${p.label} · settimana`,
  'activity.usage.remaining': 'Rimasta questa settimana',
  'activity.usage.resets': (p: { moment: string; relative: string }) =>
    `Si azzera ${p.moment} · ${p.relative}`,
  'activity.usage.plan': (p: { plan: string }) => `Piano ${p.plan}`,
  'activity.usage.ringLabel': (p: { label: string; percent: number }) =>
    `${p.label}: ${p.percent}% della quota settimanale rimasta`,
  'activity.usage.pending': 'In attesa dei dati',
  'activity.usage.pendingText': 'I dati di questa fonte non sono ancora disponibili.',

  'activity.notConfigured.title': (p: { names: string }) => `${p.names}: non configurato`,
  'activity.notConfigured.text': (p: { benefit: string; credential: string; secrets: string }) =>
    `${p.benefit} Serve ${p.credential}: imposta ${p.secrets} nell’ambiente del server (o indica un altro segreto nell’integrazione in \`services.yaml\`).`,

  'activity.downloads.title': 'Download',
  'activity.downloads.benefit': 'Qui compariranno velocità e stato dei torrent.',
  'activity.downloads.credential': 'una chiave API',
  'activity.downloads.connected': 'Connesso',
  'activity.downloads.disconnected': 'Non connesso',
  'activity.downloads.download': 'Download',
  'activity.downloads.upload': 'Upload',
  'activity.downloads.active': 'Attivi',
  'activity.downloads.downloading': 'Download',
  'activity.downloads.seeding': 'Seed',
  'activity.downloads.paused': 'Pausa',
  'activity.downloads.errored': 'Errori',

  'activity.media.title': 'Code media',
  'activity.media.label': 'le code media',
  'activity.media.benefit': 'Qui compariranno code, avvisi e aggiornamenti.',
  'activity.media.credential': 'una chiave API per ogni app',
  'activity.media.none': 'Nessuna applicazione multimediale attiva.',
  'activity.media.listLabel': 'Code delle applicazioni multimediali',
  'activity.media.version': (p: { version: string }) => `v${p.version}`,
  'activity.media.versionUnknown': 'Versione sconosciuta',
  'activity.media.queueErrors': 'Errori nella coda',
  'activity.media.queueWarnings': 'Avvisi nella coda',
  'activity.media.update': (p: { version: string }) => `Aggiornamento ${p.version}`,
  'activity.media.queueEmpty': 'Coda vuota',
  'activity.media.queued': (p: { n: number }) => (p.n === 1 ? '1 in coda' : `${p.n} in coda`),

  'activity.tasks.title': 'Task',
  'activity.tasks.benefit': 'Qui compariranno i task aperti e quelli in ritardo.',
  'activity.tasks.credential': 'un token API in sola lettura',
  'activity.tasks.open': 'Aperti',
  'activity.tasks.overdue': 'In ritardo',
  'activity.tasks.overdueOn': (p: { date: string }) => `Scaduto ${p.date}`,
  'activity.tasks.restricted': 'Titoli nascosti con accesso limitato',
  'activity.tasks.none': 'Nessun task aperto',
  'activity.tasks.listLabel': 'Task da fare',

  'activity.playback.title': 'Riproduzioni',
  'activity.playback.benefit': 'Qui comparirà chi sta guardando cosa.',
  'activity.playback.credential': 'una chiave API in sola lettura',
  'activity.playback.none': 'Nessuna riproduzione in corso',
  'activity.playback.count': (p: { n: number }) =>
    p.n === 1 ? '1 riproduzione in corso' : `${p.n} riproduzioni in corso`,
  'activity.playback.restricted': 'Dettagli nascosti con accesso limitato',
  'activity.playback.listLabel': 'Riproduzioni in corso',
  'activity.playback.paused': 'In pausa',
  'activity.playback.transcoding': 'Transcodifica',

  'activity.events.title': 'Cronologia',
  'activity.events.none': 'Nessun evento registrato',
  'activity.events.showMore': (p: { n: number }) => `Mostra altro (${p.n})`,
  'activity.events.today': 'Oggi',
  'activity.events.yesterday': 'Ieri',
});
