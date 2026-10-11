import { useState } from 'react';
import { useApp } from '@/boot';
import { useSession } from '@/data';
import { t } from '@/i18n';
import { useInstall } from '@/pwa/useInstall';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { IconButton } from '@/ui/IconButton';
import styles from './home.module.css';

const dismissedKey = (appId: string): string => `${appId}.installHint.dismissed`;

function wasDismissed(appId: string): boolean {
  try {
    return localStorage.getItem(dismissedKey(appId)) === '1';
  } catch {
    return false;
  }
}

/** Dismissible "install the app" hint: Chromium prompt, iOS instructions, or the HTTPS address. */
export function InstallHint() {
  const install = useInstall();
  const session = useSession();
  const app = useApp();
  const [dismissed, setDismissed] = useState(() => wasDismissed(app.id));

  const needsHttps = !install.secureContext && session?.secureUrl != null;
  if (
    dismissed ||
    install.standalone ||
    !(install.canPrompt || install.showIosHint || needsHttps)
  ) {
    return null;
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(dismissedKey(app.id), '1');
    } catch {
      /* the hint simply returns next launch */
    }
  }

  return (
    <Card className={styles.install}>
      <span className={styles.installIcon}>
        <Icon name={install.showIosHint ? 'share' : 'download'} size={22} />
      </span>
      <div className={styles.installText}>
        <p className={styles.installTitle}>{t('home.install.title', { name: app.name })}</p>
        {install.canPrompt && <p>{t('home.install.prompt')}</p>}
        {!install.canPrompt && install.showIosHint && (
          <p>
            {t('home.install.iosTap')} <strong>{t('home.install.iosShare')}</strong>
            {t('home.install.iosThen')} <strong>{t('home.install.iosAdd')}</strong>.
          </p>
        )}
        {!install.canPrompt && !install.showIosHint && needsHttps && (
          <p>{t('home.install.needsHttps')}</p>
        )}
        {install.canPrompt && (
          <Button variant="primary" size="sm" onClick={() => void install.promptInstall()}>
            {t('home.install.install')}
          </Button>
        )}
        {!install.canPrompt && needsHttps && session?.secureUrl && (
          <Button variant="secondary" size="sm" href={session.secureUrl}>
            {t('home.install.openSecure')}
          </Button>
        )}
      </div>
      <IconButton icon="close" label={t('home.install.dismiss')} iconSize={18} onClick={dismiss} />
    </Card>
  );
}
