import { describe, expect, it } from "vitest";
import {
  createGeminiApiGenerationPlan,
  isTransientGeminiApiFailure,
  isRetryableGeminiApiRequestFailure,
  planGeminiApiRunExecution,
  redactGeminiApiSecretText,
  type GeminiApiRunReceiptSummary,
} from "./index";

function createPlan() {
  return createGeminiApiGenerationPlan({
    runId: "otis-api-hardening",
    assetType: "character",
    name: "Otis",
    phase: "production-pack",
    planRoot: ".artlab/studio/characters/otis-api-hardening/generation/gemini-api-v3",
    inboxRoot: ".artlab/inbox/character/otis-api-hardening/gemini-api-v3",
    laneCount: 1,
    maxConcurrency: 1,
    costPerImageCents: 50,
    budgetCents: 150,
    slots: [
      {
        slotId: "otis-regular-idle",
        prompt: "Generate Otis idle.",
        targetDirectory: ".artlab/runs/otis/otis-api-hardening/incoming/regular",
        targetFilename: "otis__regular__idle__source-v001.png",
        reason: "Idle source.",
      },
      {
        slotId: "otis-regular-greeting",
        prompt: "Generate Otis greeting.",
        targetDirectory: ".artlab/runs/otis/otis-api-hardening/incoming/regular",
        targetFilename: "otis__regular__greeting__source-v001.png",
        reason: "Greeting source.",
      },
    ],
  });
}

function receipt(
  overrides: Partial<GeminiApiRunReceiptSummary> = {},
): GeminiApiRunReceiptSummary {
  return {
    slotId: "api-lane-01__otis-regular-idle",
    attempt: 1,
    capturedFile: ".artlab/inbox/source.png",
    qualityWarnings: [],
    dryRun: false,
    ...overrides,
  };
}

describe("Gemini API runner hardening", () => {
  it("skips clean receipts so reruns do not spend twice on completed slots", () => {
    const plan = createPlan();
    const cleanSlotId = plan.slots[0]!.slotId;
    const execution = planGeminiApiRunExecution({
      plan,
      receiptsBySlotId: {
        [cleanSlotId]: [receipt({ slotId: cleanSlotId })],
      },
      dryRun: false,
      maxAttempts: 3,
      retryWarnings: true,
    });

    expect(execution.blockers).toEqual([]);
    expect(execution.selectedSlots.map((slot) => slot.slot.slotId)).toEqual([
      plan.slots[1]!.slotId,
    ]);
    expect(execution.skippedSlots).toContainEqual({
      slotId: cleanSlotId,
      reason: "clean-receipt-exists",
    });
    expect(execution.billableNewImages).toBe(1);
  });

  it("retries warning receipts as a new attempt without overwriting prior evidence", () => {
    const plan = createPlan();
    const warningSlotId = plan.slots[0]!.slotId;
    const execution = planGeminiApiRunExecution({
      plan,
      receiptsBySlotId: {
        [warningSlotId]: [
          receipt({
            slotId: warningSlotId,
            qualityWarnings: ["source-missing-alpha"],
          }),
        ],
      },
      dryRun: false,
      maxAttempts: 3,
      retryWarnings: true,
    });

    expect(execution.blockers).toEqual([]);
    expect(execution.selectedSlots[0]).toMatchObject({
      slot: { slotId: warningSlotId },
      attempt: 2,
      reason: "retry-warning-receipt",
    });
  });

  it("blocks retries that would exceed the approved budget cap", () => {
    const plan = createPlan();
    const warningSlotId = plan.slots[0]!.slotId;
    const execution = planGeminiApiRunExecution({
      plan,
      receiptsBySlotId: {
        [warningSlotId]: [
          receipt({
            slotId: warningSlotId,
            qualityWarnings: ["source-missing-alpha"],
          }),
          receipt({
            slotId: warningSlotId,
            attempt: 2,
            capturedFile: ".artlab/inbox/source-v002.png",
            qualityWarnings: ["source-missing-alpha"],
          }),
        ],
      },
      dryRun: false,
      maxAttempts: 3,
      retryWarnings: true,
    });

    expect(execution.blockers.join(" ")).toContain("approved budget");
    expect(execution.selectedSlots).toEqual([]);
  });

  it("blocks warning slots after max attempts instead of looping forever", () => {
    const plan = createPlan();
    const warningSlotId = plan.slots[0]!.slotId;
    const execution = planGeminiApiRunExecution({
      plan,
      receiptsBySlotId: {
        [warningSlotId]: [
          receipt({ slotId: warningSlotId, qualityWarnings: ["source-missing-alpha"] }),
          receipt({ slotId: warningSlotId, attempt: 2, qualityWarnings: ["source-missing-alpha"] }),
          receipt({ slotId: warningSlotId, attempt: 3, qualityWarnings: ["source-missing-alpha"] }),
        ],
      },
      dryRun: false,
      maxAttempts: 3,
      retryWarnings: true,
    });

    expect(execution.blockers.join(" ")).toContain("max attempts");
    expect(execution.selectedSlots.map((slot) => slot.slot.slotId)).not.toContain(warningSlotId);
  });

  it("blocks production whole-pack warning retries by default", () => {
    const plan = createGeminiApiGenerationPlan({
      runId: "otis-whole-pack-retry",
      assetType: "character",
      name: "Otis",
      phase: "production-pack",
      planRoot: ".artlab/studio/characters/otis-whole-pack-retry/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-whole-pack-retry/gemini-api-v3",
      laneCount: 1,
      maxConcurrency: 5,
      budgetCents: 1000,
      slots: Array.from({ length: 24 }, (_, index) => ({
        slotId: `slot-${index + 1}`,
        prompt: `Generate slot ${index + 1}.`,
        targetDirectory: ".artlab/runs/otis/whole-pack/incoming",
        targetFilename: `slot-${index + 1}.png`,
        reason: "Production slot.",
      })),
    });
    const receiptsBySlotId = Object.fromEntries(plan.slots.map((slot) => [
      slot.slotId,
      [receipt({
        slotId: slot.slotId,
        qualityWarnings: ["source-missing-alpha"],
      })],
    ]));
    const execution = planGeminiApiRunExecution({
      plan,
      receiptsBySlotId,
      dryRun: false,
      maxAttempts: 2,
      retryWarnings: true,
    });

    expect(execution.blockers.join(" ")).toContain("Whole-pack warning retries are banned");
    expect(execution.selectedSlots).toEqual([]);
  });

  it("blocks small production whole-pack warning retries too", () => {
    const plan = createPlan();
    const receiptsBySlotId = Object.fromEntries(plan.slots.map((slot) => [
      slot.slotId,
      [receipt({
        slotId: slot.slotId,
        qualityWarnings: ["source-missing-alpha"],
      })],
    ]));
    const execution = planGeminiApiRunExecution({
      plan,
      receiptsBySlotId,
      dryRun: false,
      maxAttempts: 2,
      retryWarnings: true,
    });

    expect(execution.blockers.join(" ")).toContain("Whole-pack warning retries are banned");
    expect(execution.selectedSlots).toEqual([]);
  });

  it("allows slot-only production repair when explicit slot ids are provided", () => {
    const plan = createGeminiApiGenerationPlan({
      runId: "otis-slot-repair",
      assetType: "character",
      name: "Otis",
      phase: "production-pack",
      planRoot: ".artlab/studio/characters/otis-slot-repair/generation/gemini-api-v3",
      inboxRoot: ".artlab/inbox/character/otis-slot-repair/gemini-api-v3",
      laneCount: 1,
      maxConcurrency: 5,
      budgetCents: 1000,
      slots: Array.from({ length: 3 }, (_, index) => ({
        slotId: `slot-${index + 1}`,
        prompt: `Generate slot ${index + 1}.`,
        targetDirectory: ".artlab/runs/otis/slot-repair/incoming",
        targetFilename: `slot-${index + 1}.png`,
        reason: "Production slot.",
      })),
    });
    const receiptsBySlotId = Object.fromEntries(plan.slots.map((slot) => [
      slot.slotId,
      [receipt({
        slotId: slot.slotId,
        qualityWarnings: ["source-missing-alpha"],
      })],
    ]));
    const execution = planGeminiApiRunExecution({
      plan,
      receiptsBySlotId,
      dryRun: false,
      maxAttempts: 2,
      retryWarnings: true,
      allowedSlotIds: [plan.slots[1]!.slotId],
    });

    expect(execution.blockers).toEqual([]);
    expect(execution.selectedSlots.map((slot) => slot.slot.slotId)).toEqual([plan.slots[1]!.slotId]);
    expect(execution.skippedSlots).toContainEqual({
      slotId: plan.slots[0]!.slotId,
      reason: "not-in-selected-slot-filter",
    });
  });

  it("classifies transient provider failures and redacts API-key-shaped text", () => {
    expect(isTransientGeminiApiFailure(429)).toBe(true);
    expect(isTransientGeminiApiFailure(503)).toBe(true);
    expect(isTransientGeminiApiFailure(400)).toBe(false);
    expect(isRetryableGeminiApiRequestFailure(new Error("fetch failed"))).toBe(true);
    expect(isRetryableGeminiApiRequestFailure(Object.assign(new Error("timeout"), { name: "TimeoutError" }))).toBe(true);
    expect(isRetryableGeminiApiRequestFailure(Object.assign(new Error("bad payload"), { status: 400 }))).toBe(false);

    const secretPrefix = ["AI", "za"].join("");
    const redacted = redactGeminiApiSecretText(
      `provider echoed key ${secretPrefix}SyDONT_USE_THIS_FAKE_KEY_1234567890 in an error`,
    );

    expect(redacted).toContain("[REDACTED_GEMINI_API_KEY]");
    expect(redacted).not.toContain(secretPrefix);
  });
});
