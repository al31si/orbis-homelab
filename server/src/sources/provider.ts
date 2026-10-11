import type { ContainerInfo, SystemInfo } from '../../../shared/api.js';
import type { Config } from '../config/schema.js';
import { GlancesClient } from './glances.js';

/** Host metrics without the parts the core derives (container totals, history). */
export type SystemCore = Omit<SystemInfo, 'history' | 'dockerNetwork' | 'docker'>;

/** A container as reported by a provider, before it is matched to a catalog service. */
export type RawContainer = Omit<ContainerInfo, 'serviceId'>;

/** One mounted filesystem as reported by a provider (mount points are host paths). */
export interface FsEntry {
  mount: string;
  device: string;
  type: string;
  sizeBytes: number;
  usedBytes: number;
  availableBytes: number;
  percent: number;
}

/**
 * Where host metrics, container state and filesystems come from. The core only talks to this
 * interface; the frontend only sees the contract shapes, never the provider.
 */
export interface SystemProvider {
  readonly type: string;
  /**
   * `cpuWindowSeconds` is the interval the provider averaged its CPU counters over; a sub-second
   * window is noise and the core ignores that CPU sample.
   */
  system(): Promise<{ core: SystemCore; cpuWindowSeconds: number }>;
  containers(): Promise<RawContainer[]>;
  filesystems(): Promise<FsEntry[]>;
}

export type SystemSource = NonNullable<Config['sources']['system']>;

/** The one place that maps a configured `type` to its implementation. */
export function createSystemProvider(source: SystemSource): SystemProvider {
  switch (source.type) {
    case 'glances':
      return new GlancesClient(source);
  }
}
