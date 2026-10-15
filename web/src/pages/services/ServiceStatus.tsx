import type { ReactNode } from 'react';
import type { ServiceView } from '@shared/api';
import type { SnapshotStatus } from '@/data';
import { useApp } from '@/boot';
import { useT } from '@/i18n';
import { PLACEHOLDER, formatLatency } from '@/lib/format';
import { localizeUptime } from '@/pages/system/derive';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { categoryLabel } from './catalog';
import styles from './detail.module.css';

export interface ServiceStatusProps {
  service: ServiceView;
  fetchedAt: number | null;
  status: SnapshotStatus;
}

function Fact({
  label,
  tone,
  wide,
  muted,
  children,
}: {
  label: string;
  tone?: 'crit';
  wide?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.fact} data-wide={wide || undefined}>
      <dt>{label}</dt>
      <dd data-tone={tone} data-muted={muted || undefined}>
        {children}
      </dd>
    </div>
  );
}

/** The result of the last HTTP probe and how long the service has been up, as a row of readouts. */
export function ServiceStatus({ service, fetchedAt, status }: ServiceStatusProps) {
  const t = useT();
  const { categories } = useApp();
  const { probe } = service;
  const category = categoryLabel(service.category, categories);

  return (
    <Section
      title={t('services.status.title')}
      action={<UpdatedAt fetchedAt={fetchedAt} status={status} className={styles.updated} />}
    >
      <dl className={styles.facts}>
        {probe ? (
          <>
            <Fact label={t('services.status.http')} tone={probe.ok ? undefined : 'crit'}>
              {probe.httpStatus ??
                (probe.ok ? t('services.status.ok') : t('services.status.noResponse'))}
            </Fact>
            <Fact label={t('services.status.latency')}>{formatLatency(probe.latencyMs)}</Fact>
            <Fact label={t('services.status.lastCheck')}>
              <RelativeTime value={probe.checkedAt} />
            </Fact>
          </>
        ) : (
          <Fact label={t('services.status.httpCheck')} muted>
            {t('services.status.notConfigured')}
          </Fact>
        )}
        <Fact label={t('services.status.uptime')}>
          {service.uptime ? localizeUptime(service.uptime) : PLACEHOLDER}
        </Fact>
        {category && <Fact label={t('services.status.category')}>{category}</Fact>}
        {probe?.error && (
          <Fact label={t('services.status.error')} tone="crit" wide>
            {probe.error}
          </Fact>
        )}
      </dl>
    </Section>
  );
}
