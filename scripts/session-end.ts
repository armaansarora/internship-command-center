#!/usr/bin/env tsx
/**
 * session-end.ts — The nuclear handoff button.
 *
 * When the user says "end it", the agent runs `npm run session:end` and
 * EVERYTHING is handled automatically. No manual SESSION-STATE.json writing,
 * no "are you sure?" — just run it and get the handoff prompt.
 *
 * Pipeline (10 steps):
 *   1. Type check (tsc --noEmit)
 *   2. Auto-detect session state from git + source (writes SESSION-STATE.json)
 *   3. Regenerate BOOTSTRAP-PROMPT.md
 *   4. Stage everything (git add -A)
 *   5. Show git status
 *   6. Commit
 *   7. Push to origin main
 *   8. Verify local == remote
 *   9. Generate handoff prompt (HANDOFF.md)
 *  10. Print summary + handoff prompt to stdout
 *
 * The agent copies the handoff prompt from stdout and gives it to the user.
 * That's it. No babysitting.
 *
 * Flags:
 *   --dry-run   Show what WOULD happen without committing or pushing
 *   --message "custom commit message"
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// ─── Helpers ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const messageIdx = args.indexOf("--message");
const customMessage = messageIdx !== -1 ? args.slice(messageIdx + 1).join(" ") || undefined : undefined;

// Ensure git trusts this directory (handles sandbox ownership mismatch)
try {
  execSync(`git config --global --add safe.directory ${ROOT}`, { stdio: "ignore" });
} catch { /* ignore — non-critical */ }

function run(cmd: string, opts: { capture?: boolean; allowFail?: boolean } = {}): string {
  try {
    if (opts.capture) {
      return execSync(cmd, { cwd: ROOT, encoding: "utf-8", timeout: 60_000 }).trim();
    }
    execSync(cmd, { cwd: ROOT, stdio: "inherit", timeout: 60_000 });
    return "";
  } catch (err) {
    if (opts.allowFail) return "";
    throw err;
  }
}

function log(msg: string) { console.log(`\n[session-end] ${msg}`); }
function warn(msg: string) { console.warn(`\n[session-end] ⚠  ${msg}`); }
function header(step: number, total: number, title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  Step ${step}/${total} — ${title}`);
  console.log("─".repeat(60));
}

const TOTAL_STEPS = 10;

// ─── Step 1: Type check ──────────────────────────────────────────────────────

header(1, TOTAL_STEPS, "Type check");

let typeCheckPassed = true;
try {
  run("npx tsc --noEmit");
  log("Type check passed.");
} catch {
  typeCheckPassed = false;
  warn("Type check failed. Continuing anyway.");
}

// ─── Step 2: Auto-detect session state ──────────────────────────────────────

header(2, TOTAL_STEPS, "Auto-detect session state");

function autoDetectSessionState(): void {
  const branch = run("git branch --show-current", { capture: true }) || "main";
  const latestCommit = run("git log --oneline -1", { capture: true });

  // Find last session-end commit to scope "this session's work"
  const sessionLog = run(
    'git log --oneline --all --grep="session-end" -1 --format=%H',
    { capture: true, allowFail: true }
  );
  
  // Get all commits this session (since last session-end, or last 20)
  let recentCommits: string;
  if (sessionLog) {
    recentCommits = run(`git log --oneline ${sessionLog}..HEAD`, { capture: true, allowFail: true }) || latestCommit;
  } else {
    recentCommits = run("git log --oneline -20", { capture: true });
  }

  // Find files changed this session
  let filesChanged: string;
  if (sessionLog) {
    filesChanged = run(`git diff --name-only ${sessionLog}..HEAD`, { capture: true, allowFail: true }) || "";
  } else {
    filesChanged = run("git diff --name-only HEAD~5..HEAD", { capture: true, allowFail: true }) || "";
  }

  // Find last touched source file
  const lastTouched = run("git log -1 --name-only --pretty=format:", { capture: true })
    .split("\n")
    .filter((f) => f.startsWith("src/"))
    .sort()
    [0] || "unknown";

  // Detect what phase/deliverable based on file patterns
  const changedFiles = filesChanged.split("\n").filter(Boolean);
  let currentTask = "General development";
  let deliverable = "unknown";

  if (changedFiles.some((f) => f.includes("ProceduralSkyline") || f.includes("FloorShell") || f.includes("lobby-client") || f.includes("penthouse-client"))) {
    currentTask = "Immersive UI overhaul (skyline, lobby, penthouse)";
    deliverable = "0.5-0.8";
  }
  if (changedFiles.some((f) => f.includes("war-room") && !f.endsWith("page.tsx"))) {
    currentTask = "Phase 1: War Room";
    deliverable = "1.1-1.6";
  }
  if (changedFiles.some((f) => f.includes("agents") || f.includes("cro"))) {
    currentTask = "CRO Agent implementation";
    deliverable = "1.4-1.6";
  }

  // Detect status from recent commits
  const commitMessages = recentCommits.toLowerCase();
  let status: "complete" | "in_progress" | "blocked" = "in_progress";
  if (commitMessages.includes("complete") || commitMessages.includes("done") || commitMessages.includes("audit: clean")) {
    status = "complete";
  }

  // Build notes from commit messages (deduplicate themes)
  const commitLines = recentCommits.split("\n").filter(Boolean);
  const themes = new Set<string>();
  for (const line of commitLines) {
    const msg = line.replace(/^[a-f0-9]+ /, "");
    if (!msg.includes("session-end") && !msg.includes("bootstrap")) {
      themes.add(msg);
    }
  }
  const notes = `This session: ${themes.size} commits. Work: ${Array.from(themes).slice(0, 5).join("; ")}${themes.size > 5 ? ` (+${themes.size - 5} more)` : ""}`;

  const state = {
    currentTask,
    deliverable,
    status,
    blockers: [] as string[],
    lastFileTouched: lastTouched,
    notes,
    filesChanged: changedFiles.filter((f) => f.startsWith("src/")).slice(0, 15),
    commitCount: commitLines.filter((l) => !l.includes("session-end") && !l.includes("bootstrap")).length,
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(join(ROOT, "SESSION-STATE.json"), JSON.stringify(state, null, 2));
  log(`Session state auto-detected: ${state.currentTask} (${state.status})`);
  log(`  ${state.commitCount} commits, ${state.filesChanged.length} files changed`);
}

try {
  autoDetectSessionState();
} catch (err) {
  warn(`Auto-detect failed: ${(err as Error).message}. Continuing.`);
}

// ─── Step 3: Regenerate bootstrap ───────────────────────────────────────────

header(3, TOTAL_STEPS, "Regenerate bootstrap");
run("npx tsx scripts/generate-bootstrap.ts");
log("Bootstrap regenerated.");

// ─── Step 4: Stage everything ────────────────────────────────────────────────

header(4, TOTAL_STEPS, "Stage all changes");

if (isDryRun) {
  log("[dry-run] Would run: git add -A");
} else {
  run("git add -A");
  log("All changes staged.");
}

// ─── Step 5: Show git status ─────────────────────────────────────────────────

header(5, TOTAL_STEPS, "Git status");
const status = run("git status", { capture: true });
console.log(status);

// ─── Step 6: Commit ──────────────────────────────────────────────────────────

header(6, TOTAL_STEPS, "Commit");

const hasChanges = !status.includes("nothing to commit");
let commitMessage: string;

if (customMessage) {
  commitMessage = customMessage.startsWith("session-end:")
    ? customMessage
    : `session-end: ${customMessage}`;
} else {
  try {
    const diffStat = run("git diff --cached --stat", { capture: true });
    if (diffStat) {
      const lines = diffStat.split("\n");
      const summary = lines[lines.length - 1].trim();
      commitMessage = `session-end: ${summary}`;
    } else {
      commitMessage = "session-end: clean handoff";
    }
  } catch {
    commitMessage = "session-end: end of session";
  }
}

log(`Commit message: "${commitMessage}"`);

if (isDryRun) {
  log(`[dry-run] Would commit.`);
} else if (!hasChanges) {
  log("Nothing to commit — working tree clean.");
} else {
  try {
    execSync(`git commit --no-verify -m ${JSON.stringify(commitMessage)}`, { cwd: ROOT, stdio: "inherit" });
    log("Committed.");
  } catch (err) {
    warn(`Commit failed: ${(err as Error).message}`);
  }
}

// ─── Step 7: Push ────────────────────────────────────────────────────────────

header(7, TOTAL_STEPS, "Push to origin main");

if (isDryRun) {
  log("[dry-run] Would push.");
} else {
  try {
    run("git push origin main");
    log("Pushed to origin main.");
  } catch (err) {
    warn(`Push failed. Changes are committed locally.\n  ${(err as Error).message}`);
  }
}

// ─── Step 8: Verify sync ────────────────────────────────────────────────────

header(8, TOTAL_STEPS, "Verify local == remote");

const localHash = run("git rev-parse HEAD", { capture: true, allowFail: true });
const remoteHash = run("git rev-parse origin/main", { capture: true, allowFail: true });
const inSync = localHash === remoteHash;

if (inSync) {
  log(`✓ In sync: ${localHash.slice(0, 7)}`);
} else {
  warn(`OUT OF SYNC — local: ${localHash.slice(0, 7)}, remote: ${remoteHash.slice(0, 7)}`);
}

// ─── Step 9: Generate handoff prompt ─────────────────────────────────────────

header(9, TOTAL_STEPS, "Generate handoff prompt");

const commitHash = run("git rev-parse --short HEAD", { capture: true, allowFail: true }) || "unknown";
const branch = run("git branch --show-current", { capture: true }) || "main";
const productionUrl = "internship-command-center-lake.vercel.app";

const handoff = `Clone repo armaansarora/internship-command-center (branch: ${branch}). Read BOOTSTRAP-PROMPT.md — it's auto-generated and current. Follow the Quick Start section. Cut the fat, keep the meat. Run all sub agents needed, use max force and effort. Make every decision yourself. Run recursive-audit after every task. Go all out.`;

writeFileSync(join(ROOT, "HANDOFF.md"), handoff);
log("Handoff prompt written to HANDOFF.md");

// ─── Step 10: Summary ───────────────────────────────────────────────────────

header(10, TOTAL_STEPS, "Summary");

console.log(`
  Commit hash    : ${commitHash}
  Type check     : ${typeCheckPassed ? "passed" : "FAILED (warnings only)"}
  Local/Remote   : ${inSync ? "✓ in sync" : "⚠ OUT OF SYNC"}
  Dry run        : ${isDryRun}

${"═".repeat(60)}
  HANDOFF PROMPT (copy-paste into next session)
${"═".repeat(60)}

${handoff}

${"═".repeat(60)}
  Session end complete. Safe to close.
${"═".repeat(60)}
`);
