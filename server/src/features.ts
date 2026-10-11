import type { FeatureFlags } from '../../shared/api.js';
import type { Config, ServicesFile } from './config/schema.js';

/**
 * What the instance can show, derived from configuration (docs/ARCHITECTURE.md, "Feature
 * detection"). `config.features.*` can only turn things off, except `activity: true`.
 * A feature that is off has no collector, no alert rule and no endpoint.
 */
export function deriveFeatures(config: Config, services: ServicesFile): FeatureFlags {
  const { sources, features } = config;
  const hasProvider = sources.system !== undefined;
  const storage = sources.storage;
  // Volumes and pools come from the system provider; without it only a SMART report is left.
  const storageOn =
    features.storage !== false &&
    storage !== undefined &&
    (hasProvider || storage.smart !== undefined);
  const activityDetected =
    services.services.some((service) => service.integration !== undefined) ||
    sources.usage.length > 0;

  return {
    system: hasProvider && features.system !== false,
    containers: hasProvider,
    storage: storageOn,
    smart: storageOn && storage?.smart !== undefined,
    activity: features.activity === true || (features.activity !== false && activityDetected),
    push: config.push.enabled,
  };
}
