import type { CreativeAssetType } from "../types";

export const CREATIVE_ASSET_CONTRACT_TYPES = [
  "character",
  "background-environment",
  "ui-asset-button",
  "prop",
  "animation",
  "shader",
  "scene",
  "icon",
  "marketing-visual",
] as const;

export type CreativeAssetContractType = (typeof CREATIVE_ASSET_CONTRACT_TYPES)[number];

export type CreativeAssetContractSeverity = "warning" | "blocker";

export type CreativeForbiddenShortcut =
  | "external-image-url"
  | "data-uri"
  | "public-art-before-approved-for-app"
  | "production-manifest-before-approved-for-app"
  | "provider-alpha-without-local-cutout-qa"
  | "character-cutout-pipeline-for-background"
  | "whole-pack-warning-retry"
  | "unreceipted-provider-output";

export interface CreativeAssetContractOutput {
  id: string;
  label: string;
  required: boolean;
  description: string;
}

export interface CreativeAssetContractQaCheck {
  id: string;
  label: string;
  severity: CreativeAssetContractSeverity;
  requiredForPromotion: boolean;
  description: string;
}

export interface CreativeAssetManifestShape {
  schemaId: `tower.creative-production.${string}.v1`;
  requiredFields: readonly string[];
  optionalFields: readonly string[];
}

export interface CreativeAssetPromotionTarget {
  kind: "public-art" | "runtime-code" | "review-only";
  targetPath: string | null;
  manifestPath: string | null;
  writesPublicArt: boolean;
  requiresExactApprovalPhrase: "approved for app";
}

export interface CreativeAssetContract {
  assetType: CreativeAssetContractType;
  displayName: string;
  verticalSlice: boolean;
  outputs: readonly CreativeAssetContractOutput[];
  qaChecks: readonly CreativeAssetContractQaCheck[];
  previewMode: "initial-concept-board" | "final-upload-ready-board" | "app-preview-board";
  promotionTarget: CreativeAssetPromotionTarget;
  manifestShape: CreativeAssetManifestShape;
  forbiddenShortcuts: readonly CreativeForbiddenShortcut[];
}

const BASE_FORBIDDEN_SHORTCUTS: CreativeForbiddenShortcut[] = [
  "external-image-url",
  "data-uri",
  "public-art-before-approved-for-app",
  "production-manifest-before-approved-for-app",
  "whole-pack-warning-retry",
  "unreceipted-provider-output",
];

function output(id: string, label: string, description: string, required = true): CreativeAssetContractOutput {
  return { id, label, required, description };
}

function qa(
  id: string,
  label: string,
  description: string,
  severity: CreativeAssetContractSeverity = "blocker",
): CreativeAssetContractQaCheck {
  return {
    id,
    label,
    severity,
    requiredForPromotion: severity === "blocker",
    description,
  };
}

function publicArtTarget(targetPath: string, manifestPath: string): CreativeAssetPromotionTarget {
  return {
    kind: "public-art",
    targetPath,
    manifestPath,
    writesPublicArt: true,
    requiresExactApprovalPhrase: "approved for app",
  };
}

function runtimeTarget(targetPath: string, manifestPath: string): CreativeAssetPromotionTarget {
  return {
    kind: "runtime-code",
    targetPath,
    manifestPath,
    writesPublicArt: false,
    requiresExactApprovalPhrase: "approved for app",
  };
}

function reviewOnlyTarget(): CreativeAssetPromotionTarget {
  return {
    kind: "review-only",
    targetPath: null,
    manifestPath: null,
    writesPublicArt: false,
    requiresExactApprovalPhrase: "approved for app",
  };
}

function manifestShape(assetType: CreativeAssetContractType, requiredFields: string[]): CreativeAssetManifestShape {
  return {
    schemaId: `tower.creative-production.${assetType}.v1`,
    requiredFields: ["runId", "assetType", ...requiredFields],
    optionalFields: ["notes", "warnings", "sourceReceipts", "qaReceipts"],
  };
}

const CONTRACTS: Record<CreativeAssetContractType, CreativeAssetContract> = {
  character: {
    assetType: "character",
    displayName: "Character",
    verticalSlice: true,
    outputs: [
      output("identity-direction", "Identity direction", "Approved concept direction for the character identity."),
      output("source-on-approved-backdrop", "Source on approved backdrop", "Provider source generated on the backdrop contract that supports local cutout."),
      output("transparent-production-png", "Transparent production PNG", "Cutout PNG with verified alpha for app use."),
      output("sprite-derivatives", "Sprite derivatives", "Sized production derivatives for runtime placement."),
      output("app-pose-manifest", "App pose manifest", "Pose, expression, and variant metadata used by app integration."),
    ],
    qaChecks: [
      qa("source-receipt-present", "Source receipt", "Every provider source has an unambiguous receipt."),
      qa("local-cutout-required", "Local cutout", "Foreground source has passed the local cutout compiler."),
      qa("alpha-channel-present", "Alpha channel", "Production PNG contains an alpha channel and transparent background."),
      qa("edge-halo-check", "Edge halo check", "Mask edges avoid visible halos or ragged cut lines."),
      qa("app-pose-manifest-valid", "Pose manifest", "App pose manifest references the derived files and states."),
    ],
    previewMode: "app-preview-board",
    promotionTarget: publicArtTarget("public/art/lobby/<characterId>", "src/lib/visual-assets/approved-character-assets.generated.json"),
    manifestShape: manifestShape("character", ["slotId", "sourcePath", "transparentPngPath", "alphaQa", "poseManifest"]),
    forbiddenShortcuts: [
      ...BASE_FORBIDDEN_SHORTCUTS,
      "provider-alpha-without-local-cutout-qa",
    ],
  },
  "background-environment": {
    assetType: "background-environment",
    displayName: "Background / Environment",
    verticalSlice: false,
    outputs: [
      output("master-background", "Master background", "Full-quality environment master."),
      output("responsive-crop-set", "Responsive crop set", "Desktop, tablet, and mobile-safe crops."),
      output("focal-area-map", "Focal area map", "Safe focal regions and avoid zones for UI overlays."),
      output("contrast-preview", "Contrast preview", "Readability evidence in real app contexts."),
    ],
    qaChecks: [
      qa("responsive-framing", "Responsive framing", "Critical scene content remains visible across viewports."),
      qa("contrast-readability", "Contrast readability", "Foreground UI remains readable over the image."),
      qa("focal-area-safe", "Focal area safety", "Important visual areas avoid fixed UI overlays."),
    ],
    previewMode: "app-preview-board",
    promotionTarget: publicArtTarget("public/art/backgrounds", "production-manifests/backgrounds.json"),
    manifestShape: manifestShape("background-environment", ["masterPath", "cropSet", "focalAreas"]),
    forbiddenShortcuts: [
      ...BASE_FORBIDDEN_SHORTCUTS,
      "character-cutout-pipeline-for-background",
    ],
  },
  "ui-asset-button": {
    assetType: "ui-asset-button",
    displayName: "UI Asset / Button",
    verticalSlice: false,
    outputs: [
      output("state-variant-set", "State variant set", "Default, hover, pressed, disabled, focus, and loading states."),
      output("sizing-constraints", "Sizing constraints", "Minimum tap targets, fixed dimensions, and responsive rules."),
      output("component-preview", "Component preview", "Evidence inside the real component surface."),
    ],
    qaChecks: [
      qa("accessibility-contrast", "Accessibility contrast", "Text, icon, and state contrast pass accessibility checks."),
      qa("state-coverage", "State coverage", "Every expected button state has a matching variant."),
      qa("tap-target-size", "Tap target size", "Interactive target meets the app touch-size floor."),
    ],
    previewMode: "app-preview-board",
    promotionTarget: publicArtTarget("public/art/ui", "production-manifests/ui-assets.json"),
    manifestShape: manifestShape("ui-asset-button", ["stateVariants", "componentTarget", "accessibilityQa"]),
    forbiddenShortcuts: BASE_FORBIDDEN_SHORTCUTS,
  },
  prop: {
    assetType: "prop",
    displayName: "Prop",
    verticalSlice: false,
    outputs: [
      output("prop-source", "Prop source", "Audited provider source or composed prop source."),
      output("transparent-or-contextual-variant", "Transparent or contextual variant", "Transparent asset or scene-bound contextual asset based on intended use."),
      output("scale-reference", "Scale reference", "Reference that proves the prop fits the character or environment scale."),
    ],
    qaChecks: [
      qa("scale-reference-valid", "Scale reference", "Prop scale is believable against its intended context."),
      qa("shadow-floor-contact", "Shadow and floor contact", "Grounded props have believable contact shadows when needed.", "warning"),
      qa("alpha-when-transparent", "Alpha when transparent", "Transparent prop variants include usable alpha.", "warning"),
    ],
    previewMode: "final-upload-ready-board",
    promotionTarget: publicArtTarget("public/art/props", "production-manifests/props.json"),
    manifestShape: manifestShape("prop", ["variantPaths", "scaleReference"]),
    forbiddenShortcuts: BASE_FORBIDDEN_SHORTCUTS,
  },
  animation: {
    assetType: "animation",
    displayName: "Animation",
    verticalSlice: false,
    outputs: [
      output("frames-or-motion-spec", "Frames or motion spec", "Sprite frames, CSS/GSAP spec, or canvas motion recipe."),
      output("reduced-motion-fallback", "Reduced-motion fallback", "Static or low-motion state for reduced-motion users."),
      output("timing-profile", "Timing profile", "Duration, easing, loop, and interruption behavior."),
    ],
    qaChecks: [
      qa("reduced-motion-present", "Reduced motion present", "Reduced-motion fallback exists and is wired into preview."),
      qa("performance-budget", "Performance budget", "Animation stays inside runtime performance limits."),
      qa("browser-verification", "Browser verification", "Animation is verified in-browser rather than by code inspection only."),
    ],
    previewMode: "app-preview-board",
    promotionTarget: runtimeTarget("src/app", "production-manifests/animations.json"),
    manifestShape: manifestShape("animation", ["motionSpec", "fallback", "performanceBudget"]),
    forbiddenShortcuts: BASE_FORBIDDEN_SHORTCUTS,
  },
  shader: {
    assetType: "shader",
    displayName: "Shader",
    verticalSlice: false,
    outputs: [
      output("shader-code-artifact", "Shader code artifact", "WebGL, WebGPU, Three.js, or canvas shader source."),
      output("static-fallback", "Static fallback", "Fallback visual for unsupported or reduced-motion contexts."),
      output("integration-preview", "Integration preview", "Evidence in the target app surface."),
    ],
    qaChecks: [
      qa("fallback-present", "Fallback present", "Unsupported devices have a safe fallback."),
      qa("reduced-motion-behavior", "Reduced-motion behavior", "Motion intensity respects reduced-motion settings."),
      qa("performance-budget", "Performance budget", "GPU/CPU cost stays inside the declared budget."),
    ],
    previewMode: "app-preview-board",
    promotionTarget: runtimeTarget("src/app", "production-manifests/shaders.json"),
    manifestShape: manifestShape("shader", ["codeArtifact", "fallback", "performanceBudget"]),
    forbiddenShortcuts: BASE_FORBIDDEN_SHORTCUTS,
  },
  scene: {
    assetType: "scene",
    displayName: "Scene",
    verticalSlice: false,
    outputs: [
      output("composed-layout", "Composed layout", "Foreground, midground, and background composition."),
      output("layer-manifest", "Layer manifest", "Layer order, parallax, and responsive behavior metadata."),
      output("responsive-scene-previews", "Responsive scene previews", "Desktop and mobile previews in app context."),
    ],
    qaChecks: [
      qa("layer-order", "Layer order", "Foreground/background layers stack correctly."),
      qa("responsive-framing", "Responsive framing", "Scene remains coherent across viewports."),
      qa("overlap-check", "Overlap check", "UI and important scene elements do not collide."),
    ],
    previewMode: "app-preview-board",
    promotionTarget: publicArtTarget("public/art/scenes", "production-manifests/scenes.json"),
    manifestShape: manifestShape("scene", ["layout", "layers", "responsivePreviews"]),
    forbiddenShortcuts: BASE_FORBIDDEN_SHORTCUTS,
  },
  icon: {
    assetType: "icon",
    displayName: "Icon",
    verticalSlice: false,
    outputs: [
      output("size-set", "Size set", "Required raster/vector sizes for the app surface."),
      output("monochrome-color-variants", "Monochrome and color variants", "Light/dark and filled/stroked variants when needed."),
      output("stroke-fill-rules", "Stroke/fill rules", "Rules that preserve consistency with the design system."),
    ],
    qaChecks: [
      qa("contrast-check", "Contrast check", "Icon variants remain visible on target surfaces."),
      qa("pixel-fit", "Pixel fit", "Small sizes remain legible and aligned."),
      qa("variant-coverage", "Variant coverage", "All declared icon variants exist."),
    ],
    previewMode: "final-upload-ready-board",
    promotionTarget: publicArtTarget("public/art/icons", "production-manifests/icons.json"),
    manifestShape: manifestShape("icon", ["sizes", "variants", "strokeFillRules"]),
    forbiddenShortcuts: BASE_FORBIDDEN_SHORTCUTS,
  },
  "marketing-visual": {
    assetType: "marketing-visual",
    displayName: "Marketing Visual",
    verticalSlice: false,
    outputs: [
      output("social-export-set", "Social export set", "Social, open graph, and share-card export sizes."),
      output("hero-export-set", "Hero export set", "Landing hero or promotional image sizes."),
      output("crop-safe-areas", "Crop-safe areas", "Safe areas for platform crops and text overlays."),
    ],
    qaChecks: [
      qa("export-size-coverage", "Export size coverage", "All requested marketing export sizes exist."),
      qa("crop-safety", "Crop safety", "Important content survives common crops."),
      qa("text-safe-area", "Text-safe area", "Text or planned copy has safe readable space."),
    ],
    previewMode: "initial-concept-board",
    promotionTarget: reviewOnlyTarget(),
    manifestShape: manifestShape("marketing-visual", ["exportSizes", "cropSafeAreas"]),
    forbiddenShortcuts: BASE_FORBIDDEN_SHORTCUTS,
  },
};

export function getCreativeAssetContract(assetType: CreativeAssetContractType): CreativeAssetContract {
  return CONTRACTS[assetType];
}

export function listCreativeAssetContracts(): CreativeAssetContract[] {
  return CREATIVE_ASSET_CONTRACT_TYPES.map((assetType) => CONTRACTS[assetType]);
}

const CONTRACT_BY_ROUTED_ASSET_TYPE: Record<CreativeAssetType, CreativeAssetContractType> = {
  character: "character",
  environment: "background-environment",
  prop: "prop",
  "ui-texture": "ui-asset-button",
  animation: "animation",
  scene: "scene",
  "icon-system": "icon",
  "marketing-hero": "marketing-visual",
  shader: "shader",
};

export function getCreativeAssetContractForCreativeType(
  assetType: CreativeAssetType,
): CreativeAssetContract {
  return getCreativeAssetContract(CONTRACT_BY_ROUTED_ASSET_TYPE[assetType]);
}
