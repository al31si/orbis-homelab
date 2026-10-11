import type { PlaybackInfo } from '../../../shared/api.js';
import { Collector } from '../lib/collector.js';
import { getJson } from '../lib/http.js';
import type { Integration, IntegrationContext } from './types.js';

interface JellyfinSession {
  UserName?: string;
  DeviceName?: string;
  NowPlayingItem?: { Name?: string; SeriesName?: string };
  PlayState?: { IsPaused?: boolean };
  TranscodingInfo?: unknown;
}

export function toPlayback(
  sessions: JellyfinSession[],
  unknownUser: string,
): Omit<PlaybackInfo, 'restricted'> {
  const playing = sessions.filter((s) => s.NowPlayingItem);
  return {
    activeCount: playing.length,
    sessions: playing.map((s) => ({
      user: s.UserName ?? unknownUser,
      title: [s.NowPlayingItem?.SeriesName, s.NowPlayingItem?.Name].filter(Boolean).join(' - '),
      device: s.DeviceName ?? '',
      paused: Boolean(s.PlayState?.IsPaused),
      transcoding: Boolean(s.TranscodingInfo),
    })),
  };
}

export type JellyfinData = Omit<PlaybackInfo, 'restricted'> & { version: string | null };

async function collect(ctx: IntegrationContext): Promise<JellyfinData> {
  const [sessions, info] = await Promise.all([
    getJson<JellyfinSession[]>(`${ctx.baseUrl}/Sessions`, {
      headers: { 'X-Emby-Token': ctx.secret ?? '' },
    }),
    getJson<{ Version?: string }>(`${ctx.baseUrl}/System/Info/Public`).catch(
      () => ({}) as { Version?: string },
    ),
  ]);
  return {
    ...toPlayback(sessions, ctx.t('integrations.jellyfinUnknownUser')),
    version: info.Version ?? null,
  };
}

export function createJellyfin(ctx: IntegrationContext): Integration<JellyfinData> {
  const { t } = ctx;
  const configured = Boolean(ctx.secret);
  return {
    serviceId: ctx.serviceId,
    type: 'jellyfin',
    label: ctx.serviceName,
    configured,
    collector: configured
      ? new Collector<JellyfinData>({
          id: `integration:${ctx.serviceId}`,
          label: ctx.serviceName,
          intervalMs: 20_000,
          run: () => collect(ctx),
        })
      : null,
    describe: (d) => ({
      badges:
        d.activeCount > 0
          ? [{ tone: 'ok', label: t('integrations.jellyfinPlaying', { count: d.activeCount }) }]
          : [],
      metrics: [
        { label: t('integrations.jellyfinActive'), value: String(d.activeCount) },
        ...(d.version ? [{ label: t('integrations.metricVersion'), value: d.version }] : []),
      ],
    }),
    alerts: () => [],
  };
}
