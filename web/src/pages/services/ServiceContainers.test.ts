import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceView } from '@shared/api';
import { setLanguage, t } from '@/i18n';
import { ServiceContainers } from './ServiceContainers';

const { features, useSnapshot } = vi.hoisted(() => ({
  features: { system: false },
  useSnapshot: vi.fn(),
}));

vi.mock('@/boot', () => ({ useFeatures: () => features }));
vi.mock('@/data', () => ({ useSnapshot }));

const service: ServiceView = {
  id: 'media-server',
  name: 'Media server',
  description: '',
  category: null,
  icon: 'generic',
  iconUrl: null,
  url: null,
  state: 'up',
  monitored: true,
  stateDetail: null,
  containers: [{ name: 'media-server', state: 'running', cpuPercent: 5, memoryBytes: 250 }],
  probe: null,
  cpuPercent: 5,
  memoryBytes: 250,
  uptime: null,
  badges: [],
  metrics: [],
  core: false,
  integration: null,
};

beforeEach(() => {
  setLanguage('en');
  features.system = false;
  useSnapshot.mockReset();
  useSnapshot.mockImplementation((key: string) => ({
    data: key === 'system' ? { memory: { totalBytes: 1000 } } : [],
  }));
});

describe('ServiceContainers', () => {
  it('does not subscribe to system or show a memory-share meter when system is disabled', () => {
    const html = renderToStaticMarkup(createElement(ServiceContainers, { service }));

    expect(useSnapshot).toHaveBeenCalledWith('containers');
    expect(useSnapshot).not.toHaveBeenCalledWith('system');
    expect(html).not.toContain('role="progressbar"');
    expect(html).toContain(t('services.containers.cpu'));
    expect(html).toContain(t('services.containers.memory'));
    expect(html).toContain('media-server');
  });

  it('subscribes to system and shows the memory share when enabled', () => {
    features.system = true;
    const html = renderToStaticMarkup(createElement(ServiceContainers, { service }));

    expect(useSnapshot).toHaveBeenCalledWith('system');
    expect(html).toContain(t('services.containers.memoryMeter'));
    expect(html).toContain('aria-valuenow="25"');
  });

  it.each([null, { memory: { totalBytes: 0 } }])(
    'omits the meter while total memory is unknown (%j)',
    (system) => {
      features.system = true;
      useSnapshot.mockImplementation((key: string) => ({ data: key === 'system' ? system : [] }));
      const html = renderToStaticMarkup(createElement(ServiceContainers, { service }));

      expect(html).not.toContain('role="progressbar"');
      expect(html).not.toMatch(/NaN|Infinity/);
    },
  );
});
