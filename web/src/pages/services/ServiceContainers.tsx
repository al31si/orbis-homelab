import type { ServiceView } from '@shared/api';
import { useSnapshot } from '@/data';
import { useT } from '@/i18n';
import { formatBytes, formatPercent } from '@/lib/format';
import { toneForContainerState } from '@/lib/tone';
import { localizeUptime } from '@/pages/system/derive';
import { StatusDot } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { List, ListRow } from '@/ui/List';
import { Section } from '@/ui/Section';
import { containerRows, containerStateLabel, shortContainerNames } from './catalog';
import styles from './detail.module.css';

/**
 * Every container of the service, anomalies first, with state, CPU, memory and uptime. Mount it
 * only when `features.containers` is on: it subscribes to the containers snapshot for uptimes.
 */
export function ServiceContainers({ service }: { service: ServiceView }) {
  const t = useT();
  const docker = useSnapshot('containers').data;
  const rows = containerRows(service, docker);
  const names = shortContainerNames(rows.map((row) => row.name));

  return (
    <Section
      title={t('services.containers.title')}
      action={rows.length > 0 && <span className={styles.count}>{rows.length}</span>}
    >
      <Card padding="none">
        {rows.length === 0 ? (
          <p className={styles.empty}>{t('services.containers.none')}</p>
        ) : (
          <>
            {rows.length > 1 && (
              <p className={styles.containersTotal}>
                <span>
                  {t('services.containers.cpu')}{' '}
                  <strong>{formatPercent(service.cpuPercent, 1)}</strong>
                </span>
                <span>
                  {t('services.containers.memory')}{' '}
                  <strong>{formatBytes(service.memoryBytes)}</strong>
                </span>
              </p>
            )}
            <List variant="plain" aria-label={t('services.containers.list')}>
              {rows.map((row, index) => (
                <ListRow
                  key={row.name}
                  leading={<StatusDot tone={toneForContainerState(row.state)} />}
                  title={<span title={row.name}>{names[index]}</span>}
                  subtitle={
                    <>
                      <span data-tone={toneForContainerState(row.state)} className={styles.cState}>
                        {containerStateLabel(row.state)}
                      </span>
                      {row.uptime && ` · ${localizeUptime(row.uptime)}`}
                    </>
                  }
                  trailing={
                    <span className={styles.numbers}>
                      <span>{formatPercent(row.cpuPercent, 1)}</span>
                      <span>{formatBytes(row.memoryBytes)}</span>
                    </span>
                  }
                />
              ))}
            </List>
          </>
        )}
      </Card>
    </Section>
  );
}
