import type { Localized } from '../../../../shared/i18n.js';
import type { push as ref } from '../it/push.js';

export const push: Localized<typeof ref> = {
  'push.prefix.raised': (p) => p.app,
  'push.prefix.cleared': (p) => `${p.app} · resolved`,
  'push.body.raised': 'Critical problem detected.',
  'push.body.cleared': 'The problem is back to normal.',
  'push.test.body': 'Test notification: notifications are working.',
};
