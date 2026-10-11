import { t } from '@/i18n';
import { Card } from '@/ui/Card';
import { Icon, type IconName } from '@/ui/icons';
import { Section } from '@/ui/Section';
import { RichText } from '../more/RichText';
import { formatNames, type MissingIntegration } from './derive';
import styles from './activity.module.css';

export interface NotConfiguredProps {
  /** Section title. */
  title: string;
  icon: IconName;
  /** Declared integrations that lack credentials; nothing is shown when there are none. */
  missing: readonly MissingIntegration[];
  /** What the section will show once the integration works (full sentence). */
  benefit: string;
  /** Kind of credential: "an API key". */
  credential: string;
}

/** Honest "not configured yet" state that says exactly what is needed to enable it. */
export function NotConfigured({ title, icon, missing, benefit, credential }: NotConfiguredProps) {
  if (missing.length === 0) return null;
  return (
    <Section title={title}>
      <Card className={styles.notConfigured}>
        <span className={styles.notConfiguredIcon}>
          <Icon name={icon} size={20} />
        </span>
        <div className={styles.notConfiguredText}>
          <p className={styles.notConfiguredTitle}>
            {t('activity.notConfigured.title', { names: formatNames(missing.map((m) => m.label)) })}
          </p>
          <p>
            <RichText
              text={t('activity.notConfigured.text', {
                benefit,
                credential,
                secrets: missing.map((entry) => `\`${entry.secret}\``).join(', '),
              })}
            />
          </p>
        </div>
      </Card>
    </Section>
  );
}
