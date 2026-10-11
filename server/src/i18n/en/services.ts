import type { Localized } from '../../../../shared/i18n.js';
import type { services as ref } from '../it/services.js';

export const services: Localized<typeof ref> = {
  'services.appDescription': 'Control center for your homelab',

  'services.containerMissing': (p) => `Container ${p.name} not found`,
  'services.containerState': (p) => `Container ${p.name}: ${p.state}`,
  'services.healthcheckFailed': (p) => `Docker healthcheck failing on ${p.name}`,
  'services.partMissing': (p) => `${p.name} missing`,
  'services.partState': (p) => `${p.name} ${p.state}`,
  'services.notResponding': (p) => `Not responding: ${p.error}`,
  'services.starting': 'Starting',
  'services.containersUnavailable': 'Docker state unavailable',
};
