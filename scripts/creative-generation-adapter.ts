import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";

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
  extractSolidMatteAlpha,
  inspectSolidMatteAlphaReadiness,
  renderCharacterInitialConceptApiStyleInstructions,
  validateCreativeImageFile,
  validateReviewBoardImageReferences,
  GEMINI_API_DEFAULT_BUDGET_CENTS,
  GEMINI_API_DEFAULT_CONCURRENCY,
  GEMINI_API_DEFAULT_COST_PER_4K_IMAGE_CENTS,
  GEMINI_API_DEFAULT_LANE_COUNT,
  GEMINI_API_SECRET_ENV_VARS,
  GEMINI_NANO_BANANA_2_MODEL,
  isRetryableGeminiApiRequestFailure,
  planGeminiApiRunExecution,
  redactGeminiApiSecretText,
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
  type CreativeGenerationBudgetLedger,
} from "../src/lib/creative-production";

const KNOWN_COMMANDS = new Set([
  "adapters",
  "prepare-subscription",
  "prepare-api",
  "run-api",
  "doctor",
  "repair-plan",
  "repair-auto",
  "verify-canary",
  "capture-download",
  "extract-alpha",
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
  "--matte-color",
  "--tolerance",
  "--softness",
  "--border-sample-pixels",
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
    expectedInboxFile: string;
    inboxDirectory: string;
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
  flag: "--max-tabs" | "--lane-count" | "--concurrency" | "--budget-cents" | "--max-attempts" | "--request-retries" | "--request-timeout-ms" | "--tolerance" | "--softness" | "--border-sample-pixels",
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

function assertSafeAlphaOutputPath(path: string): string {
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

function assertCreativePacket(value: CreativePacketLike): CreativePacketLike {
  if (!value.assetType || !value.name || !value.runId || !value.outputRoot) {
    throw new Error("--packet must point at a Creative Production Engine creative-brief.json.");
  }

  return value;
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
        "Use a simple solid neutral approval background, not green chroma matte, transparency, checkerboard, a room, a wall, a floor, or a scene.",
        "This is an identity concept board, so prioritize silhouette, face, outfit read, and Tower taste over production alpha extraction.",
      ]
    : [
        "Gemini does not reliably return true alpha. Generate on a perfectly flat solid #00ff00 chroma matte background for local alpha extraction.",
        "Matte compliance is a hard technical requirement: every outer border pixel must be an unlit RGB(0,255,0) / #00ff00 chroma fill.",
        "Never generate a checkerboard background, gradient, shaded green screen, vignette, texture, room, wall, floor, or fake transparency pattern.",
        "Do not draw a floor plane, ground shadow, contact shadow, halo, glow, haze, ambient spill, or soft green reflection outside the body silhouette.",
        "Keep the character fully separated from the matte with clean edges; no green clothing, green props, green rim light, or green reflections.",
      ];

  return directive.generateFirst!.map((slot) => {
    const productionSheetSlot = !isInitialDesign && /(?:turnaround|expression|outfit|variant|sheet)/i.test(slot.slot);

    return {
      slotId: slot.slot,
      targetDirectory: slot.targetDirectory,
      targetFilename: slot.sourceFilename,
      reason: slot.reason ?? "Required API generation slot.",
      prompt: [
        isInitialDesign
          ? `Generate exactly one initial character concept image for Tower slot ${slot.slot}.`
          : productionSheetSlot
            ? `Generate exactly one production packet sheet image for Tower slot ${slot.slot}.`
            : `Generate exactly one production source image for Tower slot ${slot.slot}.`,
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
        "Keep hands, feet, props, hair, beard, coat hems, and shadows fully uncropped with generous safe padding.",
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

    await mkdir(canaryPlan.planRoot, { recursive: true });
    await mkdir(fullPlan.planRoot, { recursive: true });
    await mkdir(inboxRoot, { recursive: true });
    await Promise.all([...canaryPlan.slots, ...fullPlan.slots].map((slot) => mkdir(slot.inboxDirectory, { recursive: true })));
    await writeFile(canaryPlanPath, `${JSON.stringify(canaryPlan, null, 2)}\n`);
    await writeFile(join(canaryPlan.planRoot, "gemini-api-runbook.md"), renderGeminiApiRunbook(canaryPlan));
    await writeFile(join(canaryPlan.planRoot, "prompt-deck.md"), createGeminiApiPromptDeck(canaryPlan));
    await writeFile(fullPlanPath, `${JSON.stringify(fullPlan, null, 2)}\n`);
    await writeFile(join(fullPlan.planRoot, "gemini-api-runbook.md"), renderGeminiApiRunbook(fullPlan));
    await writeFile(join(fullPlan.planRoot, "prompt-deck.md"), createGeminiApiPromptDeck(fullPlan));
    await writeFile(canaryGatePath, `${JSON.stringify({
      schemaVersion: "tower-production-canary-gate-v1",
      runId: packet.runId,
      status: "pending",
      canaryPlanPath,
      fullPlanPath,
      createdAt: new Date().toISOString(),
      nextCommand: `npm run art:generate -- run-api --plan ${canaryPlanPath}`,
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
    }, null, 2)}\n`);

    console.log(`Created Gemini API production firewall: ${planRoot}`);
    console.log(`Canary plan: ${canaryPlanPath}`);
    console.log(`Full plan: ${fullPlanPath}`);
    console.log(`Canary gate: ${canaryGatePath}`);
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

  await mkdir(planRoot, { recursive: true });
  await mkdir(inboxRoot, { recursive: true });
  await Promise.all(plan.slots.map((slot) => mkdir(slot.inboxDirectory, { recursive: true })));
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  await writeFile(runbookPath, renderGeminiApiRunbook(plan));
  await writeFile(promptDeckPath, createGeminiApiPromptDeck(plan));

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
}): Promise<void> {
  const destination = assertSafeArtlabPath(versionedCapturePath(input.slot.expectedInboxFile, input.attempt));
  const receiptPath = versionedApiReceiptPath(destination, input.attempt);
  const bytes = Buffer.from(input.image.dataBase64, "base64");

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

async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  const failures: string[] = [];
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index]!;

      try {
        await worker(item);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
  });

  await Promise.all(runners);

  if (failures.length) {
    throw new Error(`Gemini API run finished with ${failures.length} failure(s): ${failures.join(" | ")}`);
  }
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
    const gate = gatePath && await pathExists(gatePath)
      ? await readJson<{ status?: string; promptContractHash?: string; referenceContractHash?: string; sourceContractHash?: string }>(gatePath)
      : undefined;
    const gatePassed = gate?.status === "passed"
      && (!gate.promptContractHash || gate.promptContractHash === plan.firewall.promptContractHash)
      && (!gate.referenceContractHash || gate.referenceContractHash === plan.firewall.referenceContractHash)
      && (!gate.sourceContractHash || gate.sourceContractHash === plan.firewall.sourceContractHash);

    if (!gatePassed) {
      throw new Error(`Full production API plan is blocked until the canary gate passes: ${gatePath ?? "missing canary gate"}.`);
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

    const apiKey = dryRun ? "" : readGeminiApiKeyFromEnvironment();
    const referenceImages = dryRun ? [] : await readReferenceImagesForPayload(plan);
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

    await runWithConcurrency(execution.selectedSlots, plan.maxConcurrency, async (selected) => {
      const image = dryRun
        ? await createDryRunPng(selected.slot.slotId)
        : await requestGeminiImageWithRetries({
          plan,
          slot: selected.slot,
          apiKey,
          referenceImages,
          requestRetries,
          requestTimeoutMs,
        });

      await writeApiGeneratedImage({
        plan,
        slot: selected.slot,
        image,
        dryRun,
        attempt: selected.attempt,
      });
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
    const imagePath = receipt?.capturedFile
      ? assertSafeInputPath(receipt.capturedFile)
      : slot.expectedInboxFile;
    const inspection = await validateCreativeImageFile({
      path: imagePath,
      issueCodeForMissing: "missing-generated-image",
      minimumLongEdge: plan.sourceRequirements?.minimumLongEdge,
      minimumShortEdge: plan.sourceRequirements?.minimumShortEdge,
      requireAlpha: strict && plan.assetType === "character",
    });
    const receiptIssues = !receipt
      ? [{
          code: "missing-generation-receipt",
          severity: "blocker",
          path: slot.inboxDirectory,
          message: `No generation receipt exists for slot ${slot.slotId}.`,
        }]
      : receipt.qualityWarnings.map((warning) => ({
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

async function runVerifyCanaryMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");

  if (!planPath) throw new Error("verify-canary requires --plan.");

  const safePlanPath = assertSafeInputPath(planPath);
  const plan = await readJson<GeminiApiGenerationPlan>(safePlanPath);

  if (plan.adapter !== "gemini-api" || plan.firewall?.planRole !== "canary") {
    throw new Error("verify-canary requires a Gemini API canary plan.");
  }

  const generatedImages = await Promise.all(plan.slots.map(async (slot) => {
    const receipt = await readLatestGenerationReceipt({
      inboxDirectory: slot.inboxDirectory,
    });
    const imagePath = receipt?.capturedFile
      ? assertSafeInputPath(receipt.capturedFile)
      : slot.expectedInboxFile;
    const inspection = await validateCreativeImageFile({
      path: imagePath,
      issueCodeForMissing: "missing-generated-image",
      minimumLongEdge: plan.sourceRequirements?.minimumLongEdge,
      minimumShortEdge: plan.sourceRequirements?.minimumShortEdge,
      requireAlpha: plan.assetType === "character",
    });
    const receiptWarnings = receipt ? receipt.qualityWarnings : ["missing-generation-receipt"];

    return {
      slotId: slot.slotId,
      imagePath,
      issues: [
        ...inspection.issues.map((issue) => issue.code),
        ...receiptWarnings,
      ].filter(Boolean),
    };
  }));
  const issues = generatedImages.flatMap((image) => image.issues);
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
    checkedAt: new Date().toISOString(),
    promptContractHash: plan.firewall.promptContractHash,
    referenceContractHash: plan.firewall.referenceContractHash,
    sourceContractHash: plan.firewall.sourceContractHash,
    checkedImages: generatedImages,
    nextAction: status === "passed"
      ? "Full production pack may run with the matching prompt/reference/source contract."
      : "Do not run the full production pack. Repair the canary or improve the engine before spending more.",
  }, null, 2)}\n`);

  console.log(`Canary gate: ${status}`);
  console.log(`Report: ${gatePath}`);

  if (status !== "passed") {
    throw new Error(`Canary gate blocked: ${Array.from(new Set(issues)).join(", ")}`);
  }
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
  const runApiCommand = plan.adapter === "gemini-api"
    ? `npm run art:generate -- run-api --plan ${shellArg(safePlanPath)} --max-attempts 3`
    : undefined;
  const slots = await Promise.all(plan.slots.map(async (slot) => {
    const receipt = await readLatestGenerationReceipt({
      inboxDirectory: slot.inboxDirectory,
    });
    const currentFile = receipt?.capturedFile
      ? assertSafeInputPath(receipt.capturedFile)
      : slot.expectedInboxFile;
    const inspection = await validateCreativeImageFile({
      path: currentFile,
      issueCodeForMissing: "missing-generated-image",
      minimumLongEdge: plan.sourceRequirements?.minimumLongEdge,
      minimumShortEdge: plan.sourceRequirements?.minimumShortEdge,
      requireAlpha: strict && plan.assetType === "character",
    });
    const issueCodes = inspection.issues.map((issue) => issue.code);
    const warnings = receipt?.qualityWarnings ?? [];
    const missingOrCorrupt = !receipt
      || issueCodes.includes("missing-generated-image")
      || issueCodes.includes("undecodable-image")
      || warnings.includes("captured-file-missing");
    const alphaRepairable = plan.assetType === "character"
      && Boolean(receipt?.capturedFile)
      && (warnings.includes("source-missing-alpha") || issueCodes.includes("image-missing-alpha"));
    const matteReadiness = alphaRepairable
      ? await inspectSolidMatteAlphaReadiness({
          sourcePath: currentFile,
          matteColor: "#00ff00",
        })
      : undefined;
    const dimensionFailure = warnings.some((warning) =>
      warning.startsWith("source-long-edge-below-") || warning.startsWith("source-short-edge-below-"),
    ) || issueCodes.includes("image-long-edge-below-minimum") || issueCodes.includes("image-short-edge-below-minimum");
    const outputAlphaPath = join(
      slot.inboxDirectory,
      `${basename(currentFile, extname(currentFile))}__alpha-repaired.png`,
    );
    const recommendedAction = missingOrCorrupt || dimensionFailure
      ? {
          type: "regenerate-slot",
          reason: missingOrCorrupt
            ? "The latest slot output or receipt is missing/corrupt, so the slot needs a clean regenerated attempt."
            : "The latest slot output is below the required source dimensions, so local repair would hide quality loss.",
          ...(runApiCommand ? { command: runApiCommand } : {}),
        }
      : alphaRepairable && matteReadiness?.safe
        ? {
            type: "extract-alpha",
            reason: "The latest character source exists but lacks true alpha; try loss-safe chroma matte extraction first, then rerun strict doctor.",
            command: `npm run art:generate -- extract-alpha --source ${shellArg(currentFile)} --output ${shellArg(outputAlphaPath)} --matte-color 00ff00`,
            ...(runApiCommand ? { fallbackCommand: runApiCommand } : {}),
          }
        : alphaRepairable
          ? {
              type: "regenerate-slot",
              reason: `The latest character source lacks true alpha but is not a safe flat matte source: ${matteReadiness?.reason ?? "matte readiness could not be proven."}`,
              ...(runApiCommand ? { command: runApiCommand } : {}),
            }
        : warnings.length || inspection.issues.length
          ? {
              type: "regenerate-slot",
              reason: "The latest slot still has quality warnings that do not have a safe local repair.",
              ...(runApiCommand ? { command: runApiCommand } : {}),
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
      latestAttempt: receipt?.attempt,
      qualityWarnings: warnings,
      imageIssues: inspection.issues,
      matteReadiness,
      recommendedAction,
      afterRepair: [
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
  const repairPlan = {
    schemaVersion: "tower-creative-generation-repair-plan-v1",
    planPath: safePlanPath,
    boardPath: safeBoardPath,
    repairPlanPath,
    runId: plan.runId,
    adapter: plan.adapter,
    assetType: plan.assetType,
    status: repairRequired ? "repair-required" : "clean",
    strict,
    createdAt: new Date().toISOString(),
    summary: {
      totalSlots: slots.length,
      cleanSlots: slots.filter((slot) => slot.status === "clean").length,
      repairRequiredSlots: slots.filter((slot) => slot.status === "repair-required").length,
      boardIssues: boardActions.length,
    },
    slots,
    boardActions,
    nextCommands: repairRequired
      ? [
          "Run the per-slot recommendedAction.command values that match the failure type.",
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

async function writeAlphaRepairReceiptIfPossible(input: {
  sourcePath: string;
  outputPath: string;
  report: Awaited<ReturnType<typeof extractSolidMatteAlpha>>;
}): Promise<void> {
  const sourceDirectory = dirname(input.sourcePath);
  const outputDirectory = dirname(input.outputPath);
  const receiptFiles = await readdir(sourceDirectory)
    .then((entries) => entries.filter((file) => /^(?:api-receipt(?:-v\d{3})?|download-receipt(?:-v\d{3})?)\.json$/.test(file)))
    .catch(() => []);
  const receipts = await Promise.all(receiptFiles.map(async (file) => {
    const receiptPath = join(sourceDirectory, file);
    const receipt = await readJson<{
      slotId?: string;
      attempt?: number;
      capturedFile?: string;
      qualityWarnings?: string[];
    }>(receiptPath);

    return {
      file,
      receiptPath,
      attempt: receipt.attempt ?? generationReceiptAttemptFromFile(file),
      receipt,
    };
  }));
  const sourceReceipt = receipts.find(({ receipt }) =>
    receipt.capturedFile && assertSafeInputPath(receipt.capturedFile) === input.sourcePath,
  );

  if (!sourceReceipt) return;

  let repairAttempt = Math.max(...receipts.map((receipt) => receipt.attempt), sourceReceipt.attempt) + 1;
  let receiptPath = join(outputDirectory, `download-receipt-v${String(repairAttempt).padStart(3, "0")}.json`);

  while (await pathExists(receiptPath)) {
    repairAttempt += 1;
    receiptPath = join(outputDirectory, `download-receipt-v${String(repairAttempt).padStart(3, "0")}.json`);
  }

  const metadata = await sharp(input.outputPath).metadata();

  await writeFile(receiptPath, `${JSON.stringify({
    schemaVersion: "tower-alpha-repair-receipt-v1",
    adapter: "local-alpha-extraction",
    slotId: sourceReceipt.receipt.slotId,
    attempt: repairAttempt,
    sourceAttempt: sourceReceipt.attempt,
    sourceReceiptPath: sourceReceipt.receiptPath,
    sourceFile: input.sourcePath,
    capturedFile: input.outputPath,
    capturedAt: new Date().toISOString(),
    metadata: {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      hasAlpha: metadata.hasAlpha,
    },
    alphaRepair: input.report,
    qualityWarnings: [],
  }, null, 2)}\n`);
}

async function runRepairAutoMode(argv: string[]): Promise<void> {
  const planPath = flagValue(argv, "--plan") ?? flagValue(argv, "--bridge");
  const json = argv.includes("--json");

  if (!planPath) throw new Error("repair-auto requires --plan or --bridge.");

  const safePlanPath = assertSafeInputPath(planPath);
  const plan = await readJson<AuditableGenerationPlanLike>(safePlanPath);
  const repairPlanPath = assertSafeArtlabPath(join(
    plan.planRoot ?? plan.bridgeRoot ?? dirname(safePlanPath),
    "repair-plan.json",
  ));
  const repairPlan = await readJson<{
    slots: Array<{
      slotId: string;
      currentFile: string;
      recommendedAction: {
        type: string;
        command?: string;
      };
    }>;
  }>(repairPlanPath);
  const repaired: Array<{ slotId: string; outputPath: string }> = [];
  const skipped: Array<{ slotId: string; reason: string }> = [];

  for (const slot of repairPlan.slots) {
    if (slot.recommendedAction.type !== "extract-alpha") {
      skipped.push({
        slotId: slot.slotId,
        reason: `recommended action is ${slot.recommendedAction.type}`,
      });
      continue;
    }

    const sourcePath = assertSafeSourceImagePath(slot.currentFile);
    const outputPath = assertSafeAlphaOutputPath(join(
      dirname(sourcePath),
      `${basename(sourcePath, extname(sourcePath))}__alpha-repaired.png`,
    ));
    const report = await extractSolidMatteAlpha({
      sourcePath,
      outputPath,
      matteColor: "#00ff00",
    });

    await writeAlphaRepairReceiptIfPossible({
      sourcePath,
      outputPath,
      report,
    });
    repaired.push({
      slotId: slot.slotId,
      outputPath,
    });
  }

  const result = {
    schemaVersion: "tower-creative-generation-repair-auto-v1",
    planPath: safePlanPath,
    repairPlanPath,
    repaired,
    skipped,
    status: repaired.length ? "repaired" : "nothing-to-repair",
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Repair auto: ${result.status}`);
  console.log(`Alpha repairs: ${repaired.length}`);
  if (skipped.length) console.log(`Skipped: ${skipped.length}`);
}

async function runExtractAlphaMode(argv: string[]): Promise<void> {
  const sourcePath = flagValue(argv, "--source");
  const outputPath = flagValue(argv, "--output");
  const matteColor = flagValue(argv, "--matte-color") ?? "00ff00";
  const tolerance = assertIntegerFlag(argv, "--tolerance");
  const softness = assertIntegerFlag(argv, "--softness");
  const borderSamplePixels = assertIntegerFlag(argv, "--border-sample-pixels");

  if (!sourcePath) throw new Error("extract-alpha requires --source.");
  if (!outputPath) throw new Error("extract-alpha requires --output.");

  const safeSourcePath = assertSafeSourceImagePath(sourcePath);
  const safeOutputPath = assertSafeAlphaOutputPath(outputPath);
  const report = await extractSolidMatteAlpha({
    sourcePath: safeSourcePath,
    outputPath: safeOutputPath,
    matteColor: matteColor.startsWith("#") ? matteColor : `#${matteColor}`,
    ...(tolerance !== undefined ? { tolerance } : {}),
    ...(softness !== undefined ? { softness } : {}),
    ...(borderSamplePixels !== undefined ? { borderSamplePixels } : {}),
  });
  await writeAlphaRepairReceiptIfPossible({
    sourcePath: safeSourcePath,
    outputPath: safeOutputPath,
    report,
  });

  console.log(`Extracted alpha: ${safeOutputPath}`);
  console.log(JSON.stringify(report, null, 2));
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

  if (command === "extract-alpha") {
    await runExtractAlphaMode(argv);
    return;
  }

  await runStatusMode(argv);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
