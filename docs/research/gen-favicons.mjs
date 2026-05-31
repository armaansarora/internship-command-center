// Favicon / app-icon generator for the Lobby pilot.
// Rasterizes the LOCKED Keystone mark (docs/MARK-SPEC.md) at exact pixel sizes,
// navy-filled square (Apple/maskable compliant), into public/lobby-pilot/.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BODY = 'M43.7 25.6Q44.1 23.4 46.4 23.4L73.6 23.4Q75.9 23.4 76.3 25.6L95.9 91.2Q96.6 93.6 94.1 93.6L70.8 93.6Q70.8 73 70.6 70.4Q69.6 56.4 60 56.4Q50.4 56.4 49.4 70.4Q49.2 73 49.2 93.6L25.9 93.6Q23.4 93.6 24.1 91.2Z';
const LIGHT = 'M60 63.4Q65.2 64 65.2 75.6L65.2 93.6L54.8 93.6L54.8 75.6Q54.8 64 60 63.4Z';

// Full-bleed navy square (corners filled — required for apple-touch + maskable).
function svg(rounded) {
  const tile = rounded
    ? '<rect width="120" height="120" rx="26" fill="#1A1A2E"/>'
    : '<rect width="120" height="120" fill="#1A1A2E"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label="The Tower">`
    + tile
    + `<path fill="#C9A84C" fill-rule="evenodd" d="${BODY}"/>`
    + `<path fill="#F5F1E8" fill-opacity=".7" d="${LIGHT}"/></svg>`;
}

const OUT = 'public/lobby-pilot';
mkdirSync(OUT, { recursive: true });

// Vector favicon — rounded, transparent corners (modern browsers).
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="The Tower">`
  + '<rect width="120" height="120" rx="26" fill="#1A1A2E"/>'
  + `<path fill="#C9A84C" fill-rule="evenodd" d="${BODY}"/>`
  + `<path fill="#F5F1E8" fill-opacity=".7" d="${LIGHT}"/></svg>`;
writeFileSync(`${OUT}/favicon.svg`, faviconSvg);

const targets = [
  { name: 'favicon-16.png', size: 16, rounded: false },
  { name: 'favicon-32.png', size: 32, rounded: false },
  { name: 'apple-touch-icon.png', size: 180, rounded: false }, // no transparency
  { name: 'icon-192.png', size: 192, rounded: false },          // maskable, full-bleed
  { name: 'icon-512.png', size: 512, rounded: false },
];

const browser = await chromium.launch();
try {
  for (const t of targets) {
    const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
    await page.setContent(
      `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:${t.size}px;height:${t.size}px;overflow:hidden}
       svg{display:block;width:${t.size}px;height:${t.size}px}</style>${svg(t.rounded)}`,
      { waitUntil: 'networkidle' },
    );
    await page.screenshot({ path: `${OUT}/${t.name}`, clip: { x: 0, y: 0, width: t.size, height: t.size } });
    await page.close();
    console.log('wrote', `${OUT}/${t.name}`, `(${t.size}px)`);
  }
} finally {
  await browser.close();
}
console.log('wrote', `${OUT}/favicon.svg`);
