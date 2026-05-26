import sharp from "sharp";
import type { ArtLabImageProvider } from "@/lib/artlab/sdk/agents/provider-interface";

export function createArtLabFloorMockProvider(): ArtLabImageProvider {
  return {
    async generateImage(input) {
      const seed = input.seed ?? 0;
      const r = 20 + ((seed * 37) & 0x1f);
      const g = 20 + ((seed * 71) & 0x1f);
      const b = 35 + ((seed * 113) & 0x1f);
      const png = await sharp({
        create: {
          width: 64,
          height: 36,
          channels: 4,
          background: { r, g, b, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      return {
        mode: "mock",
        bytes: png,
        contentType: "image/png",
        costCents: 0,
        durationMs: 1,
      };
    },
  };
}
