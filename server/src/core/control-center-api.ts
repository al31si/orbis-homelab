import type {
  AccessLevel,
  ActivityInfo,
  AppInfo,
  ContainerInfo,
  Diagnostics,
  FeatureFlags,
  Overview,
  ServiceView,
  Session,
  Snapshot,
  StorageInfo,
  SystemInfo,
} from '../../../shared/api.js';
import type {
  ExtensionAlertCandidate,
  ExtensionCollector,
  ExtensionCollectorOptions,
  ExtensionIntegration,
} from '../../../sdk/server.js';

/**
 * What the HTTP edge (server.ts, extensions loader, PWA rendering) needs from the data core.
 * The core implements it (`ControlCenter`); the edge only depends on this interface, so each side
 * can be developed and tested against a fake of the other.
 *
 * Gated getters return `null` when their feature is off: the edge answers 404 and never builds
 * the corresponding collector.
 */
export interface ControlCenterApi {
  readonly startedAt: Date;

  features(): FeatureFlags;
  app(): AppInfo;
  integrationsInfo(): Session['integrations'];

  overview(): Snapshot<Overview>;
  services(): Snapshot<ServiceView[]>;
  system(): Snapshot<SystemInfo> | null;
  containers(): Snapshot<ContainerInfo[]> | null;
  storage(): Snapshot<StorageInfo> | null;
  /** `level === 'limited'` withholds private fields (task titles, playback sessions). */
  activity(level: AccessLevel): ActivityInfo | null;
  diagnostics(extensions: Diagnostics['extensions'], push: Diagnostics['push']): Diagnostics;

  /* ---- extension registration: only valid before start() */
  createExtensionCollector<T>(
    extensionId: string,
    options: ExtensionCollectorOptions<T>,
  ): ExtensionCollector<T>;
  registerExtensionIntegration<T>(extensionId: string, integration: ExtensionIntegration<T>): void;
  registerExtensionAlertRules(extensionId: string, rules: () => ExtensionAlertCandidate[]): void;
  /** Raises the warning alert `monitor:extension:<id>` (the extension failed to load). */
  reportExtensionFailure(extensionId: string, error: string): void;

  start(): void;
  stop(): void;
}
