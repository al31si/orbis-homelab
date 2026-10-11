// Container healthcheck: GET /api/health on the port configured in <CONFIG_DIR>/config.yaml
// (`server.port`, default 3100). Exits 0 when the app answers `{ "ok": true }`, 1 otherwise.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

function configuredPort() {
  try {
    const file = join(process.env.CONFIG_DIR ?? '/config', 'config.yaml');
    const port = parse(readFileSync(file, 'utf8'))?.server?.port;
    return Number.isInteger(port) ? port : 3100;
  } catch {
    return 3100;
  }
}

try {
  const res = await fetch(`http://127.0.0.1:${configuredPort()}/api/health`, {
    signal: AbortSignal.timeout(4000),
  });
  const body = res.ok ? await res.json() : null;
  process.exit(body?.ok === true ? 0 : 1);
} catch {
  process.exit(1);
}
