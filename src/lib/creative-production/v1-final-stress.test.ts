import { describe, expect, it } from "vitest";
import { createCreativeBudgetLedger } from "./budget";
import { planRetentionCleanup, summarizeRetentionRegistry, type CreativeRetentionEntry } from "./cleanup";
import { buildFinalUploadReadyReviewBoard } from "./review";
import { createLocalMockProviderAdapter } from "./providers";
import {
  InMemorySlotLeaseStore,
  acquireCreativeSlotLease,
  runCreativeSlotScheduler,
  type CreativeSchedulerSlot,
} from "./scheduler";

function scenarioSlot(runId: string, index: number): CreativeSchedulerSlot {
  return {
    slotId: `${runId}-slot-${index}`,
    providerId: "local-mock",
    prompt: `Generate mocked creative slot ${index}.`,
    sourceHash: `${runId}-source-${index}`,
  };
}

describe("creative production v1 final mocked stress coverage", () => {
  it("runs 100 mocked creative scenarios across provider, lease, budget, board, cleanup, and crash edges", async () => {
    const scenarioResults: string[] = [];

    for (let index = 0; index < 100; index += 1) {
      const runId = `stress-run-${index}`;
      const mode = index % 10;

      if (mode === 0) {
        const store = new InMemorySlotLeaseStore();
        const lease = acquireCreativeSlotLease(store, {
          runId,
          slotId: "stale-lock-slot",
          attemptId: "attempt-1",
          stage: "provider",
          workerId: "worker-a",
          timeoutMs: 10,
          nowMs: 1_000,
        });
        const recovered = acquireCreativeSlotLease(store, {
          runId,
          slotId: "stale-lock-slot",
          attemptId: "attempt-2",
          stage: "provider",
          workerId: "worker-b",
          timeoutMs: 10,
          nowMs: 2_000,
          verifyStaleLease: (existing) => existing.leaseId === lease.leaseId,
        });

        expect(recovered.workerId).toBe("worker-b");
        scenarioResults.push("stale-lock");
        continue;
      }

      if (mode === 1) {
        await expect(runCreativeSlotScheduler({
          runId,
          slots: [scenarioSlot(runId, 1), scenarioSlot(runId, 2)],
          provider: createLocalMockProviderAdapter({ costCents: 20 }),
          budgetLedger: createCreativeBudgetLedger({ runId, approvedBudgetCents: 10 }),
          policy: {
            perRunMaxConcurrency: 2,
            perProviderMaxConcurrency: { "local-mock": 2 },
            localStageMaxConcurrency: 1,
            slotLeaseTimeoutMs: 1_000,
          },
        })).resolves.toMatchObject({ status: "completed-with-failures" });
        scenarioResults.push("budget-edge");
        continue;
      }

      if (mode === 2) {
        const board = buildFinalUploadReadyReviewBoard({
          runId,
          assets: [{
            slotId: "low-res-image",
            label: "Low-res warning image",
            localImagePath: `.artlab/stress/${runId}/low-res.png`,
            status: "qa-passed",
            receipts: [`.artlab/stress/${runId}/receipt.json`],
            evidence: ["low-res warning retained for diagnostics"],
            warnings: ["source-long-edge-below-contract"],
            blockers: [],
          }],
        });

        expect(board.actionManifest.localImagePaths[0]).toContain("low-res.png");
        expect(board.html).toContain("source-long-edge-below-contract");
        scenarioResults.push("low-res-board");
        continue;
      }

      if (mode === 3) {
        expect(() => buildFinalUploadReadyReviewBoard({
          runId,
          assets: [{
            slotId: "broken-board",
            label: "Broken board",
            localImagePath: "https://example.com/broken.png",
            status: "qa-passed",
            receipts: [],
            evidence: [],
            warnings: [],
            blockers: [],
          }],
        })).toThrow("external image URLs");
        scenarioResults.push("broken-board");
        continue;
      }

      if (mode === 4) {
        const entries: CreativeRetentionEntry[] = [
          { path: "public/art/live.png", status: "approved", kind: "live-public-art", runId },
          { path: `.artlab/stress/${runId}/loose.png`, status: "draft", kind: "loose-download", runId },
          { path: `.artlab/stress/${runId}/old.html`, status: "superseded", kind: "review-board", runId },
        ];
        const summary = summarizeRetentionRegistry(entries, { mode: "normal" });
        const plan = planRetentionCleanup(entries);

        expect(summary.hiddenCount).toBe(1);
        expect(plan.protectedEntries).toHaveLength(1);
        expect(plan.deleteEntries).toHaveLength(1);
        scenarioResults.push("cleanup");
        continue;
      }

      const result = await runCreativeSlotScheduler({
        runId,
        slots: [scenarioSlot(runId, 1), scenarioSlot(runId, 2), scenarioSlot(runId, 3)],
        provider: createLocalMockProviderAdapter({
          costCents: 1,
          maxConcurrency: 3,
          generateSlot: async (slot) => {
            if (mode === 5 && slot.slotId.endsWith("-2")) {
              const error = new Error("provider high-demand");
              (error as Error & { status?: number }).status = 429;
              throw error;
            }

            if (mode === 6 && slot.slotId.endsWith("-2")) {
              return {
                status: "warning",
                actualCostCents: 1,
                outputHash: `${slot.slotId}-warning-output`,
                responseMetadata: { warning: true },
                failureClassification: { code: "missing-receipt-warning", retryable: true, paid: true },
              };
            }

            return {
              status: "clean",
              actualCostCents: 1,
              outputHash: `${slot.slotId}-output`,
              responseMetadata: { scenario: mode },
            };
          },
        }),
        budgetLedger: createCreativeBudgetLedger({ runId, approvedBudgetCents: 20 }),
        policy: {
          perRunMaxConcurrency: 3,
          perProviderMaxConcurrency: { "local-mock": 3 },
          localStageMaxConcurrency: 2,
          slotLeaseTimeoutMs: 1_000,
        },
        processLocalOutput: async ({ slot }) => {
          if (mode === 7 && slot.slotId.endsWith("-1")) {
            throw new Error("partial-crash-after-paid-receipt");
          }

          if (mode === 8 && slot.slotId.endsWith("-3")) {
            return {
              status: "failed",
              outputHash: `${slot.slotId}-failed-cutout`,
              failureClassification: { code: "cutout-low-confidence", retryable: true, paid: false },
            };
          }

          return { status: "clean", outputHash: `${slot.slotId}-cutout` };
        },
      });

      expect(result.receipts.length).toBeGreaterThan(0);
      expect(result.budgetLedger.totals.spentCents).toBeLessThanOrEqual(20);
      scenarioResults.push(mode === 9 ? "happy-path" : `provider-mode-${mode}`);
    }

    expect(scenarioResults).toHaveLength(100);
    expect(new Set(scenarioResults)).toEqual(new Set([
      "stale-lock",
      "budget-edge",
      "low-res-board",
      "broken-board",
      "cleanup",
      "provider-mode-5",
      "provider-mode-6",
      "provider-mode-7",
      "provider-mode-8",
      "happy-path",
    ]));
  });
});
