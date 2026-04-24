#!/usr/bin/env tsx
/**
 * session-end.ts — The nuclear handoff button.
 *
 * When the user says "end it", the agent runs `npm run session:end` and
 * EVERYTHING is handled automatically. No manual SESSION-STATE.json writing,
 * no "are you sure?" — just run it and get the handoff prompt.
 *
 * Pipeline (16 steps):
 *
 *   PHASE A — VERIFY (is the codebase healthy?)
 *     1. Type check (tsc --noEmit)
 *     2. Full production build (next build)
 *     3. Lint check (eslint)
 *     4. Code hygiene scan (console.logs, `any` types, TODO/FIXME, orphan files,
 *        dead exports, large files, hardcoded secrets patterns)
 *
 *   PHASE B — DETECT (what happened this session?)
 *     5. Auto-detect session state from git diff + source analysis
 *     6. Diff summary (files changed, LOC added/removed, new deps)
 *
 *   PHASE C — GENERATE (prepare handoff artifacts)
 *     7. Regenerate BOOTSTRAP-PROMPT.md
 *     8. Generate session changelog (human-readable)
 *
 *   PHASE D — COMMIT (get it to remote)
 *     9.  Stage everything (git add -A)
 *    10.  Show git status
 *    11.  Commit
 *    12.  Push to origin main
 *    13.  Verify local == remote (fetch + compare)
 *
 *   PHASE E — VALIDATE PRODUCTION
 *    14.  Curl production URL (check HTTP 200 + response time)
 *    15.  Wait for Vercel deploy + re-check (if commit was just pushed)
 *
 *   PHASE F — HANDOFF
 *    16.  Generate handoff prompt + full report card → stdout only
 *         (tower handoff + .handoff/*.md is the canonical session-end path
 *         since 2026-04-21; this script no longer writes HANDOFF.md).
 *
 * The agent copies the handoff prompt from stdout and gives it to the user.
 * That's it. No babysitting.
 *
 * Flags:
 *   --dry-run   Show what WOULD happen without committing or pushing
 *   --message "custom commit message"
 *   --skip-build  Skip the full production build (faster, for when you know it's clean)
 *   --skip-deploy-check  Skip the Vercel deploy verification
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

// ─── Helpers ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const skipBuild = args.includes("--skip-build");
const skipDeployCheck = args.includes("--skip-deploy-check");
const messageIdx = args.indexOf("--message");
const customMessage = messageIdx !== -1 ? args.slice(messageIdx + 1).filter((a) => !a.startsWith("--")).join(" ") || undefined : undefined;

// Ensure git trusts this directory (handles sandbox ownership mismatch)
try {
  execSync(`git config --global --add safe.directory ${ROOT}`, { stdio: "ignore" });
} catch { /* ignore — non-critical */ }

function run(cmd: string, opts: { capture?: boolean; allowFail?: boolean; timeout?: number } = {}): string {
  const timeout = opts.timeout ?? 60_000;
  try {
    if (opts.capture) {
      return execSync(cmd, { cwd: ROOT, encoding: "utf-8", timeout }).trim();
    }
    execSync(cmd, { cwd: ROOT, stdio: "inherit", timeout });
    return "";
  } catch (err) {
    if (opts.allowFail) return "";
    throw err;
  }
}

function log(msg: string) { console.log(`\n[session-end] ${msg}`); }
function warn(msg: string) { console.warn(`\n[session-end] ⚠  ${msg}`); }
function ok(msg: string) { console.log(`\n[session-end] ✓  ${msg}`); }
function fail(msg: string) { console.error(`\n[session-end] ✗  ${msg}`); }

function phase(letter: string, title: string) {
  console.log(`\n${"━".repeat(60)}`);
  console.log(`  PHASE ${letter} — ${title}`);
  console.log("━".repeat(60));
}

function step(num: number, total: number, title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  Step ${num}/${total} — ${title}`);
  console.log("─".repeat(60));
}

const TOTAL_STEPS = 16;

// Accumulate findings for the report card
interface Finding {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
}
const findings: Finding[] = [];

function addFinding(severity: Finding["severity"], category: string, message: string) {
  findings.push({ severity, category, message });
  if (severity === "error") fail(`[${category}] ${message}`);
  else if (severity === "warning") warn(`[${category}] ${message}`);
  else log(`[${category}] ${message}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE A — VERIFY
// ═══════════════════════════════════════════════════════════════════════════

phase("A", "VERIFY — Is the codebase healthy?");

// ─── Step 1: Type check ─────────────────────────────────────────────────────

step(1, TOTAL_STEPS, "Type check (tsc --noEmit)");

let typeCheckPassed = true;
try {
  run("npx tsc --noEmit");
  ok("Type check passed.");
} catch {
  typeCheckPassed = false;
  addFinding("error", "typecheck", "TypeScript type check failed. Fix before shipping.");
}

// ─── Step 2: Full production build ──────────────────────────────────────────

step(2, TOTAL_STEPS, "Production build (next build)");

let buildPassed = true;
if (skipBuild) {
  log("Skipped (--skip-build flag).");
} else {
  try {
    run("npm run build", { timeout: 180_000 });
    ok("Production build succeeded.");
  } catch {
    buildPassed = false;
    addFinding("error", "build", "Production build failed. This means Vercel deploy will also fail.");
  }
}

// ─── Step 3: Lint check ─────────────────────────────────────────────────────

step(3, TOTAL_STEPS, "Lint check (eslint)");

let lintPassed = true;
try {
  const lintOutput = run("npm run lint 2>&1", { capture: true, allowFail: true });
  if (lintOutput.includes("error") && !lintOutput.includes("0 errors")) {
    lintPassed = false;
    const errorCount = (lintOutput.match(/(\d+) error/)?.[1]) || "unknown";
    addFinding("warning", "lint", `ESLint found ${errorCount} error(s). Non-blocking but should fix.`);
  } else {
    ok("Lint check passed.");
  }
} catch {
  lintPassed = false;
  addFinding("warning", "lint", "Lint check failed to run. Non-blocking.");
}

// ─── Step 4: Code hygiene scan ──────────────────────────────────────────────

step(4, TOTAL_STEPS, "Code hygiene scan");

function walkSrc(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        results.push(...walkSrc(full, exts));
      } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
        results.push(full);
      }
    }
  } catch { /* skip unreadable dirs */ }
  return results;
}

const srcFiles = walkSrc(join(ROOT, "src"), [".ts", ".tsx"]);

// 4a. Console.log / console.debug / console.info in source
const consoleLogFiles: string[] = [];
for (const f of srcFiles) {
  const content = readFileSync(f, "utf-8");
  // Ignore legitimate server-side logging in API routes
  if (f.includes("/api/") || f.includes("middleware")) continue;
  const matches = content.match(/console\.(log|debug|info|warn)\(/g);
  if (matches && matches.length > 0) {
    consoleLogFiles.push(`${relative(ROOT, f)} (${matches.length})`);
  }
}
if (consoleLogFiles.length > 0) {
  addFinding("warning", "hygiene", `console.log found in: ${consoleLogFiles.join(", ")}`);
} else {
  ok("No console.log statements in client source.");
}

// 4b. `any` type usage
const anyTypeFiles: string[] = [];
for (const f of srcFiles) {
  const content = readFileSync(f, "utf-8");
  const lines = content.split("\n");
  let count = 0;
  for (const line of lines) {
    // Match `: any`, `as any`, `<any>` but not inside comments or strings
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) continue;
    if (/:\s*any\b|as\s+any\b|<any>/.test(line)) count++;
  }
  if (count > 0) anyTypeFiles.push(`${relative(ROOT, f)} (${count})`);
}
if (anyTypeFiles.length > 0) {
  addFinding("warning", "hygiene", `\`any\` type found in: ${anyTypeFiles.join(", ")}`);
} else {
  ok("No `any` types in source.");
}

// 4c. TODO / FIXME / HACK / XXX comments
const todoFiles: string[] = [];
for (const f of srcFiles) {
  const content = readFileSync(f, "utf-8");
  const matches = content.match(/\b(TODO|FIXME|HACK|XXX)\b/g);
  if (matches && matches.length > 0) {
    todoFiles.push(`${relative(ROOT, f)} (${matches.length})`);
  }
}
if (todoFiles.length > 0) {
  addFinding("warning", "hygiene", `TODO/FIXME comments in: ${todoFiles.join(", ")}`);
} else {
  ok("No TODO/FIXME comments in source.");
}

// 4d. Large files (>500 LOC) — might need splitting
const largeFiles: string[] = [];
for (const f of srcFiles) {
  const lineCount = readFileSync(f, "utf-8").split("\n").length;
  if (lineCount > 500) {
    largeFiles.push(`${relative(ROOT, f)} (${lineCount} LOC)`);
  }
}
if (largeFiles.length > 0) {
  addFinding("info", "hygiene", `Large files (>500 LOC): ${largeFiles.join(", ")}. Consider splitting.`);
}

// 4e. Orphan files — defined but never imported
const orphanFiles: string[] = [];
const importableFiles = srcFiles.filter((f) => {
  const rel = relative(ROOT, f);
  return !rel.includes("page.tsx") && !rel.includes("layout.tsx") &&
    !rel.includes("middleware.ts") && !rel.includes("route.ts") &&
    !rel.includes("globals.css") && !rel.includes("loading.tsx") &&
    !rel.includes("not-found.tsx") && !rel.includes("error.tsx");
});

for (const f of importableFiles) {
  const basename = f.split("/").pop()!.replace(/\.[^.]+$/, "");
  // Check if any other file imports this basename
  let imported = false;
  for (const other of srcFiles) {
    if (other === f) continue;
    const otherContent = readFileSync(other, "utf-8");
    if (otherContent.includes(basename)) {
      imported = true;
      break;
    }
  }
  if (!imported) {
    orphanFiles.push(relative(ROOT, f));
  }
}
if (orphanFiles.length > 0) {
  addFinding("warning", "hygiene", `Potentially orphaned files (not imported anywhere): ${orphanFiles.join(", ")}`);
} else {
  ok("No orphaned files detected.");
}

// 4f. Hardcoded secrets patterns (API keys, tokens, passwords in source)
const secretPatterns = [
  /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{8,}/i,
  /sk[-_][a-zA-Z0-9]{20,}/,   // Stripe-style keys
  /eyJ[a-zA-Z0-9]{20,}/,       // JWT tokens
  /ghp_[a-zA-Z0-9]{20,}/,      // GitHub PATs
];

const secretHits: string[] = [];
for (const f of srcFiles) {
  const content = readFileSync(f, "utf-8");
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) {
      // Make sure it's not just referencing an env var
      const lines = content.split("\n").filter((l) => pattern.test(l));
      const realHits = lines.filter((l) => !l.includes("process.env") && !l.includes("NEXT_PUBLIC"));
      if (realHits.length > 0) {
        secretHits.push(relative(ROOT, f));
        break;
      }
    }
  }
}
if (secretHits.length > 0) {
  addFinding("error", "security", `Possible hardcoded secrets in: ${secretHits.join(", ")}. CHECK IMMEDIATELY.`);
} else {
  ok("No hardcoded secrets detected.");
}

// 4g. Accessibility: interactive elements without aria attributes
const a11yIssues: string[] = [];
for (const f of srcFiles) {
  if (!f.endsWith(".tsx")) continue;
  const content = readFileSync(f, "utf-8");
  // Check for onClick on non-button/a elements without role/aria-label
  const clickHandlers = content.match(/onClick\s*=\s*\{/g);
  if (clickHandlers && clickHandlers.length > 0) {
    const hasAriaOrRole = /aria-label|aria-labelledby|role=/.test(content);
    const hasSemanticElements = /<button|<a\s|<input|<select/.test(content);
    if (!hasAriaOrRole && !hasSemanticElements) {
      a11yIssues.push(relative(ROOT, f));
    }
  }
}
if (a11yIssues.length > 0) {
  addFinding("info", "a11y", `Files with click handlers but no aria/role: ${a11yIssues.join(", ")}`);
}

// 4h. Unused dependencies check
let unusedDeps: string[] = [];
try {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  const allDeps = Object.keys(pkg.dependencies || {});
  const allSrcContent = srcFiles.map((f) => readFileSync(f, "utf-8")).join("\n");
  const configFiles = ["next.config.ts", "tailwind.config.ts", "drizzle.config.ts", "eslint.config.mjs", "postcss.config.mjs"]
    .map((f) => {
      try { return readFileSync(join(ROOT, f), "utf-8"); } catch { return ""; }
    }).join("\n");
  const allContent = allSrcContent + "\n" + configFiles;

  for (const dep of allDeps) {
    // Normalize: @scope/package → look for "scope/package" or just "package"
    const shortName = dep.startsWith("@") ? dep.split("/")[1] : dep;
    if (!allContent.includes(dep) && !allContent.includes(shortName)) {
      unusedDeps.push(dep);
    }
  }
  // Filter out known false positives (these are used implicitly)
  // These are used implicitly by frameworks, build tools, or peer deps
  const falsePositives = [
    "typescript", "autoprefixer", "postcss", "tailwindcss", "husky", "eslint",
    "react-dom",    // used by Next.js internally
    "@types/node", "@types/react", "@types/react-dom", // type-only
    "tsx",          // used by scripts (not in src/)
    "vitest",       // test runner
  ];
  unusedDeps = unusedDeps.filter((d) => !falsePositives.some((fp) => d.includes(fp)));

  if (unusedDeps.length > 0) {
    addFinding("info", "deps", `Potentially unused dependencies: ${unusedDeps.join(", ")}`);
  } else {
    ok("All dependencies appear to be in use.");
  }
} catch {
  warn("Could not check for unused dependencies.");
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE B — DETECT
// ═══════════════════════════════════════════════════════════════════════════

phase("B", "DETECT — What happened this session?");

// ─── Step 5: Auto-detect session state ──────────────────────────────────────

step(5, TOTAL_STEPS, "Auto-detect session state");

interface SessionState {
  currentTask: string;
  deliverable: string;
  status: "complete" | "in_progress" | "blocked";
  blockers: string[];
  lastFileTouched: string;
  notes: string;
  filesChanged: string[];
  commitCount: number;
  locAdded: number;
  locRemoved: number;
  newDependencies: string[];
  updatedAt: string;
}

let sessionState: SessionState | null = null;

function autoDetectSessionState(): SessionState {
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

  // LOC stats
  let locAdded = 0;
  let locRemoved = 0;
  try {
    const diffStat = sessionLog
      ? run(`git diff --shortstat ${sessionLog}..HEAD`, { capture: true, allowFail: true })
      : run("git diff --shortstat HEAD~5..HEAD", { capture: true, allowFail: true });
    const addMatch = diffStat.match(/(\d+) insertion/);
    const delMatch = diffStat.match(/(\d+) deletion/);
    if (addMatch) locAdded = parseInt(addMatch[1]);
    if (delMatch) locRemoved = parseInt(delMatch[1]);
  } catch { /* ignore */ }

  // New dependencies added this session
  let newDependencies: string[] = [];
  try {
    if (sessionLog) {
      const pkgDiff = run(`git diff ${sessionLog}..HEAD -- package.json`, { capture: true, allowFail: true });
      const addedLines = pkgDiff.split("\n").filter((l) => l.startsWith("+") && l.includes('"'));
      newDependencies = addedLines
        .map((l) => l.match(/"([^"]+)":\s*"/)?.[1])
        .filter((d): d is string => !!d && !d.includes("version"));
    }
  } catch { /* ignore */ }

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
  if (changedFiles.some((f) => f.includes("session-end") || f.includes("generate-bootstrap"))) {
    currentTask = "Developer tooling (session-end, bootstrap)";
    deliverable = "infra";
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
  const notes = themes.size > 0
    ? `This session: ${themes.size} commits. Work: ${Array.from(themes).slice(0, 5).join("; ")}${themes.size > 5 ? ` (+${themes.size - 5} more)` : ""}`
    : "No feature commits this session (tooling/infra only).";

  return {
    currentTask,
    deliverable,
    status,
    blockers: [],
    lastFileTouched: lastTouched,
    notes,
    filesChanged: changedFiles.filter((f) => f.startsWith("src/")).slice(0, 15),
    commitCount: commitLines.filter((l) => !l.includes("session-end") && !l.includes("bootstrap")).length,
    locAdded,
    locRemoved,
    newDependencies,
    updatedAt: new Date().toISOString(),
  };
}

try {
  sessionState = autoDetectSessionState();
  writeFileSync(join(ROOT, "SESSION-STATE.json"), JSON.stringify(sessionState, null, 2));
  ok(`Session state: ${sessionState.currentTask} (${sessionState.status})`);
  log(`  ${sessionState.commitCount} commits | +${sessionState.locAdded} / -${sessionState.locRemoved} LOC | ${sessionState.filesChanged.length} src files changed`);
  if (sessionState.newDependencies.length > 0) {
    log(`  New deps: ${sessionState.newDependencies.join(", ")}`);
  }
} catch (err) {
  warn(`Auto-detect failed: ${(err as Error).message}. Continuing.`);
}

// ─── Step 6: Diff summary ───────────────────────────────────────────────────

step(6, TOTAL_STEPS, "Diff summary");

const uncommittedDiff = run("git diff --stat", { capture: true, allowFail: true });
const stagedDiff = run("git diff --cached --stat", { capture: true, allowFail: true });

if (uncommittedDiff) {
  log("Uncommitted changes:");
  console.log(uncommittedDiff);
}
if (stagedDiff) {
  log("Staged changes:");
  console.log(stagedDiff);
}
if (!uncommittedDiff && !stagedDiff) {
  ok("Working tree is clean (no uncommitted changes).");
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE C — GENERATE
// ═══════════════════════════════════════════════════════════════════════════

phase("C", "GENERATE — Prepare handoff artifacts");

// ─── Step 7: Regenerate bootstrap ───────────────────────────────────────────

step(7, TOTAL_STEPS, "Regenerate BOOTSTRAP-PROMPT.md");
run("npx tsx scripts/generate-bootstrap.ts");
ok("Bootstrap regenerated.");

// ─── Step 8: Session changelog ──────────────────────────────────────────────

step(8, TOTAL_STEPS, "Generate session changelog");

const sessionLog = run(
  'git log --oneline --all --grep="session-end" -1 --format=%H',
  { capture: true, allowFail: true }
);
const changelogCommits = sessionLog
  ? run(`git log --oneline ${sessionLog}..HEAD`, { capture: true, allowFail: true })
  : run("git log --oneline -10", { capture: true });

if (changelogCommits) {
  log("Session commits:");
  console.log(changelogCommits);
} else {
  log("No commits this session.");
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE D — COMMIT
// ═══════════════════════════════════════════════════════════════════════════

phase("D", "COMMIT — Get it to remote");

// ─── Step 9: Stage everything ───────────────────────────────────────────────

step(9, TOTAL_STEPS, "Stage all changes");

if (isDryRun) {
  log("[dry-run] Would run: git add -A");
} else {
  run("git add -A");
  ok("All changes staged.");
}

// ─── Step 10: Show git status ───────────────────────────────────────────────

step(10, TOTAL_STEPS, "Git status");
const gitStatus = run("git status", { capture: true });
console.log(gitStatus);

// ─── Step 11: Commit ────────────────────────────────────────────────────────

step(11, TOTAL_STEPS, "Commit");

const hasChanges = !gitStatus.includes("nothing to commit");
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
  log("[dry-run] Would commit.");
} else if (!hasChanges) {
  log("Nothing to commit — working tree clean.");
} else {
  try {
    execSync(`git commit --no-verify -m ${JSON.stringify(commitMessage)}`, { cwd: ROOT, stdio: "inherit" });
    ok("Committed.");
  } catch (err) {
    addFinding("error", "git", `Commit failed: ${(err as Error).message}`);
  }
}

// ─── Step 12: Push ──────────────────────────────────────────────────────────

step(12, TOTAL_STEPS, "Push to origin main");

if (isDryRun) {
  log("[dry-run] Would push.");
} else {
  // Try push — will succeed if git credentials are configured in the environment.
  // In Perplexity Computer sandbox, credentials are injected via api_credentials=["github"]
  // which sets GH_ENTERPRISE_TOKEN + URL rewrite. If that's not present, push will fail
  // and the agent must push manually with: git push origin main (using api_credentials).
  try {
    run("git push origin main");
    ok("Pushed to origin main.");
  } catch {
    // Check if GH_ENTERPRISE_TOKEN is available (Perplexity Computer credential injection)
    if (process.env.GH_ENTERPRISE_TOKEN) {
      // Token exists but push still failed — real error
      addFinding("error", "git", "Push failed despite credentials being available. Check remote.");
    } else {
      // No credentials — expected in sandbox. Agent must push separately.
      warn("Push requires authentication. Agent must run: git push origin main (with api_credentials=[\"github\"])");
      addFinding("info", "git", "Push deferred — agent must push with GitHub credentials. This is expected in Perplexity Computer sandbox.");
    }
  }
}

// ─── Step 13: Verify sync ───────────────────────────────────────────────────

step(13, TOTAL_STEPS, "Verify local == remote");

// Fetch to make sure we have the latest remote state
run("git fetch origin", { allowFail: true });
const localHash = run("git rev-parse HEAD", { capture: true, allowFail: true });
const remoteHash = run("git rev-parse origin/main", { capture: true, allowFail: true });
const inSync = localHash === remoteHash;

if (inSync) {
  ok(`In sync: ${localHash.slice(0, 7)}`);
} else {
  // Check if push was deferred (no credentials) — out-of-sync is expected in that case
  const pushDeferred = findings.some((f) => f.message.includes("Push deferred"));
  if (pushDeferred) {
    warn(`Out of sync (push deferred) — local: ${localHash.slice(0, 7)}, remote: ${remoteHash.slice(0, 7)}. Agent must push.`);
  } else {
    addFinding("error", "git", `OUT OF SYNC — local: ${localHash.slice(0, 7)}, remote: ${remoteHash.slice(0, 7)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE E — VALIDATE PRODUCTION
// ═══════════════════════════════════════════════════════════════════════════

phase("E", "VALIDATE — Is production healthy?");

// ─── Step 14: Curl production URL ───────────────────────────────────────────

step(14, TOTAL_STEPS, "Check production URL");

const productionUrl = "https://internship-command-center-lake.vercel.app";
let prodHealthy = false;
let prodResponseTime = 0;

if (skipDeployCheck) {
  log("Skipped (--skip-deploy-check flag).");
} else {
  try {
    const curlResult = run(
      `curl -s -o /dev/null -w "%{http_code} %{time_total}" -L "${productionUrl}" 2>/dev/null`,
      { capture: true, timeout: 30_000 }
    );
    const [httpCode, timeStr] = curlResult.split(" ");
    prodResponseTime = parseFloat(timeStr || "0");

    if (httpCode === "200") {
      prodHealthy = true;
      ok(`Production is live: HTTP ${httpCode} in ${prodResponseTime.toFixed(2)}s`);
      if (prodResponseTime > 5) {
        addFinding("warning", "perf", `Production response time is ${prodResponseTime.toFixed(2)}s (>5s is slow).`);
      }
    } else {
      addFinding("warning", "deploy", `Production returned HTTP ${httpCode}. May still be deploying.`);
    }
  } catch {
    addFinding("warning", "deploy", "Could not reach production URL. May be a network issue in sandbox.");
  }
}

// ─── Step 15: Vercel deploy wait ────────────────────────────────────────────

step(15, TOTAL_STEPS, "Vercel deploy verification");

if (skipDeployCheck || isDryRun) {
  log(isDryRun ? "Skipped (dry run)." : "Skipped (--skip-deploy-check flag).");
} else if (!hasChanges) {
  log("No new changes pushed — skipping deploy wait.");
} else {
  // Vercel typically deploys in 50-90 seconds. We'll check once after a short wait.
  log("Waiting 15s for Vercel deploy to pick up the push...");
  try {
    execSync("sleep 15", { cwd: ROOT });
    const checkResult = run(
      `curl -s -o /dev/null -w "%{http_code}" -L "${productionUrl}" 2>/dev/null`,
      { capture: true, timeout: 30_000 }
    );
    if (checkResult === "200") {
      ok("Production responding HTTP 200 after push.");
    } else {
      addFinding("info", "deploy", `Production returned HTTP ${checkResult} shortly after push. Vercel may still be building (~60s). Check manually.`);
    }
  } catch {
    addFinding("info", "deploy", "Post-push deploy check failed. Check Vercel dashboard manually.");
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE F — HANDOFF
// ═══════════════════════════════════════════════════════════════════════════

phase("F", "HANDOFF — Generate report card + prompt");

// ─── Step 16: Generate handoff ──────────────────────────────────────────────

step(16, TOTAL_STEPS, "Final report card + handoff prompt");

const finalCommitHash = run("git rev-parse --short HEAD", { capture: true, allowFail: true }) || "unknown";
const branch = run("git branch --show-current", { capture: true }) || "main";

// Compute grade
const errors = findings.filter((f) => f.severity === "error").length;
const warnings = findings.filter((f) => f.severity === "warning").length;
const infos = findings.filter((f) => f.severity === "info").length;

let grade: string;
if (errors > 0) grade = "❌ FAIL";
else if (warnings > 2) grade = "⚠️  C";
else if (warnings > 0) grade = "🟡 B";
else grade = "🟢 A";

// Build report card
const reportLines: string[] = [];
reportLines.push("# Session End — Report Card");
reportLines.push("");
reportLines.push(`**Grade: ${grade}**`);
reportLines.push(`**Commit: \`${finalCommitHash}\` on \`${branch}\`**`);
reportLines.push(`**Time: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" })} ET**`);
reportLines.push("");
reportLines.push("## Checks");
reportLines.push("");
reportLines.push(`| Check | Result |`);
reportLines.push(`|---|---|`);
reportLines.push(`| Type check | ${typeCheckPassed ? "✅ Pass" : "❌ Fail"} |`);
reportLines.push(`| Production build | ${skipBuild ? "⏭ Skipped" : buildPassed ? "✅ Pass" : "❌ Fail"} |`);
reportLines.push(`| Lint | ${lintPassed ? "✅ Pass" : "⚠️ Issues"} |`);
reportLines.push(`| Console.logs | ${consoleLogFiles.length === 0 ? "✅ Clean" : `⚠️ ${consoleLogFiles.length} file(s)`} |`);
reportLines.push(`| \`any\` types | ${anyTypeFiles.length === 0 ? "✅ Clean" : `⚠️ ${anyTypeFiles.length} file(s)`} |`);
reportLines.push(`| TODO/FIXME | ${todoFiles.length === 0 ? "✅ Clean" : `⚠️ ${todoFiles.length} file(s)`} |`);
reportLines.push(`| Orphan files | ${orphanFiles.length === 0 ? "✅ Clean" : `⚠️ ${orphanFiles.length} file(s)`} |`);
reportLines.push(`| Hardcoded secrets | ${secretHits.length === 0 ? "✅ Clean" : `❌ ${secretHits.length} file(s)`} |`);
const pushWasDeferred = findings.some((f) => f.message.includes("Push deferred"));
const syncStatus = inSync ? "✅ In sync" : pushWasDeferred ? "⏳ Deferred (agent must push)" : "❌ Out of sync";
reportLines.push(`| Git sync | ${syncStatus} |`);
reportLines.push(`| Production health | ${skipDeployCheck ? "⏭ Skipped" : prodHealthy ? `✅ HTTP 200 (${prodResponseTime.toFixed(2)}s)` : "⚠️ Check manually"} |`);
reportLines.push("");

if (sessionState) {
  reportLines.push("## Session Summary");
  reportLines.push("");
  reportLines.push(`- **Task:** ${sessionState.currentTask}`);
  reportLines.push(`- **Status:** ${sessionState.status}`);
  reportLines.push(`- **Commits:** ${sessionState.commitCount}`);
  reportLines.push(`- **LOC:** +${sessionState.locAdded} / -${sessionState.locRemoved}`);
  reportLines.push(`- **Files changed:** ${sessionState.filesChanged.length} source files`);
  if (sessionState.newDependencies.length > 0) {
    reportLines.push(`- **New deps:** ${sessionState.newDependencies.join(", ")}`);
  }
  reportLines.push(`- **Notes:** ${sessionState.notes}`);
  reportLines.push("");
}

if (findings.length > 0) {
  reportLines.push("## Findings");
  reportLines.push("");
  for (const f of findings) {
    const icon = f.severity === "error" ? "❌" : f.severity === "warning" ? "⚠️" : "ℹ️";
    reportLines.push(`${icon} **[${f.category}]** ${f.message}`);
  }
  reportLines.push("");
}

if (unusedDeps.length > 0) {
  reportLines.push("## Cleanup Suggestions");
  reportLines.push("");
  reportLines.push(`- Unused deps: \`npm uninstall ${unusedDeps.join(" ")}\``);
  reportLines.push("");
}

if (orphanFiles.length > 0) {
  reportLines.push(`- Orphan files to review: ${orphanFiles.map((f) => `\`${f}\``).join(", ")}`);
  reportLines.push("");
}

const handoff = `Clone repo armaansarora/internship-command-center (branch: ${branch}). Read BOOTSTRAP-PROMPT.md — it's auto-generated and current. Follow the Quick Start section. Cut the fat, keep the meat. Run all sub agents needed, use max force and effort. Make every decision yourself. Run recursive-audit after every task. Go all out.`;

reportLines.push("## Handoff Prompt");
reportLines.push("");
reportLines.push("```");
reportLines.push(handoff);
reportLines.push("```");

// reportCard (joined lines) was previously written to HANDOFF.md. Since
// 2026-04-21 the canonical session-end path is `tower handoff` +
// .handoff/*.md packets, so the file write was removed. The `reportLines`
// array is still used for the stdout print below.

// ─── Print to stdout ────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log("  SESSION END — REPORT CARD");
console.log("═".repeat(60));
console.log("");
console.log(`  Grade          : ${grade}`);
console.log(`  Commit         : ${finalCommitHash}`);
console.log(`  Type check     : ${typeCheckPassed ? "✅" : "❌"}`);
console.log(`  Build          : ${skipBuild ? "⏭" : buildPassed ? "✅" : "❌"}`);
console.log(`  Lint           : ${lintPassed ? "✅" : "⚠️"}`);
console.log(`  Hygiene        : ${consoleLogFiles.length + anyTypeFiles.length + todoFiles.length === 0 ? "✅" : "⚠️"}`);
console.log(`  Security       : ${secretHits.length === 0 ? "✅" : "❌"}`);
console.log(`  Git sync       : ${inSync ? "✅" : pushWasDeferred ? "⏳ Deferred" : "❌"}`);
console.log(`  Production     : ${skipDeployCheck ? "⏭" : prodHealthy ? "✅" : "⚠️"}`);
console.log(`  Findings       : ${errors} errors, ${warnings} warnings, ${infos} info`);
if (sessionState) {
  console.log(`  Session        : ${sessionState.commitCount} commits, +${sessionState.locAdded}/-${sessionState.locRemoved} LOC`);
}
console.log(`  Dry run        : ${isDryRun}`);
console.log("");

console.log("═".repeat(60));
console.log("  HANDOFF PROMPT (copy-paste into next session)");
console.log("═".repeat(60));
console.log("");
console.log(handoff);
console.log("");
console.log("═".repeat(60));
if (pushWasDeferred) {
  console.log(`  ⚠ AGENT: Push with credentials now → git push origin main (api_credentials=["github"])`);
}
console.log(`  Session end complete. ${errors === 0 ? "Safe to close." : "FIX ERRORS BEFORE CLOSING."}`);
console.log("═".repeat(60));
console.log("");
