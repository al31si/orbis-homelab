import type { MediaQueueInfo } from '../../../shared/api.js';
import { Collector } from '../lib/collector.js';
import { getJson } from '../lib/http.js';
import type { Integration, IntegrationContext } from './types.js';

export type ArrApp = MediaQueueInfo['apps'][number];

interface ArrHealth {
  source?: string;
  type?: string;
  message?: string;
}

const API_VERSION = { radarr: 'v3', sonarr: 'v3', lidarr: 'v1', prowlarr: 'v1' } as const;
export type ArrType = keyof typeof API_VERSION;

export const ARR_TYPES = Object.keys(API_VERSION) as ArrType[];

const HEALTH_TYPES = ['ok', 'notice', 'warning', 'error'] as const;

export function parseUpdate(health: ArrHealth[]): string | null {
  for (const h of health) {
    const m = /update is available:\s*v?([\w.]+)/i.exec(h.message ?? '');
    if (m) return m[1] ?? null;
  }
  return null;
}

async function collect(type: ArrType, ctx: IntegrationContext): Promise<ArrApp> {
  const base = `${ctx.baseUrl}/api/${API_VERSION[type]}`;
  const headers = { 'X-Api-Key': ctx.secret ?? '' };
  const [status, health, queue] = await Promise.all([
    getJson<{ version?: string }>(`${base}/system/status`, { headers }),
    getJson<ArrHealth[]>(`${base}/health`, { headers }),
    // Prowlarr has no download queue.
    type === 'prowlarr'
      ? Promise.resolve(null)
      : getJson<{ totalCount?: number; warnings?: boolean; errors?: boolean }>(
          `${base}/queue/status`,
          { headers },
        ),
  ]);
  return {
    id: ctx.serviceId,
    name: ctx.serviceName,
    version: status.version ?? null,
    queueCount: queue?.totalCount ?? 0,
    queueWarnings: Boolean(queue?.warnings),
    queueErrors: Boolean(queue?.errors),
    health: health
      .filter((h) => h.source !== 'UpdateCheck' && !/update is available/i.test(h.message ?? ''))
      .map((h) => ({
        type: (HEALTH_TYPES as readonly string[]).includes(h.type ?? '')
          ? (h.type as ArrApp['health'][number]['type'])
          : 'warning',
        message: h.message ?? '',
      })),
    updateAvailable: parseUpdate(health),
  };
}

export function createArr(type: ArrType, ctx: IntegrationContext): Integration<ArrApp> {
  const { t } = ctx;
  const configured = Boolean(ctx.secret);
  return {
    serviceId: ctx.serviceId,
    type,
    label: ctx.serviceName,
    configured,
    collector: configured
      ? new Collector<ArrApp>({
          id: `integration:${ctx.serviceId}`,
          label: ctx.serviceName,
          intervalMs: 60_000,
          run: () => collect(type, ctx),
        })
      : null,
    describe: (app) => ({
      badges: [
        ...(app.updateAvailable
          ? [
              {
                tone: 'neutral' as const,
                label: t('integrations.arrUpdate', { version: app.updateAvailable }),
              },
            ]
          : []),
        ...(app.health.some((h) => h.type === 'error')
          ? [{ tone: 'crit' as const, label: t('integrations.arrError') }]
          : app.health.some((h) => h.type === 'warning')
            ? [{ tone: 'warn' as const, label: t('integrations.arrWarning') }]
            : []),
        ...(app.queueErrors
          ? [{ tone: 'crit' as const, label: t('integrations.arrQueueErrors') }]
          : app.queueWarnings
            ? [{ tone: 'warn' as const, label: t('integrations.arrQueueWarnings') }]
            : []),
      ],
      metrics: [
        ...(app.version ? [{ label: t('integrations.metricVersion'), value: app.version }] : []),
        ...(type === 'prowlarr'
          ? []
          : [{ label: t('integrations.arrQueued'), value: String(app.queueCount) }]),
      ],
    }),
    alerts: (app) => [
      ...app.health
        .filter((h) => h.type === 'error')
        .map((h) => ({
          key: 'health',
          severity: 'warning' as const,
          title: t('integrations.arrHealthTitle', { name: ctx.serviceName }),
          detail: h.message,
        })),
      ...(app.queueErrors
        ? [
            {
              key: 'queue-errors',
              severity: 'warning' as const,
              title: t('integrations.arrQueueTitle', { name: ctx.serviceName }),
              detail: t('integrations.arrQueueDetail', { count: app.queueCount }),
            },
          ]
        : []),
    ],
  };
}
