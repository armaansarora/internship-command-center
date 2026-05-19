import type { CreativeAssetType } from "./types";

export const CREATIVE_CAPABILITY_IDS = [
  "raster-concept-art",
  "transparent-production-asset",
  "responsive-environment",
  "app-ui-surface",
  "code-ui-component",
  "shader-effect",
  "motion-system",
  "sprite-animation",
  "three-scene",
  "review-board",
  "iconography-system",
  "marketing-composition",
] as const;

export type CreativeCapabilityId = (typeof CREATIVE_CAPABILITY_IDS)[number];

export interface CreativeCapabilityDefinition {
  id: CreativeCapabilityId;
  label: string;
  description: string;
  deliveryMode: "raster" | "code" | "motion" | "shader" | "three" | "hybrid";
  requiredOutputs: string[];
  qaGates: string[];
  previewTargets: string[];
}

const CAPABILITIES: Record<CreativeCapabilityId, CreativeCapabilityDefinition> = {
  "raster-concept-art": {
    id: "raster-concept-art",
    label: "Raster Concept Art",
    description: "Static visual exploration boards for characters, scenes, props, environments, and marketing compositions.",
    deliveryMode: "raster",
    requiredOutputs: ["concept options", "prompt refs", "style notes", "rejection notes"],
    qaGates: ["style fit", "visual variety", "no copied likeness", "clear labels"],
    previewTargets: ["review-board"],
  },
  "transparent-production-asset": {
    id: "transparent-production-asset",
    label: "Transparent Production Asset",
    description: "Approved transparent sprites or props with alpha, padding, derivatives, and manifest provenance.",
    deliveryMode: "raster",
    requiredOutputs: ["transparent source", "normal derivative", "@2x derivative", "@3x derivative", "dark and light QA"],
    qaGates: ["alpha clean", "no haloing", "no cropped hands or props", "retina sharpness"],
    previewTargets: ["review-board", "app-scale-preview"],
  },
  "responsive-environment": {
    id: "responsive-environment",
    label: "Responsive Environment",
    description: "Room and floor backgrounds with desktop, tablet, mobile crops and UI readability zones.",
    deliveryMode: "raster",
    requiredOutputs: ["master background", "desktop crop", "tablet crop", "mobile crop", "copy-safe zones"],
    qaGates: ["text readability", "crop safety", "load size", "lobby background preservation"],
    previewTargets: ["desktop-route-preview", "mobile-route-preview"],
  },
  "app-ui-surface": {
    id: "app-ui-surface",
    label: "App UI Surface",
    description: "Raster or CSS-backed panels, controls, textures, and stateful UI surfaces.",
    deliveryMode: "hybrid",
    requiredOutputs: ["normal state", "hover state", "active state", "focus state", "disabled state", "reduced-motion state"],
    qaGates: ["hit target intact", "text not baked into pixels", "contrast", "state clarity"],
    previewTargets: ["component-preview", "desktop-route-preview", "mobile-route-preview"],
  },
  "code-ui-component": {
    id: "code-ui-component",
    label: "Code UI Component",
    description: "Real website UI built as app code, not an image mockup, with responsive and accessible states.",
    deliveryMode: "code",
    requiredOutputs: ["component contract", "responsive states", "accessibility states", "storybook or route preview notes"],
    qaGates: ["keyboard access", "reduced motion", "no overlap", "browser screenshot"],
    previewTargets: ["component-preview", "desktop-route-preview", "mobile-route-preview"],
  },
  "shader-effect": {
    id: "shader-effect",
    label: "Shader Effect",
    description: "GPU/canvas/WebGL visual effects for premium surfaces, lighting, transitions, and ambient scenes.",
    deliveryMode: "shader",
    requiredOutputs: ["shader intent", "fallback path", "performance budget", "reduced-motion behavior"],
    qaGates: ["nonblank canvas", "frame budget", "fallback works", "no UI obstruction"],
    previewTargets: ["shader-preview", "desktop-route-preview", "mobile-route-preview"],
  },
  "motion-system": {
    id: "motion-system",
    label: "Motion System",
    description: "CSS, GSAP, sprite, or canvas motion with timing, easing, triggers, and fallbacks.",
    deliveryMode: "motion",
    requiredOutputs: ["motion spec", "trigger map", "duration and easing", "fallback state"],
    qaGates: ["prefers-reduced-motion", "no layout shift", "loop stability", "input not blocked"],
    previewTargets: ["motion-preview", "desktop-route-preview", "mobile-route-preview"],
  },
  "sprite-animation": {
    id: "sprite-animation",
    label: "Sprite Animation",
    description: "Character or prop pose-state animation using approved sprites and runtime motion profiles.",
    deliveryMode: "motion",
    requiredOutputs: ["pose mapping", "state transitions", "idle behavior", "reduced-motion freeze"],
    qaGates: ["identity consistency", "state readability", "no pixelation", "motion personality fit"],
    previewTargets: ["character-stage-preview", "desktop-route-preview", "mobile-route-preview"],
  },
  "three-scene": {
    id: "three-scene",
    label: "Three.js Scene",
    description: "Immersive 3D scenes or atmospheric interactive layers built with Three.js/WebGPU-ready patterns.",
    deliveryMode: "three",
    requiredOutputs: ["scene contract", "camera framing", "interaction map", "fallback image or CSS"],
    qaGates: ["nonblank canvas", "mobile framing", "performance budget", "fallback path"],
    previewTargets: ["3d-preview", "desktop-route-preview", "mobile-route-preview"],
  },
  "review-board": {
    id: "review-board",
    label: "Review Board",
    description: "HTML contact sheet and coordinator summary for human approval.",
    deliveryMode: "hybrid",
    requiredOutputs: ["ranked options", "scores", "quality risks", "approval blockers", "next action"],
    qaGates: ["no placeholder lane results", "deduped options", "clear labels", "final approval gate visible"],
    previewTargets: ["review-board"],
  },
  "iconography-system": {
    id: "iconography-system",
    label: "Iconography System",
    description: "Custom icon systems only when approved library icons are insufficient.",
    deliveryMode: "hybrid",
    requiredOutputs: ["symbol inventory", "size matrix", "state matrix", "library-icon justification"],
    qaGates: ["small-size legibility", "contrast", "functional icon policy", "consistent naming"],
    previewTargets: ["component-preview", "review-board"],
  },
  "marketing-composition": {
    id: "marketing-composition",
    label: "Marketing Composition",
    description: "Public-facing hero or promotional art with first-viewport signal and responsive crops.",
    deliveryMode: "raster",
    requiredOutputs: ["master composition", "desktop crop", "mobile crop", "copy-safe zones", "alt text"],
    qaGates: ["brand signal", "mobile first viewport", "compression", "copy-safe zones"],
    previewTargets: ["marketing-route-preview", "mobile-route-preview"],
  },
};

const ASSET_TYPE_CAPABILITIES: Record<CreativeAssetType, CreativeCapabilityId[]> = {
  character: [
    "raster-concept-art",
    "transparent-production-asset",
    "sprite-animation",
    "review-board",
  ],
  environment: [
    "raster-concept-art",
    "responsive-environment",
    "shader-effect",
    "review-board",
  ],
  prop: [
    "raster-concept-art",
    "transparent-production-asset",
    "motion-system",
    "review-board",
  ],
  "ui-texture": [
    "app-ui-surface",
    "code-ui-component",
    "shader-effect",
    "review-board",
  ],
  animation: [
    "motion-system",
    "sprite-animation",
    "shader-effect",
    "three-scene",
    "review-board",
  ],
  scene: [
    "raster-concept-art",
    "responsive-environment",
    "motion-system",
    "three-scene",
    "review-board",
  ],
  "icon-system": [
    "iconography-system",
    "code-ui-component",
    "review-board",
  ],
  "marketing-hero": [
    "raster-concept-art",
    "responsive-environment",
    "marketing-composition",
    "review-board",
  ],
  shader: [
    "shader-effect",
    "three-scene",
    "code-ui-component",
    "review-board",
  ],
};

export function getCreativeCapabilityDefinition(
  capabilityId: CreativeCapabilityId,
): CreativeCapabilityDefinition {
  return CAPABILITIES[capabilityId];
}

export function listCreativeCapabilityDefinitions(): CreativeCapabilityDefinition[] {
  return CREATIVE_CAPABILITY_IDS.map((capabilityId) => CAPABILITIES[capabilityId]);
}

export function getCreativeCapabilitiesForAssetType(
  assetType: CreativeAssetType,
): CreativeCapabilityDefinition[] {
  return ASSET_TYPE_CAPABILITIES[assetType].map((capabilityId) => CAPABILITIES[capabilityId]);
}

export function getCreativeCapabilityInstructions(assetType: CreativeAssetType): string[] {
  return getCreativeCapabilitiesForAssetType(assetType).flatMap((capability) => [
    `${capability.label}: ${capability.description}`,
    `Required outputs: ${capability.requiredOutputs.join(", ")}`,
    `QA gates: ${capability.qaGates.join(", ")}`,
    `Preview targets: ${capability.previewTargets.join(", ")}`,
  ]);
}
