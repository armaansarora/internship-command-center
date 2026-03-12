/**
 * Generate PWA icons and favicons using sharp.
 * Blue-violet gradient with "ICC" text.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const appDir = join(__dirname, '..', 'src', 'app');

function createIconSvg(size) {
  const fontSize = Math.round(size * 0.32);
  const yOffset = Math.round(size * 0.6);
  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.2)"/>
      <stop offset="50%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#bg)"/>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#shine)"/>
  <text x="50%" y="${yOffset}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="${fontSize}" fill="white" letter-spacing="${Math.round(size * 0.02)}">ICC</text>
</svg>`);
}

const sizes = [
  { name: 'favicon-16x16.png', size: 16, dir: publicDir },
  { name: 'favicon-32x32.png', size: 32, dir: publicDir },
  { name: 'apple-touch-icon.png', size: 180, dir: publicDir },
  { name: 'icon-192.png', size: 192, dir: publicDir },
  { name: 'icon-512.png', size: 512, dir: publicDir },
];

for (const { name, size, dir } of sizes) {
  const svg = createIconSvg(size);
  const png = await sharp(svg).png().toBuffer();
  writeFileSync(join(dir, name), png);
  console.log(`Created ${name} (${size}x${size})`);
}

// Create favicon.ico (48x48 PNG — modern browsers accept PNG as .ico)
const favicon48 = await sharp(createIconSvg(48)).png().toBuffer();
writeFileSync(join(publicDir, 'favicon.ico'), favicon48);
console.log('Created favicon.ico (48x48)');

// Also copy favicon.ico to src/app/ to replace the default Next.js one
writeFileSync(join(appDir, 'favicon.ico'), favicon48);
console.log('Created src/app/favicon.ico (48x48)');

console.log('\nAll icons generated successfully!');
