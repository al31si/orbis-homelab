import type { BuiltinIntegrationType, ServiceDef } from '../config/schema.js';
import type { SecretResolver } from '../config/secrets.js';
import type { T } from '../i18n/index.js';
import { type ArrType, createArr } from './arr.js';
import { createJellyfin } from './jellyfin.js';
import { createQbittorrent } from './qbittorrent.js';
import type { Integration, IntegrationContext } from './types.js';
import { createVikunja } from './vikunja.js';

export type { Integration, IntegrationAlert } from './types.js';

interface Adapter {
  /** Environment variable holding the credential when the service declares no `secret`. */
  defaultSecretEnv: string;
  create: (ctx: IntegrationContext) => Integration;
}

const arr = (type: ArrType, defaultSecretEnv: string): Adapter => ({
  defaultSecretEnv,
  create: (ctx) => createArr(type, ctx) as Integration,
});

/**
 * Built-in adapters. Adding an integration type means: its entry in `INTEGRATION_TYPES`
 * (config/schema.ts), an adapter module, and one line here (the compiler enforces completeness).
 */
const ADAPTERS: Record<BuiltinIntegrationType, Adapter> = {
  radarr: arr('radarr', 'RADARR_API_KEY'),
  sonarr: arr('sonarr', 'SONARR_API_KEY'),
  lidarr: arr('lidarr', 'LIDARR_API_KEY'),
  prowlarr: arr('prowlarr', 'PROWLARR_API_KEY'),
  qbittorrent: {
    defaultSecretEnv: 'QBITTORRENT_API_KEY',
    create: (ctx) => createQbittorrent(ctx) as Integration,
  },
  jellyfin: {
    defaultSecretEnv: 'JELLYFIN_API_KEY',
    create: (ctx) => createJellyfin(ctx) as Integration,
  },
  vikunja: {
    defaultSecretEnv: 'VIKUNJA_API_TOKEN',
    create: (ctx) => createVikunja(ctx) as Integration,
  },
};

/**
 * One adapter per service that declares an integration. Credentials are resolved once, here; a
 * missing one yields a `configured: false` adapter with no collector (not an error).
 */
export async function createIntegrations(
  services: readonly ServiceDef[],
  resolveSecret: SecretResolver,
  t: T,
): Promise<Integration[]> {
  const result: Integration[] = [];
  for (const service of services) {
    if (!service.integration) continue;
    const { type, url, secret } = service.integration;
    const adapter = ADAPTERS[type];
    result.push(
      adapter.create({
        serviceId: service.id,
        serviceName: service.name,
        serviceUrl: service.url ?? null,
        baseUrl: url.replace(/\/$/, ''),
        secret: await resolveSecret(secret, adapter.defaultSecretEnv),
        t,
      }),
    );
  }
  return result;
}
