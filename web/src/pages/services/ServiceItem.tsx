import type { ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import { resolveServiceUrl } from '@/lib/links';
import { toggleFavorite } from '@/lib/prefs';
import { AppLink } from '@/ui/AppLink';
import { Badge, StatusDot } from '@/ui/Badge';
import { IconButton, IconLink } from '@/ui/IconButton';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { keyMetricHint, serviceStateLabel, serviceTone } from './catalog';
import styles from './services.module.css';

export interface ServiceItemProps {
  service: ServiceView;
  favorite: boolean;
}

/**
 * One launcher entry: the whole tile opens the detail page, the star and the launch button
 * sit on top of it (44px targets). A row on compact screens, a tile from 700px.
 */
export function ServiceItem({ service, favorite }: ServiceItemProps) {
  const t = useT();
  const url = resolveServiceUrl(service.url);
  const hint = keyMetricHint(service) ?? (url === null ? t('services.item.noUi') : null);
  const tone = serviceTone(service);

  return (
    <li className={cx(styles.item, url === null && styles.noUi)}>
      <AppLink href={`/services/${encodeURIComponent(service.id)}`} className={styles.body}>
        <ServiceIcon
          name={service.icon}
          iconUrl={service.iconUrl}
          label={service.name}
          size={44}
          className={styles.icon}
        />
        <span className={styles.text}>
          <span className={styles.name}>{service.name}</span>
          <span className={styles.description}>{service.description}</span>
          <span className={styles.meta}>
            <span
              className={styles.state}
              data-tone={tone}
              data-up={!service.monitored || service.state === 'up' || undefined}
            >
              <StatusDot tone={tone} />
              {serviceStateLabel(service)}
            </span>
            {hint && <span className={styles.hint}>· {hint}</span>}
            {service.badges.map((badge) => (
              <Badge key={badge.label} tone={badge.tone}>
                {badge.label}
              </Badge>
            ))}
          </span>
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
            label={t('services.item.open', { name: service.name })}
          />
        )}
      </div>
    </li>
  );
}
