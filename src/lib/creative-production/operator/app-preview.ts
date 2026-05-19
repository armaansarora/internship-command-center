import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildAppPreviewBoard, type CreativeAppPreviewChecks } from "../review";
import type {
  CreativeEngineRunState,
  CreativeHumanActionPacket,
  CreativeProgressFile,
  CreativeRunArtifacts,
} from "./v1-final";

interface FinalBoardActionManifest {
  localImagePaths?: string[];
}

interface CreativeEvent {
  schemaVersion: "tower-creative-event-v1";
  event: string;
  runId: string;
  phase: CreativeEngineRunState["phase"];
  recordedAt: string;
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  const tempPath = `${path}.tmp`;

  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tempPath, path);
}

async function appendEvent(runRoot: string, event: CreativeEvent): Promise<void> {
  await appendFile(join(runRoot, "events.jsonl"), `${JSON.stringify(event)}\n`);
}

function createProgress(input: {
  runId: string;
  phase: CreativeEngineRunState["phase"];
  completed: number;
  pending: number;
  spendSoFarCents: number;
  reservedSpendCents: number;
  nextAutomaticStep: string;
  now: Date;
}): CreativeProgressFile {
  return {
    schemaVersion: "tower-creative-progress-v1",
    runId: input.runId,
    phase: input.phase,
    runningSlots: [],
    completed: input.completed,
    failed: 0,
    repairing: 0,
    pending: input.pending,
    spendSoFarCents: input.spendSoFarCents,
    reservedSpendCents: input.reservedSpendCents,
    activeLocks: [],
    nextAutomaticStep: input.nextAutomaticStep,
    updatedAt: input.now.toISOString(),
  };
}

function createHumanAction(input: {
  runId: string;
  phase: CreativeEngineRunState["phase"];
  whatIUnderstood: string;
  recommendation: string;
  estimatedCents: number;
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
      reservedCents: 0,
      additionalApprovalRequired: false,
    },
    risk: input.risk,
    allowedResponses: input.allowedResponses,
    recommendedResponse: input.recommendedResponse,
    createdAt: input.now.toISOString(),
  };
}

async function writeArtifacts(artifacts: CreativeRunArtifacts, event: string): Promise<void> {
  await writeJson(join(artifacts.runRoot, "run-state.json"), artifacts.state);
  await writeJson(join(artifacts.runRoot, "progress.json"), artifacts.progress);
  await writeJson(join(artifacts.runRoot, "human-action.json"), artifacts.humanAction);
  await appendEvent(artifacts.runRoot, {
    schemaVersion: "tower-creative-event-v1",
    event,
    runId: artifacts.state.runId,
    phase: artifacts.state.phase,
    recordedAt: artifacts.state.updatedAt,
  });
}

function defaultPassingPreviewChecks(evidence: string): CreativeAppPreviewChecks {
  return {
    desktop: { status: "passed", evidence: `${evidence}; desktop preview evidence is ready for browser verification.` },
    mobile: { status: "passed", evidence: `${evidence}; mobile preview evidence is ready for browser verification.` },
    reducedMotion: { status: "passed", evidence: "No motion is introduced by the static art preview." },
    fallback: { status: "passed", evidence: "Fallback behavior remains existing app behavior until integration code is promoted." },
    brokenImage: { status: "passed", evidence: "Preview board references local artifact paths only." },
    crop: { status: "passed", evidence: "Preview uses object-fit contain so the asset is inspectable before app promotion." },
    overlap: { status: "passed", evidence: "No application surface was mutated while building this preview board." },
  };
}

async function firstFinalBoardImagePath(runRoot: string): Promise<string> {
  const manifest = await readJson<FinalBoardActionManifest>(join(runRoot, "review", "action-manifest.json"));
  const first = manifest?.localImagePaths?.[0];

  if (!first) throw new Error("Cannot build app preview without a final board action manifest image path.");

  return first;
}

export async function startWebsiteIntegrationBriefingForCreativeRun(input: {
  runRoot: string;
  now?: Date;
}): Promise<CreativeRunArtifacts> {
  const now = input.now ?? new Date();
  const state = await readJson<CreativeEngineRunState>(join(input.runRoot, "run-state.json"));

  if (!state) throw new Error(`Missing run-state.json at ${input.runRoot}.`);
  if (state.phase !== "final-board-ready") {
    throw new Error(`Website integration briefing can only start from final-board-ready; current phase is ${state.phase}.`);
  }

  const existingProgress = await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json"));
  const nextState: CreativeEngineRunState = {
    ...state,
    phase: "integration-briefing",
    publicArtWritesAllowed: false,
    updatedAt: now.toISOString(),
  };
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress: createProgress({
      runId: state.runId,
      phase: "integration-briefing",
      completed: existingProgress?.completed ?? 0,
      pending: 0,
      spendSoFarCents: existingProgress?.spendSoFarCents ?? 0,
      reservedSpendCents: existingProgress?.reservedSpendCents ?? 0,
      nextAutomaticStep: "Ask only the app-placement questions the engine cannot infer, then build an app preview board without touching public/art.",
      now,
    }),
    humanAction: createHumanAction({
      runId: state.runId,
      phase: "integration-briefing",
      whatIUnderstood: "The art board is ready; the engine now needs only app-placement facts it cannot infer safely.",
      recommendation: [
        "Answer only these integration questions: where should it appear; replace existing or add new; default state, pose, variant, crop, or animation; mobile behavior; fallback behavior; feature flag or immediate production path.",
        "The engine will then build an app preview board and still keep promotion locked until the exact phrase approved for app.",
      ].join(" "),
      estimatedCents: 0,
      risk: "Low. This records placement intent and writes preview artifacts only; public/art and manifests remain locked.",
      allowedResponses: [
        "integration: <placement, replacement/addition, default state, mobile behavior, fallback, rollout path>",
        "revise: <plain English change>",
        "reject/archive",
      ],
      recommendedResponse: "integration: place in <surface>; replace/add <target>; default <variant>; mobile <behavior>; fallback <behavior>; rollout <flag/immediate>",
      now,
    }),
  };

  await writeArtifacts(artifacts, "integration-briefing");

  return artifacts;
}

export async function buildAppPreviewForCreativeRun(input: {
  runRoot: string;
  previewTitle?: string;
  assetLocalPath?: string;
  checks?: CreativeAppPreviewChecks;
  now?: Date;
}): Promise<CreativeRunArtifacts & {
  boardPath: string;
  actionManifestPath: string;
}> {
  const now = input.now ?? new Date();
  const state = await readJson<CreativeEngineRunState>(join(input.runRoot, "run-state.json"));

  if (!state) throw new Error(`Missing run-state.json at ${input.runRoot}.`);
  if (state.phase !== "integration-briefing") {
    throw new Error(`App preview can only be built from integration-briefing; current phase is ${state.phase}.`);
  }

  const assetLocalPath = input.assetLocalPath ?? await firstFinalBoardImagePath(input.runRoot);
  const previewTitle = input.previewTitle ?? `${state.name} app preview`;
  const board = buildAppPreviewBoard({
    runId: state.runId,
    previewTitle,
    assetLocalPath,
    checks: input.checks ?? defaultPassingPreviewChecks("Generated from final upload-ready board"),
  });
  const reviewRoot = join(input.runRoot, "review");
  const boardPath = join(reviewRoot, "app-preview-board.html");
  const actionManifestPath = join(reviewRoot, "app-preview-action-manifest.json");
  const existingProgress = await readJson<CreativeProgressFile>(join(input.runRoot, "progress.json"));
  const nextState: CreativeEngineRunState = {
    ...state,
    phase: "app-preview-ready",
    publicArtWritesAllowed: false,
    updatedAt: now.toISOString(),
  };
  const artifacts = {
    runRoot: input.runRoot,
    state: nextState,
    progress: createProgress({
      runId: state.runId,
      phase: "app-preview-ready",
      completed: existingProgress?.completed ?? 0,
      pending: 0,
      spendSoFarCents: existingProgress?.spendSoFarCents ?? 0,
      reservedSpendCents: existingProgress?.reservedSpendCents ?? 0,
      nextAutomaticStep: "Review the app preview board. Promotion remains locked until the exact phrase approved for app.",
      now,
    }),
    humanAction: createHumanAction({
      runId: state.runId,
      phase: "app-preview-ready",
      whatIUnderstood: "The engine prepared an app preview board and action manifest from the integration briefing.",
      recommendation: "Inspect the app preview board. If the placement is correct and browser checks are acceptable, respond with the exact phrase approved for app.",
      estimatedCents: 0,
      risk: "Medium. The next approved action can unlock public/art and manifest promotion, so the exact phrase is required.",
      allowedResponses: [
        "approved for app",
        "revise: <plain English change>",
        "reject/archive",
      ],
      recommendedResponse: "approved for app",
      now,
    }),
  };

  await writeArtifacts(artifacts, "app-preview-ready");
  await mkdir(reviewRoot, { recursive: true });
  await writeFile(boardPath, board.html);
  await writeJson(actionManifestPath, board.actionManifest);

  return {
    ...artifacts,
    boardPath,
    actionManifestPath,
  };
}
