import { defineMessages } from '@shared/i18n';

/**
 * Keys must start with 'diagnostics.'. Italian is the reference dictionary.
 * Messages shown through `RichText` may use `code` markup.
 */
export const diagnostics = defineMessages({
  'diagnostics.title': 'Diagnostica',
  'diagnostics.subtitle': (p: { name: string }) => `Stato tecnico di ${p.name}`,
  'diagnostics.back': 'Altro',
  'diagnostics.loading': 'Caricamento',
  'diagnostics.offline.title': (p: { name: string }) => `${p.name} non raggiungibile`,
  'diagnostics.offline.description':
    'Non ci sono ancora dati salvati su questo dispositivo. Riproverò appena la connessione torna.',
  'diagnostics.retry': 'Riprova',

  'diagnostics.server.title': 'Server',
  'diagnostics.server.listLabel': (p: { name: string }) => `Server ${p.name}`,
  'diagnostics.server.version': 'Versione',
  'diagnostics.server.uptime': 'Attivo da',
  'diagnostics.server.started': 'Avviato',
  'diagnostics.server.node': 'Node.js',

  'diagnostics.sources.title': 'Fonti dati',
  'diagnostics.sources.summary': (p: { healthy: number; total: number }) =>
    `${p.healthy} su ${p.total} in regola`,
  'diagnostics.sources.ok': 'In regola',
  'diagnostics.sources.late': 'In ritardo',
  'diagnostics.sources.failing': 'In errore',
  'diagnostics.sources.updated': (p: { when: string; every: string }) =>
    `Aggiornata ${p.when} · ogni ${p.every}`,
  'diagnostics.sources.never': (p: { every: string }) => `Mai aggiornata · ogni ${p.every}`,

  'diagnostics.catalog.title': 'Catalogo',
  'diagnostics.catalog.services': 'Servizi nel catalogo',
  'diagnostics.catalog.unclassified': 'Container non classificati',
  'diagnostics.catalog.none': 'Nessuno',
  'diagnostics.catalog.help':
    'Sono in esecuzione ma non appartengono a nessun servizio. Per classificarli aggiungi il nome del container al campo `containers` di un servizio in `services.yaml` e riavvia il container.',

  'diagnostics.push.title': 'Notifiche',
  'diagnostics.push.listLabel': 'Notifiche push',
  'diagnostics.push.devices': 'Dispositivi registrati',

  'diagnostics.extensions.title': 'Estensioni',
  'diagnostics.extensions.loaded': 'Caricata',
  'diagnostics.extensions.failed': 'In errore',

  'diagnostics.client.title': 'Questo dispositivo',
  'diagnostics.client.serviceWorker': 'Service worker',
  'diagnostics.client.build': 'Build app',
  'diagnostics.client.displayMode': 'Modalità di visualizzazione',
  'diagnostics.client.installed': 'App installata',
  'diagnostics.client.secure': 'Connessione sicura (HTTPS)',
  'diagnostics.client.online': 'Online',
  'diagnostics.client.yes': 'Sì',
  'diagnostics.client.no': 'No',
  'diagnostics.client.sw.unsupported': 'Non supportato',
  'diagnostics.client.sw.insecure': 'Non disponibile (serve HTTPS)',
  'diagnostics.client.sw.development': 'Non registrato (sviluppo)',
  'diagnostics.client.sw.none': 'Non registrato',
  'diagnostics.client.sw.installing': 'In installazione',
  'diagnostics.client.sw.waiting': 'Aggiornamento in attesa',
  'diagnostics.client.sw.active': 'Attivo',
  'diagnostics.client.display.standalone': 'App installata',
  'diagnostics.client.display.fullscreen': 'Schermo intero',
  'diagnostics.client.display.minimal-ui': 'Interfaccia minima',
  'diagnostics.client.display.browser': 'Browser',
});
