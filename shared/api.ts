/**
 * Orbis Homelab - API contract shared by the BFF (server/) and the PWA (web/).
 * Types only: no runtime code, so both sides can import it with `import type`.
 *
 * Conventions
 * - Every data endpoint returns a `Snapshot<T>`: the last value the BFF collected plus
 *   collection metadata. The BFF never blocks a request on an upstream call.
 * - Timestamps are ISO-8601 strings, sizes are bytes, rates are per second, percents are 0..100.
 * - `data === null` means "never collected successfully"; `error` explains why.
 *   A snapshot with `data !== null` and `error !== null` is stale-but-usable.
 */

export type Severity = 'critical' | 'warning' | 'info';
export type OverallStatus = 'ok' | 'warning' | 'critical' | 'unknown';
export type ServiceState = 'up' | 'degraded' | 'down' | 'unknown';
export type Tone = 'ok' | 'warn' | 'crit' | 'neutral';

/** UI languages with a built-in dictionary. The language is a property of the instance. */
export type Language = 'it' | 'en';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Snapshot<T> {
  data: T | null;
  /** ISO time of the last successful collection, null if never. */
  fetchedAt: string | null;
  /** Last collection error, null when the last attempt succeeded. */
  error: string | null;
  /** Expected refresh interval of the collector; clients derive staleness from it. */
  intervalMs: number;
}

/* ------------------------------------------------------------------ session */

/**
 * `full`: the caller is trusted (trusted network, or an allowed identity behind a trusted proxy).
 * `limited`: private fields are withheld and push is disabled.
 */
export type AccessLevel = 'full' | 'limited';

/** How the instance decides the access level (informational, shown in Settings). */
export type AccessMode = 'limited' | 'trusted-network' | 'identity-proxy';

export interface CategoryInfo {
  id: string;
  label: string;
}

export interface QuickLink {
  id: string;
  title: string;
  description: string;
  /** Launch URL; may contain `{host}` (replaced client-side by the hostname the app was opened on). */
  url: string;
  /** Built-in service mark key or a custom icon file name (see `ServiceView.iconUrl`). */
  icon: string;
  iconUrl: string | null;
}

/** Instance branding and presentation, from `config.yaml` (`app:`) and the branding folder. */
export interface AppInfo {
  /** Slug: namespaces caches, local storage and notification tags. */
  id: string;
  name: string;
  shortName: string;
  description: string;
  language: Language;
  /** Default theme for devices that never chose one. */
  theme: ThemePreference;
  /** CSS color or null for the built-in accent. */
  accent: string | null;
  categories: CategoryInfo[];
  /** Service ids starred on a device's first launch. */
  defaultFavorites: string[];
  links: QuickLink[];
}

/**
 * What the instance can show. A page whose data source is not configured is simply absent:
 * no navigation entry, no route, no collector.
 */
export interface FeatureFlags {
  system: boolean;
  /** Docker/container list (needs a system provider that reports containers). */
  containers: boolean;
  storage: boolean;
  /** Smart (disk health) section of the storage page. */
  smart: boolean;
  activity: boolean;
  /** Web Push is configured on the server (still needs `access: full` and HTTPS in the client). */
  push: boolean;
}

/** A client bundle contributed by a server extension and loaded by the PWA at startup. */
export interface ExtensionRef {
  id: string;
  /** Same-origin URLs served by the BFF (`/extensions/<id>/...`). */
  script: string;
  style: string | null;
}

/** Everything the shell needs before the first paint; embedded in index.html and in `Session`. */
export interface BootConfig {
  app: AppInfo;
  features: FeatureFlags;
  extensions: ExtensionRef[];
}

export interface Session extends BootConfig {
  access: AccessLevel;
  accessMode: AccessMode;
  user: { login: string; name: string | null } | null;
  version: string;
  startedAt: string;
  /** HTTPS origin that unlocks service worker/push on iOS; null if not configured. */
  secureUrl: string | null;
  /** Integrations known to the BFF and whether their credentials are configured. */
  integrations: { id: string; label: string; configured: boolean }[];
}

/* ------------------------------------------------------------------- alerts */

export type AlertSource = 'system' | 'storage' | 'service' | 'integration' | 'monitor';

export interface Alert {
  /** Stable id (e.g. `disk:DISK_B`); the same condition always yields the same id. */
  id: string;
  severity: Severity;
  source: AlertSource;
  title: string;
  detail: string;
  /** ISO time the condition was first observed (persisted across BFF restarts). */
  since: string;
  serviceId: string | null;
}

export type EventKind =
  | 'alert-raised'
  | 'alert-cleared'
  | 'service-state'
  | 'source-error'
  | 'source-recovered'
  | 'startup';

export interface EventLogEntry {
  id: string;
  at: string;
  kind: EventKind;
  severity: Severity;
  title: string;
  detail: string | null;
  serviceId: string | null;
}

/* ----------------------------------------------------------------- overview */

export interface SourceHealth {
  id: string;
  label: string;
  ok: boolean;
  fetchedAt: string | null;
  error: string | null;
  intervalMs: number;
}

export interface Overview {
  status: OverallStatus;
  /** 0..100. 100 minus 20 per critical alert and 5 per warning alert, floored at 0. */
  score: number;
  alerts: Alert[];
  system: {
    cpuPercent: number;
    memoryPercent: number;
    swapPercent: number;
    load1: number;
    cores: number;
    cpuTempC: number | null;
    uptimeSeconds: number;
  } | null;
  /**
   * Headline capacity: the first configured pool, else the fullest volume. null without storage.
   * `disksTotal`/`disksOk` are 0 when there is no SMART source.
   */
  storage: {
    label: string;
    percent: number;
    usedBytes: number;
    sizeBytes: number;
    availableBytes: number;
    disksTotal: number;
    disksOk: number;
    /** Usage of the root filesystem, when present among the volumes. */
    rootPercent: number | null;
  } | null;
  /** `unmonitored` services (no container, no probe) are counted in `total` but in no state. */
  services: {
    total: number;
    up: number;
    degraded: number;
    down: number;
    unknown: number;
    unmonitored: number;
  };
  /** ids of services that are not `up`, worst first. */
  problemServiceIds: string[];
  sources: SourceHealth[];
}

/* ------------------------------------------------------------------- system */

export interface SystemInfo {
  host: {
    hostname: string;
    os: string;
    kernel: string;
    uptimeSeconds: number;
    cores: number;
  };
  cpu: {
    percent: number;
    user: number;
    system: number;
    iowait: number;
    perCore: number[];
    load: { m1: number; m5: number; m15: number };
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    cachedBytes: number;
    percent: number;
  };
  swap: { totalBytes: number; usedBytes: number; percent: number };
  temperatures: { label: string; celsius: number; warn: number | null; crit: number | null }[];
  diskIo: { name: string; readBytesPerSec: number; writeBytesPerSec: number }[];
  /** Aggregate of all container network counters (host NIC counters are not visible to Glances). */
  dockerNetwork: { rxBytesPerSec: number; txBytesPerSec: number };
  docker: { total: number; running: number; healthy: number; unhealthy: number; starting: number };
  /** In-memory ring buffer, oldest first, ~30 min at the system interval. Reset on BFF restart. */
  history: { t: number; cpu: number; mem: number; load1: number }[];
}

export type ContainerState =
  | 'healthy'
  | 'running'
  | 'starting'
  | 'unhealthy'
  | 'paused'
  | 'restarting'
  | 'exited'
  | 'dead'
  | 'unknown';

export interface ContainerInfo {
  name: string;
  image: string;
  state: ContainerState;
  /** Human uptime as reported by Glances ("2 weeks"). */
  uptime: string;
  cpuPercent: number;
  memoryBytes: number;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  ioReadBytesPerSec: number;
  ioWriteBytesPerSec: number;
  ports: string;
  /** Catalog service owning this container, null if the container is not in the catalog. */
  serviceId: string | null;
}

/* ------------------------------------------------------------------ storage */

export interface DiskInfo {
  label: string;
  device: string;
  model: string;
  /** Serial is masked to its last 4 characters. */
  serialTail: string;
  smart: 'PASSED' | 'FAILED' | 'UNAVAILABLE';
  status: 'OK' | 'WARNING' | 'CRITICAL';
  message: string;
  temperatureC: number | null;
  reallocated: number;
  pending: number;
  uncorrectable: number;
  /** True when the counter is historical and no pending sector is currently active. */
  uncorrectableHistorical: boolean;
  smartErrors: number;
  powerOnHours: number | null;
  /** Mount point of the disk's filesystem, when the SMART source maps it. */
  mount: string | null;
  sizeBytes: number | null;
  usedBytes: number | null;
  availableBytes: number | null;
  percent: number | null;
}

/** One mounted filesystem. */
export interface VolumeInfo {
  mount: string;
  /** Friendly name from configuration, null if none. */
  label: string | null;
  device: string;
  type: string;
  sizeBytes: number;
  usedBytes: number;
  availableBytes: number;
  percent: number;
}

/** A union of several volumes shown as one capacity (mergerfs, ZFS, LVM...). */
export interface PoolInfo {
  id: string;
  label: string;
  mount: string;
  sizeBytes: number;
  usedBytes: number;
  availableBytes: number;
  percent: number;
  /** Mount points of the member volumes (each one also appears in `volumes`). */
  members: string[];
}

export interface SmartSummary {
  status: 'OK' | 'WARNING' | 'CRITICAL';
  checkedAt: string;
  ageSeconds: number;
  temperatureWarnC: number;
  temperatureCriticalC: number;
}

/**
 * Every part is optional: `volumes` and `pools` need a system provider, `disks`/`smart` need a
 * SMART report source. `volumes` includes the pool members and the root filesystem.
 */
export interface StorageInfo {
  volumes: VolumeInfo[];
  pools: PoolInfo[];
  disks: DiskInfo[];
  smart: SmartSummary | null;
}

/* ----------------------------------------------------------------- services */

export interface Badge {
  tone: Tone;
  label: string;
}

export interface Metric {
  label: string;
  value: string;
  tone?: Tone;
}

export interface ServiceProbeResult {
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  checkedAt: string;
  error: string | null;
}

export interface ServiceView {
  id: string;
  name: string;
  description: string;
  /** Free-form group id; label and order come from `AppInfo.categories`. Null: ungrouped. */
  category: string | null;
  /** Built-in service mark key, `generic` when unknown. */
  icon: string;
  /** Custom icon served by the BFF (`/branding/icons/<file>`), takes precedence over `icon`. */
  iconUrl: string | null;
  /**
   * Launch URL. May contain `{host}`, which the PWA replaces with the hostname the app
   * itself was opened on (so links work over LAN, Tailscale IP or MagicDNS). Null: no UI.
   */
  url: string | null;
  state: ServiceState;
  /**
   * False when the service has neither containers nor a probe: its `unknown` state means
   * "not monitored", not "failed to determine".
   */
  monitored: boolean;
  /** Why the state is not `up` (or a short positive reason). */
  stateDetail: string | null;
  /** Docker containers that make up the service and their live state. */
  containers: { name: string; state: ContainerState; cpuPercent: number; memoryBytes: number }[];
  probe: ServiceProbeResult | null;
  /** Aggregated across containers. */
  cpuPercent: number;
  memoryBytes: number;
  uptime: string | null;
  badges: Badge[];
  metrics: Metric[];
  /** Catalog flag: an outage of a core service is `critical`, otherwise `warning`. */
  core: boolean;
  /** Present when an integration adapter is attached to this service. */
  integration: { id: string; configured: boolean; ok: boolean | null; error: string | null } | null;
}

/* --------------------------------------------------------------- activity */

/** Weekly usage window of an AI subscription. */
export interface QuotaInfo {
  /** Subscription plan as reported by the provider (e.g. "plus", "max"), null if unknown. */
  plan: string | null;
  weekly: {
    remainingPercent: number;
    /** ISO time the weekly window resets. */
    resetsAt: string;
  };
}

/**
 * One configured usage provider (`sources.usage[]`). `pending` means the source exists in
 * configuration but has produced no data yet (e.g. its file is not written): the PWA then shows
 * `hint` instead of an error.
 */
export interface UsageEntry {
  id: string;
  label: string;
  pending: boolean;
  hint: string | null;
  snapshot: Snapshot<QuotaInfo>;
}

export interface TaskItem {
  id: number;
  title: string;
  project: string | null;
  done: boolean;
  dueDate: string | null;
  priority: number;
  updated: string;
  url: string | null;
}

export interface TasksInfo {
  openCount: number;
  overdueCount: number;
  /** Titles are withheld on the LAN listener: `restricted` is then true and `items` empty. */
  restricted: boolean;
  items: TaskItem[];
}

export interface DownloadsInfo {
  version: string | null;
  connected: boolean;
  downloadBytesPerSec: number;
  uploadBytesPerSec: number;
  active: number;
  downloading: number;
  seeding: number;
  paused: number;
  errored: number;
}

export interface MediaQueueInfo {
  /** Per arr application. `warnings`/`errors` come from the app queue status. */
  apps: {
    id: string;
    name: string;
    version: string | null;
    queueCount: number;
    queueWarnings: boolean;
    queueErrors: boolean;
    health: { type: 'ok' | 'notice' | 'warning' | 'error'; message: string }[];
    updateAvailable: string | null;
  }[];
}

export interface PlaybackInfo {
  /** Session details (user, title) are withheld on the LAN listener. */
  restricted: boolean;
  activeCount: number;
  sessions: {
    user: string;
    title: string;
    device: string;
    paused: boolean;
    transcoding: boolean;
  }[];
}

/**
 * Every optional integration, each with its own snapshot so one failure never hides the rest.
 * `null` means the integration is not configured at all (nothing to show, nothing to explain).
 */
export interface ActivityInfo {
  events: EventLogEntry[];
  usage: UsageEntry[];
  tasks: Snapshot<TasksInfo> | null;
  downloads: Snapshot<DownloadsInfo> | null;
  mediaQueue: Snapshot<MediaQueueInfo> | null;
  playback: Snapshot<PlaybackInfo> | null;
}

/* ---------------------------------------------------------------------- push */

export interface PushConfig {
  /** false on the LAN listener, or when the server has no VAPID keys. */
  available: boolean;
  publicKey: string | null;
  subscriptions: number;
}

/** Browser PushSubscription.toJSON() */
export interface PushSubscriptionJson {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

/* ------------------------------------------------------------- diagnostics */

export interface Diagnostics {
  version: string;
  startedAt: string;
  uptimeSeconds: number;
  nodeVersion: string;
  sources: SourceHealth[];
  catalog: { services: number; containersUnclassified: string[] };
  push: { enabled: boolean; subscriptions: number };
  extensions: { id: string; loaded: boolean; error: string | null }[];
}

/* ------------------------------------------------------------------- routes */

/**
 * GET /api/health             -> { ok: true }   (unauthenticated liveness, used by Docker)
 * GET /api/session            -> Session
 * GET /api/overview           -> Snapshot<Overview>
 * GET /api/system             -> Snapshot<SystemInfo>      (404 unless features.system)
 * GET /api/containers         -> Snapshot<ContainerInfo[]> (404 unless features.containers)
 * GET /api/storage            -> Snapshot<StorageInfo>     (404 unless features.storage)
 * GET /api/services           -> Snapshot<ServiceView[]>
 * GET /api/activity           -> ActivityInfo              (404 unless features.activity)
 * GET /api/diagnostics        -> Diagnostics
 * GET /api/push/config        -> PushConfig
 * POST /api/push/subscribe    body PushSubscriptionJson            (full access only)
 * POST /api/push/unsubscribe  body { endpoint }                    (full access only)
 * POST /api/push/test         -> { sent: number }                  (full access only)
 *
 * Extensions mount their own routes under /api/x/<extension id>/ and serve their client bundle
 * from /extensions/<extension id>/ (see ExtensionRef).
 */
export const API_PREFIX = '/api';
