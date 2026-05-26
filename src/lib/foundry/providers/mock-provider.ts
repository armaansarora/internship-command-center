import { createHash } from "node:crypto";
import sharp from "sharp";
import type {
  FoundryImageProvider,
  FoundryImageProviderInput,
  FoundryImageProviderResult,
} from "./types";

export interface CreateMockFoundryImageProviderOptions {
  failOnPromptContains?: string;
  id?: string;
}

function dimensionsFor(aspect: FoundryImageProviderInput["aspectRatio"]): { widthPx: number; heightPx: number } {
  switch (aspect) {
    case "9:16": return { widthPx: 1024, heightPx: 1792 };
    case "16:9": return { widthPx: 1792, heightPx: 1024 };
    case "1:1": return { widthPx: 1024, heightPx: 1024 };
    case "4:3": return { widthPx: 1024, heightPx: 768 };
    case "3:4": return { widthPx: 768, heightPx: 1024 };
  }
}

// Produce a structurally consistent 64x64 PNG: dark backdrop, foreground patch
// with small color jitter per input. Dark backdrop is chosen so the
// cutout-and-feather stage's light-backdrop knockout does NOT trigger
// (keeping perceptual-hash drift low against the anchor). Bytes still differ
// deterministically per (aspect, lane, seed, prompt) tuple via the foreground
// color.
async function buildMockPng(seedKey: string): Promise<Buffer> {
  const digest = createHash("sha256").update(seedKey).digest();
  const fg = {
    r: 180 + (digest[0]! % 16),
    g: 160 + (digest[1]! % 16),
    b: 60 + (digest[2]! % 16),
    alpha: 1,
  };
  const bg = { r: 30, g: 30, b: 50, alpha: 1 };
  const foreground = await sharp({ create: { width: 24, height: 32, channels: 4, background: fg } }).png().toBuffer();
  return await sharp({ create: { width: 64, height: 64, channels: 4, background: bg } })
    .composite([{ input: foreground, top: 16, left: 20 }])
    .png()
    .toBuffer();
}

export function createMockFoundryImageProvider(opts: CreateMockFoundryImageProviderOptions = {}): FoundryImageProvider {
  const id = opts.id ?? "mock-foundry-image";
  return {
    id,
    async generate(input: FoundryImageProviderInput): Promise<FoundryImageProviderResult> {
      if (opts.failOnPromptContains && input.prompt.includes(opts.failOnPromptContains)) {
        throw new Error(`mock provider: prompt contained "${opts.failOnPromptContains}"`);
      }
      const seedKey = `${input.aspectRatio}|${input.laneIndex}|${input.seed ?? 0}|${input.prompt}`;
      const bytes = await buildMockPng(seedKey);
      const dims = dimensionsFor(input.aspectRatio);
      return {
        mode: "mock",
        bytes,
        contentType: "image/png",
        widthPx: dims.widthPx,
        heightPx: dims.heightPx,
        costCents: 0,
        durationMs: 1,
        providerId: id,
        seed: input.seed,
      };
    },
  };
}
