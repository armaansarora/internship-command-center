import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { buildFinalUploadReadyReviewBoard } from "../review";
import type { CreativeAssetType } from "../types";
import { renderCreativeRunStatusLines } from "./status-summary";

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
  stateRoot: string;
  runRoot: string;
  createdAt: string;
  updatedAt: string;
  nextLegalAction?: string;
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
  humanAction: CreativeHumanActionPacket;
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

function inferAssetType(request: string): CreativeAssetType {
  const normalized = request.toLowerCase();

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
  if (/\botis\b/i.test(request)) return "Otis";
  if (/\bmara\b/i.test(request)) return "Mara";
  if (/\brafe\b/i.test(request)) return "Rafe";

  return titleCase(request.replace(/[.?!]+$/g, "").trim()) || titleCase(assetType);
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
  return assetType === "character" ? 5 : 1;
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
  await writeJson(join(artifacts.runRoot, "human-action.json"), artifacts.humanAction);
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
  const state: CreativeEngineRunState = {
    schemaVersion: "tower-creative-run-state-v1-final",
    runId,
    assetType,
    name,
    request,
    phase: "awaiting-initial-approval",
    gates: ["initial-design-direction", "final-app-promotion"],
    promotionPhrase: "approved for app",
    publicArtWritesAllowed: false,
    stateRoot,
    runRoot,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const humanAction = createHumanAction({
    runId,
    phase: state.phase,
    whatIUnderstood: `You want a Tower ${assetType} run for ${name} from: "${request}".`,
    recommendation: "Approve the initial design direction, then let the engine generate concepts, run QA, repair, and build review boards without extra mini-approvals.",
    estimatedCents,
    risk: "Low. This creates drafts and state in .artlab only; public/art and production manifests stay locked.",
    allowedResponses: ["approve direction", "revise: <plain English change>", "reject/archive"],
    recommendedResponse: "approve direction",
    now,
  });
  const progress = createProgress({
    runId,
    phase: state.phase,
    pending: initialPendingSlots(assetType),
    spendSoFarCents: 0,
    reservedSpendCents: 0,
    nextAutomaticStep: "Wait for initial design direction approval. After approval, generate controlled parallel initial concepts.",
    now,
  });
  const artifacts = { runRoot, state, progress, humanAction };

  await mkdir(runRoot, { recursive: true });
  await writeArtifacts(artifacts, "run-requested");

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

  return paths
    .map((path) => dirname(path))
    .sort()
    .at(-1);
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
  let nextState: CreativeEngineRunState;

  if (state.phase === "awaiting-initial-approval") {
    if (normalized !== "approve direction") {
      throw new Error("Initial direction gate accepts approve direction, revise: <change>, or reject/archive.");
    }
    nextState = {
      ...state,
      phase: "initial-direction-approved",
      updatedAt: now.toISOString(),
    };
  } else if (state.phase === "app-preview-ready" || state.phase === "final-board-ready") {
    if (normalized !== "approved for app") {
      throw new Error("Final app promotion requires the exact phrase approved for app.");
    }
    nextState = {
      ...state,
      phase: "approved-for-app",
      publicArtWritesAllowed: true,
      updatedAt: now.toISOString(),
    };
  } else {
    throw new Error(`No human response is legal while run is in phase ${state.phase}.`);
  }

  await writeJson(statePath, nextState);
  const previousProgress = await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json"));
  const nextAutomaticStep = nextState.phase === "initial-direction-approved"
    ? "Generate controlled parallel initial concepts with budget reservations, slot leases, receipts, local QA, and no production promotion writes."
    : nextState.phase === "approved-for-app"
      ? "Run the transactional promotion firewall, then update public art and production manifests only after strict QA and preview evidence are current."
      : previousProgress?.nextAutomaticStep ?? "Continue from the updated run state.";
  const progress = createProgress({
    runId: nextState.runId,
    phase: nextState.phase,
    completed: previousProgress?.completed ?? 0,
    failed: previousProgress?.failed ?? 0,
    repairing: previousProgress?.repairing ?? 0,
    pending: previousProgress?.pending ?? 0,
    runningSlots: previousProgress?.runningSlots ?? [],
    spendSoFarCents: previousProgress?.spendSoFarCents ?? 0,
    reservedSpendCents: previousProgress?.reservedSpendCents ?? 0,
    activeLocks: previousProgress?.activeLocks ?? [],
    nextAutomaticStep,
    now,
  });
  const humanAction = createHumanAction({
    runId: nextState.runId,
    phase: nextState.phase,
    whatIUnderstood: `Armaan answered: "${input.response.trim()}".`,
    recommendation: "No human action is needed right now. Continue from durable run-state and progress files.",
    estimatedCents: 0,
    reservedCents: progress.reservedSpendCents,
    risk: "Low. This records the answer and advances durable state without touching public art or production manifests.",
    allowedResponses: [],
    recommendedResponse: "none",
    now,
  });

  await writeJson(join(input.runRoot, "progress.json"), progress);
  await writeJson(join(input.runRoot, "human-action.json"), humanAction);
  await appendEvent(input.runRoot, {
    schemaVersion: "tower-creative-event-v1",
    event: "human-response-applied",
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
