import sharp from "sharp";

export interface FoundryNormalMapOptions {
  strength: number;
}

export async function extractFoundryNormalMap(
  source: Buffer,
  options: FoundryNormalMapOptions,
): Promise<Buffer> {
  if (options.strength < 0 || options.strength > 1) {
    throw new Error(
      `foundry/ui-texture: strength out of [0,1]: ${options.strength}`,
    );
  }
  // Approximate a tangent-space normal map: derive height from greyscale,
  // emboss to produce gradient, then map back into 0–255 RGB where flat
  // = (128, 128, 255). Strength scales the contrast of the gradient pass.
  const greyscale = await sharp(source).greyscale().raw().toBuffer({
    resolveWithObject: true,
  });
  const { data, info } = greyscale;
  const out = Buffer.alloc(info.width * info.height * 3);
  const k = options.strength;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const idx = y * info.width + x;
      const xPrev = data[idx - 1] ?? data[idx]!;
      const xNext = data[idx + 1] ?? data[idx]!;
      const yPrev = data[idx - info.width] ?? data[idx]!;
      const yNext = data[idx + info.width] ?? data[idx]!;
      const dx = (xNext - xPrev) * k;
      const dy = (yNext - yPrev) * k;
      const r = Math.max(0, Math.min(255, 128 - Math.round(dx)));
      const g = Math.max(0, Math.min(255, 128 - Math.round(dy)));
      const b = 255;
      const i3 = idx * 3;
      out[i3] = r;
      out[i3 + 1] = g;
      out[i3 + 2] = b;
    }
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 3 },
  })
    .png()
    .toBuffer();
}
