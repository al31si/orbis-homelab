import { defineMessages } from '@shared/i18n';

/** Keys must start with 'shell.'. Italian is the reference dictionary. */
export const shell = defineMessages({
  'shell.skip': 'Vai al contenuto',
  'shell.search': 'Cerca',
  'shell.brand.home': (p: { name: string }) => `${p.name}, vai alla Home`,

  'shell.nav.label': 'Navigazione principale',
  'shell.nav.home': 'Home',
  'shell.nav.services': 'Servizi',
  'shell.nav.system': 'Sistema',
  'shell.nav.storage': 'Storage',
  'shell.nav.activity': 'Attività',
  'shell.nav.settings': 'Impostazioni',
  'shell.nav.badge.crit': 'Problemi critici',
  'shell.nav.badge.warn': 'Avvisi da controllare',

  'shell.status.ok': 'Tutto in ordine',
  'shell.status.warning': 'Da controllare',
  'shell.status.critical': 'Problema critico',
  'shell.status.unknown': 'Stato sconosciuto',

  'shell.access.chip': 'Accesso limitato',
  'shell.access.hint': 'Accesso limitato: alcuni dati sono nascosti',

  'shell.connection.offline': (p: { name: string }) => `${p.name} non raggiungibile`,
  'shell.connection.offlineSince': (p: { name: string; time: string }) =>
    `${p.name} non raggiungibile, dati dell’ultimo aggiornamento alle ${p.time}`,

  'shell.update.available': 'Aggiornamento disponibile',
  'shell.update.apply': 'Aggiorna',

  'shell.boot.failedTitle': 'Impossibile avviare l’app',
  'shell.boot.failedDescription': 'Il server non ha risposto. Controlla la connessione e riprova.',
});
