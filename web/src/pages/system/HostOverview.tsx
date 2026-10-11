import type { SystemInfo } from '@shared/api';
import { useT } from '@/i18n';
import { formatDuration, formatNumber } from '@/lib/format';
import { Card } from '@/ui/Card';
import { Section } from '@/ui/Section';
import styles from './system.module.css';

export function HostOverview({ host }: { host: SystemInfo['host'] }) {
  const t = useT();
  const facts = [
    { id: 'host', label: t('system.host.host'), value: host.hostname },
    { id: 'uptime', label: t('system.host.uptime'), value: formatDuration(host.uptimeSeconds) },
    { id: 'os', label: t('system.host.os'), value: host.os },
    { id: 'kernel', label: t('system.host.kernel'), value: host.kernel },
    { id: 'cores', label: t('system.host.cores'), value: formatNumber(host.cores) },
  ];
  return (
    <Section title={t('system.host.title')} className={styles.hostCell}>
      <Card>
        <dl className={styles.facts}>
          {facts.map((fact) => (
            <div key={fact.id} className={styles.fact}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </Section>
  );
}
