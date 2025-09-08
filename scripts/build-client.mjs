import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = join(__dirname, '../dist/public');

mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: ['public/app.ts'],
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: 'browser',
  format: 'iife',
  target: ['es2019'],
  outfile: join(outdir, 'app.js'),
});
console.log(`client bundle ✔ -> ${outdir}/app.js`);
