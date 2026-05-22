import { conceptRunner } from "./concept-runner";
import { canaryRunner } from "./canary-runner";
import { productionRunner } from "./production-runner";
import { animationRunner } from "./animation-runner";
import { environmentRunner } from "./environment-runner";
import { uiTextureRunner } from "./ui-texture-runner";
import { cutoutRunner } from "./cutout-runner";
import { strictQaRunner } from "./strict-qa-runner";
import { promotionRunner } from "./promotion-runner";
import { verifyingRunner } from "./verifying-runner";
import type { ArtLabRunner, ArtLabRunnerKind } from "./runner-contract";
import type { ArtLabAssetType } from "../types";

export * from "./runner-contract";

const PRODUCTION_RUNNERS_BY_ASSET_TYPE: Partial<Record<ArtLabAssetType, ArtLabRunner>> = {
  animation: animationRunner,
  environment: environmentRunner,
  "ui-texture": uiTextureRunner,
};

export const ARTLAB_RUNNERS: Record<ArtLabRunnerKind, ArtLabRunner> = {
  concept: conceptRunner,
  canary: canaryRunner,
  production: productionRunner,
  cutout: cutoutRunner,
  "strict-qa": strictQaRunner,
  promotion: promotionRunner,
  verifying: verifyingRunner,
};

export function getRunner(kind: ArtLabRunnerKind, assetType?: ArtLabAssetType): ArtLabRunner {
  if (kind === "production" && assetType) {
    const assetAware = PRODUCTION_RUNNERS_BY_ASSET_TYPE[assetType];
    if (assetAware) return assetAware;
  }
  return ARTLAB_RUNNERS[kind];
}
