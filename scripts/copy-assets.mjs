// scripts/copy-assets.mjs
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const viewsSrc = join(root, 'views');
const publicSrc = join(root, 'public');
const viewsDst = join(dist, 'views');
const publicDst = join(dist, 'public');

mkdirSync(dist, { recursive: true });
mkdirSync(viewsDst, { recursive: true });
mkdirSync(publicDst, { recursive: true });

// 1) Views komplett kopieren
cpSync(viewsSrc, viewsDst, { recursive: true });

// 2) Public kopieren, aber gebaute Artefakte überspringen
const SKIP = new Set(['app.js', 'app.tsx']);

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const dirent of readdirSync(src, { withFileTypes: true })) {
    const from = join(src, dirent.name);
    const to = join(dst, dirent.name);

    if (dirent.isDirectory()) {
      copyDir(from, to);
    } else {
      if (SKIP.has(dirent.name)) continue;
      cpSync(from, to);
    }
  }
}

copyDir(publicSrc, publicDst);

console.log('assets ✔');
