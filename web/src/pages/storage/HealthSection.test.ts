import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DiskInfo, SmartSummary } from '@shared/api';
import { setLanguage, t } from '@/i18n';
import { HealthSection } from './HealthSection';

const disk: DiskInfo = {
  label: 'media-1',
  device: '/dev/sdb',
  model: 'Model',
  serialTail: '1234',
  smart: 'UNAVAILABLE',
  status: 'OK',
  message: '',
  temperatureC: null,
  reallocated: 0,
  pending: 0,
  uncorrectable: 0,
  uncorrectableHistorical: false,
  smartErrors: 0,
  powerOnHours: null,
  mount: null,
  sizeBytes: null,
  usedBytes: null,
  availableBytes: null,
  percent: null,
};

const smart: SmartSummary = {
  status: 'OK',
  checkedAt: '2026-01-01T00:00:00Z',
  ageSeconds: 60,
  temperatureWarnC: 45,
  temperatureCriticalC: 55,
};

beforeEach(() => setLanguage('en'));

describe('HealthSection', () => {
  it('shows unavailable SMART without claiming zero default counters mean a healthy disk', () => {
    const html = renderToStaticMarkup(createElement(HealthSection, { disks: [disk], smart }));

    expect(html).toContain(t('storage.health.unavailableAll'));
    expect(html).toContain(t('storage.health.unavailableText'));
    expect(html).toContain(t('storage.disks.unverified'));
    expect(html).not.toContain(t('storage.disks.countersClean'));
    expect(html).not.toContain(t('storage.health.allHealthy'));
    expect(html).not.toContain('data-tone="ok"');
  });

  it('does not claim all disks are clean when only some SMART readings are available', () => {
    const disks = [disk, { ...disk, label: 'media-2', smart: 'PASSED' as const }];
    const html = renderToStaticMarkup(createElement(HealthSection, { disks, smart }));

    expect(html).toContain(t('storage.health.unavailableSome', { names: disk.label }));
    expect(html).not.toContain(t('storage.disks.countersClean'));
    expect(html).not.toContain(t('storage.health.allHealthy'));
  });

  it('shows the clean-counter summary when every disk has readable SMART and zero counters', () => {
    const disks = [{ ...disk, smart: 'PASSED' as const }];
    const html = renderToStaticMarkup(createElement(HealthSection, { disks, smart }));

    expect(html).toContain(t('storage.disks.countersClean'));
    expect(html).toContain(t('storage.health.allHealthy'));
    expect(html).not.toContain(t('storage.health.unavailableAll'));
  });

  it('retains fault warnings alongside unavailable readings', () => {
    const disks = [
      disk,
      {
        ...disk,
        label: 'media-2',
        smart: 'FAILED' as const,
        pending: 1,
        status: 'CRITICAL' as const,
      },
    ];
    const html = renderToStaticMarkup(
      createElement(HealthSection, { disks, smart: { ...smart, status: 'CRITICAL' } }),
    );

    expect(html).toContain(t('storage.health.critical'));
    expect(html).toContain(t('storage.health.unavailableSome', { names: disk.label }));
    expect(html).not.toContain(t('storage.disks.countersClean'));
  });
});
