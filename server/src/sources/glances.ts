import type { ContainerState } from '../../../shared/api.js';
import { getJson } from '../lib/http.js';
import type {
  FsEntry,
  RawContainer,
  SystemCore,
  SystemProvider,
  SystemSource,
} from './provider.js';

type Json = Record<string, unknown>;

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);
const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Glances reports uptime as "16 days, 0:16:00" / "1 day, 3:04:05" / "3:04:05". */
export function parseUptime(text: string): number {
  const m = /^(?:(\d+) days?, )?(\d+):(\d{2}):(\d{2})/.exec(text.trim());
  if (!m) return 0;
  return Number(m[1] ?? 0) * 86400 + Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]);
}

export interface GlancesSystemRaw {
  cpu: unknown;
  percpu: unknown;
  mem: unknown;
  memswap: unknown;
  load: unknown;
  uptime: unknown;
  system: unknown;
  sensors: unknown;
  diskio: unknown;
}

const PHYSICAL_DISK = /^(sd[a-z]+|vd[a-z]+|nvme\d+n\d+|mmcblk\d+)$/;

export function normalizeSystem(raw: GlancesSystemRaw, hostName?: string): SystemCore {
  const cpu = obj(raw.cpu);
  const mem = obj(raw.mem);
  const swap = obj(raw.memswap);
  const load = obj(raw.load);
  const system = obj(raw.system);
  const cores = num(cpu.cpucore, num(load.cpucore, 1));
  const memTotal = num(mem.total);
  const memAvailable = num(mem.available);

  return {
    host: {
      hostname: hostName ?? str(system.hostname, 'localhost'),
      os: str(system.linux_distro, str(system.os_name, 'Linux')),
      kernel: str(system.os_version),
      uptimeSeconds: typeof raw.uptime === 'string' ? parseUptime(raw.uptime) : 0,
      cores,
    },
    cpu: {
      percent: round1(num(cpu.total)),
      user: round1(num(cpu.user)),
      system: round1(num(cpu.system)),
      iowait: round1(num(cpu.iowait)),
      perCore: arr(raw.percpu).map((c) => round1(num(c.total))),
      load: { m1: num(load.min1), m5: num(load.min5), m15: num(load.min15) },
    },
    memory: {
      totalBytes: memTotal,
      availableBytes: memAvailable,
      usedBytes: Math.max(0, memTotal - memAvailable),
      cachedBytes: num(mem.cached),
      percent: memTotal > 0 ? round1(((memTotal - memAvailable) / memTotal) * 100) : 0,
    },
    swap: {
      totalBytes: num(swap.total),
      usedBytes: num(swap.used),
      percent: round1(num(swap.percent)),
    },
    temperatures: arr(raw.sensors)
      .filter((s) => s.unit === 'C' && typeof s.value === 'number')
      .map((s) => ({
        label: str(s.label),
        celsius: num(s.value),
        warn: typeof s.warning === 'number' ? s.warning : null,
        crit: typeof s.critical === 'number' ? s.critical : null,
      })),
    diskIo: arr(raw.diskio)
      .filter((d) => PHYSICAL_DISK.test(str(d.disk_name)))
      .map((d) => ({
        name: str(d.disk_name),
        readBytesPerSec: num(d.read_bytes_rate_per_sec),
        writeBytesPerSec: num(d.write_bytes_rate_per_sec),
      })),
  };
}

const CONTAINER_STATES: readonly ContainerState[] = [
  'healthy',
  'running',
  'starting',
  'unhealthy',
  'paused',
  'restarting',
  'exited',
  'dead',
];

function containerState(status: string): ContainerState {
  const s = status.toLowerCase();
  return (CONTAINER_STATES as readonly string[]).includes(s) ? (s as ContainerState) : 'unknown';
}

function rate(delta: unknown, window: unknown): number {
  const seconds = Math.max(num(window), 1);
  return Math.max(0, num(delta)) / seconds;
}

export function normalizeContainers(raw: unknown): RawContainer[] {
  return arr(raw)
    .map((c) => {
      const net = obj(c.network);
      const io = obj(c.io);
      const image = Array.isArray(c.image) ? str(c.image[0]) : str(c.image);
      return {
        name: str(c.name),
        image,
        state: containerState(str(c.status)),
        uptime: str(c.uptime),
        cpuPercent: round1(num(c.cpu_percent)),
        memoryBytes: num(c.memory_usage),
        rxBytesPerSec: rate(net.rx, net.time_since_update),
        txBytesPerSec: rate(net.tx, net.time_since_update),
        ioReadBytesPerSec: rate(io.ior, io.time_since_update),
        ioWriteBytesPerSec: rate(io.iow, io.time_since_update),
        ports: str(c.ports),
      };
    })
    .filter((c) => c.name !== '')
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Filesystems as seen by Glances, mount points rewritten from `<hostPrefix>/...` to host paths.
 * An empty prefix means Glances runs on the host itself: every mount is kept as is.
 */
export function normalizeFs(raw: unknown, hostPrefix: string): FsEntry[] {
  const prefix = hostPrefix.replace(/\/+$/, '');
  const entries: FsEntry[] = [];
  for (const f of arr(raw)) {
    const mount = str(f.mnt_point);
    if (prefix !== '' && mount !== prefix && !mount.startsWith(`${prefix}/`)) continue;
    const size = num(f.size);
    const used = num(f.used);
    entries.push({
      mount: mount.slice(prefix.length) || '/',
      device: str(f.device_name),
      type: str(f.fs_type),
      sizeBytes: size,
      usedBytes: used,
      availableBytes: num(f.free),
      percent: size > 0 ? round1((used / size) * 100) : num(f.percent),
    });
  }
  return entries;
}

export class GlancesClient implements SystemProvider {
  readonly type = 'glances';
  private readonly baseUrl: string;
  private readonly hostPrefix: string;
  private readonly hostname: string | undefined;

  constructor(source: SystemSource) {
    this.baseUrl = source.url.replace(/\/+$/, '');
    this.hostPrefix = source.hostPrefix;
    this.hostname = source.hostname;
  }

  private get<T>(path: string): Promise<T> {
    return getJson<T>(`${this.baseUrl}/api/4/${path}`, { timeoutMs: 8000 });
  }

  async system(): Promise<{ core: SystemCore; cpuWindowSeconds: number }> {
    const [cpu, percpu, mem, memswap, load, uptime, system, sensors, diskio] = await Promise.all([
      this.get('cpu'),
      this.get('percpu'),
      this.get('mem'),
      this.get('memswap'),
      this.get('load'),
      this.get('uptime'),
      this.get('system'),
      // Sensors and disk I/O are optional: their absence must not blank the whole system view.
      this.get('sensors').catch(() => []),
      this.get('diskio').catch(() => []),
    ]);
    return {
      core: normalizeSystem(
        { cpu, percpu, mem, memswap, load, uptime, system, sensors, diskio },
        this.hostname,
      ),
      cpuWindowSeconds: num(obj(cpu).time_since_update, Infinity),
    };
  }

  async containers(): Promise<RawContainer[]> {
    return normalizeContainers(await this.get('containers'));
  }

  async filesystems(): Promise<FsEntry[]> {
    return normalizeFs(await this.get('fs'), this.hostPrefix);
  }
}
