import type { ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { resolveServiceUrl } from '@/lib/links';
import { usePrefs } from '@/lib/prefs';
import { AppLink } from '@/ui/AppLink';
import { Button } from '@/ui/Button';
import { Section } from '@/ui/Section';
import { ServiceIcon } from '@/ui/ServiceIcon';
import styles from './home.module.css';

/** One-tap launcher for the favorite services (opens the service UI, or its detail page). */
export function HomeFavorites({ services }: { services: readonly ServiceView[] }) {
  const t = useT();
  const { favorites } = usePrefs();
  const items = favorites
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is ServiceView => service !== undefined);

  return (
    <Section title={t('home.favorites.title')}>
      {items.length === 0 ? (
        <div className={styles.bay}>
          <div className={styles.bayTiles} aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <p className={styles.bayText}>{t('home.favorites.empty')}</p>
          <Button href="/services" variant="secondary">
            {t('home.favorites.choose')}
          </Button>
        </div>
      ) : (
        <ul className={styles.favorites}>
          {items.map((service) => {
            const url = resolveServiceUrl(service.url);
            return (
              <li key={service.id}>
                <AppLink
                  href={url ?? `/services/${encodeURIComponent(service.id)}`}
                  className={styles.favorite}
                  aria-label={
                    url
                      ? t('home.favorites.open', { name: service.name })
                      : t('home.favorites.details', { name: service.name })
                  }
                >
                  <ServiceIcon
                    name={service.icon}
                    iconUrl={service.iconUrl}
                    label={service.name}
                    serviceId={service.id}
                    integration={service.integration?.id}
                    size={56}
                  />
                  <span className={styles.favoriteName}>{service.name}</span>
                </AppLink>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
