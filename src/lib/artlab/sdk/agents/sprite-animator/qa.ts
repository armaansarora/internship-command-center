import { evaluateArtLabSpriteIdentityDrift } from "./qa/identity-drift";
import { evaluateArtLabSpriteMotionSmoothness } from "./qa/motion-smoothness";
import { evaluateArtLabLottieValidity } from "./qa/lottie-validity";
import { evaluateArtLabLottieIdentity } from "./qa/lottie-identity";

export type ArtLabSpriteQaGate =
  | "identity-drift"
  | "motion-smoothness"
  | "lottie-validity"
  | "lottie-identity";

export type ArtLabSpriteQaInput =
  | {
      kind: "sprite";
      anchorBytes: Buffer;
      frames: ReadonlyArray<Buffer>;
    }
  | {
      kind: "lottie";
      lottieJson: string;
      expectedDurationMs: number;
      /**
       * Critical 3 fix: anchor hash from the source character pack.
       * The lottie identity gate compares embedded image assets against
       * this hash and fails when none land within tolerance. Mandatory.
       */
      anchorPerceptualHash: string;
    };

export interface ArtLabSpriteQaReport {
  passed: boolean;
  failedGates: ReadonlyArray<ArtLabSpriteQaGate>;
  details: Record<string, unknown>;
}

export async function runArtLabSpriteQa(
  input: ArtLabSpriteQaInput,
): Promise<ArtLabSpriteQaReport> {
  if (input.kind === "sprite") {
    const identity = await evaluateArtLabSpriteIdentityDrift({
      anchorBytes: input.anchorBytes,
      frames: input.frames,
    });
    const motion = await evaluateArtLabSpriteMotionSmoothness(input.frames);
    const failedGates: ArtLabSpriteQaGate[] = [];
    if (!identity.passed) failedGates.push("identity-drift");
    if (!motion.passed) failedGates.push("motion-smoothness");
    return {
      passed: failedGates.length === 0,
      failedGates,
      details: { identity, motion },
    };
  }
  const validity = evaluateArtLabLottieValidity(input.lottieJson, {
    expectedDurationMs: input.expectedDurationMs,
  });
  const identity = await evaluateArtLabLottieIdentity({
    lottieJson: input.lottieJson,
    anchorPerceptualHash: input.anchorPerceptualHash,
  });
  const failedGates: ArtLabSpriteQaGate[] = [];
  if (!validity.passed) failedGates.push("lottie-validity");
  if (!identity.passed) failedGates.push("lottie-identity");
  return {
    passed: failedGates.length === 0,
    failedGates,
    details: { validity, identity },
  };
}
