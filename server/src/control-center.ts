import path from 'node:path';
import type {
  AccessLevel,
  ActivityInfo,
  AppInfo,
  ContainerInfo,
  Diagnostics,
  FeatureFlags,
  Overview,
  QuotaInfo,
  ServiceView,
  Session,
  Snapshot,
  SourceHealth,
  StorageInfo,
  SystemInfo,
  UsageEntry,
} from '../../shared/api.js';
import type {
  ExtensionAlertCandidate,
  ExtensionCollector,
  ExtensionCollectorOptions,
  ExtensionIntegration,
} from '../../sdk/server.js';
import { buildActivity } from './activity.js';
import { AlertEngine, type AlertState, EMPTY_ALERT_STATE } from './alerts.js';
import { buildAppInfo } from './app-info.js';
import type { Config, Env, ServicesFile } from './config/schema.js';
import type { SecretResolver } from './config/secrets.js';
import type { AlertNotification, Logger } from './core/types.js';
import type { ControlCenterApi } from './core/control-center-api.js';
import { deriveFeatures } from './features.js';
import { type T as Translator, createTranslator } from './i18n/index.js';
import { type Integration, createIntegrations } from './integrations/index.js';
import { Collector } from './lib/collector.js';
import { errorMessage } from './lib/http.js';
import { JsonStore } from './lib/store.js';
import { summarizeServices, summarizeStorage, summarizeSystem } from './overview.js';
import { type ProbeMap, probeAll } from './probes.js';
import {
  type Candidate,
  evaluateRules,
  healthScore,
  overallStatus,
  resolveThresholds,
} from './rules.js';
import {
  type IntegrationReading,
  buildServiceViews,
  serviceIdsAtOrigin,
  withServiceIds,
} from './services.js';
import {
  type FsEntry,
  type RawContainer,
  type SystemCore,
  type SystemProvider,
  createSystemProvider,
} from './sources/provider.js';
import { buildStorage } from './sources/storage.js';
import { type HddReport, readSmartReport } from './sources/storage-smart.js';
import { readUsage } from './sources/usage.js';
import { VERSION } from './version.js';

const HISTORY_POINTS = 180;
/** Failures in a row after which a source counts as down (alerts) or settled (cold start). */
const DOWN_AFTER_FAILURES = 3;
const EVALUATION_INTERVAL_MS = 15_000;

export interface ControlCenterOptions {
  /** Only `DATA_DIR` is used (alert state). */
  env: Pick<Env, 'DATA_DIR'>;
  config: Config;
  services: ServicesFile;
  secrets: SecretResolver;
  log: Logger;
  onNotification: (n: AlertNotification) => void;
}

/** Everything one extension registered; dropped as a whole if the extension fails. */
interface ExtensionParts {
  collectors: Collector<unknown>[];
  integrations: Integration[];
  rules: (() => ExtensionAlertCandidate[])[];
  /** Why the extension is failing (load error); null while healthy. */
  failure: string | null;
  /** Error thrown by its integration code during the current evaluation. */
  evaluationError: string | null;
}

/** Combines the snapshots of several collectors that feed one endpoint. */
function combineSnapshots<T>(data: T | null, snaps: Snapshot<unknown>[]): Snapshot<T> {
  const fetched = snaps.flatMap((s) => (s.fetchedAt === null ? [] : [s.fetchedAt])).sort();
  return {
    data,
    fetchedAt: fetched[0] ?? null,
    error: snaps.find((s) => s.error !== null)?.error ?? null,
    intervalMs: Math.max(...snaps.map((s) => s.intervalMs)),
  };
}

/**
 * The data core: owns every collector, the alert engine and the derived views. It is built only
 * from what the configuration declares, so an unconfigured source has no collector, no alert rule
 * and no request.
 */
export class ControlCenter implements ControlCenterApi {
  readonly startedAt = new Date();

  private readonly history: SystemInfo['history'] = [];
  private readonly flags: FeatureFlags;
  private readonly appInfo: AppInfo;
  private readonly provider: SystemProvider | null;
  private readonly systemCollector: Collector<SystemCore> | null = null;
  private readonly containerCollector: Collector<RawContainer[]> | null = null;
  private readonly volumesCollector: Collector<FsEntry[]> | null = null;
  private readonly smartCollector: Collector<HddReport> | null = null;
  private readonly probeCollector: Collector<ProbeMap> | null = null;
  private readonly usage: {
    id: string;
    label: string;
    hint: string | null;
    collector: Collector<QuotaInfo | null>;
  }[] = [];
  private readonly extensions = new Map<string, ExtensionParts>();
  private readonly engine: AlertEngine;
  private evalTimer: NodeJS.Timeout | undefined;
  private started = false;

  private constructor(
    private readonly opts: ControlCenterOptions,
    private readonly t: Translator,
    private readonly integrations: Integration[],
    store: JsonStore<AlertState>,
  ) {
    const { config, services } = opts;
    this.flags = deriveFeatures(config, services);
    this.appInfo = buildAppInfo(config, services.services, t);
    this.engine = new AlertEngine(store, config.alerts.graceSeconds * 1000, opts.onNotification, t);

    const { system, storage } = config.sources;
    this.provider = system ? createSystemProvider(system) : null;

    if (this.provider && this.flags.system) {
      const provider = this.provider;
      this.systemCollector = this.watch(
        new Collector<SystemCore>({
          id: 'system',
          label: t('alerts.sourceSystem'),
          intervalMs: 10_000,
          run: async () => {
            const { core: fresh, cpuWindowSeconds } = await provider.system();
            const previous = this.systemCollector?.value;
            // A CPU sample averaged over < 1 s is noise: keep the last reliable CPU block instead.
            const core = previous && cpuWindowSeconds < 1 ? { ...fresh, cpu: previous.cpu } : fresh;
            this.history.push({
              t: Date.now(),
              cpu: core.cpu.percent,
              mem: core.memory.percent,
              load1: core.cpu.load.m1,
            });
            if (this.history.length > HISTORY_POINTS) this.history.shift();
            return core;
          },
        }),
      );
    }

    if (this.provider) {
      const provider = this.provider;
      this.containerCollector = this.watch(
        new Collector<RawContainer[]>({
          id: 'containers',
          label: t('alerts.sourceContainers'),
          intervalMs: 30_000,
          run: () => provider.containers(),
        }),
      );
    }

    if (this.flags.storage && storage) {
      if (this.provider) {
        const provider = this.provider;
        this.volumesCollector = this.watch(
          new Collector<FsEntry[]>({
            id: 'storage',
            label: t('alerts.sourceStorage'),
            intervalMs: 60_000,
            run: () => provider.filesystems(),
          }),
        );
      }
      const smart = storage.smart;
      if (smart) {
        this.smartCollector = this.watch(
          new Collector<HddReport>({
            id: 'smart',
            label: t('alerts.sourceSmart'),
            intervalMs: 60_000,
            run: () => readSmartReport(smart),
          }),
        );
      }
    }

    if (services.services.some((s) => s.probe)) {
      this.probeCollector = this.watch(
        new Collector<ProbeMap>({
          id: 'probes',
          label: t('alerts.sourceProbes'),
          intervalMs: 30_000,
          run: () => probeAll(services.services, this.probeCollector?.value ?? {}),
        }),
      );
    }

    if (this.flags.activity) {
      for (const provider of config.sources.usage) {
        this.usage.push({
          id: provider.id,
          label: provider.label,
          hint: provider.hint ?? null,
          collector: this.watch(
            new Collector<QuotaInfo | null>({
              id: `usage:${provider.id}`,
              label: provider.label,
              intervalMs: provider.intervalSeconds * 1000,
              run: () => readUsage(provider),
            }),
          ),
        });
      }
    }

    for (const integration of integrations) {
      if (integration.collector) this.watch(integration.collector);
    }
  }

  static async create(opts: ControlCenterOptions): Promise<ControlCenter> {
    const t = createTranslator(opts.config.app.language);
    const [integrations, store] = await Promise.all([
      createIntegrations(opts.services.services, opts.secrets, t),
      JsonStore.open<AlertState>(
        path.join(opts.env.DATA_DIR, 'state.json'),
        structuredClone(EMPTY_ALERT_STATE),
      ),
    ]);
    return new ControlCenter(opts, t, integrations, store);
  }

  /** Reports a source that keeps failing, and its recovery, in the log. */
  private watch<C extends Collector<unknown>>(collector: C): C {
    collector.onEvent((event, source) => {
      if (event === 'error') {
        this.opts.log.warn({ source: source.id, error: source.snapshot().error }, 'source failing');
      } else {
        this.opts.log.info(`source recovered: ${source.id}`);
      }
    });
    return collector;
  }

  /* -------------------------------------------------------------- lifecycle */

  start(): void {
    this.started = true;
    this.engine.logStartup(this.appInfo.name, VERSION);
    for (const c of this.allCollectors()) c.start();
    this.evalTimer = setInterval(() => this.runEvaluation(), EVALUATION_INTERVAL_MS);
    this.evalTimer.unref();
  }

  stop(): void {
    for (const c of this.allCollectors()) c.stop();
    clearInterval(this.evalTimer);
  }

  /** Collectors that feed core data, in display order. */
  private coreCollectors(): Collector<unknown>[] {
    return [
      this.systemCollector,
      this.containerCollector,
      this.volumesCollector,
      this.smartCollector,
      this.probeCollector,
    ].filter((c) => c !== null) as Collector<unknown>[];
  }

  private allCollectors(): Collector<unknown>[] {
    return [
      ...this.coreCollectors(),
      ...this.usage.map((u) => u.collector as Collector<unknown>),
      ...this.allIntegrations().flatMap((i) => (i.collector ? [i.collector] : [])),
      ...[...this.extensions.values()].flatMap((e) => e.collectors),
    ] as Collector<unknown>[];
  }

  private allIntegrations(): Integration[] {
    return [...this.integrations, ...[...this.extensions.values()].flatMap((e) => e.integrations)];
  }

  /* ------------------------------------------------------------- extensions */

  private assertNotStarted(): void {
    if (this.started) throw new Error('extensions can only register before start()');
  }

  private parts(extensionId: string): ExtensionParts {
    let parts = this.extensions.get(extensionId);
    if (!parts) {
      parts = { collectors: [], integrations: [], rules: [], failure: null, evaluationError: null };
      this.extensions.set(extensionId, parts);
    }
    return parts;
  }

  createExtensionCollector<T>(
    extensionId: string,
    options: ExtensionCollectorOptions<T>,
  ): ExtensionCollector<T> {
    this.assertNotStarted();
    const collector = this.watch(
      new Collector<T>({ ...options, id: `ext:${extensionId}:${options.id}` }),
    );
    this.parts(extensionId).collectors.push(collector as Collector<unknown>);
    return collector;
  }

  registerExtensionIntegration<T>(extensionId: string, integration: ExtensionIntegration<T>): void {
    this.assertNotStarted();
    const { serviceId, collector } = integration;
    if (!this.opts.services.services.some((s) => s.id === serviceId)) {
      throw new Error(`integration targets unknown service "${serviceId}"`);
    }
    if (this.allIntegrations().some((i) => i.serviceId === serviceId)) {
      throw new Error(`service "${serviceId}" already has an integration`);
    }
    if (collector !== null && !(collector instanceof Collector)) {
      throw new Error('integration collector must be created with createCollector');
    }
    const parts = this.parts(extensionId);
    // A throwing extension must never break service views or the evaluation loop.
    const guarded = <R>(what: string, run: () => R, fallback: R, record: boolean): R => {
      try {
        return run();
      } catch (err) {
        const message = errorMessage(err);
        this.opts.log.warn({ extension: extensionId, error: message }, `extension ${what} failed`);
        if (record) parts.evaluationError = message;
        return fallback;
      }
    };
    const wrapped: Integration<T> = {
      ...integration,
      collector: collector as Collector<T> | null,
      describe: (data) =>
        guarded('describe', () => integration.describe(data), { badges: [], metrics: [] }, false),
      alerts: (data) => guarded('alerts', () => integration.alerts(data), [], true),
    };
    parts.integrations.push(wrapped as Integration);
  }

  registerExtensionAlertRules(extensionId: string, rules: () => ExtensionAlertCandidate[]): void {
    this.assertNotStarted();
    this.parts(extensionId).rules.push(rules);
  }

  /** Drops everything the extension registered so far and keeps it as a warning alert. */
  reportExtensionFailure(extensionId: string, error: string): void {
    this.assertNotStarted();
    this.extensions.set(extensionId, {
      collectors: [],
      integrations: [],
      rules: [],
      failure: error,
      evaluationError: null,
    });
  }

  /** Lets the edge switch the activity feature on for an extension that adds activity sections. */
  declareExtensionActivity(): void {
    this.assertNotStarted();
    if (this.opts.config.features.activity !== false) this.flags.activity = true;
  }

  private extensionCandidates(): Candidate[] {
    const failed = (id: string, error: string): Candidate => ({
      id: `monitor:extension:${id}`,
      severity: 'warning',
      source: 'monitor',
      title: this.t('alerts.extensionFailedTitle', { id }),
      detail: error,
      serviceId: null,
    });
    const out: Candidate[] = [];
    for (const [id, parts] of this.extensions) {
      if (parts.failure !== null) {
        out.push(failed(id, parts.failure));
        continue;
      }
      const own: Candidate[] = [];
      try {
        for (const rules of parts.rules) {
          for (const c of rules()) {
            own.push({
              id: `ext:${id}:${c.id}`,
              severity: c.severity,
              source: 'integration',
              title: c.title,
              detail: c.detail,
              serviceId: c.serviceId,
            });
          }
        }
      } catch (err) {
        out.push(failed(id, errorMessage(err)));
        continue;
      }
      if (parts.evaluationError !== null) out.push(failed(id, parts.evaluationError));
      out.push(...own);
    }
    return out;
  }

  /* ------------------------------------------------------------ evaluation */

  private readings(): IntegrationReading[] {
    return this.allIntegrations().map((integration) => ({
      integration,
      data: integration.collector?.value ?? null,
      error: integration.collector?.snapshot().error ?? null,
    }));
  }

  private serviceViews(): ServiceView[] {
    const containers = this.containerCollector?.isFresh(3) ? this.containerCollector.value : null;
    return buildServiceViews({
      defs: this.opts.services.services,
      containers,
      probes: this.probeCollector?.value ?? {},
      readings: this.readings(),
      t: this.t,
    });
  }

  /** Data needed before an evaluation is meaningful (avoids clearing alerts on a cold start). */
  private ready(): boolean {
    return this.coreCollectors().every(
      (c) => c.value !== null || c.consecutiveFailures >= DOWN_AFTER_FAILURES,
    );
  }

  /** The system source is judged by its metrics collector, or by the container one without it. */
  private systemSourceDown(): boolean {
    const collector = this.systemCollector ?? this.containerCollector;
    return collector !== null && collector.consecutiveFailures >= DOWN_AFTER_FAILURES;
  }

  private runEvaluation(): void {
    if (!this.ready()) return;
    for (const parts of this.extensions.values()) parts.evaluationError = null;

    const failures: Record<string, number> = {};
    for (const i of this.allIntegrations()) {
      failures[i.serviceId] = i.collector?.consecutiveFailures ?? 0;
    }
    const { system: systemSource } = this.opts.config.sources;
    const candidates = evaluateRules({
      t: this.t,
      thresholds: resolveThresholds(this.opts.config.alerts.thresholds),
      system: this.systemData(),
      systemDown: this.systemSourceDown(),
      systemServiceIds: systemSource
        ? serviceIdsAtOrigin(this.opts.services.services, systemSource.url)
        : [],
      storage: this.storageData(),
      smartDown:
        this.smartCollector !== null &&
        this.smartCollector.consecutiveFailures >= DOWN_AFTER_FAILURES,
      containers: this.containersData(),
      services: this.serviceViews(),
      readings: this.readings(),
      integrationFailures: failures,
    });
    this.engine.evaluate([...candidates, ...this.extensionCandidates()]);
  }

  /* ------------------------------------------------------------- snapshots */

  private containersData(): ContainerInfo[] | null {
    const raw = this.containerCollector?.value;
    return raw ? withServiceIds(raw, this.opts.services.services) : null;
  }

  private systemData(): SystemInfo | null {
    const core = this.systemCollector?.value;
    if (!core) return null;
    const containers = this.containersData() ?? [];
    return {
      ...core,
      dockerNetwork: {
        rxBytesPerSec: containers.reduce((s, c) => s + c.rxBytesPerSec, 0),
        txBytesPerSec: containers.reduce((s, c) => s + c.txBytesPerSec, 0),
      },
      docker: {
        total: containers.length,
        running: containers.filter((c) => c.state === 'running' || c.state === 'healthy').length,
        healthy: containers.filter((c) => c.state === 'healthy').length,
        unhealthy: containers.filter((c) => c.state === 'unhealthy').length,
        starting: containers.filter((c) => c.state === 'starting').length,
      },
      history: [...this.history],
    };
  }

  /** Volumes/pools and the SMART report are separate sources: either may be missing. */
  private storageData(): StorageInfo | null {
    const storage = this.opts.config.sources.storage;
    if (!this.flags.storage || !storage) return null;
    const filesystems = this.volumesCollector?.value ?? null;
    const report = this.smartCollector?.value ?? null;
    if (filesystems === null && report === null) return null;
    return buildStorage({ config: storage, filesystems, report });
  }

  /** Snapshot metadata for data that is computed on read rather than collected. */
  private liveMeta(collector: Collector<unknown> | null): Omit<Snapshot<never>, 'data'> {
    if (collector) {
      const { data: _data, ...meta } = collector.snapshot();
      return meta;
    }
    return { fetchedAt: new Date().toISOString(), error: null, intervalMs: EVALUATION_INTERVAL_MS };
  }

  features(): FeatureFlags {
    return { ...this.flags };
  }

  app(): AppInfo {
    return this.appInfo;
  }

  integrationsInfo(): Session['integrations'] {
    return this.allIntegrations().map((i) => ({
      id: i.type,
      label: i.label,
      configured: i.configured,
    }));
  }

  system(): Snapshot<SystemInfo> | null {
    if (!this.systemCollector) return null;
    return { ...this.systemCollector.snapshot(), data: this.systemData() };
  }

  containers(): Snapshot<ContainerInfo[]> | null {
    if (!this.containerCollector) return null;
    return { ...this.containerCollector.snapshot(), data: this.containersData() };
  }

  storage(): Snapshot<StorageInfo> | null {
    if (!this.flags.storage) return null;
    const collectors = [this.volumesCollector, this.smartCollector].filter(
      (c) => c !== null,
    ) as Collector<unknown>[];
    return combineSnapshots(
      this.storageData(),
      collectors.map((c) => c.snapshot()),
    );
  }

  services(): Snapshot<ServiceView[]> {
    const meta = this.liveMeta(this.containerCollector ?? this.probeCollector);
    return { ...meta, data: this.serviceViews() };
  }

  overview(): Snapshot<Overview> {
    const system = this.systemData();
    const storage = this.storageData();
    const alerts = this.engine.active();
    const hasData =
      system !== null ||
      storage !== null ||
      (this.probeCollector?.value ?? null) !== null ||
      (this.containerCollector?.value ?? null) !== null;
    // Nothing configured: nothing is missing, so the quiet instance is healthy, not unknown.
    const expectsData = this.coreCollectors().length > 0;

    const overview: Overview = {
      status: overallStatus(alerts, hasData || !expectsData),
      score: healthScore(alerts),
      alerts,
      system: system && summarizeSystem(system),
      storage: storage && summarizeStorage(storage),
      ...summarizeServices(this.serviceViews()),
      sources: this.sourceHealth(),
    };
    return {
      ...this.liveMeta(this.systemCollector ?? this.volumesCollector ?? this.probeCollector),
      data: overview,
    };
  }

  activity(level: AccessLevel): ActivityInfo | null {
    if (!this.flags.activity) return null;
    const usage: UsageEntry[] = this.usage.map(({ id, label, hint, collector }) => {
      const snap = collector.snapshot();
      // A run that succeeded without data means "the file is not there yet", not a failure.
      const pending = snap.data === null && snap.error === null && snap.fetchedAt !== null;
      return {
        id,
        label,
        pending,
        hint,
        snapshot: pending ? { ...snap, fetchedAt: null } : (snap as Snapshot<QuotaInfo>),
      };
    });
    return buildActivity({
      level,
      events: this.engine.events(),
      usage,
      integrations: this.integrations,
    });
  }

  diagnostics(extensions: Diagnostics['extensions'], push: Diagnostics['push']): Diagnostics {
    return {
      version: VERSION,
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.startedAt.getTime()) / 1000),
      nodeVersion: process.version,
      sources: this.sourceHealth(),
      catalog: {
        services: this.opts.services.services.length,
        containersUnclassified: (this.containersData() ?? [])
          .filter((c) => c.serviceId === null)
          .map((c) => c.name),
      },
      push,
      extensions,
    };
  }

  private sourceHealth(): SourceHealth[] {
    return this.allCollectors().map((c) => {
      const s = c.snapshot();
      return {
        id: c.id,
        label: c.label,
        ok: s.error === null && s.fetchedAt !== null,
        fetchedAt: s.fetchedAt,
        error: s.error,
        intervalMs: s.intervalMs,
      };
    });
  }
}
