#!/usr/bin/env node
/**
 * Downloads the logos listed in web/src/ui/brand/brands.json from the pinned commit of the
 * dashboard-icons collection into web/src/ui/brand/logos/. Run it after adding a brand:
 *
 *   node scripts/sync-brand-logos.mjs            fetch the missing logos
 *   node scripts/sync-brand-logos.mjs --force    fetch all of them again
 *
 * Nothing else reaches the network: the logos are committed and bundled with the web app.
 * Read docs/brand-logos.md first (licence and trademarks).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'web/src/ui/brand');
const { source, brands } = JSON.parse(await readFile(path.join(dir, 'brands.json'), 'utf8'));
const force = process.argv.includes('--force');

mkdirSync(path.join(dir, 'logos'), { recursive: true });
let failed = 0;
for (const { id } of brands) {
  const target = path.join(dir, 'logos', `${id}.svg`);
  if (existsSync(target) && !force) continue;
  const url = `https://raw.githubusercontent.com/${source.repository}/${source.commit}/${source.path}/${id}.svg`;
  const response = await fetch(url);
  const text = response.ok ? await response.text() : '';
  // The logos are drawn with <img>, which never runs scripts; refuse anything that is not plain art anyway.
  if (!text.trimStart().startsWith('<') || /<script|onload=|foreignObject/i.test(text)) {
    console.error(`${id}: not usable (${response.status}) ${url}`);
    failed++;
    continue;
  }
  writeFileSync(target, text);
  console.log(`${id}: ${text.length} bytes`);
}
process.exit(failed ? 1 : 0);
