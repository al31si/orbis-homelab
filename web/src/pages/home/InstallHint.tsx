import { useState } from 'react';
import { useApp } from '@/boot';
import { useSession } from '@/data';
import { t } from '@/i18n';
import type { InstallKind } from '@/pwa/installGuide';
import { useInstall } from '@/pwa/useInstall';
import { Button } from '@/ui/Button';
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

/** The kinds worth a row on the Home page: there is something to do for the visitor right now. */
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
        return t('home.install.prompt');
      case 'ios':
        return (
          <>
            {t('home.install.iosTap')} <strong>{t('home.install.iosShare')}</strong>
            {t('home.install.iosThen')} <strong>{t('home.install.iosAdd')}</strong>.
          </>
        );
      case 'mac-safari':
        return t('home.install.dock');
      case 'chromium-android':
        return t('home.install.android');
      default:
        return guide.secure ? t('home.install.browser') : t('home.install.window');
    }
  })();

  return (
    <aside className={styles.install} aria-label={t('home.install.title', { name: app.name })}>
      <Icon
        name={guide.kind === 'ios' ? 'share' : 'download'}
        size={20}
        className={styles.installIcon}
      />
      <div className={styles.installText}>
        <div className={styles.installBody}>
          <p className={styles.installTitle}>{t('home.install.title', { name: app.name })}</p>
          <p>{body}</p>
        </div>
        <div className={styles.installActions}>
          {guide.kind === 'prompt' ? (
            <Button variant="primary" onClick={() => void install.promptInstall()}>
              {t('home.install.install')}
            </Button>
          ) : (
            <>
              {secureUrl && (
                <Button variant="secondary" href={secureUrl}>
                  {t('home.install.openSecure')}
                </Button>
              )}
              <Button variant={secureUrl ? 'ghost' : 'secondary'} href="/more">
                {t('home.install.howTo')}
              </Button>
            </>
          )}
        </div>
      </div>
      <IconButton icon="close" label={t('home.install.dismiss')} iconSize={18} onClick={dismiss} />
    </aside>
  );
}
