import type { Localized } from '@shared/i18n';
import type { diagnostics as ref } from '../it/diagnostics';

export const diagnostics: Localized<typeof ref> = {
  'diagnostics.title': 'Diagnostics',
  'diagnostics.subtitle': (p) => `Technical status of ${p.name}`,
  'diagnostics.back': 'More',
  'diagnostics.loading': 'Loading',
  'diagnostics.offline.title': (p) => `${p.name} is unreachable`,
  'diagnostics.offline.description':
    'There is no saved data on this device yet. I’ll try again as soon as the connection is back.',
  'diagnostics.retry': 'Retry',

  'diagnostics.server.title': 'Server',
  'diagnostics.server.listLabel': (p) => `${p.name} server`,
  'diagnostics.server.version': 'Version',
  'diagnostics.server.uptime': 'Uptime',
  'diagnostics.server.started': 'Started',
  'diagnostics.server.node': 'Node.js',

  'diagnostics.sources.title': 'Data sources',
  'diagnostics.sources.summary': (p) => `${p.healthy} of ${p.total} healthy`,
  'diagnostics.sources.ok': 'Healthy',
  'diagnostics.sources.late': 'Late',
  'diagnostics.sources.failing': 'Failing',
  'diagnostics.sources.updated': (p) => `Updated ${p.when} · every ${p.every}`,
  'diagnostics.sources.never': (p) => `Never updated · every ${p.every}`,

  'diagnostics.catalog.title': 'Catalog',
  'diagnostics.catalog.services': 'Services in the catalog',
  'diagnostics.catalog.unclassified': 'Unclassified containers',
  'diagnostics.catalog.none': 'None',
  'diagnostics.catalog.help':
    'They are running but don’t belong to any service. To classify them, add the container name to the `containers` field of a service in `services.yaml` and restart the container.',

  'diagnostics.push.title': 'Notifications',
  'diagnostics.push.listLabel': 'Push notifications',
  'diagnostics.push.devices': 'Registered devices',

  'diagnostics.extensions.title': 'Extensions',
  'diagnostics.extensions.loaded': 'Loaded',
  'diagnostics.extensions.failed': 'Failed',

  'diagnostics.client.title': 'This device',
  'diagnostics.client.serviceWorker': 'Service worker',
  'diagnostics.client.build': 'App build',
  'diagnostics.client.displayMode': 'Display mode',
  'diagnostics.client.installed': 'App installed',
  'diagnostics.client.secure': 'Secure connection (HTTPS)',
  'diagnostics.client.online': 'Online',
  'diagnostics.client.yes': 'Yes',
  'diagnostics.client.no': 'No',
  'diagnostics.client.sw.unsupported': 'Not supported',
  'diagnostics.client.sw.insecure': 'Unavailable (needs HTTPS)',
  'diagnostics.client.sw.development': 'Not registered (development)',
  'diagnostics.client.sw.none': 'Not registered',
  'diagnostics.client.sw.failed': 'Refused by the browser',
  'diagnostics.client.sw.installing': 'Installing',
  'diagnostics.client.sw.waiting': 'Update waiting',
  'diagnostics.client.sw.active': 'Active',
  'diagnostics.client.display.standalone': 'Installed app',
  'diagnostics.client.display.fullscreen': 'Full screen',
  'diagnostics.client.display.minimal-ui': 'Minimal UI',
  'diagnostics.client.display.browser': 'Browser',
};
