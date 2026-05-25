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
  width?: number;
  height?: number;
}

export async function composeFinalBoard(input: FinalBoardCompositeInput): Promise<Buffer> {
  const tile = 256;
  const cols = Math.min(7, Math.max(1, input.cutoutPaths.length));
  const rows = Math.max(1, Math.ceil(input.cutoutPaths.length / cols));
  const pad = 16;
  const width = input.width ?? cols * tile + (cols + 1) * pad;
  const height = input.height ?? rows * tile + (rows + 1) * pad + 80;
  const tone = paletteFor(1);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${tone.bg}"/>
  <text x="50%" y="40" font-family="Georgia, serif" font-size="28" font-weight="bold" text-anchor="middle" fill="${tone.fg}">${escapeXml(input.characterId.toUpperCase())} — Final Upload-Ready Board</text>
  <text x="50%" y="64" font-family="monospace" font-size="12" text-anchor="middle" fill="${tone.fg}" opacity="0.5">${input.cutoutPaths.length} sprites · ArtLab promotion candidate</text>
</svg>`;
  const tiles: sharp.OverlayOptions[] = [];
  for (let i = 0; i < input.cutoutPaths.length; i += 1) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const left = pad + c * (tile + pad);
    const top = 80 + pad + r * (tile + pad);
    try {
      const resized = await sharp(input.cutoutPaths[i]!).resize(tile, tile, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      tiles.push({ input: resized, left, top });
    } catch {
      // ignore unreadable cutouts; the composite will leave that tile blank
    }
  }
  return sharp(Buffer.from(svg)).composite(tiles).png().toBuffer();
}
