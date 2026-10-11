import path from 'node:path';
import { readTextIfExists } from '../lib/files.js';
import type { Env, SecretRef } from './schema.js';

/**
 * Resolves a secret reference. Returns undefined when the variable is unset/empty or the file is
 * missing: that means "not configured", never an error. Other read errors (permissions...) throw.
 * The returned value must never be logged or placed in an error message.
 */
export type SecretResolver = (
  ref: SecretRef | undefined,
  defaultEnv?: string,
) => Promise<string | undefined>;

/**
 * `ref` absent: the environment variable `defaultEnv` (if given). Relative file paths are resolved
 * against CONFIG_DIR. Files are read on every call, so a rotated secret needs no restart.
 */
export function createSecretResolver(
  env: Pick<Env, 'CONFIG_DIR'>,
  source: NodeJS.ProcessEnv = process.env,
): SecretResolver {
  return async (ref, defaultEnv) => {
    let value: string | undefined;
    if (ref && 'file' in ref) {
      const file = path.resolve(env.CONFIG_DIR, ref.file);
      try {
        value = (await readTextIfExists(file)) ?? undefined;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code ?? 'unknown error';
        throw new Error(`cannot read secret file ${file}: ${code}`, { cause: err });
      }
    } else {
      const name = ref ? ref.env : defaultEnv;
      value = name === undefined ? undefined : source[name];
    }
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };
}
