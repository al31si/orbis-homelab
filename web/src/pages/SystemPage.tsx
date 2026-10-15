import { useState } from 'react';
import { useFeatures } from '@/boot';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { Notice } from '@/ui/Notice';
import { Page, PageHeader } from '@/ui/Page';
import { Segmented } from '@/ui/Segmented';
import { Skeleton } from '@/ui/Skeleton';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { CpuPanel } from './system/CpuPanel';
import { DiskIoPanel } from './system/DiskIoPanel';
import { DockerPanel } from './system/DockerPanel';
import { HostOverview } from './system/HostOverview';
import { MemoryPanel } from './system/MemoryPanel';
import { TemperaturePanel } from './system/TemperaturePanel';
import { Unavailable } from './system/Unavailable';
import styles from './system/system.module.css';

type Tab = 'resources' | 'docker';

function ResourcesSkeleton() {
  const t = useT();
  return (
    <div className={styles.resources} aria-busy="true" aria-label={t('system.loading')}>
      <Skeleton height={420} radius={10} className={styles.areaCpu} />
      <Skeleton height={360} radius={10} className={styles.areaMemory} />
      <Skeleton height={240} radius={10} className={styles.areaTemperature} />
    </div>
  );
}

export default function SystemPage() {
  const t = useT();
  const { containers: hasContainers } = useFeatures();
  const system = useSnapshot('system');
  const [tab, setTab] = useState<Tab>('resources');
  const data = system.data;

  return (
    <Page>
      <PageHeader
        title={t('system.title')}
        subtitle={<UpdatedAt fetchedAt={system.fetchedAt} status={system.status} />}
      />

      {hasContainers && (
        <div className={styles.tabs}>
          <Segmented
            options={[
              { value: 'resources', label: t('system.tabs.resources') },
              { value: 'docker', label: t('system.tabs.docker') },
            ]}
            value={tab}
            onChange={setTab}
            ariaLabel={t('system.tabs.label')}
            fullWidth
          />
        </div>
      )}

      <div className={styles.panel} data-active={!hasContainers || tab === 'resources'}>
        {data ? (
          <>
            {system.status === 'stale' && system.error && (
              <Notice tone="warn" title={t('system.stale')}>
                {system.error}
              </Notice>
            )}
            <div className={styles.resources}>
              <div className={styles.areaCpu}>
                <CpuPanel system={data} />
              </div>
              <div className={styles.areaMemory}>
                <MemoryPanel system={data} />
              </div>
              <div className={styles.areaTemperature}>
                <TemperaturePanel sensors={data.temperatures} />
              </div>
              <div className={styles.areaDisk}>
                <DiskIoPanel diskIo={data.diskIo} />
              </div>
              <div className={styles.areaHost}>
                <HostOverview host={data.host} />
              </div>
            </div>
          </>
        ) : (
          <Unavailable
            snapshot={system}
            skeleton={<ResourcesSkeleton />}
            title={t('system.error.system')}
          />
        )}
      </div>

      {hasContainers && (
        <div className={styles.panel} data-active={tab === 'docker'}>
          <DockerPanel system={data} />
        </div>
      )}
    </Page>
  );
}
