import type { CreativeGenerationAdapterId } from "../generation-adapters";
import type { CreativePhaseId } from "../types";

export type CreativeHealthSeverity = "low" | "medium" | "high";
export type CreativeProviderHealthStatus = "healthy" | "degraded" | "blocked";
export type CreativeCutoutReadinessStatus = "ready" | "warning" | "blocked" | "not-required";
export type CreativeCleanupDebtStatus = "clean" | "debt" | "blocked";
export type CreativeHealthProviderId = CreativeGenerationAdapterId | (string & {});

export interface CreativeProductionLockSnapshot {
  id: string;
  runId?: string;
  scope: string;
  holder: string;
  acquiredAt: string;
  lastHeartbeatAt?: string;
  expiresAt?: string;
  active: boolean;
}

export interface CreativeProductionProcessSnapshot {
  pid: number;
  command: string;
  runId?: string;
  startedAt: string;
  active: boolean;
}

export interface CreativeProductionLastRunSnapshot {
  runId: string;
  state: string;
  updatedAt: string;
  nextStep: string;
  resumableByFreshAgent: boolean;
}

export interface CreativeSpendHistoryEntry {
  runId: string;
  phase: string;
  amountCents: number;
  kind: "estimated" | "reserved" | "actual" | "released" | "failed-paid";
  recordedAt: string;
}

export interface CreativeSpendHistorySnapshot {
  approvedCeilingCents: number;
  reservedCents: number;
  actualSpendCents: number;
  failedPaidSpendCents: number;
  entries: CreativeSpendHistoryEntry[];
}

export interface CreativeSpendHistoryReport extends CreativeSpendHistorySnapshot {
  projectedCommittedCents: number; remainingApprovedCents: number; overApprovedCeiling: boolean;
}

export interface CreativeRepeatedFailureSnapshot {
  failureCode: string;
  occurrences: number;
  severity: CreativeHealthSeverity;
  lastSeenAt?: string;
  blocksProduction?: boolean;
  recommendedAction?: string;
}

export interface CreativeRepeatedFailureCodeReport extends CreativeRepeatedFailureSnapshot { repeated: boolean; }

export interface CreativeProviderHealthSnapshot {
  provider: CreativeHealthProviderId;
  status: CreativeProviderHealthStatus;
  configuredConcurrency: number;
  effectiveConcurrency: number;
  downgradeReasons: string[];
  blocksProduction: boolean;
}

export interface CreativeProviderHealthReport extends CreativeProviderHealthSnapshot { downgraded: boolean; }

export interface CreativeCutoutReadinessSnapshot {
  status: CreativeCutoutReadinessStatus;
  required: boolean;
  selectedModel: string | null;
  blockers: string[];
  warnings: string[];
}

export interface CreativeCutoutReadinessReport extends CreativeCutoutReadinessSnapshot { readyForProduction: boolean; }

export interface CreativeCleanupDebtSnapshot {
  status: CreativeCleanupDebtStatus;
  looseDownloads: number;
  orphanPreviews: number;
  staleBoards: number;
  staleLocks: number;
  recommendedAction: string;
}

export interface CreativeCleanupDebtReport extends CreativeCleanupDebtSnapshot { totalDebtItems: number; blocksProduction: boolean; }

export interface CreativeImprovementHardening {
  command: string; test: string; doc: string;
}

export interface CreativeImprovementFailureSignal {
  failureCode: string;
  severity: CreativeHealthSeverity;
  runId: string;
  phase: CreativePhaseId | string;
  finding: string;
  hardening: CreativeImprovementHardening;
}

export interface CreativeContinuousImprovementBlocker {
  failureCode: string;
  severity: "medium" | "high";
  occurrences: number;
  reason: string;
  commandHardening: string;
  testHardening: string;
  docHardening: string;
}

export interface CreativeContinuousImprovementReport {
  blocksProduction: boolean;
  blockers: CreativeContinuousImprovementBlocker[];
  signalsObserved: number;
  repeatedMediumFailureCodes: string[];
  highSeverityFailureCodes: string[];
}

export interface CreativeProductionHealthSnapshot {
  checkedAt: string;
  locks: CreativeProductionLockSnapshot[];
  processes: CreativeProductionProcessSnapshot[];
  lastRun?: CreativeProductionLastRunSnapshot | null;
  spendHistory: CreativeSpendHistorySnapshot;
  repeatedFailures: CreativeRepeatedFailureSnapshot[];
  providers: CreativeProviderHealthSnapshot[];
  cutout: CreativeCutoutReadinessSnapshot;
  cleanup: CreativeCleanupDebtSnapshot;
  improvements: CreativeImprovementFailureSignal[];
}

export interface CreativeProductionHealthReport {
  schemaVersion: "tower-creative-production-health-v1";
  checkedAt: string;
  safeToRun: boolean;
  safeToRunLabel: "yes" | "no";
  why: string[];
  activeLocks: CreativeProductionLockSnapshot[];
  activeProcesses: CreativeProductionProcessSnapshot[];
  lastRun: CreativeProductionLastRunSnapshot | null;
  spendHistory: CreativeSpendHistoryReport;
  repeatedFailureCodes: CreativeRepeatedFailureCodeReport[];
  providerHealth: CreativeProviderHealthReport[];
  cutoutReadiness: CreativeCutoutReadinessReport;
  cleanupDebt: CreativeCleanupDebtReport;
  continuousImprovement: CreativeContinuousImprovementReport;
  nextRecommendedEngineImprovement: string;
  freshAgentResumable: boolean;
}

function severityRank(severity: CreativeHealthSeverity): number {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function requireHardeningText(value: string, label: "command" | "test" | "doc", failureCode: string): string {
  const trimmed = value.trim();

  if (trimmed.length > 0) return trimmed;

  return `Add exact ${label} hardening for ${failureCode}.`;
}

function groupImprovementSignals(
  signals: CreativeImprovementFailureSignal[],
): Map<string, CreativeImprovementFailureSignal[]> {
  return signals.reduce((groups, signal) => {
    const existing = groups.get(signal.failureCode);

    if (existing) existing.push(signal);
    else groups.set(signal.failureCode, [signal]);

    return groups;
  }, new Map<string, CreativeImprovementFailureSignal[]>());
}

export function evaluateContinuousImprovementBlocks(
  signals: CreativeImprovementFailureSignal[],
): CreativeContinuousImprovementReport {
  const grouped = groupImprovementSignals(signals);
  const blockers: CreativeContinuousImprovementBlocker[] = [];
  const repeatedMediumFailureCodes: string[] = [];
  const highSeverityFailureCodes: string[] = [];

  for (const [failureCode, entries] of grouped.entries()) {
    const highEntries = entries.filter((entry) => entry.severity === "high");
    const mediumEntries = entries.filter((entry) => entry.severity === "medium");

    if (highEntries.length > 0) {
      const representative = highEntries[highEntries.length - 1] ?? entries[entries.length - 1];

      highSeverityFailureCodes.push(failureCode);
      blockers.push({
        failureCode,
        severity: "high",
        occurrences: highEntries.length,
        reason: `High-severity failure code ${failureCode} occurred.`,
        commandHardening: requireHardeningText(representative.hardening.command, "command", failureCode),
        testHardening: requireHardeningText(representative.hardening.test, "test", failureCode),
        docHardening: requireHardeningText(representative.hardening.doc, "doc", failureCode),
      });
      continue;
    }

    if (mediumEntries.length >= 2) {
      const representative = mediumEntries[mediumEntries.length - 1] ?? entries[entries.length - 1];

      repeatedMediumFailureCodes.push(failureCode);
      blockers.push({
        failureCode,
        severity: "medium",
        occurrences: mediumEntries.length,
        reason: `Repeated medium-severity failure code ${failureCode} occurred ${mediumEntries.length} times.`,
        commandHardening: requireHardeningText(representative.hardening.command, "command", failureCode),
        testHardening: requireHardeningText(representative.hardening.test, "test", failureCode),
        docHardening: requireHardeningText(representative.hardening.doc, "doc", failureCode),
      });
    }
  }

  blockers.sort((left, right) =>
    severityRank(right.severity) - severityRank(left.severity) || left.failureCode.localeCompare(right.failureCode));

  return {
    blocksProduction: blockers.length > 0,
    blockers,
    signalsObserved: signals.length,
    repeatedMediumFailureCodes: repeatedMediumFailureCodes.sort(),
    highSeverityFailureCodes: highSeverityFailureCodes.sort(),
  };
}

function summarizeSpend(history: CreativeSpendHistorySnapshot): CreativeSpendHistoryReport {
  return {
    ...history,
    projectedCommittedCents: history.actualSpendCents + history.reservedCents,
    remainingApprovedCents: history.approvedCeilingCents - history.actualSpendCents - history.reservedCents,
    overApprovedCeiling: history.actualSpendCents + history.reservedCents > history.approvedCeilingCents,
  };
}

function summarizeRepeatedFailures(
  failures: CreativeRepeatedFailureSnapshot[],
  improvements: CreativeImprovementFailureSignal[],
): CreativeRepeatedFailureCodeReport[] {
  const improvementCounts = new Map<string, CreativeRepeatedFailureCodeReport>();

  for (const signal of improvements) {
    const existing = improvementCounts.get(signal.failureCode);

    if (!existing) {
      improvementCounts.set(signal.failureCode, {
        failureCode: signal.failureCode,
        occurrences: 1,
        severity: signal.severity,
        repeated: false,
      });
      continue;
    }

    improvementCounts.set(signal.failureCode, {
      ...existing,
      occurrences: existing.occurrences + 1,
      severity: severityRank(signal.severity) > severityRank(existing.severity)
        ? signal.severity
        : existing.severity,
      repeated: existing.occurrences + 1 >= 2,
    });
  }

  const merged = new Map<string, CreativeRepeatedFailureCodeReport>();

  for (const failure of failures) {
    merged.set(failure.failureCode, {
      ...failure,
      repeated: failure.occurrences >= 2,
    });
  }

  for (const [failureCode, failure] of improvementCounts.entries()) {
    if (!failure.repeated) continue;

    const existing = merged.get(failureCode);

    merged.set(failureCode, existing
      ? {
          ...existing,
          occurrences: Math.max(existing.occurrences, failure.occurrences),
          severity: severityRank(failure.severity) > severityRank(existing.severity)
            ? failure.severity
            : existing.severity,
          repeated: true,
        }
      : failure);
  }

  return [...merged.values()]
    .filter((failure) => failure.repeated || failure.blocksProduction)
    .sort((left, right) =>
      severityRank(right.severity) - severityRank(left.severity) ||
      right.occurrences - left.occurrences ||
      left.failureCode.localeCompare(right.failureCode)
    );
}

function summarizeProviders(providers: CreativeProviderHealthSnapshot[]): CreativeProviderHealthReport[] {
  return providers.map((provider) => ({
    ...provider,
    downgraded:
      provider.status === "degraded" ||
      provider.effectiveConcurrency < provider.configuredConcurrency ||
      provider.downgradeReasons.length > 0,
  }));
}

function summarizeCutout(cutout: CreativeCutoutReadinessSnapshot): CreativeCutoutReadinessReport {
  return {
    ...cutout,
    readyForProduction:
      !cutout.required ||
      cutout.status === "ready" && cutout.blockers.length === 0 && cutout.selectedModel !== null,
  };
}

function summarizeCleanup(cleanup: CreativeCleanupDebtSnapshot): CreativeCleanupDebtReport {
  const totalDebtItems = cleanup.looseDownloads + cleanup.orphanPreviews + cleanup.staleBoards + cleanup.staleLocks;

  return {
    ...cleanup,
    totalDebtItems,
    blocksProduction: cleanup.status !== "clean" || totalDebtItems > 0,
  };
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "no recorded reason";
}

function chooseNextRecommendedEngineImprovement(input: {
  continuousImprovement: CreativeContinuousImprovementReport;
  cleanup: CreativeCleanupDebtReport;
  cutout: CreativeCutoutReadinessReport;
  providers: CreativeProviderHealthReport[];
  repeatedFailures: CreativeRepeatedFailureCodeReport[];
}): string {
  const ciBlocker = input.continuousImprovement.blockers[0];

  if (ciBlocker) {
    return `Harden ${ciBlocker.failureCode}: command ${ciBlocker.commandHardening}; test ${ciBlocker.testHardening}; doc ${ciBlocker.docHardening}.`;
  }

  if (input.cutout.status === "blocked") {
    return `Restore cutout readiness before production: ${formatList(input.cutout.blockers)}.`;
  }

  if (input.cleanup.blocksProduction) {
    return input.cleanup.recommendedAction;
  }

  const blockedProvider = input.providers.find((provider) => provider.blocksProduction);

  if (blockedProvider) {
    return `Resolve ${blockedProvider.provider} before production: ${formatList(blockedProvider.downgradeReasons)}.`;
  }

  const degradedProvider = input.providers.find((provider) => provider.downgraded);

  if (degradedProvider) {
    return `Keep ${degradedProvider.provider} at concurrency ${degradedProvider.effectiveConcurrency} until ${formatList(degradedProvider.downgradeReasons)} clears.`;
  }

  const repeatedFailure = input.repeatedFailures[0];

  if (repeatedFailure?.recommendedAction) {
    return repeatedFailure.recommendedAction;
  }

  return "No engine hardening is required before the next production step.";
}

export function createCreativeProductionHealthReport(
  snapshot: CreativeProductionHealthSnapshot,
): CreativeProductionHealthReport {
  const activeLocks = snapshot.locks.filter((lock) => lock.active);
  const activeProcesses = snapshot.processes.filter((process) => process.active);
  const spendHistory = summarizeSpend(snapshot.spendHistory);
  const providerHealth = summarizeProviders(snapshot.providers);
  const cutoutReadiness = summarizeCutout(snapshot.cutout);
  const cleanupDebt = summarizeCleanup(snapshot.cleanup);
  const continuousImprovement = evaluateContinuousImprovementBlocks(snapshot.improvements);
  const repeatedFailureCodes = summarizeRepeatedFailures(snapshot.repeatedFailures, snapshot.improvements);
  const freshAgentResumable = snapshot.lastRun?.resumableByFreshAgent ?? true;
  const why: string[] = [];

  if (activeLocks.length > 0) {
    why.push("Active creative-production locks are present; wait, resume, or verify stale ownership before starting production.");
  }

  if (activeProcesses.length > 0) {
    why.push("Active creative-production processes are running; wait for them to finish or resume the existing run.");
  }

  if (spendHistory.overApprovedCeiling) {
    why.push(`Projected committed spend $${(spendHistory.projectedCommittedCents / 100).toFixed(2)} exceeds the approved ceiling $${(spendHistory.approvedCeilingCents / 100).toFixed(2)}.`);
  }

  for (const provider of providerHealth) {
    if (provider.blocksProduction) {
      why.push(`${provider.provider} blocks production: ${formatList(provider.downgradeReasons)}.`);
      continue;
    }

    if (provider.downgraded) {
      why.push(
        `${provider.provider} is degraded; continue only at concurrency ${provider.effectiveConcurrency} until ${formatList(provider.downgradeReasons)} clears.`,
      );
    }
  }

  if (!cutoutReadiness.readyForProduction) {
    why.push(`Cutout is blocked: ${formatList(cutoutReadiness.blockers)}.`);
  }

  if (cleanupDebt.blocksProduction) {
    why.push(`Cleanup debt must be handled: ${cleanupDebt.recommendedAction}`);
  }

  for (const failure of repeatedFailureCodes.filter((entry) => entry.blocksProduction)) {
    why.push(
      `Repeated failure ${failure.failureCode} blocks production: ${failure.recommendedAction ?? "add command, test, and doc hardening."}`,
    );
  }

  for (const blocker of continuousImprovement.blockers) {
    why.push(
      `Continuous improvement blocks production for ${blocker.failureCode}; harden command ${blocker.commandHardening}, test ${blocker.testHardening}, doc ${blocker.docHardening}.`,
    );
  }

  if (!freshAgentResumable) {
    why.push("Current run state is not resumable by a fresh agent; repair run-state, progress, receipts, or human-action files first.");
  }

  const blockingProvider = providerHealth.some((provider) => provider.blocksProduction);
  const blockingFailures = repeatedFailureCodes.some((failure) => failure.blocksProduction);
  const safeToRun =
    activeLocks.length === 0 &&
    activeProcesses.length === 0 &&
    !spendHistory.overApprovedCeiling &&
    !blockingProvider &&
    cutoutReadiness.readyForProduction &&
    !cleanupDebt.blocksProduction &&
    !blockingFailures &&
    !continuousImprovement.blocksProduction &&
    freshAgentResumable;
  const healthReasons = why.length > 0 ? why : ["Engine health is clear for the next production step."];

  return {
    schemaVersion: "tower-creative-production-health-v1",
    checkedAt: snapshot.checkedAt,
    safeToRun,
    safeToRunLabel: safeToRun ? "yes" : "no",
    why: healthReasons,
    activeLocks,
    activeProcesses,
    lastRun: snapshot.lastRun ?? null,
    spendHistory,
    repeatedFailureCodes,
    providerHealth,
    cutoutReadiness,
    cleanupDebt,
    continuousImprovement,
    nextRecommendedEngineImprovement: chooseNextRecommendedEngineImprovement({
      continuousImprovement,
      cleanup: cleanupDebt,
      cutout: cutoutReadiness,
      providers: providerHealth,
      repeatedFailures: repeatedFailureCodes,
    }),
    freshAgentResumable,
  };
}
