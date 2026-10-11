import type { DownloadsInfo } from '../../../shared/api.js';
import { Collector } from '../lib/collector.js';
import { getJson, httpRequest } from '../lib/http.js';
import type { Integration, IntegrationContext } from './types.js';

interface Transfer {
  connection_status?: string;
  dl_info_speed?: number;
  up_info_speed?: number;
}
interface Torrent {
  state?: string;
  dlspeed?: number;
  upspeed?: number;
}

const DOWNLOADING = new Set([
  'downloading',
  'forcedDL',
  'metaDL',
  'forcedMetaDL',
  'stalledDL',
  'queuedDL',
  'allocating',
  'checkingDL',
]);
const SEEDING = new Set(['uploading', 'forcedUP', 'stalledUP', 'queuedUP', 'checkingUP']);
const PAUSED = new Set(['pausedDL', 'pausedUP', 'stoppedDL', 'stoppedUP']);
const ERRORED = new Set(['error', 'missingFiles']);

export function summarize(transfer: Transfer, torrents: Torrent[]): Omit<DownloadsInfo, 'version'> {
  const count = (set: Set<string>) => torrents.filter((t) => set.has(t.state ?? '')).length;
  return {
    connected: transfer.connection_status === 'connected',
    downloadBytesPerSec: transfer.dl_info_speed ?? 0,
    uploadBytesPerSec: transfer.up_info_speed ?? 0,
    active: torrents.filter((t) => (t.dlspeed ?? 0) > 0 || (t.upspeed ?? 0) > 0).length,
    downloading: count(DOWNLOADING),
    seeding: count(SEEDING),
    paused: count(PAUSED),
    errored: count(ERRORED),
  };
}

async function collect(ctx: IntegrationContext): Promise<DownloadsInfo> {
  const opts = {
    headers: { Authorization: `Bearer ${ctx.secret ?? ''}` },
    maxBytes: 8 * 1024 * 1024,
  };
  const [transfer, torrents, version] = await Promise.all([
    getJson<Transfer>(`${ctx.baseUrl}/api/v2/transfer/info`, opts),
    getJson<Torrent[]>(`${ctx.baseUrl}/api/v2/torrents/info`, opts),
    httpRequest(`${ctx.baseUrl}/api/v2/app/version`, opts)
      .then((r) => (r.status === 200 ? r.body.trim() : null))
      .catch(() => null),
  ]);
  return { version, ...summarize(transfer, torrents) };
}

const speed = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB/s`
    : `${Math.round(bytes / 1024)} kB/s`;

export function createQbittorrent(ctx: IntegrationContext): Integration<DownloadsInfo> {
  const { t } = ctx;
  const configured = Boolean(ctx.secret);
  return {
    serviceId: ctx.serviceId,
    type: 'qbittorrent',
    label: ctx.serviceName,
    configured,
    collector: configured
      ? new Collector<DownloadsInfo>({
          id: `integration:${ctx.serviceId}`,
          label: ctx.serviceName,
          intervalMs: 15_000,
          run: () => collect(ctx),
        })
      : null,
    describe: (d) => ({
      badges: [
        ...(d.connected
          ? []
          : [{ tone: 'warn' as const, label: t('integrations.qbitDisconnected') }]),
        ...(d.errored > 0
          ? [{ tone: 'warn' as const, label: t('integrations.qbitErrored', { count: d.errored }) }]
          : []),
      ],
      metrics: [
        { label: t('integrations.qbitDownload'), value: speed(d.downloadBytesPerSec) },
        { label: t('integrations.qbitUpload'), value: speed(d.uploadBytesPerSec) },
        { label: t('integrations.qbitDownloading'), value: String(d.downloading) },
        { label: t('integrations.qbitSeeding'), value: String(d.seeding) },
      ],
    }),
    alerts: (d) =>
      d.connected
        ? []
        : [
            {
              key: 'disconnected',
              severity: 'warning',
              title: t('integrations.qbitAlertTitle'),
              detail: t('integrations.qbitAlertDetail'),
            },
          ],
  };
}
