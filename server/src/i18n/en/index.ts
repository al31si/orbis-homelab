import type { Localized } from '../../../../shared/i18n.js';
import type { it } from '../it/index.js';
import { alerts } from './alerts.js';
import { http } from './http.js';
import { integrations } from './integrations.js';
import { push } from './push.js';
import { services } from './services.js';

export const en: Localized<typeof it> = {
  ...alerts,
  ...services,
  ...integrations,
  ...push,
  ...http,
};
