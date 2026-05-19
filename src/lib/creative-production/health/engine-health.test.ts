import { describe, expect, it } from "vitest";
import {
  createCreativeProductionHealthReport,
  evaluateContinuousImprovementBlocks,
  type CreativeProductionHealthSnapshot,
} from ".";

const baseSnapshot: CreativeProductionHealthSnapshot = {
  checkedAt: "2026-05-19T12:00:00.000Z",
  locks: [],
  processes: [],
  lastRun: {
    runId: "otis-v1",
    state: "canary-passed",
    updatedAt: "2026-05-19T11:58:00.000Z",
    nextStep: "Run the full production pack from the approved canary only.",
    resumableByFreshAgent: true,
  },
  spendHistory: {
    approvedCeilingCents: 600,
    reservedCents: 0,
    actualSpendCents: 151,
    failedPaidSpendCents: 0,
    entries: [
      {
        runId: "otis-v1",
        phase: "canary",
        amountCents: 151,
        kind: "actual",
        recordedAt: "2026-05-19T11:57:00.000Z",
      },
    ],
  },
  repeatedFailures: [],
  providers: [
    {
      provider: "gemini-api",
      status: "healthy",
      configuredConcurrency: 5,
      effectiveConcurrency: 5,
      downgradeReasons: [],
      blocksProduction: false,
    },
  ],
  cutout: {
    status: "ready",
    required: true,
    selectedModel: "rembg-birefnet-general",
    blockers: [],
    warnings: [],
  },
  cleanup: {
    status: "clean",
    looseDownloads: 0,
    orphanPreviews: 0,
    staleBoards: 0,
    staleLocks: 0,
    recommendedAction: "No cleanup required before the next run.",
  },
  improvements: [],
};

describe("creative production engine health", () => {
  it("marks a clean engine safe to run and includes the operational health surface", () => {
    const report = createCreativeProductionHealthReport(baseSnapshot);

    expect(report.safeToRun).toBe(true);
    expect(report.safeToRunLabel).toBe("yes");
    expect(report.why).toEqual(["Engine health is clear for the next production step."]);
    expect(report.activeLocks).toEqual([]);
    expect(report.activeProcesses).toEqual([]);
    expect(report.lastRun?.nextStep).toContain("full production pack");
    expect(report.spendHistory.actualSpendCents).toBe(151);
    expect(report.repeatedFailureCodes).toEqual([]);
    expect(report.providerHealth[0]).toMatchObject({
      provider: "gemini-api",
      status: "healthy",
      effectiveConcurrency: 5,
    });
    expect(report.cutoutReadiness.status).toBe("ready");
    expect(report.cleanupDebt.status).toBe("clean");
    expect(report.continuousImprovement.blocksProduction).toBe(false);
    expect(report.nextRecommendedEngineImprovement).toBe("No engine hardening is required before the next production step.");
    expect(report.freshAgentResumable).toBe(true);
  });

  it("treats active locks and provider outages as unsafe to run without losing the next-step context", () => {
    const report = createCreativeProductionHealthReport({
      ...baseSnapshot,
      locks: [
        {
          id: "slot-lock-1",
          runId: "otis-v1",
          scope: "slot:idle",
          holder: "worker-7",
          acquiredAt: "2026-05-19T11:59:00.000Z",
          lastHeartbeatAt: "2026-05-19T11:59:30.000Z",
          active: true,
        },
      ],
      processes: [
        {
          pid: 4488,
          command: "npm run art:generate -- run-gemini-api",
          runId: "otis-v1",
          startedAt: "2026-05-19T11:59:02.000Z",
          active: true,
        },
      ],
      providers: [
        {
          provider: "gemini-api",
          status: "blocked",
          configuredConcurrency: 5,
          effectiveConcurrency: 0,
          downgradeReasons: ["provider-high-demand"],
          blocksProduction: true,
        },
      ],
    });

    expect(report.safeToRun).toBe(false);
    expect(report.safeToRunLabel).toBe("no");
    expect(report.activeLocks).toHaveLength(1);
    expect(report.activeProcesses).toHaveLength(1);
    expect(report.why).toContain("Active creative-production locks are present; wait, resume, or verify stale ownership before starting production.");
    expect(report.why).toContain("gemini-api blocks production: provider-high-demand.");
    expect(report.lastRun?.nextStep).toContain("full production pack");
    expect(report.providerHealth[0]?.downgraded).toBe(true);
  });

  it("blocks production for repeated medium failure codes with exact command, test, and doc hardening", () => {
    const blocks = evaluateContinuousImprovementBlocks([
      {
        failureCode: "cutout-edge-halo",
        severity: "medium",
        runId: "otis-v1",
        phase: "qa",
        finding: "Hair halo required manual cleanup.",
        hardening: {
          command: "npm run art:generate -- repair-cutout --slot <slot-id>",
          test: "npm test src/lib/creative-production/health/engine-health.test.ts",
          doc: "docs/CHARACTER-IMAGE-OPERATIONS.md#cutout-repair",
        },
      },
      {
        failureCode: "cutout-edge-halo",
        severity: "medium",
        runId: "otis-v2",
        phase: "qa",
        finding: "Hair halo repeated after local repair.",
        hardening: {
          command: "npm run art:generate -- repair-cutout --slot <slot-id>",
          test: "npm test src/lib/creative-production/health/engine-health.test.ts",
          doc: "docs/CHARACTER-IMAGE-OPERATIONS.md#cutout-repair",
        },
      },
    ]);

    expect(blocks.blocksProduction).toBe(true);
    expect(blocks.blockers).toEqual([
      {
        failureCode: "cutout-edge-halo",
        severity: "medium",
        occurrences: 2,
        reason: "Repeated medium-severity failure code cutout-edge-halo occurred 2 times.",
        commandHardening: "npm run art:generate -- repair-cutout --slot <slot-id>",
        testHardening: "npm test src/lib/creative-production/health/engine-health.test.ts",
        docHardening: "docs/CHARACTER-IMAGE-OPERATIONS.md#cutout-repair",
      },
    ]);
  });

  it("blocks production for one high-severity failure and surfaces it in the full report", () => {
    const report = createCreativeProductionHealthReport({
      ...baseSnapshot,
      improvements: [
        {
          failureCode: "receipt-conflict",
          severity: "high",
          runId: "otis-v1",
          phase: "generation",
          finding: "Two paid receipts claim the same slot without named retry authorization.",
          hardening: {
            command: "npm run art:health",
            test: "npm test src/lib/creative-production/health/engine-health.test.ts",
            doc: "docs/CREATIVE-PRODUCTION-ENGINE.md#budget-and-receipts",
          },
        },
      ],
    });

    expect(report.safeToRun).toBe(false);
    expect(report.continuousImprovement.blocksProduction).toBe(true);
    expect(report.continuousImprovement.blockers[0]).toMatchObject({
      failureCode: "receipt-conflict",
      severity: "high",
      occurrences: 1,
      commandHardening: "npm run art:health",
      testHardening: "npm test src/lib/creative-production/health/engine-health.test.ts",
      docHardening: "docs/CREATIVE-PRODUCTION-ENGINE.md#budget-and-receipts",
    });
    expect(report.nextRecommendedEngineImprovement).toContain("receipt-conflict");
    expect(report.why).toContain("Continuous improvement blocks production for receipt-conflict; harden command npm run art:health, test npm test src/lib/creative-production/health/engine-health.test.ts, doc docs/CREATIVE-PRODUCTION-ENGINE.md#budget-and-receipts.");
  });

  it("keeps provider concurrency downgrades visible without blocking when the provider remains usable", () => {
    const report = createCreativeProductionHealthReport({
      ...baseSnapshot,
      providers: [
        {
          provider: "gemini-api",
          status: "degraded",
          configuredConcurrency: 5,
          effectiveConcurrency: 2,
          downgradeReasons: ["429-burst", "timeout-burst"],
          blocksProduction: false,
        },
      ],
    });

    expect(report.safeToRun).toBe(true);
    expect(report.providerHealth[0]).toMatchObject({
      provider: "gemini-api",
      configuredConcurrency: 5,
      effectiveConcurrency: 2,
      downgraded: true,
      downgradeReasons: ["429-burst", "timeout-burst"],
    });
    expect(report.why).toContain("gemini-api is degraded; continue only at concurrency 2 until 429-burst, timeout-burst clears.");
  });

  it("fails closed when cutout or cleanup readiness is not production-safe", () => {
    const report = createCreativeProductionHealthReport({
      ...baseSnapshot,
      cutout: {
        status: "blocked",
        required: true,
        selectedModel: null,
        blockers: ["cutout-model-missing"],
        warnings: [],
      },
      cleanup: {
        status: "debt",
        looseDownloads: 4,
        orphanPreviews: 2,
        staleBoards: 1,
        staleLocks: 1,
        recommendedAction: "Run cleanup and archive stale boards before another provider call.",
      },
    });

    expect(report.safeToRun).toBe(false);
    expect(report.why).toContain("Cutout is blocked: cutout-model-missing.");
    expect(report.why).toContain("Cleanup debt must be handled: Run cleanup and archive stale boards before another provider call.");
    expect(report.cleanupDebt.totalDebtItems).toBe(8);
  });
});
