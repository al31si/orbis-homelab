import path from 'node:path';
import { parseDocument } from 'yaml';
import type { z } from 'zod';
import { readTextIfExists } from '../lib/files.js';
import { secureAddress } from './public-url.js';
import {
  type Config,
  type Env,
  type ServicesFile,
  configSchema,
  envSchema,
  servicesFileSchema,
} from './schema.js';

/** Startup configuration problem. `message` is a readable list, one problem per line. */
export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join('\n'));
    this.name = 'ConfigError';
  }
}

export interface LoadedConfig {
  config: Config;
  services: ServicesFile;
}

/** Container-level settings from the process environment (where things are mounted). */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((issue) => `environment: ${describe(issue)}`));
  }
  return parsed.data;
}

type Issue = z.core.$ZodIssue;

function formatPath(segments: readonly PropertyKey[]): string {
  let out = '';
  for (const segment of segments) {
    out +=
      typeof segment === 'number' ? `[${segment}]` : `${out === '' ? '' : '.'}${String(segment)}`;
  }
  return out;
}

/**
 * Message of one zod issue. Zod never copies the offending value into its messages; unions are
 * unfolded so the reader sees why each alternative was rejected.
 */
function describe(issue: Issue): string {
  const where = formatPath(issue.path);
  const prefix = where === '' ? '' : `${where}: `;
  if (issue.code === 'invalid_union') {
    const reasons = new Set(
      issue.errors.flatMap((branch) =>
        branch.map((nested) => {
          const sub = formatPath(nested.path);
          return `${sub === '' ? '' : `${sub}: `}${nested.message}`;
        }),
      ),
    );
    if (reasons.size > 0) return `${prefix}${[...reasons].join(' | ')}`;
  }
  return `${prefix}${issue.message}`;
}

function parseYaml(file: string, text: string): { value: unknown } | { problems: string[] } {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) {
    // The first line of a YAML error is the reason; the lines after it quote the source text.
    return {
      problems: doc.errors.map((err) => {
        const line = err.linePos?.[0]?.line;
        const reason = (err.message.split('\n')[0] ?? '').replace(/:$/, '');
        return `${file}: ${line === undefined ? '' : `line ${line}: `}${reason}`;
      }),
    };
  }
  return { value: doc.toJS() ?? {} };
}

async function readYaml<S extends z.ZodType>(
  dir: string,
  file: string,
  schema: S,
): Promise<{ data: z.output<S> | null; problems: string[] }> {
  let text: string | null;
  try {
    text = await readTextIfExists(path.join(dir, file));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? 'unknown error';
    return { data: null, problems: [`${file}: cannot read the file (${code})`] };
  }
  if (text === null) return { data: null, problems: [] };

  const yaml = parseYaml(file, text);
  if ('problems' in yaml) return { data: null, problems: yaml.problems };

  const parsed = schema.safeParse(yaml.value);
  if (!parsed.success) {
    return {
      data: null,
      problems: parsed.error.issues.map((issue) => `${file}: ${describe(issue)}`),
    };
  }
  return { data: parsed.data as z.output<S>, problems: [] };
}

/** References between the two files that the schemas cannot express. */
function crossCheck(config: Config, services: ServicesFile): string[] {
  const ids = new Set(services.services.map((s) => s.id));
  return config.app.defaultFavorites.flatMap((id, i) =>
    ids.has(id) ? [] : [`config.yaml: app.defaultFavorites[${i}]: unknown service "${id}"`],
  );
}

/**
 * Reads `<CONFIG_DIR>/config.yaml` and `services.yaml`. A missing `config.yaml` means schema
 * defaults (limited access, no sources); a missing `services.yaml` means no services. Any other
 * problem is collected from both files into one `ConfigError`.
 */
export async function loadConfig(
  env: Pick<Env, 'CONFIG_DIR'>,
  log: { info: (msg: string) => void } = { info: (msg) => console.log(msg) },
): Promise<LoadedConfig> {
  const [cfg, svc] = await Promise.all([
    readYaml(env.CONFIG_DIR, 'config.yaml', configSchema),
    readYaml(env.CONFIG_DIR, 'services.yaml', servicesFileSchema),
  ]);
  const problems = [...cfg.problems, ...svc.problems];
  if (problems.length > 0) throw new ConfigError(problems);

  if (cfg.data === null) {
    log.info(
      `no config.yaml in ${env.CONFIG_DIR}: using defaults (limited access, no sources); see config.example.yaml`,
    );
  }
  const config = cfg.data ?? configSchema.parse({});
  if (config.publicUrl !== undefined && secureAddress(config.publicUrl) === null) {
    log.info(
      `publicUrl ${config.publicUrl} is not an https:// address: it is not offered as the secure address (see docs/https.md)`,
    );
  }
  const services = svc.data ?? servicesFileSchema.parse({});

  const crossProblems = crossCheck(config, services);
  if (crossProblems.length > 0) throw new ConfigError(crossProblems);
  return { config, services };
}
