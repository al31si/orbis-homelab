import { defineMessages } from '../../../../shared/i18n.js';

/** Server-generated texts (push). Keys must start with 'push.'. */
export const push = defineMessages({
  'push.prefix.raised': (p: { app: string }) => p.app,
  'push.prefix.cleared': (p: { app: string }) => `${p.app} · risolto`,
  'push.body.raised': 'Problema critico rilevato.',
  'push.body.cleared': 'Il problema è rientrato.',
  'push.test.body': 'Notifica di prova: le notifiche funzionano.',
});
