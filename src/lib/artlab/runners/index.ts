import { conceptRunner } from "./concept-runner";
import { canaryRunner } from "./canary-runner";
import { productionRunner } from "./production-runner";
import { cutoutRunner } from "./cutout-runner";
import { strictQaRunner } from "./strict-qa-runner";
import { promotionRunner } from "./promotion-runner";
import { verifyingRunner } from "./verifying-runner";
import type { ArtLabRunner, ArtLabRunnerKind } from "./runner-contract";

export * from "./runner-contract";

export const ARTLAB_RUNNERS: Record<ArtLabRunnerKind, ArtLabRunner> = {
  concept: conceptRunner,
  canary: canaryRunner,
  production: productionRunner,
  cutout: cutoutRunner,
  "strict-qa": strictQaRunner,
  promotion: promotionRunner,
  verifying: verifyingRunner,
};

export function getRunner(kind: ArtLabRunnerKind): ArtLabRunner {
  return ARTLAB_RUNNERS[kind];
}
