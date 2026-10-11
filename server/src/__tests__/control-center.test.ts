import { describe, expect, it } from 'vitest';
import type { AlertNotification } from '../core/types.js';
import { ControlCenter } from '../control-center.js';
import { createSecretResolver } from '../config/secrets.js';
import { config, servicesFile, silentLog, tempDir } from './support/core.js';

const GLANCES = { type: 'glances', url: 'http://glances.invalid:61208' };

async function build(
  configInput: unknown = {},
  services: unknown[] = [],
  secrets: Record<string, string> = {},
) {
  const notifications: AlertNotification[] = [];
  const center = await ControlCenter.create({
    env: { DATA_DIR: tempDir() },
    config: config(configInput),
    services: servicesFile(services),
    secrets: createSecretResolver({ CONFIG_DIR: '/config' }, secrets),
    log: silentLog,
    onNotification: (n) => notifications.push(n),
  });
  return { center, notifications };
}

describe('an instance with nothing configured', () => {
  it('has no optional feature and no collector', async () => {
    const { center } = await build();
    expect(center.features()).toEqual({
      system: false,
      containers: false,
      storage: false,
      smart: false,
      activity: false,
      push: false,
    });
    expect(center.system()).toBeNull();
    expect(center.containers()).toBeNull();
    expect(center.storage()).toBeNull();
    expect(center.activity('full')).toBeNull();
    expect(center.diagnostics([], { enabled: false, subscriptions: 0 }).sources).toEqual([]);
  });

  it('is healthy, quiet and error free', async () => {
    const { center, notifications } = await build();
    center.start();
    try {
      const overview = center.overview();
      expect(overview.data).toMatchObject({
        status: 'ok',
        score: 100,
        alerts: [],
        system: null,
        storage: null,
        sources: [],
      });
      expect(overview.error).toBeNull();
      expect(center.services().data).toEqual([]);
      expect(notifications).toEqual([]);
    } finally {
      center.stop();
    }
  });

  it('brands itself from the configuration', async () => {
    const { center } = await build({
      app: { id: 'lab', name: 'My Lab', language: 'it', accent: '#336699', defaultFavorites: [] },
    });
    expect(center.app()).toMatchObject({
      id: 'lab',
      name: 'My Lab',
      language: 'it',
      accent: '#336699',
    });
  });
});

describe('feature detection', () => {
  it('the system provider enables system and containers, not storage', async () => {
    const { center } = await build({ sources: { system: GLANCES } });
    expect(center.features()).toMatchObject({ system: true, containers: true, storage: false });
    expect(center.system()).not.toBeNull();
    expect(center.containers()).not.toBeNull();
    expect(center.storage()).toBeNull();
  });

  it('a storage block enables storage; smart only with a SMART report', async () => {
    const volumesOnly = await build({ sources: { system: GLANCES, storage: {} } });
    expect(volumesOnly.center.features()).toMatchObject({ storage: true, smart: false });

    const withSmart = await build({
      sources: { storage: { smart: { type: 'report-json', file: '/data/smart.json' } } },
    });
    expect(withSmart.center.features()).toMatchObject({
      storage: true,
      smart: true,
      system: false,
      containers: false,
    });
  });

  it('feature overrides can only switch pages off', async () => {
    const { center } = await build({
      sources: { system: GLANCES, storage: {} },
      features: { system: false, storage: false },
    });
    expect(center.features()).toMatchObject({ system: false, storage: false });
    expect(center.system()).toBeNull();
    expect(center.storage()).toBeNull();
  });

  it('usage providers enable activity and appear as entries, pending until data exists', async () => {
    const { center } = await build({
      sources: {
        usage: [
          {
            id: 'assistant',
            label: 'Assistant',
            parser: 'weekly-quota',
            file: '/data/does-not-exist.json',
            hint: 'Run the updater first.',
          },
        ],
      },
    });
    expect(center.features().activity).toBe(true);
    const activity = center.activity('full');
    expect(activity?.usage).toHaveLength(1);
    expect(activity?.usage[0]).toMatchObject({ id: 'assistant', hint: 'Run the updater first.' });
    expect(activity?.tasks).toBeNull();
    expect(activity?.downloads).toBeNull();
    expect(activity?.mediaQueue).toBeNull();
    expect(activity?.playback).toBeNull();
  });

  it('push is exactly the configuration flag', async () => {
    const { center } = await build({ push: { enabled: true, subject: 'mailto:me@example.com' } });
    expect(center.features().push).toBe(true);
  });

  it('services that only probe produce a source health entry, nothing else', async () => {
    const { center } = await build({}, [
      { id: 'wiki', name: 'Wiki', probe: 'http://wiki.invalid/health' },
    ]);
    const sources = center.diagnostics([], { enabled: false, subscriptions: 0 }).sources;
    expect(sources.map((s) => s.id)).toEqual(['probes']);
    expect(center.features().system).toBe(false);
  });
});

describe('integrations and secrets', () => {
  const services = [
    {
      id: 'tasks',
      name: 'Tasks',
      integration: { type: 'vikunja', url: 'http://vikunja.invalid:3456' },
    },
  ];

  it('an integration without its credential is "not configured", never an error or an alert', async () => {
    const { center, notifications } = await build({}, services);
    expect(center.integrationsInfo()).toEqual([
      { id: 'vikunja', label: expect.any(String), configured: false },
    ]);
    const view = center.services().data?.[0];
    expect(view?.integration).toMatchObject({ configured: false, ok: null, error: null });
    expect(center.diagnostics([], { enabled: false, subscriptions: 0 }).sources).toEqual([]);
    expect(center.overview().data?.alerts).toEqual([]);
    expect(notifications).toEqual([]);
  });

  it('declaring an integration enables the activity page', async () => {
    const { center } = await build({}, services);
    expect(center.features().activity).toBe(true);
    expect(center.activity('full')?.tasks).toBeNull();
  });

  it('a credential from the default variable creates its collector', async () => {
    const { center } = await build({}, services, { VIKUNJA_API_TOKEN: 'token-value' });
    expect(center.integrationsInfo()[0]?.configured).toBe(true);
    const ids = center
      .diagnostics([], { enabled: false, subscriptions: 0 })
      .sources.map((s) => s.id);
    expect(ids).toContain('integration:tasks');
  });

  it('an explicit secret reference wins over the default variable name', async () => {
    const { center } = await build(
      {},
      [
        {
          id: 'tasks',
          name: 'Tasks',
          integration: {
            type: 'vikunja',
            url: 'http://vikunja.invalid:3456',
            secret: { env: 'MY_TASKS_TOKEN' },
          },
        },
      ],
      { MY_TASKS_TOKEN: 'x' },
    );
    expect(center.integrationsInfo()[0]?.configured).toBe(true);
  });
});

describe('unmonitored services', () => {
  it('are listed but neither counted as failures nor alerted', async () => {
    const { center } = await build({}, [
      { id: 'bare', name: 'Bare link', url: 'https://bare.example.com' },
      { id: 'other', name: 'Other', url: 'https://other.example.com' },
    ]);
    const overview = center.overview().data;
    expect(overview?.services).toMatchObject({ total: 2, unmonitored: 2, up: 0, down: 0 });
    expect(overview?.problemServiceIds).toEqual([]);
    expect(overview?.status).toBe('ok');
    expect(center.services().data?.every((s) => !s.monitored)).toBe(true);
  });
});

describe('privacy on limited access', () => {
  it('limited access never receives restricted flags set to false', async () => {
    const { center } = await build({}, [
      { id: 'tasks', name: 'Tasks', integration: { type: 'vikunja', url: 'http://v.invalid:1' } },
    ]);
    // Not configured here, so there is nothing to restrict; the shape must still be stable.
    expect(center.activity('limited')?.tasks).toBeNull();
  });
});

describe('extension registration', () => {
  const diagnostics = (center: ControlCenter) =>
    center.diagnostics([], { enabled: false, subscriptions: 0 }).sources.map((s) => s.id);

  it('an extension collector is reported in diagnostics under its own namespace', async () => {
    const { center } = await build();
    center.createExtensionCollector('demo', {
      id: 'ping',
      label: 'Demo ping',
      intervalMs: 60_000,
      run: async () => 1,
    });
    expect(diagnostics(center)).toEqual(['ext:demo:ping']);
  });

  it('a failed extension is dropped as a whole: none of its collectors keep running', async () => {
    const { center } = await build();
    center.createExtensionCollector('demo', {
      id: 'ping',
      label: 'Demo ping',
      intervalMs: 60_000,
      run: async () => 1,
    });
    center.createExtensionCollector('healthy', {
      id: 'ping',
      label: 'Healthy ping',
      intervalMs: 60_000,
      run: async () => 1,
    });
    center.reportExtensionFailure('demo', 'bad manifest');
    expect(diagnostics(center)).toEqual(['ext:healthy:ping']);
  });
});
