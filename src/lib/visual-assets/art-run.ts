import {
  CHARACTER_OUTFIT_VARIANTS,
  CHARACTER_POSES,
  type CharacterFrame,
  type CharacterId,
  type CharacterOutfitVariant,
  type CharacterPose,
  type VisualAsset,
  type VisualAssetId,
  type VisualAssetRenditions,
} from "./types";
import { getCharacterVisualMetadata } from "./characters";
import {
  getExpectedCharacterSpriteSlot,
  getProductionSpriteRenditions,
  getProductionSpriteSrc,
  toApprovedCharacterVisualAsset,
} from "./production-contract";

export const CHARACTER_ART_RUN_SCHEMA_VERSION = "tower-character-art-run-v1";
export const CHARACTER_ART_FINAL_APPROVAL_PHRASE = "approved for app";
export const CHARACTER_ART_MASTER_LONG_EDGE = 4096;

export type CharacterArtRunStatus =
  | "planned"
  | "sources-ingested"
  | "processed"
  | "qa-passed"
  | "final-approved"
  | "promoted";

export type CharacterArtSourceBatchKind =
  | "production-packet"
  | "pose-sheet";

export type CharacterArtHumanApprovalGateId =
  | "initial-character-design"
  | "final-upload-ready-board";

export type CharacterArtInternalStageId =
  | "production-packet"
  | "pose-sheet-generation"
  | "source-ingest"
  | "sheet-splitting"
  | "master-normalization"
  | "derivative-export"
  | "automated-qa"
  | "final-review-board"
  | "promotion";

export interface CharacterArtRunDirectories {
  runRoot: string;
  characterRoot: string;
  incoming: string;
  prompts: string;
  model: string;
  split: string;
  mastersRoot: string;
  qaRoot: string;
  stagedPublicRoot: string;
  reviewRoot: string;
}

export interface CharacterArtHumanApprovalGate {
  id: CharacterArtHumanApprovalGateId;
  status: "pending" | "approved";
  approvedRef?: string;
  requiredPhrase?: typeof CHARACTER_ART_FINAL_APPROVAL_PHRASE;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CharacterArtInternalStage {
  id: CharacterArtInternalStageId;
  label: string;
  owner: "agent" | "script";
  blocksPromotion: boolean;
}

export interface CharacterArtSourceBatch {
  id: string;
  kind: CharacterArtSourceBatchKind;
  required: boolean;
  promptRef: string;
  outfitVariant?: CharacterOutfitVariant;
  expectedArtifacts: string[];
}

export interface CharacterArtRenditionPaths {
  default: {
    src: string;
    width: number;
    height: number;
  };
  retina2x: {
    src: string;
    width: number;
    height: number;
  };
  retina3x: {
    src: string;
    width: number;
    height: number;
  };
}

export interface CharacterArtExpectedSprite {
  id: VisualAssetId;
  characterId: CharacterId;
  outfitVariant: CharacterOutfitVariant;
  pose: CharacterPose;
  promptRef: string;
  sourceFrame: CharacterFrame;
  displayFrame: CharacterFrame;
  masterPath: string;
  qaDarkPath: string;
  qaLightPath: string;
  stagedRenditions: CharacterArtRenditionPaths;
  publicRenditions: VisualAssetRenditions;
}

export interface CharacterArtSourceAsset {
  id: string;
  kind: "identity-reference" | "production-packet" | "pose-sheet" | "individual-sprite" | "final-review-board";
  path: string;
  checksum?: string;
  width?: number;
  height?: number;
  outfitVariant?: CharacterOutfitVariant;
  pose?: CharacterPose;
  grid?: {
    columns: number;
    rows: number;
  };
}

export interface CharacterArtProcessedSprite {
  slotId: VisualAssetId;
  sourcePath: string;
  sourceResolution: CharacterFrame;
  masterPath: string;
  masterResolution: CharacterFrame;
  checksum: string;
  qaStatus: "passed" | "failed";
  issues: string[];
}

export interface CharacterArtQaSummary {
  status: "pending" | "passed" | "failed";
  checkedAt?: string;
  issues: string[];
}

export interface CharacterArtPromotionState {
  status: "not-promoted" | "promoted";
  promotedAt?: string;
}

export interface CharacterArtRun {
  schemaVersion: typeof CHARACTER_ART_RUN_SCHEMA_VERSION;
  runId: string;
  characterId: CharacterId;
  assetVersion: string;
  styleId: "tower-flat-plus-depth-v1";
  status: CharacterArtRunStatus;
  approvedIdentityRef: string;
  directories: CharacterArtRunDirectories;
  humanApprovalGates: CharacterArtHumanApprovalGate[];
  internalStages: CharacterArtInternalStage[];
  sourceBatches: CharacterArtSourceBatch[];
  sourceAssets: CharacterArtSourceAsset[];
  expectedSprites: CharacterArtExpectedSprite[];
  processedSprites: CharacterArtProcessedSprite[];
  qa: CharacterArtQaSummary;
  finalApproval: CharacterArtHumanApprovalGate;
  promotion: CharacterArtPromotionState;
}

export interface CreateCharacterArtRunPlanOptions {
  characterId: CharacterId;
  runId: string;
  approvedIdentityRef: string;
  assetVersion?: string;
}

const INTERNAL_STAGES: CharacterArtInternalStage[] = [
  {
    id: "production-packet",
    label: "Generate turnaround, expressions, and outfit variant sheets",
    owner: "agent",
    blocksPromotion: true,
  },
  {
    id: "pose-sheet-generation",
    label: "Generate one pose sheet per outfit variant",
    owner: "agent",
    blocksPromotion: true,
  },
  {
    id: "source-ingest",
    label: "Copy generated source files into the run ledger",
    owner: "script",
    blocksPromotion: true,
  },
  {
    id: "sheet-splitting",
    label: "Split pose sheets into deterministic slot sources",
    owner: "script",
    blocksPromotion: true,
  },
  {
    id: "master-normalization",
    label: "Normalize transparent masters to the 4K quality ladder",
    owner: "script",
    blocksPromotion: true,
  },
  {
    id: "derivative-export",
    label: "Export normal, @2x, and @3x WebP derivatives",
    owner: "script",
    blocksPromotion: true,
  },
  {
    id: "automated-qa",
    label: "Verify dimensions, alpha, files, prompt refs, and sprite completeness",
    owner: "script",
    blocksPromotion: true,
  },
  {
    id: "final-review-board",
    label: "Build the single final upload-ready board for Armaan",
    owner: "script",
    blocksPromotion: true,
  },
  {
    id: "promotion",
    label: "Promote staged assets into public/art and generated manifest data",
    owner: "script",
    blocksPromotion: true,
  },
];

export function getCharacterArtRunDirectories(
  characterId: CharacterId,
  runId: string,
): CharacterArtRunDirectories {
  const characterRoot = `.artlab/characters/${characterId}`;

  return {
    runRoot: `.artlab/runs/${characterId}/${runId}`,
    characterRoot,
    incoming: `.artlab/runs/${characterId}/${runId}/incoming`,
    prompts: `.artlab/runs/${characterId}/${runId}/prompts`,
    model: `${characterRoot}/model`,
    split: `.artlab/runs/${characterId}/${runId}/split`,
    mastersRoot: `${characterRoot}/masters`,
    qaRoot: `${characterRoot}/qa/${runId}`,
    stagedPublicRoot: `${characterRoot}/staged-public/${runId}`,
    reviewRoot: `.artlab/runs/${characterId}/${runId}/review`,
  };
}

function getStagedRenditions(
  directories: CharacterArtRunDirectories,
  publicRenditions: VisualAssetRenditions,
): CharacterArtRenditionPaths {
  return {
    default: {
      ...publicRenditions.default,
      src: `${directories.stagedPublicRoot}${publicRenditions.default.src}`,
    },
    retina2x: {
      ...publicRenditions.retina2x,
      src: `${directories.stagedPublicRoot}${publicRenditions.retina2x.src}`,
    },
    retina3x: {
      ...publicRenditions.retina3x,
      src: `${directories.stagedPublicRoot}${publicRenditions.retina3x.src}`,
    },
  };
}

export function getExpectedCharacterArtRunSprites(
  characterId: CharacterId,
  runId: string,
): CharacterArtExpectedSprite[] {
  const directories = getCharacterArtRunDirectories(characterId, runId);

  return CHARACTER_OUTFIT_VARIANTS.flatMap((outfitVariant) =>
    CHARACTER_POSES.map((pose) => {
      const slot = getExpectedCharacterSpriteSlot(characterId, pose, outfitVariant);
      const publicRenditions = getProductionSpriteRenditions(characterId, pose, outfitVariant);

      return {
        id: slot.id,
        characterId,
        outfitVariant,
        pose,
        promptRef: slot.promptRef,
        sourceFrame: slot.sourceFrame,
        displayFrame: slot.displayFrame,
        masterPath: `${directories.mastersRoot}/${outfitVariant}/${pose}.png`,
        qaDarkPath: `${directories.qaRoot}/${outfitVariant}/${pose}-dark.png`,
        qaLightPath: `${directories.qaRoot}/${outfitVariant}/${pose}-light.png`,
        stagedRenditions: getStagedRenditions(directories, publicRenditions),
        publicRenditions,
      };
    }),
  );
}

function getCharacterArtSourceBatches(characterId: CharacterId): CharacterArtSourceBatch[] {
  const character = getCharacterVisualMetadata(characterId);

  return [
    {
      id: "production-packet",
      kind: "production-packet",
      required: true,
      promptRef: character.posePackPromptRef,
      expectedArtifacts: ["turnaround", "expression-sheet", "outfit-variant-sheet"],
    },
    ...CHARACTER_OUTFIT_VARIANTS.map((outfitVariant) => ({
      id: `pose-sheet-${outfitVariant}`,
      kind: "pose-sheet" as const,
      required: true,
      promptRef: character.posePackPromptRef,
      outfitVariant,
      expectedArtifacts: CHARACTER_POSES.map((pose) => `${outfitVariant}/${pose}`),
    })),
  ];
}

export function createCharacterArtRunPlan({
  characterId,
  runId,
  approvedIdentityRef,
  assetVersion = `${characterId}-v1`,
}: CreateCharacterArtRunPlanOptions): CharacterArtRun {
  const character = getCharacterVisualMetadata(characterId);
  const finalApproval: CharacterArtHumanApprovalGate = {
    id: "final-upload-ready-board",
    status: "pending",
    requiredPhrase: CHARACTER_ART_FINAL_APPROVAL_PHRASE,
  };

  return {
    schemaVersion: CHARACTER_ART_RUN_SCHEMA_VERSION,
    runId,
    characterId,
    assetVersion,
    styleId: character.styleId,
    status: "planned",
    approvedIdentityRef,
    directories: getCharacterArtRunDirectories(characterId, runId),
    humanApprovalGates: [
      {
        id: "initial-character-design",
        status: "approved",
        approvedRef: approvedIdentityRef,
      },
      finalApproval,
    ],
    internalStages: INTERNAL_STAGES,
    sourceBatches: getCharacterArtSourceBatches(characterId),
    sourceAssets: [
      {
        id: "approved-identity-reference",
        kind: "identity-reference",
        path: approvedIdentityRef,
      },
    ],
    expectedSprites: getExpectedCharacterArtRunSprites(characterId, runId),
    processedSprites: [],
    qa: {
      status: "pending",
      issues: [],
    },
    finalApproval,
    promotion: {
      status: "not-promoted",
    },
  };
}

export function validateCharacterArtRun(run: CharacterArtRun): string[] {
  const issues: string[] = [];
  const expectedHumanGateIds: CharacterArtHumanApprovalGateId[] = [
    "initial-character-design",
    "final-upload-ready-board",
  ];

  if (run.schemaVersion !== CHARACTER_ART_RUN_SCHEMA_VERSION) {
    issues.push(`Unsupported character art run schema: ${run.schemaVersion}`);
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(run.runId)) {
    issues.push("Run id must use lowercase letters, numbers, and hyphens.");
  }

  if (run.humanApprovalGates.map((gate) => gate.id).join("|") !== expectedHumanGateIds.join("|")) {
    issues.push("Character art runs must expose only the initial design and final board human gates.");
  }

  if (run.humanApprovalGates[0]?.status !== "approved" || !run.humanApprovalGates[0]?.approvedRef) {
    issues.push("Initial character design approval must be recorded before a batch run starts.");
  }

  if (run.expectedSprites.length !== CHARACTER_OUTFIT_VARIANTS.length * CHARACTER_POSES.length) {
    issues.push("A character run must resolve exactly 21 expected pose sprites.");
  }

  const expectedSlotIds = new Set(
    getExpectedCharacterArtRunSprites(run.characterId, run.runId).map((sprite) => sprite.id),
  );

  for (const sprite of run.expectedSprites) {
    if (!expectedSlotIds.has(sprite.id)) {
      issues.push(`Unexpected sprite slot in run: ${sprite.id}`);
    }
    if (!sprite.masterPath.startsWith(`.artlab/characters/${run.characterId}/masters/`)) {
      issues.push(`Master path must stay inside .artlab: ${sprite.masterPath}`);
    }
    if (!sprite.stagedRenditions.default.src.startsWith(`.artlab/characters/${run.characterId}/staged-public/`)) {
      issues.push(`Staged rendition must stay outside public/art: ${sprite.stagedRenditions.default.src}`);
    }
    if (!sprite.publicRenditions.default.src.startsWith("/art/")) {
      issues.push(`Public target must be an app art URL: ${sprite.publicRenditions.default.src}`);
    }
  }

  return issues;
}

export function markCharacterArtRunFinalApproved(
  run: CharacterArtRun,
  phrase: string,
  approvedBy = "Armaan",
  approvedAt = new Date().toISOString(),
): CharacterArtRun {
  if (phrase !== CHARACTER_ART_FINAL_APPROVAL_PHRASE) {
    throw new Error(`Final approval requires the exact phrase "${CHARACTER_ART_FINAL_APPROVAL_PHRASE}".`);
  }

  const finalApproval: CharacterArtHumanApprovalGate = {
    id: "final-upload-ready-board",
    status: "approved",
    requiredPhrase: CHARACTER_ART_FINAL_APPROVAL_PHRASE,
    approvedBy,
    approvedAt,
  };

  return {
    ...run,
    status: run.qa.status === "passed" ? "final-approved" : run.status,
    finalApproval,
    humanApprovalGates: run.humanApprovalGates.map((gate) =>
      gate.id === "final-upload-ready-board" ? finalApproval : gate,
    ),
  };
}

export function markCharacterArtRunProcessed(
  run: CharacterArtRun,
  processedSprites: CharacterArtProcessedSprite[],
): CharacterArtRun {
  const expectedIds = new Set(run.expectedSprites.map((sprite) => sprite.id));
  const processedIds = new Set(processedSprites.map((sprite) => sprite.slotId));

  for (const expectedId of expectedIds) {
    if (!processedIds.has(expectedId)) {
      throw new Error(`Processed sprite output missing required slot ${expectedId}.`);
    }
  }

  return {
    ...run,
    status: "processed",
    processedSprites,
  };
}

export function markCharacterArtRunQaPassed(
  run: CharacterArtRun,
  checkedAt = new Date().toISOString(),
): CharacterArtRun {
  const issues = getCharacterArtRunQaIssues(run);

  if (issues.length > 0) {
    throw new Error(`QA cannot pass: ${issues.join(" ")}`);
  }

  return {
    ...run,
    status: "qa-passed",
    qa: {
      status: "passed",
      checkedAt,
      issues: [],
    },
  };
}

export function getCharacterArtRunQaIssues(run: CharacterArtRun): string[] {
  const issues = validateCharacterArtRun(run);

  if (run.processedSprites.length !== run.expectedSprites.length) {
    issues.push("Not every expected sprite has a processed master and derivative set.");
  }

  for (const sprite of run.processedSprites) {
    if (sprite.qaStatus !== "passed") {
      issues.push(`Sprite ${sprite.slotId} has not passed QA.`);
    }
    if (Math.max(sprite.masterResolution.width, sprite.masterResolution.height) < CHARACTER_ART_MASTER_LONG_EDGE) {
      issues.push(`Sprite ${sprite.slotId} master is below the 4K long-edge contract.`);
    }
    if (!sprite.checksum) {
      issues.push(`Sprite ${sprite.slotId} is missing a checksum.`);
    }
  }

  return issues;
}

export function getCharacterArtRunPromotionIssues(run: CharacterArtRun): string[] {
  const issues = getCharacterArtRunQaIssues(run);

  if (run.finalApproval.status !== "approved") {
    issues.push("Final upload-ready board has not been approved with the exact phrase.");
  }

  if (run.qa.status !== "passed") {
    issues.push("Automated art QA has not passed.");
  }

  return issues;
}

export function markCharacterArtRunPromoted(
  run: CharacterArtRun,
  promotedAt = new Date().toISOString(),
): CharacterArtRun {
  const issues = getCharacterArtRunPromotionIssues(run);

  if (issues.length > 0) {
    throw new Error(`Cannot promote character art run: ${issues.join(" ")}`);
  }

  return {
    ...run,
    status: "promoted",
    promotion: {
      status: "promoted",
      promotedAt,
    },
  };
}

export function buildApprovedCharacterVisualAssetsFromRun(run: CharacterArtRun): VisualAsset[] {
  if (run.promotion.status !== "promoted" || !run.promotion.promotedAt) {
    throw new Error("Only promoted character art runs can build approved visual assets.");
  }

  const processedBySlotId = new Map(run.processedSprites.map((sprite) => [sprite.slotId, sprite]));

  return run.expectedSprites.map((sprite) => {
    const expectedSlot = getExpectedCharacterSpriteSlot(
      sprite.characterId,
      sprite.pose,
      sprite.outfitVariant,
    );
    const processed = processedBySlotId.get(sprite.id);

    if (!processed) {
      throw new Error(`Missing processed sprite data for ${sprite.id}.`);
    }

    return {
      ...toApprovedCharacterVisualAsset(expectedSlot),
      sourceRunId: run.runId,
      assetVersion: run.assetVersion,
      checksum: processed.checksum,
      sourceResolution: processed.sourceResolution,
      masterResolution: processed.masterResolution,
      qaStatus: "passed",
      promotionDate: run.promotion.promotedAt,
    };
  });
}

export function getCharacterArtPublicTargetPath(sprite: CharacterArtExpectedSprite): string {
  return `public${getProductionSpriteSrc(sprite.characterId, sprite.pose, sprite.outfitVariant)}`;
}

export function renderCharacterArtRunPromptPacket(run: CharacterArtRun): string {
  const character = getCharacterVisualMetadata(run.characterId);
  const outfitList = CHARACTER_OUTFIT_VARIANTS.join(", ");
  const poseList = CHARACTER_POSES.join(", ");

  return `# ${character.displayName} Batch Art Run

runId: ${run.runId}
characterId: ${run.characterId}
styleId: ${run.styleId}
assetVersion: ${run.assetVersion}
approvedIdentityRef: ${run.approvedIdentityRef}

## Approval Rules

- Human approval gate 1 is already satisfied by the approved identity reference.
- Do not ask Armaan for intermediate outfit, expression, or pose approvals.
- The next human approval is one final upload-ready board using the exact phrase "${CHARACTER_ART_FINAL_APPROVAL_PHRASE}".
- Keep all outputs in .artlab until promotion.

## Required Batch Outputs

- Production packet: turnaround, expression sheet, outfit variant sheet.
- Pose sheets: one sheet each for ${outfitList}.
- Required poses on every outfit sheet: ${poseList}.
- Every pose must preserve the approved identity reference, natural human imperfections, and tower-flat-plus-depth-v1.

## Source Batches

${run.sourceBatches
  .map((batch) => {
    const outfit = batch.outfitVariant ? `\noutfitVariant: ${batch.outfitVariant}` : "";

    return `### ${batch.id}
kind: ${batch.kind}
promptRef: ${batch.promptRef}${outfit}
expectedArtifacts: ${batch.expectedArtifacts.join(", ")}`;
  })
  .join("\n\n")}
`;
}
