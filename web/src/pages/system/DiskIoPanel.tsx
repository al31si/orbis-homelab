import type { StorageInfo, SystemInfo } from '@shared/api';
import { useFeatures } from '@/boot';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { formatBytesPerSec } from '@/lib/format';
import { Section } from '@/ui/Section';
import { diskIoLabel } from './derive';
import styles from './system.module.css';

type DiskIo = SystemInfo['diskIo'];

interface DiskIoListProps {
  diskIo: DiskIo;
  /** Used only to give the kernel device names a friendly label. */
  storage: StorageInfo | null;
}

function DiskIoList({ diskIo, storage }: DiskIoListProps) {
  const t = useT();
  const disks = [...diskIo].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Section title={t('system.diskIo.title')}>
      {disks.length === 0 ? (
        <p className={styles.muted}>{t('system.diskIo.empty')}</p>
      ) : (
        <table className={styles.io} aria-label={t('system.diskIo.list')}>
          <thead>
            <tr>
              <th scope="col">{t('system.diskIo.colDisk')}</th>
              <th scope="col">{t('system.diskIo.read')}</th>
              <th scope="col">{t('system.diskIo.write')}</th>
            </tr>
          </thead>
          <tbody>
            {disks.map((disk) => {
              const label = diskIoLabel(disk.name, storage?.disks ?? [], storage?.volumes ?? []);
              return (
                <tr key={disk.name}>
                  <th scope="row">
                    <span className={styles.ioName} title={label ?? disk.name}>
                      {label ?? disk.name}
                    </span>
                    {label && <span className={styles.ioDevice}>{disk.name}</span>}
                  </th>
                  <td data-idle={disk.readBytesPerSec < 1 || undefined}>
                    {formatBytesPerSec(disk.readBytesPerSec)}
                  </td>
                  <td data-idle={disk.writeBytesPerSec < 1 || undefined}>
                    {formatBytesPerSec(disk.writeBytesPerSec)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function LabelledDiskIo({ diskIo }: { diskIo: DiskIo }) {
  const storage = useSnapshot('storage');
  return <DiskIoList diskIo={diskIo} storage={storage.data} />;
}

/** Per-device throughput; devices are labelled from the storage data when the instance has it. */
export function DiskIoPanel({ diskIo }: { diskIo: DiskIo }) {
  const { storage } = useFeatures();
  return storage ? (
    <LabelledDiskIo diskIo={diskIo} />
  ) : (
    <DiskIoList diskIo={diskIo} storage={null} />
  );
}
