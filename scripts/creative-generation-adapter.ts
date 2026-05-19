import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import sharp from "sharp";

import {
  assertCreativeGenerationAdapterId,
  assertAllowedCreativeStylePreset,
  assertSafeWorkspacePath,
  createGeminiSubscriptionBridgePlan,
  createGeminiApiGenerationPlan,
  createGeminiApiProductionFirewallPlans,
  createGeminiApiPromptDeck,
  createGeminiGenerateContentPayload,
  createPromptDeck,
  createGenerationBudgetLedger,
  appendGenerationBudgetEntry,
  CREATIVE_GENERATION_ADAPTER_DEFINITIONS,
  CREATIVE_GENERATION_QUALITY_MODES,
	  CREATIVE_GENERATION_STYLE_PRESET_POLICIES,
	  DEFAULT_GEMINI_SUBSCRIPTION_UI_SETTINGS,
	  BANNED_PRODUCTION_CUTOUT_TERMS,
	  buildCutoutReadinessScore,
	  containsBannedProductionCutoutLanguage,
	  createDefaultCutoutContract,
	  evaluateCutoutAlpha,
	  selectCutoutModelWinners,
	  renderCharacterInitialConceptApiStyleInstructions,
	  validateCreativeImageFile,
  validateReviewBoardImageReferences,
  getNextCreativeRunAction,
  createCreativeBudgetLedger,
  createGeminiApiProviderAdapter,
  FileCreativeSlotLeaseStore,
  GEMINI_API_DEFAULT_BUDGET_CENTS,
  GEMINI_API_DEFAULT_CONCURRENCY,
  GEMINI_API_DEFAULT_COST_PER_4K_IMAGE_CENTS,
  GEMINI_API_DEFAULT_LANE_COUNT,
  GEMINI_API_SECRET_ENV_VARS,
  GEMINI_NANO_BANANA_2_MODEL,
  isRetryableGeminiApiRequestFailure,
  planGeminiApiRunExecution,
  redactGeminiApiSecretText,
  runCreativeSlotScheduler,
  assertGeminiApiAspectRatio,
  assertGeminiApiConcurrency,
  assertGeminiApiImageResolution,
  assertGeminiApiLaneCount,
  renderGeminiSubscriptionBridgeRunbook,
  renderGeminiApiRunbook,
  type CreativeAssetType,
  type CreativeGenerationBridgePlan,
  type CreativeGenerationQualityMode,
  type CreativeGenerationSlotInput,
  type CreativeGenerationStylePresetPolicy,
  type CreativeGenerationUiSettings,
  type GeminiApiBaseSlotInput,
  type GeminiApiGenerationPlan,
  type GeminiApiReferenceImage,
	  type GeminiApiRunReceiptSummary,
	  type CreativeBudgetLedger,
	  type CreativeProviderGenerationResult,
	  type CreativeGenerationBudgetLedger,
	  type CutoutAlphaReport,
	  type CutoutContract,
	  type CutoutFailureCode,
	  type CutoutFixtureScore,
	  type CutoutModelCandidate,
	  type CutoutModelSelection,
	  type CutoutSubjectType,
	  type CreativeRunState,
	} from "../src/lib/creative-production";
import {
  CHARACTER_OUTFIT_VARIANTS,
  CHARACTER_POSES,
  type CharacterOutfitVariant,
  type CharacterPose,
} from "../src/lib/visual-assets";

const KNOWN_COMMANDS = new Set([
  "adapters",
  "prepare-subscription",
  "prepare-api",
  "run-api",
	  "doctor",
	  "cutout-bootstrap",
	  "cutout-benchmark",
	  "cutout-readiness",
	  "cutout-auto",
	  "cutout-doctor",
	  "repair-plan",
  "repair-auto",
  "verify-canary",
  "capture-download",
	  "status",
	]);
const KNOWN_FLAGS = new Set([
  "--adapter",
  "--packet",
  "--directive",
  "--artlab-root",
  "--bridge",
  "--board",
  "--slot",
  "--source",
  "--output",
  "--max-tabs",
  "--attempt",
  "--replace",
  "--plan",
  "--lane-count",
  "--concurrency",
  "--budget-cents",
  "--cost-per-image-cents",
  "--resolution",
  "--aspect-ratio",
  "--phase",
  "--dry-run",
  "--force-unlock",
  "--max-attempts",
  "--no-retry-warnings",
  "--json",
	  "--strict",
		  "--fixture-set",
		  "--model-selection",
		  "--tooling-root",
		  "--models",
		  "--skip-install",
	  "--request-retries",
  "--request-timeout-ms",
  "--slots",
  "--quality-mode",
  "--style-preset",
  "--style-preset-policy",
]);
const FLAG_VALUES = new Set(KNOWN_FLAGS);
FLAG_VALUES.delete("--replace");
FLAG_VALUES.delete("--dry-run");
FLAG_VALUES.delete("--force-unlock");
FLAG_VALUES.delete("--no-retry-warnings");
FLAG_VALUES.delete("--json");
FLAG_VALUES.delete("--strict");
FLAG_VALUES.delete("--skip-install");
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);

interface CreativePacketLike {
  assetType: CreativeAssetType;
  name: string;
  runId: string;
  outputRoot: string;
}

interface GenerationDirectiveLike {
  directivePath?: string;
  referenceImages?: Array<string | {
    path: string;
    mimeType?: "image/png" | "image/jpeg" | "image/webp";
    role?: GeminiApiReferenceImage["role"];
  }>;
  sourceRequirements?: {
    minimumLongEdge?: number;
    minimumShortEdge?: number;
    preferredFormat?: string;
    targetWidth?: number;
    targetHeight?: number;
  };
	  generateFirst?: Array<{
	    slot: string;
	    sourceFilename: string;
	    targetDirectory: string;
	    reason?: string;
	    outfit?: string;
	    pose?: string;
	    cutout?: CutoutContract;
	  }>;
	}

interface AuditableGenerationPlanLike {
  adapter: string;
  runId: string;
  assetType: CreativeAssetType;
  name?: string;
  planRoot?: string;
  bridgeRoot?: string;
  sourceRequirements?: {
    minimumLongEdge?: number;
    minimumShortEdge?: number;
  };
	  slots: Array<{
	    slotId: string;
	    baseSlotId?: string;
	    expectedInboxFile: string;
	    inboxDirectory: string;
	    cutout?: CutoutContract;
	  }>;
	}

function validateKnownFlags(argv: string[]): void {
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith("--")) continue;
    if (!KNOWN_FLAGS.has(value)) throw new Error(`Unknown flag: ${value}`);
    if (FLAG_VALUES.has(value)) index += 1;
  }
}

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);

  if (index === -1) return undefined;

  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

function commaListFlag(argv: string[], name: string): string[] | undefined {
  const value = flagValue(argv, name);

  if (!value) return undefined;

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function assertIntegerFlag(
  argv: string[],
	  flag: "--max-tabs" | "--lane-count" | "--concurrency" | "--budget-cents" | "--max-attempts" | "--request-retries" | "--request-timeout-ms",
): number | undefined {
  const value = flagValue(argv, flag);

  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new Error(`${flag} must be an integer.`);

  return Number(value);
}

function assertPositiveRuntimeIntegerFlag(
  argv: string[],
  flag: "--max-attempts" | "--request-retries" | "--request-timeout-ms",
): number | undefined {
  const value = assertIntegerFlag(argv, flag);

  if (value === undefined) return undefined;
  if (value < 1) throw new Error(`${flag} must be at least 1.`);

  return value;
}

function assertPositiveIntegerFlag(argv: string[], flag: "--attempt"): number | undefined {
  const value = flagValue(argv, flag);

  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value) || Number(value) < 1) throw new Error(`${flag} must be a positive integer.`);

  return Number(value);
}

function assertPositiveNumberFlag(argv: string[], flag: "--cost-per-image-cents"): number | undefined {
  const value = flagValue(argv, flag);

  if (value === undefined) return undefined;
  if (!/^\d+(?:\.\d+)?$/.test(value) || Number(value) <= 0) {
    throw new Error(`${flag} must be a positive number.`);
  }

  return Number(value);
}

function assertGeminiApiPhaseFlag(argv: string[]): GeminiApiGenerationPlan["phase"] | undefined {
  const value = flagValue(argv, "--phase");

  if (value === undefined) return undefined;
  if (value !== "initial-design" && value !== "production-pack") {
    throw new Error("--phase must be one of: initial-design, production-pack.");
  }

  return value;
}

function assertQualityModeFlag(argv: string[]): CreativeGenerationQualityMode | undefined {
  const value = flagValue(argv, "--quality-mode");

  if (value === undefined) return undefined;
  if (!CREATIVE_GENERATION_QUALITY_MODES.includes(value as CreativeGenerationQualityMode)) {
    throw new Error(`--quality-mode must be one of: ${CREATIVE_GENERATION_QUALITY_MODES.join(", ")}.`);
  }

  return value as CreativeGenerationQualityMode;
}

function assertStylePresetPolicyFlag(argv: string[]): CreativeGenerationStylePresetPolicy | undefined {
  const value = flagValue(argv, "--style-preset-policy");

  if (value === undefined) return undefined;
  if (!CREATIVE_GENERATION_STYLE_PRESET_POLICIES.includes(value as CreativeGenerationStylePresetPolicy)) {
    throw new Error(`--style-preset-policy must be one of: ${CREATIVE_GENERATION_STYLE_PRESET_POLICIES.join(", ")}.`);
  }

  return value as CreativeGenerationStylePresetPolicy;
}

function assertSafeInputPath(path: string): string {
  const allowedRoots = process.env.NODE_ENV === "test" ? [".", tmpdir()] : ["."];

  return assertSafeWorkspacePath(path, allowedRoots);
}

function assertSafeSourceImagePath(path: string): string {
  const downloadsRoot = join(homedir(), "Downloads");
  const allowedRoots = process.env.NODE_ENV === "test"
    ? [".", downloadsRoot, tmpdir()]
    : [".", downloadsRoot];

  return assertSafeWorkspacePath(path, allowedRoots);
}

function assertSafeArtlabPath(path: string): string {
  const allowedRoots = process.env.NODE_ENV === "test" ? [".artlab", tmpdir()] : [".artlab"];

  return assertSafeWorkspacePath(path, allowedRoots);
}

function assertSafeCutoutOutputPath(path: string): string {
  const allowedRoots = process.env.NODE_ENV === "test" ? [".artlab", tmpdir()] : [".artlab"];

  return assertSafeWorkspacePath(path, allowedRoots);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function pathExists(path: string): Promise<boolean> {
  return stat(path).then(() => true, () => false);
}

function versionedCapturePath(expectedPath: string, attempt: number): string {
  if (attempt === 1) return expectedPath;

  const version = `v${String(attempt).padStart(3, "0")}`;
  const file = basename(expectedPath);
  const versionedFile = /v\d{3}(?=\.[^.]+$)/.test(file)
    ? file.replace(/v\d{3}(?=\.[^.]+$)/, version)
    : file.replace(/(\.[^.]+$)/, `__${version}$1`);

  return join(dirname(expectedPath), versionedFile);
}

function versionedReceiptPath(destination: string, attempt: number): string {
  if (attempt === 1) return join(dirname(destination), "download-receipt.json");

  return join(dirname(destination), `download-receipt-v${String(attempt).padStart(3, "0")}.json`);
}

function versionedApiReceiptPath(destination: string, attempt: number): string {
  if (attempt === 1) return join(dirname(destination), "api-receipt.json");

  return join(dirname(destination), `api-receipt-v${String(attempt).padStart(3, "0")}.json`);
}

function apiReceiptAttemptFromFile(file: string): number {
  const version = file.match(/^api-receipt-v(\d{3})\.json$/)?.[1];

  return version ? Number(version) : 1;
}

function generationReceiptAttemptFromFile(file: string): number {
  const version = file.match(/^(?:api-receipt|download-receipt)-v(\d{3})\.json$/)?.[1];

  return version ? Number(version) : 1;
}

function shellArg(value: string): string {
  return JSON.stringify(value);
}

function assertNoBannedGeneratedCutoutLanguage(label: string, text: string): void {
  if (!containsBannedProductionCutoutLanguage(text)) return;

  const matchedCount = BANNED_PRODUCTION_CUTOUT_TERMS
    .filter((term) => text.toLowerCase().includes(term.toLowerCase()))
    .length;

  throw new Error(`${label} contains ${matchedCount} legacy cutout instruction term(s). Regenerate the directive with the fail-closed cutout compiler contract.`);
}

function assertCreativePacket(value: CreativePacketLike): CreativePacketLike {
  if (!value.assetType || !value.name || !value.runId || !value.outputRoot) {
    throw new Error("--packet must point at a Creative Production Engine creative-brief.json.");
  }

  return value;
}

function creativeRunRootFromGeminiPlan(plan: Pick<GeminiApiGenerationPlan, "planRoot">, planPath: string): string {
  const root = resolve(plan.planRoot ?? dirname(planPath));
  const roleDirectory = basename(root);
  const geminiRoot = dirname(root);

  if ((roleDirectory === "canary" || roleDirectory === "full") && basename(geminiRoot) === "gemini-api-v3") {
    return dirname(dirname(geminiRoot));
  }

  if (basename(root) === "gemini-api-v3" && basename(dirname(root)) === "generation") {
    return dirname(dirname(root));
  }

  return dirname(root);
}

function canaryTransitionHistory(input: {
  currentState?: CreativeRunState;
  nextState: CreativeRunState;
  existing?: Array<Record<string, unknown>>;
  status: "passed" | "blocked" | "pending";
  commandLabel: string;
}): Array<Record<string, unknown>> {
  const history = [...(input.existing ?? [])];
  const at = new Date().toISOString();
  const append = (from: CreativeRunState, to: CreativeRunState, status: "passed" | "blocked") => {
    if (from === to) return;
    if (history.some((entry) => entry.from === from && entry.to === to && entry.commandLabel === input.commandLabel)) return;

    history.push({ from, to, status, commandLabel: input.commandLabel, at });
  };

  if (input.status === "pending") return history;

  if (input.currentState === "canary-required" || !input.currentState) {
    append("canary-required", "canary-running", "passed");
    append("canary-running", input.nextState, input.status);
    return history;
  }

  if (input.currentState === "canary-running") {
    append("canary-running", input.nextState, input.status);
  }

  return history;
}

async function writeCreativeCanaryRunState(input: {
  runRoot: string;
  runId: string;
  assetType: CreativeAssetType;
  name?: string;
  state: CreativeRunState;
  status: "passed" | "blocked" | "pending";
  commandLabel: string;
  canaryPlanPath: string;
  fullPlanPath?: string;
  fixtureSetPath?: string;
  modelSelectionPath?: string;
  blockedReason?: string;
  canaryEvidence?: {
    canaryGatePath?: string;
    cutoutReadinessPath?: string;
    cutoutReceiptPaths?: string[];
    assetDoctorPath?: string;
    reviewBoardPath?: string;
    recordedAt?: string;
  };
}): Promise<void> {
  const runRoot = assertSafeArtlabPath(input.runRoot);
  const runStatePath = assertSafeArtlabPath(join(runRoot, "run-state.json"));
  const existing = await readJson<{
    state?: CreativeRunState;
    transitionHistory?: Array<Record<string, unknown>>;
    canaryEvidence?: Record<string, unknown>;
    fixtureSetPath?: string;
    modelSelectionPath?: string;
    canaryPlanPath?: string;
    fullPlanPath?: string;
  }>(runStatePath).catch(() => undefined);
  const evidence = {
    ...(existing?.canaryEvidence ?? {}),
    ...(input.canaryEvidence ?? {}),
    recordedAt: input.canaryEvidence?.recordedAt ?? new Date().toISOString(),
  };

  await mkdir(runRoot, { recursive: true });
  await writeFile(runStatePath, `${JSON.stringify({
    schemaVersion: "tower-creative-run-state-v1",
    runId: input.runId,
    assetType: input.assetType,
    name: input.name,
    state: input.state,
    nextLegalAction: getNextCreativeRunAction(input.state),
    canaryPlanPath: input.canaryPlanPath,
    fullPlanPath: input.fullPlanPath ?? existing?.fullPlanPath,
    fixtureSetPath: input.fixtureSetPath ?? existing?.fixtureSetPath,
    modelSelectionPath: input.modelSelectionPath ?? existing?.modelSelectionPath,
    canaryBlockedReason: input.blockedReason,
    canaryEvidence: evidence,
    transitionHistory: canaryTransitionHistory({
      currentState: existing?.state,
      nextState: input.state,
      existing: existing?.transitionHistory,
      status: input.status,
      commandLabel: input.commandLabel,
    }),
    updatedAt: new Date().toISOString(),
    promotionPhrase: "approved for app",
    publicArtWritesAllowed: false,
  }, null, 2)}\n`);
}

function assertDirective(value: GenerationDirectiveLike): GenerationDirectiveLike {
  if (!Array.isArray(value.generateFirst) || value.generateFirst.length === 0) {
    throw new Error("--directive must include a non-empty generateFirst array.");
  }

  return value;
}

async function buildSlotsFromDirective(
  directive: GenerationDirectiveLike,
  uiSettings: CreativeGenerationUiSettings,
): Promise<CreativeGenerationSlotInput[]> {
  const directiveMarkdown = directive.directivePath
    ? await readFile(assertSafeInputPath(directive.directivePath), "utf8").catch(() => "")
    : "";

  return directive.generateFirst!.map((slot) => ({
    slotId: slot.slot,
    targetDirectory: slot.targetDirectory,
    targetFilename: slot.sourceFilename,
    reason: slot.reason ?? "Required generation slot.",
    prompt: [
      `Generate exactly one production source image for slot ${slot.slot}.`,
      slot.outfit ? `Outfit: ${slot.outfit}.` : "",
      slot.pose ? `Pose: ${slot.pose}.` : "",
      "Use the attached project directive below as the hard art direction.",
      "Return one image only. No contact sheet. No labels. No UI. No watermark.",
      `Gemini UI quality mode: ${uiSettings.qualityMode}. ${uiSettings.productionRequirement}`,
      "If Gemini only exposes Pro through Redo with Pro, generate once, run Redo with Pro, then download the Pro result.",
      `Gemini UI style preset: ${uiSettings.stylePreset}. Style preset policy: ${uiSettings.stylePresetPolicy}.`,
      "If the style preset is none/default, do not select Color block or any other preset.",
      uiSettings.consistencyRule,
      "Download the highest full-size output available.",
      "",
      directiveMarkdown || "No directive markdown was found; use the slot metadata and run packet.",
    ].filter(Boolean).join("\n"),
  }));
}

async function buildApiSlotsFromDirective(
  directive: GenerationDirectiveLike,
  phase: GeminiApiGenerationPlan["phase"],
): Promise<GeminiApiBaseSlotInput[]> {
  const directiveMarkdown = directive.directivePath
    ? await readFile(assertSafeInputPath(directive.directivePath), "utf8").catch(() => "")
    : "";
	  const isInitialDesign = phase === "initial-design";
	  const backgroundInstructions = phase === "initial-design"
	    ? [
	        "Use a premium simple approval backdrop with high subject/background separation and no patterned walls, furniture overlap, same-color clothing/background collision, or shadows touching the body.",
	        "This is an identity concept board, so prioritize silhouette, face, outfit read, and Tower taste before any production packet exists.",
	      ]
	    : [
	        "Use the premium-simple-backdrop-v1 contract: high subject/background separation, no patterned walls, no furniture overlap, no same-color clothing/background collisions, full-body framing, and generous padding around hair, beard, fingers, glasses, keys, badges, pens, feet, and held props.",
	        "Do not draw contact shadows, ground shadows, halo, glow, haze, ambient spill, or floor-plane lighting that touches or merges with the body silhouette.",
	        "Keep the foreground cleanly separated from the backdrop so local cutout, edge refinement, and strict alpha QA can run deterministically before mastering.",
	      ];

  return directive.generateFirst!.map((slot) => {
    const productionSheetSlot = !isInitialDesign && /(?:turnaround|expression|outfit|variant|sheet)/i.test(slot.slot);

	    return {
	      slotId: slot.slot,
	      cutout: slot.cutout,
	      targetDirectory: slot.targetDirectory,
	      targetFilename: slot.sourceFilename,
	      reason: slot.reason ?? "Required API generation slot.",
	      prompt: [
	        isInitialDesign
	          ? `Generate exactly one initial character concept image for Tower slot ${slot.slot}.`
	          : productionSheetSlot
	            ? `Generate exactly one production packet sheet image for Tower slot ${slot.slot}.`
	            : `Generate exactly one production foreground asset image for Tower slot ${slot.slot}.`,
        slot.outfit ? `Outfit: ${slot.outfit}.` : "",
        slot.pose ? `Pose: ${slot.pose}.` : "",
        productionSheetSlot
          ? "Use Nano Banana 2 only. Create one image file only; this sheet may contain the multiple approved Otis views required by the slot."
          : "Use Nano Banana 2 only. Create one image only, not a contact sheet.",
        isInitialDesign
          ? "Target output: high-resolution portrait 9:16 character identity concept, suitable for choosing a direction before any production pack exists."
          : productionSheetSlot
            ? "Target output: 4K production packet sheet, portrait 9:16 framing, with consistent scale and generous safe padding."
            : "Target output: 4K production source, portrait 9:16 character-sprite framing unless the plan says otherwise.",
        ...backgroundInstructions,
        ...(isInitialDesign ? renderCharacterInitialConceptApiStyleInstructions() : []),
	        productionSheetSlot
	          ? "No text, logo, watermark, UI, frame, or labels. Multiple Otis figures are allowed only as required by this sheet; keep identity consistent across every view."
	          : "No text, logo, watermark, UI, frame, label, duplicate character, or pose sheet.",
	        "Do not use a Color block preset or force a flattened color-block style. Follow the Tower flat-plus-depth style from the directive.",
	        "Preserve natural human imperfections. Avoid fake-perfect AI model faces, superhero jawlines, overly muscular bodies, and plastic skin.",
	        "Keep hands, feet, props, hair, beard, coat hems, and all expected slot props fully uncropped with generous safe padding.",
        "",
        directiveMarkdown || "No directive markdown was found; use the slot metadata and run packet.",
      ].filter(Boolean).join("\n"),
    };
  });
}

function normalizeDirectiveReferences(directive: GenerationDirectiveLike): GeminiApiReferenceImage[] {
  return (directive.referenceImages ?? []).map((reference) => {
    if (typeof reference === "string") {
      return {
        path: assertSafeInputPath(reference),
        mimeType: mimeTypeFromPath(reference),
        role: "identity-reference" as const,
      };
    }

    return {
      path: assertSafeInputPath(reference.path),
      mimeType: reference.mimeType ?? mimeTypeFromPath(reference.path),
      role: reference.role ?? "identity-reference",
    };
  });
}

function mimeTypeFromPath(path: string): GeminiApiReferenceImage["mimeType"] {
  const extension = extname(path).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";

  return "image/png";
}

async function runAdaptersMode(): Promise<void> {
  console.log(JSON.stringify(CREATIVE_GENERATION_ADAPTER_DEFINITIONS, null, 2));
}

async function runPrepareSubscriptionMode(argv: string[]): Promise<void> {
  const adapter = assertCreativeGenerationAdapterId(flagValue(argv, "--adapter") ?? "gemini-subscription-browser");

  if (adapter !== "gemini-subscription-browser") {
    throw new Error("prepare-subscription currently supports --adapter gemini-subscription-browser.");
  }

  const packetPath = flagValue(argv, "--packet");
  const directivePath = flagValue(argv, "--directive");
  const artlabRootInput = flagValue(argv, "--artlab-root") ?? ".artlab";
  const maxTabs = assertIntegerFlag(argv, "--max-tabs");
  const qualityMode = assertQualityModeFlag(argv);
  const stylePreset = flagValue(argv, "--style-preset");
  if (stylePreset) assertAllowedCreativeStylePreset(stylePreset);
  const stylePresetPolicy = assertStylePresetPolicyFlag(argv)
    ?? (stylePreset && stylePreset !== "none/default" ? "approved-style-lock" : undefined);

  if (!packetPath) throw new Error("prepare-subscription requires --packet.");
  if (!directivePath) throw new Error("prepare-subscription requires --directive.");

  const safePacketPath = assertSafeInputPath(packetPath);
  const safeDirectivePath = assertSafeInputPath(directivePath);
  const artlabRoot = assertSafeArtlabPath(artlabRootInput);
  const packet = assertCreativePacket(await readJson<CreativePacketLike>(safePacketPath));
  const directive = assertDirective(await readJson<GenerationDirectiveLike>(safeDirectivePath));
  const bridgeRoot = assertSafeArtlabPath(join(packet.outputRoot, "generation"));
  const inboxRoot = assertSafeArtlabPath(join(artlabRoot, "inbox", packet.assetType, packet.runId));
  const uiSettings = {
    ...(qualityMode ? { qualityMode } : {}),
    ...(stylePreset ? { stylePreset } : {}),
    ...(stylePresetPolicy ? { stylePresetPolicy } : {}),
  };
  const slots = await buildSlotsFromDirective(directive, {
    ...DEFAULT_GEMINI_SUBSCRIPTION_UI_SETTINGS,
    qualityMode: qualityMode ?? DEFAULT_GEMINI_SUBSCRIPTION_UI_SETTINGS.qualityMode,
    stylePreset: stylePreset ?? DEFAULT_GEMINI_SUBSCRIPTION_UI_SETTINGS.stylePreset,
    stylePresetPolicy: stylePresetPolicy ?? DEFAULT_GEMINI_SUBSCRIPTION_UI_SETTINGS.stylePresetPolicy,
  });
  const plan = createGeminiSubscriptionBridgePlan({
    runId: packet.runId,
    assetType: packet.assetType,
    name: packet.name,
    bridgeRoot,
    inboxRoot,
    slots,
    ...(maxTabs ? { maxParallelBrowserTabs: maxTabs } : {}),
    sourceRequirements: directive.sourceRequirements ?? {},
    uiSettings,
  });
  const bridgePath = join(bridgeRoot, "generation-bridge.json");
  const runbookPath = join(bridgeRoot, "gemini-subscription-runbook.md");
  const promptDeckPath = join(bridgeRoot, "prompt-deck.md");

  await mkdir(bridgeRoot, { recursive: true });
  await mkdir(inboxRoot, { recursive: true });
  await Promise.all(plan.slots.map((slot) => mkdir(slot.inboxDirectory, { recursive: true })));
  await writeFile(bridgePath, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(runbookPath, renderGeminiSubscriptionBridgeRunbook(plan));
  await writeFile(promptDeckPath, createPromptDeck(plan));

  console.log(`Created Gemini subscription bridge: ${bridgePath}`);
  console.log(`Runbook: ${runbookPath}`);
  console.log(`Prompt deck: ${promptDeckPath}`);
  console.log(`Inbox root: ${inboxRoot}`);
  console.log(`Slots: ${plan.slots.length}`);
  console.log("Billing: subscription-first, no API billing.");
}

async function runPrepareApiMode(argv: string[]): Promise<void> {
  const adapter = assertCreativeGenerationAdapterId(flagValue(argv, "--adapter") ?? "gemini-api");

  if (adapter !== "gemini-api") {
    throw new Error("prepare-api currently supports --adapter gemini-api only.");
  }

  const packetPath = flagValue(argv, "--packet");
  const directivePath = flagValue(argv, "--directive");
  const artlabRootInput = flagValue(argv, "--artlab-root") ?? ".artlab";
  const laneCount = assertGeminiApiLaneCount(assertIntegerFlag(argv, "--lane-count") ?? GEMINI_API_DEFAULT_LANE_COUNT);
  const maxConcurrency = assertGeminiApiConcurrency(assertIntegerFlag(argv, "--concurrency") ?? GEMINI_API_DEFAULT_CONCURRENCY);
  const budgetCents = assertIntegerFlag(argv, "--budget-cents") ?? GEMINI_API_DEFAULT_BUDGET_CENTS;
  const costPerImageCents = assertPositiveNumberFlag(argv, "--cost-per-image-cents") ?? GEMINI_API_DEFAULT_COST_PER_4K_IMAGE_CENTS;
  const imageSize = assertGeminiApiImageResolution(flagValue(argv, "--resolution") ?? "4K");
  const aspectRatio = assertGeminiApiAspectRatio(flagValue(argv, "--aspect-ratio") ?? "9:16");
  const phase = assertGeminiApiPhaseFlag(argv) ?? "initial-design";

  if (!packetPath) throw new Error("prepare-api requires --packet.");
  if (!directivePath) throw new Error("prepare-api requires --directive.");

  const safePacketPath = assertSafeInputPath(packetPath);
  const safeDirectivePath = assertSafeInputPath(directivePath);
  const artlabRoot = assertSafeArtlabPath(artlabRootInput);
  const packet = assertCreativePacket(await readJson<CreativePacketLike>(safePacketPath));
  const directive = assertDirective(await readJson<GenerationDirectiveLike>(safeDirectivePath));
  const planRoot = assertSafeArtlabPath(join(packet.outputRoot, "generation", "gemini-api-v3"));
  const inboxRoot = assertSafeArtlabPath(join(artlabRoot, "inbox", packet.assetType, packet.runId, "gemini-api-v3"));
  const slots = await buildApiSlotsFromDirective(directive, phase);

  if (phase === "production-pack" && slots.length > 1) {
    const {
      canaryPlan,
	      fullPlan,
	      canaryGatePath,
	      budgetLedgerPath,
	      cutoutReadinessPath,
	      initialBudgetLedger,
	    } = createGeminiApiProductionFirewallPlans({
      runId: packet.runId,
      assetType: packet.assetType,
      name: packet.name,
      planRoot,
      inboxRoot,
      slots,
      model: GEMINI_NANO_BANANA_2_MODEL,
      imageSize,
      aspectRatio,
      laneCount,
      maxConcurrency,
      budgetCents,
      costPerImageCents,
      phase,
      sourceRequirements: directive.sourceRequirements ?? {},
      referenceImages: normalizeDirectiveReferences(directive),
    });
	    const canaryPlanPath = join(canaryPlan.planRoot, "gemini-api-plan.json");
	    const fullPlanPath = join(fullPlan.planRoot, "gemini-api-plan.json");
	    const canaryRunbook = renderGeminiApiRunbook(canaryPlan);
	    const canaryPromptDeck = createGeminiApiPromptDeck(canaryPlan);
	    const fullRunbook = renderGeminiApiRunbook(fullPlan);
	    const fullPromptDeck = createGeminiApiPromptDeck(fullPlan);

	    assertNoBannedGeneratedCutoutLanguage("canary generated plan surfaces", [
	      JSON.stringify(canaryPlan),
	      canaryRunbook,
	      canaryPromptDeck,
	      JSON.stringify(fullPlan),
	      fullRunbook,
	      fullPromptDeck,
	    ].join("\n"));

	    await mkdir(canaryPlan.planRoot, { recursive: true });
    await mkdir(fullPlan.planRoot, { recursive: true });
    await mkdir(inboxRoot, { recursive: true });
	    await Promise.all([...canaryPlan.slots, ...fullPlan.slots].map((slot) => mkdir(slot.inboxDirectory, { recursive: true })));
	    await writeFile(canaryPlanPath, `${JSON.stringify(canaryPlan, null, 2)}\n`);
	    await writeFile(join(canaryPlan.planRoot, "gemini-api-runbook.md"), canaryRunbook);
	    await writeFile(join(canaryPlan.planRoot, "prompt-deck.md"), canaryPromptDeck);
    await writeCreativeProviderBudgetLedger(canaryPlan, createCreativeBudgetLedger({
      runId: canaryPlan.runId,
      approvedBudgetCents: canaryPlan.budgetCents,
    }));
	    await writeFile(fullPlanPath, `${JSON.stringify(fullPlan, null, 2)}\n`);
	    await writeFile(join(fullPlan.planRoot, "gemini-api-runbook.md"), fullRunbook);
	    await writeFile(join(fullPlan.planRoot, "prompt-deck.md"), fullPromptDeck);
    await writeCreativeProviderBudgetLedger(fullPlan, createCreativeBudgetLedger({
      runId: fullPlan.runId,
      approvedBudgetCents: fullPlan.budgetCents,
    }));
	    await writeFile(canaryGatePath, `${JSON.stringify({
	      schemaVersion: "tower-production-canary-gate-v1",
	      runId: packet.runId,
	      status: "pending",
	      canaryPlanPath,
	      fullPlanPath,
	      createdAt: new Date().toISOString(),
	      nextCommands: [
	        `npm run art:generate -- run-api --plan ${canaryPlanPath}`,
	        `npm run art:generate -- cutout-auto --plan ${canaryPlanPath}`,
	        `npm run art:generate -- cutout-doctor --plan ${canaryPlanPath} --strict`,
	        `npm run art:generate -- verify-canary --plan ${canaryPlanPath}`,
	        `npm run art:generate -- cutout-readiness --plan ${fullPlanPath}`,
	      ],
	    }, null, 2)}\n`);
    await writeFile(budgetLedgerPath, `${JSON.stringify(initialBudgetLedger, null, 2)}\n`);
    await writeFile(join(planRoot, "gemini-api-plan.json"), `${JSON.stringify({
      schemaVersion: "tower-gemini-api-production-firewall-index-v1",
      runId: packet.runId,
      status: "canary-required",
      canaryPlanPath,
	      fullPlanPath,
	      canaryGatePath,
	      budgetLedgerPath,
	      cutoutReadinessPath,
	    }, null, 2)}\n`);
	    await writeCreativeCanaryRunState({
	      runRoot: packet.outputRoot,
	      runId: packet.runId,
	      assetType: packet.assetType,
	      name: packet.name,
	      state: "canary-required",
	      status: "pending",
	      commandLabel: "prepare-api-production-firewall",
	      canaryPlanPath,
	      fullPlanPath,
	      fixtureSetPath: join(planRoot, "cutout-fixtures.json"),
	      canaryEvidence: {
	        canaryGatePath,
	        cutoutReadinessPath,
	      },
	    });

    console.log(`Created Gemini API production firewall: ${planRoot}`);
    console.log(`Canary plan: ${canaryPlanPath}`);
    console.log(`Full plan: ${fullPlanPath}`);
	    console.log(`Canary gate: ${canaryGatePath}`);
	    console.log(`Cutout readiness: ${cutoutReadinessPath}`);
    console.log(`Budget ledger: ${budgetLedgerPath}`);
    console.log(`Slots: canary ${canaryPlan.slots.length}; full ${fullPlan.slots.length}; concurrency ${fullPlan.maxConcurrency}`);
    console.log(`Estimated full-pack cost: $${(fullPlan.estimatedCostCents / 100).toFixed(2)} / budget $${(fullPlan.budgetCents / 100).toFixed(2)}`);
    console.log("Billing: API-billed; full pack is blocked until the canary gate passes.");
    return;
  }

  const plan = createGeminiApiGenerationPlan({
    runId: packet.runId,
    assetType: packet.assetType,
    name: packet.name,
    planRoot,
    inboxRoot,
    slots,
    model: GEMINI_NANO_BANANA_2_MODEL,
    imageSize,
    aspectRatio,
    laneCount,
    maxConcurrency,
    budgetCents,
    costPerImageCents,
    phase,
    sourceRequirements: directive.sourceRequirements ?? {},
    referenceImages: normalizeDirectiveReferences(directive),
	  });
	  const planPath = join(planRoot, "gemini-api-plan.json");
	  const runbookPath = join(planRoot, "gemini-api-runbook.md");
	  const promptDeckPath = join(planRoot, "prompt-deck.md");
	  const runbook = renderGeminiApiRunbook(plan);
	  const promptDeck = createGeminiApiPromptDeck(plan);

	  assertNoBannedGeneratedCutoutLanguage("generated plan surfaces", [
	    JSON.stringify(plan),
	    runbook,
	    promptDeck,
	  ].join("\n"));

	  await mkdir(planRoot, { recursive: true });
  await mkdir(inboxRoot, { recursive: true });
	  await Promise.all(plan.slots.map((slot) => mkdir(slot.inboxDirectory, { recursive: true })));
	  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
	  await writeFile(runbookPath, runbook);
	  await writeFile(promptDeckPath, promptDeck);
  await writeCreativeProviderBudgetLedger(plan, createCreativeBudgetLedger({
    runId: plan.runId,
    approvedBudgetCents: plan.budgetCents,
  }));

  console.log(`Created Gemini API v3 plan: ${planPath}`);
  console.log(`Runbook: ${runbookPath}`);
  console.log(`Prompt deck: ${promptDeckPath}`);
  console.log(`Inbox root: ${inboxRoot}`);
  console.log(`Model: ${plan.model} (${plan.modelLabel})`);
  console.log(`Slots: ${plan.slots.length} (${plan.laneCount} lanes x ${slots.length} base slots)`);
  console.log(`Estimated cost: $${(plan.estimatedCostCents / 100).toFixed(2)} / budget $${(plan.budgetCents / 100).toFixed(2)}`);
  console.log("Billing: API-billed; key must come from GEMINI_API_KEY, GOOGLE_API_KEY, or macOS Keychain at runtime.");
}

function readGeminiApiKeyFromEnvironment(): string {
  const assertValidGeminiApiKeyShape = (value: string, source: string): string => {
    const googleApiKeyPrefix = ["AI", "za"].join("");

    if (!new RegExp(`^${googleApiKeyPrefix}[0-9A-Za-z_-]{30,}$`).test(value)) {
      throw new Error(
        `Gemini API key from ${source} does not look like a valid Google API key. Re-save the full key; the runner blocked this before making paid generation requests.`,
      );
    }

    return value;
  };

  for (const envVar of GEMINI_API_SECRET_ENV_VARS) {
    const value = process.env[envVar];

    if (value?.trim()) return assertValidGeminiApiKeyShape(value.trim(), envVar);
  }

  if (process.env.NODE_ENV !== "test") {
    let keychainValue = "";

    try {
      keychainValue = execFileSync("security", [
        "find-generic-password",
        "-s",
        "tower-gemini-api-key",
        "-w",
      ], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      // Fall through to the actionable missing-key error.
    }

    if (keychainValue) return assertValidGeminiApiKeyShape(keychainValue, "macOS Keychain service tower-gemini-api-key");
  }

  throw new Error(`Missing Gemini API key. Set ${GEMINI_API_SECRET_ENV_VARS.join(" or ")} in your local shell or macOS Keychain service tower-gemini-api-key; do not put the key in repo files or command flags.`);
}

async function readReferenceImagesForPayload(plan: GeminiApiGenerationPlan): Promise<Array<{ mimeType: string; dataBase64: string }>> {
  return Promise.all(plan.referenceImages.map(async (reference) => {
    const safePath = assertSafeInputPath(reference.path);
    const bytes = await readFile(safePath);

    return {
      mimeType: reference.mimeType,
      dataBase64: bytes.toString("base64"),
    };
  }));
}

async function readApiReceiptsBySlotId(
  plan: GeminiApiGenerationPlan,
): Promise<Record<string, GeminiApiRunReceiptSummary[]>> {
  const receiptsBySlotId: Record<string, GeminiApiRunReceiptSummary[]> = {};

  for (const slot of plan.slots) {
    const files = await readdir(slot.inboxDirectory)
      .then((entries) => entries.filter((file) => /^api-receipt(?:-v\d{3})?\.json$/.test(file)))
      .catch(() => []);
    const receipts = await Promise.all(files.map(async (file) => {
      const receiptPath = join(slot.inboxDirectory, file);
      const receipt = await readJson<{
        slotId?: string;
        attempt?: number;
        capturedFile?: string;
        qualityWarnings?: string[];
        dryRun?: boolean;
      }>(receiptPath);

      return {
        slotId: receipt.slotId ?? slot.slotId,
        attempt: receipt.attempt ?? apiReceiptAttemptFromFile(file),
        capturedFile: receipt.capturedFile,
        qualityWarnings: receipt.qualityWarnings ?? [],
        dryRun: receipt.dryRun ?? false,
      };
    }));

    receiptsBySlotId[slot.slotId] = receipts.sort((left, right) => (left.attempt ?? 1) - (right.attempt ?? 1));
  }

  return receiptsBySlotId;
}

async function acquireApiRunLock(input: {
  plan: GeminiApiGenerationPlan;
  planPath: string;
  forceUnlock: boolean;
}): Promise<() => Promise<void>> {
  const lockPath = assertSafeArtlabPath(join(input.plan.planRoot, "api-run.lock"));

  if (await pathExists(lockPath)) {
    if (!input.forceUnlock) {
      throw new Error(`Gemini API run is already locked: ${lockPath}. Use --force-unlock only after confirming no run is active.`);
    }

    await rm(lockPath, { force: true });
  }

  await mkdir(dirname(lockPath), { recursive: true });
  await writeFile(lockPath, `${JSON.stringify({
    schemaVersion: "tower-gemini-api-run-lock-v1",
    pid: process.pid,
    createdAt: new Date().toISOString(),
    planPath: input.planPath,
  }, null, 2)}\n`);

  return async () => {
    await rm(lockPath, { force: true });
  };
}

async function writeApiRunState(input: {
  plan: GeminiApiGenerationPlan;
  planPath: string;
  status: "planned" | "running" | "completed" | "completed-with-warnings" | "blocked" | "failed";
  execution: ReturnType<typeof planGeminiApiRunExecution>;
  failures?: string[];
}): Promise<void> {
  const statePath = assertSafeArtlabPath(join(input.plan.planRoot, "api-run-state.json"));

  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, `${JSON.stringify({
    schemaVersion: "tower-gemini-api-run-state-v1",
    runId: input.plan.runId,
    adapter: input.plan.adapter,
    model: input.plan.model,
    planPath: input.planPath,
    status: input.status,
    updatedAt: new Date().toISOString(),
    selected: input.execution.selectedSlots.map((slot) => ({
      slotId: slot.slot.slotId,
      attempt: slot.attempt,
      reason: slot.reason,
    })),
    skipped: input.execution.skippedSlots,
    blockers: input.execution.blockers,
    failures: input.failures ?? [],
    budget: {
      budgetCents: input.plan.budgetCents,
      costPerImageCents: input.plan.costPerImageCents,
      billablePriorImages: input.execution.billablePriorImages,
      billableNewImages: input.execution.billableNewImages,
      projectedCostCents: input.execution.projectedCostCents,
    },
  }, null, 2)}\n`);
}

async function writeBudgetLedgerForApiExecution(input: {
  plan: GeminiApiGenerationPlan;
  execution: ReturnType<typeof planGeminiApiRunExecution>;
  dryRun: boolean;
  allowedSlotIds?: readonly string[];
}): Promise<void> {
  if (input.dryRun || !input.execution.selectedSlots.length) return;

  const ledgerPath = assertSafeArtlabPath(input.plan.firewall?.budgetLedgerPath ?? join(input.plan.planRoot, "generation-budget-ledger.json"));
  const existing = await pathExists(ledgerPath)
    ? await readJson<CreativeGenerationBudgetLedger>(ledgerPath)
    : createGenerationBudgetLedger({
        runId: input.plan.runId,
        assetType: input.plan.assetType,
      });
  const phase = input.plan.phase === "initial-design"
    ? "initial-design"
    : input.plan.firewall?.planRole === "canary"
      ? "canary"
      : input.allowedSlotIds?.length
        ? "slot-repair"
        : "production-pack";
  const batchScope = phase === "initial-design"
    ? "initial-design"
    : phase === "canary"
      ? "canary"
      : phase === "slot-repair"
        ? "slot-repair"
        : "full-pack";
  const next = appendGenerationBudgetEntry(existing, {
    phase,
    reason: input.execution.selectedSlots.map((slot) => `${slot.slot.slotId}:${slot.reason}`).join(", "),
    billableImages: input.execution.billableNewImages,
    costPerImageCents: input.plan.costPerImageCents,
    slotIds: input.execution.selectedSlots.map((slot) => slot.slot.slotId),
    attempt: Math.max(...input.execution.selectedSlots.map((slot) => slot.attempt)),
    batchScope,
  });

  await mkdir(dirname(ledgerPath), { recursive: true });
  await writeFile(ledgerPath, `${JSON.stringify(next, null, 2)}\n`);
}

function getApiRunCompletionStatus(
  plan: GeminiApiGenerationPlan,
  receiptsBySlotId: Record<string, GeminiApiRunReceiptSummary[]>,
): "completed" | "completed-with-warnings" {
  for (const slot of plan.slots) {
    const receipts = receiptsBySlotId[slot.slotId] ?? [];

    if (!receipts.some((receipt) => receipt.qualityWarnings.length === 0)) {
      return "completed-with-warnings";
    }
  }

  return "completed";
}

function creativeProviderBudgetLedgerPath(plan: GeminiApiGenerationPlan): string {
  return assertSafeArtlabPath(join(plan.planRoot, "provider-budget-ledger.json"));
}

async function readCreativeProviderBudgetLedger(
  plan: GeminiApiGenerationPlan,
  options: { allowCreateMissing?: boolean } = {},
): Promise<CreativeBudgetLedger> {
  const ledgerPath = creativeProviderBudgetLedgerPath(plan);
  if (!await pathExists(ledgerPath)) {
    if (!options.allowCreateMissing) {
      throw new Error(`Provider budget ledger is missing: ${ledgerPath}. Re-run prepare-api before live provider work.`);
    }

    return createCreativeBudgetLedger({
      runId: plan.runId,
      approvedBudgetCents: plan.budgetCents,
    });
  }

  const ledger = await readJson<CreativeBudgetLedger>(ledgerPath);
  if (ledger.schemaVersion !== "tower-creative-budget-ledger-v1") {
    throw new Error(`Provider budget ledger is stale or malformed: ${ledgerPath}.`);
  }
  if (ledger.runId !== plan.runId) {
    throw new Error(`Provider budget ledger runId mismatch at ${ledgerPath}.`);
  }
  if (ledger.approvedBudgetCents !== plan.budgetCents) {
    throw new Error(`Provider budget ledger budget mismatch at ${ledgerPath}; regenerate the plan or reconcile the ledger before spending.`);
  }

  return ledger;
}

async function writeCreativeProviderBudgetLedger(
  plan: GeminiApiGenerationPlan,
  ledger: CreativeBudgetLedger,
): Promise<void> {
  const ledgerPath = creativeProviderBudgetLedgerPath(plan);
  await mkdir(dirname(ledgerPath), { recursive: true });
  await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
}

function hashGeminiApiReferenceContract(plan: GeminiApiGenerationPlan): string {
  return plan.firewall?.referenceContractHash
    ?? createHash("sha256").update(JSON.stringify(plan.referenceImages)).digest("hex");
}

function hashGeminiApiSlotSource(slot: GeminiApiGenerationPlan["slots"][number]): string {
  return createHash("sha256")
    .update([slot.baseSlotId, slot.targetDirectory, slot.targetFilename, slot.promptHash].join("|"))
    .digest("hex");
}

async function runGeminiApiPlanWithScheduler(input: {
  plan: GeminiApiGenerationPlan;
  execution: ReturnType<typeof planGeminiApiRunExecution>;
  dryRun: boolean;
  requestRetries: number;
  requestTimeoutMs: number;
  retryWarnings: boolean;
}): Promise<void> {
  const apiKey = input.dryRun ? "" : readGeminiApiKeyFromEnvironment();
  const referenceImages = input.dryRun ? [] : await readReferenceImagesForPayload(input.plan);
  const referenceHash = hashGeminiApiReferenceContract(input.plan);
  const selectedBySlotId = new Map(input.execution.selectedSlots.map((selected) => [selected.slot.slotId, selected]));
  const ledger = await readCreativeProviderBudgetLedger(input.plan, {
    allowCreateMissing: input.dryRun,
  });
  const provider = createGeminiApiProviderAdapter({
    costCents: input.dryRun ? 0 : input.plan.costPerImageCents,
    maxConcurrency: input.plan.maxConcurrency,
    generateSlot: async (request): Promise<CreativeProviderGenerationResult> => {
      const selected = selectedBySlotId.get(request.slotId);
      if (!selected) throw new Error(`Scheduler requested unknown Gemini API slot ${request.slotId}.`);

      const image = input.dryRun
        ? await createDryRunPng(selected.slot.slotId)
        : await requestGeminiImageWithRetries({
          plan: input.plan,
          slot: selected.slot,
          apiKey,
          referenceImages,
          requestRetries: input.requestRetries,
          requestTimeoutMs: input.requestTimeoutMs,
        });
      const written = await writeApiGeneratedImage({
        plan: input.plan,
        slot: selected.slot,
        image,
        dryRun: input.dryRun,
        attempt: selected.attempt,
      });
      const warning = written.qualityWarnings.length > 0;

      return {
        status: warning ? "warning" : "clean",
        actualCostCents: input.dryRun ? 0 : input.plan.costPerImageCents,
        outputHash: written.outputHash,
        responseMetadata: {
          provider: input.plan.adapter,
          model: input.plan.model,
          phase: input.plan.phase,
          dryRun: input.dryRun,
          capturedFile: written.capturedFile,
          responseBytes: image.responseBytes,
          qualityWarnings: written.qualityWarnings,
          scheduler: "durable-slot-scheduler-v1",
        },
        ...(warning ? {
          failureClassification: {
            code: written.qualityWarnings[0] ?? "source-warning",
            retryable: true,
            paid: !input.dryRun,
            severity: "warning" as const,
          },
        } : {}),
      };
    },
  });
  const namedRetrySlotIds = input.execution.selectedSlots
    .filter((selected) => selected.reason === "retry-warning-receipt")
    .map((selected) => selected.slot.slotId);

  const result = await runCreativeSlotScheduler({
    runId: input.plan.runId,
    budgetLedger: ledger,
    provider,
    slots: input.execution.selectedSlots.map((selected) => ({
      slotId: selected.slot.slotId,
      providerId: "gemini-api" as const,
      prompt: selected.slot.prompt,
      sourceHash: hashGeminiApiSlotSource(selected.slot),
      promptHash: selected.slot.promptHash,
      referenceHash,
      providerModel: input.plan.model,
      attemptId: `api-attempt-${selected.attempt}`,
      metadata: {
        apiAttempt: selected.attempt,
        reason: selected.reason,
      },
    })),
    policy: {
      perRunMaxConcurrency: input.plan.maxConcurrency,
      perProviderMaxConcurrency: {
        "gemini-api": input.plan.maxConcurrency,
      },
      localStageMaxConcurrency: Math.min(3, Math.max(1, input.plan.maxConcurrency)),
      slotLeaseTimeoutMs: 120_000,
    },
    retry: {
      retryWarnings: input.retryWarnings,
      ...(namedRetrySlotIds.length ? { namedSlotIds: namedRetrySlotIds } : {}),
    },
    leaseStore: new FileCreativeSlotLeaseStore(assertSafeArtlabPath(join(input.plan.planRoot, "slot-leases"))),
    workerId: `gemini-api-runner-${process.pid}`,
    processLocalOutput: async ({ providerResult }) => ({
      status: providerResult.status,
      ...(providerResult.outputHash ? { outputHash: providerResult.outputHash } : {}),
      ...(providerResult.failureClassification ? { failureClassification: providerResult.failureClassification } : {}),
    }),
    onProgress: (snapshot) => {
      console.log(`Scheduler progress: provider=${snapshot.runningProviderSlots.length}, local=${snapshot.runningLocalSlots.length}, completed=${snapshot.completed}, failed=${snapshot.failed}, pending=${snapshot.pending}`);
    },
  });

  await writeCreativeProviderBudgetLedger(input.plan, result.budgetLedger);

  if (result.status === "completed-with-failures") {
    const failures = Object.values(result.slotResults)
      .filter((slot) => slot.stage === "failed")
      .map((slot) => `${slot.slotId}:${slot.failureClassification?.code ?? "failed"}`);

    throw new Error(`Gemini API scheduler finished with ${failures.length} failed slot(s): ${failures.join(" | ")}`);
  }
}

function extractImagePart(response: unknown): { mimeType: string; dataBase64: string } {
  const candidates = (response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { mimeType?: string; data?: string };
          inline_data?: { mime_type?: string; data?: string };
        }>;
      };
    }>;
  }).candidates ?? [];

  for (const candidate of candidates) {
    for (const part of candidate.content?.parts ?? []) {
      const inlineData = part.inlineData ?? (part.inline_data
        ? {
          mimeType: part.inline_data.mime_type,
          data: part.inline_data.data,
        }
        : undefined);

      if (inlineData?.data) {
        return {
          mimeType: inlineData.mimeType ?? "image/png",
          dataBase64: inlineData.data,
        };
      }
    }
  }

  throw new Error("Gemini API response did not include an image part.");
}

async function requestGeminiImage(input: {
  plan: GeminiApiGenerationPlan;
  slot: GeminiApiGenerationPlan["slots"][number];
  apiKey: string;
  referenceImages: Array<{ mimeType: string; dataBase64: string }>;
  requestTimeoutMs: number;
}): Promise<{ mimeType: string; dataBase64: string; responseBytes: number }> {
  const url = `${input.plan.apiBaseUrl}/models/${input.plan.model}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
  const payload = createGeminiGenerateContentPayload({
    prompt: input.slot.prompt,
    aspectRatio: input.slot.request.aspectRatio,
    imageSize: input.slot.request.imageSize,
    referenceImages: input.referenceImages,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, input.requestTimeoutMs);
  let response: Response;
  let responseText: string;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    responseText = await response.text();
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") {
      const timeoutError = new Error(`Gemini API request timed out after ${input.requestTimeoutMs}ms for ${input.slot.slotId}.`);

      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = responseText.slice(0, 800);

    try {
      const parsed = JSON.parse(responseText) as { error?: { message?: string } };
      message = parsed.error?.message ?? message;
    } catch {
      // Keep raw provider text.
    }

    const error = new Error(redactGeminiApiSecretText(`Gemini API ${response.status} for ${input.slot.slotId}: ${message}`));

    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const image = extractImagePart(JSON.parse(responseText));

  return {
    ...image,
    responseBytes: Buffer.byteLength(responseText),
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function requestGeminiImageWithRetries(input: {
  plan: GeminiApiGenerationPlan;
  slot: GeminiApiGenerationPlan["slots"][number];
  apiKey: string;
  referenceImages: Array<{ mimeType: string; dataBase64: string }>;
  requestRetries: number;
  requestTimeoutMs: number;
}): Promise<{ mimeType: string; dataBase64: string; responseBytes: number }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= input.requestRetries; attempt += 1) {
    try {
      return await requestGeminiImage(input);
    } catch (error) {
      lastError = error;
      const canRetry = isRetryableGeminiApiRequestFailure(error);

      if (!canRetry || attempt === input.requestRetries) break;
      await sleep(250 * attempt);
    }
  }

  throw lastError instanceof Error
    ? new Error(redactGeminiApiSecretText(lastError.message))
    : new Error(redactGeminiApiSecretText(String(lastError)));
}

async function writeApiGeneratedImage(input: {
  plan: GeminiApiGenerationPlan;
  slot: GeminiApiGenerationPlan["slots"][number];
  image: { mimeType: string; dataBase64: string; responseBytes: number };
  dryRun: boolean;
  attempt: number;
}): Promise<{ capturedFile: string; outputHash: string; qualityWarnings: string[] }> {
  const destination = assertSafeArtlabPath(versionedCapturePath(input.slot.expectedInboxFile, input.attempt));
  const receiptPath = versionedApiReceiptPath(destination, input.attempt);
  const bytes = Buffer.from(input.image.dataBase64, "base64");
  const outputHash = createHash("sha256").update(bytes).digest("hex");

  if (await pathExists(destination)) {
    throw new Error(`${destination} already exists. Refusing to overwrite an existing API attempt.`);
  }

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);

  const metadata = await sharp(bytes).metadata();
  const longEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  const shortEdge = Math.min(metadata.width ?? 0, metadata.height ?? 0);
  const sourceRequirements = input.plan.sourceRequirements;
  const qualityWarnings = [
    sourceRequirements.minimumLongEdge && longEdge < sourceRequirements.minimumLongEdge
      ? `source-long-edge-below-${sourceRequirements.minimumLongEdge}`
      : "",
    sourceRequirements.minimumShortEdge && shortEdge < sourceRequirements.minimumShortEdge
      ? `source-short-edge-below-${sourceRequirements.minimumShortEdge}`
      : "",
    metadata.hasAlpha ? "" : "source-missing-alpha",
    input.image.mimeType !== "image/png" ? `source-mime-${input.image.mimeType.replace("/", "-")}` : "",
    input.dryRun ? "dry-run-not-production-art" : "",
  ].filter(Boolean);

  await writeFile(receiptPath, `${JSON.stringify({
    schemaVersion: "tower-gemini-api-receipt-v3",
    adapter: input.plan.adapter,
    runId: input.plan.runId,
    slotId: input.slot.slotId,
    attempt: input.attempt,
    laneId: input.slot.laneId,
    baseSlotId: input.slot.baseSlotId,
    model: input.plan.model,
    imageSize: input.plan.imageSize,
    aspectRatio: input.plan.aspectRatio,
    promptHash: input.slot.promptHash,
    outputHash,
    dryRun: input.dryRun,
    capturedFile: destination,
    capturedAt: new Date().toISOString(),
    responseBytes: input.image.responseBytes,
    metadata: {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      hasAlpha: metadata.hasAlpha,
      mimeType: input.image.mimeType,
    },
    qualityWarnings,
  }, null, 2)}\n`);

  console.log(`Generated ${input.slot.slotId}: ${destination}`);
  console.log(`Dimensions: ${metadata.width ?? "unknown"}x${metadata.height ?? "unknown"}`);
  console.log(`Quality warnings: ${qualityWarnings.length ? qualityWarnings.join(", ") : "none"}`);

  return {
    capturedFile: destination,
    outputHash,
    qualityWarnings,
  };
}

async function createDryRunPng(slotId: string): Promise<{ mimeType: string; dataBase64: string; responseBytes: number }> {
  const image = await sharp({
    create: {
      width: 96,
      height: 128,
      channels: 4,
      background: slotId.includes("lane-02") ? "#8f6a4e" : "#bfa36f",
    },
  }).png().toBuffer();

  return {
    mimeType: "image/png",
    dataBase64: image.toString("base64"),
    responseBytes: image.byteLength,
  };
}

async function runApiMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");
  const dryRun = argv.includes("--dry-run");
  const forceUnlock = argv.includes("--force-unlock");
  const maxAttempts = assertPositiveRuntimeIntegerFlag(argv, "--max-attempts") ?? 3;
  const requestRetries = assertPositiveRuntimeIntegerFlag(argv, "--request-retries") ?? 3;
  const requestTimeoutMs = assertPositiveRuntimeIntegerFlag(argv, "--request-timeout-ms") ?? 300_000;
  const retryWarnings = !argv.includes("--no-retry-warnings");
  const allowedSlotIds = commaListFlag(argv, "--slots");

  if (!planPath) throw new Error("run-api requires --plan.");

  const safePlanPath = assertSafeInputPath(planPath);
  const plan = await readJson<GeminiApiGenerationPlan>(safePlanPath);

  if (plan.schemaVersion !== "tower-gemini-api-generation-plan-v3") {
    throw new Error("--plan must point at a Gemini API v3 plan.");
  }

  if (plan.model !== GEMINI_NANO_BANANA_2_MODEL) {
    throw new Error(`Refusing to run non-Nano Banana 2 model: ${plan.model}`);
  }

  if (plan.phase !== "initial-design" && plan.phase !== "production-pack") {
    throw new Error("Refusing to run outdated Gemini API plan without explicit phase. Regenerate it with prepare-api.");
  }

	  if (plan.firewall?.requiresCanary) {
	    const gatePath = plan.firewall.canaryGatePath
	      ? assertSafeInputPath(plan.firewall.canaryGatePath)
	      : undefined;
	    const readinessPath = plan.firewall.cutoutReadinessPath
	      ? assertSafeInputPath(plan.firewall.cutoutReadinessPath)
	      : undefined;
	    const gate = gatePath && await pathExists(gatePath)
	      ? await readJson<{ status?: string; promptContractHash?: string; referenceContractHash?: string; sourceContractHash?: string }>(gatePath)
	      : undefined;
	    const readiness = readinessPath && await pathExists(readinessPath)
	      ? await readJson<{ status?: string; score?: number; threshold?: number }>(readinessPath)
	      : undefined;
	    const gatePassed = gate?.status === "passed"
	      && (!gate.promptContractHash || gate.promptContractHash === plan.firewall.promptContractHash)
	      && (!gate.referenceContractHash || gate.referenceContractHash === plan.firewall.referenceContractHash)
	      && (!gate.sourceContractHash || gate.sourceContractHash === plan.firewall.sourceContractHash);

	    if (!gatePassed) {
	      throw new Error(`Full production API plan is blocked until the canary gate passes: ${gatePath ?? "missing canary gate"}.`);
	    }

	    if (readiness?.status !== "ready") {
	      throw new Error(`Full production API plan is blocked until cutout readiness passes: ${readinessPath ?? "missing cutout readiness"}.`);
	    }
	  }

  const releaseLock = await acquireApiRunLock({
    plan,
    planPath: safePlanPath,
    forceUnlock,
  });

  try {
    const receiptsBySlotId = await readApiReceiptsBySlotId(plan);
    const execution = planGeminiApiRunExecution({
      plan,
      receiptsBySlotId,
      dryRun,
      maxAttempts,
      retryWarnings,
      allowedSlotIds,
    });

    await writeApiRunState({
      plan,
      planPath: safePlanPath,
      status: execution.blockers.length ? "blocked" : "planned",
      execution,
    });

    console.log(`Running Gemini API v3 plan: ${safePlanPath}`);
    console.log(`Model: ${plan.model} (${plan.modelLabel})`);
    console.log(`Slots: ${plan.slots.length}; selected: ${execution.selectedSlots.length}; skipped: ${execution.skippedSlots.length}; concurrency: ${plan.maxConcurrency}; dryRun: ${dryRun ? "yes" : "no"}`);
    console.log(`Attempts: max ${maxAttempts}; retry warning receipts: ${retryWarnings ? "yes" : "no"}; request retries: ${requestRetries}`);
    console.log(`Request timeout: ${requestTimeoutMs}ms; concurrent workers: ${Math.min(plan.maxConcurrency, execution.selectedSlots.length)}`);
    console.log(`Projected cost: $${(execution.projectedCostCents / 100).toFixed(2)} / budget $${(plan.budgetCents / 100).toFixed(2)}`);
    if (execution.skippedSlots.length) {
      console.log(`Skipped slots: ${execution.skippedSlots.map((slot) => `${slot.slotId}:${slot.reason}`).join(", ")}`);
    }
    if (execution.selectedSlots.length) {
      console.log(`Selected slots: ${execution.selectedSlots.map((slot) => `${slot.slot.slotId}:attempt-${slot.attempt}:${slot.reason}`).join(", ")}`);
    }

    if (execution.blockers.length) {
      throw new Error(`Gemini API run blocked: ${execution.blockers.join(" ")}`);
    }

    if (!execution.selectedSlots.length) {
      console.log("No API slots require generation.");
      const finalReceiptsBySlotId = await readApiReceiptsBySlotId(plan);
      await writeApiRunState({
        plan,
        planPath: safePlanPath,
        status: getApiRunCompletionStatus(plan, finalReceiptsBySlotId),
        execution,
      });
      return;
    }

    await readCreativeProviderBudgetLedger(plan, {
      allowCreateMissing: dryRun,
    });

    if (!dryRun) {
      readGeminiApiKeyFromEnvironment();
      await readReferenceImagesForPayload(plan);
    }

    await writeBudgetLedgerForApiExecution({
      plan,
      execution,
      dryRun,
      allowedSlotIds,
    });
    await writeApiRunState({
      plan,
      planPath: safePlanPath,
      status: "running",
      execution,
    });

    await runGeminiApiPlanWithScheduler({
      plan,
      execution,
      dryRun,
      requestRetries,
      requestTimeoutMs,
      retryWarnings,
    });

    const finalReceiptsBySlotId = await readApiReceiptsBySlotId(plan);

    await writeApiRunState({
      plan,
      planPath: safePlanPath,
      status: getApiRunCompletionStatus(plan, finalReceiptsBySlotId),
      execution,
    });
  } catch (error) {
    const receiptsBySlotId = await readApiReceiptsBySlotId(plan).catch(() => ({}));
    const execution = planGeminiApiRunExecution({
      plan,
      receiptsBySlotId,
      dryRun,
      maxAttempts,
      retryWarnings,
      allowedSlotIds,
    });

    await writeApiRunState({
      plan,
      planPath: safePlanPath,
      status: "failed",
      execution,
      failures: [error instanceof Error ? redactGeminiApiSecretText(error.message) : redactGeminiApiSecretText(String(error))],
    }).catch(() => undefined);

    throw error;
  } finally {
    await releaseLock();
  }
}

async function readLatestGenerationReceipt(input: {
  inboxDirectory: string;
}): Promise<{
  receiptPath: string;
  attempt: number;
  capturedFile?: string;
  qualityWarnings: string[];
} | undefined> {
  const files = await readdir(input.inboxDirectory)
    .then((entries) => entries.filter((file) => /^(?:api-receipt(?:-v\d{3})?|download-receipt(?:-v\d{3})?)\.json$/.test(file)))
    .catch(() => []);

  const receipts = await Promise.all(files.map(async (file) => {
    const receiptPath = join(input.inboxDirectory, file);
    const receipt = await readJson<{
      attempt?: number;
      capturedFile?: string;
      qualityWarnings?: string[];
    }>(receiptPath);
    const attempt = receipt.attempt ?? generationReceiptAttemptFromFile(file);

    return {
      receiptPath,
      attempt,
      capturedFile: receipt.capturedFile,
      qualityWarnings: receipt.qualityWarnings ?? [],
    };
  }));

  return receipts.sort((left, right) => right.attempt - left.attempt)[0];
}

async function runDoctorMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");
  const boardPath = flagValue(argv, "--board");
  const json = argv.includes("--json");
  const strict = argv.includes("--strict");

  if (!planPath) throw new Error("doctor requires --plan or --bridge.");

  const safePlanPath = assertSafeInputPath(planPath);
  const plan = await readJson<(CreativeGenerationBridgePlan | GeminiApiGenerationPlan) & {
    planRoot?: string;
    bridgeRoot?: string;
    sourceRequirements?: {
      minimumLongEdge?: number;
      minimumShortEdge?: number;
    };
	    slots: Array<{
	      slotId: string;
	      expectedInboxFile: string;
	      inboxDirectory: string;
	      cutout?: CutoutContract;
	    }>;
	  }>(safePlanPath);
  const reportPath = assertSafeArtlabPath(join(
    plan.planRoot ?? plan.bridgeRoot ?? dirname(safePlanPath),
    "asset-doctor.json",
  ));
  const generatedImages = await Promise.all(plan.slots.map(async (slot) => {
	    const receipt = await readLatestGenerationReceipt({
	      inboxDirectory: slot.inboxDirectory,
	    });
	    const cutoutReceipt = strict && slot.cutout?.required
	      ? await readLatestCutoutReceipt({
	          inboxDirectory: slot.inboxDirectory,
	          slotId: slot.slotId,
	        })
	      : undefined;
	    const imagePath = cutoutReceipt?.outputPath
	      ? assertSafeInputPath(cutoutReceipt.outputPath)
	      : receipt?.capturedFile
	      ? assertSafeInputPath(receipt.capturedFile)
	      : slot.expectedInboxFile;
    const inspection = await validateCreativeImageFile({
      path: imagePath,
      issueCodeForMissing: "missing-generated-image",
      minimumLongEdge: plan.sourceRequirements?.minimumLongEdge,
      minimumShortEdge: plan.sourceRequirements?.minimumShortEdge,
	      requireAlpha: strict && (plan.assetType === "character" || Boolean(slot.cutout?.required)),
	    });
	    const cutoutPassed = slot.cutout?.required && cutoutReceipt?.status === "passed";
	    const receiptWarnings = slot.cutout?.required
	      ? receipt?.qualityWarnings.filter((warning) =>
	          warning !== "source-missing-alpha" &&
	          !(cutoutPassed && warning.startsWith("source-mime-image-")),
	        ) ?? []
	      : receipt?.qualityWarnings ?? [];
	    const cutoutIssues = strict && slot.cutout?.required
	      ? !cutoutReceipt
	        ? [{
	            code: "missing-cutout-receipt",
	            severity: "blocker",
	            path: slot.inboxDirectory,
	            message: `No cutout receipt exists for slot ${slot.slotId}.`,
	          }]
	        : cutoutReceipt.status !== "passed"
	          ? (cutoutReceipt.failureCodes?.length ? cutoutReceipt.failureCodes : ["cutout-failed"]).map((code) => ({
	              code,
	              severity: "blocker",
	              path: cutoutReceipt.receiptPath,
	              message: `Slot ${slot.slotId} cutout failed: ${code}`,
	            }))
	          : []
	      : [];
	    const receiptIssues = !receipt
	      ? [{
	          code: "missing-generation-receipt",
          severity: "blocker",
          path: slot.inboxDirectory,
          message: `No generation receipt exists for slot ${slot.slotId}.`,
	        }]
	      : receiptWarnings.map((warning) => ({
          code: "receipt-quality-warning",
          severity: strict ? "blocker" : "warning",
          path: receipt.receiptPath,
          message: `Slot ${slot.slotId} latest receipt warning: ${warning}`,
        }));

    return {
      slotId: slot.slotId,
      expectedInboxFile: imagePath,
      inspection,
      receipt,
	      issues: [
	        ...inspection.issues,
	        ...receiptIssues,
	        ...cutoutIssues,
	      ],
    };
  }));
  const boardValidation = boardPath
    ? await validateReviewBoardImageReferences({ boardPath: assertSafeInputPath(boardPath) })
    : undefined;
  const issues = [
    ...generatedImages.flatMap((image) => image.issues),
    ...(boardValidation?.issues ?? []),
  ];
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const report = {
    schemaVersion: "tower-creative-asset-doctor-v1",
    planPath: safePlanPath,
    boardPath: boardPath ? assertSafeInputPath(boardPath) : undefined,
    status: blockers.length ? "blocked" : warnings.length ? "warnings" : "passed",
    strict,
    checkedAt: new Date().toISOString(),
    checkedGeneratedImages: generatedImages.map((image) => ({
      slotId: image.slotId,
      path: image.expectedInboxFile,
      width: image.inspection.width,
      height: image.inspection.height,
      format: image.inspection.format,
      hasAlpha: image.inspection.hasAlpha,
      latestReceiptPath: image.receipt?.receiptPath,
      latestReceiptWarnings: image.receipt?.qualityWarnings ?? [],
    })),
    checkedReviewImages: boardValidation?.checkedImages ?? [],
    issues,
    recoveryActions: blockers.length
      ? [
          "Do not show this board as clean and do not promote this run.",
          "Regenerate missing or corrupt slots with npm run art:generate run-api -- --plan <plan>.",
          "Rebuild the review board after every referenced image is local and decodable.",
        ]
      : warnings.length
        ? [
            "Treat this run as concept-only or repair warnings before production promotion.",
            "Use --strict before final upload-ready approval to turn quality warnings into blockers.",
          ]
        : [
            "Generated image and review-board references are locally loadable.",
          ],
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Asset doctor: ${report.status}`);
    console.log(`Report: ${reportPath}`);
    if (issues.length) {
      console.log(`Issues: ${issues.map((issue) => issue.code).join(", ")}`);
    }
  }

	  if (blockers.length) {
	    throw new Error(`Asset doctor blocked: ${blockers.map((issue) => issue.code).join(", ")}`);
	  }
	}

async function sha256File(path: string): Promise<string> {
  return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
}

function sha256Buffer(buffer: Buffer | Uint8Array): string {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function cutoutToolingRoot(argv: string[]): string {
  return assertSafeArtlabPath(flagValue(argv, "--tooling-root") ?? ".artlab/tooling/cutout");
}

function defaultCutoutModelSelectionPath(argv: string[]): string {
  return assertSafeArtlabPath(flagValue(argv, "--model-selection") ?? join(cutoutToolingRoot(argv), "cutout-model-selection.json"));
}

function cutoutModelSelectionPathForReadiness(
  argv: string[],
  plan: AuditableGenerationPlanLike,
  safePlanPath: string,
): string {
  const explicitModelSelectionPath = flagValue(argv, "--model-selection");

  if (explicitModelSelectionPath) {
    return assertSafeArtlabPath(explicitModelSelectionPath);
  }

  const firewallReadinessPath = "firewall" in plan && typeof (plan as GeminiApiGenerationPlan).firewall?.cutoutReadinessPath === "string"
    ? (plan as GeminiApiGenerationPlan).firewall!.cutoutReadinessPath!
    : undefined;

  if (firewallReadinessPath) {
    return assertSafeArtlabPath(join(dirname(assertSafeArtlabPath(firewallReadinessPath)), "cutout-model-selection.json"));
  }

  const planRoot = plan.planRoot ?? plan.bridgeRoot ?? dirname(safePlanPath);

  if ((basename(planRoot) === "full" || basename(planRoot) === "canary") && basename(dirname(planRoot)) === "gemini-api-v3") {
    return assertSafeArtlabPath(join(dirname(planRoot), "cutout-model-selection.json"));
  }

  return defaultCutoutModelSelectionPath(argv);
}

function requiredCutoutSubjectTypes(plan: AuditableGenerationPlanLike): CutoutSubjectType[] {
  return Array.from(new Set(plan.slots
    .map((slot) => slot.cutout)
    .filter((contract): contract is CutoutContract => Boolean(contract?.required))
    .map((contract) => contract.subjectType)));
}

function canaryGatePathForPlan(plan: AuditableGenerationPlanLike): string | undefined {
  return "firewall" in plan && typeof (plan as GeminiApiGenerationPlan).firewall?.canaryGatePath === "string"
    ? (plan as GeminiApiGenerationPlan).firewall!.canaryGatePath!
    : undefined;
}

function isCanaryGatedFullProductionPlan(plan: AuditableGenerationPlanLike): boolean {
  return "firewall" in plan &&
    (plan as GeminiApiGenerationPlan).firewall?.planRole === "full" &&
    (plan as GeminiApiGenerationPlan).firewall?.requiresCanary === true;
}

interface CutoutModelSelectionFile extends CutoutModelSelection {
  fixtureSetPath?: string;
  candidateManifest?: CutoutModelCandidate[];
  benchmarkResults?: CutoutFixtureScore[];
  selectedAt?: string;
}

interface CutoutBenchmarkFixture {
  id: string;
  sourcePath: string;
  expectedMaskPath?: string;
  subjectType: CutoutSubjectType;
  topologyType?: string;
  fixtureSet: CutoutFixtureScore["fixtureSet"];
  contract?: CutoutContract;
}

interface CutoutWorkerResult {
  outputPath: string;
  rawMaskHash: string;
  refinedMaskHash: string;
  refinedPngHash: string;
  sourceSaliencyBounds?: { left: number; top: number; right: number; bottom: number };
  sourceSaliencyPixels: number;
  rawMaskPath?: string;
  refinedMaskPath?: string;
  modelExecution: {
    adapter: CutoutModelCandidate["adapter"];
    mode: "offline-cached";
    command?: string;
  };
}

async function readCutoutModelSelection(path: string): Promise<CutoutModelSelectionFile | undefined> {
  if (!await pathExists(path)) return undefined;

  return readJson<CutoutModelSelectionFile>(path);
}

function selectedModelForContract(
  selection: CutoutModelSelectionFile | undefined,
  contract: CutoutContract,
): CutoutModelSelection["winners"][CutoutSubjectType] | undefined {
  if (selection?.status !== "ready") return undefined;

  return selection.winners[contract.subjectType];
}

function selectedCandidateForContract(
  selection: CutoutModelSelectionFile | undefined,
  contract: CutoutContract,
): CutoutModelCandidate | undefined {
  const winner = selectedModelForContract(selection, contract);

  if (!winner) return undefined;

  return selection?.candidateManifest?.find((candidate) => candidate.id === winner.candidateId);
}

async function cachedModelFailure(candidate: CutoutModelCandidate): Promise<CutoutFailureCode | undefined> {
  if (
    !candidate.packageLicense.trim() ||
    !candidate.modelWeightLicense.trim() ||
    !candidate.modelWeightSourceUrl.trim() ||
    !candidate.modelWeightSha256.trim() ||
    !candidate.cachedModelPath.trim()
  ) {
    return "license-blocked";
  }

  if (!await pathExists(candidate.cachedModelPath)) return "cutout-model-missing";

  const actualHash = await sha256File(candidate.cachedModelPath);

  return actualHash === candidate.modelWeightSha256 ? undefined : "license-blocked";
}

function bboxFromMask(mask: Uint8Array, width: number, threshold = 32): {
  bounds?: { left: number; top: number; right: number; bottom: number };
  pixels: number;
} {
  let left = width;
  let right = -1;
  let top = Number.POSITIVE_INFINITY;
  let bottom = -1;
  let pixels = 0;

  for (let index = 0; index < mask.length; index += 1) {
    if ((mask[index] ?? 0) < threshold) continue;

    const x = index % width;
    const y = Math.floor(index / width);

    pixels += 1;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }

  if (!pixels) return { pixels };

  return {
    bounds: { left, top, right, bottom },
    pixels,
  };
}

interface MaskComponent {
  pixels: number[];
  count: number;
}

function foregroundComponents(mask: Uint8Array, width: number, height: number, threshold = 32): MaskComponent[] {
  const visited = new Uint8Array(mask.length);
  const components: MaskComponent[] = [];
  const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

  for (let index = 0; index < mask.length; index += 1) {
    if (visited[index] || (mask[index] ?? 0) < threshold) continue;

    const stack = [index];
    const pixels: number[] = [];

    visited[index] = 1;

    while (stack.length) {
      const current = stack.pop()!;
      const x = current % width;
      const y = Math.floor(current / width);

      pixels.push(current);

      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

        const next = (ny * width) + nx;

        if (visited[next] || (mask[next] ?? 0) < threshold) continue;

        visited[next] = 1;
        stack.push(next);
      }
    }

    components.push({ pixels, count: pixels.length });
  }

  return components.sort((left, right) => right.count - left.count);
}

function dilateMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let value = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if ((mask[(ny * width) + nx] ?? 0) > 0) value = 255;
        }
      }

      output[(y * width) + x] = value;
    }
  }

  return output;
}

function erodeMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let value = 255;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || ny < 0 || nx >= width || ny >= height || (mask[(ny * width) + nx] ?? 0) === 0) {
            value = 0;
          }
        }
      }

      output[(y * width) + x] = value;
    }
  }

  return output;
}

function cleanupMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const cleaned = new Uint8Array(mask.length);
  const components = foregroundComponents(mask, width, height);
  const minimumComponentPixels = Math.max(4, Math.floor(mask.length * 0.00015));

  for (const component of components) {
    if (component !== components[0] && component.count < minimumComponentPixels) continue;
    for (const pixel of component.pixels) cleaned[pixel] = 255;
  }

  return erodeMask(dilateMask(cleaned, width, height), width, height);
}

function maskBufferHash(mask: Uint8Array): string {
  return sha256Buffer(mask);
}

async function alphaMaskForImage(imagePath: string): Promise<{
  mask: Uint8Array;
  width: number;
  height: number;
}> {
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    mask: new Uint8Array(data),
    width: info.width,
    height: info.height,
  };
}

async function writeMaskImage(mask: Uint8Array, width: number, height: number, outputPath: string): Promise<void> {
  await sharp(Buffer.from(mask), { raw: { width, height, channels: 1 } })
    .png()
    .toFile(outputPath);
}

async function runSimpleBackdropSegmentation(input: {
  sourcePath: string;
  outputPath: string;
  candidate: CutoutModelCandidate;
}): Promise<CutoutWorkerResult> {
  const { data, info } = await sharp(input.sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const border: number[][] = [];

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const isBorder = x < 3 || y < 3 || x >= info.width - 3 || y >= info.height - 3;

      if (!isBorder) continue;

      const offset = ((y * info.width) + x) * channels;
      border.push([
        data[offset] ?? 0,
        data[offset + 1] ?? 0,
        data[offset + 2] ?? 0,
      ]);
    }
  }

  const average = (channel: number) =>
    border.reduce((sum, sample) => sum + (sample[channel] ?? 0), 0) / Math.max(1, border.length);
  const background = [average(0), average(1), average(2)];
  const borderDistances = border.map((sample) => Math.hypot(
    (sample[0] ?? 0) - background[0]!,
    (sample[1] ?? 0) - background[1]!,
    (sample[2] ?? 0) - background[2]!,
  ));
  const mean = borderDistances.reduce((sum, value) => sum + value, 0) / Math.max(1, borderDistances.length);
  const variance = borderDistances.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / Math.max(1, borderDistances.length);
  const threshold = Math.max(18, Math.min(84, mean + (Math.sqrt(variance) * 6)));
  const rawMask = new Uint8Array(info.width * info.height);

  for (let pixel = 0; pixel < rawMask.length; pixel += 1) {
    const offset = pixel * channels;
    const distance = Math.hypot(
      (data[offset] ?? 0) - background[0]!,
      (data[offset + 1] ?? 0) - background[1]!,
      (data[offset + 2] ?? 0) - background[2]!,
    );

    rawMask[pixel] = distance > threshold ? 255 : 0;
  }

  const refinedMask = cleanupMask(rawMask, info.width, info.height);
  const saliency = bboxFromMask(rawMask, info.width);
  const rawMaskPath = input.outputPath.replace(/\.png$/i, "__raw-mask.png");
  const refinedMaskPath = input.outputPath.replace(/\.png$/i, "__refined-mask.png");

  await mkdir(dirname(input.outputPath), { recursive: true });
  await writeMaskImage(rawMask, info.width, info.height, rawMaskPath);
  await writeMaskImage(refinedMask, info.width, info.height, refinedMaskPath);
  const rgba = Buffer.alloc(info.width * info.height * 4);

  for (let pixel = 0; pixel < refinedMask.length; pixel += 1) {
    const sourceOffset = pixel * channels;
    const targetOffset = pixel * 4;

    rgba[targetOffset] = data[sourceOffset] ?? 0;
    rgba[targetOffset + 1] = data[sourceOffset + 1] ?? 0;
    rgba[targetOffset + 2] = data[sourceOffset + 2] ?? 0;
    rgba[targetOffset + 3] = refinedMask[pixel] ?? 0;
  }

  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(input.outputPath);

  return {
    outputPath: input.outputPath,
    rawMaskHash: maskBufferHash(rawMask),
    refinedMaskHash: maskBufferHash(refinedMask),
    refinedPngHash: await sha256File(input.outputPath),
    sourceSaliencyBounds: saliency.bounds,
    sourceSaliencyPixels: saliency.pixels,
    rawMaskPath,
    refinedMaskPath,
    modelExecution: {
      adapter: input.candidate.adapter,
      mode: "offline-cached",
    },
  };
}

async function estimateSourceSaliencyFromBackdrop(sourcePath: string): Promise<{
  bounds?: { left: number; top: number; right: number; bottom: number };
  pixels: number;
}> {
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const samples: number[][] = [];

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (!(x < 3 || y < 3 || x >= info.width - 3 || y >= info.height - 3)) continue;

      const offset = ((y * info.width) + x) * channels;
      samples.push([data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0]);
    }
  }

  const average = (channel: number) =>
    samples.reduce((sum, sample) => sum + (sample[channel] ?? 0), 0) / Math.max(1, samples.length);
  const background = [average(0), average(1), average(2)];
  const distances = samples.map((sample) => Math.hypot(
    (sample[0] ?? 0) - background[0]!,
    (sample[1] ?? 0) - background[1]!,
    (sample[2] ?? 0) - background[2]!,
  ));
  const mean = distances.reduce((sum, value) => sum + value, 0) / Math.max(1, distances.length);
  const variance = distances.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / Math.max(1, distances.length);
  const threshold = Math.max(18, Math.min(84, mean + (Math.sqrt(variance) * 6)));
  const mask = new Uint8Array(info.width * info.height);

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * channels;
    const distance = Math.hypot(
      (data[offset] ?? 0) - background[0]!,
      (data[offset + 1] ?? 0) - background[1]!,
      (data[offset + 2] ?? 0) - background[2]!,
    );

    mask[pixel] = distance > threshold ? 255 : 0;
  }

  return bboxFromMask(mask, info.width);
}

async function runAlphaPassThroughCutout(input: {
  sourcePath: string;
  outputPath: string;
  candidate: CutoutModelCandidate;
}): Promise<CutoutWorkerResult> {
  await mkdir(dirname(input.outputPath), { recursive: true });
  await sharp(input.sourcePath)
    .ensureAlpha()
    .png()
    .toFile(input.outputPath);

  const sourceMask = await alphaMaskForImage(input.sourcePath);
  const outputMask = await alphaMaskForImage(input.outputPath);
  const saliency = bboxFromMask(sourceMask.mask, sourceMask.width);

  return {
    outputPath: input.outputPath,
    rawMaskHash: maskBufferHash(sourceMask.mask),
    refinedMaskHash: maskBufferHash(outputMask.mask),
    refinedPngHash: await sha256File(input.outputPath),
    sourceSaliencyBounds: saliency.bounds,
    sourceSaliencyPixels: saliency.pixels,
    modelExecution: {
      adapter: input.candidate.adapter,
      mode: "offline-cached",
    },
  };
}

async function runRembgCutout(input: {
  sourcePath: string;
  outputPath: string;
  candidate: CutoutModelCandidate;
  toolingRoot: string;
}): Promise<CutoutWorkerResult> {
  const pythonPath = join(input.toolingRoot, "venv", "bin", "python");
  const workerPath = join(process.cwd(), "scripts", "cutout-rembg-worker.py");

  if (!await pathExists(pythonPath)) {
    throw new Error("cutout-model-missing: rembg venv is missing; run cutout-bootstrap first.");
  }

  const sourceSaliency = await estimateSourceSaliencyFromBackdrop(input.sourcePath);

  await mkdir(dirname(input.outputPath), { recursive: true });
  execFileSync(pythonPath, [
    workerPath,
    "--source",
    input.sourcePath,
    "--output",
    input.outputPath,
    "--model",
    input.candidate.modelName,
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      U2NET_HOME: dirname(input.candidate.cachedModelPath),
      HF_HUB_OFFLINE: "1",
      TRANSFORMERS_OFFLINE: "1",
    },
    stdio: "pipe",
  });

  const sourceMask = await alphaMaskForImage(input.outputPath);

  return {
    outputPath: input.outputPath,
    rawMaskHash: maskBufferHash(sourceMask.mask),
    refinedMaskHash: maskBufferHash(sourceMask.mask),
    refinedPngHash: await sha256File(input.outputPath),
    sourceSaliencyBounds: sourceSaliency.bounds,
    sourceSaliencyPixels: sourceSaliency.pixels,
    modelExecution: {
      adapter: input.candidate.adapter,
      mode: "offline-cached",
      command: `${pythonPath} ${workerPath}`,
    },
  };
}

async function runSelectedCutoutWorker(input: {
  sourcePath: string;
  outputPath: string;
  candidate: CutoutModelCandidate;
  toolingRoot: string;
}): Promise<CutoutWorkerResult> {
  if (input.candidate.adapter === "local-alpha-pass-through") {
    return runAlphaPassThroughCutout(input);
  }

  if (input.candidate.adapter === "simple-backdrop-segmentation") {
    return runSimpleBackdropSegmentation(input);
  }

  if (input.candidate.adapter === "rembg") {
    return runRembgCutout(input);
  }

  throw new Error(`cutout-model-missing: unsupported cutout adapter ${input.candidate.adapter}`);
}

async function collectFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(root, entry.name);

    return entry.isDirectory() ? collectFiles(path) : [path];
  }));

  return files.flat();
}

function chooseBootstrapPython(): string {
  const candidates = [process.env.PYTHON, "python3.13", "python3", "python"].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("bootstrap-failed: no Python executable was found.");
}

async function readLatestCutoutReceipt(input: {
  inboxDirectory: string;
  slotId: string;
}): Promise<{
  receiptPath: string;
  status?: string;
  outputPath?: string;
  sourcePath?: string;
  sourceAttempt?: number;
  masteredPngPath?: string;
  derivedPreviewPath?: string;
  reviewPreviewPath?: string;
  parentCutoutReceiptPath?: string;
  selectedModel?: CutoutModelSelection["winners"][CutoutSubjectType];
  selectedCandidate?: CutoutModelCandidate;
  modelSelectionPath?: string;
  qa?: CutoutAlphaReport;
  failureCodes?: CutoutFailureCode[];
  thresholds?: CutoutContract["thresholds"];
} | undefined> {
  const files = await readdir(input.inboxDirectory)
    .then((entries) => entries.filter((file) => /^cutout-receipt(?:-v\d{3})?\.json$/.test(file)))
    .catch(() => []);
  const receipts = await Promise.all(files.map(async (file) => {
    const receiptPath = join(input.inboxDirectory, file);
    const receipt = await readJson<{
      slotId?: string;
      status?: string;
      outputPath?: string;
      sourcePath?: string;
      sourceAttempt?: number;
      masteredPngPath?: string;
      derivedPreviewPath?: string;
      reviewPreviewPath?: string;
      parentCutoutReceiptPath?: string;
      selectedModel?: CutoutModelSelection["winners"][CutoutSubjectType];
      selectedCandidate?: CutoutModelCandidate;
      modelSelectionPath?: string;
      qa?: CutoutAlphaReport;
      failureCodes?: CutoutFailureCode[];
      thresholds?: CutoutContract["thresholds"];
    }>(receiptPath);

    return {
      receiptPath,
      status: receipt.status,
      outputPath: receipt.outputPath,
      sourcePath: receipt.sourcePath,
      sourceAttempt: receipt.sourceAttempt,
      masteredPngPath: receipt.masteredPngPath,
      derivedPreviewPath: receipt.derivedPreviewPath,
      reviewPreviewPath: receipt.reviewPreviewPath,
      parentCutoutReceiptPath: receipt.parentCutoutReceiptPath,
      selectedModel: receipt.selectedModel,
      selectedCandidate: receipt.selectedCandidate,
      modelSelectionPath: receipt.modelSelectionPath,
      qa: receipt.qa,
      failureCodes: receipt.failureCodes,
      thresholds: receipt.thresholds,
      order: file === "cutout-receipt.json" ? 1 : Number(file.match(/v(\d{3})/)?.[1] ?? 1),
      slotId: receipt.slotId,
    };
  }));

  return receipts
    .filter((receipt) => !receipt.slotId || receipt.slotId === input.slotId)
    .sort((left, right) => right.order - left.order)[0];
}

async function extractAlphaMaskHash(imagePath: string): Promise<string> {
  const { data } = await sharp(imagePath)
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });

  return sha256Buffer(data);
}

async function runCutoutBootstrapMode(argv: string[]): Promise<void> {
  const root = cutoutToolingRoot(argv);
  const manifestPath = join(root, "bootstrap-manifest.json");
  const packageLockPath = join(root, "package-lock.json");
  const modelCachePath = join(root, "models");
  const licensePath = join(root, "licenses", "README.md");
  const venvPath = join(root, "venv");
  const modelManifestPath = join(root, "model-manifest.json");
  const skipInstall = argv.includes("--skip-install");
  const requestedModels = commaListFlag(argv, "--models") ?? ["isnet-general-use", "u2net"];
  const createdAt = new Date().toISOString();
  const pinnedTooling = [
    {
      package: "rembg",
      version: "2.0.75",
      packageSourceUrl: "https://pypi.org/project/rembg/",
      projectSourceUrl: "https://github.com/danielgatis/rembg",
      packageLicense: "MIT",
      modelWeightsMustBeLicensedSeparately: true,
    },
    {
      package: "@imgly/background-removal",
      version: "1.7.0",
      packageSourceUrl: "https://github.com/imgly/background-removal-js",
      packageLicense: "AGPL-3.0",
      productionUse: "license-blocked-until-reviewed",
    },
  ];
  const manifest: Record<string, unknown> = {
    schemaVersion: "tower-cutout-bootstrap-v1",
    status: "ready-for-benchmark",
    createdAt,
    productionOfflineByDefault: true,
    networkAllowedOnlyForBootstrap: true,
    skipInstall,
    requestedModels,
    pinnedTooling,
    requiredModelManifestFields: [
      "modelWeightSourceUrl",
      "modelWeightLicense",
      "modelWeightSha256",
      "cachedModelPath",
      "provenanceNote",
    ],
    paths: {
      root,
      venvPath,
      modelCachePath,
      modelManifestPath,
      packageLockPath,
      licensePath,
    },
  };

  await mkdir(modelCachePath, { recursive: true });
  await mkdir(dirname(licensePath), { recursive: true });
  await writeFile(packageLockPath, `${JSON.stringify({
    schemaVersion: "tower-cutout-tooling-lock-v1",
    createdAt,
    packages: pinnedTooling,
  }, null, 2)}\n`);

  try {
    if (!skipInstall) {
      const python = chooseBootstrapPython();
      const venvPython = join(venvPath, "bin", "python");

      execFileSync(python, ["-m", "venv", venvPath], { stdio: "pipe" });
      execFileSync(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], { stdio: "pipe" });
      execFileSync(venvPython, ["-m", "pip", "install", "rembg[cpu]==2.0.75"], { stdio: "pipe" });
      execFileSync(venvPython, [
        "-c",
        [
          "import sys",
          "from rembg import new_session",
          "for model_name in sys.argv[1:]:",
          "    new_session(model_name)",
        ].join("\n"),
        ...requestedModels,
      ], {
        stdio: "pipe",
        env: {
          ...process.env,
          U2NET_HOME: modelCachePath,
        },
      });
    }

    const cachedFiles = await collectFiles(modelCachePath);
    const candidates: CutoutModelCandidate[] = [];

    for (const modelName of requestedModels) {
      const cachedModelPath = cachedFiles.find((file) =>
        basename(file).toLowerCase().includes(modelName.toLowerCase()) && !file.endsWith(".json"),
      );

      if (!cachedModelPath) continue;

      candidates.push({
        id: `rembg-${modelName}`,
        adapter: "rembg",
        packageName: "rembg",
        packageVersion: "2.0.75",
        packageLicense: "MIT",
        modelName,
        modelVersion: "bootstrap-cache",
        modelWeightSourceUrl: "https://github.com/danielgatis/rembg/releases",
        modelWeightLicense: "requires-project-license-review",
        modelWeightSha256: await sha256File(cachedModelPath),
        cachedModelPath,
        supports: [
          { subjectType: "character" },
          { subjectType: "hair-beard-character" },
          { subjectType: "prop" },
          { subjectType: "ui-object" },
          { subjectType: "foreground-layer" },
        ],
      });
    }

    await writeFile(modelManifestPath, `${JSON.stringify({
      schemaVersion: "tower-cutout-model-cache-manifest-v1",
      createdAt,
      status: candidates.length || skipInstall ? "ready-for-license-review" : "bootstrap-failed",
      productionMayUseOnlyCachedFiles: true,
      candidates,
    }, null, 2)}\n`);

    if (!skipInstall && !candidates.length) {
      manifest.status = "bootstrap-failed";
    }
  } catch (error) {
    manifest.status = "bootstrap-failed";
    manifest.error = error instanceof Error ? error.message : String(error);
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(licensePath, [
    "# Tower Cutout Tooling Licenses",
    "",
    "Bootstrap may prepare package and model records, but production only uses cached models with package plus model-weight license evidence.",
    "A package license is not enough; each model weight needs source URL, license text, provenance note, and hash.",
    "",
  ].join("\n"));

  console.log(`Cutout bootstrap manifest: ${manifestPath}`);
  console.log("Production mode remains offline by default.");

  if (manifest.status === "bootstrap-failed") {
    throw new Error(`Cutout bootstrap failed: ${String(manifest.error ?? "no cached model files were prepared")}`);
  }
}

function defaultContractForFixture(fixture: CutoutBenchmarkFixture): CutoutContract {
  if (fixture.contract) return fixture.contract;

  const assetType: CreativeAssetType = fixture.subjectType === "prop"
    ? "prop"
    : fixture.subjectType === "ui-object"
      ? "ui-texture"
      : fixture.subjectType === "hard-surface-icon"
        ? "icon-system"
        : "character";

  return createDefaultCutoutContract({
    assetType,
    slotId: fixture.id,
    name: fixture.subjectType.includes("character") ? "Otis" : fixture.id,
  });
}

async function maskIou(leftPath: string, rightPath: string): Promise<number> {
  const left = await alphaMaskForImage(leftPath);
  const right = await sharp(rightPath)
    .ensureAlpha()
    .extractChannel("alpha")
    .resize(left.width, left.height, { fit: "fill" })
    .raw()
    .toBuffer();
  let intersection = 0;
  let union = 0;

  for (let index = 0; index < left.mask.length; index += 1) {
    const leftOn = (left.mask[index] ?? 0) >= 32;
    const rightOn = (right[index] ?? 0) >= 32;

    if (leftOn && rightOn) intersection += 1;
    if (leftOn || rightOn) union += 1;
  }

  return union ? intersection / union : 0;
}

async function runBenchmarkFixture(input: {
  candidate: CutoutModelCandidate;
  fixture: CutoutBenchmarkFixture;
  outputRoot: string;
  toolingRoot: string;
}): Promise<CutoutFixtureScore> {
  const sourcePath = assertSafeInputPath(input.fixture.sourcePath);
  const fixtureOutputRoot = join(input.outputRoot, input.candidate.id, input.fixture.id);
  const outputPath = assertSafeCutoutOutputPath(join(fixtureOutputRoot, "cutout.png"));
  const contract = defaultContractForFixture(input.fixture);
  const workerResult = await runSelectedCutoutWorker({
    sourcePath,
    outputPath,
    candidate: input.candidate,
    toolingRoot: input.toolingRoot,
  });
  const qa = await evaluateCutoutAlpha({
    imagePath: workerResult.outputPath,
    thresholds: contract.thresholds,
    expectedProps: contract.expectedProps,
    sourceSaliencyBounds: workerResult.sourceSaliencyBounds,
    sourceSaliencyPixels: workerResult.sourceSaliencyPixels,
  });
  const qaScore = qa.status === "passed"
    ? 0.96
    : Math.max(0, 0.86 - (qa.failures.length * 0.18));
  const iouScore = input.fixture.expectedMaskPath
    ? await maskIou(workerResult.outputPath, assertSafeInputPath(input.fixture.expectedMaskPath))
    : qaScore;
  const score = Number(((qaScore * 0.65) + (iouScore * 0.35)).toFixed(4));

  await writeFile(join(fixtureOutputRoot, "benchmark-receipt.json"), `${JSON.stringify({
    schemaVersion: "tower-cutout-benchmark-receipt-v1",
    candidateId: input.candidate.id,
    fixtureId: input.fixture.id,
    sourcePath,
    outputPath: workerResult.outputPath,
    rawMaskHash: workerResult.rawMaskHash,
    refinedMaskHash: workerResult.refinedMaskHash,
    refinedPngHash: workerResult.refinedPngHash,
    sourceSaliencyBounds: workerResult.sourceSaliencyBounds,
    qa,
    score,
    createdAt: new Date().toISOString(),
  }, null, 2)}\n`);

  return {
    candidateId: input.candidate.id,
    subjectType: input.fixture.subjectType,
    topologyType: input.fixture.topologyType as CutoutFixtureScore["topologyType"],
    fixtureSet: input.fixture.fixtureSet,
    score,
  };
}

async function runCutoutBenchmarkMode(argv: string[]): Promise<void> {
  const fixtureSetPath = flagValue(argv, "--fixture-set");
  const outputPath = defaultCutoutModelSelectionPath(argv);
  const toolingRoot = cutoutToolingRoot(argv);

  if (!fixtureSetPath) throw new Error("cutout-benchmark requires --fixture-set.");

  const fixtureSet = await readJson<{
    candidates: CutoutModelCandidate[];
    fixtureScores?: CutoutFixtureScore[];
    fixtures?: CutoutBenchmarkFixture[];
    requiredSubjectTypes: CutoutSubjectType[];
    minimumScore?: number;
  }>(assertSafeInputPath(fixtureSetPath));
  const benchmarkRoot = assertSafeCutoutOutputPath(join(dirname(outputPath), "benchmark-runs"));
  const fixtureScores = [...(fixtureSet.fixtureScores ?? [])];

  if (fixtureSet.fixtures?.length) {
    for (const fixture of fixtureSet.fixtures) {
      for (const candidate of fixtureSet.candidates.filter((entry) =>
        entry.supports.some((support) => support.subjectType === fixture.subjectType),
      )) {
        const failure = await cachedModelFailure(candidate);

        if (failure) continue;

        fixtureScores.push(await runBenchmarkFixture({
          candidate,
          fixture,
          outputRoot: benchmarkRoot,
          toolingRoot,
        }));
      }
    }
  }

  const selection = selectCutoutModelWinners({
    ...fixtureSet,
    fixtureScores,
    verifyCachedFiles: true,
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({
    ...selection,
    fixtureSetPath: assertSafeInputPath(fixtureSetPath),
    candidateManifest: fixtureSet.candidates,
    benchmarkResults: fixtureScores,
    selectedAt: new Date().toISOString(),
  }, null, 2)}\n`);

  console.log(`Cutout model selection: ${selection.status}`);
  console.log(`Report: ${outputPath}`);

  if (selection.status !== "ready") {
    throw new Error(`Cutout benchmark blocked: ${selection.missingSubjectTypes.join(", ") || selection.blocked.map((entry) => entry.reason).join(", ")}`);
  }
}

interface CutoutReceiptEvidence {
  receiptPath: string;
  status?: string;
  slotId?: string;
  outputPath?: string;
  sourcePath?: string;
  masteredPngPath?: string;
  derivedPreviewPath?: string;
  reviewPreviewPath?: string;
  parentCutoutReceiptPath?: string;
  selectedModel?: CutoutModelSelection["winners"][CutoutSubjectType];
  selectedCandidate?: CutoutModelCandidate;
  modelSelectionPath?: string;
  qa?: CutoutAlphaReport;
  failureCodes?: CutoutFailureCode[];
  thresholds?: CutoutContract["thresholds"];
}

async function readCutoutReceiptEvidence(path: string, seen = new Set<string>()): Promise<CutoutReceiptEvidence> {
  const safePath = assertSafeInputPath(path);
  const receipt = await readJson<Omit<CutoutReceiptEvidence, "receiptPath">>(safePath);

  if ((!receipt.selectedCandidate || !receipt.selectedModel) && receipt.parentCutoutReceiptPath && !seen.has(receipt.parentCutoutReceiptPath)) {
    seen.add(receipt.parentCutoutReceiptPath);

    const parent = await readCutoutReceiptEvidence(receipt.parentCutoutReceiptPath, seen).catch(() => undefined);

    if (parent) {
      return {
        ...receipt,
        selectedModel: receipt.selectedModel ?? parent.selectedModel,
        selectedCandidate: receipt.selectedCandidate ?? parent.selectedCandidate,
        modelSelectionPath: receipt.modelSelectionPath ?? parent.modelSelectionPath,
        receiptPath: safePath,
      };
    }
  }

  return {
    ...receipt,
    receiptPath: safePath,
  };
}

async function readCanaryEvidenceChecks(input: {
  plan: AuditableGenerationPlanLike;
  safePlanPath: string;
  canaryGate?: {
    status?: string;
    cutoutStatus?: string;
    planPath?: string;
    checkedImages?: Array<{
      slotId?: string;
      cutoutReceiptPath?: string;
    }>;
  };
}): Promise<Array<{
  slotId: string;
  sourcePath?: string;
  sourceExists: boolean;
  cutoutReceiptPath?: string;
  cutoutStatus?: string;
  qaStatus?: string;
  failureCodes: CutoutFailureCode[];
  backdropScore: number;
  framingScore: number;
  complexityScore: number;
  contract?: CutoutContract;
  selectedCandidate?: CutoutModelCandidate;
  selectedModel?: CutoutModelSelection["winners"][CutoutSubjectType];
}>> {
  if (input.canaryGate?.status !== "passed" || input.canaryGate.cutoutStatus !== "passed") return [];

  const canaryPlan = input.canaryGate.planPath
    ? await readJson<AuditableGenerationPlanLike>(assertSafeInputPath(input.canaryGate.planPath)).catch(() => undefined)
    : undefined;
  const allSlots = [...(canaryPlan?.slots ?? []), ...input.plan.slots];
  const checks = [];

  for (const checkedImage of input.canaryGate.checkedImages ?? []) {
    if (!checkedImage.cutoutReceiptPath) continue;

    const receipt = await readCutoutReceiptEvidence(checkedImage.cutoutReceiptPath);
    const slot = allSlots.find((candidate) =>
      candidate.slotId === checkedImage.slotId ||
      candidate.baseSlotId === checkedImage.slotId ||
      candidate.slotId === receipt.slotId ||
      candidate.baseSlotId === receipt.slotId,
    );
    const contract = slot?.cutout;
    const qa = receipt.qa;
    const minPadding = contract?.thresholds.minimumPadding;
    const paddingValues = qa?.metrics.padding && minPadding
      ? [
          qa.metrics.padding.top / Math.max(0.0001, minPadding.top),
          qa.metrics.padding.right / Math.max(0.0001, minPadding.right),
          qa.metrics.padding.bottom / Math.max(0.0001, minPadding.bottom),
          qa.metrics.padding.left / Math.max(0.0001, minPadding.left),
        ]
      : [];
    const paddingFit = paddingValues.length ? Math.min(...paddingValues, 1) : 0;

    checks.push({
      slotId: checkedImage.slotId ?? receipt.slotId ?? slot?.slotId ?? checkedImage.cutoutReceiptPath,
      sourcePath: receipt.sourcePath,
      sourceExists: receipt.sourcePath ? await pathExists(receipt.sourcePath) : false,
      cutoutReceiptPath: checkedImage.cutoutReceiptPath,
      cutoutStatus: receipt.status,
      qaStatus: qa?.status,
      failureCodes: receipt.failureCodes ?? [],
      backdropScore: receipt.status === "passed" && qa?.status === "passed" ? 0.95 : 0,
      framingScore: receipt.status === "passed" && qa?.status === "passed" && (!paddingValues.length || paddingFit >= 1) ? 0.95 : Math.max(0, Math.min(0.88, paddingFit)),
      complexityScore: receipt.status === "passed" && qa?.status === "passed" && !receipt.failureCodes?.includes("prop-lost") ? 0.94 : 0.55,
      contract,
      selectedCandidate: receipt.selectedCandidate,
      selectedModel: receipt.selectedModel,
    });
  }

  return checks;
}

async function promoteCanaryModelSelection(input: {
  selection: CutoutModelSelectionFile | undefined;
  modelSelectionPath: string;
  subjectTypes: CutoutSubjectType[];
  canaryChecks: Array<{
    contract?: CutoutContract;
    cutoutStatus?: string;
    qaStatus?: string;
    selectedCandidate?: CutoutModelCandidate;
  }>;
}): Promise<CutoutModelSelectionFile | undefined> {
  const winners: CutoutModelSelectionFile["winners"] = { ...(input.selection?.winners ?? {}) };
  const candidateManifest = new Map<string, CutoutModelCandidate>();
  const benchmarkResults = [...(input.selection?.benchmarkResults ?? [])];
  let changed = false;

  for (const candidate of input.selection?.candidateManifest ?? []) {
    candidateManifest.set(candidate.id, candidate);
  }

  for (const subjectType of input.subjectTypes) {
    if (input.selection?.status === "ready" && winners[subjectType]) continue;

    const evidence = input.canaryChecks.find((check) =>
      check.cutoutStatus === "passed" &&
      check.qaStatus === "passed" &&
      check.contract?.subjectType === subjectType &&
      Boolean(check.selectedCandidate),
    );
    const receiptCandidate = evidence?.selectedCandidate;
    const manifestCandidate = receiptCandidate ? candidateManifest.get(receiptCandidate.id) : undefined;
    const candidate = receiptCandidate
      ? {
          ...manifestCandidate,
          ...receiptCandidate,
          supports: receiptCandidate.supports ?? manifestCandidate?.supports ?? [{ subjectType }],
        } as CutoutModelCandidate
      : undefined;

    if (!candidate?.supports.some((support) => support.subjectType === subjectType)) continue;

    const failure = await cachedModelFailure(candidate);

    if (failure) continue;

    candidateManifest.set(candidate.id, candidate);
    winners[subjectType] = {
      candidateId: candidate.id,
      modelName: candidate.modelName,
      modelVersion: candidate.modelVersion,
      score: 0.94,
    };
    benchmarkResults.push({
      candidateId: candidate.id,
      subjectType,
      ...(evidence?.contract?.topologyType ? { topologyType: evidence.contract.topologyType } : {}),
      fixtureSet: "fresh-natural-canary",
      score: 0.94,
    });
    changed = true;
  }

  const missingSubjectTypes = input.subjectTypes.filter((subjectType) => !winners[subjectType]);
  const nextSelection: CutoutModelSelectionFile = {
    schemaVersion: "tower-cutout-model-selection-v1",
    status: missingSubjectTypes.length ? "blocked" : "ready",
    winners,
    blocked: missingSubjectTypes.length ? (input.selection?.blocked ?? []) : [],
    missingSubjectTypes,
    fixtureSetPath: input.selection?.fixtureSetPath,
    candidateManifest: Array.from(candidateManifest.values()),
    benchmarkResults,
    selectedAt: new Date().toISOString(),
    ...(changed ? {
      promotedFromPassedCanary: true,
      canaryPromotionReason: "Full production readiness uses the passed canary cutout receipt and locked cached model evidence; missing full-plan source files are expected before full production generation.",
    } : {}),
  } as CutoutModelSelectionFile & {
    promotedFromPassedCanary?: boolean;
    canaryPromotionReason?: string;
  };

  if (changed || input.selection?.status !== nextSelection.status || input.selection?.missingSubjectTypes?.length) {
    await mkdir(dirname(input.modelSelectionPath), { recursive: true });
    await writeFile(input.modelSelectionPath, `${JSON.stringify(nextSelection, null, 2)}\n`);
  }

  return nextSelection;
}

async function runCutoutReadinessMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");

  if (!planPath) throw new Error("cutout-readiness requires --plan.");

  const safePlanPath = assertSafeInputPath(planPath);
  const plan = await readJson<AuditableGenerationPlanLike>(safePlanPath);
  const modelSelectionPath = cutoutModelSelectionPathForReadiness(argv, plan, safePlanPath);
  let selection = await readCutoutModelSelection(modelSelectionPath);
  const subjectTypes = requiredCutoutSubjectTypes(plan);
  const canaryGatePath = canaryGatePathForPlan(plan);
  const canaryGate = canaryGatePath && await pathExists(canaryGatePath)
    ? await readJson<{
        status?: string;
        cutoutStatus?: string;
        planPath?: string;
        checkedImages?: Array<{
          slotId?: string;
          cutoutReceiptPath?: string;
        }>;
      }>(assertSafeInputPath(canaryGatePath))
    : undefined;
  const isCanaryGatedFullPlan = isCanaryGatedFullProductionPlan(plan);
  const canaryEvidenceChecks = isCanaryGatedFullPlan
    ? await readCanaryEvidenceChecks({
        plan,
        safePlanPath,
        canaryGate,
      })
    : [];

  if (canaryEvidenceChecks.length) {
    selection = await promoteCanaryModelSelection({
      selection,
      modelSelectionPath,
      subjectTypes,
      canaryChecks: canaryEvidenceChecks,
    });
  }

  const winnerScores = subjectTypes
    .map((subjectType) => selection?.winners[subjectType]?.score)
    .filter((score): score is number => typeof score === "number");
  const modelBenchmark = selection?.status === "ready" && winnerScores.length === subjectTypes.length
    ? Math.min(...winnerScores)
    : 0;
  const plannedSlotChecks = await Promise.all(plan.slots
    .filter((slot) => slot.cutout?.required)
    .map(async (slot) => {
      const generationReceipt = await readLatestGenerationReceipt({ inboxDirectory: slot.inboxDirectory });
      const cutoutReceipt = await readLatestCutoutReceipt({ inboxDirectory: slot.inboxDirectory, slotId: slot.slotId });
      const sourcePath = generationReceipt?.capturedFile
        ? assertSafeInputPath(generationReceipt.capturedFile)
        : slot.expectedInboxFile;
      const sourceExists = await pathExists(sourcePath);
      const metadata = sourceExists ? await sharp(sourcePath).metadata().catch(() => undefined) : undefined;
      const qa = cutoutReceipt?.qa;
      const minPadding = slot.cutout?.thresholds.minimumPadding;
      const paddingValues = qa?.metrics.padding && minPadding
        ? [
            qa.metrics.padding.top / Math.max(0.0001, minPadding.top),
            qa.metrics.padding.right / Math.max(0.0001, minPadding.right),
            qa.metrics.padding.bottom / Math.max(0.0001, minPadding.bottom),
            qa.metrics.padding.left / Math.max(0.0001, minPadding.left),
          ]
        : [];
      const paddingFit = paddingValues.length ? Math.min(...paddingValues, 1) : 0;

      return {
        slotId: slot.slotId,
        sourcePath,
        sourceExists,
        width: metadata?.width,
        height: metadata?.height,
        cutoutStatus: cutoutReceipt?.status,
        qaStatus: qa?.status,
        failureCodes: cutoutReceipt?.failureCodes ?? [],
        backdropScore: cutoutReceipt?.status === "passed" && qa?.status === "passed" ? 0.95 : sourceExists ? 0.62 : 0,
        framingScore: cutoutReceipt?.status === "passed" && paddingFit >= 1 ? 0.95 : Math.max(0, Math.min(0.88, paddingFit)),
        complexityScore: cutoutReceipt?.status === "passed" && !cutoutReceipt.failureCodes?.includes("prop-lost") ? 0.94 : 0.55,
      };
    }));
  const slotChecks = canaryEvidenceChecks.length ? canaryEvidenceChecks : plannedSlotChecks;
  const average = (values: number[], fallback: number) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
  const hasConcreteSlotChecks = slotChecks.some((check) => check.sourceExists || check.cutoutStatus);
  const canaryPassed = canaryGate?.status === "passed" && canaryGate.cutoutStatus === "passed";
  const canaryFallback = canaryPassed ? 0.94 : subjectTypes.length ? 0 : 1;
  const backdropSeparation = hasConcreteSlotChecks
    ? average(slotChecks.map((check) => check.backdropScore), subjectTypes.length ? 0 : 1)
    : canaryFallback;
  const sourceFraming = hasConcreteSlotChecks
    ? average(slotChecks.map((check) => check.framingScore), subjectTypes.length ? 0 : 1)
    : canaryFallback;
  const subjectComplexityFit = hasConcreteSlotChecks
    ? average(slotChecks.map((check) => check.complexityScore), subjectTypes.length ? 0 : 1)
    : canaryFallback;
  const canaryCutout = !canaryGatePath
    ? (slotChecks.length && slotChecks.every((check) => check.cutoutStatus === "passed" && check.qaStatus === "passed") ? 0.95 : 0)
    : canaryPassed
      ? 0.94
      : 0;
  const readiness = buildCutoutReadinessScore({
    backdropSeparation,
    sourceFraming,
    subjectComplexityFit,
    modelBenchmark,
    canaryCutout,
  });
  const outputPath = "firewall" in plan && typeof (plan as GeminiApiGenerationPlan).firewall?.cutoutReadinessPath === "string"
    ? assertSafeArtlabPath((plan as GeminiApiGenerationPlan).firewall!.cutoutReadinessPath!)
    : assertSafeArtlabPath(join(plan.planRoot ?? plan.bridgeRoot ?? dirname(safePlanPath), "cutout-readiness.json"));
  const report = {
    ...readiness,
    planPath: safePlanPath,
    modelSelectionPath,
    subjectTypes,
    componentScores: {
      backdropSeparation,
      sourceFraming,
      subjectComplexityFit,
      modelBenchmark,
      canaryCutout,
    },
    slotChecks,
    checkedAt: new Date().toISOString(),
    failureMode: "fail-closed",
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Cutout readiness: ${report.status} (${report.score})`);
  console.log(`Report: ${outputPath}`);

  if (report.status !== "ready") {
    throw new Error(`Cutout readiness blocked: ${report.reasons.join(", ")}`);
  }
}

function characterIdForCanary(plan: AuditableGenerationPlanLike): "otis" | undefined {
  return /\botis\b/i.test(`${plan.name ?? ""} ${plan.runId}`) ? "otis" : undefined;
}

function slotOutfitAndPose(slotId: string): {
  outfitVariant: CharacterOutfitVariant;
  pose: CharacterPose;
} {
  const outfitVariant = CHARACTER_OUTFIT_VARIANTS.find((variant) => slotId.includes(variant)) ?? "regular";
  const pose = CHARACTER_POSES.find((entry) => slotId.includes(entry)) ?? "idle";

  return { outfitVariant, pose };
}

async function runCharacterArtCanaryPipeline(input: {
  plan: AuditableGenerationPlanLike;
  slot: AuditableGenerationPlanLike["slots"][number];
  sourcePath: string;
  cutoutPath: string;
}): Promise<{
  characterPipeline: {
    mode: "art-master-derive-review";
    canaryOnly: true;
    notProductionCompletion: true;
    slotExpansionStrategy: string;
    runJsonPath: string;
    runId: string;
    characterId: "otis";
  };
  masteredPngPath: string;
  derivedPreviewPath: string;
  reviewPreviewPath: string;
} | undefined> {
  const characterId = characterIdForCanary(input.plan);

  if (!characterId) return undefined;

  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const planRoot = input.plan.planRoot ? resolve(input.plan.planRoot) : undefined;
  const relativePlanRoot = planRoot ? relative(projectRoot, planRoot) : "";
  const planIsInsideProject =
    !!planRoot &&
    !relativePlanRoot.startsWith("..") &&
    !isAbsolute(relativePlanRoot);
  const planRootParts = planRoot?.split(sep) ?? [];
  const generationIndex = planRootParts.lastIndexOf("generation");
  const pipelineCwd = planIsInsideProject || generationIndex <= 0
    ? projectRoot
    : planRootParts.slice(0, generationIndex).join(sep) || sep;
  const tsxBin = join(projectRoot, "node_modules/.bin/tsx");
  const artPipelineScript = join(projectRoot, "scripts/art-pipeline.ts");
  const runId = `${input.plan.runId}-canary-pipeline`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const runJsonPath = `.artlab/runs/${characterId}/${runId}/run.json`;
  const absoluteRunJsonPath = join(pipelineCwd, runJsonPath);
  const { outfitVariant, pose } = slotOutfitAndPose(`${input.slot.baseSlotId ?? ""} ${input.slot.slotId}`);
  const maxSourceEdge = await sharp(input.cutoutPath)
    .metadata()
    .then((metadata) => Math.max(metadata.width ?? 0, metadata.height ?? 0));
  const masterLongEdge = Math.min(
    input.slot.cutout?.thresholds.minimumLongEdge ?? 4096,
    maxSourceEdge || input.slot.cutout?.thresholds.minimumLongEdge || 4096,
  );
  const commandEnv = { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "test" };

  execFileSync(process.execPath, [
    tsxBin,
    artPipelineScript,
    "plan",
    characterId,
    "--run-id",
    runId,
    "--identity-ref",
    input.sourcePath,
  ], { cwd: pipelineCwd, env: commandEnv, stdio: "pipe" });
  const plannedRun = await readJson<Record<string, unknown>>(absoluteRunJsonPath);

  await writeFile(absoluteRunJsonPath, `${JSON.stringify({
    ...plannedRun,
    canaryOnly: {
      notProductionCompletion: true,
      reason: "One cutout is duplicated across all expected sprite slots only to prove canary art:master, art:derive, and art:review mechanics.",
    },
  }, null, 2)}\n`);

  for (const variant of CHARACTER_OUTFIT_VARIANTS) {
    for (const spritePose of CHARACTER_POSES) {
      execFileSync(process.execPath, [
        tsxBin,
        artPipelineScript,
        "ingest",
        runJsonPath,
        "--source",
        input.cutoutPath,
        "--kind",
        "individual-sprite",
        "--id",
        `canary-${variant}-${spritePose}`,
        "--outfit",
        variant,
        "--pose",
        spritePose,
      ], { cwd: pipelineCwd, env: commandEnv, stdio: "pipe" });
    }
  }

  execFileSync(process.execPath, [
    tsxBin,
    artPipelineScript,
    "master",
    runJsonPath,
    "--master-long-edge",
    String(masterLongEdge),
  ], { cwd: pipelineCwd, env: commandEnv, stdio: "pipe" });
  execFileSync(process.execPath, [
    tsxBin,
    artPipelineScript,
    "derive",
    runJsonPath,
    "--master-long-edge",
    String(masterLongEdge),
  ], { cwd: pipelineCwd, env: commandEnv, stdio: "pipe" });
  execFileSync(process.execPath, [
    tsxBin,
    artPipelineScript,
    "review",
    runJsonPath,
  ], { cwd: pipelineCwd, env: commandEnv, stdio: "pipe" });

  const run = await readJson<{
    expectedSprites: Array<{
      outfitVariant: CharacterOutfitVariant;
      pose: CharacterPose;
      masterPath: string;
      stagedRenditions: { retina3x: { src: string } };
    }>;
    directories: { reviewRoot: string };
  }>(absoluteRunJsonPath);
  const sprite = run.expectedSprites.find((entry) => entry.outfitVariant === outfitVariant && entry.pose === pose)
    ?? run.expectedSprites[0];

  if (!sprite) return undefined;

  const reviewPreviewPath = `${run.directories.reviewRoot}/final-upload-ready-board.html`;
  const absoluteReviewPreviewPath = join(pipelineCwd, reviewPreviewPath);
  const canaryBanner = [
    "<div style=\"padding:12px 16px;background:#4a1f1f;color:#fff3df;border-bottom:1px solid #d88958;font-weight:700;letter-spacing:.04em;\">",
    "CANARY ONLY - one cutout was duplicated across all 21 sprite slots to prove art:master, art:derive, and art:review mechanics. This is not real production sprite completion.",
    "</div>",
  ].join("");
  const reviewHtml = await readFile(absoluteReviewPreviewPath, "utf8");

  if (!reviewHtml.includes("CANARY ONLY")) {
    await writeFile(absoluteReviewPreviewPath, reviewHtml.replace("<body>", `<body>\n${canaryBanner}`));
  }

  return {
    characterPipeline: {
      mode: "art-master-derive-review",
      canaryOnly: true,
      notProductionCompletion: true,
      slotExpansionStrategy: "single cutout duplicated into all 21 expected sprite slots for canary pipeline proof only",
      runJsonPath,
      runId,
      characterId,
    },
    masteredPngPath: sprite.masterPath,
    derivedPreviewPath: sprite.stagedRenditions.retina3x.src,
    reviewPreviewPath,
  };
}

async function createPostCutoutArtifacts(input: {
  plan: AuditableGenerationPlanLike;
  safePlanPath: string;
  slot: AuditableGenerationPlanLike["slots"][number];
  sourcePath: string;
  cutoutPath: string;
  qa: CutoutAlphaReport;
}): Promise<{
  masteredPngPath: string;
  derivedPreviewPath: string;
  reviewPreviewPath: string;
  characterPipeline?: {
    mode: "art-master-derive-review";
    canaryOnly: true;
    notProductionCompletion: true;
    slotExpansionStrategy: string;
    runJsonPath: string;
    runId: string;
    characterId: "otis";
  };
}> {
  const shouldUseCharacterPipeline = input.plan.assetType === "character" &&
    "firewall" in input.plan &&
    (input.plan as GeminiApiGenerationPlan).firewall?.planRole === "canary";
  const characterPipeline = shouldUseCharacterPipeline
    ? await runCharacterArtCanaryPipeline(input)
    : undefined;

  if (characterPipeline) return characterPipeline;

  const base = basename(input.cutoutPath, extname(input.cutoutPath));
  const masteredPngPath = assertSafeCutoutOutputPath(join(input.slot.inboxDirectory, `${base}__master.png`));
  const derivedPreviewPath = assertSafeCutoutOutputPath(join(input.slot.inboxDirectory, `${base}__preview.png`));
  const reviewPreviewPath = assertSafeArtlabPath(join(
    input.plan.planRoot ?? input.plan.bridgeRoot ?? dirname(input.safePlanPath),
    "review",
    `${input.slot.slotId}__cutout-review-preview.html`,
  ));
  const sourceUrl = pathToFileURL(input.sourcePath).href;
  const cutoutUrl = pathToFileURL(input.cutoutPath).href;

  await sharp(input.cutoutPath).png().toFile(masteredPngPath);
  await sharp(input.cutoutPath)
    .resize({ width: 960, height: 960, fit: "inside", withoutEnlargement: true })
    .png()
    .toFile(derivedPreviewPath);
  await mkdir(dirname(reviewPreviewPath), { recursive: true });
  await writeFile(reviewPreviewPath, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${input.slot.slotId} cutout review</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #10131a; color: #f7efe1; }
    main { display: grid; gap: 16px; padding: 20px; }
    .badges { display: flex; flex-wrap: wrap; gap: 8px; }
    .badge { border: 1px solid #6d5a32; border-radius: 6px; padding: 4px 8px; background: #1b2029; }
    .grid { display: grid; grid-template-columns: repeat(5, minmax(160px, 1fr)); gap: 12px; }
    figure { margin: 0; min-height: 240px; border: 1px solid #343b49; border-radius: 8px; overflow: hidden; background: #f5f1e8; }
    figcaption { padding: 8px 10px; font-size: 12px; background: #1b2029; color: #f7efe1; }
    img { width: 100%; height: 320px; object-fit: contain; display: block; }
    .checker { background-color: #dcd7cc; background-image: linear-gradient(45deg, #aaa 25%, transparent 25%), linear-gradient(-45deg, #aaa 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #aaa 75%), linear-gradient(-45deg, transparent 75%, #aaa 75%); background-size: 24px 24px; background-position: 0 0, 0 12px, 12px -12px, -12px 0; }
    .dark { background: #0d1017; }
    .light { background: #f7efe1; }
    .tower { background: radial-gradient(circle at 50% 80%, rgba(0,0,0,.28), transparent 26%), linear-gradient(135deg, #171c27, #3a2430); }
    details { border: 1px solid #343b49; border-radius: 8px; padding: 10px; }
    pre { white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>${input.slot.slotId}</h1>
    <section class="badges">
      ${Object.entries(input.qa.badges).map(([name, status]) => `<span class="badge">${name}: ${status}</span>`).join("\n      ")}
    </section>
    <section class="grid">
      <figure><img src="${sourceUrl}" alt="Original source"><figcaption>original source</figcaption></figure>
      <figure class="checker"><img src="${cutoutUrl}" alt="Checkerboard transparent cutout"><figcaption>checkerboard cutout</figcaption></figure>
      <figure class="dark"><img src="${cutoutUrl}" alt="Dark preview"><figcaption>dark preview</figcaption></figure>
      <figure class="light"><img src="${cutoutUrl}" alt="Light preview"><figcaption>light preview</figcaption></figure>
      <figure class="tower"><img src="${cutoutUrl}" alt="Tower shadow preview"><figcaption>Tower shadow preview</figcaption></figure>
    </section>
    <details>
      <summary>Diagnostics</summary>
      <pre>${JSON.stringify(input.qa, null, 2)}</pre>
    </details>
  </main>
</body>
</html>
`);

  return {
    masteredPngPath,
    derivedPreviewPath,
    reviewPreviewPath,
  };
}

async function runCutoutAutoMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");
  const modelSelectionPath = defaultCutoutModelSelectionPath(argv);
  const allowedSlotIds = commaListFlag(argv, "--slots");
  const json = argv.includes("--json");

  if (!planPath) throw new Error("cutout-auto requires --plan.");

  const safePlanPath = assertSafeInputPath(planPath);
  const plan = await readJson<AuditableGenerationPlanLike>(safePlanPath);
  const selection = await readCutoutModelSelection(modelSelectionPath);
  const allowed = allowedSlotIds ? new Set(allowedSlotIds) : undefined;
  const results = [];

  for (const slot of plan.slots) {
    const baseSlotId = slot.baseSlotId ?? slot.slotId;
    if (allowed && !allowed.has(slot.slotId) && !allowed.has(baseSlotId)) continue;
    if (!slot.cutout?.required) continue;

    const receipt = await readLatestGenerationReceipt({ inboxDirectory: slot.inboxDirectory });
    const sourcePath = receipt?.capturedFile ? assertSafeInputPath(receipt.capturedFile) : slot.expectedInboxFile;
    const selectedModel = selectedModelForContract(selection, slot.cutout);
    const selectedCandidate = selectedCandidateForContract(selection, slot.cutout);
    const failures = new Set<CutoutFailureCode>();
    const outputPath = assertSafeCutoutOutputPath(join(
      slot.inboxDirectory,
      `${basename(sourcePath, extname(sourcePath))}__cutout.png`,
    ));
    const sourceExists = await pathExists(sourcePath);

    if (!sourceExists) failures.add("low-confidence-mask");
    if (!selectedModel) failures.add("cutout-model-missing");
    if (!selectedCandidate) failures.add("cutout-model-missing");

    if (selectedCandidate) {
      const modelFailure = await cachedModelFailure(selectedCandidate);
      if (modelFailure) failures.add(modelFailure);
    }

    let qa: CutoutAlphaReport | undefined;
    let workerResult: CutoutWorkerResult | undefined;
    let masteredPngPath: string | undefined;
    let derivedPreviewPath: string | undefined;
    let reviewPreviewPath: string | undefined;
    let characterPipeline: {
      mode: "art-master-derive-review";
      canaryOnly: true;
      notProductionCompletion: true;
      slotExpansionStrategy: string;
      runJsonPath: string;
      runId: string;
      characterId: "otis";
    } | undefined;

    if (!failures.size) {
      try {
        workerResult = await runSelectedCutoutWorker({
          sourcePath,
          outputPath,
          candidate: selectedCandidate!,
          toolingRoot: cutoutToolingRoot(argv),
        });
        qa = await evaluateCutoutAlpha({
          imagePath: workerResult.outputPath,
          thresholds: slot.cutout.thresholds,
          expectedProps: slot.cutout.expectedProps,
          sourceSaliencyBounds: workerResult.sourceSaliencyBounds,
          sourceSaliencyPixels: workerResult.sourceSaliencyPixels,
        });
        qa.failures.forEach((failure) => failures.add(failure));

        if (!failures.size) {
          const artifacts = await createPostCutoutArtifacts({
            plan,
            safePlanPath,
            slot,
            sourcePath,
            cutoutPath: workerResult.outputPath,
            qa,
          });

          masteredPngPath = artifacts.masteredPngPath;
          derivedPreviewPath = artifacts.derivedPreviewPath;
          reviewPreviewPath = artifacts.reviewPreviewPath;
          characterPipeline = artifacts.characterPipeline;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const failure = message.includes("cutout-model-missing")
          ? "cutout-model-missing"
          : message.includes("license-blocked")
            ? "license-blocked"
            : "low-confidence-mask";

        failures.add(failure);
      }
    }

    const sourceHash = sourceExists ? await sha256File(sourcePath) : undefined;
    const receiptPath = join(slot.inboxDirectory, "cutout-receipt.json");
    const status = failures.size ? "blocked" : "passed";
    const failureCodes = Array.from(failures);
    const cutoutReceipt = {
      schemaVersion: "tower-cutout-receipt-v1",
      status,
      planPath: safePlanPath,
      parentPlanSlotId: slot.slotId,
      baseSlotId,
      sourcePath,
      sourceHash,
      sourceReceiptPath: receipt?.receiptPath,
      sourceAttempt: receipt?.attempt,
      outputPath: status === "passed" ? outputPath : undefined,
      selectedModel,
      selectedCandidate: selectedCandidate ? {
        id: selectedCandidate.id,
        adapter: selectedCandidate.adapter,
        packageName: selectedCandidate.packageName,
        packageVersion: selectedCandidate.packageVersion,
        packageLicense: selectedCandidate.packageLicense,
        modelName: selectedCandidate.modelName,
        modelVersion: selectedCandidate.modelVersion,
        modelWeightSourceUrl: selectedCandidate.modelWeightSourceUrl,
        modelWeightLicense: selectedCandidate.modelWeightLicense,
        modelWeightSha256: selectedCandidate.modelWeightSha256,
        cachedModelPath: selectedCandidate.cachedModelPath,
      } : undefined,
      modelSelectionPath,
      rawMaskHash: workerResult?.rawMaskHash,
      refinedMaskHash: workerResult?.refinedMaskHash,
      refinedPngHash: workerResult?.refinedPngHash,
      rawMaskPath: workerResult?.rawMaskPath,
      refinedMaskPath: workerResult?.refinedMaskPath,
      sourceSaliencyBounds: workerResult?.sourceSaliencyBounds,
      sourceSaliencyPixels: workerResult?.sourceSaliencyPixels,
      masteredPngPath,
      derivedPreviewPath,
      reviewPreviewPath,
      characterPipeline,
      modelExecution: workerResult?.modelExecution,
      edgeRefinement: {
        stage: "edge-refinement-v1",
        order: "provider-source-to-cutout-to-edge-refinement-to-alpha-qa-to-mastering",
        parameters: {
          trimap: selectedCandidate?.adapter === "simple-backdrop-segmentation" ? "border-color-derived" : "model-alpha-derived",
          morphology: "small-component-cleanup-plus-1px-close",
          feathering: "none-for-binary-safe-source-or-model-controlled",
          decontamination: "transparent-border-cleanup",
        },
        beforeQa: qa?.metrics,
        afterQa: qa?.metrics,
      },
      thresholds: slot.cutout.thresholds,
      qa,
      failureCodes,
      createdAt: new Date().toISOString(),
    };

    await mkdir(slot.inboxDirectory, { recursive: true });
    await writeFile(receiptPath, `${JSON.stringify(cutoutReceipt, null, 2)}\n`);
    results.push({
      slotId: slot.slotId,
      baseSlotId,
      status,
      receiptPath,
      outputPath: cutoutReceipt.outputPath,
      failureCodes,
    });
  }

  const commonFailures = new Map<CutoutFailureCode, number>();
  for (const result of results) {
    for (const failure of result.failureCodes) {
      commonFailures.set(failure, (commonFailures.get(failure) ?? 0) + 1);
    }
  }
  const repeatedFailureCodes = Array.from(commonFailures.entries())
    .filter(([, count]) => count >= Math.max(2, Math.ceil(results.length * 0.5)))
    .map(([code]) => code);
  const report = {
    schemaVersion: "tower-cutout-auto-report-v1",
    status: repeatedFailureCodes.length
      ? "improvement-required"
      : results.some((result) => result.status !== "passed")
        ? "blocked"
        : "passed",
    planPath: safePlanPath,
    modelSelectionPath,
    repeatedFailureCodes,
    results,
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Cutout auto: ${report.status}`);
    console.log(`Slots processed: ${results.length}`);
    if (repeatedFailureCodes.length) console.log(`Improvement mode: ${repeatedFailureCodes.join(", ")}`);
  }

  if (report.status !== "passed") {
    throw new Error(`Cutout auto blocked: ${repeatedFailureCodes.join(", ") || results.flatMap((result) => result.failureCodes).join(", ")}`);
  }
}

async function runCutoutDoctorMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");
  const json = argv.includes("--json");

  if (!planPath) throw new Error("cutout-doctor requires --plan.");

  const safePlanPath = assertSafeInputPath(planPath);
  const plan = await readJson<AuditableGenerationPlanLike>(safePlanPath);
  const requiredSlots = plan.slots.filter((slot) => slot.cutout?.required);
  const sourcePresence = await Promise.all(requiredSlots.map((slot) => pathExists(slot.expectedInboxFile)));
  const canaryGatePath = canaryGatePathForPlan(plan);
  const canaryGate = canaryGatePath && await pathExists(canaryGatePath)
    ? await readJson<{
        status?: string;
        cutoutStatus?: string;
        checkedImages?: Array<{
          slotId?: string;
          cutoutReceiptPath?: string;
        }>;
      }>(assertSafeInputPath(canaryGatePath))
    : undefined;
  const usePassedCanaryEvidence = isCanaryGatedFullProductionPlan(plan) &&
    canaryGate?.status === "passed" &&
    canaryGate.cutoutStatus === "passed" &&
    sourcePresence.some((exists) => !exists);
  const checked = usePassedCanaryEvidence
    ? await Promise.all((canaryGate.checkedImages ?? [])
      .filter((image) => Boolean(image.cutoutReceiptPath))
      .map(async (image) => {
        const receipt = image.cutoutReceiptPath
          ? await readCutoutReceiptEvidence(image.cutoutReceiptPath).catch(() => undefined)
          : undefined;
        const failures = new Set<CutoutFailureCode>(receipt?.failureCodes ?? []);

        if (!receipt) failures.add("stale-receipt");
        if (receipt?.status !== "passed" && failures.size === 0) failures.add("stale-receipt");
        if (receipt?.outputPath && !await pathExists(receipt.outputPath)) failures.add("stale-receipt");

        return {
          slotId: image.slotId ?? receipt?.slotId ?? image.cutoutReceiptPath!,
          receiptPath: receipt?.receiptPath ?? image.cutoutReceiptPath,
          outputPath: receipt?.outputPath,
          status: failures.size ? "blocked" : "passed",
          failureCodes: Array.from(failures),
          badges: receipt?.qa?.badges,
        };
      }))
    : await Promise.all(requiredSlots.map(async (slot) => {
        const receipt = await readLatestCutoutReceipt({
          inboxDirectory: slot.inboxDirectory,
          slotId: slot.slotId,
        });
        const failures = new Set<CutoutFailureCode>(receipt?.failureCodes ?? []);

        if (!receipt) failures.add("stale-receipt");
        if (receipt?.outputPath && !await pathExists(receipt.outputPath)) failures.add("stale-receipt");

        return {
          slotId: slot.slotId,
          receiptPath: receipt?.receiptPath,
          outputPath: receipt?.outputPath,
          status: failures.size ? "blocked" : "passed",
          failureCodes: Array.from(failures),
          badges: receipt?.qa?.badges,
        };
      }));
  const failureCounts = new Map<CutoutFailureCode, number>();

  for (const item of checked) {
    for (const failure of item.failureCodes) {
      failureCounts.set(failure, (failureCounts.get(failure) ?? 0) + 1);
    }
  }

  const repeatedFailureCodes = Array.from(failureCounts.entries())
    .filter(([, count]) => count >= Math.max(2, Math.ceil(checked.length * 0.5)))
    .map(([code]) => code);
  const reportPath = assertSafeArtlabPath(join(plan.planRoot ?? plan.bridgeRoot ?? dirname(safePlanPath), "cutout-doctor.json"));
  const report = {
    schemaVersion: "tower-cutout-doctor-v1",
    status: repeatedFailureCodes.length
      ? "improvement-required"
      : checked.some((item) => item.status !== "passed")
        ? "blocked"
        : "passed",
    planPath: safePlanPath,
    scope: usePassedCanaryEvidence ? "passed-canary-evidence" : "plan-slots",
    checkedAt: new Date().toISOString(),
    repeatedFailureCodes,
    checked,
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Cutout doctor: ${report.status}`);
    console.log(`Report: ${reportPath}`);
  }

  if (report.status !== "passed") {
    throw new Error(`Cutout doctor blocked: ${repeatedFailureCodes.join(", ") || checked.flatMap((item) => item.failureCodes).join(", ")}`);
  }
}

async function runVerifyCanaryMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");

  if (!planPath) throw new Error("verify-canary requires --plan.");

  const safePlanPath = assertSafeInputPath(planPath);
  const plan = await readJson<GeminiApiGenerationPlan>(safePlanPath);

  if (plan.adapter !== "gemini-api" || plan.firewall?.planRole !== "canary") {
    throw new Error("verify-canary requires a Gemini API canary plan.");
  }

  const cutoutRequiredByCanary = plan.slots.some((slot) => slot.cutout?.required);
  const chainRoot = plan.planRoot ?? dirname(safePlanPath);
  const cutoutDoctorPath = assertSafeArtlabPath(join(chainRoot, "cutout-doctor.json"));
  const assetDoctorPath = assertSafeArtlabPath(join(chainRoot, "asset-doctor.json"));
  const cutoutDoctor = await pathExists(cutoutDoctorPath)
    ? await readJson<{ status?: string }>(cutoutDoctorPath)
    : undefined;
  const assetDoctor = await pathExists(assetDoctorPath)
    ? await readJson<{ status?: string }>(assetDoctorPath)
    : undefined;
  const chainReportIssues = !cutoutRequiredByCanary ? [] : [
    !cutoutDoctor ? "missing-cutout-doctor" : cutoutDoctor.status !== "passed" ? "cutout-doctor-not-passed" : "",
    !assetDoctor ? "missing-asset-doctor" : assetDoctor.status !== "passed" ? "asset-doctor-not-passed" : "",
  ].filter(Boolean);
	  const generatedImages = await Promise.all(plan.slots.map(async (slot) => {
	    const receipt = await readLatestGenerationReceipt({
	      inboxDirectory: slot.inboxDirectory,
	    });
	    const cutoutReceipt = await readLatestCutoutReceipt({
	      inboxDirectory: slot.inboxDirectory,
	      slotId: slot.slotId,
	    });
	    const imagePath = receipt?.capturedFile
	      ? assertSafeInputPath(receipt.capturedFile)
	      : slot.expectedInboxFile;
	    const inspection = await validateCreativeImageFile({
	      path: imagePath,
	      issueCodeForMissing: "missing-generated-image",
	      minimumLongEdge: plan.sourceRequirements?.minimumLongEdge,
	      minimumShortEdge: plan.sourceRequirements?.minimumShortEdge,
	      requireAlpha: false,
	    });
	    const cutoutPassed = slot.cutout?.required && cutoutReceipt?.status === "passed";
	    const receiptWarnings = receipt
	      ? receipt.qualityWarnings.filter((warning) =>
	          !(slot.cutout?.required && warning === "source-missing-alpha") &&
	          !(cutoutPassed && warning.startsWith("source-mime-image-")),
	        )
	      : ["missing-generation-receipt"];
	    const artifactIssues: string[] = [];

	    if (slot.cutout?.required && cutoutReceipt?.status === "passed") {
	      if (!cutoutReceipt.outputPath || !await pathExists(cutoutReceipt.outputPath)) artifactIssues.push("missing-cutout-output");
	      if (!cutoutReceipt.masteredPngPath || !await pathExists(cutoutReceipt.masteredPngPath)) artifactIssues.push("missing-mastered-png");
	      if (!cutoutReceipt.derivedPreviewPath || !await pathExists(cutoutReceipt.derivedPreviewPath)) artifactIssues.push("missing-derived-preview");
	      if (!cutoutReceipt.reviewPreviewPath || !await pathExists(cutoutReceipt.reviewPreviewPath)) artifactIssues.push("missing-review-preview");
	    }

	    const cutoutIssues = !slot.cutout?.required
	      ? []
	      : !cutoutReceipt
	        ? ["missing-cutout-receipt"]
	        : cutoutReceipt.status !== "passed"
	          ? cutoutReceipt.failureCodes?.length ? cutoutReceipt.failureCodes : ["cutout-failed"]
	          : artifactIssues;

	    return {
	      slotId: slot.slotId,
	      imagePath,
	      cutoutReceiptPath: cutoutReceipt?.receiptPath,
	      cutoutOutputPath: cutoutReceipt?.outputPath,
	      masteredPngPath: cutoutReceipt?.masteredPngPath,
	      derivedPreviewPath: cutoutReceipt?.derivedPreviewPath,
	      reviewPreviewPath: cutoutReceipt?.reviewPreviewPath,
	      issues: [
	        ...inspection.issues.map((issue) => issue.code),
	        ...receiptWarnings,
	        ...cutoutIssues,
	      ].filter(Boolean),
	    };
	  }));
  const issues = [
    ...chainReportIssues,
    ...generatedImages.flatMap((image) => image.issues),
  ];
  const gatePath = plan.firewall.canaryGatePath
    ? assertSafeArtlabPath(plan.firewall.canaryGatePath)
    : assertSafeArtlabPath(join(dirname(safePlanPath), "..", "canary-gate.json"));
  const status = issues.length ? "blocked-provider" : "passed";

  await mkdir(dirname(gatePath), { recursive: true });
  await writeFile(gatePath, `${JSON.stringify({
    schemaVersion: "tower-production-canary-gate-v1",
    runId: plan.runId,
    status,
    planPath: safePlanPath,
    chainStatus: chainReportIssues.length ? "blocked" : "passed",
    cutoutDoctorPath,
    assetDoctorPath,
	    checkedAt: new Date().toISOString(),
	    cutoutStatus: issues.some((issue) => String(issue).includes("cutout") || [
	      "cutout-model-missing",
	      "low-confidence-mask",
	      "subject-cropped",
	      "prop-lost",
	      "edge-halo",
	      "background-remnant",
	      "alpha-holes",
	      "extra-islands",
	      "stale-receipt",
	      "app-shadow-mismatch",
	    ].includes(String(issue))) ? "blocked" : "passed",
	    promptContractHash: plan.firewall.promptContractHash,
    referenceContractHash: plan.firewall.referenceContractHash,
    sourceContractHash: plan.firewall.sourceContractHash,
    checkedImages: generatedImages,
    nextAction: status === "passed"
      ? "Full production pack may run with the matching prompt/reference/source contract."
      : "Do not run the full production pack. Repair the canary or improve the engine before spending more.",
  }, null, 2)}\n`);
  await writeCreativeCanaryRunState({
    runRoot: creativeRunRootFromGeminiPlan(plan, safePlanPath),
    runId: plan.runId,
    assetType: plan.assetType,
    name: plan.name,
    state: status === "passed" ? "canary-passed" : "repairing",
    status: status === "passed" ? "passed" : "blocked",
    commandLabel: "verify-canary",
    canaryPlanPath: safePlanPath,
    blockedReason: status === "passed" ? undefined : Array.from(new Set(issues)).join(", "),
    canaryEvidence: {
      canaryGatePath: gatePath,
      cutoutReadinessPath: plan.firewall.cutoutReadinessPath ?? assertSafeArtlabPath(join(dirname(safePlanPath), "..", "cutout-readiness.json")),
      cutoutReceiptPaths: generatedImages
        .map((image) => image.cutoutReceiptPath)
        .filter((path): path is string => Boolean(path)),
      assetDoctorPath,
      reviewBoardPath: generatedImages
        .map((image) => image.reviewPreviewPath)
        .find((path): path is string => Boolean(path)),
    },
  });

  console.log(`Canary gate: ${status}`);
  console.log(`Report: ${gatePath}`);

  if (status !== "passed") {
    throw new Error(`Canary gate blocked: ${Array.from(new Set(issues)).join(", ")}`);
  }
}

const CUTOUT_FAILURES_REQUIRING_NAMED_REGENERATION = new Set([
  "extra-islands",
  "subject-cropped",
  "edge-halo",
  "halo",
  "crop",
  "unsafe-mask",
  "low-confidence-mask",
  "background-remnant",
  "alpha-holes",
  "prop-lost",
  "app-shadow-mismatch",
]);

const CUTOUT_FAILURES_LOCAL_REPAIR_CAN_HANDLE = new Set([
  "subject-cropped",
  "edge-halo",
  "halo",
  "crop",
]);

const STRICT_SOURCE_FRAMING_PROMPT_PATCH = [
  "Regenerate this named slot only with the locked identity preserved.",
  "Require full-body head-to-toe framing with both feet and both hands visible, generous top/side/bottom padding, and no cropped feet or cropped hands.",
  "Use a simple high-contrast premium backdrop with the subject fully separated from the backdrop.",
  "no counters, desks, furniture, or rails; no scene elements, background objects, or props may touch the body or overlap the silhouette.",
  "no floor shadows, contact shadows, cast shadows touching the character, or background elements crossing hair, beard, fingers, keys, badge, held prop, clothing, or feet.",
];

function isPaddingOnlyCrop(cutoutReceipt: Awaited<ReturnType<typeof readLatestCutoutReceipt>>): boolean {
  if (cutoutReceipt?.status !== "blocked") return false;
  if (!cutoutReceipt.failureCodes?.some((code) => String(code) === "subject-cropped")) return false;

  return (cutoutReceipt.qa?.metrics.borderOpaquePixels ?? 1) === 0;
}

function blockedCutoutLocalRepairable(
  cutoutReceipt: Awaited<ReturnType<typeof readLatestCutoutReceipt>>,
): boolean {
  if (cutoutReceipt?.status !== "blocked") return false;

  const failureCodes = (cutoutReceipt.failureCodes ?? []).map((code) => String(code));

  if (!failureCodes.length) return false;
  if (!failureCodes.every((code) => CUTOUT_FAILURES_LOCAL_REPAIR_CAN_HANDLE.has(code))) return false;
  if (failureCodes.includes("subject-cropped") && !isPaddingOnlyCrop(cutoutReceipt)) return false;
  if (cutoutReceipt.qa?.badges.alpha === "failed" || cutoutReceipt.qa?.badges.props === "failed") return false;
  if ((cutoutReceipt.qa?.metrics.borderOpaquePixels ?? 0) > 0) return false;

  return true;
}

function blockedCutoutRegenerationCodes(
  cutoutReceipt: Awaited<ReturnType<typeof readLatestCutoutReceipt>>,
): string[] {
  if (cutoutReceipt?.status !== "blocked") return [];
  if (blockedCutoutLocalRepairable(cutoutReceipt)) return [];

  return (cutoutReceipt.failureCodes ?? [])
    .map((code) => String(code))
    .filter((code) => CUTOUT_FAILURES_REQUIRING_NAMED_REGENERATION.has(code));
}

function cutoutPathForSource(sourcePath: string, inboxDirectory: string): string {
  return join(inboxDirectory, `${basename(sourcePath, extname(sourcePath))}__cutout.png`);
}

async function nextVersionedCutoutReceiptPath(inboxDirectory: string): Promise<{
  path: string;
  version: number;
}> {
  const files = await readdir(inboxDirectory)
    .then((entries) => entries.filter((file) => /^cutout-receipt(?:-v\d{3})?\.json$/.test(file)))
    .catch(() => []);
  const versions = files.map((file) => file === "cutout-receipt.json"
    ? 1
    : Number(file.match(/v(\d{3})/)?.[1] ?? 1));
  const version = Math.max(1, ...versions) + 1;

  return {
    version,
    path: join(inboxDirectory, `cutout-receipt-v${String(version).padStart(3, "0")}.json`),
  };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safePaddingExtension(input: {
  width: number;
  height: number;
  bbox: { left: number; top: number; right: number; bottom: number };
  minimumPadding: CutoutContract["thresholds"]["minimumPadding"];
}): { top: number; right: number; bottom: number; left: number } {
  const add = { top: 0, right: 0, bottom: 0, left: 0 };

  for (let iteration = 0; iteration < 20; iteration += 1) {
    const width = input.width + add.left + add.right;
    const height = input.height + add.top + add.bottom;
    const padding = {
      top: (input.bbox.top + add.top) / height,
      right: (width - 1 - (input.bbox.right + add.left)) / width,
      bottom: (height - 1 - (input.bbox.bottom + add.top)) / height,
      left: (input.bbox.left + add.left) / width,
    };
    const deficits = {
      top: input.minimumPadding.top - padding.top,
      right: input.minimumPadding.right - padding.right,
      bottom: input.minimumPadding.bottom - padding.bottom,
      left: input.minimumPadding.left - padding.left,
    };

    if (Object.values(deficits).every((deficit) => deficit <= 0)) return add;

    if (deficits.top > 0) add.top += Math.ceil(deficits.top * height) + 4;
    if (deficits.right > 0) add.right += Math.ceil(deficits.right * width) + 4;
    if (deficits.bottom > 0) add.bottom += Math.ceil(deficits.bottom * height) + 4;
    if (deficits.left > 0) add.left += Math.ceil(deficits.left * width) + 4;
  }

  return add;
}

async function repairCutoutPaddingAndHalo(input: {
  cutoutPath: string;
  outputPath: string;
  thresholds: CutoutContract["thresholds"];
}): Promise<{
  outputPath: string;
  rawMaskHash: string;
  refinedMaskHash: string;
  refinedPngHash: string;
  extension: { top: number; right: number; bottom: number; left: number };
  defringeAlphaBelow: number;
}> {
  const { data, info } = await sharp(input.cutoutPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = Buffer.from(data);
  const alpha = new Uint8Array(info.width * info.height);
  const alphaFloor = clampNumber(Math.max(input.thresholds.borderAlphaThreshold, 72), 1, 254);

  for (let pixel = 0; pixel < alpha.length; pixel += 1) {
    const alphaOffset = (pixel * 4) + 3;
    const value = cleaned[alphaOffset] ?? 0;
    const nextAlpha = value > 0 && value < alphaFloor ? 0 : value;

    cleaned[alphaOffset] = nextAlpha;
    alpha[pixel] = nextAlpha;
  }

  const bbox = bboxFromMask(alpha, info.width, input.thresholds.borderAlphaThreshold).bounds;

  if (!bbox) throw new Error("low-confidence-mask: local cutout repair could not find the subject.");

  const extension = safePaddingExtension({
    width: info.width,
    height: info.height,
    bbox,
    minimumPadding: input.thresholds.minimumPadding,
  });

  await mkdir(dirname(input.outputPath), { recursive: true });
  await sharp(cleaned, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extend({
      top: extension.top,
      right: extension.right,
      bottom: extension.bottom,
      left: extension.left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(input.outputPath);

  return {
    outputPath: input.outputPath,
    rawMaskHash: await extractAlphaMaskHash(input.cutoutPath),
    refinedMaskHash: await extractAlphaMaskHash(input.outputPath),
    refinedPngHash: await sha256File(input.outputPath),
    extension,
    defringeAlphaBelow: alphaFloor,
  };
}

async function runRepairPlanMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");
  const boardPath = flagValue(argv, "--board");
  const json = argv.includes("--json");
  const strict = argv.includes("--strict");

  if (!planPath) throw new Error("repair-plan requires --plan or --bridge.");

  const safePlanPath = assertSafeInputPath(planPath);
  const safeBoardPath = boardPath ? assertSafeInputPath(boardPath) : undefined;
  const plan = await readJson<AuditableGenerationPlanLike>(safePlanPath);
  const repairPlanPath = assertSafeArtlabPath(join(
    plan.planRoot ?? plan.bridgeRoot ?? dirname(safePlanPath),
    "repair-plan.json",
  ));
	  const runApiCommand = (slot: { slotId: string; baseSlotId?: string }) => plan.adapter === "gemini-api"
	    ? `npm run art:generate -- run-api --plan ${shellArg(safePlanPath)} --slots ${shellArg(slot.baseSlotId ?? slot.slotId)} --max-attempts 3`
	    : undefined;
	  const cutoutCommand = (slot: { slotId: string; baseSlotId?: string }) =>
	    `npm run art:generate -- cutout-auto --plan ${shellArg(safePlanPath)} --slots ${shellArg(slot.baseSlotId ?? slot.slotId)}`;
	  const localCutoutRepairCommand = (slot: { slotId: string; baseSlotId?: string }) =>
	    `npm run art:generate -- repair-auto --plan ${shellArg(safePlanPath)} --slots ${shellArg(slot.baseSlotId ?? slot.slotId)}`;
	  const slots = await Promise.all(plan.slots.map(async (slot) => {
    const receipt = await readLatestGenerationReceipt({
      inboxDirectory: slot.inboxDirectory,
    });
	    const cutoutReceipt = await readLatestCutoutReceipt({
	      inboxDirectory: slot.inboxDirectory,
	      slotId: slot.slotId,
	    });
    const currentFile = receipt?.capturedFile
      ? assertSafeInputPath(receipt.capturedFile)
      : slot.expectedInboxFile;
	    const cutoutRequired = Boolean(slot.cutout?.required) || plan.assetType === "character";
	    const cutoutAlreadyPassed = cutoutRequired &&
	      cutoutReceipt?.status === "passed" &&
	      Boolean(cutoutReceipt.outputPath) &&
	      await pathExists(cutoutReceipt.outputPath!);
    const inspection = await validateCreativeImageFile({
      path: currentFile,
      issueCodeForMissing: "missing-generated-image",
      minimumLongEdge: plan.sourceRequirements?.minimumLongEdge,
      minimumShortEdge: plan.sourceRequirements?.minimumShortEdge,
      requireAlpha: strict && plan.assetType === "character" && !cutoutAlreadyPassed,
    });
    const issueCodes = inspection.issues.map((issue) => issue.code);
    const warnings = receipt?.qualityWarnings ?? [];
	    const actionableWarnings = cutoutAlreadyPassed
	      ? warnings.filter((warning) =>
	          warning !== "source-missing-alpha" &&
	          !warning.startsWith("source-mime-image-"),
	        )
	      : warnings;
    const missingOrCorrupt = !receipt
      || issueCodes.includes("missing-generated-image")
      || issueCodes.includes("undecodable-image")
      || actionableWarnings.includes("captured-file-missing");
	    const alphaRepairable = cutoutRequired
	      && !cutoutAlreadyPassed
	      && Boolean(receipt?.capturedFile)
	      && (actionableWarnings.includes("source-missing-alpha") || issueCodes.includes("image-missing-alpha"));
	    const blockedCutoutCodes = blockedCutoutRegenerationCodes(cutoutReceipt);
	    const dimensionFailure = actionableWarnings.some((warning) =>
	      warning.startsWith("source-long-edge-below-") || warning.startsWith("source-short-edge-below-"),
	    ) || issueCodes.includes("image-long-edge-below-minimum") || issueCodes.includes("image-short-edge-below-minimum");
	    const recommendedAction = missingOrCorrupt || dimensionFailure
	      ? {
	          type: "regenerate-slot",
	          reason: missingOrCorrupt
	            ? "The latest slot output or receipt is missing/corrupt, so the slot needs a clean regenerated attempt."
	            : "The latest slot output is below the required source dimensions, so local repair would hide quality loss.",
	          ...(runApiCommand(slot) ? { command: runApiCommand(slot) } : {}),
	        }
	      : blockedCutoutLocalRepairable(cutoutReceipt)
	        ? {
	            type: "cutout-local-repair",
	            reason: "Local cutout found a complete subject with insufficient safe padding and/or mild edge halo. Try transparent canvas expansion plus deterministic defringe before spending on regeneration.",
	            command: localCutoutRepairCommand(slot),
	            ...(runApiCommand(slot) ? { fallbackCommand: runApiCommand(slot) } : {}),
	          }
	      : blockedCutoutCodes.length
	        ? {
	            type: "regenerate-slot",
	            reason: `Local cutout already failed for this slot (${blockedCutoutCodes.join(", ")}). Regenerate only this named slot with a stricter source-framing/backdrop prompt instead of re-running the same unsafe mask.`,
	            ...(runApiCommand(slot) ? { command: runApiCommand(slot) } : {}),
	            promptPatch: STRICT_SOURCE_FRAMING_PROMPT_PATCH,
	          }
	      : alphaRepairable
	        ? {
	            type: "cutout-local",
	            reason: "The latest foreground source exists but lacks transparent production alpha; run the local fail-closed cutout compiler for this named slot.",
	            command: cutoutCommand(slot),
	            ...(runApiCommand(slot) ? { fallbackCommand: runApiCommand(slot) } : {}),
	          }
	        : actionableWarnings.length || inspection.issues.length
	          ? {
	              type: "regenerate-slot",
	              reason: "The latest slot still has quality warnings that do not have a safe local repair.",
	              ...(runApiCommand(slot) ? { command: runApiCommand(slot) } : {}),
	            }
	          : {
              type: "none",
              reason: "The latest slot has no file or receipt issues.",
            };

    return {
      slotId: slot.slotId,
      status: recommendedAction.type === "none" ? "clean" : "repair-required",
      currentFile,
	      latestReceiptPath: receipt?.receiptPath,
	      latestCutoutReceiptPath: cutoutReceipt?.receiptPath,
	      latestAttempt: receipt?.attempt,
	      qualityWarnings: warnings,
	      actionableQualityWarnings: actionableWarnings,
	      cutoutAlreadyPassed,
	      cutoutFailureCodes: cutoutReceipt?.failureCodes ?? [],
	      imageIssues: inspection.issues,
	      recommendedAction,
	      afterRepair: [
	        `npm run art:generate -- cutout-doctor --plan ${shellArg(safePlanPath)} --strict`,
	        `npm run art:generate -- doctor --plan ${shellArg(safePlanPath)}${safeBoardPath ? ` --board ${shellArg(safeBoardPath)}` : ""} --strict`,
	      ],
	    };
	  }));
  const boardValidation = safeBoardPath
    ? await validateReviewBoardImageReferences({ boardPath: safeBoardPath })
    : undefined;
	  const boardActions = (boardValidation?.issues ?? []).map((issue) => ({
	    type: "rebuild-review-board",
	    reason: issue.message,
	    src: issue.src,
	  }));
	  const repairRequired = slots.some((slot) => slot.status === "repair-required") || boardActions.length > 0;
	  const failureCounts = new Map<string, number>();

	  for (const slot of slots) {
	    const failureCodes = [
	      ...slot.actionableQualityWarnings,
	      ...slot.cutoutFailureCodes,
	      ...slot.imageIssues.map((issue) => issue.code),
	      slot.recommendedAction.type === "none" ? "" : slot.recommendedAction.type,
	    ].filter((code) => {
	      if (!code) return false;
	      if (slot.recommendedAction.type !== "cutout-local") return true;
	      return code !== "source-missing-alpha" &&
	        code !== "image-missing-alpha" &&
	        code !== "cutout-local" &&
	        !code.startsWith("source-mime-image-");
	    });

	    for (const code of failureCodes) {
	      failureCounts.set(code, (failureCounts.get(code) ?? 0) + 1);
	    }
	  }

	  const repeatedFailureCodes = Array.from(failureCounts.entries())
	    .filter(([, count]) => count >= Math.max(2, Math.ceil(slots.length * 0.5)))
	    .map(([code]) => code);
	  const repairPlan = {
	    schemaVersion: "tower-creative-generation-repair-plan-v1",
    planPath: safePlanPath,
    boardPath: safeBoardPath,
    repairPlanPath,
    runId: plan.runId,
    adapter: plan.adapter,
    assetType: plan.assetType,
	    status: repeatedFailureCodes.length ? "improvement-required" : repairRequired ? "repair-required" : "clean",
    strict,
    createdAt: new Date().toISOString(),
    summary: {
      totalSlots: slots.length,
      cleanSlots: slots.filter((slot) => slot.status === "clean").length,
	      repairRequiredSlots: slots.filter((slot) => slot.status === "repair-required").length,
	      boardIssues: boardActions.length,
	      repeatedFailureCodes,
	    },
    slots,
    boardActions,
	    nextCommands: repeatedFailureCodes.length
	      ? [
	          "Enter improvement mode before regenerating named slots; repeated failures indicate prompt/model/threshold strategy is broken.",
	          `npm run art:generate -- cutout-benchmark --fixture-set <fixture-set-json> --model-selection <updated-selection-json>`,
	          `npm run art:generate -- cutout-readiness --plan ${shellArg(safePlanPath)}`,
	        ]
	      : repairRequired
	      ? [
	          "Run the per-slot recommendedAction.command values that match the failure type.",
	          `npm run art:generate -- cutout-doctor --plan ${shellArg(safePlanPath)} --strict`,
	          `npm run art:generate -- doctor --plan ${shellArg(safePlanPath)}${safeBoardPath ? ` --board ${shellArg(safeBoardPath)}` : ""} --strict`,
	        ]
      : [
          "No repair is required. Continue to the next approval or promotion gate.",
        ],
  };

  await mkdir(dirname(repairPlanPath), { recursive: true });
  await writeFile(repairPlanPath, `${JSON.stringify(repairPlan, null, 2)}\n`);

  if (json) {
    console.log(JSON.stringify(repairPlan, null, 2));
    return;
  }

  console.log(`Repair plan: ${repairPlan.status}`);
  console.log(`Report: ${repairPlanPath}`);
  console.log(`Slots needing repair: ${repairPlan.summary.repairRequiredSlots}/${repairPlan.summary.totalSlots}`);
  if (boardActions.length) console.log(`Board issues: ${boardActions.length}`);
}

async function runCaptureDownloadMode(argv: string[]): Promise<void> {
  const bridgePath = flagValue(argv, "--bridge");
  const slotId = flagValue(argv, "--slot");
  const sourcePath = flagValue(argv, "--source");
  const attempt = assertPositiveIntegerFlag(argv, "--attempt") ?? 1;
  const replace = argv.includes("--replace");

  if (!bridgePath) throw new Error("capture-download requires --bridge.");
  if (!slotId) throw new Error("capture-download requires --slot.");
  if (!sourcePath) throw new Error("capture-download requires --source.");

  const safeBridgePath = assertSafeInputPath(bridgePath);
  const safeSourcePath = assertSafeSourceImagePath(sourcePath);
  const extension = extname(safeSourcePath).toLowerCase();

  if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new Error("--source must be an image file.");
  }

  const plan = await readJson<CreativeGenerationBridgePlan | GeminiApiGenerationPlan>(safeBridgePath);
  const slot = plan.slots.find((candidate) => candidate.slotId === slotId);

  if (!slot) throw new Error(`Unknown bridge slot: ${slotId}`);

  const destination = assertSafeArtlabPath(versionedCapturePath(slot.expectedInboxFile, attempt));
  const receiptPath = versionedReceiptPath(destination, attempt);

  if (!replace && await pathExists(destination)) {
    throw new Error(`${destination} already exists. Use --attempt ${attempt + 1} for a retry or --replace to overwrite intentionally.`);
  }

  const metadata = await sharp(safeSourcePath).metadata();
  const sourceStats = await stat(safeSourcePath);
  const longEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  const shortEdge = Math.min(metadata.width ?? 0, metadata.height ?? 0);
  const qualityWarnings = [
    plan.sourceRequirements.minimumLongEdge && longEdge < plan.sourceRequirements.minimumLongEdge
      ? `source-long-edge-below-${plan.sourceRequirements.minimumLongEdge}`
      : "",
    plan.sourceRequirements.minimumShortEdge && shortEdge < plan.sourceRequirements.minimumShortEdge
      ? `source-short-edge-below-${plan.sourceRequirements.minimumShortEdge}`
      : "",
    plan.assetType === "character" && !metadata.hasAlpha ? "source-missing-alpha" : "",
    plan.assetType === "character" && metadata.format !== "png" ? `source-mime-image-${metadata.format ?? "unknown"}` : "",
  ].filter(Boolean);

  await mkdir(dirname(destination), { recursive: true });
  await copyFile(safeSourcePath, destination);
  await writeFile(receiptPath, `${JSON.stringify({
    schemaVersion: "tower-creative-generation-download-receipt-v1",
    adapter: plan.adapter,
    runId: plan.runId,
    slotId,
    attempt,
    sourceFile: safeSourcePath,
    capturedFile: destination,
    capturedAt: new Date().toISOString(),
    sourceBytes: sourceStats.size,
    metadata: {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      hasAlpha: metadata.hasAlpha,
    },
    qualityWarnings,
  }, null, 2)}\n`);

  console.log(`Captured ${slotId}: ${destination}`);
  console.log(`Receipt: ${receiptPath}`);
  console.log(`Dimensions: ${metadata.width ?? "unknown"}x${metadata.height ?? "unknown"}`);
  console.log(`Quality warnings: ${qualityWarnings.length ? qualityWarnings.join(", ") : "none"}`);
}

async function runRepairAutoMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");
  const allowedSlotIds = commaListFlag(argv, "--slots");
  const json = argv.includes("--json");

  if (!planPath) throw new Error("repair-auto requires --plan or --bridge.");

  const safePlanPath = assertSafeInputPath(planPath);
  const plan = await readJson<AuditableGenerationPlanLike>(safePlanPath);
  const allowed = allowedSlotIds ? new Set(allowedSlotIds) : undefined;
  const repairPlanPath = assertSafeArtlabPath(join(
    plan.planRoot ?? plan.bridgeRoot ?? dirname(safePlanPath),
    "repair-plan.json",
  ));
	  const repairPlan = await readJson<{
	    slots: Array<{
	      slotId: string;
	      currentFile: string;
	      latestCutoutReceiptPath?: string;
	      recommendedAction: {
        type: string;
	        command?: string;
	      };
	    }>;
	  }>(repairPlanPath);
	  const cutoutSlots: string[] = [];
	  const localRepairSlots: string[] = [];
	  const skipped: Array<{ slotId: string; reason: string }> = [];

	  for (const slot of repairPlan.slots) {
	    const planSlot = plan.slots.find((candidate) => candidate.slotId === slot.slotId || candidate.baseSlotId === slot.slotId);
	    const baseSlotId = planSlot?.baseSlotId ?? slot.slotId;

	    if (allowed && !allowed.has(slot.slotId) && !allowed.has(baseSlotId)) {
	      skipped.push({
	        slotId: slot.slotId,
	        reason: "not-in-selected-slot-filter",
	      });
	      continue;
	    }

	    if (slot.recommendedAction.type !== "cutout-local") {
	      if (slot.recommendedAction.type === "cutout-local-repair") {
	        localRepairSlots.push(slot.slotId);
	        continue;
	      }

	      skipped.push({
	        slotId: slot.slotId,
	        reason: `recommended action is ${slot.recommendedAction.type}`,
	      });
	      continue;
	    }

	    cutoutSlots.push(slot.slotId);
	  }

	  if (cutoutSlots.length) {
	    await runCutoutAutoMode([
	      "cutout-auto",
	      "--plan",
	      safePlanPath,
	      "--slots",
	      cutoutSlots.join(","),
	    ]);
	  }

	  const localRepairResults = [];

	  for (const slotId of localRepairSlots) {
	    const planSlot = plan.slots.find((slot) => slot.slotId === slotId || slot.baseSlotId === slotId);

	    if (!planSlot?.cutout?.required) {
	      skipped.push({
	        slotId,
	        reason: "missing cutout contract for local repair",
	      });
	      continue;
	    }

	    const generationReceipt = await readLatestGenerationReceipt({ inboxDirectory: planSlot.inboxDirectory });
	    const cutoutReceipt = await readLatestCutoutReceipt({
	      inboxDirectory: planSlot.inboxDirectory,
	      slotId: planSlot.slotId,
	    });
	    const currentSourcePath = generationReceipt?.capturedFile
	      ? assertSafeInputPath(generationReceipt.capturedFile)
	      : assertSafeInputPath(planSlot.expectedInboxFile);
	    const candidateCutoutPath = cutoutReceipt?.outputPath
	      ? assertSafeInputPath(cutoutReceipt.outputPath)
	      : cutoutPathForSource(cutoutReceipt?.sourcePath ?? currentSourcePath, planSlot.inboxDirectory);

	    if (!cutoutReceipt || !blockedCutoutLocalRepairable(cutoutReceipt)) {
	      skipped.push({
	        slotId,
	        reason: "latest cutout receipt is not locally repairable",
	      });
	      continue;
	    }

	    if (!await pathExists(candidateCutoutPath)) {
	      skipped.push({
	        slotId,
	        reason: `cutout output missing for local repair: ${candidateCutoutPath}`,
	      });
	      continue;
	    }

	    const nextReceipt = await nextVersionedCutoutReceiptPath(planSlot.inboxDirectory);
	    const repairVersion = `v${String(nextReceipt.version).padStart(3, "0")}`;
	    const repairedPath = assertSafeCutoutOutputPath(join(
	      planSlot.inboxDirectory,
	      `${basename(candidateCutoutPath, extname(candidateCutoutPath))}__repaired-${repairVersion}.png`,
	    ));
	    const repair = await repairCutoutPaddingAndHalo({
	      cutoutPath: candidateCutoutPath,
	      outputPath: repairedPath,
	      thresholds: planSlot.cutout.thresholds,
	    });
	    const repairedSourceSaliency = cutoutReceipt.sourcePath
	      ? await estimateSourceSaliencyFromBackdrop(cutoutReceipt.sourcePath).catch(() => undefined)
	      : undefined;
	    const qa = await evaluateCutoutAlpha({
	      imagePath: repairedPath,
	      thresholds: planSlot.cutout.thresholds,
	      expectedProps: planSlot.cutout.expectedProps,
	      sourceSaliencyBounds: repairedSourceSaliency?.bounds,
	      sourceSaliencyPixels: repairedSourceSaliency?.pixels,
	    });
	    const status = qa.status === "passed" ? "passed" : "blocked";
	    const artifacts = status === "passed"
	      ? await createPostCutoutArtifacts({
	          plan,
	          safePlanPath,
	          slot: planSlot,
	          sourcePath: currentSourcePath,
	          cutoutPath: repairedPath,
	          qa,
	        })
	      : undefined;
	    const repairedReceipt = {
	      schemaVersion: "tower-cutout-receipt-v1",
	      status,
	      slotId: planSlot.slotId,
	      planPath: safePlanPath,
	      parentPlanSlotId: planSlot.slotId,
	      baseSlotId: planSlot.baseSlotId ?? planSlot.slotId,
	      sourcePath: currentSourcePath,
	      sourceHash: await sha256File(currentSourcePath),
	      sourceReceiptPath: generationReceipt?.receiptPath,
	      sourceAttempt: generationReceipt?.attempt,
	      outputPath: repairedPath,
	      parentCutoutReceiptPath: cutoutReceipt.receiptPath,
	      parentCutoutPath: candidateCutoutPath,
	      rawMaskHash: repair.rawMaskHash,
	      refinedMaskHash: repair.refinedMaskHash,
	      refinedPngHash: repair.refinedPngHash,
	      masteredPngPath: artifacts?.masteredPngPath,
	      derivedPreviewPath: artifacts?.derivedPreviewPath,
	      reviewPreviewPath: artifacts?.reviewPreviewPath,
	      characterPipeline: artifacts?.characterPipeline,
	      repair: {
	        stage: "cutout-local-repair-v1",
	        stages: ["safe-padding-normalization", "edge-halo-defringe"],
	        reason: "Subject alpha did not touch the canvas border and props/alpha were intact; local repair normalized transparent safe padding and removed mild low-alpha halo before regeneration.",
	        extension: repair.extension,
	        defringeAlphaBelow: repair.defringeAlphaBelow,
	      },
	      edgeRefinement: {
	        stage: "edge-refinement-v1",
	        order: "provider-source-to-cutout-to-local-repair-to-alpha-qa-to-mastering",
	        parameters: {
	          trimap: "existing-cutout-alpha-derived",
	          morphology: "none",
	          feathering: "none",
	          decontamination: "low-alpha-defringe-plus-transparent-canvas-expansion",
	        },
	        beforeQa: cutoutReceipt.qa?.metrics,
	        afterQa: qa.metrics,
	      },
	      thresholds: planSlot.cutout.thresholds,
	      qa,
	      failureCodes: qa.failures,
	      createdAt: new Date().toISOString(),
	    };

	    await writeFile(nextReceipt.path, `${JSON.stringify(repairedReceipt, null, 2)}\n`);
	    localRepairResults.push({
	      slotId: planSlot.slotId,
	      status,
	      receiptPath: nextReceipt.path,
	      outputPath: repairedPath,
	      failureCodes: qa.failures,
	    });
	  }

	  const result = {
	    schemaVersion: "tower-creative-generation-repair-auto-v1",
	    planPath: safePlanPath,
	    repairPlanPath,
	    cutoutSlots,
	    localRepairSlots,
	    localRepairResults,
	    skipped,
	    status: cutoutSlots.length
	      ? "cutout-run"
	      : localRepairSlots.length
	        ? localRepairResults.some((entry) => entry.status !== "passed")
	          ? "local-repair-blocked"
	          : "local-repair-run"
	        : "nothing-to-repair",
	  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
	  }

	  console.log(`Repair auto: ${result.status}`);
	  console.log(`Cutout slots: ${cutoutSlots.length}`);
	  if (skipped.length) console.log(`Skipped: ${skipped.length}`);
	}

async function runStatusMode(argv: string[]): Promise<void> {
  const bridgePath = flagValue(argv, "--bridge");

  if (!bridgePath) throw new Error("status requires --bridge.");

  const safeBridgePath = assertSafeInputPath(bridgePath);
  const plan = await readJson<CreativeGenerationBridgePlan | GeminiApiGenerationPlan>(safeBridgePath);
  const awaitingSlotStatus = plan.adapter === "gemini-api" ? "awaiting-generation" : "awaiting-download";
  const slotStates = await Promise.all(plan.slots.map(async (slot) => {
    const exists = await pathExists(slot.expectedInboxFile);
    const receiptFiles = await readdir(slot.inboxDirectory)
      .then((files) => files.filter((file) => /^(?:download-receipt(?:-v\d{3})?|api-receipt(?:-v\d{3})?)\.json$/.test(file)))
      .catch(() => []);
    const receipts = await Promise.all(receiptFiles.map(async (file) => {
      const receiptPath = join(slot.inboxDirectory, file);
      const receipt = await readJson<{
        attempt?: number;
        capturedFile?: string;
        qualityWarnings?: string[];
        metadata?: { width?: number; height?: number; format?: string; hasAlpha?: boolean };
      }>(receiptPath);
      const capturedFile = receipt.capturedFile;
      const capturedFileExists = capturedFile ? await pathExists(capturedFile) : exists;
      const qualityWarnings = [
        ...(receipt.qualityWarnings ?? []),
        capturedFileExists ? "" : "captured-file-missing",
      ].filter(Boolean);

      return {
        receiptPath,
        attempt: receipt.attempt ?? generationReceiptAttemptFromFile(file),
        capturedFile,
        qualityWarnings,
        metadata: receipt.metadata ?? {},
      };
    }));
    const cleanReceipts = receipts.filter((receipt) => receipt.qualityWarnings.length === 0);
    const warningReceipts = receipts.filter((receipt) => receipt.qualityWarnings.length > 0);
    const slotStatus = cleanReceipts.length
      ? "captured"
      : receipts.length
        ? "captured-with-warnings"
        : exists
          ? "captured-unreceipted"
          : awaitingSlotStatus;

    return {
      slotId: slot.slotId,
      status: slotStatus,
      expectedInboxFile: slot.expectedInboxFile,
      receiptExists: receipts.length > 0,
      attempts: receipts,
      qualityWarnings: Array.from(new Set(warningReceipts.flatMap((receipt) => receipt.qualityWarnings))),
    };
  }));
  const pending = slotStates.filter((slot) => slot.status === awaitingSlotStatus);
  const warningSlots = slotStates.filter((slot) => slot.status === "captured-with-warnings");
  const statusValue = pending.length
    ? plan.adapter === "gemini-api" ? "awaiting-generation" : "awaiting-downloads"
    : warningSlots.length
      ? plan.adapter === "gemini-api" ? "awaiting-clean-generations" : "awaiting-clean-downloads"
      : "ready-to-ingest";

  console.log(JSON.stringify({
    schemaVersion: "tower-creative-generation-bridge-status-v1",
    runId: plan.runId,
    adapter: plan.adapter,
    status: statusValue,
    captured: slotStates.filter((slot) => slot.status === "captured").map((slot) => slot.slotId),
    capturedWithWarnings: warningSlots.map((slot) => slot.slotId),
    pending: pending.map((slot) => slot.slotId),
    slots: slotStates,
  }, null, 2));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? "adapters";

  if (!KNOWN_COMMANDS.has(command)) {
    throw new Error(`Unknown art generation adapter command: ${command}`);
  }

  validateKnownFlags(argv);

  if (command === "adapters") {
    await runAdaptersMode();
    return;
  }

  if (command === "prepare-subscription") {
    await runPrepareSubscriptionMode(argv);
    return;
  }

  if (command === "prepare-api") {
    await runPrepareApiMode(argv);
    return;
  }

  if (command === "run-api") {
    await runApiMode(argv);
    return;
  }

	  if (command === "doctor") {
	    await runDoctorMode(argv);
	    return;
	  }

	  if (command === "cutout-bootstrap") {
	    await runCutoutBootstrapMode(argv);
	    return;
	  }

	  if (command === "cutout-benchmark") {
	    await runCutoutBenchmarkMode(argv);
	    return;
	  }

	  if (command === "cutout-readiness") {
	    await runCutoutReadinessMode(argv);
	    return;
	  }

	  if (command === "cutout-auto") {
	    await runCutoutAutoMode(argv);
	    return;
	  }

	  if (command === "cutout-doctor") {
	    await runCutoutDoctorMode(argv);
	    return;
	  }

  if (command === "repair-plan") {
    await runRepairPlanMode(argv);
    return;
  }

  if (command === "verify-canary") {
    await runVerifyCanaryMode(argv);
    return;
  }

  if (command === "repair-auto") {
    await runRepairAutoMode(argv);
    return;
  }

  if (command === "capture-download") {
    await runCaptureDownloadMode(argv);
    return;
  }

	  await runStatusMode(argv);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
