import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = join(__dirname, '../dist');

mkdirSync(outdir, { recursive: true });

const externals = [
  'better-sqlite3',
  'pug',
  'express',
  'morgan',
  'uuid',
  'csurf',
  'method-override',
  // ggf. weitere direkte Dependencies
];

await build({
  entryPoints: ['src/index.ts'],
  platform: 'node',
  format: 'cjs',
  target: ['node18'],
  outfile: join(outdir, 'server.cjs'),
  bundle: true,
  minify: true,
  external: externals,
});
console.log('server bundle ✔');
