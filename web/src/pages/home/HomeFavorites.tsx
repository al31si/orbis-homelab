import type { ServiceView } from '@shared/api';
import { resolveServiceUrl } from '@/lib/links';
import { usePrefs } from '@/lib/prefs';
import { AppLink } from '@/ui/AppLink';
import { Section } from '@/ui/Section';
import { ServiceIcon } from '@/ui/ServiceIcon';
import styles from './home.module.css';

/** One-tap launcher for the favorite services (opens the service UI, or its detail page). */
export function HomeFavorites({ services }: { services: readonly ServiceView[] }) {
  const { favorites } = usePrefs();
  const items = favorites
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is ServiceView => service !== undefined);

  return (
    <Section title="Preferiti">
      {items.length === 0 ? (
        <p className={styles.hint}>Aggiungi i servizi che usi di più dalla pagina Servizi.</p>
      ) : (
        <ul className={styles.favorites}>
          {items.map((service) => {
            const url = resolveServiceUrl(service.url);
            return (
              <li key={service.id}>
                <AppLink
                  href={url ?? `/services/${encodeURIComponent(service.id)}`}
                  className={styles.favorite}
                  aria-label={url ? `Apri ${service.name}` : `Dettagli di ${service.name}`}
                >
                  <ServiceIcon name={service.icon} size={56} />
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
