import type { SnapshotStatus } from '@/data';
import type { ServiceView } from '@shared/api';
import { useApp, useFeatures } from '@/boot';
import { useT } from '@/i18n';
import { resolveServiceUrl } from '@/lib/links';
import { toggleFavorite, usePrefs } from '@/lib/prefs';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { PageHeader } from '@/ui/Page';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { categoryLabel } from './catalog';
import { ServiceContainers } from './ServiceContainers';
import { ServiceEvents } from './ServiceEvents';
import { ServiceIntegration, hasIntegrationContent } from './ServiceIntegration';
import { ServiceStatusCard } from './ServiceStatusCard';
import { useCopyAddress } from './useCopyAddress';
import styles from './detail.module.css';

export interface ServiceDetailProps {
  service: ServiceView;
  fetchedAt: number | null;
  status: SnapshotStatus;
}

/** Identity, quick actions, then state, integration, events and containers. */
export function ServiceDetail({ service, fetchedAt, status }: ServiceDetailProps) {
  const t = useT();
  const { categories } = useApp();
  const features = useFeatures();
  const { favorites } = usePrefs();
  const copyAddress = useCopyAddress();
  const url = resolveServiceUrl(service.url);
  const favorite = favorites.includes(service.id);

  return (
    <>
      <div className={styles.identity}>
        <ServiceIcon
          name={service.icon}
          iconUrl={service.iconUrl}
          label={service.name}
          size={64}
          className={styles.identityIcon}
        />
        <div className={styles.identityText}>
          <PageHeader
            eyebrow={categoryLabel(service.category, categories) ?? undefined}
            title={service.name}
            subtitle={service.description}
            actions={
              <IconButton
                icon="star"
                variant="soft"
                filled={favorite}
                data-active={favorite || undefined}
                className={styles.star}
                label={t(
                  favorite ? 'services.detail.favoriteRemove' : 'services.detail.favoriteAdd',
                )}
                onClick={() => toggleFavorite(service.id)}
              />
            }
          />
        </div>
      </div>

      {url !== null ? (
        <div className={styles.launch}>
          <div className={styles.buttons}>
            <Button href={url} variant="primary" icon="external-link">
              {t('services.detail.open')}
            </Button>
            <Button variant="secondary" icon="copy" onClick={() => void copyAddress(service)}>
              {t('services.detail.copy')}
            </Button>
          </div>
          <p className={styles.address}>{url}</p>
        </div>
      ) : (
        <p className={styles.noUi}>{t('services.detail.noUi')}</p>
      )}

      <div className={styles.layout} data-single={!features.containers || undefined}>
        <div className={styles.column}>
          <ServiceStatusCard service={service} fetchedAt={fetchedAt} status={status} />
          {hasIntegrationContent(service) && <ServiceIntegration service={service} />}
          {features.activity && <ServiceEvents serviceId={service.id} />}
        </div>
        {features.containers && (
          <div className={styles.column}>
            <ServiceContainers service={service} />
          </div>
        )}
      </div>
    </>
  );
}
