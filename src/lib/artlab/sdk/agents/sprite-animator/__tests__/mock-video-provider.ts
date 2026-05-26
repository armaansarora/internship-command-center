import sharp from "sharp";
import type { ArtLabVideoProvider } from "../video-provider";

export function createArtLabSpriteMockVideoProvider(): ArtLabVideoProvider {
  return {
    async generateFrames(input) {
      const seed = input.seed ?? 0;
      const frames: Buffer[] = [];
      for (let i = 0; i < input.frameCount; i += 1) {
        // Per-frame brightness varies smoothly to mimic an idle breathing loop.
        const phase = (i / Math.max(input.frameCount, 1)) * 2 * Math.PI;
        const swing = Math.round(8 * Math.sin(phase));
        const r = ((seed * 19) & 0xff) + swing;
        const g = ((seed * 37) & 0xff) + swing;
        const b = ((seed * 71) & 0xff) + swing;
        const clamp = (n: number) => Math.max(0, Math.min(255, n));
        const png = await sharp({
          create: {
            width: 32,
            height: 32,
            channels: 4,
            background: { r: clamp(r), g: clamp(g), b: clamp(b), alpha: 1 },
          },
        })
          .png()
          .toBuffer();
        frames.push(png);
      }
      return {
        frames,
        contentType: "image/png",
        mode: "mock",
        costCents: 0,
        durationMs: 1,
      };
    },
  };
}
