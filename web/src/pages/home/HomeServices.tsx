import type { Overview, ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { ProgressBar } from '@/ui/ProgressBar';
import { Section } from '@/ui/Section';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { serviceStateLabel, serviceTone } from '@/pages/services/catalog';
import { summarizeServices } from './summary';
import styles from './home.module.css';

export interface HomeServicesProps {
  summary: Overview['services'];
  problemServiceIds: readonly string[];
  /** Full catalog, used to name the services that are not up. */
  services: readonly ServiceView[] | null;
}

/** "17 of 18 online" plus the services that need a look; only monitored services count. */
export function HomeServices({ summary, problemServiceIds, services }: HomeServicesProps) {
  const t = useT();
  const { monitored, up, unmonitored, allUp } = summarizeServices(summary);
  const problems = problemServiceIds
    .map((id) => services?.find((service) => service.id === id))
    .filter((service): service is ServiceView => service !== undefined && service.monitored);

  return (
    <Section
      title={t('home.services.title')}
      action={
        <Button href="/services" variant="ghost" size="sm">
          {t('home.services.all')}
        </Button>
      }
    >
      <Card padding="none">
        <div className={styles.servicesHead}>
          <div className={styles.servicesCount}>
            <span className={styles.servicesNumber}>
              {monitored > 0
                ? t('home.services.online', { up, monitored })
                : t('home.services.noneMonitored', { total: summary.total })}
            </span>
            {allUp && (
              <span className={styles.servicesOk}>
                <Icon name="check-circle" size={18} />
                {t('home.services.allUp')}
              </span>
            )}
          </div>
          {monitored > 0 && (
            <ProgressBar
              value={up}
              max={monitored}
              tone={allUp ? 'ok' : summary.down > 0 ? 'crit' : 'warn'}
              label={t('home.services.progress')}
              size="sm"
            />
          )}
          {monitored > 0 && unmonitored > 0 && (
            <span className={styles.servicesNote}>
              {t('home.services.unmonitored', { n: unmonitored })}
            </span>
          )}
        </div>
        {problems.length > 0 && (
          <div className={styles.problems}>
            <List variant="plain" aria-label={t('home.services.problems')}>
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
                  subtitle={service.stateDetail ?? undefined}
                  trailing={
                    <Badge tone={serviceTone(service)} dot>
                      {serviceStateLabel(service)}
                    </Badge>
                  }
                />
              ))}
            </List>
          </div>
        )}
      </Card>
    </Section>
  );
}
