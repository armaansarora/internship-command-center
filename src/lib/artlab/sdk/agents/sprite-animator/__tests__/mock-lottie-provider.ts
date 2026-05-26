import type { ArtLabLottieProvider } from "../lottie-provider";

export function createArtLabSpriteMockLottieProvider(): ArtLabLottieProvider {
  return {
    async authorLottie(input) {
      const fr = 30;
      const opFrames = Math.max(1, Math.round((input.durationMs / 1000) * fr));
      const seed = input.seed ?? 0;
      // Critical 3: embed the reference image (when provided) as an
      // asset so the lottie-identity gate has something to verify.
      const assets =
        input.referenceImageBytes !== undefined
          ? [
              {
                id: "image_0",
                p: `data:image/png;base64,${input.referenceImageBytes.toString("base64")}`,
                w: 32,
                h: 32,
                e: 1,
              },
            ]
          : [];
      const layers: Array<Record<string, unknown>> = [
        {
          ind: 1,
          ty: 4,
          nm: "circle",
          sr: 1,
          ks: {
            o: { a: 0, k: 100, ix: 11 },
            r: { a: 0, k: seed % 360, ix: 10 },
            p: { a: 0, k: [100, 100, 0], ix: 2 },
            s: { a: 0, k: [100, 100, 100], ix: 6 },
          },
          ip: 0,
          op: opFrames,
          st: 0,
          bm: 0,
        },
      ];
      if (assets.length > 0) {
        layers.push({
          ind: 2,
          ty: 2,
          nm: "character_image",
          refId: assets[0]!.id,
          sr: 1,
          ks: {
            o: { a: 0, k: 100 },
            p: { a: 0, k: [100, 100, 0] },
            s: { a: 0, k: [100, 100, 100] },
          },
          ip: 0,
          op: opFrames,
          st: 0,
          bm: 0,
        });
      }
      const json = {
        v: "5.7.0",
        fr,
        ip: 0,
        op: opFrames,
        w: 200,
        h: 200,
        nm: `${input.action}-${input.motionCurve}`,
        ddd: 0,
        assets,
        layers,
      };
      return {
        lottieJson: JSON.stringify(json),
        mode: "mock",
        costCents: 0,
        durationMs: 1,
      };
    },
  };
}
