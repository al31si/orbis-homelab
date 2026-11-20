import { defineMessages } from '@shared/i18n';

/** Keys must start with 'services.'. Italian is the reference dictionary. */
export const services = defineMessages({
  /* page */
  'services.title': 'Servizi',
  'services.loading': 'Caricamento',
  'services.summary': (p: {
    online: number;
    monitored: number;
    total: number;
    problems: number;
  }) =>
    p.monitored === 0
      ? p.total === 1
        ? '1 servizio'
        : `${p.total} servizi`
      : p.problems === 0
        ? p.monitored === 1
          ? 'Il servizio è online'
          : `Tutti i ${p.monitored} servizi sono online`
        : p.problems === 1
          ? `1 servizio su ${p.monitored} ha un problema`
          : `${p.problems} servizi su ${p.monitored} hanno un problema`,
  'services.offline.title': (p: { name: string }) => `${p.name} non raggiungibile`,
  'services.offline.description':
    'Non ci sono ancora dati salvati su questo dispositivo. Riproverò appena la connessione torna.',
  'services.offline.retry': 'Riprova',

  /* states */
  'services.state.up': 'Online',
  'services.state.degraded': 'Degradato',
  'services.state.down': 'Non risponde',
  'services.state.unknown': 'Sconosciuto',
  'services.state.unmonitored': 'Non monitorato',
  'services.container.healthy': 'In salute',
  'services.container.running': 'In esecuzione',
  'services.container.starting': 'In avvio',
  'services.container.unhealthy': 'Non in salute',
  'services.container.paused': 'In pausa',
  'services.container.restarting': 'Si riavvia',
  'services.container.exited': 'Fermo',
  'services.container.dead': 'Morto',
  'services.container.unknown': 'Sconosciuto',

  /* catalog */
  'services.category.other': 'Altro',
  'services.metric.version': 'Versione',

  /* browser */
  'services.search.placeholder': 'Cerca un servizio',
  'services.search.label': 'Cerca tra i servizi',
  'services.search.clear': 'Cancella ricerca',
  'services.filter.label': 'Filtra per stato',
  'services.filter.all': 'Tutti',
  'services.filter.problems': 'Con problemi',
  'services.filter.favorites': 'Preferiti',
  'services.attention.title': 'Richiedono attenzione',
  'services.attention.list': 'Servizi che richiedono attenzione',
  'services.empty.catalog.title': 'Nessun servizio configurato',
  'services.empty.catalog.description':
    'Elenca i servizi da mostrare nel file `services.yaml` della tua istanza.',
  'services.empty.problems.title': 'Nessun problema',
  'services.empty.problems.description': 'Tutti i servizi monitorati rispondono.',
  'services.empty.favorites.title': 'Nessun preferito',
  'services.empty.favorites.description':
    'Tocca la stella accanto a un servizio per averlo nella Home.',
  'services.empty.none.title': 'Nessun servizio trovato',
  'services.empty.none.query': (p: { query: string }) =>
    `Nessun risultato per “${p.query}”. Prova con un altro nome.`,
  'services.empty.none.hidden':
    'I servizi senza interfaccia sono nascosti. Mostrali per vederli qui.',
  'services.empty.reset': 'Azzera filtri',
  'services.empty.showAll': 'Mostra tutti i servizi',
  'services.noUi.hide': 'Nascondi i servizi senza interfaccia',
  'services.noUi.show': (p: { n: number }) =>
    `Mostra ${p.n} ${p.n === 1 ? 'servizio' : 'servizi'} senza interfaccia`,

  /* item */
  'services.item.noUi': 'Senza interfaccia',
  'services.item.favoriteAdd': (p: { name: string }) => `Aggiungi ${p.name} ai preferiti`,
  'services.item.favoriteRemove': (p: { name: string }) => `Rimuovi ${p.name} dai preferiti`,
  'services.item.open': (p: { name: string }) => `Apri ${p.name}`,
  'services.copied': (p: { name: string }) => `Indirizzo di ${p.name} copiato`,
  'services.copyFailed': (p: { address: string }) => `Copia non riuscita: ${p.address}`,

  /* detail */
  'services.detail.title': 'Servizio',
  'services.detail.loading': 'Caricamento',
  'services.detail.notFound.title': 'Servizio non trovato',
  'services.detail.notFound.description': (p: { id: string }) =>
    `Nel catalogo non c’è nessun servizio “${p.id}”.`,
  'services.detail.notFound.back': 'Torna ai servizi',
  'services.detail.favoriteAdd': 'Aggiungi ai preferiti',
  'services.detail.favoriteRemove': 'Rimuovi dai preferiti',
  'services.detail.open': 'Apri',
  'services.detail.copy': 'Copia indirizzo',
  'services.detail.noUi': 'Questo servizio non ha un’interfaccia web da aprire.',

  'services.status.title': 'Stato',
  'services.status.unmonitoredDetail':
    'Il servizio non ha né container né un controllo HTTP, quindi il suo stato non viene verificato.',
  'services.status.http': 'Risposta HTTP',
  'services.status.noResponse': 'Nessuna risposta',
  'services.status.ok': 'OK',
  'services.status.latency': 'Latenza',
  'services.status.lastCheck': 'Ultimo controllo',
  'services.status.uptime': 'Attivo da',
  'services.status.error': 'Errore',
  'services.status.httpCheck': 'Controllo HTTP',
  'services.status.notConfigured': 'Non previsto',
  'services.status.category': 'Categoria',

  'services.integration.title': 'Integrazione',
  'services.integration.metrics': 'Metriche',
  'services.integration.setup.title': (p: { name: string }) => `Collega ${p.name}`,
  'services.integration.setup.benefit': (p: { name: string }) =>
    `Qui compariranno i dati letti da ${p.name}, come versione e aggiornamenti. Finché manca, il servizio è solo monitorato: stato e container.`,
  'services.integration.setup.createKey': (p: { name: string }) =>
    `In ${p.name} crea una chiave API`,
  'services.integration.setup.createToken': (p: { name: string }) =>
    `In ${p.name} crea un token API`,
  'services.integration.setup.save': (p: { secret: string }) =>
    `Salvalo come \`${p.secret}\` nel file \`.env\`, oppure scegli un altro nome con \`integration.secret\` in \`services.yaml\``,
  'services.integration.setup.saveNamed':
    'Salvalo nel file `.env` con il nome indicato da `integration.secret` in `services.yaml`',
  'services.integration.setup.apply': 'Applica con `docker compose up -d`',
  'services.integration.setup.help': 'Dove si imposta',
  'services.integration.empty': 'L’integrazione risponde, ma non ci sono dati da mostrare.',
  'services.integration.failing.title': 'L’integrazione non risponde',
  'services.integration.failing.unknown': 'Errore sconosciuto.',

  'services.events.title': 'Eventi recenti',
  'services.events.link': 'Attività',
  'services.events.unavailable': 'Gli eventi non sono disponibili al momento.',
  'services.events.none': 'Nessun evento recente per questo servizio.',
  'services.events.list': 'Eventi recenti del servizio',

  'services.containers.title': 'Container',
  'services.containers.none': 'Nessun container Docker associato a questo servizio.',
  'services.containers.list': 'Container del servizio',
  'services.containers.cpu': 'CPU',
  'services.containers.memory': 'Memoria',
  'services.containers.memoryMeter': 'Memoria del servizio rispetto a quella del server',
  'services.containers.memoryShare': (p: { percent: string }) =>
    `${p.percent} della memoria del server`,
});
