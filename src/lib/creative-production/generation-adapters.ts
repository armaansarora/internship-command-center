import { basename, join } from "node:path";

import type { CreativeAssetType } from "./types";

export const CREATIVE_GENERATION_ADAPTERS = [
  "gemini-subscription-browser",
  "chatgpt-subscription-inbox",
  "openai-api",
  "gemini-api",
  "local-mock",
] as const;

export type CreativeGenerationAdapterId = (typeof CREATIVE_GENERATION_ADAPTERS)[number];

export const CREATIVE_GENERATION_QUALITY_MODES = [
  "fast-draft-only",
  "pro",
  "thinking",
  "highest-quality-available",
] as const;

export type CreativeGenerationQualityMode = (typeof CREATIVE_GENERATION_QUALITY_MODES)[number];

export const CREATIVE_GENERATION_STYLE_PRESET_POLICIES = [
  "none-by-default",
  "approved-style-lock",
  "exploration-lane-only",
] as const;

export type CreativeGenerationStylePresetPolicy =
  (typeof CREATIVE_GENERATION_STYLE_PRESET_POLICIES)[number];

export const CREATIVE_FORBIDDEN_STYLE_PRESETS = ["color block"] as const;

export interface CreativeGenerationUiSettings {
  qualityMode: CreativeGenerationQualityMode;
  stylePreset: string;
  stylePresetPolicy: CreativeGenerationStylePresetPolicy;
  productionRequirement: string;
  consistencyRule: string;
  forbiddenStylePresets: readonly string[];
}

export interface CreativeGenerationAdapterDefinition {
  id: CreativeGenerationAdapterId;
  label: string;
  provider: "gemini" | "chatgpt" | "openai-api" | "gemini-api" | "local";
  billingPath: "subscription-ui" | "api-billed" | "local-only";
  requiresApiBilling: boolean;
  canRunUnattendedFromNode: boolean;
  canUseCodexComputerUse: boolean;
  directFileSave: boolean;
  productionRole: "recommended-subscription-v1" | "manual-fallback" | "paid-automation" | "test-only";
  recommendedUiSettings?: CreativeGenerationUiSettings;
  riskNotes: readonly string[];
}

export const DEFAULT_GEMINI_SUBSCRIPTION_UI_SETTINGS: CreativeGenerationUiSettings = {
  qualityMode: "highest-quality-available",
  stylePreset: "none/default",
  stylePresetPolicy: "none-by-default",
  productionRequirement: "Use Gemini's Pro, Thinking, Redo with Pro, or highest-quality image mode for production. Fast is draft-only. Subscription downloads may still be below native 4K and must keep QA warnings visible.",
  consistencyRule: "Keep model, quality mode, style preset, prompt style lock, and identity reference fixed across every slot in one character run.",
  forbiddenStylePresets: CREATIVE_FORBIDDEN_STYLE_PRESETS,
};

export const CREATIVE_GENERATION_ADAPTER_DEFINITIONS: readonly CreativeGenerationAdapterDefinition[] = [
  {
    id: "gemini-subscription-browser",
    label: "Gemini subscription browser bridge",
    provider: "gemini",
    billingPath: "subscription-ui",
    requiresApiBilling: false,
    canRunUnattendedFromNode: false,
    canUseCodexComputerUse: true,
    directFileSave: false,
    productionRole: "recommended-subscription-v1",
    recommendedUiSettings: DEFAULT_GEMINI_SUBSCRIPTION_UI_SETTINGS,
    riskNotes: [
      "Uses the logged-in Gemini web app instead of a paid API call.",
      "Browser UI changes can break full automation.",
      "Must run in an isolated Tower Art Studio browser profile, not Armaan's daily Chrome profile.",
      "Downloaded full-size images still need local source QA before promotion.",
    ],
  },
  {
    id: "chatgpt-subscription-inbox",
    label: "ChatGPT subscription manual inbox",
    provider: "chatgpt",
    billingPath: "subscription-ui",
    requiresApiBilling: false,
    canRunUnattendedFromNode: false,
    canUseCodexComputerUse: true,
    directFileSave: false,
    productionRole: "manual-fallback",
    riskNotes: [
      "Uses ChatGPT image generation under the signed-in subscription.",
      "Image files must be downloaded or moved into the run inbox before QA.",
    ],
  },
  {
    id: "openai-api",
    label: "OpenAI image API",
    provider: "openai-api",
    billingPath: "api-billed",
    requiresApiBilling: true,
    canRunUnattendedFromNode: true,
    canUseCodexComputerUse: false,
    directFileSave: true,
    productionRole: "paid-automation",
    riskNotes: [
      "Best automation path, but uses API billing rather than a ChatGPT subscription.",
    ],
  },
  {
    id: "gemini-api",
    label: "Gemini API (Nano Banana 2)",
    provider: "gemini-api",
    billingPath: "api-billed",
    requiresApiBilling: true,
    canRunUnattendedFromNode: true,
    canUseCodexComputerUse: false,
    directFileSave: true,
    productionRole: "paid-automation",
    riskNotes: [
      "Default paid automation path after Armaan explicitly approved API billing.",
      "Locked to Nano Banana 2 / gemini-3.1-flash-image-preview for Tower v3 runs.",
      "API key must come from local environment variables and must never be written into repo files.",
    ],
  },
  {
    id: "local-mock",
    label: "Local mock generator",
    provider: "local",
    billingPath: "local-only",
    requiresApiBilling: false,
    canRunUnattendedFromNode: true,
    canUseCodexComputerUse: false,
    directFileSave: true,
    productionRole: "test-only",
    riskNotes: [
      "Only for pipeline tests; never a source of approved production art.",
    ],
  },
] as const;

export interface CreativeGenerationSlotInput {
  slotId: string;
  prompt: string;
  targetDirectory: string;
  targetFilename: string;
  reason: string;
  laneId?: string;
}

export interface CreativeGenerationSlot {
  slotId: string;
  status: "awaiting-subscription-generation";
  prompt: string;
  reason: string;
  laneId?: string;
  inboxDirectory: string;
  expectedInboxFile: string;
  targetDirectory: string;
  targetFilename: string;
  captureCommand: string;
}

export interface CreativeGenerationBridgePlan {
  schemaVersion: "tower-creative-generation-bridge-v1";
  adapter: CreativeGenerationAdapterId;
  adapterDefinition: CreativeGenerationAdapterDefinition;
  status: "awaiting-subscription-generation";
  runId: string;
  assetType: CreativeAssetType;
  name: string;
  createdAt: string;
  browserUrl: string;
  inboxRoot: string;
  bridgeRoot: string;
  billingPolicy: "subscription-first-no-api-billing";
  directFileSave: false;
  maxParallelBrowserTabs: number;
  sourceRequirements: {
    minimumLongEdge?: number;
    minimumShortEdge?: number;
  };
  uiSettings: CreativeGenerationUiSettings;
  slots: CreativeGenerationSlot[];
  nextCommands: string[];
}

export interface CreativeGenerationBridgeStatus {
  status: "awaiting-downloads" | "ready-to-ingest";
  readySlots: string[];
  pendingSlots: string[];
}

export function getCreativeGenerationAdapterDefinition(
  id: CreativeGenerationAdapterId,
): CreativeGenerationAdapterDefinition {
  const definition = CREATIVE_GENERATION_ADAPTER_DEFINITIONS.find((entry) => entry.id === id);

  if (!definition) {
    throw new Error(`Unknown creative generation adapter: ${id}`);
  }

  return definition;
}

export function assertCreativeGenerationAdapterId(value: string): CreativeGenerationAdapterId {
  if (!CREATIVE_GENERATION_ADAPTERS.includes(value as CreativeGenerationAdapterId)) {
    throw new Error(`Unknown creative generation adapter: ${value}`);
  }

  return value as CreativeGenerationAdapterId;
}

export function assertAllowedCreativeStylePreset(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Style preset cannot be empty.");
  }

  if (CREATIVE_FORBIDDEN_STYLE_PRESETS.includes(normalized as (typeof CREATIVE_FORBIDDEN_STYLE_PRESETS)[number])) {
    throw new Error(`Style preset "${value}" is forbidden for Tower production.`);
  }

  return value;
}

export function createGeminiSubscriptionBridgePlan(input: {
  runId: string;
  assetType: CreativeAssetType;
  name: string;
  bridgeRoot: string;
  inboxRoot: string;
  slots: CreativeGenerationSlotInput[];
  createdAt?: string;
  maxParallelBrowserTabs?: number;
  sourceRequirements?: {
    minimumLongEdge?: number;
    minimumShortEdge?: number;
  };
  uiSettings?: Partial<CreativeGenerationUiSettings>;
}): CreativeGenerationBridgePlan {
  if (!input.slots.length) {
    throw new Error("A generation bridge needs at least one slot.");
  }

  const adapter = getCreativeGenerationAdapterDefinition("gemini-subscription-browser");
  const uiSettings: CreativeGenerationUiSettings = {
    ...DEFAULT_GEMINI_SUBSCRIPTION_UI_SETTINGS,
    ...input.uiSettings,
  };
  assertAllowedCreativeStylePreset(uiSettings.stylePreset);
  const slots = input.slots.map((slot) => {
    const inboxDirectory = join(input.inboxRoot, slot.slotId);
    const expectedInboxFile = join(inboxDirectory, slot.targetFilename);

    return {
      slotId: slot.slotId,
      status: "awaiting-subscription-generation" as const,
      prompt: slot.prompt,
      reason: slot.reason,
      ...(slot.laneId ? { laneId: slot.laneId } : {}),
      inboxDirectory,
      expectedInboxFile,
      targetDirectory: slot.targetDirectory,
      targetFilename: slot.targetFilename,
      captureCommand: `npm run art:generate -- capture-download --bridge ${join(input.bridgeRoot, "generation-bridge.json")} --slot ${slot.slotId} --source <downloaded-file>`,
    };
  });

  return {
    schemaVersion: "tower-creative-generation-bridge-v1",
    adapter: adapter.id,
    adapterDefinition: adapter,
    status: "awaiting-subscription-generation",
    runId: input.runId,
    assetType: input.assetType,
    name: input.name,
    createdAt: input.createdAt ?? new Date().toISOString(),
    browserUrl: "https://gemini.google.com/app",
    inboxRoot: input.inboxRoot,
    bridgeRoot: input.bridgeRoot,
    billingPolicy: "subscription-first-no-api-billing",
    directFileSave: false,
    maxParallelBrowserTabs: input.maxParallelBrowserTabs ?? 5,
    sourceRequirements: input.sourceRequirements ?? {},
    uiSettings,
    slots,
    nextCommands: [
      "Open Gemini in the signed-in Chrome profile and keep Create image mode selected.",
      `Set image quality mode to ${uiSettings.qualityMode}. If Gemini exposes Pro as Redo with Pro, use that before downloading. Fast mode is draft-only and is not allowed for production sources.`,
      `Set style preset to ${uiSettings.stylePreset}. Presets are art direction locks and must match the bridge plan.`,
      "Generate each slot prompt through the Gemini Pro subscription UI.",
      "Click Download full size image for each result.",
      "Run the matching capture-download command for each downloaded file.",
      `npm run art:generate -- status --bridge ${join(input.bridgeRoot, "generation-bridge.json")}`,
    ],
  };
}

export function renderGeminiSubscriptionBridgeRunbook(plan: CreativeGenerationBridgePlan): string {
  const slotLines = plan.slots
    .map((slot, index) => [
      `## Slot ${index + 1}: ${slot.slotId}`,
      "",
      `Reason: ${slot.reason}`,
      "",
      "Gemini prompt:",
      "",
      "```text",
      slot.prompt,
      "```",
      "",
      "After Gemini downloads the full-size image, capture it with:",
      "",
      "```bash",
      slot.captureCommand,
      "```",
      "",
      `Inbox target: \`${slot.expectedInboxFile}\``,
      `Pipeline target after ingest: \`${slot.targetDirectory}/${slot.targetFilename}\``,
    ].join("\n"))
    .join("\n\n");

  return `# Gemini Subscription Generation Bridge

Run: \`${plan.runId}\`
Asset: ${plan.name} (${plan.assetType})
Adapter: ${plan.adapterDefinition.label}
Billing: ${plan.billingPolicy}
Quality mode: ${plan.uiSettings.qualityMode}
Style preset: ${plan.uiSettings.stylePreset}
Style preset policy: ${plan.uiSettings.stylePresetPolicy}

This bridge uses the logged-in Gemini web app and Armaan's subscription path. It does not use a paid image API. It is not fully unattended from Node because the image files are produced by the browser UI, then captured into the run inbox.

## Operating Rules

- Keep Gemini in Create image mode.
- Use the signed-in Chrome profile that shows the Pro badge.
- Use Gemini's Pro, Thinking, Redo with Pro, or highest-quality available image mode for production. Fast mode is only allowed for rough draft exploration and must not feed production source capture.
- If Gemini exposes Pro as a post-generation "Redo with Pro" action, use it before downloading the source file.
- Gemini subscription downloads can still be below the native 4K source target. Capture the best full-size Pro output, but keep source-size warnings visible.
- Treat style presets like a real art director input. Do not click Illustration, Anime, or any other preset unless the bridge records that exact preset.
- Never use the Color block preset for Tower production. It flattens the project into the wrong house style.
- If the plan says \`none/default\`, leave the preset unselected/default and let the approved Tower prompt plus identity reference control the style.
- If a preset is intentionally used, keep that same preset fixed across every slot in the run. Changing it mid-character is identity drift.
- Do not place downloads directly in \`public/art\`.
- Every downloaded source must be captured into its labeled inbox slot.
- Failed retries must be captured as new attempts, for example \`--attempt 2\`, so bad outputs stay auditable instead of being overwritten.
- Run status after each batch; promotion remains blocked until local QA passes.
- Status values like \`captured-with-warnings\` or \`awaiting-clean-downloads\` are blockers, not success states.
- If Gemini changes its UI or lowers source quality, record it in the Continuous Improvement Gate before continuing.

## Browser URL

${plan.browserUrl}

## Slots

${slotLines}
`;
}

export function createPromptDeck(plan: CreativeGenerationBridgePlan): string {
  return plan.slots
    .map((slot, index) => [
      `# ${String(index + 1).padStart(2, "0")} ${slot.slotId}`,
      "",
      "```text",
      slot.prompt,
      "```",
    ].join("\n"))
    .join("\n\n");
}

export function getCreativeGenerationBridgeStatus(input: {
  plan: CreativeGenerationBridgePlan;
  existingFiles: readonly string[];
}): CreativeGenerationBridgeStatus {
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
    status: pendingSlots.length ? "awaiting-downloads" : "ready-to-ingest",
    readySlots,
    pendingSlots,
  };
}
