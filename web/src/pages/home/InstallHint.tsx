import { useState } from 'react';
import { useApp } from '@/boot';
import { useSession } from '@/data';
import { t } from '@/i18n';
import type { InstallKind } from '@/pwa/installGuide';
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

/** The kinds worth a card on the Home page: there is something to do for the visitor right now. */
const HINTED: readonly InstallKind[] = [
  'prompt',
  'ios',
  'mac-safari',
  'chromium-desktop',
  'chromium-android',
];

/**
 * Dismissible "install the app" hint. It only appears when the visitor can actually act on it:
 * the browser's own install dialog, or the steps for their browser (the Installation settings
 * explain them). Nothing shows when installed, and nothing is offered that the browser cannot do.
 */
export function InstallHint() {
  const install = useInstall();
  const session = useSession();
  const app = useApp();
  const [dismissed, setDismissed] = useState(() => wasDismissed(app.id));

  const { guide } = install;
  const secureUrl = install.secureContext ? null : (session?.secureUrl ?? null);
  if (dismissed || install.standalone || !HINTED.includes(guide.kind)) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(dismissedKey(app.id), '1');
    } catch {
      /* the hint simply returns next launch */
    }
  }

  const body = (() => {
    switch (guide.kind) {
      case 'prompt':
        return <p>{t('home.install.prompt')}</p>;
      case 'ios':
        return (
          <p>
            {t('home.install.iosTap')} <strong>{t('home.install.iosShare')}</strong>
            {t('home.install.iosThen')} <strong>{t('home.install.iosAdd')}</strong>.
          </p>
        );
      case 'mac-safari':
        return <p>{t('home.install.dock')}</p>;
      case 'chromium-android':
        return <p>{t('home.install.android')}</p>;
      default:
        return <p>{guide.secure ? t('home.install.browser') : t('home.install.window')}</p>;
    }
  })();

  return (
    <Card className={styles.install}>
      <span className={styles.installIcon}>
        <Icon name={guide.kind === 'ios' ? 'share' : 'download'} size={22} />
      </span>
      <div className={styles.installText}>
        <p className={styles.installTitle}>{t('home.install.title', { name: app.name })}</p>
        {body}
        {guide.kind === 'prompt' ? (
          <Button variant="primary" size="sm" onClick={() => void install.promptInstall()}>
            {t('home.install.install')}
          </Button>
        ) : (
          <>
            {secureUrl && (
              <Button variant="secondary" size="sm" href={secureUrl}>
                {t('home.install.openSecure')}
              </Button>
            )}
            <Button variant={secureUrl ? 'ghost' : 'secondary'} size="sm" href="/more">
              {t('home.install.howTo')}
            </Button>
          </>
        )}
      </div>
      <IconButton icon="close" label={t('home.install.dismiss')} iconSize={18} onClick={dismiss} />
    </Card>
  );
}
