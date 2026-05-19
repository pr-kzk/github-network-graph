#!/usr/bin/env node
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const releasesDir = resolve(root, 'releases');

if (!existsSync(distDir)) {
  console.error('[package] dist/ not found. Run `pnpm build:prod` first.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const zipPath = resolve(releasesDir, `github-network-graph-v${pkg.version}.zip`);

mkdirSync(releasesDir, { recursive: true });

const output = createWriteStream(zipPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on('close', () => {
  const sizeKb = (archive.pointer() / 1024).toFixed(1);
  console.log(`[package] wrote ${zipPath} (${sizeKb} KB)`);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') console.warn('[package] warning:', err.message);
  else throw err;
});
archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
archive.glob('**/*', {
  cwd: distDir,
  ignore: ['**/*.map'],
  dot: false,
});
await archive.finalize();
