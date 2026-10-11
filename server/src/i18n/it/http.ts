import { defineMessages } from '../../../../shared/i18n.js';

/** Server-generated texts (http). Keys must start with 'http.'. */
export const http = defineMessages({
  'http.error.forbidden': 'Accesso non consentito.',
  'http.error.notFound': 'Risorsa non trovata.',
  'http.error.sameOriginJson': 'Sono accettate solo richieste JSON dalla stessa origine.',
  'http.error.invalidSubscription': 'Sottoscrizione push non valida.',
  'http.error.tooManySubscriptions': 'Troppe sottoscrizioni push registrate.',
  'http.error.invalidBody': 'Corpo della richiesta non valido.',
  'http.app.description': 'Stato e accessi rapidi dei tuoi servizi.',
  'http.sw.offline': 'Il server non è raggiungibile e l’app non è ancora in cache.',
  'http.shortcut.services': 'Servizi',
  'http.shortcut.system': 'Sistema',
  'http.shortcut.storage': 'Storage',
});
