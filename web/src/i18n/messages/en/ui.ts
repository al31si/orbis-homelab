import type { Localized } from '@shared/i18n';
import type { ui as ref } from '../it/ui';

export const ui: Localized<typeof ref> = {
  'ui.errorState.title': 'Can’t load data',
  'ui.errorState.description': 'Check your connection and try again.',

  'ui.errorBoundary.title': 'Something went wrong',
  'ui.errorBoundary.description':
    'The app hit an unexpected error. Reloading it usually fixes the problem.',
  'ui.errorBoundary.reload': 'Reload',

  'ui.pullToRefresh.refreshing': 'Refreshing',

  'ui.updatedAt.updated': 'Updated',
  'ui.updatedAt.stale': 'Outdated data',
  'ui.updatedAt.offline': 'Offline',
  'ui.updatedAt.failed': 'Update failed',

  'ui.toast.dismiss': 'Dismiss',
};
