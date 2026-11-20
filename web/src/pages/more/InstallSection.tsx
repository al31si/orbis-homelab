import { useMemo, useState, type ReactNode } from 'react';
import { useApp } from '@/boot';
import { useSession } from '@/data';
import { t } from '@/i18n';
import { HTTPS_GUIDE_URL, HTTPS_OPTION_URL } from '@/lib/docs';
import {
  deriveCapabilities,
  deriveInstallGuide,
  suggestHttpsOptions,
  type Capability,
  type InstallGuide,
  type InstallKind,
} from '@/pwa/installGuide';
import type { PushState } from '@/pwa/push';
import { useClientInfo } from '@/pwa/useClientInfo';
import { useInstall } from '@/pwa/useInstall';
import { Badge, StatusDot } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Icon } from '@/ui/icons';
import { Section } from '@/ui/Section';
import { RichText } from './RichText';
import { Row, Rows } from './rows';
import { SecureAddress } from './SecureAddress';
import styles from './more.module.css';

/** How many ways to a secure address the page lists; the guide has the rest. */
const HTTPS_OPTIONS_SHOWN = 3;

type GuidedKind = Exclude<InstallKind, 'installed' | 'installed-elsewhere' | 'prompt'>;

function guidedTitle(kind: GuidedKind, name: string): string {
  switch (kind) {
    case 'chromium-desktop':
      return t('more.install.kind.chromium-desktop.title', { name });
    case 'chromium-android':
      return t('more.install.kind.chromium-android.title');
    case 'ios':
      return t('more.install.kind.ios.title');
    case 'mac-safari':
      return t('more.install.kind.mac-safari.title');
    case 'firefox-desktop':
      return t('more.install.kind.firefox-desktop.title');
    case 'firefox-android':
      return t('more.install.kind.firefox-android.title');
    case 'in-app-browser':
      return t('more.install.kind.in-app-browser.title');
    case 'generic':
      return t('more.install.kind.generic.title');
  }
}

/** One sentence about what following the steps gives; kinds with nothing to install say why. */
function guidedText(guide: InstallGuide, kind: GuidedKind, name: string): string {
  switch (kind) {
    case 'firefox-desktop':
      return t('more.install.none.firefox-desktop');
    case 'in-app-browser':
      return t('more.install.none.in-app-browser');
    case 'generic':
      return t('more.install.none.generic');
    default:
      return guide.result === 'app'
        ? t('more.install.result.app', { name })
        : guide.result === 'window'
          ? t('more.install.result.window', { name })
          : t('more.install.result.shortcut');
  }
}

/** Numbered steps and a closing note for the kinds that have a path to follow. */
function guidedSteps(
  guide: InstallGuide,
  kind: GuidedKind,
  name: string,
): { steps: ReactNode[]; note: string | null } {
  const mode = guide.secure ? 'secure' : 'insecure';
  switch (kind) {
    case 'chromium-desktop': {
      const family =
        guide.browser === 'chrome' || guide.browser === 'chromium'
          ? 'chrome'
          : guide.browser === 'edge'
            ? 'edge'
            : guide.browser === 'brave'
              ? 'brave'
              : 'other';
      return {
        steps: [
          <RichText key="a" text={t(`more.install.step.chromium.${family}.${mode}`)} />,
          <RichText key="b" text={t('more.install.step.chromium.confirm', { name })} />,
        ],
        note: t(`more.install.note.chromium-desktop.${mode}`),
      };
    }
    case 'chromium-android':
      return {
        steps: [
          <RichText key="a" text={t(`more.install.step.android.${mode}`)} />,
          <RichText key="b" text={t('more.install.step.android.confirm', { name })} />,
        ],
        note: t(`more.install.note.chromium-android.${mode}`),
      };
    case 'ios':
      return {
        steps: [
          <span key="a">
            <RichText text={t('more.install.ios.step1')} />{' '}
            <Icon name="share" size={16} className={styles.inlineIcon} />{' '}
            {t('more.install.ios.step1After')}
          </span>,
          <RichText key="b" text={t('more.install.ios.step2')} />,
          <RichText key="c" text={t('more.install.ios.step3', { name })} />,
        ],
        note: t(`more.install.note.ios.${mode}`),
      };
    case 'mac-safari':
      return {
        steps: [
          <RichText key="a" text={t('more.install.step.mac.menu')} />,
          <RichText key="b" text={t('more.install.step.mac.confirm', { name })} />,
        ],
        note: t('more.install.note.mac'),
      };
    case 'firefox-android':
      return {
        steps: [<RichText key="a" text={t('more.install.step.firefox-android')} />],
        note: t('more.install.note.firefox-android'),
      };
    default:
      return { steps: [], note: null };
  }
}

function CapabilityRow({ capability }: { capability: Capability }) {
  const text = (() => {
    switch (capability.id) {
      case 'installs-as':
        return t(`more.install.cap.installs.${capability.reason}`);
      case 'offline':
        return t(`more.install.cap.offline.${capability.reason}`);
      case 'notifications':
        return t(`more.install.cap.notifications.${capability.reason}`);
    }
  })();
  const title = (() => {
    switch (capability.id) {
      case 'installs-as':
        return t('more.install.cap.installs.title');
      case 'offline':
        return t('more.install.cap.offline.title');
      case 'notifications':
        return t('more.install.cap.notifications.title');
    }
  })();
  return (
    <Row
      split
      lamp={{ tone: capability.tone, label: t(`more.install.cap.lamp.${capability.tone}`) }}
      title={title}
      help={<RichText text={text} />}
    />
  );
}

/**
 * Over plain HTTP: why a secure address is worth it and the routes to one, the most fitting first
 * for the address this page was opened from. Each route opens its own section of the guide.
 */
function HttpsHelp() {
  const options = suggestHttpsOptions(window.location.hostname).slice(0, HTTPS_OPTIONS_SHOWN);
  return (
    <Section title={t('more.install.https.title')}>
      <div className={styles.lead}>
        <p className={styles.leadTitle}>{t('more.install.https.heading')}</p>
        <p className={styles.note}>{t('more.install.https.text')}</p>
      </div>
      <Rows ruled label={t('more.install.https.title')}>
        {options.map((option, index) => (
          <Row
            key={option}
            split
            href={HTTPS_OPTION_URL[option]}
            title={t(`more.install.https.opt.${option}.title`)}
            help={t(`more.install.https.opt.${option}.desc`)}
            trailing={index === 0 ? <Badge>{t('more.install.https.fit')}</Badge> : undefined}
          />
        ))}
      </Rows>
      <div className={styles.actions}>
        <Button variant="primary" icon="external-link" href={HTTPS_GUIDE_URL}>
          {t('more.install.https.guide')}
        </Button>
      </div>
    </Section>
  );
}

/** The one object of the page: is the app installed, and if not, what to do next. */
function Plate({
  installed,
  title,
  text,
  children,
}: {
  installed: boolean;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <Card className={styles.plate}>
      <div className={styles.plateHead}>
        <StatusDot
          tone={installed ? 'ok' : 'neutral'}
          label={installed ? t('more.install.lamp.installed') : t('more.install.lamp.pending')}
          className={styles.plateLamp}
        />
        <div className={styles.plateText}>
          <h3 className={styles.plateTitle}>{title}</h3>
          <p className={styles.plateSub}>
            <RichText text={text} />
          </p>
        </div>
      </div>
      {children}
    </Card>
  );
}

/**
 * Installation status and the one thing to do next on this device, then what works on this
 * address and, over plain HTTP, how to get an address that unlocks the rest. Every statement
 * follows from the browser and the address, never from what would be nice to offer.
 */
export function InstallSection({ push }: { push: PushState | null }) {
  const install = useInstall();
  const client = useClientInfo();
  const session = useSession();
  const { name } = useApp();
  const [showSteps, setShowSteps] = useState(false);
  const { guide } = install;

  // The steps a not-yet-installed device would follow, also shown on demand after "installed".
  const stepsGuide = useMemo(
    () =>
      deriveInstallGuide({
        browser: install.browser,
        secureContext: install.secureContext,
        standalone: false,
        installedHere: false,
        canPrompt: install.canPrompt,
      }),
    [install.browser, install.secureContext, install.canPrompt],
  );
  const capabilities = deriveCapabilities({
    guide,
    serviceWorker: client.serviceWorker,
    push,
  });
  const secureUrl = install.secureContext ? null : (session?.secureUrl ?? null);

  let title: string;
  let text: string;
  let installed = false;
  let body: ReactNode = null;

  if (guide.kind === 'installed') {
    title = t('more.install.installed.title');
    text = t('more.install.installed.text', { name });
    installed = true;
  } else if (guide.kind === 'prompt') {
    title = t('more.install.prompt.title', { name });
    text = t('more.install.prompt.text');
    body = (
      <div className={styles.actions}>
        <Button variant="primary" icon="download" onClick={() => void install.promptInstall()}>
          {t('more.install.prompt.button')}
        </Button>
      </div>
    );
  } else {
    const installedElsewhere = guide.kind === 'installed-elsewhere' && !showSteps;
    const shown = guide.kind === 'installed-elsewhere' ? stepsGuide : guide;
    const kind = shown.kind === 'installed' || shown.kind === 'prompt' ? 'generic' : shown.kind;
    if (installedElsewhere) {
      title = t('more.install.elsewhere.title');
      text = t('more.install.elsewhere.text', { name });
      installed = true;
      body = (
        <div className={styles.actions}>
          <Button onClick={() => setShowSteps(true)}>{t('more.install.elsewhere.show')}</Button>
        </div>
      );
    } else {
      const guided = guidedSteps(shown, kind as GuidedKind, name);
      title = guidedTitle(kind as GuidedKind, name);
      text = guidedText(shown, kind as GuidedKind, name);
      const hasBlocks = secureUrl || guided.steps.length > 0;
      body = (
        <>
          {hasBlocks && (
            <div className={styles.blocks}>
              {secureUrl && (
                <div className={styles.block}>
                  <p className={styles.blockTitle}>{t('more.install.https.recommended')}</p>
                  <p className={styles.note}>{t('more.install.https.secureUrl.text', { name })}</p>
                  <SecureAddress url={secureUrl} />
                </div>
              )}
              {guided.steps.length > 0 && (
                <div className={styles.block}>
                  {secureUrl && (
                    <p className={styles.blockTitle}>{t('more.install.https.orHere')}</p>
                  )}
                  <ol className={styles.steps}>
                    {guided.steps.map((step, index) => (
                      <li key={index}>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
          {guided.note && <p className={styles.note}>{guided.note}</p>}
        </>
      );
    }
  }

  return (
    <>
      <Section title={t('more.install.title')}>
        <Plate installed={installed} title={title} text={text}>
          {body}
        </Plate>
      </Section>

      <Section title={t('more.install.here.title')}>
        <Rows label={t('more.install.here.title')}>
          {capabilities.map((capability) => (
            <CapabilityRow key={capability.id} capability={capability} />
          ))}
        </Rows>
      </Section>

      {!install.secureContext && !secureUrl && <HttpsHelp />}
    </>
  );
}
