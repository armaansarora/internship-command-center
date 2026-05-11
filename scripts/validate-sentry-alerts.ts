/**
 * validate-sentry-alerts — CLI wrapper around the helpers in
 * `src/lib/observability/sentry-alerts.ts`. Exits non-zero on any failure so
 * the developer (and CI, when wired) can gate on it.
 *
 * Run locally:
 *   ./node_modules/.bin/tsx scripts/validate-sentry-alerts.ts
 *
 * The unit test (`src/lib/observability/sentry-alerts.test.ts`) exercises
 * the same helpers — the script is the operator-facing entry point; the
 * test is the regression guard wired into `npm test`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadAlertsFromFile,
  verifyRunbookAnchors,
} from "../src/lib/observability/sentry-alerts";

function repoFile(...segments: string[]): string {
  return resolve(process.cwd(), ...segments);
}

async function main(): Promise<void> {
  const alertsPath = repoFile("sentry", "alerts.yaml");
  const runbookPath = repoFile("docs", "RUNBOOK.md");

  const alerts = loadAlertsFromFile(alertsPath);
  const runbookMarkdown = readFileSync(runbookPath, "utf8");
  const anchors = verifyRunbookAnchors(alerts, runbookMarkdown);
  if (!anchors.ok) {
    throw new Error(
      `Runbook anchors missing for: ${anchors.missing.join(", ")}`,
    );
  }
  process.stdout.write(
    `sentry/alerts.yaml OK — ${alerts.alerts.length} rules, all runbook anchors present.\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
