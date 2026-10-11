import { ConfigError, loadConfig, loadEnv } from './config/loader.js';
import type { Config, Env, ServicesFile } from './config/schema.js';
import { type SecretResolver, createSecretResolver } from './config/secrets.js';
import { ControlCenter } from './control-center.js';
import type { ControlCenterApi } from './core/control-center-api.js';
import type { AlertNotification, Logger } from './core/types.js';
import { ExtensionHost } from './extensions/host.js';
import { createTranslator } from './i18n/index.js';
import { PushService } from './push.js';
import { buildApp } from './server.js';

/**
 * The single place that knows how the data core is constructed: `ControlCenter` is only used
 * through `ControlCenterApi` everywhere else.
 */
function createControlCenter(deps: {
  env: Env;
  config: Config;
  services: ServicesFile;
  secrets: SecretResolver;
  log: Logger;
  onNotification: (n: AlertNotification) => void;
}): Promise<ControlCenterApi> {
  return ControlCenter.create(deps);
}

async function main(): Promise<void> {
  const env = loadEnv();
  const { config, services } = await loadConfig(env);
  const secrets = createSecretResolver(env);
  const t = createTranslator(config.app.language);

  // Logger is created by Fastify; use a tiny bootstrap logger until then.
  const boot: Logger = {
    info: (m) => console.log(JSON.stringify({ level: 'info', msg: m })),
    warn: (o, m) => console.warn(JSON.stringify({ level: 'warn', msg: m, ...o })),
    error: (o, m) => console.error(JSON.stringify({ level: 'error', msg: m, ...o })),
  };

  // The schema guarantees a subject whenever push is enabled.
  const { enabled: pushEnabled, subject: pushSubject } = config.push;
  const push =
    pushEnabled && pushSubject
      ? await PushService.create({
          dataDir: env.DATA_DIR,
          subject: pushSubject,
          appId: config.app.id,
          appName: config.app.shortName ?? config.app.name,
          t,
          log: boot,
        })
      : null;
  const core = await createControlCenter({
    env,
    config,
    services,
    secrets,
    log: boot,
    onNotification: (n) => {
      void push
        ?.notifyAlert(n)
        .catch((err: unknown) => boot.warn({ err: String(err) }, 'push notification failed'));
    },
  });
  // Extensions register collectors, integrations and rules: they must load before start().
  const extensions = await ExtensionHost.load({
    extensionsDir: env.EXTENSIONS_DIR,
    entries: config.extensions,
    core,
    secrets,
    language: config.app.language,
    log: boot,
  });

  const { app, listen } = buildApp({ env, config, core, push, extensions, t });
  await listen();
  core.start();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down');
    core.stop();
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  // A configuration problem is the operator's to fix: the message says how, a stack would not.
  if (err instanceof ConfigError) console.error(err.message);
  else console.error(err);
  process.exit(1);
});
