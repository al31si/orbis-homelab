import type { Localized } from '@shared/i18n';
import type { services as ref } from '../it/services';

export const services: Localized<typeof ref> = {
  /* page */
  'services.title': 'Services',
  'services.loading': 'Loading',
  'services.summary': (p) =>
    p.monitored === 0
      ? p.total === 1
        ? '1 service'
        : `${p.total} services`
      : `${p.online} of ${p.monitored} online`,
  'services.offline.title': (p) => `${p.name} is unreachable`,
  'services.offline.description':
    'There is no saved data on this device yet. I’ll retry as soon as the connection is back.',
  'services.offline.retry': 'Retry',

  /* states */
  'services.state.up': 'Online',
  'services.state.degraded': 'Degraded',
  'services.state.down': 'Not responding',
  'services.state.unknown': 'Unknown',
  'services.state.unmonitored': 'Not monitored',
  'services.container.healthy': 'Healthy',
  'services.container.running': 'Running',
  'services.container.starting': 'Starting',
  'services.container.unhealthy': 'Unhealthy',
  'services.container.paused': 'Paused',
  'services.container.restarting': 'Restarting',
  'services.container.exited': 'Stopped',
  'services.container.dead': 'Dead',
  'services.container.unknown': 'Unknown',

  /* catalog */
  'services.category.other': 'Other',
  'services.metric.version': 'Version',

  /* browser */
  'services.search.placeholder': 'Search services',
  'services.search.label': 'Search services',
  'services.search.clear': 'Clear search',
  'services.filter.label': 'Filter by status',
  'services.filter.all': 'All',
  'services.filter.problems': 'With problems',
  'services.filter.favorites': 'Favorites',
  'services.attention.title': 'Need attention',
  'services.attention.list': 'Services that need attention',
  'services.empty.catalog.title': 'No services configured',
  'services.empty.catalog.description':
    'Describe the services to show in the services.yaml file of your instance.',
  'services.empty.problems.title': 'No problems',
  'services.empty.problems.description': 'All services are responding.',
  'services.empty.favorites.title': 'No favorites',
  'services.empty.favorites.description':
    'Tap the star next to a service to keep it within reach on Home.',
  'services.empty.none.title': 'No services found',
  'services.empty.none.query': (p) => `No results for “${p.query}”.`,
  'services.empty.reset': 'Clear filters',
  'services.noUi.hide': 'Hide services without an interface',
  'services.noUi.show': (p) =>
    `Show ${p.n} ${p.n === 1 ? 'service' : 'services'} without an interface`,

  /* item */
  'services.item.noUi': 'No interface',
  'services.item.favoriteAdd': (p) => `Add ${p.name} to favorites`,
  'services.item.favoriteRemove': (p) => `Remove ${p.name} from favorites`,
  'services.item.open': (p) => `Open ${p.name}`,
  'services.copied': (p) => `${p.name} address copied`,
  'services.copyFailed': (p) => `Copy failed: ${p.address}`,

  /* detail */
  'services.detail.title': 'Service',
  'services.detail.loading': 'Loading',
  'services.detail.notFound.title': 'Service not found',
  'services.detail.notFound.description': (p) => `There is no service “${p.id}” in the catalog.`,
  'services.detail.notFound.back': 'Back to services',
  'services.detail.favoriteAdd': 'Add to favorites',
  'services.detail.favoriteRemove': 'Remove from favorites',
  'services.detail.open': 'Open',
  'services.detail.copy': 'Copy address',
  'services.detail.noUi': 'This service has no web interface to open.',

  'services.status.title': 'Status',
  'services.status.unmonitoredDetail':
    'This service has neither containers nor an HTTP check, so its state is not verified.',
  'services.status.http': 'HTTP response',
  'services.status.noResponse': 'No response',
  'services.status.ok': 'OK',
  'services.status.latency': 'Latency',
  'services.status.lastCheck': 'Last check',
  'services.status.uptime': 'Up for',
  'services.status.error': 'Error',
  'services.status.httpCheck': 'HTTP check',
  'services.status.notConfigured': 'Not configured',

  'services.integration.title': 'Integration',
  'services.integration.metrics': 'Metrics',
  'services.integration.missing.title': 'Integration not configured',
  'services.integration.missing.body': (p) =>
    `To read data from ${p.name} the server needs this integration’s secret (environment variable or file). Until then the service is only monitored: state and containers.`,
  'services.integration.missing.defaultName': 'Default name',
  'services.integration.missing.override': 'change it with integration.secret in services.yaml',
  'services.integration.failing.title': 'The integration is not responding',
  'services.integration.failing.unknown': 'Unknown error.',

  'services.events.title': 'Recent events',
  'services.events.link': 'Activity',
  'services.events.unavailable': 'Events are not available right now.',
  'services.events.none': 'No recent events for this service.',
  'services.events.list': 'Recent events of the service',

  'services.containers.title': 'Containers',
  'services.containers.none': 'No Docker container is linked to this service.',
  'services.containers.list': 'Service containers',
  'services.containers.cpu': 'CPU',
  'services.containers.memory': 'Memory',
};
