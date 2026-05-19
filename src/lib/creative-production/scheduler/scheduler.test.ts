import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createCreativeBudgetLedger, recordCreativeBudgetSpend, reserveCreativeBudget } from "../budget/ledger";
import { createLocalMockProviderAdapter } from "../providers/adapters";
import {
  InMemorySlotLeaseStore,
  FileCreativeSlotLeaseStore,
  acquireCreativeSlotLease,
  heartbeatCreativeSlotLease,
  releaseCreativeSlotLease,
  runCreativeSlotScheduler,
  type CreativeSchedulerProgressSnapshot,
} from "./scheduler";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slotIds(snapshot: CreativeSchedulerProgressSnapshot, stage: string): string[] {
  return Object.values(snapshot.slots)
    .filter((slot) => slot.stage === stage)
    .map((slot) => slot.slotId)
    .sort();
}

describe("creative production scheduler", () => {
  it("overlaps provider calls and starts cutout before all provider slots finish", async () => {
    const providerIntervals: Array<{ slotId: string; start: number; end: number }> = [];
    const cutoutStarts: Array<{ slotId: string; at: number }> = [];
    const snapshots: CreativeSchedulerProgressSnapshot[] = [];
    const provider = createLocalMockProviderAdapter({
      costCents: 5,
      maxConcurrency: 3,
      generateSlot: async (slot) => {
        const start = Date.now();
        await delay(slot.slotId === "slot-a" ? 20 : 80);
        const end = Date.now();
        providerIntervals.push({ slotId: slot.slotId, start, end });
        return {
          status: "clean",
          actualCostCents: 5,
          outputHash: `${slot.slotId}-provider-output`,
          responseMetadata: { startedAt: start, endedAt: end },
        };
      },
    });

    const result = await runCreativeSlotScheduler({
      runId: "mara-overlap",
      slots: ["slot-a", "slot-b", "slot-c"].map((slotId) => ({
        slotId,
        prompt: `Generate ${slotId}.`,
        providerId: "local-mock",
        sourceHash: `${slotId}-prompt`,
      })),
      provider,
      budgetLedger: createCreativeBudgetLedger({
        runId: "mara-overlap",
        approvedBudgetCents: 100,
      }),
      policy: {
        perRunMaxConcurrency: 3,
        perProviderMaxConcurrency: { "local-mock": 3 },
        localStageMaxConcurrency: 2,
        slotLeaseTimeoutMs: 5_000,
      },
      processLocalOutput: async ({ slot }) => {
        cutoutStarts.push({ slotId: slot.slotId, at: Date.now() });
        await delay(30);
        return { status: "clean", outputHash: `${slot.slotId}-cutout-output` };
      },
      onProgress: (snapshot) => snapshots.push(snapshot),
    });

    expect(result.status).toBe("completed");
    expect(providerIntervals).toHaveLength(3);
    expect(providerIntervals[0]!.start).toBeLessThan(providerIntervals[1]!.end);
    expect(providerIntervals[1]!.start).toBeLessThan(providerIntervals[0]!.end);
    expect(cutoutStarts[0]!.at).toBeLessThan(Math.max(...providerIntervals.map((interval) => interval.end)));
    expect(snapshots.some((snapshot) =>
      slotIds(snapshot, "local-cutout-running").length > 0 &&
      slotIds(snapshot, "provider-running").length > 0,
    )).toBe(true);
  });

  it("keeps unrelated provider calls active when one slot cutout fails", async () => {
    const providerFinished: string[] = [];
    const result = await runCreativeSlotScheduler({
      runId: "mara-cutout-failure",
      slots: ["slot-a", "slot-b", "slot-c"].map((slotId) => ({
        slotId,
        prompt: `Generate ${slotId}.`,
        providerId: "local-mock",
        sourceHash: `${slotId}-prompt`,
      })),
      provider: createLocalMockProviderAdapter({
        costCents: 5,
        maxConcurrency: 3,
        generateSlot: async (slot) => {
          await delay(slot.slotId === "slot-c" ? 70 : 10);
          providerFinished.push(slot.slotId);
          return {
            status: "clean",
            actualCostCents: 5,
            outputHash: `${slot.slotId}-provider-output`,
            responseMetadata: {},
          };
        },
      }),
      budgetLedger: createCreativeBudgetLedger({
        runId: "mara-cutout-failure",
        approvedBudgetCents: 100,
      }),
      policy: {
        perRunMaxConcurrency: 3,
        perProviderMaxConcurrency: { "local-mock": 3 },
        localStageMaxConcurrency: 2,
        slotLeaseTimeoutMs: 5_000,
      },
      processLocalOutput: async ({ slot }) => {
        if (slot.slotId === "slot-a") {
          throw new Error("cutout mask failed");
        }

        await delay(20);
        return { status: "clean", outputHash: `${slot.slotId}-cutout-output` };
      },
    });

    expect(providerFinished.sort()).toEqual(["slot-a", "slot-b", "slot-c"]);
    expect(result.slotResults["slot-a"]?.stage).toBe("failed");
    expect(result.slotResults["slot-c"]?.stage).toBe("clean");
    expect(result.status).toBe("completed-with-failures");
  });

  it("blocks duplicate slot leases until timeout recovery proves the worker is stale", () => {
    const store = new InMemorySlotLeaseStore();
    const first = acquireCreativeSlotLease(store, {
      runId: "mara-leases",
      slotId: "slot-a",
      attemptId: "slot-a-attempt-1",
      stage: "provider",
      workerId: "worker-a",
      timeoutMs: 1_000,
      nowMs: 1_000,
    });

    expect(() => acquireCreativeSlotLease(store, {
      runId: "mara-leases",
      slotId: "slot-a",
      attemptId: "slot-a-attempt-1",
      stage: "provider",
      workerId: "worker-b",
      timeoutMs: 1_000,
      nowMs: 1_100,
    })).toThrow("already leased");

    const recovered = acquireCreativeSlotLease(store, {
      runId: "mara-leases",
      slotId: "slot-a",
      attemptId: "slot-a-attempt-1",
      stage: "provider",
      workerId: "worker-b",
      timeoutMs: 1_000,
      nowMs: 2_500,
      verifyStaleLease: (lease) => lease.leaseId === first.leaseId,
    });

    expect(recovered.workerId).toBe("worker-b");
  });

  it("persists slot leases to disk for crash-safe resume and stale recovery", () => {
    const leaseRoot = mkdtempSync(join(tmpdir(), "tower-cpe-leases-"));
    const firstStore = new FileCreativeSlotLeaseStore(leaseRoot);
    const first = acquireCreativeSlotLease(firstStore, {
      runId: "mara-file-lease",
      slotId: "slot-a",
      attemptId: "slot-a-attempt-1",
      stage: "provider",
      workerId: "worker-a",
      timeoutMs: 1_000,
      nowMs: 1_000,
    });

    const resumedStore = new FileCreativeSlotLeaseStore(leaseRoot);

    expect(() => acquireCreativeSlotLease(resumedStore, {
      runId: "mara-file-lease",
      slotId: "slot-a",
      attemptId: "slot-a-attempt-1",
      stage: "provider",
      workerId: "worker-b",
      timeoutMs: 1_000,
      nowMs: 1_200,
    })).toThrow("already leased");

    const heartbeat = heartbeatCreativeSlotLease(resumedStore, first, 1_400);
    const persisted = JSON.parse(readFileSync(join(leaseRoot, "mara-file-lease__slot-a__provider.lease.json"), "utf8")) as {
      heartbeatAtMs: number;
    };

    expect(heartbeat.heartbeatAtMs).toBe(1_400);
    expect(persisted.heartbeatAtMs).toBe(1_400);

    const recovered = acquireCreativeSlotLease(resumedStore, {
      runId: "mara-file-lease",
      slotId: "slot-a",
      attemptId: "slot-a-attempt-2",
      stage: "provider",
      workerId: "worker-b",
      timeoutMs: 1_000,
      nowMs: 2_600,
      verifyStaleLease: (lease) => lease.leaseId === first.leaseId,
    });

    expect(recovered.attemptId).toBe("slot-a-attempt-2");
    releaseCreativeSlotLease(resumedStore, recovered);
    expect(resumedStore.get({
      runId: "mara-file-lease",
      slotId: "slot-a",
      stage: "provider",
    })).toBeUndefined();
  });

  it("skips clean receipts, retries named warning slots, and blocks whole-pack warning retries", async () => {
    let ledger = createCreativeBudgetLedger({
      runId: "mara-resume",
      approvedBudgetCents: 100,
    });
    const cleanReservation = reserveCreativeBudget(ledger, {
      providerId: "local-mock",
      slotId: "slot-a",
      attemptId: "slot-a-attempt-1",
      estimateCents: 5,
      sourceHash: "slot-a-prompt",
    });
    ledger = recordCreativeBudgetSpend(cleanReservation.ledger, {
      reservationId: cleanReservation.reservation.reservationId,
      actualCostCents: 5,
      responseMetadata: {},
      status: "clean",
    }).ledger;
    const warningReservation = reserveCreativeBudget(ledger, {
      providerId: "local-mock",
      slotId: "slot-b",
      attemptId: "slot-b-attempt-1",
      estimateCents: 5,
      sourceHash: "slot-b-prompt",
    });
    ledger = recordCreativeBudgetSpend(warningReservation.ledger, {
      reservationId: warningReservation.reservation.reservationId,
      actualCostCents: 5,
      responseMetadata: {},
      status: "warning",
      failureClassification: { code: "source-size-warning", retryable: true, paid: true },
    }).ledger;

    const generated: string[] = [];
    const result = await runCreativeSlotScheduler({
      runId: "mara-resume",
      slots: ["slot-a", "slot-b", "slot-c"].map((slotId) => ({
        slotId,
        prompt: `Generate ${slotId}.`,
        providerId: "local-mock",
        sourceHash: `${slotId}-prompt`,
      })),
      provider: createLocalMockProviderAdapter({
        costCents: 5,
        generateSlot: async (slot) => {
          generated.push(slot.slotId);
          return {
            status: "clean",
            actualCostCents: 5,
            outputHash: `${slot.slotId}-provider-output`,
            responseMetadata: {},
          };
        },
      }),
      budgetLedger: ledger,
      retry: { namedSlotIds: ["slot-b"] },
      policy: {
        perRunMaxConcurrency: 2,
        perProviderMaxConcurrency: { "local-mock": 2 },
        localStageMaxConcurrency: 2,
        slotLeaseTimeoutMs: 5_000,
      },
    });

    expect(generated.sort()).toEqual(["slot-b", "slot-c"]);
    expect(result.slotResults["slot-a"]?.stage).toBe("skipped-clean-receipt");
    expect(result.slotResults["slot-b"]?.attemptId).toBe("slot-b-attempt-2");

    await expect(runCreativeSlotScheduler({
      runId: "mara-resume",
      slots: ["slot-a", "slot-b"].map((slotId) => ({
        slotId,
        prompt: `Generate ${slotId}.`,
        providerId: "local-mock",
        sourceHash: `${slotId}-prompt`,
      })),
      provider: createLocalMockProviderAdapter({ costCents: 5 }),
      budgetLedger: ledger,
      retry: { retryWarnings: true },
      policy: {
        perRunMaxConcurrency: 2,
        perProviderMaxConcurrency: { "local-mock": 2 },
        localStageMaxConcurrency: 1,
        slotLeaseTimeoutMs: 5_000,
      },
    })).rejects.toThrow("Whole-pack warning retries are banned");
  });
});
