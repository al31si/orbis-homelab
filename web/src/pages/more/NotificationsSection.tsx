import { useApp } from '@/boot';
import { t } from '@/i18n';
import type { PushBlockReason } from '@/pwa/push';
import type { PushController } from '@/pwa/usePush';
import type { UiTone } from '@/lib/tone';
import { PUSH_HELP_URL } from '@/lib/docs';
import { Button } from '@/ui/Button';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { useToast } from '@/ui/Toast';
import { Row, Rows } from './rows';
import styles from './more.module.css';

const BLOCKED_TONE: Record<PushBlockReason, UiTone> = {
  insecure: 'neutral',
  'needs-install': 'neutral',
  unsupported: 'neutral',
  'worker-failed': 'warn',
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
        text: t('more.notifications.insecure.text'),
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
    case 'worker-failed':
      return {
        title: t('more.notifications.workerFailed.title'),
        text: t('more.notifications.workerFailed.text'),
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
      <Button
        variant="primary"
        icon="bell"
        loading={busy === 'enable'}
        onClick={() => void enable()}
      >
        {t('more.notifications.enable')}
      </Button>
    );
  }
  if (state.kind === 'active') {
    return (
      <>
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
      </>
    );
  }
  if (state.kind === 'error') {
    return (
      <Button icon="refresh" onClick={() => void push.reload()}>
        {t('more.notifications.retry')}
      </Button>
    );
  }
  return null;
}

export function NotificationsSection({ push }: { push: PushController }) {
  const { name } = useApp();
  const { state } = push;

  let tone: UiTone = 'neutral';
  let title = '';
  let text = '';

  switch (state.kind) {
    case 'checking':
      break;
    case 'error':
      title = t('more.notifications.error.title');
      text = t('more.notifications.error.text', { name });
      tone = 'warn';
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

  const showDevices =
    push.devices !== null && (state.kind === 'active' || state.kind === 'inactive');
  const hasActions = state.kind === 'inactive' || state.kind === 'active' || state.kind === 'error';
  const hasHelp = state.kind === 'inactive' || state.kind === 'active';

  return (
    <Section title={t('more.notifications.title')}>
      <Rows label={t('more.notifications.title')}>
        {state.kind === 'checking' ? (
          <Row
            title={<Skeleton width="55%" height={16} />}
            help={<Skeleton width="80%" height={13} />}
            lamp={{ tone: 'neutral', label: t('more.notifications.checking') }}
          />
        ) : (
          <Row lamp={{ tone }} title={title} help={text}>
            {hasActions && <Actions push={push} />}
          </Row>
        )}
        {showDevices && (
          <Row
            title={t('more.notifications.devicesLabel')}
            trailing={<span className={styles.figure}>{push.devices}</span>}
          />
        )}
        {hasHelp && <Row href={PUSH_HELP_URL} title={t('more.notifications.help')} />}
      </Rows>
      <p className={styles.note}>{t('more.notifications.note')}</p>
    </Section>
  );
}
