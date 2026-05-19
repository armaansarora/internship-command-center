import { join } from "node:path";
import { getCreativeCapabilityInstructions } from "./capabilities";
import { getCreativeAssetTypeDefinition } from "./registry";
import type { CreativeAssetType } from "./types";
import type {
  CreativeProductionInitialApprovalStatus,
  CreativeProductionRequestConfidence,
} from "./intake";

export interface CreativeProductionPacketIntake {
  rawRequest: string;
  inferredAssetType: CreativeAssetType;
  routingReason: string;
  confidence: CreativeProductionRequestConfidence;
  matchedSignals: string[];
  initialApprovalStatus: CreativeProductionInitialApprovalStatus;
  apiBudgetCents?: number;
}

export type CreativeProductionNextAction =
  | "generate-concept-options"
  | "generate-production-sources";

export interface CreativeProductionPacket {
  schemaVersion: "tower-creative-production-packet-v1";
  engineVersion: "creative-production-engine-v1";
  assetType: CreativeAssetType;
  name: string;
  runId: string;
  brief: string;
  intake?: CreativeProductionPacketIntake;
  definition: {
    displayName: string;
    description: string;
    manifestStrategy: string;
  };
  requiredOutputs: string[];
  acceptanceChecks: string[];
  capabilityInstructions: string[];
  organizationPolicy: string[];
  qualityBar: string[];
  forbiddenActions: string[];
  status: "brief-ready";
  gates: ["Housekeeping Gate", "Continuous Improvement Gate"];
  approvalGates: ["initial direction approval", "final upload-ready approval"];
  promotionPhrase: "approved for app";
  outputRoot: string;
  productionRoot: string;
  nextAction: CreativeProductionNextAction;
}

export function createCreativeProductionPacket(input: {
  assetType: CreativeAssetType;
  name: string;
  runId: string;
  brief: string;
  stateRoot: string;
  intake?: CreativeProductionPacketIntake;
}): CreativeProductionPacket {
  const definition = getCreativeAssetTypeDefinition(input.assetType);
  const packet: CreativeProductionPacket = {
    schemaVersion: "tower-creative-production-packet-v1",
    engineVersion: "creative-production-engine-v1",
    assetType: input.assetType,
    name: input.name,
    runId: input.runId,
    brief: input.brief,
    definition: {
      displayName: definition.displayName,
      description: definition.description,
      manifestStrategy: definition.manifestStrategy,
    },
    requiredOutputs: getRequiredOutputs(input.assetType, input.intake),
    acceptanceChecks: ACCEPTANCE_CHECKS[input.assetType],
    capabilityInstructions: getCreativeCapabilityInstructions(input.assetType),
    organizationPolicy: ORGANIZATION_POLICY,
    qualityBar: QUALITY_BAR[input.assetType],
    forbiddenActions: FORBIDDEN_ACTIONS,
    status: "brief-ready",
    gates: ["Housekeeping Gate", "Continuous Improvement Gate"],
    approvalGates: ["initial direction approval", "final upload-ready approval"],
    promotionPhrase: "approved for app",
    outputRoot: join(input.stateRoot, `${definition.outputRoot.split("/").at(-1) ?? input.assetType}`, input.runId),
    productionRoot: definition.productionRoot,
    nextAction: input.intake?.initialApprovalStatus === "already-approved"
      ? "generate-production-sources"
      : "generate-concept-options",
  };

  if (!input.intake) return packet;

  return {
    ...packet,
    intake: input.intake,
  };
}

export function renderCreativeProductionPrompt(packet: CreativeProductionPacket): string {
  const routing = packet.intake
    ? `\nRouting: ${packet.intake.routingReason}\nConfidence: ${packet.intake.confidence}\nOriginal request: ${packet.intake.rawRequest}\n`
    : "";

  return `# ${packet.name} Creative Production Prompt

Asset type: ${packet.assetType} (${packet.definition.displayName})
Engine: Creative Production Engine
Brief: ${packet.brief}
${routing}
Asset contract:
- ${packet.definition.description}
- Manifest strategy: ${packet.definition.manifestStrategy}

Create concept options for this Tower asset. Keep the Tower style premium, immersive, adult, organized, and consistent with approved visual canon.

Required outputs:
${renderList(packet.requiredOutputs)}

Acceptance checks:
${renderList(packet.acceptanceChecks)}

Creative capabilities:
${renderList(packet.capabilityInstructions)}

Organization policy:
${renderList(packet.organizationPolicy)}

Quality bar:
${renderList(packet.qualityBar)}

Hard requirements:
- Do not put generated files directly in public/art.
- Maintain the Housekeeping Gate after this phase.
- Maintain the Continuous Improvement Gate after this phase.
- Promotion requires the exact phrase: approved for app.
- If the request is unclear, make the smallest safe assumption, record it in the run ledger, and continue with a reversible packet instead of stalling.
`;
}

export function renderCreativeProductionNextAction(packet: CreativeProductionPacket): string {
  const actionSummary = packet.nextAction === "generate-production-sources"
    ? `Generate production sources for ${packet.name}.`
    : `Generate concept options for ${packet.name}.`;

  return `# Creative Production Engine Packet

## Next Legal Action

${actionSummary}

- Asset type: ${packet.assetType}
- Run id: ${packet.runId}
- Status: ${packet.status}
- Promotion phrase: ${packet.promotionPhrase}
- Next action id: ${packet.nextAction}
${packet.intake ? `- Routed from request: ${packet.intake.routingReason}\n` : ""}

## Gates

- Housekeeping Gate
- Continuous Improvement Gate

## Required Outputs

${renderList(packet.requiredOutputs)}

## Acceptance Checks

${renderList(packet.acceptanceChecks)}

## Creative Capabilities

${renderList(packet.capabilityInstructions)}

## Brief

${packet.brief}
`;
}

const REQUIRED_OUTPUTS: Record<CreativeAssetType, string[]> = {
  character: [
    "5 initial prompt-only concept options before identity approval",
    "approved identity reference with visual DNA notes",
    "turnaround sheet: front, 3/4 front, side, 3/4 back, and back",
    "expression sheet matched to the character bible",
    "outfit variants preserved as edits of the approved design",
    "native high-resolution individual sprite sources for idle, greeting, listening, thinking, talking, alert, and working",
    "pose/contact sheets only as optional review aids unless every split cell passes source preflight",
    "staged transparent sprites with normal, @2x, and @3x derivatives",
  ],
  environment: [
    "concept board showing at least 3 materially different environment directions",
    "approved master background composition",
    "desktop, tablet, and mobile crops",
    "light, dark, and in-context readability previews when the environment sits behind UI",
    "staged optimized raster derivatives with checksums and prompt refs",
  ],
  prop: [
    "concept options showing silhouette and scale variety",
    "approved transparent master prop",
    "dark, light, and in-world scale previews",
    "staged normal, @2x, and @3x transparent derivatives",
  ],
  "ui-texture": [
    "concept options showing material, density, and contrast variety",
    "normal, hover, active, focus, disabled, and reduced-motion states",
    "light and dark UI preview board",
    "staged raster derivatives sized to the owning component contract",
  ],
  animation: [
    "motion intent board with timing, easing, and personality notes",
    "storyboard or state sheet for the loop or transition",
    "prototype preview plus reduced-motion fallback",
    "implementation notes for CSS, sprite, canvas, or video delivery",
  ],
  scene: [
    "concept board with at least 3 composed shot directions",
    "approved master composition",
    "desktop, tablet, and mobile crops",
    "text-safe preview zones and app-context review board",
  ],
  "icon-system": [
    "symbol inventory and reason library icons are insufficient",
    "size matrix for 16, 20, 24, 32, and 48px use",
    "light, dark, disabled, and contrast previews",
    "staged raster derivatives or approved component references",
  ],
  "marketing-hero": [
    "concept board with audience, offer, and first-viewport signal notes",
    "approved master hero composition",
    "desktop, tablet, and mobile crops with copy-safe zones",
    "performance-ready raster derivatives and alt-text notes",
  ],
  shader: [
    "shader intent board with visual reference, interaction rules, and fallback behavior",
    "prototype implementation plan for WebGL, WebGPU, canvas, CSS, or Three.js delivery",
    "performance budget with mobile fallback and reduced-motion behavior",
    "desktop and mobile preview notes proving the effect does not block UI",
  ],
};

function getRequiredOutputs(
  assetType: CreativeAssetType,
  intake?: CreativeProductionPacketIntake,
): string[] {
  const outputs = REQUIRED_OUTPUTS[assetType];

  if (assetType !== "character" || intake?.initialApprovalStatus !== "already-approved") {
    return outputs;
  }

  return outputs
    .filter((output) => !output.startsWith("5 initial prompt-only concept options"))
    .map((output) =>
      output === "approved identity reference with visual DNA notes"
        ? "approved identity reference already recorded with visual DNA notes"
        : output,
    );
}

const ACCEPTANCE_CHECKS: Record<CreativeAssetType, string[]> = {
  character: [
    "the approved identity remains recognizable across outfits, poses, and expressions",
    "natural human imperfections are preserved; no fake-perfect AI model look",
    "no cropped hands, feet, props, or haloing in staged sprites",
    "all staged files remain outside public/art until final approval",
  ],
  environment: [
    "approved lobby backgrounds are untouched unless the request explicitly targets a new replacement run",
    "UI text remains readable in desktop and mobile app-context previews",
    "cropping preserves the important composition on mobile and wide desktop",
    "all staged files remain outside public/art until final approval",
  ],
  prop: [
    "transparent edges are clean on dark, light, and in-world backgrounds",
    "scale previews prove the prop works beside characters and UI",
    "all staged files remain outside public/art until final approval",
  ],
  "ui-texture": [
    "text, icon, and hit-area sizing remain controlled by app CSS, not baked into decorative art",
    "states are visually distinct without harming accessibility or app performance",
    "the asset does not replace lucide or approved functional icons without a reason",
    "all staged files remain outside public/art until final approval",
  ],
  animation: [
    "motion supports reduced-motion users with a non-animated fallback",
    "loop timing feels intentional and does not distract from core workflows",
    "implementation path is named before promotion: CSS, sprite, canvas, or video",
    "all staged files remain outside public/art until final approval",
  ],
  scene: [
    "composition works in app context without covering required controls or text",
    "responsive crops preserve story focus and visual quality",
    "all staged files remain outside public/art until final approval",
  ],
  "icon-system": [
    "custom symbols are necessary; lucide or existing library icons were checked first",
    "symbols remain legible at the smallest supported size",
    "all staged files remain outside public/art until final approval",
  ],
  "marketing-hero": [
    "the first viewport clearly signals the product, place, person, or offer",
    "copy-safe zones work on mobile and desktop",
    "all staged files remain outside public/art until final approval",
  ],
  shader: [
    "the effect has a nonblank preview and a reduced-motion fallback",
    "the performance budget is explicit before app integration",
    "the shader does not obscure or block required UI controls",
    "all staged files remain outside public/art until final approval",
  ],
};

const QUALITY_BAR: Record<CreativeAssetType, string[]> = {
  character: [
    "4K-quality master or audited highest-quality source before derivatives",
    "transparent PNG/WebP staging with safe padding and consistent source/display frames",
    "app-scale preview proves no pixelation at expected zoom",
  ],
  environment: [
    "high-resolution raster master sized for wide desktop and mobile crops",
    "no muddy compression, fake detail, or unreadable focal areas",
    "previewed behind the actual UI density expected for the destination",
  ],
  prop: [
    "high-resolution transparent source with clean alpha",
    "silhouette reads at small and medium app scale",
    "material style matches tower-flat-plus-depth-v1 unless overridden",
  ],
  "ui-texture": [
    "crisp at the component's maximum supported display scale",
    "does not bake layout text, accessibility labels, or hit targets into pixels",
    "states are exported consistently and named predictably",
  ],
  animation: [
    "motion spec includes duration, easing, trigger, idle behavior, and fallback",
    "implementation does not block page load or user input",
    "preview proves the loop can repeat without visual popping",
  ],
  scene: [
    "master composition is high resolution enough for every planned crop",
    "focal hierarchy survives app overlays and mobile compression",
    "style matches approved Tower visual canon",
  ],
  "icon-system": [
    "symbols survive small-size testing and contrast checks",
    "naming and states match app implementation needs",
    "custom art is justified against library-icon alternatives",
  ],
  "marketing-hero": [
    "image is inspection-worthy, not vague stock-like atmosphere",
    "first viewport crop remains strong on mobile and desktop",
    "compression target is defined before promotion",
  ],
  shader: [
    "frame budget and fallback path are named before promotion",
    "preview remains stable on mobile and desktop",
    "implementation can be disabled without breaking the route",
  ],
};

const ORGANIZATION_POLICY = [
  "keep drafts, generated sources, QA boards, and staged derivatives under the run folder",
  "label every output with asset type, run id, slot, status, and approval state",
  "delete or archive loose unusable artifacts during the Housekeeping Gate",
  "write nothing to public/art until final upload-ready approval says approved for app",
  "record friction, failures, slow manual steps, and rewrite triggers in the Continuous Improvement Gate",
];

const FORBIDDEN_ACTIONS = [
  "do not bypass initial direction approval; treat it as satisfied only when the request explicitly approves generation with a budget cap",
  "do not bypass final upload-ready approval",
  "do not promote low-quality or unreviewed assets",
  "do not hide warnings about softness, cropping, haloing, or manifest drift",
  "do not generate celebrity likenesses or unapproved copied styles",
];

function renderList(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}
