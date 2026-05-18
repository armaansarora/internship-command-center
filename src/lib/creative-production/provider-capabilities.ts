import { GEMINI_API_DEFAULT_COST_PER_4K_IMAGE_CENTS, GEMINI_NANO_BANANA_2_MODEL } from "./gemini-api-generation";
import type { CreativeGenerationAdapterId } from "./generation-adapters";

export interface CreativeProviderCapability {
  adapter: CreativeGenerationAdapterId;
  model: string;
  supportsReferenceImages: boolean;
  supportsTrueAlpha: boolean;
  requiresLocalAlphaForCharacters: boolean;
  maxResolutionLabel: string;
  defaultCostPer4KImageCents: number;
  knownFailureModes: string[];
}

export const CREATIVE_PROVIDER_CAPABILITIES: Record<CreativeGenerationAdapterId, CreativeProviderCapability> = {
  "gemini-api": {
    adapter: "gemini-api",
    model: GEMINI_NANO_BANANA_2_MODEL,
    supportsReferenceImages: true,
    supportsTrueAlpha: false,
    requiresLocalAlphaForCharacters: true,
    maxResolutionLabel: "4K-class",
    defaultCostPer4KImageCents: GEMINI_API_DEFAULT_COST_PER_4K_IMAGE_CENTS,
    knownFailureModes: ["source-missing-alpha", "source-mime-image-jpeg", "unsafe-matte", "provider-timeout", "provider-high-demand"],
  },
  "gemini-subscription-browser": {
    adapter: "gemini-subscription-browser",
    model: "Gemini web app image model",
    supportsReferenceImages: true,
    supportsTrueAlpha: false,
    requiresLocalAlphaForCharacters: true,
    maxResolutionLabel: "provider-download-dependent",
    defaultCostPer4KImageCents: 0,
    knownFailureModes: ["manual-download", "source-size-warning", "ui-mode-drift"],
  },
  "chatgpt-subscription-inbox": {
    adapter: "chatgpt-subscription-inbox",
    model: "ChatGPT subscription image model",
    supportsReferenceImages: true,
    supportsTrueAlpha: false,
    requiresLocalAlphaForCharacters: true,
    maxResolutionLabel: "provider-download-dependent",
    defaultCostPer4KImageCents: 0,
    knownFailureModes: ["manual-download", "source-size-warning", "ui-mode-drift"],
  },
  "openai-api": {
    adapter: "openai-api",
    model: "explicitly-approved-openai-image-model",
    supportsReferenceImages: true,
    supportsTrueAlpha: false,
    requiresLocalAlphaForCharacters: true,
    maxResolutionLabel: "provider-dependent",
    defaultCostPer4KImageCents: 0,
    knownFailureModes: ["unapproved-paid-provider"],
  },
  "local-mock": {
    adapter: "local-mock",
    model: "local-mock",
    supportsReferenceImages: true,
    supportsTrueAlpha: true,
    requiresLocalAlphaForCharacters: false,
    maxResolutionLabel: "test-fixture",
    defaultCostPer4KImageCents: 0,
    knownFailureModes: [],
  },
};

export function getCreativeProviderCapability(adapter: CreativeGenerationAdapterId): CreativeProviderCapability {
  return CREATIVE_PROVIDER_CAPABILITIES[adapter];
}
