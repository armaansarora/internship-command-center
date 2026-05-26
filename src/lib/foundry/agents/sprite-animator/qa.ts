import { evaluateFoundrySpriteIdentityDrift } from "./qa/identity-drift";
import { evaluateFoundrySpriteMotionSmoothness } from "./qa/motion-smoothness";
import { evaluateFoundryLottieValidity } from "./qa/lottie-validity";

export type FoundrySpriteQaGate =
  | "identity-drift"
  | "motion-smoothness"
  | "lottie-validity";

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
  const lottie = evaluateFoundryLottieValidity(input.lottieJson, {
    expectedDurationMs: input.expectedDurationMs,
  });
  return {
    passed: lottie.passed,
    failedGates: lottie.passed ? [] : ["lottie-validity"],
    details: { lottie },
  };
}
