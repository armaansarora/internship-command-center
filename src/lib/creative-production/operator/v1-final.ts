import { execFileSync } from "node:child_process";
import { appendFile, cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import {
  createCreativeBudgetLedger,
} from "../budget";
import {
  createGeminiApiGenerationPlan,
  createGeminiApiPromptDeck,
  GEMINI_API_DEFAULT_BUDGET_CENTS,
  GEMINI_API_DEFAULT_CONCURRENCY,
  GEMINI_API_DEFAULT_LANE_COUNT,
  GEMINI_NANO_BANANA_2_MODEL,
  renderGeminiApiRunbook,
  type GeminiApiGenerationPlan,
} from "../gemini-api-generation";
import {
  evaluateTowerCharacterConceptPromptContract,
  type TowerCharacterConceptPromptQaFailure,
} from "../initial-concept-style-contract";
import {
  createHousekeepingEntry,
  validateRequiredPhaseGates,
} from "../housekeeping";
import {
  createImprovementEntry,
  writeJsonlEntry,
} from "../improvement";
import { buildFinalUploadReadyReviewBoard, buildInitialConceptReviewBoard } from "../review";
import type { CreativeAssetType } from "../types";
import { renderCreativeRunStatusLines } from "./status-summary";
import { prepareCharacterSpriteAsset } from "../../visual-assets/art-processing";
import { SEASON_ONE_CHARACTER_METADATA } from "../../visual-assets/characters";
import {
  getExpectedCharacterSpriteSlot,
  toApprovedCharacterVisualAsset,
} from "../../visual-assets/production-contract";
import type {
  CharacterId,
  CharacterOutfitVariant,
  CharacterPose,
  VisualAsset,
} from "../../visual-assets/types";

const APPROVED_CHARACTER_ASSETS_MANIFEST = "src/lib/visual-assets/approved-character-assets.generated.json";

export const CREATIVE_ENGINE_CORE_PHASES = [
  "requested",
  "routed",
  "brief-confirming",
  "direction-planned",
  "awaiting-initial-approval",
  "direction-generating",
  "direction-review-ready",
  "initial-direction-approved",
  "production-planned",
  "canary-running",
  "canary-passed",
  "full-pack-running",
  "repairing",
  "strict-qa",
  "final-board-ready",
  "integration-briefing",
  "app-preview-ready",
  "approved-for-app",
  "promoted",
  "integrated",
  "browser-verified",
  "closed",
] as const;

export const CREATIVE_ENGINE_BLOCKING_PHASES = [
  "needs-human",
  "budget-blocked",
  "provider-blocked",
  "repair-required",
  "style-failed",
  "upgrade-required",
  "unsafe-to-run",
] as const;

export type CreativeEngineCorePhase = (typeof CREATIVE_ENGINE_CORE_PHASES)[number];
export type CreativeEngineBlockingPhase = (typeof CREATIVE_ENGINE_BLOCKING_PHASES)[number];
export type CreativeEnginePhase = CreativeEngineCorePhase | CreativeEngineBlockingPhase;

export interface CreativeHumanActionPacket {
  schemaVersion: "tower-creative-human-action-v1";
  runId: string;
  phase: CreativeEnginePhase;
  whatIUnderstood: string;
  recommendation: string;
  costImpact: {
    estimatedCents: number;
    reservedCents: number;
    additionalApprovalRequired: boolean;
  };
  risk: string;
  allowedResponses: string[];
  recommendedResponse: string;
  createdAt: string;
}

export interface CreativeProgressFile {
  schemaVersion: "tower-creative-progress-v1";
  runId: string;
  phase: CreativeEnginePhase;
  runningSlots: string[];
  completed: number;
  failed: number;
  repairing: number;
  pending: number;
  spendSoFarCents: number;
  reservedSpendCents: number;
  etaSeconds?: number;
  activeLocks: string[];
  nextAutomaticStep: string;
  updatedAt: string;
}

export interface CreativeEngineRunState {
  schemaVersion: "tower-creative-run-state-v1-final";
  runId: string;
  assetType: CreativeAssetType;
  name: string;
  request: string;
  phase: CreativeEnginePhase;
  gates: ["initial-design-direction", "final-app-promotion"];
  promotionPhrase: "approved for app";
  publicArtWritesAllowed: boolean;
  executionMode?: "normal" | "dry-run";
  providerMode?: "local-mock";
  stateRoot: string;
  runRoot: string;
  createdAt: string;
  updatedAt: string;
  nextLegalAction?: string;
  approvedInitialConcept?: {
    slotId: string;
    localImagePath: string;
    absoluteImagePath: string;
    actionManifestPath: string;
    boardPath: string;
    approvedAt: string;
    response: string;
  };
  productionEvidence?: Record<string, unknown>;
  importedFrom?: {
    legacyRunId: string;
    legacyState?: string;
    staleOrConflictingState: boolean;
    artifactsPreserved: string[];
  };
}

export interface CreativeRunArtifacts {
  runRoot: string;
  state: CreativeEngineRunState;
  progress: CreativeProgressFile;
  humanAction?: CreativeHumanActionPacket;
}

export interface CreativeInitialConceptRunnerInput {
  runRoot: string;
  plan: GeminiApiGenerationPlan;
  planPath: string;
  packetPath: string;
  directivePath: string;
}

export type CreativeInitialConceptRunner = (input: CreativeInitialConceptRunnerInput) => Promise<void>;

export interface CreativeProductionRunnerInput {
  runRoot: string;
  plan: GeminiApiGenerationPlan;
  planPath: string;
  directivePath: string;
}

export type CreativeProductionRunner = (input: CreativeProductionRunnerInput) => Promise<void>;

interface CreativeInitialConceptQaSlot {
  slotId: string;
  status: "passed" | "failed";
  failures: string[];
  warnings: string[];
}

interface CreativeInitialConceptQaReport {
  schemaVersion: "tower-creative-initial-concept-qa-v1";
  runId: string;
  assetType: CreativeAssetType;
  status: "passed" | "failed";
  checkedAt: string;
  gates: {
    styleCoherence: "passed" | "failed";
    designDiversity: "passed" | "failed";
  };
  repeatedFailureCodes: string[];
  failures: TowerCharacterConceptPromptQaFailure[];
  slots: CreativeInitialConceptQaSlot[];
}

interface InitialConceptActionManifestFile {
  localImagePaths?: string[];
  actions?: Array<{
    id?: string;
    slots?: string[];
  }>;
}

interface LegacyApiRunState {
  status?: string;
  selected?: Array<{ slotId?: string }>;
  skipped?: Array<{ slotId?: string; reason?: string }>;
  failures?: unknown[];
  blockers?: string[];
  budget?: {
    projectedCostCents?: number;
    billableNewImages?: number;
    billablePriorImages?: number;
    budgetCents?: number;
  };
}

export const CHARACTER_PRODUCTION_OUTFIT_VARIANTS = [
  {
    id: "regular",
    label: "Regular",
    prompt: "approved base outfit, closest to the winning concept, with no costume redesign",
  },
  {
    id: "summer-light",
    label: "Summer Light",
    prompt: "lighter warm-weather edit of the approved outfit, fewer layers, same identity and role read",
  },
  {
    id: "winter-layered",
    label: "Winter Layered",
    prompt: "heavier cold-weather edit of the approved outfit, layered but still app-readable",
  },
] as const;

export const CHARACTER_PRODUCTION_POSE_STATES = [
  {
    id: "idle",
    label: "Idle",
    prompt: "neutral composed full-body stance, calm face, ready for default app presence",
  },
  {
    id: "greeting",
    label: "Greeting",
    prompt: "controlled welcoming expression and restrained open gesture, approachable without losing authority",
  },
  {
    id: "listening",
    label: "Listening",
    prompt: "attentive listening expression, slight forward focus, hands contained and readable",
  },
  {
    id: "thinking",
    label: "Thinking",
    prompt: "strategic reflective expression, subtle hand or chin-adjacent gesture without obscuring the face",
  },
  {
    id: "talking",
    label: "Talking",
    prompt: "mid-explanation expression, one clean conversational gesture, mouth shape suitable for dialogue state",
  },
  {
    id: "alert",
    label: "Alert",
    prompt: "decisive high-priority attention, sharper posture, focused eyes, no panic or melodrama",
  },
  {
    id: "working",
    label: "Working",
    prompt: "active executive work state with a small held folder, tablet, or brief as a cutout-safe prop",
  },
] as const;

const CHARACTER_PRODUCTION_SLOT_COUNT =
  CHARACTER_PRODUCTION_OUTFIT_VARIANTS.length * CHARACTER_PRODUCTION_POSE_STATES.length;

type CharacterProductionOutfit = (typeof CHARACTER_PRODUCTION_OUTFIT_VARIANTS)[number];
type CharacterProductionPose = (typeof CHARACTER_PRODUCTION_POSE_STATES)[number];

interface ProductionBaseSlotSpec {
  slotId: string;
  targetFilename: string;
  reason: string;
  outfitVariant?: CharacterProductionOutfit["id"];
  poseState?: CharacterProductionPose["id"];
  slotPrompt?: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "creative-run";
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferAssetType(request: string): CreativeAssetType {
  const normalized = request.toLowerCase();

  if (/\b(otis|mara|rafe|character|cast|person|concierge|ceo|cro|pose|outfit|sprite|turnaround|expression)\b/.test(normalized)) return "character";
  if (/\b(shader|webgl|webgpu)\b/.test(normalized)) return "shader";
  if (/\b(animation|motion|loop|animated)\b/.test(normalized)) return "animation";
  if (/\b(buttons?|ui|controls?|panels?|textures?)\b/.test(normalized)) return "ui-texture";
  if (/\b(background|environment|room|floor|screen)\b/.test(normalized)) return "environment";
  if (/\b(prop|object|item|bell|keycard)\b/.test(normalized)) return "prop";
  if (/\b(icon|symbol|glyph)\b/.test(normalized)) return "icon-system";
  if (/\b(hero|marketing|promo)\b/.test(normalized)) return "marketing-hero";
  if (/\b(scene|composition|moment)\b/.test(normalized)) return "scene";

  return "character";
}

function inferName(request: string, assetType: CreativeAssetType): string {
  if (assetType === "character") {
    const matchedCharacter = inferSeasonOneCharacterName(request);

    if (matchedCharacter) return matchedCharacter;
  }

  return titleCase(request.replace(/[.?!]+$/g, "").trim()) || titleCase(assetType);
}

function inferSeasonOneCharacterName(request: string): string | undefined {
  const titleTokens = new Set(["dr", "dr."]);
  const displayToken = (displayName: string): string => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    const firstNameIndex = parts.findIndex((part) => !titleTokens.has(part.toLowerCase()));

    return parts[firstNameIndex === -1 ? 0 : firstNameIndex] ?? displayName;
  };
  const wordPattern = (value: string): RegExp => new RegExp(`\\b${escapeRegExp(value)}\\b(?!-compatible)`, "i");
  let bestMatch: { name: string; score: number; index: number } | undefined;

  SEASON_ONE_CHARACTER_METADATA.forEach((character, index) => {
    const firstName = displayToken(character.displayName);
    const lastName = character.displayName.split(/\s+/).filter(Boolean).at(-1) ?? character.displayName;
    const signals: Array<{ score: number; pattern: RegExp }> = [
      { score: 100, pattern: wordPattern(character.displayName) },
      { score: 95, pattern: new RegExp(`\\b(?:character\\s*id|character-id|character_id)\\s*:?\\s*${escapeRegExp(character.id)}\\b`, "i") },
      { score: 90, pattern: wordPattern(character.id) },
      { score: 85, pattern: wordPattern(character.shortLabel) },
      { score: 75, pattern: wordPattern(character.title) },
      { score: 60, pattern: wordPattern(firstName) },
      { score: 45, pattern: wordPattern(lastName) },
    ];
    const match = signals.find((signal) => signal.pattern.test(request));

    if (!match) return;
    if (!bestMatch || match.score > bestMatch.score || (match.score === bestMatch.score && index < bestMatch.index)) {
      bestMatch = { name: firstName, score: match.score, index };
    }
  });

  return bestMatch?.name;
}

function assetRootName(assetType: CreativeAssetType): string {
  const roots: Record<CreativeAssetType, string> = {
    character: "characters",
    environment: "environments",
    prop: "props",
    "ui-texture": "ui-assets",
    animation: "animations",
    scene: "scenes",
    "icon-system": "icons",
    "marketing-hero": "marketing",
    shader: "shaders",
  };

  return roots[assetType];
}

function estimateInitialCostCents(assetType: CreativeAssetType): number {
  return assetType === "character" ? 100 : 50;
}

function initialPendingSlots(assetType: CreativeAssetType): number {
  return assetType === "character" ? 5 : GEMINI_API_DEFAULT_LANE_COUNT;
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;

  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, path);
}

async function appendEvent(runRoot: string, event: Record<string, unknown>): Promise<void> {
  await appendFile(join(runRoot, "events.jsonl"), `${JSON.stringify(event)}\n`);
}

function createHumanAction(input: {
  runId: string;
  phase: CreativeEnginePhase;
  whatIUnderstood: string;
  recommendation: string;
  estimatedCents: number;
  reservedCents?: number;
  risk: string;
  allowedResponses: string[];
  recommendedResponse: string;
  now: Date;
}): CreativeHumanActionPacket {
  return {
    schemaVersion: "tower-creative-human-action-v1",
    runId: input.runId,
    phase: input.phase,
    whatIUnderstood: input.whatIUnderstood,
    recommendation: input.recommendation,
    costImpact: {
      estimatedCents: input.estimatedCents,
      reservedCents: input.reservedCents ?? 0,
      additionalApprovalRequired: false,
    },
    risk: input.risk,
    allowedResponses: input.allowedResponses,
    recommendedResponse: input.recommendedResponse,
    createdAt: input.now.toISOString(),
  };
}

function createProgress(input: {
  runId: string;
  phase: CreativeEnginePhase;
  completed?: number;
  failed?: number;
  repairing?: number;
  pending?: number;
  runningSlots?: string[];
  spendSoFarCents?: number;
  reservedSpendCents?: number;
  activeLocks?: string[];
  nextAutomaticStep: string;
  now: Date;
}): CreativeProgressFile {
  return {
    schemaVersion: "tower-creative-progress-v1",
    runId: input.runId,
    phase: input.phase,
    runningSlots: input.runningSlots ?? [],
    completed: input.completed ?? 0,
    failed: input.failed ?? 0,
    repairing: input.repairing ?? 0,
    pending: input.pending ?? 0,
    spendSoFarCents: input.spendSoFarCents ?? 0,
    reservedSpendCents: input.reservedSpendCents ?? 0,
    activeLocks: input.activeLocks ?? [],
    nextAutomaticStep: input.nextAutomaticStep,
    updatedAt: input.now.toISOString(),
  };
}

async function writeArtifacts(artifacts: CreativeRunArtifacts, eventName: string): Promise<void> {
  await writeJson(join(artifacts.runRoot, "run-state.json"), artifacts.state);
  await writeJson(join(artifacts.runRoot, "progress.json"), artifacts.progress);
  if (artifacts.humanAction) {
    await writeJson(join(artifacts.runRoot, "human-action.json"), artifacts.humanAction);
  } else {
    await rm(join(artifacts.runRoot, "human-action.json"), { force: true });
  }
  await appendEvent(artifacts.runRoot, {
    schemaVersion: "tower-creative-event-v1",
    event: eventName,
    runId: artifacts.state.runId,
    phase: artifacts.state.phase,
    recordedAt: artifacts.state.updatedAt,
  });
}

export async function startCreativeProductionRun(input: {
  stateRoot?: string;
  request: string;
  runId?: string;
  dryRun?: boolean;
  now?: Date;
}): Promise<CreativeRunArtifacts> {
  const now = input.now ?? new Date();
  const request = input.request.trim();

  if (!request) throw new Error("A creative request is required.");

  const stateRoot = input.stateRoot ?? ".artlab/studio";
  const assetType = inferAssetType(request);
  const name = inferName(request, assetType);
  const runId = input.runId ?? `${now.toISOString().slice(0, 10)}-${slugify(name)}`;
  const runRoot = join(stateRoot, assetRootName(assetType), runId);
  const estimatedCents = estimateInitialCostCents(assetType);
  const phase: CreativeEnginePhase = input.dryRun ? "awaiting-initial-approval" : "direction-generating";
  const state: CreativeEngineRunState = {
    schemaVersion: "tower-creative-run-state-v1-final",
    runId,
    assetType,
    name,
    request,
    phase,
    gates: ["initial-design-direction", "final-app-promotion"],
    promotionPhrase: "approved for app",
    publicArtWritesAllowed: false,
    ...(input.dryRun ? {
      executionMode: "dry-run",
      providerMode: "local-mock",
    } : {}),
    stateRoot,
    runRoot,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const humanAction = input.dryRun
    ? createHumanAction({
        runId,
        phase: state.phase,
        whatIUnderstood: `You want a Tower ${assetType} run for ${name} from: "${request}".`,
        recommendation: "This is a dry-run mock review. Approve or revise the initial direction to test the durable operator flow; no provider requests or public-art writes will run.",
        estimatedCents,
        risk: "Low. This creates mock state in .artlab only, makes no provider requests, reserves no budget, and keeps public/art plus production manifests locked.",
        allowedResponses: ["approve direction", "revise: <plain English change>", "reject/archive"],
        recommendedResponse: "approve direction",
        now,
      })
    : undefined;
  const progress = createProgress({
    runId,
    phase: state.phase,
    pending: initialPendingSlots(assetType),
    spendSoFarCents: 0,
    reservedSpendCents: 0,
    nextAutomaticStep: input.dryRun
      ? "Dry-run mock review is waiting at the initial design direction gate. No paid provider calls are legal in this run."
      : "Generate exactly five prompt-only initial concepts automatically, then stop at the concept review board for direction approval.",
    now,
  });
  const artifacts: CreativeRunArtifacts = { runRoot, state, progress, ...(humanAction ? { humanAction } : {}) };

  await mkdir(runRoot, { recursive: true });
  await writeArtifacts(artifacts, input.dryRun ? "dry-run-requested" : "run-requested");

  return artifacts;
}

export async function renderCreativeStatusSummary(input: {
  stateRoot?: string;
  runId?: string;
} = {}): Promise<string> {
  const stateRoot = input.stateRoot ?? ".artlab/studio";
  const runRoot = input.runId ? await findRunRoot(stateRoot, input.runId) : await findLatestRunRoot(stateRoot);

  if (!runRoot) {
    return "No Creative Production Engine run was found. Next safe command: npm run art:produce -- --request \"<what to make>\"";
  }

  const state = await readJson<CreativeEngineRunState>(join(runRoot, "run-state.json"));
  const progress = await readJson<CreativeProgressFile>(join(runRoot, "progress.json"));
  const humanAction = await readJson<CreativeHumanActionPacket>(join(runRoot, "human-action.json"));

  if (!state || !progress) {
    throw new Error(`Run state is corrupt or incomplete at ${runRoot}.`);
  }

  return renderCreativeRunStatusLines({ state, progress, humanAction });
}

async function listRunStatePaths(root: string): Promise<string[]> {
  const entries = await import("node:fs/promises").then((fs) => fs.readdir(root, { withFileTypes: true }).catch(() => []));
  const paths: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);

    if (entry.isDirectory()) {
      paths.push(...await listRunStatePaths(fullPath));
    } else if (entry.name === "run-state.json") {
      paths.push(fullPath);
    }
  }

  return paths;
}

async function findRunRoot(stateRoot: string, runId: string): Promise<string | undefined> {
  const paths = await listRunStatePaths(stateRoot);

  for (const path of paths) {
    const state = await readJson<{ runId?: string }>(path);

    if (state?.runId === runId) return dirname(path);
  }

  return undefined;
}

async function findLatestRunRoot(stateRoot: string): Promise<string | undefined> {
  const paths = await listRunStatePaths(stateRoot);
  const inactivePhases = new Set<CreativeEnginePhase>([
    "promoted",
    "integrated",
    "browser-verified",
    "closed",
  ]);
  const candidates = await Promise.all(paths.map(async (path) => {
    const state = await readJson<Partial<CreativeEngineRunState>>(path);
    const timestamp = Date.parse(state?.updatedAt ?? state?.createdAt ?? "");

    return {
      runRoot: dirname(path),
      isActive: state?.phase ? !inactivePhases.has(state.phase) : true,
      timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    };
  }));

  return candidates
    .sort((left, right) =>
      Number(left.isActive) - Number(right.isActive) ||
      left.timestamp - right.timestamp ||
      left.runRoot.localeCompare(right.runRoot))
    .at(-1)?.runRoot;
}

function legacyArtifactPaths(runRoot: string): string[] {
  const candidates = [
    "run-state.json",
    "generation/gemini-api-v3/gemini-api-plan.json",
    "generation/gemini-api-v3/generation-budget-ledger.json",
    "generation/gemini-api-v3/canary/api-run-state.json",
    "generation/gemini-api-v3/full/api-run-state.json",
    "generation/gemini-api-v3/canary-gate.json",
    "generation/gemini-api-v3/cutout-readiness.json",
    "generation/gemini-api-v3/canary/repair-plan.json",
    "generation/gemini-api-v3/full/repair-plan.json",
    "generation/gemini-api-v3/full/cutout-doctor.json",
    "generation/gemini-api-v3/full/asset-doctor.json",
  ];

  return candidates
    .map((candidate) => join(runRoot, candidate))
    .filter((candidate) => existsSync(candidate));
}

function inferImportedOtisPhase(input: {
  fullRun?: LegacyApiRunState;
  hasFullAssetDoctor: boolean;
  cutoutDoctorStatus?: string;
}): CreativeEnginePhase {
  if (input.fullRun?.blockers?.length) return "repair-required";
  if (input.fullRun?.status === "completed-with-warnings" && input.cutoutDoctorStatus === "passed") {
    return "strict-qa";
  }
  if (input.fullRun?.status === "running") return "full-pack-running";
  if (input.fullRun?.status === "completed") return "strict-qa";

  return "canary-passed";
}

export async function importLegacyOtisRun(input: {
  runRoot: string;
  now?: Date;
}): Promise<CreativeRunArtifacts> {
  const now = input.now ?? new Date();
  const runRoot = input.runRoot;
  const legacyState = await readJson<Record<string, unknown>>(join(runRoot, "run-state.json"));
  const fullRoot = join(runRoot, "generation/gemini-api-v3/full");
  const fullRun = await readJson<LegacyApiRunState>(join(fullRoot, "api-run-state.json"));
  const cutoutDoctor = await readJson<{ status?: string; repeatedFailureCodes?: string[] }>(join(fullRoot, "cutout-doctor.json"));
  const hasFullAssetDoctor = existsSync(join(fullRoot, "asset-doctor.json"));
  const runId = String(legacyState?.runId ?? basename(runRoot));
  const name = String(legacyState?.name ?? "Otis");
  const phase = inferImportedOtisPhase({
    fullRun,
    hasFullAssetDoctor,
    cutoutDoctorStatus: cutoutDoctor?.status,
  });
  const state: CreativeEngineRunState = {
    schemaVersion: "tower-creative-run-state-v1-final",
    runId,
    assetType: "character",
    name,
    request: "Imported current Otis production canary state.",
    phase,
    gates: ["initial-design-direction", "final-app-promotion"],
    promotionPhrase: "approved for app",
    publicArtWritesAllowed: false,
    stateRoot: dirname(dirname(runRoot)),
    runRoot,
    createdAt: String(legacyState?.createdAt ?? now.toISOString()),
    updatedAt: now.toISOString(),
    importedFrom: {
      legacyRunId: runId,
      legacyState: typeof legacyState?.state === "string" ? legacyState.state : undefined,
      staleOrConflictingState: Boolean(fullRun?.status === "completed-with-warnings" || legacyState?.state !== phase),
      artifactsPreserved: legacyArtifactPaths(runRoot),
    },
  };
  const selected = fullRun?.selected?.length ?? 0;
  const skipped = fullRun?.skipped?.length ?? 0;
  const failures = (fullRun?.failures?.length ?? 0) + (fullRun?.blockers?.length ?? 0);
  const nextAutomaticStep = phase === "strict-qa" && hasFullAssetDoctor
    ? "Strict asset doctor evidence exists. Build the final upload-ready board and action manifest next; do not promote without approved for app."
    : phase === "strict-qa"
      ? "Run strict asset doctor and repair plan against the full Otis pack, then build the final upload-ready board. Do not rerun the whole pack."
    : "Continue from imported Otis state; regenerate only named failed slots if strict evidence requires it.";
  const progress = createProgress({
    runId,
    phase,
    completed: selected,
    failed: failures,
    repairing: fullRun?.status === "completed-with-warnings" ? 0 : failures,
    pending: skipped,
    spendSoFarCents: fullRun?.budget?.projectedCostCents ?? 0,
    reservedSpendCents: 0,
    nextAutomaticStep,
    now,
  });
  const humanAction = createHumanAction({
    runId,
    phase,
    whatIUnderstood: "Existing Otis canary/full-pack artifacts were imported into the v1-final state model without starting new generation or force-unlocking anything.",
    recommendation: nextAutomaticStep,
    estimatedCents: 0,
    risk: "Medium. Existing provider receipts include warnings, so production remains blocked until strict QA evidence is current.",
    allowedResponses: ["continue", "reject/archive"],
    recommendedResponse: "continue",
    now,
  });
  const artifacts = { runRoot, state, progress, humanAction };

  await writeArtifacts(artifacts, "legacy-otis-imported");
  await writeJson(join(runRoot, "v1-import-report.json"), {
    schemaVersion: "tower-creative-v1-import-report",
    importedAt: now.toISOString(),
    runId,
    phase,
    preservedArtifacts: state.importedFrom?.artifactsPreserved ?? [],
    noForceUnlock: true,
    noGenerationStarted: true,
  });

  return artifacts;
}

function artlabRootForStateRoot(stateRoot: string): string {
  return basename(stateRoot) === "studio" ? dirname(stateRoot) : stateRoot;
}

async function nextInitialConceptGenerationFolderName(runRoot: string): Promise<string> {
  const generationRoot = join(runRoot, "generation");
  const baseName = "gemini-api-v3";
  const baseRoot = join(generationRoot, baseName);

  if (!existsSync(baseRoot)) return baseName;

  const entries = await readdir(generationRoot, { withFileTypes: true }).catch(() => []);
  const highestRegeneration = entries.reduce((highest, entry) => {
    if (!entry.isDirectory()) return highest;
    const match = entry.name.match(/^gemini-api-v3-regeneration-(\d{3})$/);
    if (!match) return highest;

    return Math.max(highest, Number(match[1]));
  }, 1);

  return `gemini-api-v3-regeneration-${String(highestRegeneration + 1).padStart(3, "0")}`;
}

function initialConceptTargetFilename(name: string): string {
  return `${slugify(name)}-initial-concept.png`;
}

function sanitizeCharacterConceptDirectiveText(value: string): string {
  return value
    .replace(/\bhyperreal(?:istic|ism)?\b/gi, "lens-captured style drift")
    .replace(/\bphotoreal(?:istic|ism)?\b/gi, "lens-captured style drift")
    .replace(/\bphotograph(?:y|ic|er|s)?\b/gi, "lens-captured reference")
    .replace(/\bphoto\b/gi, "lens-captured reference")
    .replace(/\bactual person\b/gi, "copied human likeness")
    .replace(/\breal person\b/gi, "copied human likeness")
    .replace(/\bperson-like\b/gi, "copied-human-likeness")
    .replace(/\bstorybook\b/gi, "nursery-book illustration")
    .replace(/\bwatercolor\b/gi, "washed pigment media")
    .replace(/\bpastel\b/gi, "powder-soft color wash")
    .replace(/\bflat cartoon\b/gi, "plain vector toon simplification")
    .replace(/\bcorporate stock\b/gi, "generic office asset")
    .replace(/\bstock photo\b/gi, "generic office asset")
    .replace(/\s+/g, " ")
    .trim();
}

function renderInitialConceptDirective(state: CreativeEngineRunState): string {
  const request = state.assetType === "character"
    ? sanitizeCharacterConceptDirectiveText(state.request)
    : state.request;
  const assetContractLines: Record<CreativeAssetType, string[]> = {
    character: [
      "Asset contract: Tower character concept. Match the approved Otis/Tower character visual language: premium stylized high-detail app/game character art.",
      "Use the shared style envelope from the generation plan for style, quality, camera/framing, lighting, and Tower-world fit.",
      "The concept must read as a serious operator inside a luxury internship command center, with a strong full-body silhouette and human specificity.",
      "Design variation belongs only in silhouette, age read, hair, face, wardrobe, palette, posture, accessories, personality, and Tower role archetype.",
    ],
    environment: [
      "Asset contract: Tower background/environment. Match the Tower architecture, lighting, mood, spatial metaphor, material language, and responsive crop needs.",
      "Do not use character rendering rules for environments.",
    ],
    prop: [
      "Asset contract: Tower prop/object. Match the Tower material system, object readability, cutout needs, and story function.",
      "Do not use character rendering rules for props.",
    ],
    "ui-texture": [
      "Asset contract: Tower product UI asset. Match the existing Tower UI/design system, density, states, accessibility, and interaction surfaces.",
      "Do not use character rendering rules for UI assets.",
    ],
    animation: [
      "Asset contract: Tower motion asset. Match the product interaction model, performance budget, reduced-motion fallback, and Tower mood.",
      "Do not use character rendering rules unless the request is explicitly a character animation.",
    ],
    scene: [
      "Asset contract: Tower composed scene. Match Tower architecture, story context, lighting, composition, and responsive crop safety.",
      "Do not inherit character concept assumptions unless a character is explicitly the subject.",
    ],
    "icon-system": [
      "Asset contract: Tower icon system. Match the product UI icon grid, stroke/fill rules, semantic states, and small-size readability.",
      "Do not use character rendering rules for icons.",
    ],
    "marketing-hero": [
      "Asset contract: Tower marketing visual. Match the offer, first-viewport signal, product truth, brand mood, and responsive layout needs.",
      "Do not use character rendering rules unless the hero explicitly features a character.",
    ],
    shader: [
      "Asset contract: Tower shader/material effect. Match the architecture, lighting, mood, performance budget, and reduced-motion fallback.",
      "Do not use character rendering rules for shaders.",
    ],
  };

  return [
    `# ${state.name} Initial ${state.assetType === "character" ? "Character " : ""}Concepts`,
    "",
    `Request: ${request}`,
    "",
    "Create a prompt-only initial concept for The Tower. This is not a production pack, not a pose sheet, and not an app promotion.",
    "No old references, no identity reference images, no previous character art, and no external image grounding.",
    ...assetContractLines[state.assetType],
    "Avoid generic fashion editorial posing, superhero styling, text, labels, logos, watermarks, and copied likenesses.",
  ].join("\n");
}

async function prepareInitialConceptPlan(input: {
  state: CreativeEngineRunState;
  now: Date;
}): Promise<CreativeInitialConceptRunnerInput> {
  const { state, now } = input;
  const generationFolderName = await nextInitialConceptGenerationFolderName(state.runRoot);
  const briefPath = join(state.runRoot, "creative-brief.json");
  const directiveMarkdownPath = join(state.runRoot, "initial-concept-directive.md");
  const directivePath = join(state.runRoot, "next-image-generation-step.json");
  const planRoot = join(state.runRoot, "generation", generationFolderName);
  const inboxRoot = join(artlabRootForStateRoot(state.stateRoot), "inbox", state.assetType, state.runId, generationFolderName);
  const targetDirectory = join(state.runRoot, "sources", "initial-concepts");
  const targetFilename = initialConceptTargetFilename(state.name);
  const baseSlotId = state.assetType === "character" ? "initial-character-concept" : `initial-${state.assetType}-concept`;
  const directiveMarkdown = renderInitialConceptDirective(state);

  await mkdir(state.runRoot, { recursive: true });
  await writeJson(briefPath, {
    schemaVersion: "tower-creative-brief-v1",
    runId: state.runId,
    assetType: state.assetType,
    name: state.name,
    request: state.request,
    outputRoot: state.runRoot,
    createdAt: now.toISOString(),
  });
  await writeFile(directiveMarkdownPath, `${directiveMarkdown}\n`);
  await writeJson(directivePath, {
    schemaVersion: "tower-creative-next-image-generation-step-v1",
    directivePath: directiveMarkdownPath,
    referenceImages: [],
    sourceRequirements: {
      preferredFormat: "png",
    },
    generateFirst: [
      {
        slot: baseSlotId,
        sourceFilename: targetFilename,
        targetDirectory,
        reason: `Prompt-only initial ${state.name} ${state.assetType} direction. Exactly five lane concepts, no references.`,
      },
    ],
  });

  const plan = createGeminiApiGenerationPlan({
    runId: state.runId,
    assetType: state.assetType,
    name: state.name,
    planRoot,
    inboxRoot,
    slots: [
      {
        slotId: baseSlotId,
        targetDirectory,
        targetFilename,
        reason: `Prompt-only initial ${state.name} ${state.assetType} direction. Exactly five lane concepts, no references.`,
        prompt: directiveMarkdown,
      },
    ],
    model: GEMINI_NANO_BANANA_2_MODEL,
    imageSize: "4K",
    aspectRatio: "9:16",
    laneCount: GEMINI_API_DEFAULT_LANE_COUNT,
    maxConcurrency: GEMINI_API_DEFAULT_CONCURRENCY,
    budgetCents: GEMINI_API_DEFAULT_BUDGET_CENTS,
    phase: "initial-design",
    referenceImages: [],
    createdAt: now.toISOString(),
  });
  const planPath = join(planRoot, "gemini-api-plan.json");

  await mkdir(planRoot, { recursive: true });
  await mkdir(inboxRoot, { recursive: true });
  await Promise.all(plan.slots.map((slot) => mkdir(slot.inboxDirectory, { recursive: true })));
  await writeJson(planPath, plan);
  await writeFile(join(planRoot, "gemini-api-runbook.md"), renderGeminiApiRunbook(plan));
  await writeFile(join(planRoot, "prompt-deck.md"), createGeminiApiPromptDeck(plan));
  await writeJson(join(planRoot, "provider-budget-ledger.json"), createCreativeBudgetLedger({
    runId: plan.runId,
    approvedBudgetCents: plan.budgetCents,
    createdAt: now,
  }));

  return {
    runRoot: state.runRoot,
    plan,
    planPath,
    packetPath: briefPath,
    directivePath,
  };
}

async function defaultInitialConceptRunner(input: CreativeInitialConceptRunnerInput): Promise<void> {
  const tsx = join(process.cwd(), "node_modules/.bin/tsx");

  execFileSync(tsx, [
    "scripts/creative-generation-adapter.ts",
    "run-api",
    "--plan",
    input.planPath,
    "--max-attempts",
    "1",
    "--no-retry-warnings",
    "--request-timeout-ms",
    "300000",
  ], {
    cwd: process.cwd(),
    stdio: process.env.NODE_ENV === "test" ? "pipe" : "inherit",
    env: process.env,
  });
}

function productionPlanPath(runRoot: string): string {
  return join(runRoot, "generation", "gemini-api-v3", "full", "gemini-api-plan.json");
}

function productionDirectivePath(runRoot: string): string {
  return join(runRoot, "production-pack-directive.json");
}

function productionDirectiveMarkdownPath(runRoot: string): string {
  return join(runRoot, "production-pack-directive.md");
}

async function detectReferenceMimeType(path: string): Promise<"image/png" | "image/jpeg" | "image/webp"> {
  const bytes = await readFile(path);

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (
    bytes.slice(0, 4).toString("ascii") === "RIFF" &&
    bytes.slice(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return "image/png";
}

function renderApprovedProductionDirective(state: CreativeEngineRunState): string {
  const approved = state.approvedInitialConcept;
  const isCharacter = state.assetType === "character";

  return [
    `# ${state.name} Approved Production Pack`,
    "",
    `Request: ${state.request}`,
    approved ? `Approved concept slot: ${approved.slotId}` : "",
    approved ? `Approved concept image: ${approved.absoluteImagePath}` : "",
    "",
    isCharacter
      ? `Generate the final app-ready full-body character sprite pack for ${state.name}, using the approved concept as the identity reference.`
      : `Generate the final app-ready production asset for ${state.name}, using the approved concept as the visual direction reference.`,
    isCharacter
      ? `Required character pack matrix: ${CHARACTER_PRODUCTION_OUTFIT_VARIANTS.length} outfit variants x ${CHARACTER_PRODUCTION_POSE_STATES.length} pose/expression states = ${CHARACTER_PRODUCTION_SLOT_COUNT} individual source images.`
      : "",
    isCharacter
      ? `Outfit variants: ${CHARACTER_PRODUCTION_OUTFIT_VARIANTS.map((outfit) => outfit.id).join(", ")}. Pose/expression states: ${CHARACTER_PRODUCTION_POSE_STATES.map((pose) => pose.id).join(", ")}.`
      : "",
    "This is no longer concept exploration. Preserve the approved design, silhouette, age read, face structure, hair shape, wardrobe category, palette, posture language, and Tower role read.",
    "Stay inside the Tower/Otis-compatible premium stylized high-detail app/game character language when this is a character asset.",
    "Use full production mode: 4K source, 9:16 framing, single foreground asset, generous safe padding, premium-simple-backdrop-v1, and clean foreground/background separation for local cutout.",
    "Generate one and only one sprite per slot. No alternate design lanes, no redesign, no contact sheet, no duplicate character, no text, no logo, no watermark, no UI, no frame, no scene background, no old references except the approved concept image.",
    "Anatomy is a production QA requirement: exactly one head, two arms, two hands, two legs, and two feet. No duplicate limbs, phantom hands, fused arms, hidden extra arms, impossible elbows, or extra fingers.",
    "Preserve natural human imperfections. Avoid fake-perfect AI model faces, overly sharp model jawlines, superhero anatomy, plastic skin, style drift, or corporate stock posing.",
    "Public art writes and production manifest promotion remain forbidden until the final board is inspected and Armaan says the exact phrase approved for app.",
  ].filter(Boolean).join("\n");
}

function renderCharacterProductionSlotPrompt(input: {
  name: string;
  outfit: CharacterProductionOutfit;
  pose: CharacterProductionPose;
}): string {
  return [
    "## Character Sprite Slot Contract",
    `Character: ${input.name}`,
    `Outfit variant: ${input.outfit.id} - ${input.outfit.prompt}.`,
    `Pose/expression state: ${input.pose.id} - ${input.pose.prompt}.`,
    "Keep the approved identity locked across every outfit and expression: same face read, proportions, hair identity, body language family, palette discipline, and Tower role.",
    "Vary only the requested outfit edit and pose/expression state for this slot. Do not create a new Mara, a new art style, a scene, or a contact sheet.",
    "Maintain exact Tower/Otis-compatible character rendering: premium stylized high-detail app/game character art, clean full-body 9:16 sprite framing, controlled Tower lighting, mobile-readable silhouette.",
    "Keep the body plan legible in this exact pose: two arms and two hands only, two legs and two feet only, no duplicate forearms or extra chin-hand/prop-hand combinations.",
    "Make hands, feet, hair, glasses, accessories, and any small working prop fully visible and separated from the backdrop for local cutout.",
  ].join("\n");
}

function productionBaseSlotsForState(state: CreativeEngineRunState): ProductionBaseSlotSpec[] {
  const slug = slugify(state.name);

  if (state.assetType === "character") {
    return CHARACTER_PRODUCTION_OUTFIT_VARIANTS.flatMap((outfit) =>
      CHARACTER_PRODUCTION_POSE_STATES.map((pose) => ({
        slotId: `${slug}-${outfit.id}-${pose.id}`,
        targetFilename: `${slug}__${outfit.id}__${pose.id}__source-v001.png`,
        reason: `Final app-ready ${state.name} ${outfit.id} ${pose.id} production sprite from the approved initial concept.`,
        outfitVariant: outfit.id,
        poseState: pose.id,
        slotPrompt: renderCharacterProductionSlotPrompt({
          name: state.name,
          outfit,
          pose,
        }),
      })),
    );
  }

  return [{
    slotId: `${slug}-final-production-asset`,
    targetFilename: `${slug}__final-production-asset__source-v001.png`,
    reason: `Final app-ready ${state.name} production asset from the approved initial concept.`,
  }];
}

function requiredProductionBaseSlotIdsForState(state: CreativeEngineRunState): Set<string> {
  return new Set(productionBaseSlotsForState(state).map((slot) => slot.slotId));
}

function productionPlanHasRequiredSlots(input: {
  state: CreativeEngineRunState;
  plan?: GeminiApiGenerationPlan;
}): boolean {
  if (!input.plan || input.plan.phase !== "production-pack") return false;

  const required = requiredProductionBaseSlotIdsForState(input.state);
  const planned = new Set(input.plan.slots.map((slot) => slot.baseSlotId));

  return Array.from(required).every((slotId) => planned.has(slotId));
}

async function productionPackCompleteness(input: {
  state: CreativeEngineRunState;
  assetDoctor?: AssetDoctorFile;
}): Promise<{
  complete: boolean;
  missingBaseSlotIds: string[];
}> {
  if (input.state.assetType !== "character") {
    return { complete: true, missingBaseSlotIds: [] };
  }

  const plan = await readJson<GeminiApiGenerationPlan>(productionPlanPath(input.state.runRoot));
  const required = requiredProductionBaseSlotIdsForState(input.state);
  const completed = new Set<string>();

  if (plan) {
    const slotToBase = new Map(plan!.slots.map((slot) => [slot.slotId, slot.baseSlotId]));

    for (const image of input.assetDoctor?.checkedGeneratedImages ?? []) {
      const baseSlotId = image.slotId ? slotToBase.get(image.slotId) : undefined;

      if (baseSlotId && required.has(baseSlotId) && !(image.issues ?? []).length) {
        completed.add(baseSlotId);
      }
    }
  }

  const missingBaseSlotIds = Array.from(required).filter((slotId) => !completed.has(slotId));

  return {
    complete: missingBaseSlotIds.length === 0,
    missingBaseSlotIds,
  };
}

async function readProviderSpentCents(planRoot: string): Promise<number | undefined> {
  const ledger = await readJson<{ totals?: { spentCents?: number } }>(join(planRoot, "provider-budget-ledger.json"));
  const spent = ledger?.totals?.spentCents;

  return typeof spent === "number" && Number.isFinite(spent) ? spent : undefined;
}

async function archiveIncompleteFinalReview(input: {
  runRoot: string;
  now: Date;
  missingBaseSlotIds: string[];
}): Promise<string> {
  const archiveRoot = join(
    input.runRoot,
    "review",
    "superseded",
    `${input.now.toISOString().replace(/[:.]/g, "-")}-incomplete-character-pack`,
  );
  const candidates = [
    "review/final-upload-ready-board.html",
    "review/action-manifest.json",
    "review/all-sprite-images.html",
    "human-action.json",
  ];

  await mkdir(archiveRoot, { recursive: true });
  for (const candidate of candidates) {
    const source = join(input.runRoot, candidate);

    if (existsSync(source)) {
      await cp(source, join(archiveRoot, basename(source)), { force: false });
    }
  }
  await writeJson(join(archiveRoot, "superseded-reason.json"), {
    schemaVersion: "tower-creative-superseded-review-v1",
    reason: "incomplete-character-production-pack",
    missingBaseSlotIds: input.missingBaseSlotIds,
    requiredOutfits: CHARACTER_PRODUCTION_OUTFIT_VARIANTS.map((outfit) => outfit.id),
    requiredPoseStates: CHARACTER_PRODUCTION_POSE_STATES.map((pose) => pose.id),
    archivedAt: input.now.toISOString(),
  });

  return archiveRoot;
}

async function prepareApprovedProductionPlan(input: {
  state: CreativeEngineRunState;
  now: Date;
}): Promise<CreativeProductionRunnerInput> {
  const existingPlanPath = productionPlanPath(input.state.runRoot);
  const approved = input.state.approvedInitialConcept;

  if (!approved) {
    throw new Error("Cannot enter production without an approved initial concept slot.");
  }

  if (!existsSync(approved.absoluteImagePath)) {
    throw new Error(`Approved initial concept image is missing: ${approved.absoluteImagePath}`);
  }

  if (existsSync(existingPlanPath)) {
    const existingPlan = await readJson<GeminiApiGenerationPlan>(existingPlanPath);

    if (!existingPlan) throw new Error(`Could not read production plan at ${existingPlanPath}.`);
    if (productionPlanHasRequiredSlots({ state: input.state, plan: existingPlan })) {
      return {
        runRoot: input.state.runRoot,
        plan: existingPlan,
        planPath: existingPlanPath,
        directivePath: productionDirectivePath(input.state.runRoot),
      };
    }
  }

  const planRoot = join(input.state.runRoot, "generation", "gemini-api-v3", "full");
  const inboxRoot = join(artlabRootForStateRoot(input.state.stateRoot), "inbox", input.state.assetType, input.state.runId, "gemini-api-v3-full");
  const directiveMarkdownPath = productionDirectiveMarkdownPath(input.state.runRoot);
  const directivePath = productionDirectivePath(input.state.runRoot);
  const directiveMarkdown = renderApprovedProductionDirective(input.state);
  const productionSlots = productionBaseSlotsForState(input.state);
  const targetDirectory = join(input.state.runRoot, "sources", "production");
  const referenceImages = [
    {
      path: approved.absoluteImagePath,
      mimeType: await detectReferenceMimeType(approved.absoluteImagePath),
      role: input.state.assetType === "character" ? "identity-reference" as const : "style-reference" as const,
    },
  ];

  await mkdir(input.state.runRoot, { recursive: true });
  await writeFile(directiveMarkdownPath, `${directiveMarkdown}\n`);
  await writeJson(directivePath, {
    schemaVersion: "tower-creative-production-pack-directive-v1",
    directivePath: directiveMarkdownPath,
    approvedInitialConcept: approved,
    referenceImages,
    sourceRequirements: {
      minimumLongEdge: 4096,
      minimumShortEdge: 2300,
      preferredFormat: "png",
    },
    characterPackContract: input.state.assetType === "character"
      ? {
          requiredOutfitVariants: CHARACTER_PRODUCTION_OUTFIT_VARIANTS.map((outfit) => outfit.id),
          requiredPoseStates: CHARACTER_PRODUCTION_POSE_STATES.map((pose) => pose.id),
          requiredSourceImages: CHARACTER_PRODUCTION_SLOT_COUNT,
          finalBoardRequiresAllSlots: true,
        }
      : undefined,
    generateFirst: productionSlots.map((slot) => ({
      slot: slot.slotId,
      sourceFilename: slot.targetFilename,
      targetDirectory,
      reason: slot.reason,
      outfitVariant: slot.outfitVariant,
      pose: slot.poseState,
    })),
  });

  const plan = createGeminiApiGenerationPlan({
    runId: input.state.runId,
    assetType: input.state.assetType,
    name: input.state.name,
    planRoot,
    inboxRoot,
    slots: productionSlots.map((slot) => ({
      slotId: slot.slotId,
      targetDirectory,
      targetFilename: slot.targetFilename,
      reason: slot.reason,
      prompt: [directiveMarkdown, "", slot.slotPrompt].filter(Boolean).join("\n"),
    })),
    model: GEMINI_NANO_BANANA_2_MODEL,
    imageSize: "4K",
    aspectRatio: "9:16",
    laneCount: 1,
    maxConcurrency: input.state.assetType === "character" ? GEMINI_API_DEFAULT_CONCURRENCY : 1,
    budgetCents: GEMINI_API_DEFAULT_BUDGET_CENTS,
    phase: "production-pack",
    sourceRequirements: {
      minimumLongEdge: 4096,
      minimumShortEdge: 2300,
      preferredFormat: "png",
    },
    referenceImages,
    createdAt: input.now.toISOString(),
  });
  const planPath = productionPlanPath(input.state.runRoot);
  const providerBudgetLedgerPath = join(planRoot, "provider-budget-ledger.json");

  await mkdir(planRoot, { recursive: true });
  await mkdir(inboxRoot, { recursive: true });
  await Promise.all(plan.slots.map((slot) => mkdir(slot.inboxDirectory, { recursive: true })));
  await writeJson(planPath, plan);
  await writeFile(join(planRoot, "gemini-api-runbook.md"), renderGeminiApiRunbook(plan));
  await writeFile(join(planRoot, "prompt-deck.md"), createGeminiApiPromptDeck(plan));
  if (!existsSync(providerBudgetLedgerPath)) {
    await writeJson(providerBudgetLedgerPath, createCreativeBudgetLedger({
      runId: plan.runId,
      approvedBudgetCents: plan.budgetCents,
      createdAt: input.now,
    }));
  }

  return {
    runRoot: input.state.runRoot,
    plan,
    planPath,
    directivePath,
  };
}

async function defaultProductionRunner(input: CreativeProductionRunnerInput): Promise<void> {
  const tsx = join(process.cwd(), "node_modules/.bin/tsx");
  const commandOptions = {
    cwd: process.cwd(),
    stdio: process.env.NODE_ENV === "test" ? "pipe" : "inherit",
    env: process.env,
  } as const;
  const runGenerate = (args: string[]) => execFileSync(tsx, [
    "scripts/creative-generation-adapter.ts",
    ...args,
  ], commandOptions);

  runGenerate([
    "run-api",
    "--plan",
    input.planPath,
    "--max-attempts",
    "1",
    "--no-retry-warnings",
    "--request-timeout-ms",
    "300000",
  ]);

  try {
    runGenerate([
      "cutout-auto",
      "--plan",
      input.planPath,
    ]);
  } catch {
    runGenerate([
      "repair-plan",
      "--plan",
      input.planPath,
      "--strict",
    ]);
    runGenerate([
      "repair-auto",
      "--plan",
      input.planPath,
    ]);
  }

  runGenerate([
    "cutout-doctor",
    "--plan",
    input.planPath,
    "--strict",
  ]);
  runGenerate([
    "doctor",
    "--plan",
    input.planPath,
    "--strict",
  ]);
}

async function markProductionBlocked(input: {
  runRoot: string;
  state: CreativeEngineRunState;
  reason: string;
  phase?: CreativeEnginePhase;
  now: Date;
}): Promise<CreativeRunArtifacts> {
  const isProviderBlocker = /api key|provider|billing|budget|secret/i.test(input.reason);
  const phase = input.phase ?? (isProviderBlocker ? "provider-blocked" : "repair-required");
  const previousProgress = await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json"));
  const nextState: CreativeEngineRunState = {
    ...input.state,
    phase,
    publicArtWritesAllowed: false,
    nextLegalAction: `Resolve production blocker, then continue automatically to the final upload-ready board: ${input.reason}`,
    updatedAt: input.now.toISOString(),
  };
  const progress = createProgress({
    runId: nextState.runId,
    phase,
    completed: previousProgress?.completed ?? 0,
    failed: 1,
    repairing: phase === "repair-required" ? 1 : 0,
    pending: 0,
    runningSlots: [],
    spendSoFarCents: previousProgress?.spendSoFarCents ?? 0,
    reservedSpendCents: 0,
    activeLocks: [],
    nextAutomaticStep: `Fix this true production blocker, then continue the same run to the final upload-ready board: ${input.reason}`,
    now: input.now,
  });
  const humanAction = createHumanAction({
    runId: nextState.runId,
    phase,
    whatIUnderstood: "The approved design should continue automatically to production, but a true provider, budget, tooling, or QA blocker stopped the run before final upload-ready review.",
    recommendation: `Fix the blocker and continue this same run; do not restart Mara. Blocker: ${input.reason}`,
    estimatedCents: 0,
    reservedCents: 0,
    risk: "Medium. Continuing without resolving this could duplicate spend, preserve a failed cutout, or create a non-upload-ready sprite.",
    allowedResponses: ["fix blocker and continue", "reject/archive"],
    recommendedResponse: "fix blocker and continue",
    now: input.now,
  });
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
    humanAction,
  };

  await writeArtifacts(artifacts, "production-blocked");

  return artifacts;
}

async function markInitialConceptProviderBlocked(input: {
  runRoot: string;
  state: CreativeEngineRunState;
  reason: string;
  pending?: number;
  reservedSpendCents?: number;
  now: Date;
}): Promise<CreativeRunArtifacts> {
  const nextState: CreativeEngineRunState = {
    ...input.state,
    phase: "provider-blocked",
    publicArtWritesAllowed: false,
    nextLegalAction: "Fix the provider blocker, then continue the automatic initial concept generation run.",
    updatedAt: input.now.toISOString(),
  };
  const progress = createProgress({
    runId: nextState.runId,
    phase: "provider-blocked",
    completed: 0,
    pending: input.pending ?? initialPendingSlots(nextState.assetType),
    runningSlots: [],
    reservedSpendCents: input.reservedSpendCents ?? 0,
    nextAutomaticStep: `Fix provider blocker before concept generation can continue: ${input.reason}`,
    now: input.now,
  });
  const humanAction = createHumanAction({
    runId: nextState.runId,
    phase: "provider-blocked",
    whatIUnderstood: "The engine could not legally generate the initial concept images because a provider/tooling blocker occurred before any concept board existed.",
    recommendation: `Fix the provider blocker, then continue this same run: ${input.reason}`,
    estimatedCents: 0,
    reservedCents: 0,
    risk: "Medium. Continuing without fixing this would either fail provider generation or spend against unsafe state.",
    allowedResponses: ["fix provider blocker and continue", "reject/archive"],
    recommendedResponse: "fix provider blocker and continue",
    now: input.now,
  });
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
    humanAction,
  };

  await writeArtifacts(artifacts, "initial-concept-provider-blocked");

  return artifacts;
}

async function latestReceiptWarnings(inboxDirectory: string): Promise<string[]> {
  const files = await import("node:fs/promises")
    .then((fs) => fs.readdir(inboxDirectory).catch(() => []));
  const receiptFile = files
    .filter((file) => /^api-receipt(?:-v\d{3})?\.json$/.test(file))
    .sort()
    .at(-1);

  if (!receiptFile) return ["missing-generation-receipt"];

  const receipt = await readJson<{ qualityWarnings?: string[] }>(join(inboxDirectory, receiptFile));

  return receipt?.qualityWarnings ?? [];
}

const INITIAL_CONCEPT_STYLE_QA_WARNING_CODES = new Set([
  "style-envelope-violation",
  "style-coherence-failed",
  "style-drift",
  "rendering-style-drift",
  "hyperreal-style-drift",
]);

const INITIAL_CONCEPT_DIVERSITY_QA_WARNING_CODES = new Set([
  "design-diversity-failure",
  "design-duplicate",
  "duplicate-character-design",
  "same-suit-hair-role",
]);

function conceptQaFailureKind(code: string): "style" | "diversity" | undefined {
  if (
    INITIAL_CONCEPT_STYLE_QA_WARNING_CODES.has(code) ||
    code.startsWith("style-envelope") ||
    code.startsWith("style-coherence")
  ) {
    return "style";
  }

  if (
    INITIAL_CONCEPT_DIVERSITY_QA_WARNING_CODES.has(code) ||
    code.startsWith("design-diversity") ||
    code.startsWith("design-axis")
  ) {
    return "diversity";
  }

  return undefined;
}

function evaluateInitialConceptBoardQa(input: {
  plan: GeminiApiGenerationPlan;
  slotWarnings: Array<{
    slot: GeminiApiGenerationPlan["slots"][number];
    warnings: string[];
  }>;
  now: Date;
}): CreativeInitialConceptQaReport {
  const promptQa = evaluateTowerCharacterConceptPromptContract({
    assetType: input.plan.assetType,
    phase: input.plan.phase,
    slots: input.plan.slots,
  });
  const failures: TowerCharacterConceptPromptQaFailure[] = [...promptQa.failures];
  const slotFailures = new Map<string, string[]>();
  const slotWarningsById = new Map<string, string[]>();

  for (const failure of failures) {
    const existing = slotFailures.get(failure.slotId) ?? [];
    existing.push(failure.code);
    slotFailures.set(failure.slotId, existing);
  }

  for (const { slot, warnings } of input.slotWarnings) {
    slotWarningsById.set(slot.slotId, warnings);

    for (const warning of warnings) {
      if (!conceptQaFailureKind(warning)) continue;

      failures.push({
        slotId: slot.slotId,
        code: warning,
        message: `Provider/style QA warning blocks concept board readiness: ${warning}.`,
      });
      const existing = slotFailures.get(slot.slotId) ?? [];
      existing.push(warning);
      slotFailures.set(slot.slotId, existing);
    }
  }

  const failureCounts = failures.reduce<Record<string, number>>((counts, failure) => {
    counts[failure.code] = (counts[failure.code] ?? 0) + 1;
    return counts;
  }, {});
  const repeatedFailureCodes = Array.from(new Set([
    ...promptQa.repeatedFailureCodes,
    ...Object.entries(failureCounts)
      .filter(([, count]) => count >= 2)
      .map(([code]) => code),
  ]));
  const styleCoherenceFailed = failures.some((failure) =>
    conceptQaFailureKind(failure.code) === "style" ||
    failure.code === "style-envelope-not-shared",
  );
  const designDiversityFailed = failures.some((failure) =>
    conceptQaFailureKind(failure.code) === "diversity" ||
    failure.code === "lane-design-card-missing",
  );

  return {
    schemaVersion: "tower-creative-initial-concept-qa-v1",
    runId: input.plan.runId,
    assetType: input.plan.assetType,
    status: failures.length ? "failed" : "passed",
    checkedAt: input.now.toISOString(),
    gates: {
      styleCoherence: styleCoherenceFailed ? "failed" : "passed",
      designDiversity: designDiversityFailed ? "failed" : "passed",
    },
    repeatedFailureCodes,
    failures,
    slots: input.plan.slots.map((slot) => {
      const failuresForSlot = slotFailures.get(slot.slotId) ?? [];

      return {
        slotId: slot.slotId,
        status: failuresForSlot.length ? "failed" : "passed",
        failures: failuresForSlot,
        warnings: slotWarningsById.get(slot.slotId) ?? [],
      };
    }),
  };
}

async function markInitialConceptStyleFailed(input: {
  runRoot: string;
  state: CreativeEngineRunState;
  plan: GeminiApiGenerationPlan;
  qa: CreativeInitialConceptQaReport;
  now: Date;
}): Promise<CreativeRunArtifacts> {
  const nextState: CreativeEngineRunState = {
    ...input.state,
    phase: "style-failed",
    publicArtWritesAllowed: false,
    nextLegalAction: "Supersede the failed concept board, harden the prompt builder, and regenerate five prompt-only initial concepts before asking Armaan to choose.",
    updatedAt: input.now.toISOString(),
  };
  const failed = input.qa.slots.filter((slot) => slot.status === "failed").length;
  const progress = createProgress({
    runId: nextState.runId,
    phase: "style-failed",
    completed: input.plan.slots.length - failed,
    failed,
    pending: 0,
    runningSlots: [],
    spendSoFarCents: input.plan.estimatedCostCents,
    reservedSpendCents: 0,
    activeLocks: [],
    nextAutomaticStep: "Do not ask Armaan to choose from this board. Supersede it, fix style/diversity prompting, and regenerate the concept phase.",
    now: input.now,
  });
  const humanAction = createHumanAction({
    runId: nextState.runId,
    phase: "style-failed",
    whatIUnderstood: "The initial concept outputs failed style coherence or design diversity QA, so the board is not a valid direction-review gate.",
    recommendation: "Do not choose from this board. Harden the concept prompt builder and regenerate five prompt-only initial concepts in the same run.",
    estimatedCents: 0,
    reservedCents: 0,
    risk: "Medium. Asking for direction approval here would lock in a broken style contract.",
    allowedResponses: ["harden prompt builder and regenerate", "reject/archive"],
    recommendedResponse: "harden prompt builder and regenerate",
    now: input.now,
  });
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
    humanAction,
  };

  await mkdir(join(input.runRoot, "review"), { recursive: true });
  await writeJson(join(input.runRoot, "review", "initial-concept-qa.json"), input.qa);
  await writeArtifacts(artifacts, "initial-concept-style-failed");

  return artifacts;
}

async function copyExistingArtifact(source: string, destination: string): Promise<boolean> {
  if (!existsSync(source)) return false;

  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });

  return true;
}

function filesystemSafeIso(now: Date): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

export async function supersedeInitialConceptBoardForCreativeRun(input: {
  runRoot: string;
  reason: string;
  now?: Date;
}): Promise<CreativeRunArtifacts> {
  const now = input.now ?? new Date();
  const statePath = join(input.runRoot, "run-state.json");
  const currentState = await readJson<CreativeEngineRunState>(statePath);
  const previousProgress = await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json"));

  if (!currentState) throw new Error(`Missing run-state.json at ${statePath}.`);

  const supersededRoot = join(input.runRoot, "review", "superseded", filesystemSafeIso(now));
  const preservedArtifacts: string[] = [];
  const preserve = async (source: string, destinationName: string) => {
    const destination = join(supersededRoot, destinationName);
    if (await copyExistingArtifact(source, destination)) {
      preservedArtifacts.push(destination);
    }
  };

  await preserve(join(input.runRoot, "review", "initial-concept-board.html"), "initial-concept-board.html");
  await preserve(join(input.runRoot, "review", "initial-concept-action-manifest.json"), "initial-concept-action-manifest.json");
  await preserve(join(input.runRoot, "review", "initial-concept-qa.json"), "initial-concept-qa.json");
  await preserve(join(input.runRoot, "generation", "gemini-api-v3"), "generation-gemini-api-v3");
  await preserve(join(input.runRoot, "generation", "gemini-api-v3-regeneration-002"), "generation-gemini-api-v3-regeneration-002");
  await rm(join(input.runRoot, "review", "initial-concept-board.html"), { force: true });
  await rm(join(input.runRoot, "review", "initial-concept-action-manifest.json"), { force: true });
  await writeJson(join(supersededRoot, "superseded-manifest.json"), {
    schemaVersion: "tower-creative-superseded-initial-concept-v1",
    runId: currentState.runId,
    supersededAt: now.toISOString(),
    reason: input.reason,
    previousPhase: currentState.phase,
    preservedArtifacts,
    validForDirectionApproval: false,
  });

  const nextState: CreativeEngineRunState = {
    ...currentState,
    phase: "style-failed",
    publicArtWritesAllowed: false,
    nextLegalAction: "Regenerate five prompt-only initial concepts after hardening style coherence and design diversity prompts.",
    updatedAt: now.toISOString(),
  };
  const progress = createProgress({
    runId: nextState.runId,
    phase: "style-failed",
    completed: 0,
    failed: 5,
    pending: 0,
    runningSlots: [],
    spendSoFarCents: previousProgress?.spendSoFarCents ?? 0,
    reservedSpendCents: 0,
    activeLocks: [],
    nextAutomaticStep: "The previous concept board is superseded and must not be used for direction approval. Regenerate five prompt-only concepts in the same run.",
    now,
  });
  const humanAction = createHumanAction({
    runId: nextState.runId,
    phase: "style-failed",
    whatIUnderstood: "The existing initial concept board is superseded because it failed style coherence and design diversity.",
    recommendation: "Do not choose from the old board. Continue this same run through a hardened five-lane concept regeneration.",
    estimatedCents: 0,
    reservedCents: 0,
    risk: "Medium. The old board mixed rendering styles and would train the next phase on the wrong visual contract.",
    allowedResponses: ["harden prompt builder and regenerate", "reject/archive"],
    recommendedResponse: "harden prompt builder and regenerate",
    now,
  });
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
    humanAction,
  };

  await writeArtifacts(artifacts, "initial-concept-board-superseded");

  return artifacts;
}

export async function generateInitialConceptsForCreativeRun(input: {
  runRoot: string;
  runner?: CreativeInitialConceptRunner;
  now?: Date;
}): Promise<CreativeRunArtifacts & {
  boardPath?: string;
  actionManifestPath?: string;
}> {
  const now = input.now ?? new Date();
  const statePath = join(input.runRoot, "run-state.json");
  const currentState = await readJson<CreativeEngineRunState>(statePath);

  if (!currentState) throw new Error(`Missing run-state.json at ${statePath}.`);
  if (currentState.phase === "direction-review-ready") {
    const progress = await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json"));
    const humanAction = await readJson<CreativeHumanActionPacket>(join(input.runRoot, "human-action.json"));

    if (!progress) throw new Error(`Missing progress.json at ${input.runRoot}.`);

    return {
      runRoot: input.runRoot,
      state: currentState,
      progress,
      ...(humanAction ? { humanAction } : {}),
      boardPath: join(input.runRoot, "review", "initial-concept-board.html"),
      actionManifestPath: join(input.runRoot, "review", "initial-concept-action-manifest.json"),
    };
  }
  if (
    currentState.phase !== "direction-generating" &&
    currentState.phase !== "awaiting-initial-approval" &&
    currentState.phase !== "style-failed"
  ) {
    throw new Error(`Initial concept generation can only run from direction-generating; current phase is ${currentState.phase}.`);
  }
  if (currentState.executionMode === "dry-run") {
    throw new Error("Dry-run creative packets do not perform paid provider generation.");
  }

  const state: CreativeEngineRunState = {
    ...currentState,
    phase: "direction-generating",
    publicArtWritesAllowed: false,
    nextLegalAction: "Generate exactly five prompt-only initial concepts, then build the direction review board.",
    updatedAt: now.toISOString(),
  };
  const prepared = await prepareInitialConceptPlan({ state, now });
  const runningSlots = prepared.plan.slots.map((slot) => slot.slotId);
  const runningProgress = createProgress({
    runId: state.runId,
    phase: "direction-generating",
    pending: runningSlots.length,
    runningSlots,
    reservedSpendCents: prepared.plan.estimatedCostCents,
    activeLocks: [`gemini-api:${prepared.plan.planRoot}`],
    nextAutomaticStep: "Five prompt-only initial concept slots are running. Do not ask for approve direction until the review board exists.",
    now,
  });

  await writeArtifacts({
    runRoot: input.runRoot,
    state,
    progress: runningProgress,
  }, "initial-concept-generation-started");

  try {
    await (input.runner ?? defaultInitialConceptRunner)(prepared);
  } catch (error) {
    return markInitialConceptProviderBlocked({
      runRoot: input.runRoot,
      state,
      reason: error instanceof Error ? error.message : String(error),
      pending: runningSlots.length,
      reservedSpendCents: prepared.plan.estimatedCostCents,
      now: new Date(),
    });
  }

  const missing = prepared.plan.slots.filter((slot) => !existsSync(slot.expectedInboxFile));

  if (missing.length) {
    return markInitialConceptProviderBlocked({
      runRoot: input.runRoot,
      state,
      reason: `Missing generated concept output(s): ${missing.map((slot) => slot.slotId).join(", ")}`,
      pending: missing.length,
      reservedSpendCents: 0,
      now: new Date(),
    });
  }

  const slotWarnings = await Promise.all(prepared.plan.slots.map(async (slot) => ({
    slot,
    warnings: await latestReceiptWarnings(slot.inboxDirectory),
  })));
  const conceptQa = evaluateInitialConceptBoardQa({
    plan: prepared.plan,
    slotWarnings,
    now: new Date(),
  });

  await mkdir(join(input.runRoot, "review"), { recursive: true });
  await writeJson(join(input.runRoot, "review", "initial-concept-qa.json"), conceptQa);

  if (conceptQa.status === "failed") {
    return markInitialConceptStyleFailed({
      runRoot: input.runRoot,
      state,
      plan: prepared.plan,
      qa: conceptQa,
      now: new Date(),
    });
  }

  const reviewRoot = join(input.runRoot, "review");
  const localReviewImagePath = (path: string) =>
    relative(resolve(reviewRoot), resolve(path));
  const board = buildInitialConceptReviewBoard({
    runId: state.runId,
    recommendation: `Review the five ${state.name} directions and approve or revise the visual direction. Nothing has been promoted to public art.`,
    projectedCostCents: prepared.plan.estimatedCostCents,
    slots: slotWarnings.map(({ slot, warnings }, index) => ({
      slotId: slot.slotId,
      label: `${String(index + 1).padStart(2, "0")} ${slot.reason}`,
      localImagePath: localReviewImagePath(slot.expectedInboxFile),
      status: warnings.length ? "warning" as const : "candidate" as const,
      notes: warnings.length
        ? `Generated with warnings: ${warnings.join(", ")}`
        : "Prompt-only initial concept candidate. No references used.",
    })),
  });
  const boardPath = join(reviewRoot, "initial-concept-board.html");
  const actionManifestPath = join(reviewRoot, "initial-concept-action-manifest.json");
  const nextState: CreativeEngineRunState = {
    ...state,
    phase: "direction-review-ready",
    publicArtWritesAllowed: false,
    nextLegalAction: "Wait for Armaan to inspect the five-image concept board and approve, revise, regenerate named slots, or reject/archive the direction.",
    updatedAt: new Date().toISOString(),
  };
  const progress = createProgress({
    runId: nextState.runId,
    phase: "direction-review-ready",
    completed: prepared.plan.slots.length,
    pending: 0,
    runningSlots: [],
    spendSoFarCents: prepared.plan.estimatedCostCents,
    reservedSpendCents: 0,
    activeLocks: [],
    nextAutomaticStep: "Wait at the initial concept review board. Approve direction is legal only after this board exists.",
    now: new Date(),
  });
  const humanAction = createHumanAction({
    runId: nextState.runId,
    phase: "direction-review-ready",
    whatIUnderstood: "The engine generated exactly five prompt-only initial concept images and prepared the initial concept review board.",
    recommendation: "Inspect the initial concept board. Approve a direction only if one of these images establishes the right visual identity.",
    estimatedCents: 0,
    reservedCents: 0,
    risk: "Low. This is a review-only gate; public/art and production manifests remain locked.",
    allowedResponses: [
      "approve direction",
      "approve direction: <slot id or 01>",
      "regenerate-named-slots: <slot ids>",
      "revise: <plain English change>",
      "reject/archive",
    ],
    recommendedResponse: "approve direction",
    now: new Date(),
  });
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
    humanAction,
  };

  await writeArtifacts(artifacts, "initial-concept-review-ready");
  await mkdir(reviewRoot, { recursive: true });
  await writeFile(boardPath, board.html);
  await writeJson(actionManifestPath, board.actionManifest);

  return {
    ...artifacts,
    boardPath,
    actionManifestPath,
  };
}

export async function continueApprovedProductionForCreativeRun(input: {
  runRoot: string;
  runner?: CreativeProductionRunner;
  now?: Date;
}): Promise<CreativeRunArtifacts & {
  boardPath?: string;
  actionManifestPath?: string;
}> {
  const now = input.now ?? new Date();
  const statePath = join(input.runRoot, "run-state.json");
  let currentState = await readJson<CreativeEngineRunState>(statePath);

  if (!currentState) throw new Error(`Missing run-state.json at ${statePath}.`);

  if (currentState.phase === "final-board-ready") {
    const progress = await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json"));
    const humanAction = await readJson<CreativeHumanActionPacket>(join(input.runRoot, "human-action.json"));

    if (!progress) throw new Error(`Missing progress.json at ${input.runRoot}.`);

    const assetDoctor = await readJson<AssetDoctorFile>(join(input.runRoot, "generation", "gemini-api-v3", "full", "asset-doctor.json"));
    const completeness = await productionPackCompleteness({
      state: currentState,
      assetDoctor,
    });

    if (completeness.complete) {
      return {
        runRoot: input.runRoot,
        state: currentState,
        progress,
        ...(humanAction ? { humanAction } : {}),
        boardPath: join(input.runRoot, "review", "final-upload-ready-board.html"),
        actionManifestPath: join(input.runRoot, "review", "action-manifest.json"),
      };
    }

    const archiveRoot = await archiveIncompleteFinalReview({
      runRoot: input.runRoot,
      now,
      missingBaseSlotIds: completeness.missingBaseSlotIds,
    });
    currentState = {
      ...currentState,
      phase: "production-planned",
      publicArtWritesAllowed: false,
      nextLegalAction: `The previous final board was incomplete and was superseded at ${archiveRoot}. Generate the missing required character outfit/expression sprite slots automatically.`,
      updatedAt: now.toISOString(),
    };
    await writeArtifacts({
      runRoot: input.runRoot,
      state: currentState,
      progress: createProgress({
        runId: currentState.runId,
        phase: "production-planned",
        completed: progress.completed,
        pending: completeness.missingBaseSlotIds.length,
        spendSoFarCents: progress.spendSoFarCents,
        reservedSpendCents: 0,
        nextAutomaticStep: "Continue the approved character production pack until every required outfit and expression sprite exists.",
        now,
      }),
    }, "incomplete-final-board-superseded");
  }

  if (currentState.phase === "strict-qa") {
    return buildFinalBoardForCreativeRun({ runRoot: input.runRoot, now });
  }

  if (
    currentState.phase !== "initial-direction-approved" &&
    currentState.phase !== "production-planned" &&
    currentState.phase !== "full-pack-running" &&
    currentState.phase !== "repair-required" &&
    currentState.phase !== "provider-blocked"
  ) {
    throw new Error(`Approved production continuation can only run after initial direction approval; current phase is ${currentState.phase}.`);
  }

  if (!currentState.approvedInitialConcept) {
    return markProductionBlocked({
      runRoot: input.runRoot,
      state: currentState,
      phase: "needs-human",
      reason: "No approved initial concept slot is recorded. Record the selected lane, for example approve direction: 01, before production.",
      now,
    });
  }

  let prepared: CreativeProductionRunnerInput;

  try {
    prepared = await prepareApprovedProductionPlan({ state: currentState, now });
  } catch (error) {
    return markProductionBlocked({
      runRoot: input.runRoot,
      state: currentState,
      reason: error instanceof Error ? error.message : String(error),
      now,
    });
  }

  const runningSlots = prepared.plan.slots.map((slot) => slot.slotId);
  const previousProgress = await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json"));
  const runningState: CreativeEngineRunState = {
    ...currentState,
    phase: "full-pack-running",
    publicArtWritesAllowed: false,
    nextLegalAction: "Production generation, cutout, strict QA, and final board build are automatic after approved initial direction.",
    updatedAt: now.toISOString(),
  };
  const runningProgress = createProgress({
    runId: runningState.runId,
    phase: "full-pack-running",
    completed: previousProgress?.completed ?? 0,
    pending: runningSlots.length,
    runningSlots,
    spendSoFarCents: previousProgress?.spendSoFarCents ?? 0,
    reservedSpendCents: prepared.plan.estimatedCostCents,
    activeLocks: [`gemini-api:${prepared.plan.planRoot}`],
    nextAutomaticStep: "Generate the approved production pack, run local cutout, run strict QA, then build the final upload-ready board without another human stop.",
    now,
  });

  await writeArtifacts({
    runRoot: input.runRoot,
    state: runningState,
    progress: runningProgress,
  }, "approved-production-started");

  const beforeProviderSpent = await readProviderSpentCents(prepared.plan.planRoot);

  try {
    await (input.runner ?? defaultProductionRunner)(prepared);
  } catch (error) {
    return markProductionBlocked({
      runRoot: input.runRoot,
      state: runningState,
      reason: error instanceof Error ? error.message : String(error),
      now: new Date(),
    });
  }

  const strictQaNow = new Date();
  const afterProviderSpent = await readProviderSpentCents(prepared.plan.planRoot);
  const incrementalProviderSpent =
    beforeProviderSpent !== undefined && afterProviderSpent !== undefined
      ? Math.max(0, afterProviderSpent - beforeProviderSpent)
      : prepared.plan.estimatedCostCents;
  const strictQaState: CreativeEngineRunState = {
    ...runningState,
    phase: "strict-qa",
    publicArtWritesAllowed: false,
    nextLegalAction: "Strict QA passed for the approved production pack. Build the final upload-ready board now; do not promote without approved for app.",
    updatedAt: strictQaNow.toISOString(),
  };
  const strictQaProgress = createProgress({
    runId: strictQaState.runId,
    phase: "strict-qa",
    completed: runningSlots.length,
    pending: 0,
    runningSlots: [],
    spendSoFarCents: (previousProgress?.spendSoFarCents ?? 0) + incrementalProviderSpent,
    reservedSpendCents: 0,
    activeLocks: [],
    nextAutomaticStep: "Build the final upload-ready board and action manifest; this is the next normal human gate.",
    now: strictQaNow,
  });

  await writeArtifacts({
    runRoot: input.runRoot,
    state: strictQaState,
    progress: strictQaProgress,
  }, "approved-production-strict-qa");

  return buildFinalBoardForCreativeRun({
    runRoot: input.runRoot,
    now: new Date(),
  });
}

function conceptReviewArtifactsExist(runRoot: string): boolean {
  return existsSync(join(runRoot, "review", "initial-concept-board.html")) &&
    existsSync(join(runRoot, "review", "initial-concept-action-manifest.json"));
}

function isApproveDirectionResponse(normalized: string): boolean {
  return normalized === "approve direction" || /^approve\s+direction(?::|\s+)/.test(normalized);
}

function approveDirectionSelection(response: string): string | undefined {
  const match = response.trim().match(/^approve\s+direction(?::|\s+)?\s*(.*)$/i);
  const selection = match?.[1]?.trim();

  return selection || undefined;
}

function compactSelection(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function resolveApprovedInitialConcept(input: {
  runRoot: string;
  response: string;
  approvedAt: string;
}): Promise<CreativeEngineRunState["approvedInitialConcept"] | undefined> {
  const selection = approveDirectionSelection(input.response);

  if (!selection) return undefined;

  const reviewRoot = join(input.runRoot, "review");
  const actionManifestPath = join(reviewRoot, "initial-concept-action-manifest.json");
  const boardPath = join(reviewRoot, "initial-concept-board.html");
  const manifest = await readJson<InitialConceptActionManifestFile>(actionManifestPath);
  const slots = manifest?.actions?.find((action) => action.id === "regenerate-named-slots")?.slots ?? [];
  const localImagePaths = manifest?.localImagePaths ?? [];

  if (!slots.length || !localImagePaths.length) {
    throw new Error("Cannot approve a named direction because the concept action manifest has no slots.");
  }

  const numericLane = selection.match(/\b(?:lane\s*)?0?([1-5])\b/i)?.[1];
  const compactedSelection = compactSelection(selection);
  const selectedIndex = slots.findIndex((slotId, index) => {
    const localImagePath = localImagePaths[index] ?? "";

    if (numericLane) {
      const laneId = `api-lane-${numericLane.padStart(2, "0")}`;

      return slotId.includes(laneId) || localImagePath.includes(`/${laneId}/`);
    }

    return compactSelection(slotId).includes(compactedSelection) ||
      compactSelection(localImagePath).includes(compactedSelection);
  });

  if (selectedIndex === -1) {
    throw new Error(`Approved concept selection "${selection}" does not match any concept board slot.`);
  }

  const slotId = slots[selectedIndex]!;
  const localImagePath = localImagePaths[selectedIndex]!;

  return {
    slotId,
    localImagePath,
    absoluteImagePath: resolve(reviewRoot, localImagePath),
    actionManifestPath,
    boardPath,
    approvedAt: input.approvedAt,
    response: input.response.trim(),
  };
}

export async function applyCreativeHumanResponse(input: {
  runRoot: string;
  response: string;
  now?: Date;
}): Promise<CreativeEngineRunState> {
  const now = input.now ?? new Date();
  const statePath = join(input.runRoot, "run-state.json");
  const state = await readJson<CreativeEngineRunState>(statePath);

  if (!state) throw new Error(`Missing run-state.json at ${statePath}.`);

  const normalized = input.response.trim().toLowerCase();
  let approvedInitialConcept: CreativeEngineRunState["approvedInitialConcept"] | undefined;
  let nextState: CreativeEngineRunState;

  if (state.phase === "direction-generating" && normalized === "reject/archive") {
    nextState = {
      ...state,
      phase: "closed",
      publicArtWritesAllowed: false,
      nextLegalAction: "Run archived before concept generation finished. Start a fresh creative request when ready.",
      updatedAt: now.toISOString(),
    };
  } else if (state.phase === "direction-generating") {
    throw new Error("Cannot approve direction before a concept board exists. Continue automatic concept generation first.");
  } else if (state.phase === "awaiting-initial-approval") {
    if (isApproveDirectionResponse(normalized) && state.executionMode !== "dry-run") {
      throw new Error("Cannot approve direction before a concept board exists. Continue automatic concept generation first.");
    }
    if (normalized === "reject/archive") {
      nextState = {
        ...state,
        phase: "closed",
        publicArtWritesAllowed: false,
        nextLegalAction: "Run archived by Armaan before generation. Start a fresh creative request when ready.",
        updatedAt: now.toISOString(),
      };
    } else if (normalized.startsWith("revise:")) {
      const revision = input.response.trim().replace(/^revise:\s*/i, "").trim();
      if (!revision) {
        throw new Error("Initial direction revision requires text after revise:");
      }
      nextState = {
        ...state,
        request: `${state.request}\nRevision: ${revision}`,
        publicArtWritesAllowed: false,
        nextLegalAction: "Review the revised initial direction packet, then approve direction or revise again.",
        updatedAt: now.toISOString(),
      };
    } else if (normalized === "approve direction") {
      nextState = {
        ...state,
        phase: "initial-direction-approved",
        updatedAt: now.toISOString(),
      };
    } else {
      throw new Error("Initial direction gate accepts approve direction, revise: <change>, or reject/archive.");
    }
  } else if (state.phase === "direction-review-ready") {
    if (isApproveDirectionResponse(normalized)) {
      if (!conceptReviewArtifactsExist(input.runRoot)) {
        throw new Error("Cannot approve direction before a concept board exists.");
      }
      approvedInitialConcept = await resolveApprovedInitialConcept({
        runRoot: input.runRoot,
        response: input.response,
        approvedAt: now.toISOString(),
      });
      nextState = {
        ...state,
        phase: "initial-direction-approved",
        publicArtWritesAllowed: false,
        approvedInitialConcept: approvedInitialConcept ?? state.approvedInitialConcept,
        nextLegalAction: approvedInitialConcept
          ? `Continue automatically through full production from approved concept ${approvedInitialConcept.slotId}; next human gate is the final upload-ready board.`
          : "Continue automatically through full production from the approved concept direction; next human gate is the final upload-ready board.",
        updatedAt: now.toISOString(),
      };
    } else if (normalized === "reject/archive") {
      nextState = {
        ...state,
        phase: "closed",
        publicArtWritesAllowed: false,
        nextLegalAction: "Run archived after initial concept review. Start a fresh creative request when ready.",
        updatedAt: now.toISOString(),
      };
    } else if (normalized.startsWith("revise:")) {
      const revision = input.response.trim().replace(/^revise:\s*/i, "").trim();
      if (!revision) {
        throw new Error("Direction revision requires text after revise:");
      }
      nextState = {
        ...state,
        phase: "direction-generating",
        request: `${state.request}\nRevision after concept board: ${revision}`,
        publicArtWritesAllowed: false,
        nextLegalAction: "Regenerate prompt-only initial concepts from the revised brief.",
        updatedAt: now.toISOString(),
      };
    } else {
      throw new Error("Concept review gate accepts approve direction, revise: <change>, regenerate-named-slots: <slot ids>, or reject/archive.");
    }
  } else if (state.phase === "app-preview-ready" || state.phase === "final-board-ready") {
    if (normalized !== "approved for app") {
      throw new Error("Final app promotion requires the exact phrase approved for app.");
    }
    nextState = {
      ...state,
      phase: "approved-for-app",
      publicArtWritesAllowed: true,
      nextLegalAction: "Run the reusable promotion adapter now: copy approved derivatives into public/art, update the approved manifest, and integrate the app surface.",
      updatedAt: now.toISOString(),
    };
  } else {
    throw new Error(`No human response is legal while run is in phase ${state.phase}.`);
  }

  await writeJson(statePath, nextState);
  if (approvedInitialConcept) {
    await writeJson(join(input.runRoot, "review", "approved-initial-concept.json"), approvedInitialConcept);
  }
  const previousProgress = await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json"));
  const archivedGeneratingDirection = state.phase === "direction-generating" && normalized === "reject/archive";
  const revisedInitialDirection = state.phase === "awaiting-initial-approval" && normalized.startsWith("revise:");
  const archivedInitialDirection = state.phase === "awaiting-initial-approval" && normalized === "reject/archive";
  const revisedConceptDirection = state.phase === "direction-review-ready" && normalized.startsWith("revise:");
  const archivedConceptDirection = state.phase === "direction-review-ready" && normalized === "reject/archive";
  const nextAutomaticStep = archivedGeneratingDirection
    ? "Run is closed. Start a fresh creative request when ready."
    : archivedInitialDirection
    ? "Run is closed. Start a fresh creative request when ready."
    : archivedConceptDirection
      ? "Run is closed. Start a fresh creative request when ready."
    : revisedInitialDirection
      ? "Wait for initial design direction approval on the revised packet."
      : revisedConceptDirection
        ? "Generate exactly five revised prompt-only initial concepts automatically."
      : nextState.phase === "initial-direction-approved"
        ? "Continue automatically through production generation, local cutout, strict QA, and final upload-ready board creation."
        : nextState.phase === "approved-for-app"
          ? "Run the transactional promotion firewall, then update public art and production manifests only after strict QA and preview evidence are current."
          : previousProgress?.nextAutomaticStep ?? "Continue from the updated run state.";
  const progress = createProgress({
    runId: nextState.runId,
    phase: nextState.phase,
    completed: archivedGeneratingDirection || archivedInitialDirection || archivedConceptDirection || revisedConceptDirection ? 0 : previousProgress?.completed ?? 0,
    failed: previousProgress?.failed ?? 0,
    repairing: previousProgress?.repairing ?? 0,
    pending: archivedGeneratingDirection || archivedInitialDirection || archivedConceptDirection
      ? 0
      : revisedConceptDirection
        ? initialPendingSlots(nextState.assetType)
        : previousProgress?.pending ?? 0,
    runningSlots: revisedConceptDirection ? [] : previousProgress?.runningSlots ?? [],
    spendSoFarCents: previousProgress?.spendSoFarCents ?? 0,
    reservedSpendCents: archivedGeneratingDirection || archivedInitialDirection || archivedConceptDirection ? 0 : previousProgress?.reservedSpendCents ?? 0,
    activeLocks: archivedGeneratingDirection || revisedConceptDirection || archivedConceptDirection ? [] : previousProgress?.activeLocks ?? [],
    nextAutomaticStep,
    now,
  });
  const humanAction = createHumanAction({
    runId: nextState.runId,
    phase: nextState.phase,
    whatIUnderstood: revisedInitialDirection
      ? `Armaan revised the initial direction: "${input.response.trim().replace(/^revise:\s*/i, "").trim()}".`
      : revisedConceptDirection
        ? `Armaan revised the concept direction: "${input.response.trim().replace(/^revise:\s*/i, "").trim()}".`
      : archivedGeneratingDirection
        ? "Armaan rejected and archived this creative run before the concept board was ready."
      : archivedInitialDirection
        ? "Armaan rejected and archived this creative run before generation."
        : archivedConceptDirection
          ? "Armaan rejected and archived this creative run after concept review."
        : approvedInitialConcept
          ? `Armaan approved initial concept ${approvedInitialConcept.slotId}.`
        : `Armaan answered: "${input.response.trim()}".`,
    recommendation: revisedInitialDirection
      ? "Review the revised initial direction. Approve it when ready, or revise again in plain English."
      : revisedConceptDirection
        ? "No human action is needed. Continue automatic revised concept generation from durable state."
      : archivedGeneratingDirection
        ? "No human action is needed. The archived run will not generate or write public art."
      : archivedInitialDirection
        ? "No human action is needed. The archived run will not generate or write public art."
        : archivedConceptDirection
          ? "No human action is needed. The archived run will not generate or write public art."
        : "No human action is needed right now. Continue from durable run-state and progress files.",
    estimatedCents: 0,
    reservedCents: archivedGeneratingDirection || archivedInitialDirection || archivedConceptDirection ? 0 : progress.reservedSpendCents,
    risk: "Low. This records the answer and advances durable state without touching public art or production manifests.",
    allowedResponses: revisedInitialDirection
      ? ["approve direction", "revise: <plain English change>", "reject/archive"]
      : revisedConceptDirection
        ? []
      : [],
    recommendedResponse: revisedInitialDirection ? "approve direction" : "none",
    now,
  });

  await writeJson(join(input.runRoot, "progress.json"), progress);
  if (humanAction.allowedResponses.length || nextState.phase === "approved-for-app") {
    await writeJson(join(input.runRoot, "human-action.json"), humanAction);
  } else {
    await rm(join(input.runRoot, "human-action.json"), { force: true });
  }
  await appendEvent(input.runRoot, {
    schemaVersion: "tower-creative-event-v1",
    event: archivedGeneratingDirection
      ? "run-archived"
      : archivedInitialDirection
      ? "run-archived"
      : archivedConceptDirection
        ? "run-archived"
      : revisedInitialDirection
        ? "initial-direction-revised"
        : revisedConceptDirection
          ? "concept-direction-revised"
          : "human-response-applied",
    runId: nextState.runId,
    phase: nextState.phase,
    recordedAt: nextState.updatedAt,
  });

  return nextState;
}

export async function markCreativeRunUpgradeRequired(input: {
  runRoot: string;
  reason: string;
  now?: Date;
}): Promise<CreativeRunArtifacts> {
  const now = input.now ?? new Date();
  const statePath = join(input.runRoot, "run-state.json");
  const state = await readJson<CreativeEngineRunState>(statePath);

  if (!state) throw new Error(`Missing run-state.json at ${statePath}.`);

  const nextState: CreativeEngineRunState = {
    ...state,
    phase: "upgrade-required",
    publicArtWritesAllowed: false,
    updatedAt: now.toISOString(),
  };
  const progress = createProgress({
    runId: nextState.runId,
    phase: "upgrade-required",
    spendSoFarCents: (await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json")))?.spendSoFarCents ?? 0,
    reservedSpendCents: 0,
    nextAutomaticStep: `Upgrade required before production can continue: ${input.reason}`,
    now,
  });
  const humanAction = createHumanAction({
    runId: nextState.runId,
    phase: "upgrade-required",
    whatIUnderstood: "The Creative Production Engine found a production-blocking improvement issue in the durable improvement ledger.",
    recommendation: `Stop production and harden the engine first: ${input.reason}`,
    estimatedCents: 0,
    risk: "High. Continuing could repeat a known engine failure or spend against unsafe state.",
    allowedResponses: ["harden engine", "reject/archive"],
    recommendedResponse: "harden engine",
    now,
  });
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
    humanAction,
  };

  await writeArtifacts(artifacts, "upgrade-required");

  return artifacts;
}

interface AssetDoctorImageEvidence {
  slotId?: string;
  path?: string;
  latestReceiptPath?: string;
  latestReceiptWarnings?: string[];
  issues?: string[];
}

interface AssetDoctorFile {
  status?: string;
  strict?: boolean;
  checkedGeneratedImages?: AssetDoctorImageEvidence[];
  issues?: Array<{
    code?: string;
    severity?: string;
  }>;
}

interface FinalReviewActionManifestFile {
  boardType?: string;
  promotesOnAction?: boolean;
  localImagePaths?: string[];
}

interface CharacterPromotionSlot {
  slotId: string;
  baseSlotId: string;
  sourcePath: string;
  characterId: CharacterId;
  outfitVariant: CharacterOutfitVariant;
  pose: CharacterPose;
}

export async function buildFinalBoardForCreativeRun(input: {
  runRoot: string;
  now?: Date;
}): Promise<CreativeRunArtifacts & {
  boardPath: string;
  actionManifestPath: string;
}> {
  const now = input.now ?? new Date();
  const state = await readJson<CreativeEngineRunState>(join(input.runRoot, "run-state.json"));

  if (!state) throw new Error(`Missing run-state.json at ${input.runRoot}.`);
  if (state.phase !== "strict-qa") {
    throw new Error(`Final board can only be built from strict-qa; current phase is ${state.phase}.`);
  }

  const assetDoctorPath = join(input.runRoot, "generation", "gemini-api-v3", "full", "asset-doctor.json");
  const assetDoctor = await readJson<AssetDoctorFile>(assetDoctorPath);

  const onlyReviewBoardReferenceBlockers = assetDoctor?.status === "blocked" &&
    (assetDoctor.issues ?? []).length > 0 &&
    (assetDoctor.issues ?? []).every((issue) => issue.code === "missing-review-image");

  if (!assetDoctor || (assetDoctor.status !== "passed" && !onlyReviewBoardReferenceBlockers) || assetDoctor.strict !== true) {
    throw new Error("Final board requires a passing strict full-pack asset doctor.");
  }

  const checkedImages = assetDoctor.checkedGeneratedImages ?? [];

  if (!checkedImages.length) {
    throw new Error("Final board requires at least one checked generated image.");
  }

  const completeness = await productionPackCompleteness({
    state,
    assetDoctor,
  });

  if (!completeness.complete) {
    throw new Error(`Final board requires the complete character production pack; missing base slots: ${completeness.missingBaseSlotIds.join(", ")}.`);
  }

  const board = buildFinalUploadReadyReviewBoard({
    runId: state.runId,
    assets: checkedImages.map((image) => ({
      slotId: image.slotId ?? "unknown-slot",
      label: image.slotId ?? "Unknown slot",
      localImagePath: image.path ?? "",
      status: "qa-passed" as const,
      receipts: image.latestReceiptPath ? [image.latestReceiptPath] : [],
      evidence: [
        assetDoctorPath,
        ...(image.latestReceiptWarnings?.length ? image.latestReceiptWarnings.map((warning) => `provider-warning:${warning}`) : ["strict-asset-doctor-passed"]),
      ],
      warnings: image.latestReceiptWarnings ?? [],
      blockers: image.issues ?? [],
    })),
  });
  const reviewRoot = join(input.runRoot, "review");
  const boardPath = join(reviewRoot, "final-upload-ready-board.html");
  const actionManifestPath = join(reviewRoot, "action-manifest.json");
  const nextState: CreativeEngineRunState = {
    ...state,
    phase: "final-board-ready",
    publicArtWritesAllowed: false,
    nextLegalAction: "Wait for Armaan to inspect the final upload-ready board and say approved for app before any promotion.",
    updatedAt: now.toISOString(),
  };
  const progress = createProgress({
    runId: state.runId,
    phase: "final-board-ready",
    completed: checkedImages.length,
    pending: 0,
    spendSoFarCents: (await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json")))?.spendSoFarCents ?? 0,
    nextAutomaticStep: "Wait for Armaan to inspect the final upload-ready board and say approved for app before any promotion.",
    now,
  });
  const humanAction = createHumanAction({
    runId: state.runId,
    phase: "final-board-ready",
    whatIUnderstood: "Strict QA has passed and the engine prepared the final upload-ready board with a machine-readable action manifest.",
    recommendation: "Inspect the final board. If it is truly ready for app use, respond with the exact phrase approved for app.",
    estimatedCents: 0,
    risk: "Low. This only writes review artifacts; public/art and manifests remain locked.",
    allowedResponses: [
      "approved for app",
      "regenerate-named-slots: <slot ids>",
      "revise: <plain English change>",
      "reject/archive",
    ],
    recommendedResponse: "approved for app",
    now,
  });
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
    humanAction,
  };

  await writeArtifacts(artifacts, "final-board-ready");
  await mkdir(reviewRoot, { recursive: true });
  await writeFile(boardPath, board.html);
  await writeJson(actionManifestPath, board.actionManifest);

  return {
    ...artifacts,
    boardPath,
    actionManifestPath,
  };
}

function inferCharacterIdForCreativeRun(state: CreativeEngineRunState): CharacterId {
  if (state.assetType !== "character") {
    throw new Error(`App promotion for ${state.assetType} assets needs an asset-specific promotion adapter.`);
  }

  const haystack = `${state.name} ${state.request}`.toLowerCase();
  const match = SEASON_ONE_CHARACTER_METADATA.find((character) => {
    const displayName = character.displayName.toLowerCase();
    const firstName = displayName.split(" ")[0] ?? displayName;

    return (
      haystack.includes(character.id) ||
      haystack.includes(displayName) ||
      haystack.includes(firstName) ||
      haystack.includes(character.title.toLowerCase())
    );
  });

  if (!match) {
    throw new Error(`Could not infer a Season 1 character id for ${state.name}.`);
  }

  return match.id;
}

function siblingRenditionPath(path: string, suffix: "@2x" | "@3x"): string {
  return path.replace(/\.webp$/, `${suffix}.webp`);
}

function publicPathForAssetSrc(projectRoot: string, src: string): string {
  return join(projectRoot, "public", src.replace(/^\//, ""));
}

async function readApprovedCharacterManifest(projectRoot: string): Promise<VisualAsset[]> {
  const manifest = await readJson<unknown>(join(projectRoot, APPROVED_CHARACTER_ASSETS_MANIFEST));

  if (!manifest) return [];
  if (!Array.isArray(manifest)) {
    throw new Error(`${APPROVED_CHARACTER_ASSETS_MANIFEST} must contain a JSON array.`);
  }

  return manifest as VisualAsset[];
}

async function writeApprovedCharacterManifest(projectRoot: string, assets: VisualAsset[]): Promise<void> {
  await writeJson(join(projectRoot, APPROVED_CHARACTER_ASSETS_MANIFEST), assets);
}

async function collectCharacterPromotionSlots(input: {
  state: CreativeEngineRunState;
  characterId: CharacterId;
  assetDoctor: AssetDoctorFile;
}): Promise<CharacterPromotionSlot[]> {
  const plan = await readJson<GeminiApiGenerationPlan>(productionPlanPath(input.state.runRoot));

  if (!plan || plan.phase !== "production-pack") {
    throw new Error("Promotion requires the current production-pack plan.");
  }

  const slotToBase = new Map(plan.slots.map((slot) => [slot.slotId, slot.baseSlotId ?? slot.slotId]));
  const imageByBaseSlotId = new Map<string, AssetDoctorImageEvidence>();

  for (const image of input.assetDoctor.checkedGeneratedImages ?? []) {
    if (!image.slotId || !image.path || (image.issues ?? []).length) continue;

    const baseSlotId = slotToBase.get(image.slotId);

    if (baseSlotId) imageByBaseSlotId.set(baseSlotId, image);
  }

  const slots: CharacterPromotionSlot[] = [];

  for (const outfit of CHARACTER_PRODUCTION_OUTFIT_VARIANTS) {
    for (const pose of CHARACTER_PRODUCTION_POSE_STATES) {
      const baseSlotId = `${slugify(input.state.name)}-${outfit.id}-${pose.id}`;
      const image = imageByBaseSlotId.get(baseSlotId);

      if (!image?.path) {
        throw new Error(`Promotion requires a strict-QA-passed source image for ${baseSlotId}.`);
      }
      if (!existsSync(resolve(image.path))) {
        throw new Error(`Promotion source image is missing for ${baseSlotId}: ${image.path}`);
      }

      slots.push({
        slotId: image.slotId ?? baseSlotId,
        baseSlotId,
        sourcePath: resolve(image.path),
        characterId: input.characterId,
        outfitVariant: outfit.id as CharacterOutfitVariant,
        pose: pose.id as CharacterPose,
      });
    }
  }

  return slots;
}

export async function promoteApprovedCreativeRunForApp(input: {
  runRoot: string;
  projectRoot?: string;
  masterLongEdge?: number;
  now?: Date;
}): Promise<CreativeRunArtifacts & {
  receiptPath: string;
  promotedPublicPaths: string[];
}> {
  const now = input.now ?? new Date();
  const projectRoot = resolve(input.projectRoot ?? process.cwd());
  const statePath = join(input.runRoot, "run-state.json");
  const progressPath = join(input.runRoot, "progress.json");
  const state = await readJson<CreativeEngineRunState>(statePath);
  const currentProgress = await readJson<CreativeProgressFile>(progressPath);
  const assetDoctorPath = join(input.runRoot, "generation", "gemini-api-v3", "full", "asset-doctor.json");
  const assetDoctor = await readJson<AssetDoctorFile>(assetDoctorPath);
  const actionManifestPath = join(input.runRoot, "review", "action-manifest.json");
  const actionManifest = await readJson<FinalReviewActionManifestFile>(actionManifestPath);

  if (!state) throw new Error(`Missing run-state.json at ${statePath}.`);
  if (!currentProgress) throw new Error(`Missing progress.json at ${progressPath}.`);
  if (state.phase !== "approved-for-app") {
    throw new Error(`Promotion can only run after approved-for-app; current phase is ${state.phase}.`);
  }
  if (!state.publicArtWritesAllowed) {
    throw new Error("Promotion is blocked until public art writes are unlocked by approved for app.");
  }
  if (!assetDoctor || assetDoctor.status !== "passed" || assetDoctor.strict !== true) {
    throw new Error("Promotion requires passing strict asset doctor evidence.");
  }
  if (!actionManifest || actionManifest.boardType !== "final-upload-ready") {
    throw new Error("Promotion requires the final upload-ready action manifest.");
  }
  if (actionManifest.promotesOnAction) {
    throw new Error("Final board action manifests must not promote directly.");
  }

  const characterId = inferCharacterIdForCreativeRun(state);
  const slots = await collectCharacterPromotionSlots({ state, characterId, assetDoctor });
  const promotionRoot = join(input.runRoot, "promotion");
  const stagedRoot = join(promotionRoot, "staged-public");
  const masterRoot = join(promotionRoot, "masters");
  const qaRoot = join(promotionRoot, "qa");
  const receiptPath = join(promotionRoot, "promotion-receipt.json");
  const promotedAt = now.toISOString();
  const promotedAssets: VisualAsset[] = [];
  const promotedPublicPaths: string[] = [];
  const stagedPaths: string[] = [];

  for (const slot of slots) {
    const expected = getExpectedCharacterSpriteSlot(slot.characterId, slot.pose, slot.outfitVariant);
    const stagedDefault = join(stagedRoot, expected.src.replace(/^\//, ""));
    const publicDefault = publicPathForAssetSrc(projectRoot, expected.src);
    const prepared = await prepareCharacterSpriteAsset({
      sourcePath: slot.sourcePath,
      masterPath: join(masterRoot, slot.outfitVariant, `${slot.pose}.png`),
      stagedRenditionPaths: {
        default: stagedDefault,
        retina2x: siblingRenditionPath(stagedDefault, "@2x"),
        retina3x: siblingRenditionPath(stagedDefault, "@3x"),
      },
      qaPreviewPaths: {
        dark: join(qaRoot, slot.outfitVariant, `${slot.pose}-dark.png`),
        light: join(qaRoot, slot.outfitVariant, `${slot.pose}-light.png`),
      },
      displayFrame: expected.displayFrame,
      ...(input.masterLongEdge ? { masterLongEdge: input.masterLongEdge } : {}),
    });

    if (prepared.issues.length) {
      throw new Error(`Promotion blocked for ${expected.id}: ${prepared.issues.join(", ")}`);
    }

    const renditionPairs = [
      [stagedDefault, publicDefault],
      [siblingRenditionPath(stagedDefault, "@2x"), siblingRenditionPath(publicDefault, "@2x")],
      [siblingRenditionPath(stagedDefault, "@3x"), siblingRenditionPath(publicDefault, "@3x")],
    ] as const;

    for (const [stagedPath, publicPath] of renditionPairs) {
      await mkdir(dirname(publicPath), { recursive: true });
      await cp(stagedPath, publicPath, { force: true });
      stagedPaths.push(stagedPath);
      promotedPublicPaths.push(publicPath);
    }

    promotedAssets.push({
      ...toApprovedCharacterVisualAsset(expected),
      sourceRunId: state.runId,
      assetVersion: `${characterId}-v1`,
      checksum: prepared.checksum,
      sourceResolution: {
        width: prepared.source.width,
        height: prepared.source.height,
      },
      masterResolution: prepared.master,
      qaStatus: "passed",
      promotionDate: promotedAt,
    });
  }

  const existingAssets = await readApprovedCharacterManifest(projectRoot);
  const promotedIds = new Set(promotedAssets.map((asset) => asset.id));
  const nextAssets = [
    ...existingAssets.filter((asset) => !promotedIds.has(asset.id)),
    ...promotedAssets,
  ];

  await writeApprovedCharacterManifest(projectRoot, nextAssets);
  await writeJson(receiptPath, {
    schemaVersion: "tower-creative-character-promotion-receipt-v1",
    runId: state.runId,
    characterId,
    approvalPhrase: "approved for app",
    promotedAt,
    strictAssetDoctorPath: assetDoctorPath,
    finalActionManifestPath: actionManifestPath,
    approvedManifestPath: join(projectRoot, APPROVED_CHARACTER_ASSETS_MANIFEST),
    promotedAssets: promotedAssets.map((asset) => ({
      id: asset.id,
      src: asset.src,
      renditions: asset.renditions,
    })),
  });

  const ledgerRoot = join(state.stateRoot, "ledgers");
  const housekeeping = createHousekeepingEntry({
    runId: state.runId,
    phase: "app-integration",
    created: [
      ...stagedPaths,
      ...promotedPublicPaths,
      join(projectRoot, APPROVED_CHARACTER_ASSETS_MANIFEST),
      receiptPath,
    ],
    kept: [
      statePath,
      progressPath,
      assetDoctorPath,
      actionManifestPath,
      join(input.runRoot, "review", "final-upload-ready-board.html"),
      join(projectRoot, APPROVED_CHARACTER_ASSETS_MANIFEST),
      ...promotedPublicPaths,
    ],
    archived: [],
    deleted: [],
    notes: `${state.name} was promoted only after approved for app; staged derivatives, public art, manifest data, receipt, and provenance were kept.`,
  });
  const improvement = createImprovementEntry({
    runId: state.runId,
    phase: "app-integration",
    category: "workflow",
    severity: "low",
    finding: "Final approval now runs the reusable character promotion adapter instead of stopping at an unlocked state.",
    action: "Keep exact approved for app as the only public-art unlock and reuse this adapter for future Tower character promotions.",
  });

  await writeJsonlEntry(join(ledgerRoot, "housekeeping.jsonl"), housekeeping);
  await writeJsonlEntry(join(ledgerRoot, "improvements.jsonl"), improvement);

  const nextState: CreativeEngineRunState = {
    ...state,
    phase: "integrated",
    publicArtWritesAllowed: false,
    updatedAt: promotedAt,
    nextLegalAction: "Promoted assets are integrated through the approved visual asset manifest; run browser QA for the target app surface, then close the run.",
    productionEvidence: {
      ...(state.productionEvidence ?? {}),
      finalReviewBoardPath: join(input.runRoot, "review", "final-upload-ready-board.html"),
      finalActionManifestPath: actionManifestPath,
      publicArtRoot: publicPathForAssetSrc(projectRoot, `/art/${getExpectedCharacterSpriteSlot(characterId, "idle", "regular").character.space}/${characterId}`),
      approvedManifestPath: join(projectRoot, APPROVED_CHARACTER_ASSETS_MANIFEST),
      promotionReceiptPath: receiptPath,
      promotedAssetCount: promotedAssets.length,
      websiteIntegration: "CharacterSprite and AgentCharacterButton consume the generated approved-character manifest at runtime.",
    },
  };
  const progress = createProgress({
    runId: state.runId,
    phase: "integrated",
    completed: promotedAssets.length,
    failed: 0,
    repairing: 0,
    pending: 0,
    runningSlots: [],
    spendSoFarCents: currentProgress.spendSoFarCents,
    reservedSpendCents: 0,
    activeLocks: [],
    nextAutomaticStep: "Run browser QA for the integrated app surface, then close the run after housekeeping and continuous-improvement gates pass.",
    now,
  });
  const artifacts: CreativeRunArtifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
  };

  await writeArtifacts(artifacts, "app-promotion-integrated");

  return {
    ...artifacts,
    receiptPath,
    promotedPublicPaths,
  };
}

export async function markCreativeRunBrowserVerified(input: {
  runRoot: string;
  evidencePath: string;
  now?: Date;
}): Promise<CreativeRunArtifacts> {
  const now = input.now ?? new Date();
  const statePath = join(input.runRoot, "run-state.json");
  const progressPath = join(input.runRoot, "progress.json");
  const state = await readJson<CreativeEngineRunState>(statePath);
  const currentProgress = await readJson<CreativeProgressFile>(progressPath);

  if (!state) throw new Error(`Missing run-state.json at ${statePath}.`);
  if (!currentProgress) throw new Error(`Missing progress.json at ${progressPath}.`);
  if (state.phase !== "integrated") {
    throw new Error(`Browser verification can only run from integrated; current phase is ${state.phase}.`);
  }
  if (!existsSync(input.evidencePath)) {
    throw new Error(`Browser verification evidence is missing: ${input.evidencePath}`);
  }

  const nextState: CreativeEngineRunState = {
    ...state,
    phase: "browser-verified",
    publicArtWritesAllowed: false,
    updatedAt: now.toISOString(),
    nextLegalAction: "Close the run after housekeeping and continuous improvement gates pass.",
    productionEvidence: {
      ...(state.productionEvidence ?? {}),
      browserQaEvidencePath: input.evidencePath,
    },
  };
  const progress = createProgress({
    runId: state.runId,
    phase: "browser-verified",
    completed: currentProgress.completed,
    failed: currentProgress.failed,
    repairing: currentProgress.repairing,
    pending: currentProgress.pending,
    runningSlots: [],
    spendSoFarCents: currentProgress.spendSoFarCents,
    reservedSpendCents: 0,
    activeLocks: [],
    nextAutomaticStep: "Close the run after housekeeping and continuous improvement gates pass.",
    now,
  });
  const artifacts: CreativeRunArtifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
  };

  await writeArtifacts(artifacts, "app-browser-verified");

  return artifacts;
}

function stringEvidence(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export async function closeCreativeRunAfterGates(input: {
  runRoot: string;
  now?: Date;
}): Promise<CreativeRunArtifacts> {
  const now = input.now ?? new Date();
  const statePath = join(input.runRoot, "run-state.json");
  const progressPath = join(input.runRoot, "progress.json");
  const state = await readJson<CreativeEngineRunState>(statePath);
  const currentProgress = await readJson<CreativeProgressFile>(progressPath);

  if (!state) throw new Error(`Missing run-state.json at ${statePath}.`);
  if (!currentProgress) throw new Error(`Missing progress.json at ${progressPath}.`);
  if (state.phase !== "browser-verified") {
    throw new Error(`Run can only close from browser-verified; current phase is ${state.phase}.`);
  }
  if (currentProgress.activeLocks.length > 0 || currentProgress.runningSlots.length > 0) {
    throw new Error("Run cannot close while locks or running slots are active.");
  }

  const ledgerRoot = join(state.stateRoot, "ledgers");
  const evidence = state.productionEvidence ?? {};
  const kept = [
    statePath,
    progressPath,
    join(input.runRoot, "human-action.json"),
    stringEvidence(evidence.browserQaEvidencePath),
    stringEvidence(evidence.finalReviewBoardPath),
    stringEvidence(evidence.publicArtRoot),
    stringEvidence(evidence.approvedManifestPath),
  ].filter((path): path is string => Boolean(path));
  const housekeeping = createHousekeepingEntry({
    runId: state.runId,
    phase: "next-recommendation",
    created: [],
    kept,
    archived: [],
    deleted: [],
    notes: `${state.name} browser QA evidence is recorded; live public art and generated production manifest remain protected; no generation, promotion, or cleanup deletion ran during close.`,
  });
  const improvement = createImprovementEntry({
    runId: state.runId,
    phase: "next-recommendation",
    category: "workflow",
    severity: "low",
    finding: `${state.name} closure completed from durable browser QA evidence without a new blocking engine issue.`,
    action: "Keep the promoted baseline protected and start the next asset only when Armaan explicitly asks.",
  });
  const gateValidation = validateRequiredPhaseGates(state.runId, "next-recommendation", [
    housekeeping,
    improvement,
  ]);

  if (!gateValidation.ok) {
    throw new Error(`Missing required close gates: ${gateValidation.missing.join(", ")}`);
  }

  await writeJsonlEntry(join(ledgerRoot, "housekeeping.jsonl"), housekeeping);
  await writeJsonlEntry(join(ledgerRoot, "improvements.jsonl"), improvement);

  const nextState: CreativeEngineRunState = {
    ...state,
    phase: "closed",
    publicArtWritesAllowed: false,
    updatedAt: now.toISOString(),
    nextLegalAction: "Run is closed; start the next creative asset only when Armaan asks.",
  };
  const progress = createProgress({
    runId: state.runId,
    phase: "closed",
    completed: currentProgress.completed,
    failed: currentProgress.failed,
    repairing: currentProgress.repairing,
    pending: currentProgress.pending,
    runningSlots: [],
    spendSoFarCents: currentProgress.spendSoFarCents,
    reservedSpendCents: 0,
    activeLocks: [],
    nextAutomaticStep: "Run is closed. The pipeline is clean and ready for the next explicit creative request.",
    now,
  });
  const humanAction = createHumanAction({
    runId: state.runId,
    phase: "closed",
    whatIUnderstood: `${state.name} browser QA passed and the run has gone through housekeeping and continuous-improvement close gates.`,
    recommendation: `No human action is needed for ${state.name}. Keep the promoted baseline protected and wait for Armaan before starting the next creative asset.`,
    estimatedCents: 0,
    reservedCents: 0,
    risk: "Low. Closing writes only run state and audit ledgers; public art and production manifests stay unchanged.",
    allowedResponses: [],
    recommendedResponse: "none",
    now,
  });
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress,
    humanAction,
  };

  await writeArtifacts(artifacts, "run-closed");

  return artifacts;
}
