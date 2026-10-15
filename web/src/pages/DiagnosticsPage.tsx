import type { Diagnostics } from '@shared/api';
import { useApp, useFeatures } from '@/boot';
import { useSnapshot } from '@/data';
import { t } from '@/i18n';
import { formatDuration, formatRelativeTime } from '@/lib/format';
import type { UiTone } from '@/lib/tone';
import { useNow } from '@/lib/useNow';
import { useClientInfo, type ServiceWorkerStatus } from '@/pwa/useClientInfo';
import { AppLink } from '@/ui/AppLink';
import { Badge, StatusDot } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Icon } from '@/ui/icons';
import { Page, PageHeader } from '@/ui/Page';
import { ProgressBar } from '@/ui/ProgressBar';
import { RelativeTime } from '@/ui/RelativeTime';
import { Section } from '@/ui/Section';
import { Skeleton } from '@/ui/Skeleton';
import { UpdatedAt } from '@/ui/UpdatedAt';
import { RichText } from './more/RichText';
import { Fact, Facts, Lit, Row, Rows } from './more/rows';
import { sourceTone, summarizeSources } from './more/diagnostics';
import styles from './more/diagnostics.module.css';

/** "No" is only worth a warning where the answer should normally be yes. */
function YesNo({ value, warnIfNo }: { value: boolean; warnIfNo: boolean }) {
  return (
    <Lit tone={value ? 'ok' : warnIfNo ? 'warn' : 'neutral'}>
      {value ? t('diagnostics.client.yes') : t('diagnostics.client.no')}
    </Lit>
  );
}

const SERVICE_WORKER_TONE: Record<ServiceWorkerStatus, UiTone> = {
  unsupported: 'warn',
  insecure: 'warn',
  development: 'neutral',
  none: 'neutral',
  failed: 'warn',
  installing: 'neutral',
  waiting: 'ok',
  active: 'ok',
};

function ServerSection({ data }: { data: Diagnostics }) {
  const { name } = useApp();
  return (
    <Section title={t('diagnostics.server.title')}>
      <Facts label={t('diagnostics.server.listLabel', { name })}>
        <Fact label={t('diagnostics.server.version')} mono>
          {data.version}
        </Fact>
        <Fact label={t('diagnostics.server.uptime')}>{formatDuration(data.uptimeSeconds)}</Fact>
        <Fact label={t('diagnostics.server.started')}>
          <RelativeTime value={data.startedAt} />
        </Fact>
        <Fact label={t('diagnostics.server.node')} mono>
          {data.nodeVersion}
        </Fact>
      </Facts>
    </Section>
  );
}

/** The primary object: how many sources answer on time, one LED per source, then each source. */
function SourcesSection({ data }: { data: Diagnostics }) {
  const now = useNow(5_000);
  const summary = summarizeSources(data.sources, now);
  return (
    <Section title={t('diagnostics.sources.title')}>
      <Card className={styles.summary}>
        <p className={styles.figure}>
          <span className={styles.figureValue}>{summary.healthy}</span>
          <span className={styles.figureUnit}>{t('diagnostics.sources.of', summary)}</span>
        </p>
        <ProgressBar
          value={summary.healthy}
          max={Math.max(1, summary.total)}
          cells={Math.max(1, summary.total)}
          tone={summary.tone}
          label={t('diagnostics.sources.summary', summary)}
        />
      </Card>
      <ul className={styles.sources} aria-label={t('diagnostics.sources.title')}>
        {data.sources.map((source) => {
          const tone = sourceTone(source, now);
          const state =
            tone === 'ok'
              ? t('diagnostics.sources.ok')
              : tone === 'warn'
                ? t('diagnostics.sources.late')
                : t('diagnostics.sources.failing');
          const every = t('diagnostics.sources.every', {
            every: formatDuration(source.intervalMs / 1000),
          });
          return (
            <li key={source.id} className={styles.source}>
              <StatusDot tone={tone} label={state} className={styles.sourceLamp} />
              <div className={styles.sourceBody}>
                <div className={styles.sourceLine}>
                  <span className={styles.sourceName}>
                    {source.label}
                    {tone !== 'ok' && <Badge tone={tone}>{state}</Badge>}
                  </span>
                  <span className={styles.sourceMeta}>
                    {source.fetchedAt
                      ? t('diagnostics.sources.updated', {
                          when: formatRelativeTime(source.fetchedAt, now),
                        })
                      : t('diagnostics.sources.never')}
                  </span>
                </div>
                <div className={styles.sourceLine}>
                  <code className={styles.id}>{source.id}</code>
                  <span className={styles.sourceMeta}>{every}</span>
                </div>
                {source.error && (
                  <span className={styles.error} data-tone="crit">
                    {source.error}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function CatalogSection({ data }: { data: Diagnostics }) {
  const features = useFeatures();
  const unclassified = data.catalog.containersUnclassified;
  return (
    <Section title={t('diagnostics.catalog.title')}>
      <Facts label={t('diagnostics.catalog.title')}>
        <Fact label={t('diagnostics.catalog.services')}>{data.catalog.services}</Fact>
        {features.containers && (
          <Fact label={t('diagnostics.catalog.unclassified')}>
            {unclassified.length === 0 ? (
              <Lit tone="ok">{t('diagnostics.catalog.none')}</Lit>
            ) : (
              unclassified.length
            )}
          </Fact>
        )}
      </Facts>
      {features.containers && unclassified.length > 0 && (
        <div className={styles.unclassified}>
          <ul className={styles.tags} aria-label={t('diagnostics.catalog.unclassified')}>
            {unclassified.map((name) => (
              <li key={name}>
                <code className={styles.tag}>{name}</code>
              </li>
            ))}
          </ul>
          <p className={styles.help}>
            <RichText text={t('diagnostics.catalog.help')} />
          </p>
        </div>
      )}
    </Section>
  );
}

function PushSection({ data }: { data: Diagnostics }) {
  return (
    <Section title={t('diagnostics.push.title')}>
      <Facts label={t('diagnostics.push.listLabel')}>
        <Fact label={t('diagnostics.push.devices')}>{data.push.subscriptions}</Fact>
      </Facts>
    </Section>
  );
}

function ExtensionsSection({ data }: { data: Diagnostics }) {
  return (
    <Section title={t('diagnostics.extensions.title')}>
      <Rows label={t('diagnostics.extensions.title')}>
        {data.extensions.map((extension) => {
          const state = extension.loaded
            ? t('diagnostics.extensions.loaded')
            : t('diagnostics.extensions.failed');
          return (
            <Row
              key={extension.id}
              lamp={{ tone: extension.loaded ? 'ok' : 'crit', label: state }}
              title={<code className={styles.idInline}>{extension.id}</code>}
              help={
                extension.error ? (
                  <span className={styles.error} data-tone="crit">
                    {extension.error}
                  </span>
                ) : undefined
              }
              trailing={state}
            />
          );
        })}
      </Rows>
    </Section>
  );
}

function ClientSection() {
  const client = useClientInfo();
  return (
    <Section title={t('diagnostics.client.title')}>
      <Facts label={t('diagnostics.client.title')}>
        <Fact label={t('diagnostics.client.serviceWorker')}>
          <Lit tone={SERVICE_WORKER_TONE[client.serviceWorker]}>
            {t(`diagnostics.client.sw.${client.serviceWorker}`)}
          </Lit>
        </Fact>
        {client.buildId && (
          <Fact label={t('diagnostics.client.build')} mono>
            {client.buildId}
          </Fact>
        )}
        <Fact label={t('diagnostics.client.displayMode')}>
          {t(`diagnostics.client.display.${client.displayMode}`)}
        </Fact>
        <Fact label={t('diagnostics.client.installed')}>
          <YesNo value={client.standalone} warnIfNo={false} />
        </Fact>
        <Fact label={t('diagnostics.client.secure')}>
          <YesNo value={client.secureContext} warnIfNo />
        </Fact>
        <Fact label={t('diagnostics.client.online')}>
          <YesNo value={client.online} warnIfNo />
        </Fact>
      </Facts>
    </Section>
  );
}

function DiagnosticsSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true" aria-label={t('diagnostics.loading')}>
      <div className={styles.column}>
        <Skeleton height={96} radius={10} />
        <Skeleton height={330} radius={10} />
      </div>
      <div className={styles.column}>
        <Skeleton height={190} radius={10} />
        <Skeleton height={250} radius={10} />
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
          <SourcesSection data={data} />
        </div>
        <div className={styles.column}>
          <ServerSection data={data} />
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
