import type { Localized } from '@shared/i18n';
import type { home as ref } from '../it/home';

export const home: Localized<typeof ref> = {
  'home.loading': 'Loading',
  'home.offline.title': (p) => `${p.name} is unreachable`,
  'home.offline.description':
    'There is no saved data on this device yet. I’ll retry as soon as the connection is back.',
  'home.offline.retry': 'Retry',

  /* hero */
  'home.hero.score': (p) => `Health score ${p.score} out of 100`,
  'home.hero.scoreLabel': 'health',
  'home.status.ok': 'All good',
  'home.status.warning': 'Needs a look',
  'home.status.critical': 'Needs attention',
  'home.status.unknown': 'Status unknown',
  'home.summary.none': 'No active problems',
  'home.summary.sources': (p) =>
    p.n === 1 ? '1 data source is not responding' : `${p.n} data sources are not responding`,
  'home.summary.critical': (p) => (p.n === 1 ? '1 critical problem' : `${p.n} critical problems`),
  'home.summary.warning': (p) => (p.n === 1 ? '1 problem to check' : `${p.n} problems to check`),
  'home.summary.mixed': (p) => `${p.critical} critical and ${p.warning} to check`,

  /* alerts */
  'home.alerts.title': 'Alerts',

  /* vitals */
  'home.vitals.title': 'At a glance',
  'home.vitals.cpu': 'CPU',
  'home.vitals.cpuDetail': (p) => `${p.cores} ${p.cores === 1 ? 'core' : 'cores'} · load ${p.load}`,
  'home.vitals.memory': 'Memory',
  'home.vitals.usedOf': (p) => `${p.used} of ${p.total}`,
  'home.vitals.storage': 'Storage',
  'home.vitals.temperature': 'Temperature',
  'home.vitals.temperature.ok': 'Normal',
  'home.vitals.temperature.warn': 'High',
  'home.vitals.temperature.crit': 'Critical',
  'home.vitals.temperature.none': 'Unavailable',

  /* services */
  'home.services.title': 'Services',
  'home.services.all': 'All',
  'home.services.online': (p) => `${p.up} of ${p.monitored} online`,
  'home.services.noneMonitored': (p) =>
    p.total === 0
      ? 'No services configured'
      : p.total === 1
        ? '1 service, not monitored'
        : `${p.total} services, not monitored`,
  'home.services.unmonitored': (p) => `${p.n} not monitored`,
  'home.services.allUp': 'Everything responds',
  'home.services.progress': 'Services online',
  'home.services.problems': 'Services to check',

  /* favorites */
  'home.favorites.title': 'Favorites',
  'home.favorites.empty': 'Star the services you use most from the Services page.',
  'home.favorites.choose': 'Choose favorites',
  'home.favorites.open': (p) => `Open ${p.name}`,
  'home.favorites.details': (p) => `${p.name} details`,

  /* install hint */
  'home.install.title': (p) => `Install ${p.name}`,
  'home.install.prompt': 'Add it to your home screen to open it like an app.',
  'home.install.iosTap': 'Tap',
  'home.install.iosShare': 'Share',
  'home.install.iosThen': ', then',
  'home.install.iosAdd': 'Add to Home Screen',
  'home.install.needsHttps': 'Installing needs the secure (HTTPS) address.',
  'home.install.install': 'Install',
  'home.install.openSecure': 'Open secure version',
  'home.install.dismiss': 'Dismiss',
};
