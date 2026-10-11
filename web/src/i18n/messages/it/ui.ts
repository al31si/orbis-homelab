import { defineMessages } from '@shared/i18n';

/** Keys must start with 'ui.'. Italian is the reference dictionary. */
export const ui = defineMessages({
  'ui.errorState.title': 'Impossibile caricare i dati',
  'ui.errorState.description': 'Controlla la connessione e riprova.',

  'ui.errorBoundary.title': 'Qualcosa è andato storto',
  'ui.errorBoundary.description':
    'L’app ha incontrato un errore imprevisto. Ricaricarla di solito risolve il problema.',
  'ui.errorBoundary.reload': 'Ricarica',

  'ui.pullToRefresh.refreshing': 'Aggiornamento in corso',

  'ui.updatedAt.updated': 'Aggiornato',
  'ui.updatedAt.stale': 'Dati non aggiornati',
  'ui.updatedAt.offline': 'Offline',
  'ui.updatedAt.failed': 'Aggiornamento non riuscito',

  'ui.toast.dismiss': 'Chiudi notifica',
});
