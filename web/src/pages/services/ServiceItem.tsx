import type { ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { resolveServiceUrl } from '@/lib/links';
import { toggleFavorite } from '@/lib/prefs';
import { AppLink } from '@/ui/AppLink';
import { Badge, StatusDot } from '@/ui/Badge';
import { IconButton, IconLink } from '@/ui/IconButton';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { keyMetricHint, needsAttention, serviceStateLabel, serviceTone } from './catalog';
import styles from './services.module.css';

export interface ServiceItemProps {
  service: ServiceView;
  favorite: boolean;
}

/**
 * One row of the catalog. The whole row opens the detail page; the star and the launch link sit
 * beside it (44px targets). A service that is not up shows why instead of its description and
 * carries a lamp bar on its edge, so problems are found by looking down the left side.
 */
export function ServiceItem({ service, favorite }: ServiceItemProps) {
  const t = useT();
  const url = resolveServiceUrl(service.url);
  const hint = keyMetricHint(service) ?? (url === null ? t('services.item.noUi') : null);
  const problem = needsAttention(service);
  const description = problem ? (service.stateDetail ?? service.description) : service.description;
  const tone = serviceTone(service);

  return (
    <li
      className={styles.item}
      data-tone={tone}
      data-problem={problem || undefined}
      data-no-ui={url === null || undefined}
    >
      <AppLink href={`/services/${encodeURIComponent(service.id)}`} className={styles.body}>
        <ServiceIcon
          name={service.icon}
          iconUrl={service.iconUrl}
          serviceId={service.id}
          integration={service.integration?.id}
          label={service.name}
          size={44}
          className={styles.icon}
        />
        <span className={styles.name}>{service.name}</span>
        <span className={styles.description}>{description}</span>
        <span className={styles.meta}>
          <span className={styles.state}>
            <StatusDot tone={tone} />
            {serviceStateLabel(service)}
          </span>
          {(hint || service.badges.length > 0) && (
            <span className={styles.facts}>
              {hint && <span className={styles.hint}>{hint}</span>}
              {service.badges.map((badge) => (
                <Badge key={badge.label} tone={badge.tone}>
                  {badge.label}
                </Badge>
              ))}
            </span>
          )}
        </span>
      </AppLink>
      <div className={styles.actions}>
        <IconButton
          icon="star"
          iconSize={20}
          filled={favorite}
          data-active={favorite || undefined}
          className={styles.star}
          label={t(favorite ? 'services.item.favoriteRemove' : 'services.item.favoriteAdd', {
            name: service.name,
          })}
          onClick={() => toggleFavorite(service.id)}
        />
        {url !== null && (
          <IconLink
            icon="external-link"
            iconSize={20}
            href={url}
            className={styles.open}
            label={t('services.item.open', { name: service.name })}
          />
        )}
      </div>
    </li>
  );
}
