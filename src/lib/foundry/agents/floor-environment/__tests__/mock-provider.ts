import sharp from "sharp";
import type { FoundryImageProvider } from "@/lib/foundry/agents/provider-interface";

export function createFoundryFloorMockProvider(): FoundryImageProvider {
  return {
    async generateImage(input) {
      const seed = input.seed ?? 0;
      const r = (seed * 37) & 0xff;
      const g = (seed * 71) & 0xff;
      const b = (seed * 113) & 0xff;
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
