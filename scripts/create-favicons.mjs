import sharp from 'sharp';

const sizes = [512, 192, 32, 16];
for (const n of sizes) {
  await sharp('public/favicon.svg').png().toFile(`public/favicon-${n}.png`);
}
console.log(
  'Favicons erstellt:',
  sizes.map((n) => `public/favicon-${n}.png`).join(', '),
);
