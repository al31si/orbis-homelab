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
      <Skeleton height={96} radius={20} className={styles.hostCell} />
      <Skeleton height={520} radius={20} />
      <Skeleton height={520} radius={20} />
      <Skeleton height={300} radius={20} />
      <Skeleton height={300} radius={20} />
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
        eyebrow={data?.host.hostname}
        subtitle={<UpdatedAt fetchedAt={system.fetchedAt} status={system.status} />}
      />

      {hasContainers && (
        <Segmented
          className={styles.tabs}
          options={[
            { value: 'resources', label: t('system.tabs.resources') },
            { value: 'docker', label: t('system.tabs.docker') },
          ]}
          value={tab}
          onChange={setTab}
          ariaLabel={t('system.tabs.label')}
          fullWidth
        />
      )}

      <div className={styles.panel} data-active={!hasContainers || tab === 'resources'}>
        {data ? (
          <div className={styles.resources}>
            {system.status === 'stale' && system.error && (
              <Notice tone="warn" title={t('system.stale')} className={styles.hostCell}>
                {system.error}
              </Notice>
            )}
            <HostOverview host={data.host} />
            <CpuPanel system={data} />
            <MemoryPanel system={data} />
            <TemperaturePanel sensors={data.temperatures} />
            <DiskIoPanel diskIo={data.diskIo} />
          </div>
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
