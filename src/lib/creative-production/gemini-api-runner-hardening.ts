import type { GeminiApiGenerationPlan } from "./gemini-api-generation";

export interface GeminiApiRunReceiptSummary {
  slotId: string;
  attempt?: number;
  capturedFile?: string;
  qualityWarnings: string[];
  dryRun?: boolean;
}

export interface GeminiApiRunSelectedSlot {
  slot: GeminiApiGenerationPlan["slots"][number];
  attempt: number;
  reason: "missing-output" | "retry-warning-receipt";
}

export interface GeminiApiRunSkippedSlot {
  slotId: string;
  reason:
    | "clean-receipt-exists"
    | "warning-receipt-exists"
    | "max-attempts-reached"
    | "not-in-selected-slot-filter";
}

export interface GeminiApiRunExecutionPlan {
  selectedSlots: GeminiApiRunSelectedSlot[];
  skippedSlots: GeminiApiRunSkippedSlot[];
  blockers: string[];
  billablePriorImages: number;
  billableNewImages: number;
  projectedCostCents: number;
}

export function isTransientGeminiApiFailure(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

export function isRetryableGeminiApiRequestFailure(error: unknown): boolean {
  const status = (error as Error & { status?: number }).status;

  if (typeof status === "number") return isTransientGeminiApiFailure(status);

  const name = (error as { name?: string }).name ?? "";
  const message = error instanceof Error ? error.message : String(error);

  return name === "AbortError"
    || name === "TimeoutError"
    || /fetch failed|network|socket|timeout/i.test(message);
}

export function redactGeminiApiSecretText(value: string): string {
  const geminiKeyPattern = new RegExp(`${["AI", "za"].join("")}[0-9A-Za-z_-]{20,}`, "g");
  return value.replace(geminiKeyPattern, "[REDACTED_GEMINI_API_KEY]");
}

function receiptAttempt(receipt: GeminiApiRunReceiptSummary, index: number): number {
  return receipt.attempt ?? index + 1;
}

function latestAttempt(receipts: GeminiApiRunReceiptSummary[]): number {
  return receipts.reduce(
    (latest, receipt, index) => Math.max(latest, receiptAttempt(receipt, index)),
    0,
  );
}

function hasCleanReceipt(receipts: GeminiApiRunReceiptSummary[]): boolean {
  return receipts.some((receipt) => receipt.qualityWarnings.length === 0);
}

function hasWarningReceipt(receipts: GeminiApiRunReceiptSummary[]): boolean {
  return receipts.some((receipt) => receipt.qualityWarnings.length > 0);
}

export function planGeminiApiRunExecution(input: {
  plan: GeminiApiGenerationPlan;
  receiptsBySlotId: Record<string, GeminiApiRunReceiptSummary[]>;
  dryRun: boolean;
  maxAttempts: number;
  retryWarnings: boolean;
  allowedSlotIds?: readonly string[];
}): GeminiApiRunExecutionPlan {
  const selectedSlots: GeminiApiRunSelectedSlot[] = [];
  const skippedSlots: GeminiApiRunSkippedSlot[] = [];
  const blockers: string[] = [];
  const allowedSlotIdSet = input.allowedSlotIds ? new Set(input.allowedSlotIds) : undefined;

  for (const slot of input.plan.slots) {
    const receipts = input.receiptsBySlotId[slot.slotId] ?? [];

    if (allowedSlotIdSet && !allowedSlotIdSet.has(slot.slotId) && !allowedSlotIdSet.has(slot.baseSlotId)) {
      skippedSlots.push({
        slotId: slot.slotId,
        reason: "not-in-selected-slot-filter",
      });
      continue;
    }

    if (hasCleanReceipt(receipts)) {
      skippedSlots.push({
        slotId: slot.slotId,
        reason: "clean-receipt-exists",
      });
      continue;
    }

    if (hasWarningReceipt(receipts)) {
      const nextAttempt = latestAttempt(receipts) + 1;

      if (!input.retryWarnings) {
        skippedSlots.push({
          slotId: slot.slotId,
          reason: "warning-receipt-exists",
        });
        continue;
      }

      if (nextAttempt > input.maxAttempts) {
        skippedSlots.push({
          slotId: slot.slotId,
          reason: "max-attempts-reached",
        });
        blockers.push(`${slot.slotId} reached max attempts (${input.maxAttempts}).`);
        continue;
      }

      selectedSlots.push({
        slot,
        attempt: nextAttempt,
        reason: "retry-warning-receipt",
      });
      continue;
    }

    selectedSlots.push({
      slot,
      attempt: 1,
      reason: "missing-output",
    });
  }

  const billablePriorImages = Object.values(input.receiptsBySlotId)
    .flat()
    .filter((receipt) => !receipt.dryRun).length;
  const billableNewImages = input.dryRun ? 0 : selectedSlots.length;
  const projectedCostCents =
    (billablePriorImages + billableNewImages) * input.plan.costPerImageCents;

  const selectedWarningRetries = selectedSlots.filter((slot) => slot.reason === "retry-warning-receipt");
  const wholeProductionPackWarningRetry = input.plan.phase === "production-pack"
    && !allowedSlotIdSet
    && selectedWarningRetries.length > 3
    && selectedWarningRetries.length === input.plan.slots.length;

  if (wholeProductionPackWarningRetry) {
    return {
      selectedSlots: [],
      skippedSlots,
      blockers: [
        ...blockers,
        "Whole-pack warning retries are banned for production packs. Use repair-auto first, then regenerate only named failed slots.",
      ],
      billablePriorImages,
      billableNewImages: 0,
      projectedCostCents: billablePriorImages * input.plan.costPerImageCents,
    };
  }

  if (!input.dryRun && projectedCostCents > input.plan.budgetCents) {
    return {
      selectedSlots: [],
      skippedSlots,
      blockers: [
        ...blockers,
        `Projected Gemini API cost $${(projectedCostCents / 100).toFixed(2)} exceeds approved budget $${(input.plan.budgetCents / 100).toFixed(2)}.`,
      ],
      billablePriorImages,
      billableNewImages,
      projectedCostCents,
    };
  }

  return {
    selectedSlots,
    skippedSlots,
    blockers,
    billablePriorImages,
    billableNewImages,
    projectedCostCents,
  };
}
