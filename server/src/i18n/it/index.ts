import { alerts } from './alerts.js';
import { http } from './http.js';
import { integrations } from './integrations.js';
import { push } from './push.js';
import { services } from './services.js';

export const it = { ...alerts, ...services, ...integrations, ...push, ...http };
