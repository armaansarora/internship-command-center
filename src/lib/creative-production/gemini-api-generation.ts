import { createHash } from "node:crypto";
import { basename, join } from "node:path";

import type { CreativeAssetType } from "./types";
import { createGenerationBudgetLedger } from "./budget-ledger";
import {
  CHARACTER_CUTOUT_THRESHOLDS,
  createDefaultCutoutContract,
  type CutoutContract,
} from "./cutout-compiler";
import {
  CHARACTER_INITIAL_CONCEPT_IDENTITY_VARIATION_RULE,
  CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR,
} from "./initial-concept-style-contract";

export const GEMINI_NANO_BANANA_2_MODEL = "gemini-3.1-flash-image-preview";
export const GEMINI_NANO_BANANA_2_LABEL = "Nano Banana 2";
export const GEMINI_API_DEFAULT_LANE_COUNT = 5;
export const GEMINI_API_DEFAULT_CONCURRENCY = 5;
export const GEMINI_API_DEFAULT_BUDGET_CENTS = 1_000;
export const GEMINI_API_DEFAULT_COST_PER_4K_IMAGE_CENTS = 15.1;
export const GEMINI_API_SECRET_ENV_VARS = ["GEMINI_API_KEY", "GOOGLE_API_KEY"] as const;

export const GEMINI_API_IMAGE_RESOLUTIONS = ["512", "1K", "2K", "4K"] as const;
export type GeminiApiImageResolution = (typeof GEMINI_API_IMAGE_RESOLUTIONS)[number];

export const GEMINI_API_ASPECT_RATIOS = [
  "1:1",
  "1:4",
  "4:1",
  "1:8",
  "8:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;
export type GeminiApiAspectRatio = (typeof GEMINI_API_ASPECT_RATIOS)[number];

export interface GeminiApiBaseSlotInput {
  slotId: string;
  prompt: string;
  targetDirectory: string;
  targetFilename: string;
  reason: string;
  laneId?: string;
  cutout?: CutoutContract;
}

export interface GeminiApiReferenceImage {
  path: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  role: "identity-reference" | "style-reference" | "pose-reference" | "outfit-reference";
}

export interface GeminiApiLane {
  laneId: string;
  laneNumber: number;
  label: string;
  mandate: string;
}

export interface GeminiApiGenerationSlot {
  slotId: string;
  baseSlotId: string;
  laneId: string;
  status: "ready-for-api-generation";
  prompt: string;
  promptHash: string;
  reason: string;
  inboxDirectory: string;
  expectedInboxFile: string;
  targetDirectory: string;
  targetFilename: string;
  request: {
    model: typeof GEMINI_NANO_BANANA_2_MODEL;
    aspectRatio: GeminiApiAspectRatio;
    imageSize: GeminiApiImageResolution;
    responseModalities: readonly ["IMAGE"];
    includeGoogleSearch: false;
  };
  cutout: CutoutContract;
}

export interface GeminiApiGenerationPlan {
  schemaVersion: "tower-gemini-api-generation-plan-v3";
  adapter: "gemini-api";
  status: "ready-for-api-generation" | "blocked-pending-canary";
  phase: "initial-design" | "production-pack";
  billingPolicy: "api-billed-explicitly-approved";
  secretPolicy: {
    keyIsNeverStoredInRepo: true;
    acceptedEnvVars: readonly string[];
    keychainService: "tower-gemini-api-key";
    forbiddenInputs: readonly string[];
  };
  runId: string;
  assetType: CreativeAssetType;
  name: string;
  createdAt: string;
  apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta";
  model: typeof GEMINI_NANO_BANANA_2_MODEL;
  modelLabel: typeof GEMINI_NANO_BANANA_2_LABEL;
  imageSize: GeminiApiImageResolution;
  aspectRatio: GeminiApiAspectRatio;
  laneCount: number;
  maxConcurrency: number;
  costPerImageCents: number;
  budgetCents: number;
  estimatedCostCents: number;
  costGuard: {
    failIfEstimateExceedsBudget: true;
    maxBillableImages: number;
    maxBaseSlotsForInitialDesign: 1;
    defaultInitialDesignTotalImages: typeof GEMINI_API_DEFAULT_LANE_COUNT;
    disableGroundingByDefault: true;
  };
  sourceRequirements: {
    minimumLongEdge?: number;
    minimumShortEdge?: number;
    preferredFormat?: string;
    targetWidth?: number;
    targetHeight?: number;
  };
  cutoutPolicy: {
    compilerStage: "fail-closed-visual-cutout-v1";
    backdropContract: "premium-simple-backdrop-v1";
    edgeRefinementStage: "edge-refinement-v1";
    productionModeOfflineByDefault: true;
    bootstrapMayUseNetwork: true;
    neverUpscaleBeforeCutout: true;
    readinessThreshold: 0.9;
    modelSelection: "per-subject-type-and-topology";
    failureRouting: "named-slot-regeneration-or-improvement-mode";
  };
  referenceImages: GeminiApiReferenceImage[];
  inboxRoot: string;
  planRoot: string;
  firewall?: {
    planRole: "single" | "canary" | "full";
    requiresCanary: boolean;
    canaryGatePath?: string;
    budgetLedgerPath?: string;
    cutoutReadinessPath?: string;
    promptContractHash: string;
    referenceContractHash: string;
    sourceContractHash: string;
  };
  lanes: GeminiApiLane[];
  slots: GeminiApiGenerationSlot[];
  nextCommands: string[];
}

export interface GeminiGenerateContentPayload {
  contents: Array<{
    role: "user";
    parts: Array<
      | { text: string }
      | { inline_data: { mime_type: string; data: string } }
    >;
  }>;
  generationConfig: {
    responseModalities: readonly ["IMAGE"];
    imageConfig: {
      aspectRatio: GeminiApiAspectRatio;
      imageSize: GeminiApiImageResolution;
    };
  };
}

const INITIAL_DESIGN_LANE_MANDATES: readonly Omit<GeminiApiLane, "laneId" | "laneNumber">[] = [
  {
    label: "Warm Classic Concierge",
    mandate: "Explore a grounded, warmly professional lobby concierge with old-hotel charm, soft human imperfection, and an immediately readable hospitality silhouette.",
  },
  {
    label: "Retired Showman",
    mandate: "Explore a more theatrical former-performer energy: expressive posture, memorable proportions, charming eccentricity, and premium Tower restraint without becoming goofy.",
  },
  {
    label: "Neighborhood Elder",
    mandate: "Explore a softer community-anchor Otis: rounder body, lived-in face, gentle patience, familiar front-desk warmth, and natural non-model humanity.",
  },
  {
    label: "Elegant Old Guard",
    mandate: "Explore a sharper old-world professional Otis: polished tailoring, brass details, dignified stance, silver hair, and quiet authority softened by kindness.",
  },
  {
    label: "Cozy Oddball Mentor",
    mandate: "Explore a lovable offbeat mentor Otis: unusual but human silhouette, memorable glasses or small motif, gentle humor, and sprite-ready charm.",
  },
] as const;

const PRODUCTION_PACK_LANE_MANDATES: readonly Omit<GeminiApiLane, "laneId" | "laneNumber">[] = [
  {
    label: "Canonical Safe",
    mandate: "Stay closest to the approved identity and generate the cleanest production-safe version.",
  },
  {
    label: "Human Imperfection",
    mandate: "Protect lived-in warmth, slight asymmetry, natural body shape, and non-model human texture.",
  },
  {
    label: "Mobile Sprite Read",
    mandate: "Optimize silhouette, hands, face, and pose readability at small app sizes.",
  },
  {
    label: "Material And Tailoring",
    mandate: "Sharpen fabric, brass, glasses, props, and premium Tower material restraint.",
  },
  {
    label: "Animation Ready",
    mandate: "Favor pose stability, clean edges, reusable motion states, and CharacterStage readiness.",
  },
] as const;

export function assertGeminiNanoBanana2Model(value: string): typeof GEMINI_NANO_BANANA_2_MODEL {
  if (value !== GEMINI_NANO_BANANA_2_MODEL) {
    throw new Error(`Tower API generation is locked to ${GEMINI_NANO_BANANA_2_MODEL} (${GEMINI_NANO_BANANA_2_LABEL}).`);
  }

  return value;
}

export function assertGeminiApiImageResolution(value: string): GeminiApiImageResolution {
  if (!GEMINI_API_IMAGE_RESOLUTIONS.includes(value as GeminiApiImageResolution)) {
    throw new Error(`--resolution must be one of: ${GEMINI_API_IMAGE_RESOLUTIONS.join(", ")}.`);
  }

  return value as GeminiApiImageResolution;
}

export function assertGeminiApiAspectRatio(value: string): GeminiApiAspectRatio {
  if (!GEMINI_API_ASPECT_RATIOS.includes(value as GeminiApiAspectRatio)) {
    throw new Error(`--aspect-ratio must be one of: ${GEMINI_API_ASPECT_RATIOS.join(", ")}.`);
  }

  return value as GeminiApiAspectRatio;
}

export function assertGeminiApiLaneCount(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > GEMINI_API_DEFAULT_LANE_COUNT) {
    throw new Error(`--lane-count must be an integer from 1 to ${GEMINI_API_DEFAULT_LANE_COUNT}.`);
  }

  return value;
}

export function assertGeminiApiConcurrency(value: number, maxConcurrency = GEMINI_API_DEFAULT_CONCURRENCY): number {
  if (!Number.isInteger(value) || value < 1 || value > maxConcurrency) {
    throw new Error(`--concurrency must be an integer from 1 to ${maxConcurrency}.`);
  }

  return value;
}

export function hashCreativePrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

export function estimateGeminiApiCostCents(input: {
  billableImages: number;
  costPerImageCents?: number;
}): number {
  const costPerImageCents = input.costPerImageCents ?? GEMINI_API_DEFAULT_COST_PER_4K_IMAGE_CENTS;

  return input.billableImages * costPerImageCents;
}

function buildSlotCutoutContract(input: {
  assetType: CreativeAssetType;
  name: string;
  slot: GeminiApiBaseSlotInput;
}): CutoutContract {
  return input.slot.cutout ?? createDefaultCutoutContract({
    assetType: input.assetType,
    name: input.name,
    slotId: input.slot.slotId,
  });
}

function buildCutoutPromptInstructions(contract: CutoutContract): string[] {
  if (!contract.required) return [];

  return [
    `Cutout backdrop contract (${contract.backdropContract}): ${contract.backdropRequirements.join(" ")}`,
    "Keep the full subject and all expected props fully inside frame; leave visible breathing room around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.",
    "Use app-owned shadow discipline: avoid baked contact shadows merging into the body because Tower renders runtime shadows after local cutout.",
    "Use crisp foreground/background separation while preserving natural human imperfections; do not create fake-perfect AI model people.",
  ];
}

function scoreCanarySlot(input: {
  assetType: CreativeAssetType;
  name: string;
  slot: GeminiApiBaseSlotInput;
}): number {
  const contract = buildSlotCutoutContract(input);
  const text = `${input.name} ${input.slot.slotId} ${input.slot.prompt} ${input.slot.reason}`.toLowerCase();
  const tokens = [
    "winter",
    "layer",
    "working",
    "alert",
    "greeting",
    "hands",
    "feet",
    "badge",
    "key",
    "prop",
    "pen",
    "glasses",
    "beard",
    "hair",
  ];
  const tokenScore = tokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0);
  const topologyScore = contract.topologyType === "hair-beard-soft-body-held-props" ? 10 : 0;
  const propsScore = contract.expectedProps.length * 2;

  return topologyScore + propsScore + tokenScore;
}

export function selectProductionCanarySlots(input: {
  assetType: CreativeAssetType;
  name: string;
  slots: GeminiApiBaseSlotInput[];
  canaryBaseSlotId?: string;
}): GeminiApiBaseSlotInput[] {
  if (input.canaryBaseSlotId) {
    const explicit = input.slots.find((slot) => slot.slotId === input.canaryBaseSlotId);

    if (!explicit) {
      throw new Error(`Production firewall could not find explicit canary slot ${input.canaryBaseSlotId}.`);
    }

    return [explicit];
  }

  const byTopology = new Map<string, GeminiApiBaseSlotInput[]>();

  for (const slot of input.slots) {
    const contract = buildSlotCutoutContract({ assetType: input.assetType, name: input.name, slot });

    if (!contract.required) continue;

    const existing = byTopology.get(contract.topologyType) ?? [];
    existing.push(slot);
    byTopology.set(contract.topologyType, existing);
  }

  const selected = Array.from(byTopology.values()).map((slots) =>
    [...slots].sort((left, right) =>
      scoreCanarySlot({ assetType: input.assetType, name: input.name, slot: right }) -
      scoreCanarySlot({ assetType: input.assetType, name: input.name, slot: left }),
    )[0]!,
  );

  return selected.length ? selected : input.slots.slice(0, 1);
}

export function createGeminiGenerateContentPayload(input: {
  prompt: string;
  aspectRatio: GeminiApiAspectRatio;
  imageSize: GeminiApiImageResolution;
  referenceImages?: Array<{ mimeType: string; dataBase64: string }>;
}): GeminiGenerateContentPayload {
  return {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: input.prompt,
          },
          ...(input.referenceImages ?? []).map((reference) => ({
            inline_data: {
              mime_type: reference.mimeType,
              data: reference.dataBase64,
            },
          })),
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: {
        aspectRatio: input.aspectRatio,
        imageSize: input.imageSize,
      },
    },
  };
}

export function createGeminiApiGenerationPlan(input: {
  runId: string;
  assetType: CreativeAssetType;
  name: string;
  planRoot: string;
  inboxRoot: string;
  slots: GeminiApiBaseSlotInput[];
  createdAt?: string;
  model?: string;
  imageSize?: GeminiApiImageResolution;
  aspectRatio?: GeminiApiAspectRatio;
  laneCount?: number;
  maxConcurrency?: number;
  budgetCents?: number;
  costPerImageCents?: number;
  sourceRequirements?: GeminiApiGenerationPlan["sourceRequirements"];
  referenceImages?: GeminiApiReferenceImage[];
  phase?: GeminiApiGenerationPlan["phase"];
  status?: GeminiApiGenerationPlan["status"];
  firewall?: GeminiApiGenerationPlan["firewall"];
}): GeminiApiGenerationPlan {
  if (!input.slots.length) {
    throw new Error("A Gemini API generation plan needs at least one base slot.");
  }

  const model = assertGeminiNanoBanana2Model(input.model ?? GEMINI_NANO_BANANA_2_MODEL);
  const phase = input.phase ?? "initial-design";
  const imageSize = input.imageSize ?? "4K";
  const aspectRatio = input.aspectRatio ?? "9:16";
  const laneCount = assertGeminiApiLaneCount(input.laneCount ?? GEMINI_API_DEFAULT_LANE_COUNT);
  const maxConcurrency = assertGeminiApiConcurrency(input.maxConcurrency ?? (phase === "initial-design" ? laneCount : GEMINI_API_DEFAULT_CONCURRENCY));
  const costPerImageCents = input.costPerImageCents ?? GEMINI_API_DEFAULT_COST_PER_4K_IMAGE_CENTS;
  const budgetCents = input.budgetCents ?? GEMINI_API_DEFAULT_BUDGET_CENTS;
  const referenceImages = input.referenceImages ?? [];

  if (phase === "initial-design" && input.slots.length !== 1) {
    throw new Error("Initial design API runs must use exactly one base slot so five lanes produce five total concept images.");
  }

  if (phase === "initial-design" && referenceImages.length) {
    throw new Error("Initial design API runs cannot include reference images; use prompt-only lanes so concepts are meaningfully different.");
  }

  const laneMandates = phase === "initial-design" ? INITIAL_DESIGN_LANE_MANDATES : PRODUCTION_PACK_LANE_MANDATES;
  const identityInstruction = phase === "initial-design"
    ? "No character identity has been approved yet. Make this lane a genuinely distinct prompt-only interpretation while staying inside the character bible and Tower style."
    : "Keep this lane meaningfully different only inside that mandate. Do not redesign the approved character identity.";
  const sharedInitialConceptLaneInstructions = phase === "initial-design"
    ? [
        `Shared initial-concept lane quality floor: ${CHARACTER_INITIAL_CONCEPT_SHARED_LANE_QUALITY_FLOOR}`,
        `Initial-concept lane variation rule: ${CHARACTER_INITIAL_CONCEPT_IDENTITY_VARIATION_RULE}`,
      ]
    : [];

  const lanes = Array.from({ length: laneCount }, (_, index) => {
    const mandate = laneMandates[index % laneMandates.length]!;
    const laneNumber = index + 1;

    return {
      laneId: `api-lane-${String(laneNumber).padStart(2, "0")}`,
      laneNumber,
      ...mandate,
    };
  });
	  const slots = lanes.flatMap((lane) =>
	    input.slots.map((slot) => {
	      const slotId = `${lane.laneId}__${slot.slotId}`;
	      const cutout = buildSlotCutoutContract({
	        assetType: input.assetType,
	        name: input.name,
	        slot,
	      });
	      const lanePrompt = [
	        slot.prompt,
	        "",
	        ...buildCutoutPromptInstructions(cutout),
	        "",
	        ...sharedInitialConceptLaneInstructions,
	        phase === "initial-design"
	          ? `Unique identity mandate (${lane.label}): ${lane.mandate}`
          : `API lane mandate (${lane.label}): ${lane.mandate}`,
        identityInstruction,
        "Use no external image search or grounding unless the run plan explicitly enables it.",
      ].join("\n");
      const targetFilename = slot.targetFilename.replace(/(\.[^.]+)$/, `__${lane.laneId}$1`);
      const inboxDirectory = join(input.inboxRoot, lane.laneId, slot.slotId);
      const expectedInboxFile = join(inboxDirectory, targetFilename);

      return {
        slotId,
        baseSlotId: slot.slotId,
        laneId: lane.laneId,
        status: "ready-for-api-generation" as const,
        prompt: lanePrompt,
        promptHash: hashCreativePrompt(lanePrompt),
	        reason: `${slot.reason} Lane: ${lane.label}.`,
        inboxDirectory,
        expectedInboxFile,
        targetDirectory: slot.targetDirectory,
        targetFilename,
	        request: {
          model,
          aspectRatio,
          imageSize,
          responseModalities: ["IMAGE"] as const,
	          includeGoogleSearch: false as const,
	        },
	        cutout,
	      };
	    }),
	  );
  const estimatedCostCents = estimateGeminiApiCostCents({
    billableImages: slots.length,
    costPerImageCents,
  });

  if (estimatedCostCents > budgetCents) {
    throw new Error(`Estimated Gemini API cost ${estimatedCostCents} cents exceeds budget ${budgetCents} cents.`);
  }

  return {
    schemaVersion: "tower-gemini-api-generation-plan-v3",
    adapter: "gemini-api",
    status: input.status ?? "ready-for-api-generation",
    phase,
    billingPolicy: "api-billed-explicitly-approved",
    secretPolicy: {
      keyIsNeverStoredInRepo: true,
      acceptedEnvVars: GEMINI_API_SECRET_ENV_VARS,
      keychainService: "tower-gemini-api-key",
      forbiddenInputs: ["command-line API key flags", "checked-in .env files", "run.json key fields"],
    },
    runId: input.runId,
    assetType: input.assetType,
    name: input.name,
    createdAt: input.createdAt ?? new Date().toISOString(),
    apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model,
    modelLabel: GEMINI_NANO_BANANA_2_LABEL,
    imageSize,
    aspectRatio,
    laneCount,
    maxConcurrency,
    costPerImageCents,
    budgetCents,
    estimatedCostCents,
    costGuard: {
      failIfEstimateExceedsBudget: true,
      maxBillableImages: slots.length,
      maxBaseSlotsForInitialDesign: 1,
      defaultInitialDesignTotalImages: GEMINI_API_DEFAULT_LANE_COUNT,
      disableGroundingByDefault: true,
    },
	    sourceRequirements: input.sourceRequirements ?? {
	      minimumLongEdge: CHARACTER_CUTOUT_THRESHOLDS.minimumLongEdge,
	      minimumShortEdge: CHARACTER_CUTOUT_THRESHOLDS.minimumShortEdge,
	      preferredFormat: "png",
	    },
	    cutoutPolicy: {
	      compilerStage: "fail-closed-visual-cutout-v1",
	      backdropContract: "premium-simple-backdrop-v1",
	      edgeRefinementStage: "edge-refinement-v1",
	      productionModeOfflineByDefault: true,
	      bootstrapMayUseNetwork: true,
	      neverUpscaleBeforeCutout: true,
	      readinessThreshold: 0.9,
	      modelSelection: "per-subject-type-and-topology",
	      failureRouting: "named-slot-regeneration-or-improvement-mode",
	    },
	    referenceImages,
    inboxRoot: input.inboxRoot,
    planRoot: input.planRoot,
    firewall: input.firewall ?? {
      planRole: "single",
      requiresCanary: false,
      promptContractHash: hashCreativePrompt(slots.map((slot) => slot.promptHash).join("|")),
      referenceContractHash: hashCreativePrompt(JSON.stringify(referenceImages)),
      sourceContractHash: hashCreativePrompt(JSON.stringify(input.sourceRequirements ?? {})),
    },
    lanes,
    slots,
	    nextCommands: [
	      `npm run art:generate -- cutout-readiness --plan ${join(input.planRoot, "gemini-api-plan.json")}`,
	      `export GEMINI_API_KEY="<set locally, never commit>"`,
	      `npm run art:generate -- run-api --plan ${join(input.planRoot, "gemini-api-plan.json")}`,
	      `npm run art:generate -- cutout-auto --plan ${join(input.planRoot, "gemini-api-plan.json")} --slots <slot-id>`,
	      `npm run art:generate -- cutout-doctor --plan ${join(input.planRoot, "gemini-api-plan.json")} --strict`,
	      `npm run art:generate -- status --bridge ${join(input.planRoot, "gemini-api-plan.json")}`,
	    ],
  };
}

export function createGeminiApiProductionFirewallPlans(input: Parameters<typeof createGeminiApiGenerationPlan>[0] & {
  phase: "production-pack";
  canaryBaseSlotId?: string;
}): {
	  canaryPlan: GeminiApiGenerationPlan;
	  fullPlan: GeminiApiGenerationPlan;
	  canaryGatePath: string;
	  budgetLedgerPath: string;
	  cutoutReadinessPath: string;
	  initialBudgetLedger: ReturnType<typeof createGenerationBudgetLedger>;
	} {
  if (input.phase !== "production-pack") {
    throw new Error("Production firewall plans are only valid for production-pack API runs.");
  }

	  const canarySlots = selectProductionCanarySlots({
	    assetType: input.assetType,
	    name: input.name,
	    slots: input.slots,
	    canaryBaseSlotId: input.canaryBaseSlotId,
	  });

	  if (!canarySlots.length) {
	    throw new Error("Production firewall requires at least one canary slot.");
	  }

  const canaryRoot = join(input.planRoot, "canary");
  const fullRoot = join(input.planRoot, "full");
	  const canaryGatePath = join(input.planRoot, "canary-gate.json");
	  const budgetLedgerPath = join(input.planRoot, "generation-budget-ledger.json");
	  const cutoutReadinessPath = join(input.planRoot, "cutout-readiness.json");
	  const promptContractHash = hashCreativePrompt(input.slots.map((slot) => `${slot.slotId}:${slot.prompt}`).join("|"));
  const referenceContractHash = hashCreativePrompt(JSON.stringify(input.referenceImages ?? []));
  const sourceContractHash = hashCreativePrompt(JSON.stringify(input.sourceRequirements ?? {}));
  const sharedFirewall = {
	    canaryGatePath,
	    budgetLedgerPath,
	    cutoutReadinessPath,
	    promptContractHash,
	    referenceContractHash,
	    sourceContractHash,
  };
  const canaryPlan = createGeminiApiGenerationPlan({
	    ...input,
	    planRoot: canaryRoot,
	    slots: canarySlots,
    laneCount: 1,
    maxConcurrency: 1,
    status: "ready-for-api-generation",
    firewall: {
      ...sharedFirewall,
      planRole: "canary",
      requiresCanary: false,
    },
  });
  const fullPlan = createGeminiApiGenerationPlan({
    ...input,
    planRoot: fullRoot,
    laneCount: input.laneCount ?? 1,
    status: "blocked-pending-canary",
    firewall: {
      ...sharedFirewall,
      planRole: "full",
      requiresCanary: true,
    },
  });

  return {
    canaryPlan,
	    fullPlan,
	    canaryGatePath,
	    budgetLedgerPath,
	    cutoutReadinessPath,
	    initialBudgetLedger: createGenerationBudgetLedger({
      runId: input.runId,
      assetType: input.assetType,
    }),
  };
}

export function renderGeminiApiRunbook(plan: GeminiApiGenerationPlan): string {
  const slotLines = plan.slots
    .map((slot, index) => [
      `## Slot ${index + 1}: ${slot.slotId}`,
      "",
      `Lane: ${slot.laneId}`,
      `Base slot: ${slot.baseSlotId}`,
      `Prompt hash: ${slot.promptHash}`,
      `Expected file: \`${slot.expectedInboxFile}\``,
      "",
      "Prompt:",
      "",
      "```text",
      slot.prompt,
      "```",
    ].join("\n"))
    .join("\n\n");

  return `# Gemini API Generation Runbook

Run: \`${plan.runId}\`
Asset: ${plan.name} (${plan.assetType})
Adapter: Gemini API
Phase: ${plan.phase}
Model: \`${plan.model}\` (${plan.modelLabel})
Resolution: ${plan.imageSize}
Aspect ratio: ${plan.aspectRatio}
Parallel lanes: ${plan.laneCount}
Max concurrency: ${plan.maxConcurrency}
Estimated cost: ${(plan.estimatedCostCents / 100).toFixed(2)} USD
Budget cap: ${(plan.budgetCents / 100).toFixed(2)} USD

## Hard Rules

- API key is read only from ${plan.secretPolicy.acceptedEnvVars.map((name) => `\`${name}\``).join(" or ")} or macOS Keychain service \`${plan.secretPolicy.keychainService}\`.
- Never write API keys into this repo, command flags, run JSON, prompt decks, receipts, or screenshots.
	- This plan disables Google Search grounding by default to avoid surprise search charges and external-source attribution obligations.
	- Initial design plans are exactly five prompt-only concepts: one base slot x five concurrent lanes, with no reference images.
	- Production packs must be generated after design approval with \`--phase production-pack\`.
	- Gemini sources must use the \`${plan.cutoutPolicy.backdropContract}\` contract so the local fail-closed cutout compiler can separate the foreground cleanly.
	- Cutout order is provider source, local cutout, \`${plan.cutoutPolicy.edgeRefinementStage}\`, alpha QA, then master/upscale/derive.
	- Production mode is offline by default for cutout models. Missing cached model evidence blocks the slot instead of downloading silently.
	- Every output lands in the labeled inbox first. Nothing goes to \`public/art\` until QA passes and Armaan says exactly \`approved for app\`.
	- If any output is below the source contract, regenerate that slot only. Do not expand waste.

## Commands

	\`\`\`bash
	npm run art:generate -- cutout-readiness --plan ${join(plan.planRoot, "gemini-api-plan.json")}
	npm run art:generate -- run-api --plan ${join(plan.planRoot, "gemini-api-plan.json")}
	npm run art:generate -- cutout-auto --plan ${join(plan.planRoot, "gemini-api-plan.json")} --slots <slot-id>
	npm run art:generate -- cutout-doctor --plan ${join(plan.planRoot, "gemini-api-plan.json")} --strict
	npm run art:generate -- status --bridge ${join(plan.planRoot, "gemini-api-plan.json")}
	\`\`\`

## Slots

${slotLines}
`;
}

export function createGeminiApiPromptDeck(plan: GeminiApiGenerationPlan): string {
  return plan.slots
    .map((slot, index) => [
      `# ${String(index + 1).padStart(2, "0")} ${slot.slotId}`,
      "",
      `Model: \`${plan.model}\``,
      `Image config: ${slot.request.aspectRatio}, ${slot.request.imageSize}`,
      `Prompt hash: \`${slot.promptHash}\``,
      "",
      "```text",
      slot.prompt,
      "```",
    ].join("\n"))
    .join("\n\n");
}

export function getGeminiApiStatus(input: {
  plan: GeminiApiGenerationPlan;
  existingFiles: readonly string[];
}): { status: "awaiting-generation" | "ready-to-ingest"; readySlots: string[]; pendingSlots: string[] } {
  const existing = new Set(input.existingFiles.map((file) => basename(file)));
  const readySlots: string[] = [];
  const pendingSlots: string[] = [];

  for (const slot of input.plan.slots) {
    if (existing.has(slot.targetFilename)) {
      readySlots.push(slot.slotId);
    } else {
      pendingSlots.push(slot.slotId);
    }
  }

  return {
    status: pendingSlots.length ? "awaiting-generation" : "ready-to-ingest",
    readySlots,
    pendingSlots,
  };
}
