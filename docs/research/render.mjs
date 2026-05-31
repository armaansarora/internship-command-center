// Headless render harness for the visual-identity autopilot.
// Renders an HTML or SVG file (or inline SVG string) to PNG via Playwright chromium,
// with optional grayscale + a proof-sheet mode (hero / 24px / grayscale / 1-bit silhouette).
//
// Usage:
//   node docs/research/render.mjs --in file.html --out out.png --w 240 --h 240 [--gray] [--bg "#1A1A2E"]
//   node docs/research/render.mjs --svg path.svg --proof out-proof.png        // composite proof sheet
//
// Self-contained: only depends on the repo's installed `playwright`.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return def;
  const v = process.argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? true : v;
}

const inFile = arg('in');
const svgFile = arg('svg');
const out = arg('out', 'out.png');
const W = Number(arg('w', 240));
const H = Number(arg('h', 240));
const gray = !!arg('gray', false);
const bg = arg('bg', '#1A1A2E');
const proof = arg('proof');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 });

  // Build the HTML to render.
  let html;
  if (svgFile) {
    const svg = readFileSync(svgFile, 'utf8');
    html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:${bg};}
      .stage{display:flex;align-items:center;justify-content:center;}</style>
      <div class="stage" style="width:${W}px;height:${H}px">${svg}</div>`;
  } else if (inFile) {
    // Render an existing HTML file directly (animated idle previews etc.)
    await page.setViewportSize({ width: W, height: H });
    await page.goto(pathToFileURL(inFile).href, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    if (proof) await makeProof(page);
    else {
      if (gray) await page.addStyleTag({ content: 'html{filter:grayscale(1)}' });
      await page.screenshot({ path: out });
    }
    await browser.close();
    console.log('rendered', out);
    process.exit(0);
  } else {
    throw new Error('need --in <html> or --svg <svg>');
  }

  await page.setViewportSize({ width: W, height: H });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  if (proof) {
    await makeProof(page);
  } else {
    if (gray) await page.addStyleTag({ content: 'html{filter:grayscale(1)}' });
    await page.screenshot({ path: out });
  }
  console.log('rendered', proof || out);

  async function makeProof(p) {
    // Pull the first <svg> markup out of the page and compose a 4-up proof sheet:
    // hero (160) | 24px (boxed, upscaled x4 nearest) | grayscale 160 | 1-bit silhouette 160.
    const svg = await p.evaluate(() => {
      const el = document.querySelector('svg');
      return el ? el.outerHTML : null;
    });
    if (!svg) throw new Error('no <svg> found in page for proof');
    const sheet = `<!doctype html><meta charset="utf-8"><style>
      html,body{margin:0;background:#0d0d16;font-family:ui-monospace,monospace;color:#9aa}
      .row{display:flex;gap:18px;padding:22px;align-items:flex-end}
      .cell{display:flex;flex-direction:column;align-items:center;gap:8px}
      .cap{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7a7f95}
      .box{background:${bg};border:1px solid #232a3f;border-radius:14px;display:flex;align-items:center;justify-content:center}
      .hero{width:160px;height:160px}
      .fav{width:24px;height:24px}
      .favwrap{width:120px;height:120px;image-rendering:pixelated}
      .gray{filter:grayscale(1)}
      .sil{filter:grayscale(1) brightness(0) invert(0) contrast(1)}
      .silmask{filter:grayscale(1) contrast(20) brightness(1.4)}
    </style>
    <div class="row">
      <div class="cell"><div class="box hero">${svg}</div><div class="cap">hero 160</div></div>
      <div class="cell"><div class="box fav">${svg}</div><div class="cap">favicon 24</div></div>
      <div class="cell"><div class="box hero"><div class="favwrap">${svg}</div></div><div class="cap">24→120 nearest</div></div>
      <div class="cell"><div class="box hero gray">${svg}</div><div class="cap">grayscale</div></div>
      <div class="cell"><div class="box hero silmask">${svg}</div><div class="cap">silhouette</div></div>
    </div>`;
    await p.setViewportSize({ width: 860, height: 230 });
    await p.setContent(sheet, { waitUntil: 'networkidle' });
    await p.waitForTimeout(200);
    await p.screenshot({ path: proof });
  }
} finally {
  await browser.close().catch(() => {});
}
