import { useApp } from '@/boot';
import { t } from '@/i18n';
import type { PushBlockReason } from '@/pwa/push';
import { usePush, type PushController } from '@/pwa/usePush';
import type { UiTone } from '@/lib/tone';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import type { IconName } from '@/ui/icons';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { useToast } from '@/ui/Toast';
import { StatusIcon } from './StatusIcon';
import styles from './more.module.css';

const BLOCKED_TONE: Record<PushBlockReason, UiTone> = {
  insecure: 'neutral',
  'needs-install': 'neutral',
  unsupported: 'neutral',
  limited: 'neutral',
  unavailable: 'neutral',
  denied: 'crit',
};

/** Title and explanation of a blocked state, in the instance language. */
function describeBlocked(reason: PushBlockReason, name: string): { title: string; text: string } {
  switch (reason) {
    case 'insecure':
      return {
        title: t('more.notifications.insecure.title'),
        text: t('more.notifications.insecure.text', { name }),
      };
    case 'needs-install':
      return {
        title: t('more.notifications.needsInstall.title'),
        text: t('more.notifications.needsInstall.text', { name }),
      };
    case 'unsupported':
      return {
        title: t('more.notifications.unsupported.title'),
        text: t('more.notifications.unsupported.text'),
      };
    case 'limited':
      return {
        title: t('more.notifications.limited.title'),
        text: t('more.notifications.limited.text'),
      };
    case 'unavailable':
      return {
        title: t('more.notifications.unavailable.title'),
        text: t('more.notifications.unavailable.text'),
      };
    case 'denied':
      return {
        title: t('more.notifications.denied.title'),
        text: t('more.notifications.denied.text', { name }),
      };
  }
}

function Actions({ push }: { push: PushController }) {
  const toast = useToast();
  const { state, busy } = push;

  async function enable() {
    const result = await push.enable();
    toast.show(
      result.ok
        ? { id: 'push', message: t('more.notifications.enabled'), tone: 'ok' }
        : { id: 'push', message: result.message, tone: 'crit', duration: 8000 },
    );
  }

  async function disable() {
    const result = await push.disable();
    toast.show(
      result.ok
        ? { id: 'push', message: t('more.notifications.disabled'), tone: 'info' }
        : { id: 'push', message: result.message, tone: 'crit', duration: 8000 },
    );
  }

  async function test() {
    const result = await push.sendTest();
    if (!result.ok) {
      toast.show({ id: 'push', message: result.message, tone: 'crit', duration: 8000 });
    } else if (result.sent) {
      toast.show({
        id: 'push',
        tone: 'ok',
        message: t('more.notifications.sent', { n: result.sent }),
      });
    } else {
      toast.show({
        id: 'push',
        tone: 'warn',
        message: t('more.notifications.sentNone'),
      });
    }
  }

  if (state.kind === 'inactive') {
    return (
      <div className={styles.actions}>
        <Button
          variant="primary"
          icon="bell"
          loading={busy === 'enable'}
          onClick={() => void enable()}
        >
          {t('more.notifications.enable')}
        </Button>
      </div>
    );
  }
  if (state.kind === 'active') {
    return (
      <div className={styles.actions}>
        <Button
          icon="bell"
          loading={busy === 'test'}
          disabled={busy !== null}
          onClick={() => void test()}
        >
          {t('more.notifications.test')}
        </Button>
        <Button
          variant="ghost"
          loading={busy === 'disable'}
          disabled={busy !== null}
          onClick={() => void disable()}
        >
          {t('more.notifications.disable')}
        </Button>
      </div>
    );
  }
  if (state.kind === 'error') {
    return (
      <div className={styles.actions}>
        <Button icon="refresh" onClick={() => void push.reload()}>
          {t('more.notifications.retry')}
        </Button>
      </div>
    );
  }
  return null;
}

export function NotificationsSection() {
  const push = usePush();
  const { name } = useApp();
  const { state } = push;

  let icon: IconName = 'bell';
  let tone: UiTone = 'neutral';
  let title = t('more.notifications.heading');
  let text = '';

  switch (state.kind) {
    case 'checking':
      break;
    case 'error':
      title = t('more.notifications.error.title');
      text = t('more.notifications.error.text', { name });
      tone = 'warn';
      icon = 'alert';
      break;
    case 'blocked':
      ({ title, text } = describeBlocked(state.reason, name));
      tone = BLOCKED_TONE[state.reason];
      break;
    case 'inactive':
      title = t('more.notifications.inactive.title');
      text = t('more.notifications.inactive.text');
      break;
    case 'active':
      title = t('more.notifications.active.title');
      text = t('more.notifications.active.text');
      tone = 'ok';
      break;
  }

  const devices =
    push.devices !== null && (state.kind === 'active' || state.kind === 'inactive')
      ? t('more.notifications.devices', { n: push.devices })
      : null;

  return (
    <Section title={t('more.notifications.title')}>
      <Card padding="none">
        {state.kind === 'checking' ? (
          <div
            className={styles.row}
            aria-busy="true"
            aria-label={t('more.notifications.checking')}
          >
            <Skeleton width={36} height={36} radius={999} />
            <div className={styles.rowText}>
              <Skeleton width="55%" height={16} />
              <Skeleton width="80%" height={13} />
            </div>
          </div>
        ) : (
          <div className={styles.row}>
            <StatusIcon icon={icon} tone={tone} />
            <div className={styles.rowText}>
              <p className={styles.rowTitle}>{title}</p>
              <p className={styles.rowSub}>{text}</p>
            </div>
          </div>
        )}
        {(state.kind === 'inactive' || state.kind === 'active' || state.kind === 'error') && (
          <div className={styles.extra}>
            <Actions push={push} />
          </div>
        )}
      </Card>
      <p className={styles.note}>
        {t('more.notifications.note')} {devices && <span>{devices}.</span>}
      </p>
    </Section>
  );
}
