import { useApp } from '@/boot';
import { useSession } from '@/data';
import { t } from '@/i18n';
import { useInstall } from '@/pwa/useInstall';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon, type IconName } from '@/ui/icons';
import { Section } from '@/ui/Section';
import { RichText } from './RichText';
import { SecureAddress } from './SecureAddress';
import { StatusIcon } from './StatusIcon';
import styles from './more.module.css';

interface Row {
  icon: IconName;
  tone: 'ok' | 'warn' | 'neutral';
  title: string;
  text: string;
}

/** Installation status and the one thing to do next on this device. */
export function InstallSection() {
  const install = useInstall();
  const session = useSession();
  const { name } = useApp();

  let row: Row;
  let extra = null;
  if (install.standalone) {
    row = {
      icon: 'check-circle',
      tone: 'ok',
      title: t('more.install.installed.title'),
      text: t('more.install.installed.text', { name }),
    };
  } else if (!install.secureContext) {
    row = {
      icon: 'lock',
      tone: 'warn',
      title: t('more.install.insecure.title'),
      text: t('more.install.insecure.text', { name }),
    };
    extra = session?.secureUrl ? (
      <SecureAddress url={session.secureUrl} />
    ) : (
      <p className={styles.note}>
        <RichText text={t('more.install.noSecureUrl')} />
      </p>
    );
  } else if (install.canPrompt) {
    row = {
      icon: 'download',
      tone: 'neutral',
      title: t('more.install.prompt.title', { name }),
      text: t('more.install.prompt.text'),
    };
    extra = (
      <div className={styles.actions}>
        <Button variant="primary" icon="download" onClick={() => void install.promptInstall()}>
          {t('more.install.prompt.button')}
        </Button>
      </div>
    );
  } else if (install.showIosHint) {
    row = {
      icon: 'share',
      tone: 'neutral',
      title: t('more.install.ios.title'),
      text: t('more.install.ios.text', { name }),
    };
    extra = (
      <ol className={styles.steps}>
        <li>
          <RichText text={t('more.install.ios.step1')} />{' '}
          <Icon name="share" size={16} className={styles.inlineIcon} />{' '}
          {t('more.install.ios.step1After')}
        </li>
        <li>
          <RichText text={t('more.install.ios.step2')} />
        </li>
        <li>
          <RichText text={t('more.install.ios.step3', { name })} />
        </li>
      </ol>
    );
  } else {
    row = {
      icon: 'info',
      tone: 'neutral',
      title: t('more.install.browser.title'),
      text: t('more.install.browser.text'),
    };
  }

  return (
    <Section title={t('more.install.title')}>
      <Card padding="none">
        <div className={styles.row}>
          <StatusIcon icon={row.icon} tone={row.tone} />
          <div className={styles.rowText}>
            <p className={styles.rowTitle}>{row.title}</p>
            <p className={styles.rowSub}>{row.text}</p>
          </div>
        </div>
        {extra && <div className={styles.extra}>{extra}</div>}
      </Card>
    </Section>
  );
}
