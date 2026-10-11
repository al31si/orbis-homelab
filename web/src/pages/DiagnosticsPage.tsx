import type { ReactNode } from 'react';
import type { Diagnostics } from '@shared/api';
import { useApp, useFeatures } from '@/boot';
import { useSnapshot } from '@/data';
import { t } from '@/i18n';
import { formatDuration, formatRelativeTime } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { useClientInfo } from '@/pwa/useClientInfo';
import { AppLink } from '@/ui/AppLink';
import { Badge, StatusDot } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Icon } from '@/ui/icons';
import { List, ListRow } from '@/ui/List';
import { Page, PageHeader } from '@/ui/Page';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { RichText } from './more/RichText';
import { sourceTone, summarizeSources } from './more/diagnostics';
import styles from './more/diagnostics.module.css';

function Value({ children }: { children: ReactNode }) {
  return <code className={styles.value}>{children}</code>;
}

/** "No" is only worth a warning where the answer should normally be yes. */
function yesNo(value: boolean, warnIfNo: boolean) {
  return value ? (
    <Badge tone="ok">{t('diagnostics.client.yes')}</Badge>
  ) : (
    <Badge tone={warnIfNo ? 'warn' : 'neutral'}>{t('diagnostics.client.no')}</Badge>
  );
}

function ServerSection({ data }: { data: Diagnostics }) {
  const { name } = useApp();
  return (
    <Section title={t('diagnostics.server.title')}>
      <List aria-label={t('diagnostics.server.listLabel', { name })}>
        <ListRow title={t('diagnostics.server.version')} trailing={<Value>{data.version}</Value>} />
        <ListRow
          title={t('diagnostics.server.uptime')}
          trailing={<Value>{formatDuration(data.uptimeSeconds)}</Value>}
        />
        <ListRow
          title={t('diagnostics.server.started')}
          trailing={<RelativeTime value={data.startedAt} className={styles.plain} />}
        />
        <ListRow
          title={t('diagnostics.server.node')}
          trailing={<Value>{data.nodeVersion}</Value>}
        />
      </List>
    </Section>
  );
}

function SourcesSection({ data }: { data: Diagnostics }) {
  const now = useNow(5_000);
  const summary = summarizeSources(data.sources, now);
  return (
    <Section
      title={t('diagnostics.sources.title')}
      action={
        <Badge tone={summary.tone} dot>
          {t('diagnostics.sources.summary', summary)}
        </Badge>
      }
    >
      <Card padding="none">
        <List variant="plain" aria-label={t('diagnostics.sources.title')}>
          {data.sources.map((source) => {
            const tone = sourceTone(source, now);
            return (
              <ListRow
                key={source.id}
                multiline
                leading={
                  <StatusDot
                    tone={tone}
                    label={
                      tone === 'ok'
                        ? t('diagnostics.sources.ok')
                        : tone === 'warn'
                          ? t('diagnostics.sources.late')
                          : t('diagnostics.sources.failing')
                    }
                  />
                }
                title={source.label}
                subtitle={
                  <>
                    <code className={styles.id}>{source.id}</code>
                    <span className={styles.line}>
                      {source.fetchedAt
                        ? t('diagnostics.sources.updated', {
                            when: formatRelativeTime(source.fetchedAt, now),
                            every: formatDuration(source.intervalMs / 1000),
                          })
                        : t('diagnostics.sources.never', {
                            every: formatDuration(source.intervalMs / 1000),
                          })}
                    </span>
                    {source.error && (
                      <span className={styles.error} data-tone="crit">
                        {source.error}
                      </span>
                    )}
                  </>
                }
              />
            );
          })}
        </List>
      </Card>
    </Section>
  );
}

function CatalogSection({ data }: { data: Diagnostics }) {
  const features = useFeatures();
  const unclassified = data.catalog.containersUnclassified;
  return (
    <Section title={t('diagnostics.catalog.title')}>
      <Card padding="none">
        <List variant="plain">
          <ListRow
            title={t('diagnostics.catalog.services')}
            trailing={<Value>{data.catalog.services}</Value>}
          />
          {features.containers && (
            <ListRow
              title={t('diagnostics.catalog.unclassified')}
              trailing={
                unclassified.length === 0 ? (
                  <Badge tone="ok" dot>
                    {t('diagnostics.catalog.none')}
                  </Badge>
                ) : (
                  <Badge tone="neutral">{unclassified.length}</Badge>
                )
              }
            />
          )}
        </List>
        {features.containers && unclassified.length > 0 && (
          <div className={styles.unclassified}>
            <ul className={styles.chips} aria-label={t('diagnostics.catalog.unclassified')}>
              {unclassified.map((name) => (
                <li key={name}>
                  <code className={styles.chip}>{name}</code>
                </li>
              ))}
            </ul>
            <p className={styles.help}>
              <RichText text={t('diagnostics.catalog.help')} />
            </p>
          </div>
        )}
      </Card>
    </Section>
  );
}

function PushSection({ data }: { data: Diagnostics }) {
  return (
    <Section title={t('diagnostics.push.title')}>
      <List aria-label={t('diagnostics.push.listLabel')}>
        <ListRow
          title={t('diagnostics.push.devices')}
          trailing={<Value>{data.push.subscriptions}</Value>}
        />
      </List>
    </Section>
  );
}

function ExtensionsSection({ data }: { data: Diagnostics }) {
  return (
    <Section title={t('diagnostics.extensions.title')}>
      <Card padding="none">
        <List variant="plain" aria-label={t('diagnostics.extensions.title')}>
          {data.extensions.map((extension) => (
            <ListRow
              key={extension.id}
              multiline
              title={<code className={styles.id}>{extension.id}</code>}
              subtitle={
                extension.error ? (
                  <span className={styles.error} data-tone="crit">
                    {extension.error}
                  </span>
                ) : undefined
              }
              trailing={
                extension.loaded ? (
                  <Badge tone="ok" dot>
                    {t('diagnostics.extensions.loaded')}
                  </Badge>
                ) : (
                  <Badge tone="crit" dot>
                    {t('diagnostics.extensions.failed')}
                  </Badge>
                )
              }
            />
          ))}
        </List>
      </Card>
    </Section>
  );
}

function ClientSection() {
  const client = useClientInfo();
  return (
    <Section title={t('diagnostics.client.title')}>
      <List aria-label={t('diagnostics.client.title')}>
        <ListRow
          title={t('diagnostics.client.serviceWorker')}
          trailing={t(`diagnostics.client.sw.${client.serviceWorker}`)}
        />
        {client.buildId && (
          <ListRow
            title={t('diagnostics.client.build')}
            trailing={<Value>{client.buildId}</Value>}
          />
        )}
        <ListRow
          title={t('diagnostics.client.displayMode')}
          trailing={t(`diagnostics.client.display.${client.displayMode}`)}
        />
        <ListRow
          title={t('diagnostics.client.installed')}
          trailing={yesNo(client.standalone, false)}
        />
        <ListRow
          title={t('diagnostics.client.secure')}
          trailing={yesNo(client.secureContext, true)}
        />
        <ListRow title={t('diagnostics.client.online')} trailing={yesNo(client.online, true)} />
      </List>
    </Section>
  );
}

function DiagnosticsSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label={t('diagnostics.loading')}>
      <div className={styles.column}>
        <Skeleton height={190} radius={20} />
        <Skeleton height={330} radius={20} />
      </div>
      <div className={styles.column}>
        <Skeleton height={120} radius={20} />
        <Skeleton height={250} radius={20} />
      </div>
    </div>
  );
}

export default function DiagnosticsPage() {
  const app = useApp();
  const diagnostics = useSnapshot('diagnostics');
  const data = diagnostics.data;

  let body;
  if (data) {
    body = (
      <div className={styles.layout}>
        <div className={styles.column}>
          <ServerSection data={data} />
          <SourcesSection data={data} />
        </div>
        <div className={styles.column}>
          <CatalogSection data={data} />
          {data.push.enabled && <PushSection data={data} />}
          {data.extensions.length > 0 && <ExtensionsSection data={data} />}
          <ClientSection />
        </div>
      </div>
    );
  } else if (diagnostics.status === 'loading') {
    body = <DiagnosticsSkeleton />;
  } else if (diagnostics.status === 'offline') {
    body = (
      <EmptyState
        icon="wifi-off"
        title={t('diagnostics.offline.title', { name: app.name })}
        description={t('diagnostics.offline.description')}
        action={
          <Button icon="refresh" onClick={() => void diagnostics.refresh()}>
            {t('diagnostics.retry')}
          </Button>
        }
      />
    );
  } else {
    body = (
      <ErrorState
        description={diagnostics.error ?? undefined}
        onRetry={() => void diagnostics.refresh()}
      />
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow={
          <AppLink href="/more" className={styles.back}>
            <Icon name="chevron-left" size={16} />
            {t('diagnostics.back')}
          </AppLink>
        }
        title={t('diagnostics.title')}
        subtitle={
          <>
            {t('diagnostics.subtitle', { name: app.name })}
            <UpdatedAt
              fetchedAt={diagnostics.fetchedAt}
              status={diagnostics.status}
              className={styles.updated}
            />
          </>
        }
      />
      {body}
    </Page>
  );
}
