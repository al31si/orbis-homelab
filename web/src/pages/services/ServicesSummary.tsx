import type { ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { StatusDot } from '@/ui/Badge';
import { monitoringCounts } from './catalog';
import styles from './services.module.css';

/** One sentence with the lamp of the worst state: "3 services of 22 have a problem". */
export function ServicesSummary({ services }: { services: readonly ServiceView[] }) {
  const t = useT();
  const counts = monitoringCounts(services);
  const problems = counts.monitored - counts.online;
  const tone =
    counts.monitored === 0
      ? 'neutral'
      : problems === 0
        ? 'ok'
        : services.some((service) => service.monitored && service.state === 'down')
          ? 'crit'
          : 'warn';

  return (
    <span className={styles.summary} data-problems={problems > 0 || undefined}>
      <StatusDot tone={tone} />
      {t('services.summary', { ...counts, problems })}
    </span>
  );
}
