import type {
  ActivityInfo,
  ContainerInfo,
  Diagnostics,
  Overview,
  ServiceView,
  Session,
  StorageInfo,
  SystemInfo,
} from '@shared/api';

/** Payload type served by each built-in polled endpoint. */
export interface EndpointMap {
  session: Session;
  overview: Overview;
  system: SystemInfo;
  containers: ContainerInfo[];
  services: ServiceView[];
  storage: StorageInfo;
  activity: ActivityInfo;
  diagnostics: Diagnostics;
}

export type EndpointKey = keyof EndpointMap;

export interface EndpointDef {
  /** Relative to `/api`, e.g. `/overview` or `/x/my-extension/status`. */
  path: string;
  intervalMs: number;
  /** `snapshot`: body is a Snapshot<T>. `plain`: body is the payload itself. */
  envelope: 'snapshot' | 'plain';
}

export const ENDPOINTS: Record<EndpointKey, EndpointDef> = {
  session: { path: '/session', intervalMs: 300_000, envelope: 'plain' },
  overview: { path: '/overview', intervalMs: 10_000, envelope: 'snapshot' },
  system: { path: '/system', intervalMs: 10_000, envelope: 'snapshot' },
  containers: { path: '/containers', intervalMs: 30_000, envelope: 'snapshot' },
  services: { path: '/services', intervalMs: 30_000, envelope: 'snapshot' },
  storage: { path: '/storage', intervalMs: 60_000, envelope: 'snapshot' },
  activity: { path: '/activity', intervalMs: 30_000, envelope: 'plain' },
  diagnostics: { path: '/diagnostics', intervalMs: 30_000, envelope: 'plain' },
};

export const ENDPOINT_KEYS = Object.keys(ENDPOINTS) as EndpointKey[];

/** Options of `useRemoteSnapshot` (extension data). */
export interface RemoteSnapshotOptions {
  /** Poll period in ms; for `snapshot` envelopes the server-reported interval wins once known. */
  intervalMs: number;
  /** Default `snapshot`. */
  envelope?: EndpointDef['envelope'];
}

const REMOTE_PREFIX = 'remote:';

/**
 * Accepts `/x/my-ext/status` or `/api/x/my-ext/status`: the path of a remote snapshot is relative
 * to `/api`, like `apiFetch`.
 */
export function normalizeRemotePath(path: string): string {
  const relative = path.startsWith('/api/') ? path.slice('/api'.length) : path;
  return relative.startsWith('/') ? relative : `/${relative}`;
}

export function remoteKey(path: string): string {
  return `${REMOTE_PREFIX}${normalizeRemotePath(path)}`;
}
