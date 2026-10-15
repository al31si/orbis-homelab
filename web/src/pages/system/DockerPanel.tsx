import { useMemo } from 'react';
import type { SystemInfo } from '@shared/api';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { ContainerList, type ContainerService } from './ContainerList';
import { dockerCounts } from './derive';
import { DockerSummary } from './DockerSummary';
import { Unavailable } from './Unavailable';
import styles from './system.module.css';

function DockerSkeleton() {
  const t = useT();
  return (
    <div className={styles.dockerStack} aria-busy="true" aria-label={t('system.loading')}>
      <Skeleton height={44} radius={8} />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <Skeleton key={index} height={56} radius={8} />
      ))}
    </div>
  );
}

export interface DockerPanelProps {
  /** Container counts and network traffic from the system snapshot, when it is available. */
  system: Pick<SystemInfo, 'docker' | 'dockerNetwork'> | null;
}

/** The container part of the page. Only mounted when the instance reports containers. */
export function DockerPanel({ system }: DockerPanelProps) {
  const t = useT();
  const containers = useSnapshot('containers');
  const services = useSnapshot('services');

  const catalog = useMemo(
    () =>
      new Map<string, ContainerService>(
        (services.data ?? []).map((service) => [
          service.id,
          {
            name: service.name,
            icon: service.icon,
            iconUrl: service.iconUrl,
            integration: service.integration?.id,
          },
        ]),
      ),
    [services.data],
  );
  const counts = dockerCounts(system?.docker, containers.data);

  return (
    <>
      {counts && (
        <Section title={t('system.section.docker')}>
          <DockerSummary counts={counts} network={system?.dockerNetwork ?? null} />
        </Section>
      )}
      <Section title={t('system.section.containers')}>
        {containers.data ? (
          <ContainerList containers={containers.data} services={catalog} />
        ) : (
          <Unavailable
            snapshot={containers}
            skeleton={<DockerSkeleton />}
            title={t('system.error.containers')}
          />
        )}
      </Section>
    </>
  );
}
