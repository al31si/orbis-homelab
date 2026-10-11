import type { Localized } from '@shared/i18n';
import type { common as ref } from '../it/common';

export const common: Localized<typeof ref> = {
  'common.close': 'Close',
  'common.retry': 'Try again',
  'common.loading': 'Loading…',

  'common.unit.day': 'd',
  'common.unit.hour': 'h',
  'common.unit.minute': 'min',
  'common.unit.second': 's',
  'common.time.now': 'just now',
  'common.time.ago': (p) => `${p.value} ago`,
  'common.time.in': (p) => `in ${p.value}`,

  'common.error.unreachable': 'Server unreachable',
  'common.error.timeout': 'The server is not responding',
  'common.error.http': (p) => `Error ${p.status}`,
  'common.error.parse': 'Invalid response',
  'common.error.unexpected': 'Unexpected error',
};
