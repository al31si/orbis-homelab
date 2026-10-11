import type { ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { PLACEHOLDER, formatLatency } from '@/lib/format';
import { localizeUptime } from '@/pages/system/derive';
import type { SnapshotStatus } from '@/data';
import { Card } from '@/ui/Card';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { serviceStateLabel, serviceTone } from './catalog';
import styles from './detail.module.css';

export interface ServiceStatusCardProps {
  service: ServiceView;
  fetchedAt: number | null;
  status: SnapshotStatus;
}

/** Live state, why, and the result of the last HTTP probe. */
export function ServiceStatusCard({ service, fetchedAt, status }: ServiceStatusCardProps) {
  const t = useT();
  const { probe } = service;
  const tone = serviceTone(service);
  const detail =
    service.stateDetail ?? (service.monitored ? null : t('services.status.unmonitoredDetail'));

  return (
    <Section title={t('services.status.title')}>
      <Card padding="none">
        <div className={styles.status} data-tone={tone}>
          <p className={styles.statusWord}>{serviceStateLabel(service)}</p>
          {detail && <p className={styles.statusDetail}>{detail}</p>}
        </div>
        {probe ? (
          <dl className={styles.kv}>
            <div className={styles.kvRow}>
              <dt>{t('services.status.http')}</dt>
              <dd data-tone={probe.ok ? undefined : 'crit'}>
                {probe.httpStatus ??
                  (probe.ok ? t('services.status.ok') : t('services.status.noResponse'))}
              </dd>
            </div>
            <div className={styles.kvRow}>
              <dt>{t('services.status.latency')}</dt>
              <dd>{formatLatency(probe.latencyMs)}</dd>
            </div>
            <div className={styles.kvRow}>
              <dt>{t('services.status.lastCheck')}</dt>
              <dd>
                <RelativeTime value={probe.checkedAt} />
              </dd>
            </div>
            {service.uptime && (
              <div className={styles.kvRow}>
                <dt>{t('services.status.uptime')}</dt>
                <dd>{localizeUptime(service.uptime)}</dd>
              </div>
            )}
            {probe.error && (
              <div className={styles.kvRow}>
                <dt>{t('services.status.error')}</dt>
                <dd data-tone="crit">{probe.error}</dd>
              </div>
            )}
          </dl>
        ) : (
          <dl className={styles.kv}>
            <div className={styles.kvRow}>
              <dt>{t('services.status.httpCheck')}</dt>
              <dd className={styles.muted}>{t('services.status.notConfigured')}</dd>
            </div>
            <div className={styles.kvRow}>
              <dt>{t('services.status.uptime')}</dt>
              <dd>{service.uptime ? localizeUptime(service.uptime) : PLACEHOLDER}</dd>
            </div>
          </dl>
        )}
        <div className={styles.cardFooter}>
          <UpdatedAt fetchedAt={fetchedAt} status={status} />
        </div>
      </Card>
    </Section>
  );
}
