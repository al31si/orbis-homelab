import { useState } from 'react';
import { useApp } from '@/boot';
import { useRefreshAll, useSession } from '@/data';
import { t } from '@/i18n';
import { applyServiceWorkerUpdate, useServiceWorkerUpdate } from '@/pwa/register';
import { useClientInfo } from '@/pwa/useClientInfo';
import { Icon } from '@/ui/icons';
import { Section } from '@/ui/Section';
import { useToast } from '@/ui/Toast';
import { accessSummary } from './about';
import { Fact, Facts, Lit, Row, Rows } from './rows';

export function AboutSection() {
  const { name } = useApp();
  const session = useSession();
  const client = useClientInfo();
  const updateWaiting = useServiceWorkerUpdate();
  const refreshAll = useRefreshAll();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast.show({
      id: 'refresh-all',
      message: t('more.about.refreshed'),
      tone: 'ok',
      duration: 2500,
    });
  }

  function reload() {
    if (updateWaiting) applyServiceWorkerUpdate();
    else window.location.reload();
  }

  const appVersion = import.meta.env.PROD
    ? (client.buildId ?? t('more.about.appVersionUnavailable'))
    : t('more.about.appVersionDevelopment');
  const access = session ? accessSummary(session) : null;

  return (
    <Section title={t('more.about.title')}>
      <Facts label={t('more.about.listLabel', { name })}>
        <Fact label={t('more.about.appVersion')} mono>
          {appVersion}
        </Fact>
        <Fact label={t('more.about.serverVersion')} mono>
          {session?.version ?? '—'}
        </Fact>
        <Fact label={t('more.about.access')} details={access?.details}>
          {access && session ? (
            <Lit tone={session.access === 'full' ? 'ok' : 'warn'}>{access.label}</Lit>
          ) : (
            '—'
          )}
        </Fact>
      </Facts>
      <Rows ruled label={t('more.about.actions')}>
        <Row
          href="/more/diagnostics"
          title={t('more.about.diagnostics')}
          help={t('more.about.diagnosticsHint')}
        />
        <Row
          title={refreshing ? t('more.about.refreshing') : t('more.about.refreshAll')}
          onClick={refreshing ? undefined : () => void refresh()}
          action={<Icon name="refresh" size={16} />}
        />
        <Row
          title={t('more.about.reload')}
          help={updateWaiting ? t('more.about.reloadHint') : undefined}
          onClick={reload}
          action={<Icon name="download" size={16} />}
        />
      </Rows>
    </Section>
  );
}
