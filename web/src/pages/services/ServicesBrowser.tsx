import { useMemo, useState, type ReactNode } from 'react';
import type { ServiceView } from '@shared/api';
import type { SnapshotStatus } from '@/data';
import { useApp } from '@/boot';
import { useT } from '@/i18n';
import { usePrefs, setPrefs } from '@/lib/prefs';
import type { UiTone } from '@/lib/tone';
import { RichText } from '@/pages/more/RichText';
import { StatusDot } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Chip';
import { Icon } from '@/ui/icons';
import { IconButton } from '@/ui/IconButton';
import { Section } from '@/ui/Section';
import { UpdatedAt } from '@/ui/UpdatedAt';
import {
  filterServices,
  groupByCategory,
  needsAttention,
  problemServices,
  type StatusFilter,
} from './catalog';
import { ServiceItem } from './ServiceItem';
import styles from './services.module.css';

function EmptySlot({
  title,
  description,
  tone,
  action,
}: {
  title: string;
  description?: ReactNode;
  tone?: UiTone;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty} role="status">
      <h2 className={styles.emptyTitle}>
        {tone && <StatusDot tone={tone} />}
        {title}
      </h2>
      {description && <p className={styles.emptyText}>{description}</p>}
      {action}
    </div>
  );
}

function EmptyResults({
  status,
  query,
  catalogEmpty,
  onReset,
}: {
  status: StatusFilter;
  query: string;
  catalogEmpty: boolean;
  onReset: () => void;
}) {
  const t = useT();
  const searching = query.trim() !== '';
  const showAll = (
    <div className={styles.emptyAction}>
      <Button variant="secondary" onClick={onReset}>
        {t('services.empty.showAll')}
      </Button>
    </div>
  );
  if (catalogEmpty) {
    return (
      <EmptySlot
        title={t('services.empty.catalog.title')}
        description={<RichText text={t('services.empty.catalog.description')} />}
      />
    );
  }
  if (!searching && status === 'problems') {
    return (
      <EmptySlot
        tone="ok"
        title={t('services.empty.problems.title')}
        description={t('services.empty.problems.description')}
        action={showAll}
      />
    );
  }
  if (!searching && status === 'favorites') {
    return (
      <EmptySlot
        title={t('services.empty.favorites.title')}
        description={t('services.empty.favorites.description')}
        action={showAll}
      />
    );
  }
  return (
    <EmptySlot
      title={t('services.empty.none.title')}
      description={
        searching
          ? t('services.empty.none.query', { query: query.trim() })
          : t('services.empty.none.hidden')
      }
      action={
        searching || status !== 'all' ? (
          <div className={styles.emptyAction}>
            <Button variant="secondary" onClick={onReset}>
              {t('services.empty.reset')}
            </Button>
          </div>
        ) : undefined
      }
    />
  );
}

/** Search, status chips, problems first, then the catalog grouped by category. */
export function ServicesBrowser({
  services,
  fetchedAt,
  status: snapshotStatus,
}: {
  services: readonly ServiceView[];
  fetchedAt: number | null;
  status: SnapshotStatus;
}) {
  const t = useT();
  const { categories } = useApp();
  const { favorites, showServicesWithoutUi } = usePrefs();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const problems = useMemo(() => problemServices(services), [services]);
  const favoriteCount = services.filter((service) => favorites.includes(service.id)).length;
  const withoutUi = services.filter((service) => service.url === null).length;
  const visible = useMemo(
    () =>
      filterServices(services, {
        query,
        status,
        favorites,
        showWithoutUi: showServicesWithoutUi,
        categories,
      }),
    [services, query, status, favorites, showServicesWithoutUi, categories],
  );

  const plainListing = status === 'all' && query.trim() === '';
  // In the plain listing the services that are not up are lifted into their own section on top,
  // so every service appears exactly once.
  const lifted = plainListing && problems.length > 0;
  const groups = useMemo(
    () =>
      groupByCategory(
        lifted ? visible.filter((service) => !needsAttention(service)) : visible,
        categories,
      ),
    [visible, lifted, categories],
  );
  const problemTone: UiTone = problems.some((service) => service.state === 'down')
    ? 'crit'
    : 'warn';
  const filters: { value: StatusFilter; label: string; count?: number }[] = [
    { value: 'all', label: t('services.filter.all') },
    { value: 'problems', label: t('services.filter.problems'), count: problems.length },
    { value: 'favorites', label: t('services.filter.favorites'), count: favoriteCount },
  ];

  return (
    <div className={styles.frame}>
      <div className={styles.layout}>
        <div className={styles.toolbar}>
          <div className={styles.search} role="search">
            <Icon name="search" size={20} className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('services.search.placeholder')}
              aria-label={t('services.search.label')}
              enterKeyHint="search"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            {query !== '' && (
              <IconButton
                icon="close"
                iconSize={18}
                label={t('services.search.clear')}
                className={styles.clear}
                onClick={() => setQuery('')}
              />
            )}
          </div>
          <div className={styles.chips} role="group" aria-label={t('services.filter.label')}>
            {filters.map((filter) => (
              <Chip
                key={filter.value}
                selected={status === filter.value}
                onClick={() => setStatus(filter.value)}
              >
                {filter.value === 'problems' && problems.length > 0 && (
                  <StatusDot tone={problemTone} />
                )}
                {filter.label}
                {filter.count !== undefined && filter.count > 0 && (
                  <span className={styles.chipCount}>{filter.count}</span>
                )}
              </Chip>
            ))}
          </div>
        </div>

        {lifted && (
          <Section
            title={t('services.attention.title')}
            action={<span className={styles.count}>{problems.length}</span>}
          >
            <ul className={styles.list} aria-label={t('services.attention.list')}>
              {problems.map((service) => (
                <ServiceItem
                  key={service.id}
                  service={service}
                  favorite={favorites.includes(service.id)}
                />
              ))}
            </ul>
          </Section>
        )}

        {groups.length === 0
          ? !lifted && (
              <EmptyResults
                status={status}
                query={query}
                catalogEmpty={services.length === 0}
                onReset={() => {
                  setQuery('');
                  setStatus('all');
                }}
              />
            )
          : groups.map((group) => (
              <Section
                key={group.category ?? ''}
                title={group.label}
                action={<span className={styles.count}>{group.services.length}</span>}
              >
                <ul className={styles.list}>
                  {group.services.map((service) => (
                    <ServiceItem
                      key={service.id}
                      service={service}
                      favorite={favorites.includes(service.id)}
                    />
                  ))}
                </ul>
              </Section>
            ))}

        <div className={styles.footer}>
          {plainListing && withoutUi > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setPrefs({ showServicesWithoutUi: !showServicesWithoutUi })}
            >
              {showServicesWithoutUi
                ? t('services.noUi.hide')
                : t('services.noUi.show', { n: withoutUi })}
            </Button>
          ) : (
            <span />
          )}
          <UpdatedAt fetchedAt={fetchedAt} status={snapshotStatus} className={styles.updated} />
        </div>
      </div>
    </div>
  );
}
