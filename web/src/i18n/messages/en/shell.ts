import type { Localized } from '@shared/i18n';
import type { shell as ref } from '../it/shell';

export const shell: Localized<typeof ref> = {
  'shell.skip': 'Skip to content',
  'shell.search': 'Search',
  'shell.brand.home': (p) => `${p.name}, go to Home`,

  'shell.nav.label': 'Main navigation',
  'shell.nav.home': 'Home',
  'shell.nav.services': 'Services',
  'shell.nav.system': 'System',
  'shell.nav.storage': 'Storage',
  'shell.nav.activity': 'Activity',
  'shell.nav.settings': 'Settings',
  'shell.nav.badge.crit': 'Critical problems',
  'shell.nav.badge.warn': 'Warnings to review',

  'shell.status.ok': 'All good',
  'shell.status.warning': 'Needs attention',
  'shell.status.critical': 'Critical problem',
  'shell.status.unknown': 'Status unknown',

  'shell.access.chip': 'Limited access',
  'shell.access.hint': 'Limited access - some data is hidden',

  'shell.connection.offline': (p) => `${p.name} unreachable`,
  'shell.connection.offlineSince': (p) => `${p.name} unreachable · showing data from ${p.time}`,

  'shell.update.available': 'Update available',
  'shell.update.apply': 'Update',

  'shell.boot.failedTitle': 'Can’t start the app',
  'shell.boot.failedDescription':
    'The server did not respond. Check your connection and try again.',
};
