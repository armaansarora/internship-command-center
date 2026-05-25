// src/lib/artlab/speed/placeholder-images.ts
//
// Real PNG generation for ArtLab's mock-mode runners. Until the Gemini
// provider is wired into concept-runner / production-runner, every "image"
// produced by the engine is a sharp-rendered placeholder so that downstream
// stages (Telegram board attachments, cutout overlays, public/art promotion)
// have valid PNG bytes to work with. When real generation comes online, swap
// this out for the gemini-adapter call site.

import sharp from "sharp";

export interface PlaceholderImageOptions {
  width?: number;
  height?: number;
  bg?: string;
  fg?: string;
  title: string;
  subtitle?: string;
  laneIndex?: number;
}

const PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: "#1A1A2E", fg: "#C9A84C" },
  { bg: "#2E1A2E", fg: "#E8B8B0" },
  { bg: "#1A2E2E", fg: "#A0E0D0" },
  { bg: "#2E2E1A", fg: "#F0E0A0" },
  { bg: "#1F1F3F", fg: "#E0D0C0" },
];

function paletteFor(laneIndex: number | undefined): { bg: string; fg: string } {
  const idx = ((laneIndex ?? 1) - 1) % PALETTE.length;
  return PALETTE[idx]!;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function renderPlaceholderImage(options: PlaceholderImageOptions): Promise<Buffer> {
  const width = options.width ?? 512;
  const height = options.height ?? 512;
  const tone = options.bg && options.fg ? { bg: options.bg, fg: options.fg } : paletteFor(options.laneIndex);
  const titleText = escapeXml(options.title);
  const subtitleText = options.subtitle ? escapeXml(options.subtitle) : "";
  const laneBadge = options.laneIndex !== undefined ? `#${options.laneIndex}` : "";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${tone.bg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" fill="none" stroke="${tone.fg}" stroke-width="2" opacity="0.5"/>
  <text x="50%" y="38%" font-family="Georgia, serif" font-size="42" font-weight="bold" text-anchor="middle" fill="${tone.fg}" letter-spacing="3">ARTLAB</text>
  <text x="50%" y="48%" font-family="Helvetica, sans-serif" font-size="${Math.max(20, Math.min(36, Math.round(width / Math.max(8, titleText.length / 1.5))))}" text-anchor="middle" fill="${tone.fg}" opacity="0.9">${titleText}</text>
  ${subtitleText ? `<text x="50%" y="56%" font-family="Helvetica, sans-serif" font-size="18" text-anchor="middle" fill="${tone.fg}" opacity="0.7">${subtitleText}</text>` : ""}
  ${laneBadge ? `<text x="50%" y="72%" font-family="Helvetica, sans-serif" font-size="80" font-weight="bold" text-anchor="middle" fill="${tone.fg}" opacity="0.35">${laneBadge}</text>` : ""}
  <text x="50%" y="92%" font-family="monospace" font-size="11" text-anchor="middle" fill="${tone.fg}" opacity="0.4">placeholder · sharp render · no provider</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export interface FinalBoardCompositeInput {
  cutoutPaths: string[];
  characterId: string;
  displayName?: string;
  title?: string;
  width?: number;
  height?: number;
}

export async function composeFinalBoard(input: FinalBoardCompositeInput): Promise<Buffer> {
  // Tower palette: deep navy + warm gold. Larger tiles + per-tile soft card so
  // each sprite reads cleanly against a lighter card chip rather than fading
  // into the dark composite background.
  const tile = 320;
  const cols = Math.min(7, Math.max(1, input.cutoutPaths.length));
  const rows = Math.max(1, Math.ceil(input.cutoutPaths.length / cols));
  const pad = 22;
  const headerH = 110;
  const footerH = 56;
  const width = input.width ?? cols * tile + (cols + 1) * pad;
  const height = input.height ?? rows * tile + (rows + 1) * pad + headerH + footerH;
  const titleText = escapeXml(input.displayName ?? input.characterId.toUpperCase());
  const subtitleText = escapeXml(input.title ?? `${input.cutoutPaths.length} upload-ready production sprites`);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#101226" stop-opacity="1"/>
      <stop offset="100%" stop-color="#1A1A2E" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="card" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F4E8D3" stop-opacity="1"/>
      <stop offset="100%" stop-color="#E5D6B8" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="50%" y="56" font-family="Georgia, serif" font-size="38" font-weight="bold" text-anchor="middle" fill="#C9A84C" letter-spacing="1">${titleText}</text>
  <text x="50%" y="86" font-family="Helvetica, sans-serif" font-size="14" text-anchor="middle" fill="#C9A84C" opacity="0.72">${subtitleText}</text>
  <line x1="${pad * 2}" y1="${headerH - 6}" x2="${width - pad * 2}" y2="${headerH - 6}" stroke="#C9A84C" stroke-width="1" opacity="0.18"/>
  ${cardRectsSvg(input.cutoutPaths.length, cols, tile, pad, headerH)}
  <text x="50%" y="${height - 22}" font-family="monospace" font-size="11" text-anchor="middle" fill="#C9A84C" opacity="0.45">artlab · upload-ready · ${new Date().toISOString().slice(0, 10)}</text>
</svg>`;
  const tiles: sharp.OverlayOptions[] = [];
  for (let i = 0; i < input.cutoutPaths.length; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const left = pad + c * (tile + pad);
    const top = headerH + pad + r * (tile + pad);
    try {
      // Crop to alpha-channel bounding box ourselves (sharp's `trim` confuses
      // dark-body pixels with the alpha=0 background when an explicit
      // background colour is given, so we read the alpha buffer + compute the
      // bounding box of opaque pixels directly).
      const meta = await sharp(input.cutoutPaths[i]!).metadata();
      const W = meta.width ?? 0;
      const H = meta.height ?? 0;
      const decoded = await sharp(input.cutoutPaths[i]!).ensureAlpha().raw().toBuffer();
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const a = decoded[(y * W + x) * 4 + 3]!;
          if (a > 24) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const cropW = Math.max(1, maxX - minX + 1);
      const cropH = Math.max(1, maxY - minY + 1);
      const cropped = await sharp(input.cutoutPaths[i]!)
        .extract({ left: minX, top: minY, width: cropW, height: cropH })
        .resize(tile - 16, tile - 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      tiles.push({ input: cropped, left: left + 8, top: top + 8 });
    } catch {
      // ignore unreadable cutouts; the composite leaves the card empty
    }
  }
  return sharp(Buffer.from(svg)).composite(tiles).png().toBuffer();
}

function cardRectsSvg(count: number, cols: number, tile: number, pad: number, headerH: number): string {
  const rects: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const left = pad + c * (tile + pad);
    const top = headerH + pad + r * (tile + pad);
    rects.push(`<rect x="${left}" y="${top}" width="${tile}" height="${tile}" rx="14" ry="14" fill="url(#card)" opacity="0.96"/>`);
  }
  return rects.join("\n  ");
}
