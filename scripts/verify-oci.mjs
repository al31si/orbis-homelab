#!/usr/bin/env node
/**
 * Checks a multi-architecture image exported as an OCI layout tarball
 * (`docker buildx build --output type=oci,dest=image.tar ...`). Nothing is pushed or run.
 *
 *   node scripts/verify-oci.mjs image.tar <version> [source-url]
 *
 * It verifies that:
 *  - the image index has exactly linux/amd64 and linux/arm64;
 *  - each image has the OCI labels (title, licence, source, version) and runs as a non-root user;
 *  - the layers of each platform contain no native executable of another architecture (the image
 *    must be pure JavaScript on top of the base image, so it never needs emulation to build);
 *  - the application files (server, web app, LICENSE, THIRD_PARTY_NOTICES.md) are present.
 *
 * It does NOT run the image: see docs/releasing.md for what has and has not been run per platform.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const [archive, version, source = 'https://github.com/al31si/orbis-homelab'] =
  process.argv.slice(2);
if (!archive || !version) {
  process.stderr.write('usage: verify-oci.mjs <image.tar> <version> [source-url]\n');
  process.exit(2);
}

const work = mkdtempSync(path.join(tmpdir(), 'verify-oci-'));
const failures = [];
const fail = (message) => failures.push(message);
const note = (message) => process.stdout.write(`${message}\n`);

/** e_machine of an ELF header, or null when the file is not an ELF executable/library. */
const ELF_MACHINES = new Map([
  [0x3e, 'amd64'],
  [0xb7, 'arm64'],
]);
function elfArch(buffer) {
  if (buffer.length < 20 || buffer.readUInt32BE(0) !== 0x7f454c46) return null;
  const little = buffer[5] === 1;
  const machine = little ? buffer.readUInt16LE(18) : buffer.readUInt16BE(18);
  return ELF_MACHINES.get(machine) ?? `machine-${machine}`;
}

/** Entries of a tar stream: [name, content] (regular files only). */
function* tarEntries(buffer) {
  let offset = 0;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) return;
    const name = header.toString('utf8', 0, 100).replace(/\0.*$/, '');
    const prefix = header.toString('utf8', 345, 500).replace(/\0.*$/, '');
    const size = Number.parseInt(
      header.toString('utf8', 124, 136).replace(/\0.*$/, '').trim() || '0',
      8,
    );
    const type = String.fromCharCode(header[156] || 48);
    offset += 512;
    if (type === '0' || type === '\0')
      yield [prefix ? `${prefix}/${name}` : name, buffer.subarray(offset, offset + size)];
    offset += Math.ceil(size / 512) * 512;
  }
}

try {
  execFileSync('tar', ['-xf', archive, '-C', work]);
  const blob = (digest) => readFileSync(path.join(work, 'blobs', ...digest.split(':')));
  const json = (digest) => JSON.parse(blob(digest).toString('utf8'));

  const top = JSON.parse(readFileSync(path.join(work, 'index.json'), 'utf8'));
  const rootDescriptor = top.manifests[0];
  const index = json(rootDescriptor.digest);
  const images = (index.manifests ?? [])
    .filter((m) => m.platform && m.platform.os !== 'unknown')
    .map((m) => ({
      platform: `${m.platform.os}/${m.platform.architecture}`,
      manifest: json(m.digest),
    }));

  const platforms = images.map((i) => i.platform).sort();
  if (platforms.join() !== 'linux/amd64,linux/arm64')
    fail(`platforms are ${platforms.join(', ') || 'none'}, expected linux/amd64 and linux/arm64`);

  for (const { platform, manifest } of images) {
    const arch = platform.split('/')[1];
    const config = json(manifest.config.digest);
    const labels = config.config?.Labels ?? {};
    const expectLabels = {
      'org.opencontainers.image.title': 'Orbis Homelab',
      'org.opencontainers.image.licenses': 'Apache-2.0',
      'org.opencontainers.image.source': source,
      'org.opencontainers.image.version': version,
    };
    for (const [key, value] of Object.entries(expectLabels)) {
      if (labels[key] !== value)
        fail(`${platform}: label ${key} is "${labels[key] ?? ''}", expected "${value}"`);
    }
    if (!/^[1-9]/.test(config.config?.User ?? '') && config.config?.User !== 'node')
      fail(`${platform}: image does not run as a non-root user (${config.config?.User ?? 'root'})`);

    const present = new Set();
    const foreign = new Map();
    for (const layer of manifest.layers) {
      const raw = blob(layer.digest);
      const tar = layer.mediaType.includes('gzip') ? zlib.gunzipSync(raw) : raw;
      for (const [name, content] of tarEntries(tar)) {
        present.add(name.replace(/^\.\//, ''));
        const machine = elfArch(content);
        if (machine && machine !== arch) foreign.set(name, machine);
      }
    }
    for (const required of [
      'app/server/dist/server/src/index.js',
      'app/web/index.html',
      'app/LICENSE',
      'app/THIRD_PARTY_NOTICES.md',
      'app/healthcheck.mjs',
    ]) {
      if (!present.has(required)) fail(`${platform}: ${required} is missing`);
    }
    for (const [name, machine] of foreign) fail(`${platform}: ${name} is a ${machine} executable`);
    note(
      `${platform}: ${manifest.layers.length} layers, ${present.size} files, labels ok, ${foreign.size === 0 ? 'no foreign-architecture executable' : `${foreign.size} FOREIGN executables`}`,
    );
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
  process.exit(1);
}
note(`OK: ${archive} is a linux/amd64 + linux/arm64 image of Orbis Homelab ${version}`);
note(`archive size: ${(statSync(archive).size / 1048576).toFixed(1)} MiB`);
