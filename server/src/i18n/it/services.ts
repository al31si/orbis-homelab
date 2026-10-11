import { defineMessages } from '../../../../shared/i18n.js';

/** Server-generated texts (services, app defaults). Keys must start with 'services.'. */
export const services = defineMessages({
  'services.appDescription': 'Centro di controllo del tuo homelab',

  'services.containerMissing': (p: { name: string }) => `Container ${p.name} non presente`,
  'services.containerState': (p: { name: string; state: string }) =>
    `Container ${p.name}: ${p.state}`,
  'services.healthcheckFailed': (p: { name: string }) => `Healthcheck Docker fallito su ${p.name}`,
  'services.partMissing': (p: { name: string }) => `${p.name} assente`,
  'services.partState': (p: { name: string; state: string }) => `${p.name} ${p.state}`,
  'services.notResponding': (p: { error: string }) => `Non risponde: ${p.error}`,
  'services.starting': 'In avvio',
  'services.containersUnavailable': 'Stato Docker non disponibile',
});
