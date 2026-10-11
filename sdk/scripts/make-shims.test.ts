import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { generateShims, parseSdkExports, shimSource } from './make-shims.mjs';

const SCRIPT = fileURLToPath(new URL('./make-shims.mjs', import.meta.url));
const REPO = path.resolve(path.dirname(SCRIPT), '../..');
const EXPECTED = ['belvedere-sdk-client.js', 'jsx-runtime.js', 'orbis-sdk-client.js', 'react.js'];

const tmpDirs: string[] = [];
const tmp = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), 'make-shims-'));
  tmpDirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of tmpDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Runs the generator the way a user would: as a program, not as an import. */
function run(scriptPath: string, outDir: string, cwd?: string) {
  const result = spawnSync(process.execPath, [scriptPath, outDir], { encoding: 'utf8', cwd });
  return { status: result.status, files: existsSync(outDir) ? readdirSync(outDir).sort() : [] };
}

describe('make-shims.mjs invoked as a program', () => {
  it('generates the shims when started by its real path', () => {
    const out = path.join(tmp(), 'shims');
    expect(run(SCRIPT, out)).toEqual({ status: 0, files: EXPECTED });
  });

  // Regression: the entry-point guard compared the symlinked argv[1] with the real path of the
  // module, so a symlinked invocation exited 0 without generating anything.
  it('generates the shims when the script file is a symlink', () => {
    const dir = tmp();
    const link = path.join(dir, 'make-shims-link.mjs');
    symlinkSync(SCRIPT, link);
    expect(run(link, path.join(dir, 'out'))).toEqual({ status: 0, files: EXPECTED });
  });

  it('generates the shims when the checkout is reached through a symlinked directory', () => {
    const dir = tmp();
    const checkout = path.join(dir, 'orbis-homelab');
    symlinkSync(REPO, checkout, 'dir');
    const viaLink = path.join(checkout, 'sdk/scripts/make-shims.mjs');
    expect(run(viaLink, path.join(dir, 'out'))).toEqual({ status: 0, files: EXPECTED });
  });

  it('generates the shims with a relative path from inside a symlinked directory', () => {
    const dir = tmp();
    const checkout = path.join(dir, 'orbis-homelab');
    symlinkSync(REPO, checkout, 'dir');
    expect(run('sdk/scripts/make-shims.mjs', path.join(dir, 'out'), checkout)).toEqual({
      status: 0,
      files: EXPECTED,
    });
  });

  it('writes shims that read the host globals and export what the SDK and React export', () => {
    const out = path.join(tmp(), 'shims');
    run(SCRIPT, out);
    const sdk = readFileSync(path.join(out, 'orbis-sdk-client.js'), 'utf8');
    expect(sdk).toContain('const mod = host.sdk;');
    expect(sdk).toContain('export const Page = mod.Page;');
    expect(sdk).toContain('export const useSnapshot = mod.useSnapshot;');
    expect(readFileSync(path.join(out, 'react.js'), 'utf8')).toContain('export const useState');
    expect(readFileSync(path.join(out, 'jsx-runtime.js'), 'utf8')).toContain('export const jsx ');
  });
});

describe('importing make-shims.mjs', () => {
  it('has no side effect: nothing is generated unless it is the program being run', () => {
    // Importing above already happened; the default output folder must not have appeared.
    expect(existsSync(path.resolve('shims'))).toBe(false);
  });
});

describe('parseSdkExports', () => {
  it('lists value exports, resolves `as` names and skips type exports', () => {
    // `export` must start the line, as in sdk/client.ts.
    const source = [
      "export { A } from './a';",
      "export { B as C, type D } from './b';",
      "export type { E } from './e';",
    ].join('\n');
    expect(parseSdkExports(source)).toEqual(['A', 'C']);
  });

  it('refuses a wildcard export: the contract must stay explicit', () => {
    expect(() => parseSdkExports(`export * from './all';`)).toThrow(/explicitly/);
  });

  it('refuses an export name that is not a plain identifier', () => {
    expect(() => parseSdkExports(`export { x as 'not valid' } from './x';`)).toThrow(/Unsupported/);
  });
});

describe('shimSource and generateShims', () => {
  it('never emits a reserved or invalid name and deduplicates', () => {
    const source = shimSource({
      globalKey: 'react',
      names: ['useState', 'useState', 'default', 'not-valid'],
      withDefault: true,
    });
    expect(source.match(/export const useState/g)).toHaveLength(1);
    expect(source).not.toContain('export const default');
    expect(source).not.toContain('not-valid');
    expect(source).toContain('export default mod;');
  });

  it('fails loudly when the host is not there instead of exporting undefined values', () => {
    expect(shimSource({ globalKey: 'sdk', names: ['Page'], withDefault: false })).toContain(
      'throw new Error',
    );
  });

  it('produces exactly the shim files', () => {
    const files = generateShims({
      sdkSource: `export { Page } from './page';`,
      reactExports: ['useState'],
      jsxRuntimeExports: ['jsx'],
    });
    expect(Object.keys(files).sort()).toEqual(EXPECTED);
  });
});

describe('compatibility with extensions built before the rename', () => {
  const files = generateShims({
    sdkSource: "export { Page } from './page';",
    reactExports: ['useState'],
    jsxRuntimeExports: ['jsx'],
  });

  it('writes the SDK shim under the file name old build scripts alias to, with the same content', () => {
    expect(files['belvedere-sdk-client.js']).toBe(files['orbis-sdk-client.js']);
  });

  /** Evaluates a generated shim like a browser would evaluate the bundle that contains it. */
  async function evaluate(source: string, globals: Record<string, unknown>) {
    const dir = tmp();
    const file = path.join(dir, `shim-${Math.random().toString(36).slice(2)}.mjs`);
    writeFileSync(file, source);
    const host = globalThis as Record<string, unknown>;
    const saved = { orbis: host.__ORBIS__, legacy: host.__BELVEDERE__ };
    delete host.__ORBIS__;
    delete host.__BELVEDERE__;
    Object.assign(host, globals);
    try {
      return await import(pathToFileURL(file).href);
    } finally {
      host.__ORBIS__ = saved.orbis;
      host.__BELVEDERE__ = saved.legacy;
    }
  }

  it('reads the host from __ORBIS__', async () => {
    const mod = await evaluate(files['orbis-sdk-client.js'], {
      __ORBIS__: { sdk: { Page: 'new' } },
    });
    expect(mod.Page).toBe('new');
  });

  it('still runs on a host that only publishes the legacy __BELVEDERE__ global', async () => {
    const mod = await evaluate(files['belvedere-sdk-client.js'], {
      __BELVEDERE__: { sdk: { Page: 'legacy' } },
    });
    expect(mod.Page).toBe('legacy');
  });

  it('prefers __ORBIS__ when both are present', async () => {
    const mod = await evaluate(files['orbis-sdk-client.js'], {
      __ORBIS__: { sdk: { Page: 'new' } },
      __BELVEDERE__: { sdk: { Page: 'legacy' } },
    });
    expect(mod.Page).toBe('new');
  });

  it('fails with a message naming the product when there is no host', async () => {
    await expect(evaluate(files['orbis-sdk-client.js'], {})).rejects.toThrow(
      /Orbis Homelab host is missing/,
    );
  });
});
