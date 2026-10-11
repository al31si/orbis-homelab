import { useState } from 'react';
import { useApp } from '@/boot';
import { useRefreshAll, useSession } from '@/data';
import { t } from '@/i18n';
import { applyServiceWorkerUpdate, useServiceWorkerUpdate } from '@/pwa/register';
import { useClientInfo } from '@/pwa/useClientInfo';
import { Icon } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { Section } from '@/ui/Section';
import { useToast } from '@/ui/Toast';
import { accessSummary } from './about';
import styles from './more.module.css';

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
      <div className={styles.stack}>
        <List aria-label={t('more.about.listLabel', { name })}>
          <ListRow
            title={t('more.about.appVersion')}
            trailing={<code className={styles.mono}>{appVersion}</code>}
          />
          <ListRow
            title={t('more.about.serverVersion')}
            trailing={<code className={styles.mono}>{session?.version ?? '—'}</code>}
          />
          <ListRow
            title={t('more.about.access')}
            multiline
            subtitle={access?.details.join(' · ')}
            trailing={access?.label ?? '—'}
          />
          <ListRow
            href="/more/diagnostics"
            leading={<Icon name="wrench" size={20} />}
            title={t('more.about.diagnostics')}
            subtitle={t('more.about.diagnosticsHint')}
          />
        </List>
        <List aria-label={t('more.about.actions')}>
          <ListRow
            leading={<Icon name="refresh" size={20} />}
            title={refreshing ? t('more.about.refreshing') : t('more.about.refreshAll')}
            onClick={refreshing ? undefined : () => void refresh()}
          />
          <ListRow
            leading={<Icon name="download" size={20} />}
            title={t('more.about.reload')}
            subtitle={updateWaiting ? t('more.about.reloadHint') : undefined}
            onClick={reload}
          />
        </List>
      </div>
    </Section>
  );
}
