import type { SnapshotStatus } from '@/data';
import type { ServiceView } from '@shared/api';
import { useFeatures } from '@/boot';
import { useT } from '@/i18n';
import { resolveServiceUrl } from '@/lib/links';
import { toggleFavorite, usePrefs } from '@/lib/prefs';
import { StatusDot } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { PageHeader } from '@/ui/Page';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { serviceStateLabel, serviceTone } from './catalog';
import { ServiceContainers } from './ServiceContainers';
import { ServiceEvents } from './ServiceEvents';
import { ServiceIntegration, hasIntegrationContent } from './ServiceIntegration';
import { ServiceStatus } from './ServiceStatus';
import { useCopyAddress } from './useCopyAddress';
import styles from './detail.module.css';

export interface ServiceDetailProps {
  service: ServiceView;
  fetchedAt: number | null;
  status: SnapshotStatus;
}

/** Identity and state first, then the probe, the integration, the containers and the events. */
export function ServiceDetail({ service, fetchedAt, status }: ServiceDetailProps) {
  const t = useT();
  const features = useFeatures();
  const { favorites } = usePrefs();
  const copyAddress = useCopyAddress();
  const url = resolveServiceUrl(service.url);
  const favorite = favorites.includes(service.id);
  const tone = serviceTone(service);
  const detail =
    service.stateDetail ?? (service.monitored ? null : t('services.status.unmonitoredDetail'));

  const integration = hasIntegrationContent(service) && <ServiceIntegration service={service} />;
  const events = features.activity && <ServiceEvents serviceId={service.id} />;

  return (
    <>
      <div className={styles.identity}>
        <ServiceIcon
          name={service.icon}
          iconUrl={service.iconUrl}
          serviceId={service.id}
          integration={service.integration?.id}
          label={service.name}
          size={72}
          className={styles.identityIcon}
        />
        <div className={styles.identityText}>
          <PageHeader title={service.name} subtitle={service.description} />
          <p className={styles.state} data-tone={tone}>
            <StatusDot tone={tone} className={styles.lamp} />
            {serviceStateLabel(service)}
          </p>
          {detail && <p className={styles.stateDetail}>{detail}</p>}
        </div>
        <IconButton
          icon="star"
          filled={favorite}
          data-active={favorite || undefined}
          className={styles.star}
          label={t(favorite ? 'services.detail.favoriteRemove' : 'services.detail.favoriteAdd')}
          onClick={() => toggleFavorite(service.id)}
        />
        <div className={styles.actions}>
          {url !== null ? (
            <>
              <Button href={url} variant="primary" icon="external-link" className={styles.open}>
                {t('services.detail.open')}
              </Button>
              <Button
                variant="secondary"
                icon="copy"
                className={styles.copy}
                onClick={() => void copyAddress(service)}
              >
                {t('services.detail.copy')}
              </Button>
            </>
          ) : (
            <p className={styles.noUi}>{t('services.detail.noUi')}</p>
          )}
        </div>
        {url !== null && <p className={styles.address}>{url}</p>}
      </div>

      <div className={styles.layout} data-single={!features.containers || undefined}>
        <div className={styles.column}>
          <ServiceStatus service={service} fetchedAt={fetchedAt} status={status} />
          {integration}
          {!features.containers && events}
        </div>
        {features.containers && (
          <div className={styles.column}>
            <ServiceContainers service={service} />
            {events}
          </div>
        )}
      </div>
    </>
  );
}
