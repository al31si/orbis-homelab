import type { StorageInfo, SystemInfo } from '@shared/api';
import { useFeatures } from '@/boot';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { formatBytesPerSec } from '@/lib/format';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { Section } from '@/ui/Section';
import { diskIoLabel } from './derive';
import styles from './system.module.css';

type DiskIo = SystemInfo['diskIo'];

function Rate({ kind, value }: { kind: 'read' | 'write'; value: number }) {
  const t = useT();
  return (
    <span className={styles.rate} data-idle={value < 1 || undefined}>
      <Icon name={kind === 'read' ? 'arrow-down' : 'arrow-up'} size={14} />
      <span className="sr-only">
        {kind === 'read' ? t('system.diskIo.read') : t('system.diskIo.write')}
      </span>
      {formatBytesPerSec(value)}
    </span>
  );
}

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
      <Card padding="none" className={styles.grow}>
        {disks.length === 0 ? (
          <p className={styles.muted}>{t('system.diskIo.empty')}</p>
        ) : (
          <List variant="plain" aria-label={t('system.diskIo.list')}>
            {disks.map((disk) => {
              const label = diskIoLabel(disk.name, storage?.disks ?? [], storage?.volumes ?? []);
              return (
                <ListRow
                  key={disk.name}
                  leading={<Icon name="disk" size={20} />}
                  title={label ?? disk.name}
                  subtitle={label ? disk.name : undefined}
                  trailing={
                    <span className={styles.rates}>
                      <Rate kind="read" value={disk.readBytesPerSec} />
                      <Rate kind="write" value={disk.writeBytesPerSec} />
                    </span>
                  }
                />
              );
            })}
          </List>
        )}
      </Card>
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
