import type {
  CreativeBudgetLedger,
  CreativeBudgetReservationResult,
  CreativeFailureClassification,
  CreativeProductionProviderId,
} from "../budget/ledger";
import { reserveCreativeBudget } from "../budget/ledger";

export type CreativeProviderBillingPath = "api-billed" | "subscription-bridge" | "local-only";

export interface CreativeProviderCapabilities {
  providerId: CreativeProductionProviderId;
  billing: CreativeProviderBillingPath;
  supportsUnattendedGeneration: boolean;
  supportsReferenceImages: boolean;
  supportsSlotReceipts: true;
  requiresExplicitApproval: boolean;
  requiresIsolatedBrowser?: boolean;
  blocked?: boolean;
  qualityWarnings: string[];
}

export interface CreativeProviderSlotRequest {
  runId: string;
  slotId: string;
  attemptId: string;
  prompt: string;
  sourceHash: string;
  metadata?: Record<string, unknown>;
}

export interface CreativeProviderCostEstimate {
  providerId: CreativeProductionProviderId;
  slotId: string;
  attemptId: string;
  estimatedCostCents: number;
  currency: "USD";
}

export interface CreativeProviderBudgetReservationInput extends Omit<CreativeProviderSlotRequest, "prompt"> {
  prompt?: string;
  estimateCents: number;
  namedRetryAuthorized?: boolean;
}

export interface CreativeProviderGenerationResult {
  status: "clean" | "warning" | "failed";
  actualCostCents: number;
  outputHash?: string;
  responseMetadata: Record<string, unknown>;
  failureClassification?: CreativeFailureClassification;
}

export interface CreativeProviderInspection {
  status: "clean" | "warning" | "failed";
  outputHash?: string;
  warnings: string[];
  failureClassification?: CreativeFailureClassification;
}

export interface CreativeProviderAdapter {
  providerId: CreativeProductionProviderId;
  capabilities(): CreativeProviderCapabilities;
  estimateCost(input: CreativeProviderSlotRequest): Promise<CreativeProviderCostEstimate> | CreativeProviderCostEstimate;
  reserveBudget(
    ledger: CreativeBudgetLedger | undefined,
    input: CreativeProviderBudgetReservationInput,
  ): CreativeBudgetReservationResult;
  generateSlot(input: CreativeProviderSlotRequest): Promise<CreativeProviderGenerationResult>;
  inspectOutput(input: CreativeProviderGenerationResult): Promise<CreativeProviderInspection> | CreativeProviderInspection;
  classifyFailure(error: unknown): CreativeFailureClassification;
  maxSafeConcurrency(): number;
  repairRecommendations(failure: CreativeFailureClassification): string[];
}

interface AdapterOptions {
  costCents?: number;
  maxConcurrency?: number;
  generateSlot?: (input: CreativeProviderSlotRequest) => Promise<CreativeProviderGenerationResult>;
}

function createBaseAdapter(input: {
  providerId: CreativeProductionProviderId;
  capabilities: CreativeProviderCapabilities;
  costCents: number;
  maxConcurrency: number;
  generateSlot?: (request: CreativeProviderSlotRequest) => Promise<CreativeProviderGenerationResult>;
  blockedMessage?: string;
}): CreativeProviderAdapter {
  return {
    providerId: input.providerId,
    capabilities: () => input.capabilities,
    estimateCost: (request) => ({
      providerId: input.providerId,
      slotId: request.slotId,
      attemptId: request.attemptId,
      estimatedCostCents: input.costCents,
      currency: "USD",
    }),
    reserveBudget: (ledger, request) => reserveCreativeBudget(ledger, {
      providerId: input.providerId,
      slotId: request.slotId,
      attemptId: request.attemptId,
      estimateCents: request.estimateCents,
      sourceHash: request.sourceHash,
      namedRetryAuthorized: request.namedRetryAuthorized,
    }),
    generateSlot: async (request) => {
      if (input.blockedMessage) throw new Error(input.blockedMessage);
      if (input.generateSlot) return input.generateSlot(request);

      return {
        status: "clean",
        actualCostCents: input.costCents,
        outputHash: `${request.slotId}-${request.attemptId}-output`,
        responseMetadata: {
          providerId: input.providerId,
          localDefault: true,
        },
      };
    },
    inspectOutput: (result) => ({
      status: result.status,
      ...(result.outputHash ? { outputHash: result.outputHash } : {}),
      warnings: result.status === "warning" ? [result.failureClassification?.code ?? "provider-warning"] : [],
      ...(result.failureClassification ? { failureClassification: result.failureClassification } : {}),
    }),
    classifyFailure: (error) => classifyProviderFailure(error),
    maxSafeConcurrency: () => input.maxConcurrency,
    repairRecommendations: (failure) => repairRecommendationsForFailure(failure),
  };
}

export function classifyProviderFailure(error: unknown): CreativeFailureClassification {
  const status = (error as { status?: number }).status;
  const message = error instanceof Error ? error.message : String(error);

  if (status === 429 || /high-demand|rate limit|quota/i.test(message)) {
    return { code: "provider-high-demand", retryable: true, paid: false, severity: "warning" };
  }

  if (/timeout|abort|network|fetch failed/i.test(message)) {
    return { code: "provider-timeout", retryable: true, paid: false, severity: "warning" };
  }

  return { code: "provider-failed", retryable: false, paid: false, severity: "blocked" };
}

export function repairRecommendationsForFailure(
  failure: CreativeFailureClassification,
): string[] {
  if (failure.retryable && failure.paid) {
    return ["Repair locally first, then regenerate only the named slot if the repair cannot pass strict QA."];
  }

  if (failure.retryable) {
    return ["Retry the same named slot after backoff; do not expand into a whole-pack retry."];
  }

  return ["Block the slot and escalate the exact failure code before spending again."];
}

export function createGeminiApiProviderAdapter(
  options: AdapterOptions = {},
): CreativeProviderAdapter {
  return createBaseAdapter({
    providerId: "gemini-api",
    costCents: options.costCents ?? 15.1,
    maxConcurrency: options.maxConcurrency ?? 5,
    generateSlot: options.generateSlot,
    capabilities: {
      providerId: "gemini-api",
      billing: "api-billed",
      supportsUnattendedGeneration: true,
      supportsReferenceImages: true,
      supportsSlotReceipts: true,
      requiresExplicitApproval: true,
      qualityWarnings: ["source-missing-alpha", "source-size-warning", "provider-high-demand"],
    },
  });
}

export function createSubscriptionManualBridgeProviderAdapter(
  options: AdapterOptions = {},
): CreativeProviderAdapter {
  return createBaseAdapter({
    providerId: "subscription-manual-bridge",
    costCents: options.costCents ?? 0,
    maxConcurrency: options.maxConcurrency ?? 1,
    generateSlot: options.generateSlot ?? (async (request) => ({
      status: "warning",
      actualCostCents: 0,
      responseMetadata: {
        providerId: "subscription-manual-bridge",
        manualBridge: true,
        slotId: request.slotId,
      },
      failureClassification: {
        code: "manual-download-required",
        retryable: true,
        paid: false,
        severity: "warning",
      },
    })),
    capabilities: {
      providerId: "subscription-manual-bridge",
      billing: "subscription-bridge",
      supportsUnattendedGeneration: false,
      supportsReferenceImages: true,
      supportsSlotReceipts: true,
      requiresExplicitApproval: false,
      requiresIsolatedBrowser: true,
      qualityWarnings: ["manual-download-required", "source-size-warning", "ui-mode-drift"],
    },
  });
}

export function createLocalMockProviderAdapter(
  options: AdapterOptions = {},
): CreativeProviderAdapter {
  return createBaseAdapter({
    providerId: "local-mock",
    costCents: options.costCents ?? 0,
    maxConcurrency: options.maxConcurrency ?? 5,
    generateSlot: options.generateSlot,
    capabilities: {
      providerId: "local-mock",
      billing: "local-only",
      supportsUnattendedGeneration: true,
      supportsReferenceImages: true,
      supportsSlotReceipts: true,
      requiresExplicitApproval: false,
      qualityWarnings: [],
    },
  });
}

export function createOpenAiApiProviderAdapter(
  options: AdapterOptions & { approved?: boolean } = {},
): CreativeProviderAdapter {
  const approved = options.approved === true;

  return createBaseAdapter({
    providerId: "openai-api",
    costCents: options.costCents ?? 0,
    maxConcurrency: approved ? (options.maxConcurrency ?? 3) : 0,
    generateSlot: approved ? options.generateSlot : undefined,
    blockedMessage: approved ? undefined : "Future OpenAI API generation requires explicit OpenAI API approval.",
    capabilities: {
      providerId: "openai-api",
      billing: "api-billed",
      supportsUnattendedGeneration: approved,
      supportsReferenceImages: true,
      supportsSlotReceipts: true,
      requiresExplicitApproval: true,
      blocked: !approved,
      qualityWarnings: ["unapproved-paid-provider"],
    },
  });
}
