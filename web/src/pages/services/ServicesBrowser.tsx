import { useMemo, useState } from 'react';
import type { ServiceView } from '@shared/api';
import { useApp } from '@/boot';
import { useT } from '@/i18n';
import { usePrefs, setPrefs } from '@/lib/prefs';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { EmptyState } from '@/ui/EmptyState';
import { Icon } from '@/ui/icons';
import { IconButton } from '@/ui/IconButton';
import { List, ListRow } from '@/ui/List';
import { Section } from '@/ui/Section';
import { ServiceIcon } from '@/ui/ServiceIcon';
import {
  filterServices,
  groupByCategory,
  problemServices,
  serviceStateLabel,
  serviceTone,
  type StatusFilter,
} from './catalog';
import { ServiceItem } from './ServiceItem';
import styles from './services.module.css';

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
  if (catalogEmpty) {
    return (
      <EmptyState
        icon="services"
        title={t('services.empty.catalog.title')}
        description={t('services.empty.catalog.description')}
      />
    );
  }
  if (!searching && status === 'problems') {
    return (
      <EmptyState
        icon="check-circle"
        title={t('services.empty.problems.title')}
        description={t('services.empty.problems.description')}
      />
    );
  }
  if (!searching && status === 'favorites') {
    return (
      <EmptyState
        icon="star"
        title={t('services.empty.favorites.title')}
        description={t('services.empty.favorites.description')}
      />
    );
  }
  return (
    <EmptyState
      icon="search"
      title={t('services.empty.none.title')}
      description={searching ? t('services.empty.none.query', { query: query.trim() }) : undefined}
      action={
        <Button variant="secondary" onClick={onReset}>
          {t('services.empty.reset')}
        </Button>
      }
    />
  );
}

/** Search, status chips, problems first, then the catalog grouped by category. */
export function ServicesBrowser({ services }: { services: readonly ServiceView[] }) {
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
  const groups = useMemo(() => groupByCategory(visible, categories), [visible, categories]);

  const plainListing = status === 'all' && query.trim() === '';
  const filters: { value: StatusFilter; label: string; count?: number }[] = [
    { value: 'all', label: t('services.filter.all') },
    { value: 'problems', label: t('services.filter.problems'), count: problems.length },
    { value: 'favorites', label: t('services.filter.favorites'), count: favoriteCount },
  ];

  return (
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
              {filter.label}
              {filter.count !== undefined && filter.count > 0 && (
                <span className={styles.chipCount}>{filter.count}</span>
              )}
            </Chip>
          ))}
        </div>
      </div>

      {plainListing && problems.length > 0 && (
        <Section
          title={t('services.attention.title')}
          action={<span className={styles.count}>{problems.length}</span>}
        >
          <Card padding="none">
            <List variant="plain" aria-label={t('services.attention.list')}>
              {problems.map((service) => (
                <ListRow
                  key={service.id}
                  href={`/services/${encodeURIComponent(service.id)}`}
                  multiline
                  leading={
                    <ServiceIcon
                      name={service.icon}
                      iconUrl={service.iconUrl}
                      label={service.name}
                      size={36}
                    />
                  }
                  title={service.name}
                  subtitle={service.stateDetail ?? service.description}
                  trailing={
                    <Badge tone={serviceTone(service)} dot>
                      {serviceStateLabel(service)}
                    </Badge>
                  }
                />
              ))}
            </List>
          </Card>
        </Section>
      )}

      {groups.length === 0 ? (
        <EmptyResults
          status={status}
          query={query}
          catalogEmpty={services.length === 0}
          onReset={() => {
            setQuery('');
            setStatus('all');
          }}
        />
      ) : (
        groups.map((group) => (
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
        ))
      )}

      {plainListing && withoutUi > 0 && (
        <div className={styles.footer}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPrefs({ showServicesWithoutUi: !showServicesWithoutUi })}
          >
            {showServicesWithoutUi
              ? t('services.noUi.hide')
              : t('services.noUi.show', { n: withoutUi })}
          </Button>
        </div>
      )}
    </div>
  );
}
