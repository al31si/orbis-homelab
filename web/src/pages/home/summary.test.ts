import { afterEach, describe, expect, it } from 'vitest';
import type { Alert } from '@shared/api';
import { setLanguage } from '@/i18n';
import { alertHref, sortAlerts, summarizeAlerts, tempLimits } from './summary';

const alert = (over: Partial<Alert>): Alert => ({
  id: 'a',
  severity: 'warning',
  source: 'system',
  title: 't',
  detail: 'd',
  since: '2026-09-29T10:00:00Z',
  serviceId: null,
  ...over,
});

afterEach(() => setLanguage('en'));

describe('summarizeAlerts', () => {
  it('reads naturally for each mix', () => {
    expect(summarizeAlerts([])).toBe('No active problems');
    expect(summarizeAlerts([{ severity: 'info' }])).toBe('No active problems');
    expect(summarizeAlerts([{ severity: 'warning' }])).toBe('1 problem to check');
    expect(summarizeAlerts([{ severity: 'warning' }, { severity: 'warning' }])).toBe(
      '2 problems to check',
    );
    expect(summarizeAlerts([{ severity: 'critical' }])).toBe('1 critical problem');
    expect(summarizeAlerts([{ severity: 'critical' }, { severity: 'critical' }])).toBe(
      '2 critical problems',
    );
    expect(summarizeAlerts([{ severity: 'critical' }, { severity: 'warning' }])).toBe(
      '1 critical and 1 to check',
    );
  });

  it('follows the instance language', () => {
    setLanguage('it');
    expect(summarizeAlerts([])).toBe('Nessun problema attivo');
    expect(summarizeAlerts([{ severity: 'critical' }, { severity: 'warning' }])).toBe(
      '1 critico e 1 da controllare',
    );
  });
});

describe('alertHref', () => {
  const withActivity = { activity: true };
  const noActivity = { activity: false };

  it('prefers the service, then the source page', () => {
    expect(alertHref({ source: 'monitor', serviceId: 'media-server' }, withActivity)).toBe(
      '/services/media-server',
    );
    expect(alertHref({ source: 'storage', serviceId: null }, withActivity)).toBe('/storage');
    expect(alertHref({ source: 'system', serviceId: null }, withActivity)).toBe('/system');
    expect(alertHref({ source: 'integration', serviceId: null }, withActivity)).toBe('/services');
  });

  it('sends alerts that belong to no page to Activity, or to Diagnostics without one', () => {
    expect(alertHref({ source: 'monitor', serviceId: null }, withActivity)).toBe('/activity');
    expect(alertHref({ source: 'monitor', serviceId: null }, noActivity)).toBe('/more/diagnostics');
  });

  it('escapes the service id', () => {
    expect(alertHref({ source: 'service', serviceId: 'a b/c' }, withActivity)).toBe(
      '/services/a%20b%2Fc',
    );
  });
});

describe('sortAlerts', () => {
  it('puts critical first and keeps the oldest first inside a severity', () => {
    const sorted = sortAlerts([
      alert({ id: 'w-new', since: '2026-09-29T12:00:00Z' }),
      alert({ id: 'i', severity: 'info' }),
      alert({ id: 'c', severity: 'critical' }),
      alert({ id: 'w-old', since: '2026-09-28T12:00:00Z' }),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(['c', 'w-old', 'w-new', 'i']);
  });
});

describe('tempLimits', () => {
  it('uses the hottest sensor limits with fallbacks', () => {
    expect(tempLimits(undefined)).toEqual({ warn: 70, crit: 85 });
    expect(
      tempLimits([
        { celsius: 40, warn: 60, crit: 70 },
        { celsius: 55, warn: 80, crit: 95 },
      ]),
    ).toEqual({ warn: 80, crit: 95 });
    expect(tempLimits([{ celsius: 50, warn: null, crit: 90 }])).toEqual({ warn: 70, crit: 90 });
  });
});
