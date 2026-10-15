import type { ServiceView } from '@shared/api';
import { useT } from '@/i18n';
import { SECRETS_HELP_URL } from '@/lib/docs';
import { RichText } from '@/pages/more/RichText';
import { Badge } from '@/ui/Badge';
import { Notice } from '@/ui/Notice';
import { Section } from '@/ui/Section';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { SetupSlot } from '@/ui/SetupSlot';
import { defaultSecretName } from './catalog';
import styles from './detail.module.css';

/** Whether there is anything to show in the integration section. */
export function hasIntegrationContent(service: ServiceView): boolean {
  return service.integration !== null || service.metrics.length > 0 || service.badges.length > 0;
}

/** An integration without its credential: an empty bay with what it adds and how to fill it. */
function NotConfigured({ service }: { service: ServiceView }) {
  const t = useT();
  const id = service.integration?.id ?? '';
  const secret = defaultSecretName(id);
  const name = service.name;
  return (
    <SetupSlot
      leading={
        <ServiceIcon
          name={service.icon}
          iconUrl={service.iconUrl}
          serviceId={service.id}
          integration={id}
          label={name}
        />
      }
      title={t('services.integration.setup.title', { name })}
      benefit={t('services.integration.setup.benefit', { name })}
      steps={[
        id === 'vikunja'
          ? t('services.integration.setup.createToken', { name })
          : t('services.integration.setup.createKey', { name }),
        <RichText
          key="save"
          text={
            secret
              ? t('services.integration.setup.save', { secret })
              : t('services.integration.setup.saveNamed')
          }
        />,
        <RichText key="apply" text={t('services.integration.setup.apply')} />,
      ]}
      help={{ href: SECRETS_HELP_URL, label: t('services.integration.setup.help') }}
    />
  );
}

/** Badges and metrics from the integration adapter, or what is needed to get them. */
export function ServiceIntegration({ service }: { service: ServiceView }) {
  const t = useT();
  const { integration, badges, metrics } = service;
  const bare = badges.length === 0 && metrics.length === 0;

  return (
    <Section
      title={integration ? t('services.integration.title') : t('services.integration.metrics')}
    >
      {integration?.configured === false && <NotConfigured service={service} />}
      {integration?.configured && integration.ok === false && (
        <Notice tone="warn" icon="alert" title={t('services.integration.failing.title')}>
          {integration.error ?? t('services.integration.failing.unknown')}
        </Notice>
      )}
      {integration?.configured && integration.ok !== false && bare && (
        <p className={styles.empty}>{t('services.integration.empty')}</p>
      )}
      {badges.length > 0 && (
        <div className={styles.tags}>
          {badges.map((badge) => (
            <Badge key={badge.label} tone={badge.tone}>
              {badge.label}
            </Badge>
          ))}
        </div>
      )}
      {metrics.length > 0 && (
        <dl className={styles.metrics}>
          {metrics.map((metric) => (
            <div key={metric.label} className={styles.metric}>
              <dt>{metric.label}</dt>
              <dd data-tone={metric.tone}>{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}
