import { describe, expect, it } from "vitest";
import {
  createCreativeBudgetLedger,
  recordCreativeBudgetSpend,
  releaseCreativeBudgetReservation,
  reserveCreativeBudget,
} from "./ledger";

describe("creative production budget ledger", () => {
  it("keeps estimated, reserved, spent, released, and refunded totals separate", () => {
    const ledger = createCreativeBudgetLedger({
      runId: "mara-production",
      approvedBudgetCents: 100,
      createdAt: "2026-05-19T12:00:00.000Z",
    });
    const reserved = reserveCreativeBudget(ledger, {
      providerId: "gemini-api",
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-1",
      estimateCents: 30,
      sourceHash: "prompt-hash-a",
      now: "2026-05-19T12:00:01.000Z",
    });
    const spent = recordCreativeBudgetSpend(reserved.ledger, {
      reservationId: reserved.reservation.reservationId,
      actualCostCents: 24,
      outputHash: "source-hash-a",
      responseMetadata: { model: "gemini-3.1-flash-image-preview" },
      status: "clean",
      now: "2026-05-19T12:00:04.000Z",
    });
    const second = reserveCreativeBudget(spent.ledger, {
      providerId: "gemini-api",
      slotId: "pose-wave",
      attemptId: "pose-wave-attempt-1",
      estimateCents: 20,
      sourceHash: "prompt-hash-b",
      now: "2026-05-19T12:00:05.000Z",
    });
    const released = releaseCreativeBudgetReservation(second.ledger, {
      reservationId: second.reservation.reservationId,
      reason: "provider-failed-before-paid-call",
      now: "2026-05-19T12:00:06.000Z",
    });

    expect(released.totals).toEqual({
      estimatedCents: 50,
      reservedCents: 0,
      spentCents: 24,
      releasedCents: 20,
      refundedCents: 0,
      remainingCents: 76,
    });
    expect(spent.receipt).toMatchObject({
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-1",
      costEstimateCents: 30,
      actualCostCents: 24,
      sourceHash: "prompt-hash-a",
      outputHash: "source-hash-a",
      failureClassification: undefined,
      responseMetadata: { model: "gemini-3.1-flash-image-preview" },
    });
  });

  it("fails closed for missing ledgers, budget overrun, and duplicate paid attempts without named retry", () => {
    expect(() => reserveCreativeBudget(undefined, {
      providerId: "gemini-api",
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-1",
      estimateCents: 10,
      sourceHash: "prompt-hash-a",
    })).toThrow("Budget ledger is required");

    const ledger = createCreativeBudgetLedger({
      runId: "mara-budget-edge",
      approvedBudgetCents: 25,
    });

    expect(() => reserveCreativeBudget(ledger, {
      providerId: "gemini-api",
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-1",
      estimateCents: 26,
      sourceHash: "prompt-hash-a",
    })).toThrow("approved budget");

    const firstReservation = reserveCreativeBudget(ledger, {
      providerId: "gemini-api",
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-1",
      estimateCents: 10,
      sourceHash: "prompt-hash-a",
    });
    const firstSpend = recordCreativeBudgetSpend(firstReservation.ledger, {
      reservationId: firstReservation.reservation.reservationId,
      actualCostCents: 10,
      responseMetadata: {},
      status: "warning",
      failureClassification: { code: "source-size-warning", retryable: true, paid: true },
    });

    expect(() => reserveCreativeBudget(firstSpend.ledger, {
      providerId: "gemini-api",
      slotId: "pose-idle",
      attemptId: "pose-idle-attempt-2",
      estimateCents: 10,
      sourceHash: "prompt-hash-a",
    })).toThrow("named-slot retry");
  });
});
