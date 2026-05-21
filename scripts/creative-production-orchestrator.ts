#!/usr/bin/env node
// =============================================================================
// DEPRECATED — replaced by ArtLab on 2026-05-20.
// This script exits non-zero so accidental invocations are caught immediately.
// Migrate to:
//   npm run artlab -- produce "<request>"
//   npm run artlab -- status
//   npm run artlab -- health
//   npm run artlab:daemon -- start
// Docs: docs/artlab/ENGINE.md  (written in Phase 8)
// =============================================================================
process.stderr.write([
  "",
  "*** DEPRECATED: creative-production-orchestrator.ts is no longer supported. ***",
  "ArtLab replaced this script on 2026-05-20.",
  "",
  "Migrate to:",
  "  npm run artlab -- produce \"<request>\"",
  "  npm run artlab -- status",
  "  npm run artlab -- health",
  "  npm run artlab:daemon -- start",
  "",
  "See docs/artlab/ENGINE.md for the full mapping.",
  "",
].join("\n") + "\n");
process.exit(1);

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  applyCreativeHumanResponse,
  buildFinalBoardForCreativeRun,
  closeCreativeRunAfterGates,
  continueApprovedProductionForCreativeRun,
  generateInitialConceptsForCreativeRun,
  importLegacyOtisRun,
  markCreativeRunBrowserVerified,
  markCreativeRunUpgradeRequired,
  promoteApprovedCreativeRunForApp,
  renderCreativeStatusSummary,
  startCreativeProductionRun,
} from "../src/lib/creative-production/operator/v1-final";

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);

  if (index === -1) return undefined;

  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

function answerValue(argv: string[]): { runId: string; response: string } | undefined {
  const index = argv.indexOf("--answer");

  if (index === -1) return undefined;

  const runId = argv[index + 1];

  if (!runId || runId.startsWith("--")) {
    throw new Error("--answer requires a run id.");
  }

  const responseParts = argv.slice(index + 2);
  const nextFlagIndex = responseParts.findIndex((part) => part.startsWith("--"));
  const answerParts = nextFlagIndex === -1
    ? responseParts
    : responseParts.slice(0, nextFlagIndex);

  if (answerParts.length === 0 || answerParts[0]?.startsWith("--")) {
    throw new Error("--answer requires a plain-English response.");
  }

  return {
    runId,
    response: answerParts.join(" "),
  };
}

function printHumanStop(input: Awaited<ReturnType<typeof startCreativeProductionRun>>): void {
  const humanActionPath = join(input.runRoot, "human-action.json");
  const progressPath = join(input.runRoot, "progress.json");
  const dryRun = input.state.executionMode === "dry-run";

  console.log("Creative Production Engine orchestrator");
  console.log("Two human gates: initial design direction, final app promotion.");
  console.log(`Run root: ${input.runRoot}`);
  console.log(`Current phase: ${input.state.phase}`);
  if (!input.humanAction) {
    console.log("");
    console.log("No human action is required before initial concept images exist.");
    console.log(`Next automatic step: ${input.progress.nextAutomaticStep}`);
    console.log(`Wrote: ${progressPath}`);
    console.log("Public art and production manifests remain locked until exact phrase: approved for app");
    return;
  }
  if (dryRun) {
    console.log("Dry run: yes");
    console.log(`Provider mode: ${input.state.providerMode ?? "local-mock"}`);
    console.log(`Projected production cost: $${(input.humanAction.costImpact.estimatedCents / 100).toFixed(2)}; reserved now: $0.00`);
  }
  console.log("");
  console.log(`What I understood: ${input.humanAction.whatIUnderstood}`);
  console.log(`Recommendation: ${input.humanAction.recommendation}`);
  console.log(`Cost impact: estimated $${(input.humanAction.costImpact.estimatedCents / 100).toFixed(2)}, reserved $${(input.humanAction.costImpact.reservedCents / 100).toFixed(2)}`);
  console.log(`Risk: ${input.humanAction.risk}`);
  console.log(`Allowed responses: ${input.humanAction.allowedResponses.join("; ")}`);
  console.log(`Recommended response: ${input.humanAction.recommendedResponse}`);
  console.log("");
  console.log(`Wrote: ${humanActionPath}`);
  console.log(`Wrote: ${progressPath}`);
  console.log("Public art and production manifests remain locked until exact phrase: approved for app");
}

async function maybeImportLegacyRun(input: {
  stateRoot: string;
  runId: string;
}): Promise<void> {
  const otisRunRoot = join(input.stateRoot, "characters", input.runId);
  const statePath = join(otisRunRoot, "run-state.json");
  const progressPath = join(otisRunRoot, "progress.json");

  if (!existsSync(statePath)) return;
  if (existsSync(progressPath)) {
    const state = JSON.parse(await readFile(statePath, "utf8")) as {
      importedFrom?: unknown;
      request?: string;
      name?: string;
      phase?: string;
    };
    const importSettledPhases = new Set([
      "final-board-ready",
      "app-preview-ready",
      "approved-for-app",
      "promoted",
      "browser-verified",
      "closed",
    ]);
    const isImportedOtis = input.runId.includes("otis") &&
      (state.importedFrom || state.request === "Imported current Otis production canary state.");

    if (isImportedOtis && !importSettledPhases.has(state.phase ?? "")) {
      await importLegacyOtisRun({ runRoot: otisRunRoot });
    }
    return;
  }

  const state = JSON.parse(await readFile(statePath, "utf8")) as { runId?: string; name?: string; phase?: string };
  const isOtis = input.runId.includes("otis") || /otis/i.test(state.name ?? "");

  if (!state.phase && isOtis) {
    await importLegacyOtisRun({ runRoot: otisRunRoot });
  }
}

async function findRunRoot(stateRoot: string, runId: string): Promise<string | undefined> {
  const { readdir } = await import("node:fs/promises");
  const walk = async (root: string): Promise<string | undefined> => {
    const entries = await readdir(root, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      const path = join(root, entry.name);

      if (entry.isDirectory()) {
        const found = await walk(path);
        if (found) return found;
      } else if (entry.name === "run-state.json") {
        const state = JSON.parse(await readFile(path, "utf8")) as { runId?: string };
        if (state.runId === runId) return dirname(path);
      }
    }

    return undefined;
  };

  return walk(stateRoot);
}

async function activeImprovementBlockerReason(stateRoot: string): Promise<string | undefined> {
  const ledgerPath = join(stateRoot, "ledgers", "improvements.jsonl");
  const raw = await readFile(ledgerPath, "utf8").catch(() => "");
  const entries = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { category?: string; severity?: string; failureCode?: string });
  const lastUpgradeIndex = entries.map((entry) => entry.category).lastIndexOf("engine-upgrade");
  const activeEntries = lastUpgradeIndex === -1 ? entries : entries.slice(lastUpgradeIndex + 1);
  const high = activeEntries.find((entry) => entry.severity === "high");

  if (high) return high.failureCode ?? high.category ?? "high-severity-failure";

  const mediumCounts = activeEntries
    .filter((entry) => entry.severity === "medium")
    .reduce((counts, entry) => {
      const code = entry.failureCode ?? entry.category ?? "medium-failure";
      counts.set(code, (counts.get(code) ?? 0) + 1);
      return counts;
    }, new Map<string, number>());
  const repeatedMedium = [...mediumCounts.entries()].find(([, count]) => count >= 2);

  return repeatedMedium ? repeatedMedium[0] : undefined;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const stateRoot = flagValue(argv, "--state-root") ?? ".artlab/studio";
  const continueRunId = flagValue(argv, "--continue");
  const answer = answerValue(argv);
  const request = flagValue(argv, "--request");

  if (answer) {
    await maybeImportLegacyRun({ stateRoot, runId: answer.runId });
    const runRoot = await findRunRoot(stateRoot, answer.runId);

    if (!runRoot) throw new Error(`Could not find run-state.json for ${answer.runId}.`);

    const nextState = await applyCreativeHumanResponse({
      runRoot,
      response: answer.response,
    });

    if (nextState.phase === "initial-direction-approved") {
      const blockerReason = await activeImprovementBlockerReason(stateRoot);

      if (blockerReason) {
        await markCreativeRunUpgradeRequired({ runRoot, reason: blockerReason });
      } else {
        await continueApprovedProductionForCreativeRun({ runRoot });
      }
    } else if (nextState.phase === "approved-for-app") {
      await promoteApprovedCreativeRunForApp({
        runRoot,
        projectRoot: process.env.TOWER_ART_PROJECT_ROOT,
      });
    }

    console.log(`Recorded answer for ${answer.runId}: ${answer.response}`);
    console.log(await renderCreativeStatusSummary({ stateRoot, runId: answer.runId }));
    return;
  }

  if (continueRunId) {
    await maybeImportLegacyRun({ stateRoot, runId: continueRunId });
    const blockerReason = await activeImprovementBlockerReason(stateRoot);

    if (blockerReason) {
      const runRoot = await findRunRoot(stateRoot, continueRunId);

      if (!runRoot) throw new Error(`Could not find run-state.json for ${continueRunId}.`);

      await markCreativeRunUpgradeRequired({ runRoot, reason: blockerReason });
    } else {
      const runRoot = await findRunRoot(stateRoot, continueRunId);

      if (runRoot) {
        const state = JSON.parse(await readFile(join(runRoot, "run-state.json"), "utf8")) as {
          phase?: string;
          approvedInitialConcept?: unknown;
        };

        if (state.phase === "direction-generating" || state.phase === "awaiting-initial-approval" || state.phase === "style-failed") {
          await generateInitialConceptsForCreativeRun({ runRoot });
        } else if (
          state.phase === "initial-direction-approved" ||
          state.phase === "production-planned" ||
          state.phase === "full-pack-running" ||
          state.phase === "repair-required" ||
          state.phase === "final-board-ready" ||
          (state.phase === "provider-blocked" && Boolean(state.approvedInitialConcept))
        ) {
          await continueApprovedProductionForCreativeRun({ runRoot });
        } else if (state.phase === "strict-qa") {
          await buildFinalBoardForCreativeRun({ runRoot });
        } else if (state.phase === "approved-for-app") {
          await promoteApprovedCreativeRunForApp({
            runRoot,
            projectRoot: process.env.TOWER_ART_PROJECT_ROOT,
          });
        } else if (state.phase === "integrated") {
          const evidencePath = join(runRoot, "review", "app-browser-qa.json");

          if (existsSync(evidencePath)) {
            await markCreativeRunBrowserVerified({ runRoot, evidencePath });
            await closeCreativeRunAfterGates({ runRoot });
          }
        } else if (state.phase === "browser-verified") {
          await closeCreativeRunAfterGates({ runRoot });
        }
      }
    }

    console.log(await renderCreativeStatusSummary({ stateRoot, runId: continueRunId }));
    return;
  }

  if (!request) {
    throw new Error("art:produce requires --request \"...\" or --continue <runId>.");
  }

  const artifacts = await startCreativeProductionRun({
    stateRoot,
    request,
    runId: flagValue(argv, "--run-id"),
    dryRun: argv.includes("--dry-run"),
  });

  printHumanStop(artifacts);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
