import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outdir = join(__dirname, '../dist/public');
mkdirSync(outdir, { recursive: true });

execSync('pnpm postcss public/styles.css -o dist/public/styles.css', {
  stdio: 'inherit',
});
console.log('css ✔');
