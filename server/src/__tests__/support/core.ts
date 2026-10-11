import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';
import type { ServiceView, StorageInfo, SystemInfo } from '../../../../shared/api.js';
import {
  type Config,
  type ServiceDef,
  type ServicesFile,
  configSchema,
  servicesFileSchema,
} from '../../config/schema.js';
import type { Logger } from '../../core/types.js';
import type { FsEntry } from '../../sources/provider.js';

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

export function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'orbis-core-'));
  dirs.push(dir);
  return dir;
}

export function writeFile(dir: string, name: string, content: string): string {
  const file = path.join(dir, name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

export const config = (input: unknown = {}): Config => configSchema.parse(input);
export const servicesFile = (services: unknown[] = []): ServicesFile =>
  servicesFileSchema.parse({ services });
export const serviceDefs = (services: unknown[]): ServiceDef[] => servicesFile(services).services;

export const silentLog: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export const fsEntry = (
  mount: string,
  over: Partial<FsEntry> & { percent?: number } = {},
): FsEntry => {
  const percent = over.percent ?? 10;
  return {
    mount,
    device: `/dev/${mount.replace(/\W+/g, '') || 'root'}`,
    type: 'ext4',
    sizeBytes: 100,
    usedBytes: percent,
    availableBytes: 100 - percent,
    percent,
    ...over,
  };
};

export const systemInfo = (over: Partial<SystemInfo> = {}): SystemInfo => ({
  host: { hostname: 'host', os: 'Linux', kernel: '7', uptimeSeconds: 1, cores: 4 },
  cpu: {
    percent: 10,
    user: 5,
    system: 5,
    iowait: 0,
    perCore: [],
    load: { m1: 0.4, m5: 0.5, m15: 0.5 },
  },
  memory: { totalBytes: 100, usedBytes: 40, availableBytes: 60, cachedBytes: 0, percent: 40 },
  swap: { totalBytes: 100, usedBytes: 77, percent: 77 },
  temperatures: [{ label: 'Package id 0', celsius: 53, warn: 85, crit: 105 }],
  diskIo: [],
  dockerNetwork: { rxBytesPerSec: 0, txBytesPerSec: 0 },
  docker: { total: 0, running: 0, healthy: 0, unhealthy: 0, starting: 0 },
  history: [],
  ...over,
});

export const storageInfo = (over: Partial<StorageInfo> = {}): StorageInfo => ({
  volumes: [],
  pools: [],
  disks: [],
  smart: null,
  ...over,
});

export const serviceView = (over: Partial<ServiceView>): ServiceView => ({
  id: 'x',
  name: 'X',
  description: '',
  category: null,
  icon: 'generic',
  iconUrl: null,
  url: null,
  state: 'up',
  monitored: true,
  stateDetail: null,
  containers: [],
  probe: null,
  cpuPercent: 0,
  memoryBytes: 0,
  uptime: null,
  badges: [],
  metrics: [],
  core: false,
  integration: null,
  ...over,
});
