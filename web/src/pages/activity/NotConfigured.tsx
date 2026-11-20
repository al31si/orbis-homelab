import { t } from '@/i18n';
import { SECRETS_HELP_URL } from '@/lib/docs';
import { Section } from '@/ui/Section';
import { ServiceIcon } from '@/ui/ServiceIcon';
import { SetupSlot } from '@/ui/SetupSlot';
import { RichText } from '../more/RichText';
import { type MissingIntegration } from './derive';
import styles from './activity.module.css';

export interface NotConfiguredProps {
  /** Section title. */
  title: string;
  /** Declared integrations that lack credentials; nothing is shown when there are none. */
  missing: readonly MissingIntegration[];
  /** What the section will show once the integration works (full sentence). */
  benefit: string;
  /** Kind of credential to create: "an API key". */
  credential: string;
}

/** An integration that is declared but has no credential yet: what it adds, and how to connect it. */
export function NotConfigured({ title, missing, benefit, credential }: NotConfiguredProps) {
  if (missing.length === 0) return null;
  return (
    <Section title={title}>
      <div className={styles.slots}>
        {missing.map((entry) => (
          <SetupSlot
            key={entry.id}
            leading={<ServiceIcon name={entry.id} label={entry.label} integration={entry.id} />}
            title={t('activity.setup.title', { name: entry.label })}
            benefit={benefit}
            steps={[
              t('activity.setup.create', { name: entry.label, credential }),
              <RichText key="save" text={t('activity.setup.save', { secret: entry.secret })} />,
              <RichText key="apply" text={t('activity.setup.apply')} />,
            ]}
            help={{ href: SECRETS_HELP_URL, label: t('activity.setup.help') }}
          />
        ))}
      </div>
    </Section>
  );
}
