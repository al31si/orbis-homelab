import { memo, useDeferredValue, useMemo, useState } from 'react';
import type { ContainerInfo } from '@shared/api';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { formatBytes, formatPercent } from '@/lib/format';
import { toneForContainerState } from '@/lib/tone';
import { AppLink } from '@/ui/AppLink';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Icon } from '@/ui/icons';
import { Segmented } from '@/ui/Segmented';
import {
  filterContainers,
  localizeUptime,
  needsAttention,
  sortContainers,
  type ContainerFilter,
  type ContainerSort,
} from './derive';
import styles from './system.module.css';

interface RowProps {
  container: ContainerInfo;
  serviceName: string | undefined;
}

/** Deliberately plain markup: 40+ of these must scroll smoothly on a phone. */
const ContainerRow = memo(function ContainerRow({ container, serviceName }: RowProps) {
  const t = useT();
  const tone = toneForContainerState(container.state);
  const attention = needsAttention(container.state);
  const uptime = localizeUptime(container.uptime);
  const state = t(`system.state.${container.state}`);
  const body = (
    <>
      <span className={styles.cDot} data-tone={tone} aria-hidden />
      <span className={styles.cName}>
        <span className={styles.cTitle}>{container.name}</span>
        <span className={styles.cSub}>
          {attention && (
            <span className={styles.cSubState} data-tone={tone}>
              {state} ·{' '}
            </span>
          )}
          {serviceName ?? container.image}
          <span className={styles.cSubUptime}> · {uptime}</span>
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
      <span className={styles.cUptime}>{uptime}</span>
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
  serviceNames: ReadonlyMap<string, string>;
}

export function ContainerList({ containers, serviceNames }: ContainerListProps) {
  const t = useT();
  const [filter, setFilter] = useState<ContainerFilter>('all');
  const [sort, setSort] = useState<ContainerSort>('state');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

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
            {t('system.containers.all', { n: containers.length })}
          </Chip>
          <Chip selected={filter === 'problems'} onClick={() => setFilter('problems')}>
            {t('system.containers.problems', { n: problems })}
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

      <Card padding="none">
        {rows.length === 0 ? (
          <p className={styles.muted} role="status">
            {containers.length === 0
              ? t('system.containers.none')
              : filter === 'problems' && deferredQuery.trim() === ''
                ? t('system.containers.allFine')
                : t('system.containers.noMatch')}
          </p>
        ) : (
          <>
            <div className={styles.cHead} aria-hidden>
              <span />
              <span>{t('system.containers.colContainer')}</span>
              <span>{t('system.containers.colState')}</span>
              <span>{t('system.containers.colCpu')}</span>
              <span>{t('system.containers.colMemory')}</span>
              <span>{t('system.containers.colUptime')}</span>
              <span />
            </div>
            <ul className={styles.cList} aria-label={t('system.containers.list')}>
              {rows.map((container) => (
                <ContainerRow
                  key={container.name}
                  container={container}
                  serviceName={
                    container.serviceId ? serviceNames.get(container.serviceId) : undefined
                  }
                />
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
