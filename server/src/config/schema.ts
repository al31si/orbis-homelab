import { isIP } from 'node:net';
import { z } from 'zod';

/**
 * Configuration of an instance.
 *
 * Two YAML files live in CONFIG_DIR:
 *  - `config.yaml`   instance settings (this file's `configSchema`)
 *  - `services.yaml` the service catalog (`servicesFileSchema`)
 *
 * Rules
 *  - Non-sensitive settings live in YAML, secrets never do: a secret is a *reference*
 *    (`{ env: NAME }` or `{ file: /path }`) resolved when the BFF starts.
 *  - Every object is strict: an unknown key is a startup error, so typos cannot silently
 *    disable a feature.
 *  - A source, integration or module that is not configured does not exist: no collector, no
 *    alert, no page, no error.
 */

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'use lowercase letters, digits and dashes');
const port = z.number().int().min(1).max(65535);
const httpUrl = z
  .string()
  .refine((v) => /^https?:\/\/\S+$/i.test(v), 'must be an http(s) URL without spaces');
const cssColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'use a #rrggbb color');
const envName = z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'use an UPPER_SNAKE_CASE variable name');

/** Where a secret comes from. The value itself never appears in configuration. */
export const secretRefSchema = z.union([
  z.strictObject({ env: envName }),
  z.strictObject({ file: z.string().min(1) }),
]);
export type SecretRef = z.infer<typeof secretRefSchema>;

function isIpOrCidr(value: string): boolean {
  const [addr, prefix, ...rest] = value.split('/');
  if (rest.length > 0 || !addr) return false;
  const version = isIP(addr);
  if (version === 0) return false;
  if (prefix === undefined) return true;
  if (!/^\d{1,3}$/.test(prefix)) return false;
  return Number(prefix) <= (version === 4 ? 32 : 128);
}

/* --------------------------------------------------------------------- app */

const DEFAULT_APP_NAME = 'Orbis Homelab';
const DEFAULT_SHORT_NAME = 'Orbis';

const appSchema = z
  .strictObject({
    /** Namespaces PWA caches, local storage keys and notification tags. */
    id: slug.default('orbis-homelab'),
    name: z.string().min(1).max(60).default(DEFAULT_APP_NAME),
    shortName: z.string().min(1).max(20).optional(),
    description: z.string().max(200).optional(),
    language: z.enum(['it', 'en']).default('en'),
    theme: z.enum(['system', 'light', 'dark']).default('system'),
    accent: cssColor.optional(),
    /** Optional ordering and labels of service groups (`category` in services.yaml). */
    categories: z.array(z.strictObject({ id: slug, label: z.string().min(1).max(40) })).default([]),
    /** Service ids that are starred on a device's first launch. */
    defaultFavorites: z.array(slug).default([]),
  })
  // An instance that keeps the product name also gets the product's short name under the icon.
  .transform((app) => ({
    ...app,
    shortName: app.shortName ?? (app.name === DEFAULT_APP_NAME ? DEFAULT_SHORT_NAME : undefined),
  }))
  .default({
    id: 'orbis-homelab',
    name: DEFAULT_APP_NAME,
    shortName: DEFAULT_SHORT_NAME,
    language: 'en',
    theme: 'system',
    categories: [],
    defaultFavorites: [],
  });

/* ------------------------------------------------------------------ access */

const identityProxySchema = z
  .strictObject({
    /** `tailscale` fills the two header names with Tailscale Serve's. */
    preset: z.enum(['tailscale']).optional(),
    /** Source IPs/CIDRs of the reverse proxy; identity headers from anywhere else are ignored. */
    trustedProxies: z.array(z.string().refine(isIpOrCidr, 'must be an IP address or CIDR')).min(1),
    /**
     * Optional second listener reserved for the proxy. When set, identity is honoured only on
     * this port (so processes that can reach the public port cannot forge headers).
     */
    trustedPort: port.optional(),
    userHeader: z.string().min(1).optional(),
    nameHeader: z.string().min(1).optional(),
    /** Identities (header values, compared case-insensitively) that get full access. */
    allowedUsers: z.array(z.string().min(1)).min(1),
  })
  .superRefine((v, ctx) => {
    if (!v.preset && !v.userHeader) {
      ctx.addIssue({ code: 'custom', path: ['userHeader'], message: 'required without a preset' });
    }
  });

const accessSchema = z
  .discriminatedUnion('mode', [
    /** Everybody gets the limited view (default). */
    z.strictObject({ mode: z.literal('limited') }),
    /** Everybody who can reach the app is trusted: use only on a network you control. */
    z.strictObject({ mode: z.literal('trusted-network') }),
    z.strictObject({ mode: z.literal('identity-proxy'), identityProxy: identityProxySchema }),
  ])
  .default({ mode: 'limited' });

/* ----------------------------------------------------------------- sources */

const systemSourceSchema = z.strictObject({
  type: z.literal('glances'),
  url: httpUrl,
  /** Where the host root is mounted inside the Glances container (maps filesystem paths). */
  hostPrefix: z.string().default('/host'),
  /** Overrides the hostname reported by the provider (inside Docker it is the container id). */
  hostname: z.string().min(1).optional(),
});

const smartSourceSchema = z
  .strictObject({
    type: z.literal('report-json'),
    /** Exactly one of `url` / `file`: a JSON report in the documented SMART report format. */
    url: httpUrl.optional(),
    file: z.string().min(1).optional(),
    /** Disk label (as written in the report) -> mount point of its filesystem. */
    disks: z.record(z.string(), z.string()).default({}),
  })
  .superRefine((v, ctx) => {
    if (Boolean(v.url) === Boolean(v.file)) {
      ctx.addIssue({ code: 'custom', message: 'set exactly one of `url` or `file`' });
    }
  });

const poolSchema = z.strictObject({
  id: slug,
  label: z.string().min(1).max(40),
  /** Mount point of the pooled filesystem. */
  mount: z.string().min(1),
  /** Mount points of the member volumes. */
  members: z.array(z.string().min(1)).default([]),
});

const storageSourceSchema = z.strictObject({
  volumes: z
    .strictObject({
      /** `auto`: every real filesystem; or an explicit list of mount points. */
      include: z.union([z.literal('auto'), z.array(z.string().min(1)).min(1)]).default('auto'),
      /** Mount point -> friendly name. */
      labels: z.record(z.string(), z.string()).default({}),
    })
    .default({ include: 'auto', labels: {} }),
  pools: z.array(poolSchema).default([]),
  smart: smartSourceSchema.optional(),
});

/**
 * Usage provider: a JSON document with the weekly quota of an AI subscription:
 * `{ weekly_remaining_percent, weekly_resets_at, plan?, updated_at? }`.
 */
const usageProviderSchema = z
  .strictObject({
    id: slug,
    label: z.string().min(1).max(40),
    parser: z.literal('weekly-quota'),
    url: httpUrl.optional(),
    file: z.string().min(1).optional(),
    /** Needs `updated_at` in the document: older data is reported as stalled. */
    maxAgeMinutes: z.number().int().min(1).optional(),
    /** Shown while a `file` source does not exist yet (the writer is not set up). */
    hint: z.string().max(300).optional(),
    intervalSeconds: z.number().int().min(30).default(300),
  })
  .superRefine((v, ctx) => {
    if (Boolean(v.url) === Boolean(v.file)) {
      ctx.addIssue({ code: 'custom', message: 'set exactly one of `url` or `file`' });
    }
  });

/** A bare `sources:` (YAML null) means no source, as in config.example.yaml before any is enabled. */
const sourcesSchema = z.preprocess(
  (value) => value ?? undefined,
  z
    .strictObject({
      system: systemSourceSchema.optional(),
      storage: storageSourceSchema.optional(),
      usage: z.array(usageProviderSchema).default([]),
    })
    .default({ usage: [] }),
);

/* ------------------------------------------------------------- misc blocks */

const linkSchema = z.strictObject({
  id: slug,
  title: z.string().min(1).max(60),
  description: z.string().max(160).default(''),
  /** `{host}` is replaced client-side by the hostname the app was opened on. */
  url: z.string().min(1),
  icon: z.string().default('generic'),
});

const thresholdsSchema = z.strictObject({
  poolWarn: z.number().min(1).max(100).optional(),
  poolCrit: z.number().min(1).max(100).optional(),
  fsWarn: z.number().min(1).max(100).optional(),
  fsCrit: z.number().min(1).max(100).optional(),
  memAvailableWarn: z.number().min(0).max(100).optional(),
  memAvailableCrit: z.number().min(0).max(100).optional(),
  swapWarn: z.number().min(0).max(100).optional(),
  swapWithLowMemory: z.number().min(0).max(100).optional(),
  loadFactorWarn: z.number().positive().optional(),
  smartStaleSeconds: z.number().int().positive().optional(),
});
export type ThresholdOverrides = z.infer<typeof thresholdsSchema>;

const pushSchema = z
  .strictObject({
    enabled: z.boolean().default(false),
    /** Contact claim for push services (`mailto:` or `https:`). */
    subject: z
      .string()
      .regex(/^(mailto:|https:\/\/)\S+$/)
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.enabled && !v.subject) {
      ctx.addIssue({ code: 'custom', path: ['subject'], message: 'required when push is enabled' });
    }
  })
  .default({ enabled: false });

const extensionSchema = z.strictObject({
  /** Directory name under EXTENSIONS_DIR. */
  id: slug,
  enabled: z.boolean().default(true),
  /** Opaque to the core: validated by the extension itself. */
  config: z.record(z.string(), z.unknown()).default({}),
});

/* -------------------------------------------------------------- config.yaml */

export const configSchema = z
  .strictObject({
    app: appSchema,
    /**
     * Optional. The https address of this instance, offered to users who open the plain-HTTP
     * address (Settings > Installation). An http URL is accepted for older configurations but
     * never offered. See `secureAddress`.
     */
    publicUrl: httpUrl.optional(),
    server: z.strictObject({ port: port.default(3100) }).default({ port: 3100 }),
    access: accessSchema,
    sources: sourcesSchema,
    /** Explicit overrides of the automatic feature detection. */
    features: z
      .strictObject({
        system: z.boolean().optional(),
        storage: z.boolean().optional(),
        activity: z.boolean().optional(),
      })
      .default({}),
    alerts: z
      .strictObject({
        graceSeconds: z.number().int().min(0).default(90),
        thresholds: thresholdsSchema.default({}),
      })
      .default({ graceSeconds: 90, thresholds: {} }),
    push: pushSchema,
    links: z.array(linkSchema).default([]),
    extensions: z.array(extensionSchema).default([]),
  })
  .superRefine((cfg, ctx) => {
    const storage = cfg.sources.storage;
    if (
      storage &&
      !cfg.sources.system &&
      (storage.pools.length > 0 || storage.volumes.include !== 'auto')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['sources', 'storage'],
        message:
          'pools and explicit volumes need `sources.system` (the provider reporting filesystems)',
      });
    }
    if (cfg.features.system === true && !cfg.sources.system) {
      ctx.addIssue({
        code: 'custom',
        path: ['features', 'system'],
        message: 'cannot be enabled without `sources.system`',
      });
    }
    const ids = new Set<string>();
    for (const [i, ext] of cfg.extensions.entries()) {
      if (ids.has(ext.id)) {
        ctx.addIssue({ code: 'custom', path: ['extensions', i, 'id'], message: 'duplicate id' });
      }
      ids.add(ext.id);
    }
    const linkIds = new Set<string>();
    for (const [i, link] of cfg.links.entries()) {
      if (linkIds.has(link.id)) {
        ctx.addIssue({ code: 'custom', path: ['links', i, 'id'], message: 'duplicate id' });
      }
      linkIds.add(link.id);
    }
  });

export type Config = z.infer<typeof configSchema>;

/* ------------------------------------------------------------ services.yaml */

export const INTEGRATION_TYPES = [
  'radarr',
  'sonarr',
  'lidarr',
  'prowlarr',
  'qbittorrent',
  'jellyfin',
  'vikunja',
] as const;
export type BuiltinIntegrationType = (typeof INTEGRATION_TYPES)[number];

const probeObjectSchema = z.strictObject({
  url: httpUrl,
  /** Accepted status codes; default is any 2xx/3xx. */
  okStatus: z.array(z.number().int().min(100).max(599)).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  insecureTls: z.boolean().optional(),
});

const serviceSchema = z
  .strictObject({
    id: slug,
    name: z.string().min(1).max(60),
    description: z.string().max(160).default(''),
    category: slug.optional(),
    /** Built-in mark key (jellyfin, radarr...) or a file name under `branding/icons/`. */
    icon: z.string().default('generic'),
    /** Launch URL. `{host}` is replaced client-side. Absent: the service has no UI to open. */
    url: z.string().min(1).optional(),
    /** An outage of a core service is critical (and pushed); otherwise it is a warning. */
    core: z.boolean().default(false),
    /** Docker containers (primary first); their state comes from the system provider. */
    containers: z.array(z.string().min(1)).default([]),
    /** `true` probes `url`; a string is a probe URL; an object adds status/headers/TLS options. */
    probe: z.union([z.literal(true), httpUrl, probeObjectSchema]).optional(),
    integration: z
      .strictObject({
        type: z.enum(INTEGRATION_TYPES),
        url: httpUrl,
        /** Default: `<TYPE>_API_KEY`, or `VIKUNJA_API_TOKEN` for vikunja. */
        secret: secretRefSchema.optional(),
      })
      .optional(),
  })
  .transform((svc, ctx) => {
    let probe: z.infer<typeof probeObjectSchema> | undefined;
    if (svc.probe === true) {
      if (!svc.url || svc.url.includes('{host}')) {
        ctx.addIssue({
          code: 'custom',
          path: ['probe'],
          message: '`probe: true` needs a `url` without the {host} placeholder',
        });
        return z.NEVER;
      }
      probe = { url: svc.url };
    } else if (typeof svc.probe === 'string') {
      probe = { url: svc.probe };
    } else {
      probe = svc.probe;
    }
    return { ...svc, probe };
  });

export type ServiceDef = z.infer<typeof serviceSchema>;

export const servicesFileSchema = z
  .strictObject({ services: z.array(serviceSchema).default([]) })
  .superRefine((file, ctx) => {
    const ids = new Set<string>();
    const owners = new Map<string, string>();
    for (const [i, svc] of file.services.entries()) {
      if (ids.has(svc.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['services', i, 'id'],
          message: `duplicate id ${svc.id}`,
        });
      }
      ids.add(svc.id);
      for (const name of svc.containers) {
        const owner = owners.get(name);
        if (owner) {
          ctx.addIssue({
            code: 'custom',
            path: ['services', i, 'containers'],
            message: `container ${name} already belongs to ${owner}`,
          });
        }
        owners.set(name, svc.id);
      }
    }
  });

export type ServicesFile = z.infer<typeof servicesFileSchema>;

/* ------------------------------------------------------------------- env */

/** Container-level settings: where things are mounted, never instance behaviour or secrets. */
export const envSchema = z.object({
  CONFIG_DIR: z.string().default('/config'),
  DATA_DIR: z.string().default('/data'),
  WEB_DIR: z.string().default('/app/web'),
  EXTENSIONS_DIR: z.string().default('/extensions'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});
export type Env = z.infer<typeof envSchema>;
