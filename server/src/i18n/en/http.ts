import type { Localized } from '../../../../shared/i18n.js';
import type { http as ref } from '../it/http.js';

export const http: Localized<typeof ref> = {
  'http.error.forbidden': 'Access not allowed.',
  'http.error.notFound': 'Resource not found.',
  'http.error.sameOriginJson': 'Only same-origin JSON requests are accepted.',
  'http.error.invalidSubscription': 'Invalid push subscription.',
  'http.error.tooManySubscriptions': 'Too many push subscriptions registered.',
  'http.error.invalidBody': 'Invalid request body.',
  'http.app.description': 'Status and quick access to your services.',
  'http.sw.offline': 'The server is unreachable and the app is not cached yet.',
  'http.shortcut.services': 'Services',
  'http.shortcut.system': 'System',
  'http.shortcut.storage': 'Storage',
};
