import type { FoundryLottieProvider } from "../lottie-provider";

export function createFoundrySpriteMockLottieProvider(): FoundryLottieProvider {
  return {
    async authorLottie(input) {
      const fr = 30;
      const opFrames = Math.max(1, Math.round((input.durationMs / 1000) * fr));
      const seed = input.seed ?? 0;
      const json = {
        v: "5.7.0",
        fr,
        ip: 0,
        op: opFrames,
        w: 200,
        h: 200,
        nm: `${input.action}-${input.motionCurve}`,
        ddd: 0,
        assets: [],
        layers: [
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
        ],
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
