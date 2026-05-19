import type { CreativeAssetType } from "./types";

export type CreativeGenerationBudgetPhase =
  | "initial-design"
  | "canary"
  | "production-pack"
  | "slot-repair"
  | "local-repair";

export interface CreativeGenerationBudgetPolicy {
  assetType: CreativeAssetType;
  initialDesignCents: number;
  canaryCents: number;
  normalCeilingCents: number;
  absoluteStopCents: number;
  wholePackRetryAllowed: false;
}

export interface CreativeGenerationBudgetEntry {
  phase: CreativeGenerationBudgetPhase;
  reason: string;
  billableImages: number;
  costPerImageCents: number;
  slotIds: string[];
  attempt: number;
  batchScope?: "initial-design" | "canary" | "full-pack" | "slot-repair" | "whole-pack-retry" | "local-repair";
  createdAt?: string;
}

export interface CreativeGenerationBudgetLedger {
  schemaVersion: "tower-generation-budget-ledger-v1";
  runId: string;
  assetType: CreativeAssetType;
  policy: CreativeGenerationBudgetPolicy;
  entries: CreativeGenerationBudgetEntry[];
  spend: {
    totalBillableImages: number;
    totalProjectedCents: number;
    remainingNormalCents: number;
    remainingHardStopCents: number;
  };
}

export function getDefaultCreativeBudgetPolicy(assetType: CreativeAssetType): CreativeGenerationBudgetPolicy {
  if (assetType === "character") {
    return {
      assetType,
      initialDesignCents: 100,
      canaryCents: 50,
      normalCeilingCents: 500,
      absoluteStopCents: 600,
      wholePackRetryAllowed: false,
    };
  }

  return {
    assetType,
    initialDesignCents: 75,
    canaryCents: 35,
    normalCeilingCents: 250,
    absoluteStopCents: 350,
    wholePackRetryAllowed: false,
  };
}

function calculateSpend(
  policy: CreativeGenerationBudgetPolicy,
  entries: CreativeGenerationBudgetEntry[],
): CreativeGenerationBudgetLedger["spend"] {
  const totalBillableImages = entries.reduce((sum, entry) => sum + entry.billableImages, 0);
  const totalProjectedCents = entries.reduce(
    (sum, entry) => sum + (entry.billableImages * entry.costPerImageCents),
    0,
  );

  return {
    totalBillableImages,
    totalProjectedCents,
    remainingNormalCents: policy.normalCeilingCents - totalProjectedCents,
    remainingHardStopCents: policy.absoluteStopCents - totalProjectedCents,
  };
}

export function createGenerationBudgetLedger(input: {
  runId: string;
  assetType: CreativeAssetType;
  policy?: CreativeGenerationBudgetPolicy;
}): CreativeGenerationBudgetLedger {
  const policy = input.policy ?? getDefaultCreativeBudgetPolicy(input.assetType);

  return {
    schemaVersion: "tower-generation-budget-ledger-v1",
    runId: input.runId,
    assetType: input.assetType,
    policy,
    entries: [],
    spend: calculateSpend(policy, []),
  };
}

export function appendGenerationBudgetEntry(
  ledger: CreativeGenerationBudgetLedger,
  entry: CreativeGenerationBudgetEntry,
): CreativeGenerationBudgetLedger {
  if (entry.batchScope === "whole-pack-retry") {
    throw new Error("Whole-pack retries are banned; regenerate only named failed slots.");
  }

  if (entry.phase === "production-pack" && entry.attempt > 1) {
    throw new Error("Whole-pack retries are banned; use slot-repair for named failed slots.");
  }

  const nextEntry = {
    ...entry,
    createdAt: entry.createdAt ?? new Date().toISOString(),
  };
  const entries = [...ledger.entries, nextEntry];
  const spend = calculateSpend(ledger.policy, entries);

  if (spend.totalProjectedCents > ledger.policy.absoluteStopCents) {
    throw new Error(`Projected creative generation spend exceeds the absolute stop of $${(ledger.policy.absoluteStopCents / 100).toFixed(2)}.`);
  }

  return {
    ...ledger,
    entries,
    spend,
  };
}
