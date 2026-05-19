import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  createCreativeProductionHealthReport,
  type CreativeContinuousImprovementReport,
  type CreativeImprovementFailureSignal,
  type CreativeProductionHealthReport,
  type CreativeProductionHealthSnapshot,
} from "../src/lib/creative-production/health";

interface RunStateFile {
  runId?: string;
  phase?: string;
  state?: string;
  updatedAt?: string;
}

interface ProgressFile {
  runId?: string;
  phase?: string;
  spendSoFarCents?: number;
  reservedSpendCents?: number;
  activeLocks?: string[];
  nextAutomaticStep?: string;
  updatedAt?: string;
}

interface CutoutReadinessFile {
  status?: string;
  selectedModel?: string | { modelName?: string } | null;
  slotChecks?: Array<{
    selectedModel?: string | { modelName?: string } | null;
  }>;
  blockers?: string[];
  reasons?: string[];
  warnings?: string[];
}

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);

  if (index === -1) return undefined;

  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function findFiles(root: string, fileName: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const paths: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry.name);

    if (entry.isDirectory()) {
      paths.push(...await findFiles(path, fileName));
    } else if (entry.name === fileName) {
      paths.push(path);
    }
  }

  return paths;
}

async function latestRunRoot(stateRoot: string): Promise<string | undefined> {
  const statePaths = await findFiles(stateRoot, "run-state.json");
  const candidates = await Promise.all(statePaths.map(async (path) => {
    const state = await readJson<RunStateFile>(path);
    const progress = await readJson<ProgressFile>(join(dirname(path), "progress.json"));

    return {
      path,
      updatedAt: progress?.updatedAt ?? state?.updatedAt ?? "",
    };
  }));

  return candidates.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).at(-1)?.path
    ? dirname(candidates.sort((left, right) => left.updatedAt.localeCompare(right.updatedAt)).at(-1)!.path)
    : undefined;
}

function selectedModelName(value: CutoutReadinessFile["selectedModel"]): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.modelName ?? null;
}

async function readImprovementSignals(stateRoot: string): Promise<CreativeImprovementFailureSignal[]> {
  const ledgerPath = join(stateRoot, "ledgers", "improvements.jsonl");
  const raw = await readFile(ledgerPath, "utf8").catch(() => "");

  const entries = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as {
      runId?: string;
      phase?: string;
      category?: string;
      severity?: "low" | "medium" | "high";
      finding?: string;
      action?: string;
      failureCode?: string;
      hardening?: { command?: string; test?: string; doc?: string };
    });
  const lastUpgradeIndex = entries.map((entry) => entry.category).lastIndexOf("engine-upgrade");

  return (lastUpgradeIndex === -1 ? entries : entries.slice(lastUpgradeIndex + 1))
    .map((entry) => ({
      failureCode: entry.failureCode ?? entry.category ?? "creative-improvement",
      severity: entry.severity ?? "low",
      runId: entry.runId ?? "unknown",
      phase: entry.phase ?? "continuous-improvement",
      finding: entry.finding ?? entry.action ?? "Continuous improvement entry.",
      hardening: {
        command: entry.hardening?.command ?? "npm run art:health",
        test: entry.hardening?.test ?? "npm test src/lib/creative-production/health/health-cli.test.ts",
        doc: entry.hardening?.doc ?? "docs/CREATIVE-PRODUCTION-ENGINE.md",
      },
    }));
}

function cutoutSelectedModel(readiness: CutoutReadinessFile | undefined): string | null {
  return selectedModelName(readiness?.selectedModel) ??
    readiness?.slotChecks
      ?.map((check) => selectedModelName(check.selectedModel))
      .find((value): value is string => Boolean(value)) ??
    null;
}

async function buildSnapshot(stateRoot: string): Promise<CreativeProductionHealthSnapshot> {
  const runRoot = await latestRunRoot(stateRoot);
  const state = runRoot ? await readJson<RunStateFile>(join(runRoot, "run-state.json")) : undefined;
  const progress = runRoot ? await readJson<ProgressFile>(join(runRoot, "progress.json")) : undefined;
  const cutout = runRoot
    ? await readJson<CutoutReadinessFile>(join(runRoot, "generation", "gemini-api-v3", "cutout-readiness.json"))
    : undefined;
  const activeLocks = Array.from(new Set([
    ...(progress?.activeLocks ?? []),
    ...(runRoot && existsSync(join(runRoot, "api-run.lock")) ? ["api-run.lock"] : []),
  ]));
  const cleanupDebtItems = await findFiles(stateRoot, "loose-downloads.json").then((files) => files.length);

  return {
    checkedAt: new Date().toISOString(),
    locks: activeLocks.map((lock) => ({
      id: lock,
      runId: progress?.runId ?? state?.runId,
      scope: lock,
      holder: "creative-production",
      acquiredAt: progress?.updatedAt ?? new Date().toISOString(),
      active: true,
    })),
    processes: [],
    lastRun: state?.runId ? {
      runId: state.runId,
      state: state.phase ?? state.state ?? "unknown",
      updatedAt: progress?.updatedAt ?? state.updatedAt ?? new Date().toISOString(),
      nextStep: progress?.nextAutomaticStep ?? "Run art:status for the next step.",
      resumableByFreshAgent: Boolean(progress && (runRoot ? existsSync(join(runRoot, "human-action.json")) : false)),
    } : null,
    spendHistory: {
      approvedCeilingCents: 1000,
      reservedCents: progress?.reservedSpendCents ?? 0,
      actualSpendCents: progress?.spendSoFarCents ?? 0,
      failedPaidSpendCents: 0,
      entries: state?.runId ? [
        {
          runId: state.runId,
          phase: state.phase ?? state.state ?? "unknown",
          amountCents: progress?.spendSoFarCents ?? 0,
          kind: "actual",
          recordedAt: progress?.updatedAt ?? state.updatedAt ?? new Date().toISOString(),
        },
      ] : [],
    },
    repeatedFailures: [],
    providers: [
      {
        provider: "gemini-api",
        status: activeLocks.length > 0 ? "degraded" : "healthy",
        configuredConcurrency: 5,
        effectiveConcurrency: activeLocks.length > 0 ? 1 : 5,
        downgradeReasons: activeLocks.length > 0 ? ["active-run-lock"] : [],
        blocksProduction: false,
      },
    ],
    cutout: {
      status: cutout?.status === "ready" ? "ready" : cutout?.status === "blocked" ? "blocked" : "not-required",
      required: Boolean(cutout),
      selectedModel: cutoutSelectedModel(cutout),
      blockers: cutout?.blockers ?? cutout?.reasons ?? [],
      warnings: cutout?.warnings ?? [],
    },
    cleanup: {
      status: cleanupDebtItems > 0 ? "debt" : "clean",
      looseDownloads: cleanupDebtItems,
      orphanPreviews: 0,
      staleBoards: 0,
      staleLocks: 0,
      recommendedAction: cleanupDebtItems > 0
        ? "Run cleanup before another provider call."
        : "No cleanup required before the next run.",
    },
    improvements: await readImprovementSignals(stateRoot),
  };
}

function renderReport(report: CreativeProductionHealthReport): string {
  const ci: CreativeContinuousImprovementReport = report.continuousImprovement;

  return [
    "Creative Production Engine Health",
    `Safe to run: ${report.safeToRunLabel}`,
    `Why: ${report.why.join(" ")}`,
    `Active locks: ${report.activeLocks.length}`,
    `Active processes: ${report.activeProcesses.length}`,
    `Last run: ${report.lastRun ? `${report.lastRun.runId} (${report.lastRun.state})` : "none"}`,
    `Next step: ${report.lastRun?.nextStep ?? "Start a run with npm run art:produce -- --request \"...\""}`,
    `Spend: $${(report.spendHistory.actualSpendCents / 100).toFixed(2)} spent, $${(report.spendHistory.reservedCents / 100).toFixed(2)} reserved, $${(report.spendHistory.remainingApprovedCents / 100).toFixed(2)} remaining`,
    `Repeated failures: ${report.repeatedFailureCodes.length ? report.repeatedFailureCodes.map((failure) => failure.failureCode).join(", ") : "none"}`,
    `Provider health: ${report.providerHealth.map((provider) => `${provider.provider} ${provider.status} concurrency ${provider.effectiveConcurrency}/${provider.configuredConcurrency}`).join("; ")}`,
    `Cutout: ${report.cutoutReadiness.status}${report.cutoutReadiness.selectedModel ? ` (${report.cutoutReadiness.selectedModel})` : ""}`,
    `Cleanup debt: ${report.cleanupDebt.totalDebtItems} items`,
    `Continuous improvement blocks production: ${ci.blocksProduction ? "yes" : "no"}`,
    ...(ci.blockers.length
      ? ci.blockers.map((blocker) =>
        `- ${blocker.failureCode}: command ${blocker.commandHardening}; test ${blocker.testHardening}; doc ${blocker.docHardening}`)
      : []),
    `Next recommended engine improvement: ${report.nextRecommendedEngineImprovement}`,
    `Fresh-agent resumable: ${report.freshAgentResumable ? "yes" : "no"}`,
  ].join("\n");
}

async function main(): Promise<void> {
  const stateRoot = flagValue(process.argv.slice(2), "--state-root") ?? ".artlab/studio";
  const report = createCreativeProductionHealthReport(await buildSnapshot(stateRoot));

  console.log(renderReport(report));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
