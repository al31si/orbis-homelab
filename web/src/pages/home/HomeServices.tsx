import type { Overview, ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { List, ListRow } from '@/ui/List';
import { Section } from '@/ui/Section';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { serviceStateLabel, serviceTone } from '@/pages/services/catalog';
import { ServiceLamps } from './ServiceLamps';
import { summarizeServices } from './summary';
import styles from './home.module.css';

export interface HomeServicesProps {
  summary: Overview['services'];
  problemServiceIds: readonly string[];
  /** Full catalog, used to name the services that are not up. */
  services: readonly ServiceView[] | null;
}

/** "17 of 18 online", a lamp per service, and the services that need a look; only monitored ones count. */
export function HomeServices({ summary, problemServiceIds, services }: HomeServicesProps) {
  const t = useT();
  const { monitored, up, unmonitored, allUp } = summarizeServices(summary);
  const problems = problemServiceIds
    .map((id) => services?.find((service) => service.id === id))
    .filter((service): service is ServiceView => service !== undefined && service.monitored);
  const tone = allUp ? 'ok' : summary.down > 0 ? 'crit' : 'warn';

  return (
    <Section title={t('home.services.title')}>
      <div className={styles.services}>
        <div className={styles.servicesHead}>
          {monitored > 0 ? (
            <p className={styles.servicesCount} data-tone={tone}>
              <span className={styles.servicesFigure}>{up}</span>
              <span className={styles.servicesOf}>{t('home.services.of', { monitored })}</span>
            </p>
          ) : (
            <p className={styles.servicesNone}>
              {t('home.services.noneMonitored', { total: summary.total })}
            </p>
          )}
          <Button href="/services" variant="ghost">
            {t('home.services.all')}
          </Button>
        </div>
        <ServiceLamps summary={summary} services={services} />
        {monitored > 0 && unmonitored > 0 && (
          <p className={styles.servicesNote}>
            {t('home.services.unmonitored', { n: unmonitored })}
          </p>
        )}
        {problems.length > 0 && (
          <List
            variant="plain"
            className={styles.problems}
            aria-label={t('home.services.problems')}
          >
            {problems.map((service) => (
              <ListRow
                key={service.id}
                href={`/services/${encodeURIComponent(service.id)}`}
                multiline
                leading={
                  <ServiceIcon
                    name={service.icon}
                    iconUrl={service.iconUrl}
                    serviceId={service.id}
                    integration={service.integration?.id}
                    label={service.name}
                    size={36}
                  />
                }
                title={service.name}
                subtitle={service.stateDetail ?? undefined}
                trailing={
                  <Badge tone={serviceTone(service)} dot>
                    {serviceStateLabel(service)}
                  </Badge>
                }
              />
            ))}
          </List>
        )}
      </div>
    </Section>
  );
}
