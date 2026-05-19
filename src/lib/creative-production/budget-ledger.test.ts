import { describe, expect, it } from "vitest";
import {
  appendGenerationBudgetEntry,
  createGenerationBudgetLedger,
  getDefaultCreativeBudgetPolicy,
} from "./index";

describe("creative generation budget ledger", () => {
  it("uses tighter default budgets for character production than the old ten-dollar ceiling", () => {
    const policy = getDefaultCreativeBudgetPolicy("character");

    expect(policy.initialDesignCents).toBe(100);
    expect(policy.canaryCents).toBe(50);
    expect(policy.normalCeilingCents).toBe(500);
    expect(policy.absoluteStopCents).toBe(600);
  });

  it("records paid requests with projected totals and blocks spend past the hard stop", () => {
    const ledger = createGenerationBudgetLedger({
      runId: "otis-production-v1",
      assetType: "character",
    });
    const afterInitial = appendGenerationBudgetEntry(ledger, {
      phase: "initial-design",
      reason: "five prompt-only concepts",
      billableImages: 5,
      costPerImageCents: 15.1,
      slotIds: ["otis-design"],
      attempt: 1,
    });
    const afterCanary = appendGenerationBudgetEntry(afterInitial, {
      phase: "canary",
      reason: "prove production matte",
      billableImages: 1,
      costPerImageCents: 15.1,
      slotIds: ["regular-idle"],
      attempt: 1,
    });

    expect(afterCanary.spend.totalProjectedCents).toBeCloseTo(90.6);
    expect(afterCanary.entries).toHaveLength(2);

    expect(() => appendGenerationBudgetEntry(afterCanary, {
      phase: "slot-repair",
      reason: "too many paid repair slots",
      billableImages: 40,
      costPerImageCents: 15.1,
      slotIds: Array.from({ length: 40 }, (_, index) => `slot-${index}`),
      attempt: 3,
      batchScope: "slot-repair",
    })).toThrow("absolute stop");
  });

  it("forbids whole-pack warning retries while allowing named slot repairs", () => {
    const ledger = createGenerationBudgetLedger({
      runId: "otis-production-v1",
      assetType: "character",
    });

    expect(() => appendGenerationBudgetEntry(ledger, {
      phase: "production-pack",
      reason: "retry every warning receipt",
      billableImages: 24,
      costPerImageCents: 15.1,
      slotIds: Array.from({ length: 24 }, (_, index) => `slot-${index}`),
      attempt: 2,
      batchScope: "whole-pack-retry",
    })).toThrow("Whole-pack retries are banned");

    const repaired = appendGenerationBudgetEntry(ledger, {
      phase: "slot-repair",
      reason: "repair two missing winter slots",
      billableImages: 2,
      costPerImageCents: 15.1,
      slotIds: ["winter-greeting", "winter-talking"],
      attempt: 2,
      batchScope: "slot-repair",
    });

    expect(repaired.entries[0]?.phase).toBe("slot-repair");
    expect(repaired.spend.totalProjectedCents).toBeCloseTo(30.2);
  });

  it("forbids small production-pack retries unless they are named slot repairs", () => {
    const ledger = createGenerationBudgetLedger({
      runId: "mara-small-pack",
      assetType: "character",
    });

    expect(() => appendGenerationBudgetEntry(ledger, {
      phase: "production-pack",
      reason: "retry two warning receipts as a pack",
      billableImages: 2,
      costPerImageCents: 15.1,
      slotIds: ["pose-idle", "pose-greeting"],
      attempt: 2,
      batchScope: "full-pack",
    })).toThrow("Whole-pack retries are banned");
  });
});
