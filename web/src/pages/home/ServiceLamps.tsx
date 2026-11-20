import type { Overview, ServiceState, ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { serviceStateLabel } from '@/pages/services/catalog';
import styles from './home.module.css';

type LampState = ServiceState | 'unmonitored';

interface Lamp {
  key: string;
  /** Null when only the counts are known (the catalog has not arrived yet). */
  name: string | null;
  state: LampState;
}

/** Worst first, so what needs a look is the first thing in the matrix. */
const RANK: Record<LampState, number> = { down: 0, degraded: 1, unknown: 2, up: 3, unmonitored: 4 };

function lampsFromServices(services: readonly ServiceView[]): Lamp[] {
  return services
    .map<Lamp>((service) => ({
      key: service.id,
      name: service.name,
      state: service.monitored ? service.state : 'unmonitored',
    }))
    .sort((a, b) => RANK[a.state] - RANK[b.state]);
}

function lampsFromCounts(summary: Overview['services']): Lamp[] {
  const counts: [LampState, number][] = [
    ['down', summary.down],
    ['degraded', summary.degraded],
    ['unknown', summary.unknown],
    ['up', summary.up],
    ['unmonitored', summary.unmonitored],
  ];
  return counts.flatMap(([state, count]) =>
    Array.from({ length: count }, (_, index) => ({ key: `${state}-${index}`, name: null, state })),
  );
}

export interface ServiceLampsProps {
  summary: Overview['services'];
  /** Full catalog; without it the matrix is drawn from the counts alone. */
  services: readonly ServiceView[] | null;
}

/**
 * One square lamp per service, lit by its state. The services that are not up come first, are
 * ringed and carry a mark, so they stand out without relying on colour alone. Every lamp names
 * its service for hover and for screen readers.
 */
export function ServiceLamps({ summary, services }: ServiceLampsProps) {
  const t = useT();
  const lamps = services ? lampsFromServices(services) : lampsFromCounts(summary);
  if (lamps.length === 0) return null;
  return (
    <ul className={styles.lamps} aria-label={t('home.services.lamps')}>
      {lamps.map((lamp) => {
        const label = serviceStateLabel({
          state: lamp.state === 'unmonitored' ? 'unknown' : lamp.state,
          monitored: lamp.state !== 'unmonitored',
        });
        const text = lamp.name ? `${lamp.name}: ${label}` : label;
        return (
          <li key={lamp.key} className={styles.lamp} data-state={lamp.state} title={text}>
            <span className="sr-only">{text}</span>
          </li>
        );
      })}
    </ul>
  );
}
