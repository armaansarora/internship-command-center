#!/usr/bin/env tsx
/**
 * session-end.ts
 * Chains the entire session-end workflow into one command:
 *   1. Type check (tsc --noEmit)
 *   2. Regenerate bootstrap
 *   3. Stage everything (git add -A)
 *   4. Show git status
 *   5. Commit (optional message via argv[2], prefixed "session-end: ")
 *   6. Push to origin main
 *   7. Print summary
 *
 * Flags:
 *   --dry-run   Show what WOULD happen without committing or pushing
 */

import { execSync } from "child_process";

// ─── Helpers ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

// argv[2] if it's not a flag, otherwise undefined
const customMessage = args.find((a) => !a.startsWith("-"));

function run(cmd: string, opts: { capture?: boolean } = {}): string {
  if (opts.capture) {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  }
  execSync(cmd, { stdio: "inherit" });
  return "";
}

function log(msg: string) {
  console.log(`\n[session-end] ${msg}`);
}

function warn(msg: string) {
  console.warn(`\n[session-end] ⚠  ${msg}`);
}

function header(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

// ─── Step 1: Type check ──────────────────────────────────────────────────────

header("Step 1/7 — Type check");

let typeCheckPassed = true;
try {
  run("npx tsc --noEmit");
  log("Type check passed.");
} catch {
  typeCheckPassed = false;
  warn(
    "Type check failed. Continuing with a warning (non-interactive session)."
  );
}

if (!typeCheckPassed) {
  warn("Proceeding despite type errors.");
}

// ─── Step 2: Regenerate bootstrap ───────────────────────────────────────────

header("Step 2/7 — Regenerate bootstrap");
run("npx tsx scripts/generate-bootstrap.ts");
log("Bootstrap regenerated.");

// ─── Step 3: Stage everything ────────────────────────────────────────────────

header("Step 3/7 — Stage all changes");

if (isDryRun) {
  log("[dry-run] Would run: git add -A");
} else {
  run("git add -A");
  log("All changes staged.");
}

// ─── Step 4: Show git status ─────────────────────────────────────────────────

header("Step 4/7 — Git status");
const status = run("git status", { capture: true });
console.log(status);

// ─── Step 5: Build commit message & commit ────────────────────────────────────

header("Step 5/7 — Commit");

// Detect whether there is anything to commit
const hasChanges = !status.includes("nothing to commit");

let commitMessage: string;

if (customMessage) {
  commitMessage = customMessage.startsWith("session-end: ")
    ? customMessage
    : `session-end: ${customMessage}`;
} else {
  // Generate message from diff --stat
  try {
    const diffStat = run("git diff --cached --stat", { capture: true });
    if (diffStat) {
      // Last line of diff --stat looks like: "5 files changed, 120 insertions(+), 30 deletions(-)"
      const lines = diffStat.split("\n");
      const summary = lines[lines.length - 1].trim();
      commitMessage = `session-end: ${summary}`;
    } else {
      commitMessage = "session-end: no staged changes";
    }
  } catch {
    commitMessage = "session-end: end of session";
  }
}

log(`Commit message: "${commitMessage}"`);

if (isDryRun) {
  log(`[dry-run] Would run: git commit -m "${commitMessage}"`);
} else if (!hasChanges) {
  log("Nothing to commit — working tree clean. Skipping commit.");
} else {
  try {
    // Use execSync directly with array-safe escaping to avoid shell injection
    execSync(`git commit -m ${JSON.stringify(commitMessage)}`, { cwd: process.cwd(), stdio: "inherit" });
    log("Committed.");
  } catch (err) {
    warn(`Commit failed: ${(err as Error).message}`);
  }
}

// ─── Step 6: Push ────────────────────────────────────────────────────────────

header("Step 6/7 — Push to origin main");

if (isDryRun) {
  log("[dry-run] Would run: git push origin main");
} else {
  try {
    run("git push origin main");
    log("Pushed to origin main.");
  } catch (err) {
    warn(
      `Push failed (no remote access or branch mismatch). Changes are committed locally.\n  ${
        (err as Error).message
      }`
    );
  }
}

// ─── Step 7: Summary ─────────────────────────────────────────────────────────

header("Step 7/7 — Summary");

let commitHash = "(dry-run, not committed)";
if (!isDryRun) {
  try {
    commitHash = run("git rev-parse --short HEAD", { capture: true });
  } catch {
    commitHash = "(unknown)";
  }
}

console.log(`
  Commit message : ${commitMessage}
  Commit hash    : ${commitHash}
  Type check     : ${typeCheckPassed ? "passed" : "FAILED (warnings only)"}
  Dry run        : ${isDryRun}

  Session end workflow complete.
`);
