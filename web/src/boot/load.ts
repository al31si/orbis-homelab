import type { BootConfig, Session } from '@shared/api';
import { apiFetch } from '@/data/api';
import { parseBootConfig, readBootConfig } from './parse';

/**
 * The boot config of this page load: the one the BFF embedded in index.html, or (dev server,
 * where the meta tag is a placeholder) a single `/api/session` request.
 */
export async function loadBootConfig(): Promise<BootConfig> {
  const embedded = readBootConfig();
  if (embedded) return embedded;
  const session = await apiFetch<Session>('/session');
  const config = parseBootConfig(session);
  if (!config) throw new Error('Invalid /api/session response');
  return config;
}
