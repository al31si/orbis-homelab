import type { ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { Badge } from '@/ui/Badge';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { Section } from '@/ui/Section';
import { defaultSecretName } from './catalog';
import styles from './detail.module.css';

/** Whether there is anything to show in the integration section. */
export function hasIntegrationContent(service: ServiceView): boolean {
  return service.integration !== null || service.metrics.length > 0 || service.badges.length > 0;
}

function NotConfigured({ service }: { service: ServiceView }) {
  const t = useT();
  const secret = defaultSecretName(service.integration?.id ?? '');
  return (
    <div className={styles.note}>
      <span className={styles.noteIcon}>
        <Icon name="info" size={20} />
      </span>
      <div className={styles.noteText}>
        <p className={styles.noteTitle}>{t('services.integration.missing.title')}</p>
        <p>{t('services.integration.missing.body', { name: service.name })}</p>
        {secret && (
          <p>
            {t('services.integration.missing.defaultName')}: <code>{secret}</code> (
            {t('services.integration.missing.override')})
          </p>
        )}
      </div>
    </div>
  );
}

/** Badges and metrics from the integration adapter, or an honest explanation when absent. */
export function ServiceIntegration({ service }: { service: ServiceView }) {
  const t = useT();
  const { integration, badges, metrics } = service;

  return (
    <Section
      title={integration ? t('services.integration.title') : t('services.integration.metrics')}
    >
      <Card padding="none">
        {integration?.configured === false && <NotConfigured service={service} />}
        {integration?.configured && integration.ok === false && (
          <div className={styles.note} data-tone="warn">
            <span className={styles.noteIcon}>
              <Icon name="alert" size={20} />
            </span>
            <div className={styles.noteText}>
              <p className={styles.noteTitle}>{t('services.integration.failing.title')}</p>
              <p>{integration.error ?? t('services.integration.failing.unknown')}</p>
            </div>
          </div>
        )}
        {badges.length > 0 && (
          <div className={styles.badges}>
            {badges.map((badge) => (
              <Badge key={badge.label} tone={badge.tone}>
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
        {metrics.length > 0 && (
          <dl className={styles.kv}>
            {metrics.map((metric) => (
              <div key={metric.label} className={styles.kvRow}>
                <dt>{metric.label}</dt>
                <dd data-tone={metric.tone}>{metric.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </Section>
  );
}
