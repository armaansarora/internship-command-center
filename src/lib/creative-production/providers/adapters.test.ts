import { describe, expect, it } from "vitest";
import { createCreativeBudgetLedger } from "../budget/ledger";
import {
  createGeminiApiProviderAdapter,
  createLocalMockProviderAdapter,
  createOpenAiApiProviderAdapter,
  createSubscriptionManualBridgeProviderAdapter,
} from "./adapters";

describe("creative production provider adapters", () => {
  it("exposes the required provider adapter contract for approved and manual providers", async () => {
    const gemini = createGeminiApiProviderAdapter();
    const bridge = createSubscriptionManualBridgeProviderAdapter();
    const local = createLocalMockProviderAdapter();

    for (const adapter of [gemini, bridge, local]) {
      expect(adapter.capabilities()).toMatchObject({
        providerId: adapter.providerId,
        supportsSlotReceipts: true,
      });
      expect(typeof adapter.estimateCost).toBe("function");
      expect(typeof adapter.reserveBudget).toBe("function");
      expect(typeof adapter.generateSlot).toBe("function");
      expect(typeof adapter.inspectOutput).toBe("function");
      expect(typeof adapter.classifyFailure).toBe("function");
      expect(adapter.maxSafeConcurrency()).toBeGreaterThan(0);
      expect(adapter.repairRecommendations({ code: "source-size-warning", retryable: true, paid: true })).toEqual(
        expect.arrayContaining([expect.stringContaining("named slot")]),
      );
    }

    expect(gemini.capabilities()).toMatchObject({
      providerId: "gemini-api",
      billing: "api-billed",
      requiresExplicitApproval: true,
      supportsUnattendedGeneration: true,
    });
    expect(bridge.maxSafeConcurrency()).toBeLessThan(gemini.maxSafeConcurrency());
    expect(local.capabilities().billing).toBe("local-only");
  });

  it("delegates budget reservation through the same fail-closed ledger model", async () => {
    const adapter = createGeminiApiProviderAdapter();
    const ledger = createCreativeBudgetLedger({
      runId: "mara-provider-reserve",
      approvedBudgetCents: 50,
    });
    const estimate = await adapter.estimateCost({
      runId: "mara-provider-reserve",
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-1",
      prompt: "Generate Mara idle.",
      sourceHash: "prompt-hash-a",
    });
    const reserved = adapter.reserveBudget(ledger, {
      runId: "mara-provider-reserve",
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-1",
      prompt: "Generate Mara idle.",
      estimateCents: estimate.estimatedCostCents,
      sourceHash: "prompt-hash-a",
    });

    expect(reserved.reservation.providerId).toBe("gemini-api");
    expect(reserved.ledger.totals.reservedCents).toBe(estimate.estimatedCostCents);
  });

  it("keeps future OpenAI API generation blocked unless explicitly approved", async () => {
    const blocked = createOpenAiApiProviderAdapter();

    expect(blocked.capabilities()).toMatchObject({
      providerId: "openai-api",
      blocked: true,
      requiresExplicitApproval: true,
    });
    await expect(blocked.generateSlot({
      runId: "mara-openai-blocked",
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-1",
      prompt: "Generate Mara idle.",
      sourceHash: "prompt-hash-a",
    })).rejects.toThrow("explicit OpenAI API approval");

    const approved = createOpenAiApiProviderAdapter({
      approved: true,
      generateSlot: async () => ({
        status: "clean",
        actualCostCents: 42,
        outputHash: "openai-output-hash",
        responseMetadata: { approved: true },
      }),
    });

    await expect(approved.generateSlot({
      runId: "mara-openai-approved",
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-1",
      prompt: "Generate Mara idle.",
      sourceHash: "prompt-hash-a",
    })).resolves.toMatchObject({ status: "clean", actualCostCents: 42 });
  });
});
