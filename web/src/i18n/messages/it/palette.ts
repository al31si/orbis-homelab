import { defineMessages } from '@shared/i18n';

/** Keys must start with 'palette.'. Italian is the reference dictionary. */
export const palette = defineMessages({
  'palette.dialog': 'Cerca e comandi',
  'palette.inputLabel': 'Cerca servizi, pagine e azioni',
  'palette.placeholder': 'Cerca servizi, pagine, azioni',
  'palette.cancel': 'Annulla',
  'palette.resultsLabel': 'Risultati',
  'palette.none': (p: { query: string }) => `Nessun risultato per “${p.query}”`,

  'palette.group.recent': 'Recenti',
  'palette.group.favorites': 'Preferiti',
  'palette.group.services': 'Servizi',
  'palette.group.pages': 'Pagine',
  'palette.group.actions': 'Azioni',

  'palette.page.diagnostics': 'Diagnostica',
  'palette.keywords.home': 'panoramica dashboard inizio',
  'palette.keywords.services': 'app launcher applicazioni',
  'palette.keywords.system': 'cpu ram memoria temperatura docker container',
  'palette.keywords.storage': 'dischi disco spazio smart pool volumi',
  'palette.keywords.activity': 'eventi download code attivita',
  'palette.keywords.settings': 'impostazioni preferenze notifiche tema',
  'palette.keywords.diagnostics': 'debug log problemi salute',

  'palette.action.refresh': 'Aggiorna dati',
  'palette.action.refreshKeywords': 'ricarica sincronizza refresh',
  'palette.action.refreshed': 'Dati aggiornati',
  'palette.action.theme': 'Cambia tema',
  'palette.action.themeKeywords': 'scuro chiaro dark light aspetto automatico',
  'palette.action.themeCurrent': (p: { theme: string }) => `Attuale: ${p.theme}`,
  'palette.action.themeChanged': (p: { theme: string }) => `Tema: ${p.theme}`,
  'palette.theme.auto': 'Automatico',
  'palette.theme.light': 'Chiaro',
  'palette.theme.dark': 'Scuro',
  'palette.action.copy': (p: { name: string }) => `Copia indirizzo di ${p.name}`,
  'palette.action.copyKeywords': 'copia indirizzo url link copy',

  'palette.open.label': (p: { name: string }) => `Apri ${p.name} in una nuova scheda`,
  'palette.open.title': (p: { shortcut: string }) =>
    `Apri in una nuova scheda (${p.shortcut} Invio)`,

  'palette.hint.navigate': 'Naviga',
  'palette.hint.open': 'Apri',
  'palette.hint.openService': 'Apri il servizio',
  'palette.key.enter': 'Invio',
});
