import { defineMessages } from '@shared/i18n';

/** Keys must start with 'home.'. Italian is the reference dictionary. */
export const home = defineMessages({
  'home.loading': 'Caricamento',
  'home.offline.title': (p: { name: string }) => `${p.name} non raggiungibile`,
  'home.offline.description':
    'Non ci sono ancora dati salvati su questo dispositivo. Riproverò appena la connessione torna.',
  'home.offline.retry': 'Riprova',

  /* state of the system */
  'home.status.ok': 'Tutto in ordine',
  'home.status.warning': 'Da controllare',
  'home.status.critical': 'Richiede attenzione',
  'home.status.unknown': 'Stato sconosciuto',
  'home.summary.none': 'Nessun problema attivo',
  'home.summary.sources': (p: { n: number }) =>
    p.n === 1 ? '1 fonte di dati non risponde' : `${p.n} fonti di dati non rispondono`,
  'home.summary.critical': (p: { n: number }) =>
    p.n === 1 ? '1 problema critico' : `${p.n} problemi critici`,
  'home.summary.warning': (p: { n: number }) =>
    p.n === 1 ? '1 problema da controllare' : `${p.n} problemi da controllare`,
  'home.summary.mixed': (p: { critical: number; warning: number }) =>
    `${p.critical} ${p.critical === 1 ? 'critico' : 'critici'} e ${p.warning} da controllare`,

  /* alerts */
  'home.alerts.title': 'Avvisi',
  'home.alerts.critical': 'Critico',
  'home.alerts.warning': 'Da controllare',
  'home.alerts.info': 'Informazione',

  /* vitals */
  'home.vitals.title': 'In sintesi',
  'home.vitals.cpu': 'CPU',
  'home.vitals.cpuDetail': (p: { cores: number; load: string }) =>
    `Carico ${p.load} su ${p.cores} core`,
  'home.vitals.memory': 'Memoria',
  'home.vitals.usedOf': (p: { used: string; total: string }) => `${p.used} di ${p.total}`,
  'home.vitals.storage': 'Storage',
  'home.vitals.temperature': 'Temperatura',
  'home.vitals.temperature.ok': 'Normale',
  'home.vitals.temperature.warn': 'Elevata',
  'home.vitals.temperature.crit': 'Critica',
  'home.vitals.temperature.none': 'Non disponibile',
  'home.vitals.high': 'Valore alto',
  'home.vitals.critical': 'Valore critico',

  /* services */
  'home.services.title': 'Servizi',
  'home.services.all': 'Tutti i servizi',
  'home.services.of': (p: { monitored: number }) => `su ${p.monitored} online`,
  'home.services.lamps': 'Stato di ogni servizio',
  'home.services.noneMonitored': (p: { total: number }) =>
    p.total === 0
      ? 'Nessun servizio configurato'
      : p.total === 1
        ? '1 servizio, non monitorato'
        : `${p.total} servizi, non monitorati`,
  'home.services.unmonitored': (p: { n: number }) =>
    `${p.n} ${p.n === 1 ? 'servizio non monitorato' : 'servizi non monitorati'}`,
  'home.services.problems': 'Servizi da controllare',

  /* favorites */
  'home.favorites.title': 'Preferiti',
  'home.favorites.empty': 'Aggiungi i servizi che usi di più dalla pagina Servizi.',
  'home.favorites.choose': 'Scegli i preferiti',
  'home.favorites.open': (p: { name: string }) => `Apri ${p.name}`,
  'home.favorites.details': (p: { name: string }) => `Dettagli di ${p.name}`,

  /* install hint */
  'home.install.title': (p: { name: string }) => `Installa ${p.name}`,
  'home.install.prompt': 'Aggiungilo alla schermata Home per aprirlo come un’app.',
  'home.install.iosTap': 'Tocca',
  'home.install.iosShare': 'Condividi',
  'home.install.iosThen': ', poi',
  'home.install.iosAdd': 'Aggiungi alla schermata Home',
  'home.install.window': 'Aprila in una finestra propria, come un’app.',
  'home.install.browser': 'Installala dal browser, con una finestra e un’icona proprie.',
  'home.install.dock': 'Aggiungila al Dock da Safari.',
  'home.install.android': 'Aggiungila alla schermata Home dal menu del browser.',
  'home.install.howTo': 'Mostrami come',
  'home.install.install': 'Installa',
  'home.install.openSecure': 'Apri versione sicura',
  'home.install.dismiss': 'Nascondi',
});
