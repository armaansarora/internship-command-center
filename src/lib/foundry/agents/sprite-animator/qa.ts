import { evaluateFoundrySpriteIdentityDrift } from "./qa/identity-drift";
import { evaluateFoundrySpriteMotionSmoothness } from "./qa/motion-smoothness";
import { evaluateFoundryLottieValidity } from "./qa/lottie-validity";
import { evaluateFoundryLottieIdentity } from "./qa/lottie-identity";

export type FoundrySpriteQaGate =
  | "identity-drift"
  | "motion-smoothness"
  | "lottie-validity"
  | "lottie-identity";

export type FoundrySpriteQaInput =
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

export interface FoundrySpriteQaReport {
  passed: boolean;
  failedGates: ReadonlyArray<FoundrySpriteQaGate>;
  details: Record<string, unknown>;
}

export async function runFoundrySpriteQa(
  input: FoundrySpriteQaInput,
): Promise<FoundrySpriteQaReport> {
  if (input.kind === "sprite") {
    const identity = await evaluateFoundrySpriteIdentityDrift({
      anchorBytes: input.anchorBytes,
      frames: input.frames,
    });
    const motion = await evaluateFoundrySpriteMotionSmoothness(input.frames);
    const failedGates: FoundrySpriteQaGate[] = [];
    if (!identity.passed) failedGates.push("identity-drift");
    if (!motion.passed) failedGates.push("motion-smoothness");
    return {
      passed: failedGates.length === 0,
      failedGates,
      details: { identity, motion },
    };
  }
  const validity = evaluateFoundryLottieValidity(input.lottieJson, {
    expectedDurationMs: input.expectedDurationMs,
  });
  const identity = await evaluateFoundryLottieIdentity({
    lottieJson: input.lottieJson,
    anchorPerceptualHash: input.anchorPerceptualHash,
  });
  const failedGates: FoundrySpriteQaGate[] = [];
  if (!validity.passed) failedGates.push("lottie-validity");
  if (!identity.passed) failedGates.push("lottie-identity");
  return {
    passed: failedGates.length === 0,
    failedGates,
    details: { validity, identity },
  };
}
