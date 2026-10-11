import type { PoolInfo, StorageInfo, VolumeInfo } from '../../../shared/api.js';
import type { Config } from '../config/schema.js';
import type { FsEntry } from './provider.js';
import { type HddReport, buildDisks, buildSmartSummary } from './storage-smart.js';

export type StorageSource = NonNullable<Config['sources']['storage']>;

/** Filesystem types that hold user data; pseudo filesystems (tmpfs, overlay...) are not listed. */
const REAL_FS_TYPES = new Set([
  'ext2',
  'ext3',
  'ext4',
  'xfs',
  'btrfs',
  'zfs',
  'vfat',
  'exfat',
  'ntfs',
  'f2fs',
  'nfs',
  'nfs4',
  'cifs',
  'fuse.mergerfs',
  'mergerfs',
]);

const toVolume = (fs: FsEntry, labels: Record<string, string>): VolumeInfo => ({
  mount: fs.mount,
  label: labels[fs.mount] ?? null,
  device: fs.device,
  type: fs.type,
  sizeBytes: fs.sizeBytes,
  usedBytes: fs.usedBytes,
  availableBytes: fs.availableBytes,
  percent: fs.percent,
});

/**
 * `include: auto` lists every real filesystem once per device (bind mounts and btrfs subvolumes
 * repeat a device); an explicit list keeps exactly those mounts. Pool mounts and members are
 * always kept: they are what pools are built from.
 */
export function buildVolumes(filesystems: readonly FsEntry[], config: StorageSource): VolumeInfo[] {
  const { include, labels } = config.volumes;
  const pinned = new Set(config.pools.flatMap((pool) => [pool.mount, ...pool.members]));

  let chosen: FsEntry[];
  if (include === 'auto') {
    chosen = [];
    const byDevice = new Map<string, FsEntry>();
    for (const fs of filesystems) {
      const isPinned = pinned.has(fs.mount);
      if (!isPinned && !REAL_FS_TYPES.has(fs.type)) continue;
      const same = fs.device === '' ? undefined : byDevice.get(fs.device);
      if (!same || isPinned) {
        chosen.push(fs);
        if (fs.device !== '' && !same) byDevice.set(fs.device, fs);
      } else if (fs.mount.length < same.mount.length && !pinned.has(same.mount)) {
        // Keep the shortest mount: `/` rather than a bind mount of a directory below it.
        chosen[chosen.indexOf(same)] = fs;
        byDevice.set(fs.device, fs);
      }
    }
  } else {
    const wanted = new Set([...include, ...pinned]);
    chosen = filesystems.filter((fs) => wanted.has(fs.mount));
  }
  return chosen.map((fs) => toVolume(fs, labels)).sort((a, b) => a.mount.localeCompare(b.mount));
}

/**
 * A pool is a union of volumes shown as one capacity. The provider may not report the pool's own
 * mount (Glances hides FUSE filesystems such as mergerfs): the capacity is then the sum of its
 * members, which is what the union's df reports as well. A reported mount always wins. A pool
 * whose members are not all reported is left out rather than shown with a misleading total.
 */
export function buildPools(
  filesystems: readonly FsEntry[],
  pools: StorageSource['pools'],
): PoolInfo[] {
  const byMount = new Map(filesystems.map((f) => [f.mount, f]));
  return pools.flatMap((pool) => {
    const own = byMount.get(pool.mount);
    const members = pool.members.map((mount) => byMount.get(mount));
    let capacity: Pick<FsEntry, 'sizeBytes' | 'usedBytes' | 'availableBytes'> | undefined = own;
    if (!capacity && members.length > 0 && members.every((m) => m !== undefined)) {
      const present = members as FsEntry[];
      capacity = {
        sizeBytes: sum(present, 'sizeBytes'),
        usedBytes: sum(present, 'usedBytes'),
        availableBytes: sum(present, 'availableBytes'),
      };
    }
    if (!capacity) return [];
    return [
      {
        id: pool.id,
        label: pool.label,
        mount: pool.mount,
        ...capacity,
        percent: own?.percent ?? percentOf(capacity.usedBytes, capacity.sizeBytes),
        members: pool.members,
      },
    ];
  });
}

const sum = (list: readonly FsEntry[], key: 'sizeBytes' | 'usedBytes' | 'availableBytes'): number =>
  list.reduce((total, fs) => total + fs[key], 0);

const percentOf = (used: number, size: number): number =>
  size > 0 ? Math.round((used / size) * 1000) / 10 : 0;

export interface StorageInputs {
  config: StorageSource;
  /** null: no system provider, or none produced data yet. */
  filesystems: readonly FsEntry[] | null;
  /** null: no SMART source, or none produced data yet. */
  report: HddReport | null;
}

/** Every part is independent: no provider -> no volumes/pools; no SMART report -> no disks. */
export function buildStorage(input: StorageInputs, now = Date.now()): StorageInfo {
  const { config, filesystems, report } = input;
  const fs = filesystems ?? [];
  return {
    volumes: buildVolumes(fs, config),
    pools: buildPools(fs, config.pools),
    disks: report ? buildDisks(report, config.smart?.disks ?? {}, fs) : [],
    smart: report ? buildSmartSummary(report, now) : null,
  };
}
