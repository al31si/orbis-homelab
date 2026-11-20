import { memo, useDeferredValue, useMemo, useState } from 'react';
import type { ContainerInfo } from '@shared/api';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { formatBytes, formatPercent } from '@/lib/format';
import { toneForContainerState } from '@/lib/tone';
import { AppLink } from '@/ui/AppLink';
import { Badge } from '@/ui/Badge';
import { Chip } from '@/ui/Chip';
import { Icon } from '@/ui/icons';
import { Segmented } from '@/ui/Segmented';
import { ServiceIcon } from '@/ui/ServiceIcon';
import {
  filterContainers,
  localizeUptime,
  needsAttention,
  sortContainers,
  type ContainerFilter,
  type ContainerSort,
} from './derive';
import styles from './system.module.css';

/** What a container row needs to know about the catalog service that owns it. */
export interface ContainerService {
  name: string;
  icon: string;
  iconUrl: string | null;
  integration: string | undefined;
}

interface RowProps {
  container: ContainerInfo;
  service: ContainerService | undefined;
}

/** Deliberately plain markup: 40+ of these must scroll smoothly on a phone. */
const ContainerRow = memo(function ContainerRow({ container, service }: RowProps) {
  const t = useT();
  const tone = toneForContainerState(container.state);
  const attention = needsAttention(container.state);
  const uptime = localizeUptime(container.uptime);
  const state = t(`system.state.${container.state}`);
  const body = (
    <>
      <span className={styles.cLamp} data-tone={tone} aria-hidden />
      <ServiceIcon
        name={service?.icon ?? 'generic'}
        iconUrl={service?.iconUrl ?? null}
        serviceId={container.serviceId ?? undefined}
        integration={service?.integration}
        label={service?.name ?? container.name}
        size={32}
        className={styles.cIcon}
      />
      <span className={styles.cName}>
        <span className={styles.cTitle} title={container.name}>
          {container.name}
        </span>
        <span className={styles.cSub}>
          {attention && (
            <Badge tone={tone} className={styles.cTag}>
              {state}
            </Badge>
          )}
          <span className={styles.cImage} title={container.image}>
            {container.image}
          </span>
        </span>
      </span>
      <span className={styles.cState} data-tone={tone}>
        {state}
      </span>
      <span className={styles.cCpu} data-idle={container.cpuPercent < 0.05 || undefined}>
        <span className="sr-only">{t('system.containers.colCpu')} </span>
        {formatPercent(container.cpuPercent, 1)}
      </span>
      <span className={styles.cMem}>
        <span className="sr-only">{t('system.containers.colMemory')} </span>
        {formatBytes(container.memoryBytes)}
      </span>
      <span className={styles.cUptime}>
        <span className="sr-only">{t('system.containers.colUptime')} </span>
        {uptime}
      </span>
      <span className={styles.cChevron}>
        {container.serviceId && <Icon name="chevron-right" size={16} />}
      </span>
    </>
  );
  return (
    <li className={styles.cItem} data-attn={attention || undefined} data-tone={tone}>
      {container.serviceId ? (
        <AppLink
          href={`/services/${encodeURIComponent(container.serviceId)}`}
          className={cx(styles.cRow, styles.cLink)}
        >
          {body}
        </AppLink>
      ) : (
        <div className={styles.cRow}>{body}</div>
      )}
    </li>
  );
});

export interface ContainerListProps {
  containers: readonly ContainerInfo[];
  /** Catalog services by id; containers of a service show its logo and can be searched by its name. */
  services: ReadonlyMap<string, ContainerService>;
}

export function ContainerList({ containers, services }: ContainerListProps) {
  const t = useT();
  const [filter, setFilter] = useState<ContainerFilter>('all');
  const [sort, setSort] = useState<ContainerSort>('state');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const serviceNames = useMemo(
    () => new Map([...services].map(([id, service]) => [id, service.name])),
    [services],
  );
  const problems = useMemo(
    () => containers.filter((container) => needsAttention(container.state)).length,
    [containers],
  );
  const rows = useMemo(
    () => sortContainers(filterContainers(containers, filter, deferredQuery, serviceNames), sort),
    [containers, filter, deferredQuery, serviceNames, sort],
  );

  return (
    <div className={styles.containers}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('system.containers.search')}
            aria-label={t('system.containers.search')}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
        <div className={styles.filters}>
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            {t('system.containers.all')}
            <span className={styles.chipCount}>{containers.length}</span>
          </Chip>
          <Chip selected={filter === 'problems'} onClick={() => setFilter('problems')}>
            {t('system.containers.problems')}
            <span className={styles.chipCount}>{problems}</span>
          </Chip>
        </div>
        <Segmented
          className={styles.sort}
          options={[
            { value: 'state', label: t('system.containers.sortState') },
            { value: 'cpu', label: t('system.containers.sortCpu') },
            { value: 'memory', label: t('system.containers.sortMemory') },
            { value: 'name', label: t('system.containers.sortName') },
          ]}
          value={sort}
          onChange={setSort}
          ariaLabel={t('system.containers.sortLabel')}
        />
      </div>

      {rows.length === 0 ? (
        <p className={styles.muted} role="status">
          {containers.length === 0
            ? t('system.containers.none')
            : filter === 'problems' && deferredQuery.trim() === ''
              ? t('system.containers.allFine')
              : t('system.containers.noMatch')}
        </p>
      ) : (
        <div className={styles.cTable}>
          <div className={styles.cHead} aria-hidden>
            <span className={styles.cHeadName}>{t('system.containers.colContainer')}</span>
            <span className={styles.cHeadCpu}>{t('system.containers.colCpu')}</span>
            <span className={styles.cHeadMem}>{t('system.containers.colMemory')}</span>
            <span className={styles.cHeadUptime}>{t('system.containers.colUptime')}</span>
          </div>
          <ul className={styles.cList} aria-label={t('system.containers.list')}>
            {rows.map((container) => (
              <ContainerRow
                key={container.name}
                container={container}
                service={container.serviceId ? services.get(container.serviceId) : undefined}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
