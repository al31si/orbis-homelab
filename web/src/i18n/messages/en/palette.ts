import type { Localized } from '@shared/i18n';
import type { palette as ref } from '../it/palette';

export const palette: Localized<typeof ref> = {
  'palette.dialog': 'Search and commands',
  'palette.inputLabel': 'Search services, pages and actions',
  'palette.placeholder': 'Search services, pages, actions',
  'palette.cancel': 'Cancel',
  'palette.resultsLabel': 'Results',
  'palette.none': (p) => `No results for “${p.query}”`,

  'palette.group.recent': 'Recent',
  'palette.group.favorites': 'Favorites',
  'palette.group.services': 'Services',
  'palette.group.pages': 'Pages',
  'palette.group.actions': 'Actions',

  'palette.page.diagnostics': 'Diagnostics',
  'palette.keywords.home': 'overview dashboard start',
  'palette.keywords.services': 'apps launcher applications',
  'palette.keywords.system': 'cpu ram memory temperature docker containers',
  'palette.keywords.storage': 'disks disk space smart pool volumes',
  'palette.keywords.activity': 'events downloads queues activity',
  'palette.keywords.settings': 'preferences notifications theme',
  'palette.keywords.diagnostics': 'debug log problems health',

  'palette.action.refresh': 'Refresh data',
  'palette.action.refreshKeywords': 'reload sync refresh',
  'palette.action.refreshed': 'Data refreshed',
  'palette.action.theme': 'Change theme',
  'palette.action.themeKeywords': 'dark light appearance automatic',
  'palette.action.themeCurrent': (p) => `Current: ${p.theme}`,
  'palette.action.themeChanged': (p) => `Theme: ${p.theme}`,
  'palette.theme.auto': 'Automatic',
  'palette.theme.light': 'Light',
  'palette.theme.dark': 'Dark',
  'palette.action.copy': (p) => `Copy address of ${p.name}`,
  'palette.action.copyKeywords': 'copy address url link',

  'palette.open.label': (p) => `Open ${p.name} in a new tab`,
  'palette.open.title': (p) => `Open in a new tab (${p.shortcut} Enter)`,

  'palette.hint.navigate': 'Navigate',
  'palette.hint.open': 'Open',
  'palette.hint.openService': 'Open the service',
  'palette.key.enter': 'Enter',
};
