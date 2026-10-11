import type { ActivityInfo, AppInfo, FeatureFlags, Snapshot } from '../../../../shared/api.js';
import type { ControlCenterApi } from '../../core/control-center-api.js';

export const snapshot = <T>(data: T | null = null): Snapshot<T> => ({
  data,
  fetchedAt: null,
  error: null,
  intervalMs: 1000,
});

export const ALL_OFF: FeatureFlags = {
  system: false,
  containers: false,
  storage: false,
  smart: false,
  activity: false,
  push: false,
};

export const APP: AppInfo = {
  id: 'demo',
  name: 'Demo Center',
  shortName: 'Demo',
  description: '',
  language: 'en',
  theme: 'system',
  accent: null,
  categories: [],
  defaultFavorites: [],
  links: [],
};

export interface FakeCore extends ControlCenterApi {
  /** What the extension host asked the core to do, in order. */
  readonly calls: string[];
  readonly failures: Record<string, string>;
}

/** Hand-written stand-in for the data core: records registrations, returns empty snapshots. */
export function createFakeCore(
  opts: { features?: Partial<FeatureFlags>; app?: Partial<AppInfo>; services?: string[] } = {},
): FakeCore {
  const features = { ...ALL_OFF, ...opts.features };
  const services = opts.services ?? [];
  const calls: string[] = [];
  const failures: Record<string, string> = {};
  const activity: ActivityInfo = {
    events: [],
    usage: [],
    tasks: null,
    downloads: null,
    mediaQueue: null,
    playback: null,
  };
  return {
    calls,
    failures,
    startedAt: new Date('2026-01-01T00:00:00Z'),
    features: () => features,
    app: () => ({ ...APP, ...opts.app }),
    integrationsInfo: () => [],
    overview: () => snapshot(),
    services: () => snapshot([]),
    system: () => (features.system ? snapshot() : null),
    containers: () => (features.containers ? snapshot([]) : null),
    storage: () => (features.storage ? snapshot() : null),
    activity: (level) => {
      calls.push(`activity:${level}`);
      return features.activity ? activity : null;
    },
    diagnostics: (extensions, push) => ({
      version: 'test',
      startedAt: '2026-01-01T00:00:00.000Z',
      uptimeSeconds: 0,
      nodeVersion: process.version,
      sources: [],
      catalog: { services: services.length, containersUnclassified: [] },
      push,
      extensions,
    }),
    createExtensionCollector: <T>(id: string, o: { id: string; intervalMs: number }) => {
      calls.push(`collector:${id}:${o.id}`);
      return {
        value: null as T | null,
        consecutiveFailures: 0,
        snapshot: () => ({ data: null, fetchedAt: null, error: null, intervalMs: o.intervalMs }),
        refresh: () => Promise.resolve(),
      };
    },
    registerExtensionIntegration: (id, integration) => {
      if (!services.includes(integration.serviceId)) {
        throw new Error(`unknown service "${integration.serviceId}"`);
      }
      calls.push(`integration:${id}:${integration.serviceId}`);
    },
    registerExtensionAlertRules: (id) => {
      calls.push(`rules:${id}`);
    },
    reportExtensionFailure: (id, error) => {
      failures[id] = error;
    },
    start: () => undefined,
    stop: () => undefined,
  };
}
