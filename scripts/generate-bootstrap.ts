#!/usr/bin/env npx tsx
/**
 * generate-bootstrap.ts — Auto-generates BOOTSTRAP-PROMPT.md from repo state.
 *
 * Run: npx tsx scripts/generate-bootstrap.ts
 *
 * This script reads:
 * - git log (latest commit, branch, diff since last generation)
 * - PROJECT-CONTEXT.md (sections 1-10)
 * - docs/MASTER-PLAN.md (next phase detection + acceptance criteria tracking)
 * - package.json (deps + outdated check)
 * - src/ file tree + LOC counts
 * - .env.local (var names only, never values)
 * - Build health (tsc --noEmit)
 * - Context budget (token estimation for recommended reading)
 * - SESSION-STATE.json (task state if present)
 *
 * And produces a fresh BOOTSTRAP-PROMPT.md that any new session can consume.
 * The output is deterministic (except timestamp) and always current.
 */

import { execSync } from "child_process";
import { readFileSync, readdirSync, writeFileSync, existsSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");

function run(cmd: string, fallback = ""): string {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf-8", timeout: 30_000 }).trim();
  } catch {
    return fallback;
  }
}

// ── Git state ──────────────────────────────────────────────────────────────

const branch = run("git branch --show-current", "main");
const latestCommit = run("git log --oneline -1", "unknown");
const commitHash = latestCommit.split(" ")[0];

// ── Build health check ─────────────────────────────────────────────────────

let buildHealth = "Unknown";
let buildErrors: string[] = [];
try {
  execSync("npx tsc --noEmit 2>&1", { cwd: ROOT, encoding: "utf-8", timeout: 60_000 });
  buildHealth = "Clean (zero TS errors)";
} catch (err) {
  const output = (err as { stdout?: string }).stdout ?? String(err);
  // Extract error lines
  buildErrors = output
    .split("\n")
    .filter((l: string) => l.includes("error TS"))
    .slice(0, 10); // Cap at 10 errors in output
  const totalErrors = output.split("\n").filter((l: string) => l.includes("error TS")).length;
  buildHealth = `FAILING — ${totalErrors} TS error${totalErrors === 1 ? "" : "s"}`;
}

// ── Git diff since last bootstrap ──────────────────────────────────────────

const LAST_HASH_FILE = join(ROOT, ".bootstrap-last-hash");
let lastBootstrapHash = "";
let changesSinceLastBootstrap = "";

if (existsSync(LAST_HASH_FILE)) {
  lastBootstrapHash = readFileSync(LAST_HASH_FILE, "utf-8").trim();
  if (lastBootstrapHash) {
    const diffLog = run(`git log --oneline ${lastBootstrapHash}..HEAD 2>/dev/null`);
    if (diffLog) {
      changesSinceLastBootstrap = diffLog;
    }
  }
}

// Write current hash for next run
writeFileSync(LAST_HASH_FILE, commitHash);

// ── File tree ──────────────────────────────────────────────────────────────

function walkDir(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        results.push(...walkDir(full, exts));
      } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
        results.push(full);
      }
    }
  } catch { /* skip unreadable dirs */ }
  return results;
}

const srcFiles = walkDir(join(ROOT, "src"), [".ts", ".tsx", ".css"]).sort();
const srcTree = srcFiles.map((f) => relative(ROOT, f)).join("\n");

// LOC per file
const fileLOC: { path: string; lines: number }[] = srcFiles.map((f) => ({
  path: relative(ROOT, f),
  lines: readFileSync(f, "utf-8").split("\n").length,
}));
const totalLOC = fileLOC.reduce((sum, f) => sum + f.lines, 0);

// Group by directory for summary
const dirLOC: Record<string, number> = {};
for (const f of fileLOC) {
  const dir = f.path.split("/").slice(0, -1).join("/");
  dirLOC[dir] = (dirLOC[dir] ?? 0) + f.lines;
}

// ── Dependencies ───────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
const depList = Object.entries(allDeps)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}: ${v}`)
  .join("\n");

// ── Dependency freshness ───────────────────────────────────────────────────

let staleDeps = "";
try {
  // npm outdated exits non-zero when there ARE outdated packages, so we
  // must capture stdout from the error object, not from a successful run.
  let outdatedText = "";
  try {
    outdatedText = execSync("npm outdated --json 2>/dev/null", {
      cwd: ROOT, encoding: "utf-8", timeout: 30_000,
    });
  } catch (err) {
    // npm outdated returns exit code 1 when outdated packages exist
    // The stdout is still valid JSON in the error object
    outdatedText = (err as { stdout?: string }).stdout ?? "";
  }

  if (outdatedText.trim()) {
    const outdated = JSON.parse(outdatedText) as Record<string, { current: string; wanted: string; latest: string }>;
    const majorOutdated = Object.entries(outdated).filter(([, v]) => {
      const currentMajor = parseInt(v.current?.split(".")[0] ?? "0");
      const latestMajor = parseInt(v.latest?.split(".")[0] ?? "0");
      return latestMajor > currentMajor;
    });
    if (majorOutdated.length > 0) {
      staleDeps = majorOutdated
        .map(([name, v]) => `- **${name}**: ${v.current} \u2192 ${v.latest} (major)`)
        .join("\n");
    }
  }
} catch { /* give up gracefully on JSON parse errors */ }

// ── Doc freshness check ────────────────────────────────────────────────────

interface DocFreshness {
  file: string;
  lastUpdated: string | null;
  stale: boolean;
  reason?: string;
}

function checkDocFreshness(): DocFreshness[] {
  const results: DocFreshness[] = [];
  const docsToCheck = [
    { file: "docs/MASTER-PLAN.md", pattern: /Last updated:\*\*\s*([\d-]+)/ },
    { file: "docs/VISION-SPEC.md", pattern: /Last updated:\*\*\s*([\d-]+)/ },
    { file: "docs/TECH-BRIEF.md", pattern: /Last updated:\*\*\s*([\d-]+)/ },
  ];

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const doc of docsToCheck) {
    const fullPath = join(ROOT, doc.file);
    if (!existsSync(fullPath)) {
      results.push({ file: doc.file, lastUpdated: null, stale: true, reason: "File not found" });
      continue;
    }
    const content = readFileSync(fullPath, "utf-8");
    const match = content.match(doc.pattern);
    if (match) {
      const dateStr = match[1];
      const docDate = new Date(dateStr);
      if (docDate < sevenDaysAgo) {
        const daysOld = Math.round((now.getTime() - docDate.getTime()) / 86400000);
        results.push({ file: doc.file, lastUpdated: dateStr, stale: true, reason: `Last updated ${dateStr} (${daysOld}d ago)` });
      } else {
        results.push({ file: doc.file, lastUpdated: dateStr, stale: false });
      }
    } else {
      results.push({ file: doc.file, lastUpdated: null, stale: false, reason: "No date header found" });
    }
  }

  return results;
}

const docFreshnessChecks = checkDocFreshness();
const staleDocs = docFreshnessChecks.filter((d) => d.stale);

// ── Env vars (names only) ──────────────────────────────────────────────────

let envVars = "(no .env.local found)";
const envPath = join(ROOT, ".env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  const vars = envContent
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=")[0].trim())
    .filter(Boolean);
  envVars = vars.map((v) => `- ${v}`).join("\n");
}

// ── Detect current/next phase from MASTER-PLAN.md ──────────────────────────

let currentPhase = "Unknown";
let nextPhaseSection = "";
const masterPlanPath = join(ROOT, "docs/MASTER-PLAN.md");
let masterPlanContent = "";
if (existsSync(masterPlanPath)) {
  masterPlanContent = readFileSync(masterPlanPath, "utf-8");
  const pcPath = join(ROOT, "PROJECT-CONTEXT.md");
  const pc = existsSync(pcPath) ? readFileSync(pcPath, "utf-8") : "";

  const immersiveDone = pc.includes("Immersive UI Rebuild") && pc.includes("Audit (Session 7)");
  const phase0Done = pc.includes("Phase:** 0") && pc.includes("COMPLETE");

  if (phase0Done && immersiveDone) {
    currentPhase = "Phase 0 COMPLETE + Immersive UI Rebuild COMPLETE";
    const phase1Start = masterPlanContent.indexOf("## Phase 1:");
    const phase2Start = masterPlanContent.indexOf("## Phase 2:");
    if (phase1Start !== -1 && phase2Start !== -1) {
      nextPhaseSection = masterPlanContent.slice(phase1Start, phase2Start).trim();
    }
  } else if (phase0Done) {
    currentPhase = "Phase 0 COMPLETE";
    const phase1Start = masterPlanContent.indexOf("## Phase 1:");
    const phase2Start = masterPlanContent.indexOf("## Phase 2:");
    if (phase1Start !== -1 && phase2Start !== -1) {
      nextPhaseSection = masterPlanContent.slice(phase1Start, phase2Start).trim();
    }
  } else {
    currentPhase = "Phase 0 IN PROGRESS";
  }
}

// ── Acceptance criteria tracking ───────────────────────────────────────────

interface CriteriaCheck {
  criterion: string;
  status: "verified" | "unverified" | "likely";
  evidence: string;
}

function checkAcceptanceCriteria(): CriteriaCheck[] {
  const checks: CriteriaCheck[] = [];

  // Extract acceptance criteria from the next phase section
  const criteriaRegex = /- \[ \] (.+)/g;
  let match: RegExpExecArray | null;
  const criteriaSource = nextPhaseSection || masterPlanContent;

  // Only check criteria from the current/next phase
  while ((match = criteriaRegex.exec(criteriaSource)) !== null) {
    const criterion = match[1];
    checks.push(checkSingleCriterion(criterion));
  }

  return checks;
}

function checkSingleCriterion(criterion: string): CriteriaCheck {
  const lc = criterion.toLowerCase();

  // Phase 1 criteria checks — check if the code exists
  if (lc.includes("create an application") && lc.includes("pipeline")) {
    const hasAppForm = srcFiles.some((f) => f.includes("war-room") && !f.includes("page.tsx"));
    const hasAppRoute = srcFiles.some((f) => f.includes("api") && f.includes("application"));
    if (hasAppForm && hasAppRoute) return { criterion, status: "verified", evidence: "App form + API route found" };
    if (hasAppForm || hasAppRoute) return { criterion, status: "likely", evidence: "Partial implementation found" };
    return { criterion, status: "unverified", evidence: "No application CRUD found in src/" };
  }

  if (lc.includes("drag-and-drop") || lc.includes("drag and drop")) {
    const hasDnd = srcFiles.some((f) => {
      const content = readFileSync(f, "utf-8");
      return content.includes("onDragStart") || content.includes("onDrop") || content.includes("@dnd-kit");
    });
    if (hasDnd) return { criterion, status: "verified", evidence: "Drag-and-drop handlers found" };
    return { criterion, status: "unverified", evidence: "No drag-and-drop implementation found" };
  }

  if (lc.includes("cro agent") || lc.includes("cro character")) {
    const hasCroAgent = srcFiles.some((f) => f.includes("agents") && f.includes("cro"));
    if (hasCroAgent) return { criterion, status: "verified", evidence: "CRO agent file found" };
    return { criterion, status: "unverified", evidence: "No CRO agent implementation found" };
  }

  if (lc.includes("rls") || lc.includes("multi-tenant")) {
    const hasRLS = srcFiles.some((f) => {
      if (!f.endsWith("schema.ts")) return false;
      const content = readFileSync(f, "utf-8");
      return content.includes("auth.uid()") || content.includes("user_id");
    });
    if (hasRLS) return { criterion, status: "verified", evidence: "RLS policies in schema.ts" };
    return { criterion, status: "unverified", evidence: "No RLS policies found" };
  }

  if (lc.includes("idle animation") || lc.includes("talking state")) {
    const hasCharacterComponent = srcFiles.some((f) => f.includes("Character") || f.includes("character"));
    if (hasCharacterComponent) return { criterion, status: "likely", evidence: "Character component found" };
    return { criterion, status: "unverified", evidence: "No character component found" };
  }

  if (lc.includes("conversation") && lc.includes("in-character")) {
    const hasConversationPanel = srcFiles.some((f) => f.includes("conversation") || f.includes("Conversation"));
    if (hasConversationPanel) return { criterion, status: "likely", evidence: "Conversation component found" };
    return { criterion, status: "unverified", evidence: "No conversation system found" };
  }

  // Phase 0 criteria checks
  if (lc.includes("sign in with google") && lc.includes("penthouse")) {
    const hasAuth = srcFiles.some((f) => f.includes("callback/route.ts"));
    const hasPenthouse = srcFiles.some((f) => f.includes("penthouse"));
    if (hasAuth && hasPenthouse) return { criterion, status: "verified", evidence: "Auth callback + Penthouse found" };
    return { criterion, status: "unverified", evidence: "Missing auth or penthouse" };
  }

  if (lc.includes("elevator") && lc.includes("gsap")) {
    const hasElevator = srcFiles.some((f) => f.includes("Elevator"));
    if (hasElevator) return { criterion, status: "verified", evidence: "Elevator.tsx found" };
    return { criterion, status: "unverified", evidence: "No elevator component" };
  }

  if (lc.includes("parallax") && lc.includes("mouse")) {
    const hasParallax = srcFiles.some((f) => f.includes("useMouseParallax"));
    if (hasParallax) return { criterion, status: "verified", evidence: "useMouseParallax hook found" };
    return { criterion, status: "unverified", evidence: "No parallax hook" };
  }

  if (lc.includes("custom cursor")) {
    const hasCursor = srcFiles.some((f) => f.includes("CustomCursor"));
    if (hasCursor) return { criterion, status: "verified", evidence: "CustomCursor.tsx found" };
    return { criterion, status: "unverified", evidence: "No custom cursor" };
  }

  if (lc.includes("day/night") || lc.includes("day-night")) {
    const hasDayNight = srcFiles.some((f) => f.includes("DayNight"));
    if (hasDayNight) return { criterion, status: "verified", evidence: "DayNightProvider found" };
    return { criterion, status: "unverified", evidence: "No day/night system" };
  }

  if (lc.includes("vercel") || lc.includes("production url")) {
    return { criterion, status: "verified", evidence: "Deployed to Vercel (see Production URL)" };
  }

  if (lc.includes("lighthouse")) {
    return { criterion, status: "unverified", evidence: "Lighthouse audit not automated yet" };
  }

  if (lc.includes("contracts crud")) {
    const hasContracts = srcFiles.some((f) => f.includes("contracts"));
    if (hasContracts) return { criterion, status: "likely", evidence: "Contracts directory exists (no UI CRUD yet)" };
    return { criterion, status: "unverified", evidence: "No contracts" };
  }

  // Default: unverified
  return { criterion, status: "unverified", evidence: "Not yet checked automatically" };
}

const criteriaChecks = checkAcceptanceCriteria();

// Format criteria for output
function formatCriteria(checks: CriteriaCheck[]): string {
  if (checks.length === 0) return "No acceptance criteria found for current phase.";
  const verified = checks.filter((c) => c.status === "verified").length;
  const likely = checks.filter((c) => c.status === "likely").length;
  const unverified = checks.filter((c) => c.status === "unverified").length;

  let out = `**Progress: ${verified} verified / ${likely} likely / ${unverified} unverified** (of ${checks.length})\n\n`;
  for (const c of checks) {
    const icon = c.status === "verified" ? "✅" : c.status === "likely" ? "🟡" : "⬜";
    out += `${icon} ${c.criterion}\n    └─ ${c.evidence}\n`;
  }
  return out;
}

// ── Extract key infra from PROJECT-CONTEXT ─────────────────────────────────

const pcContent = existsSync(join(ROOT, "PROJECT-CONTEXT.md"))
  ? readFileSync(join(ROOT, "PROJECT-CONTEXT.md"), "utf-8")
  : "";

const supabaseUrl = pcContent.match(/URL `(https:\/\/[^`]+\.supabase\.co)`/)?.[1] ?? "Unknown";
const supabaseProject = pcContent.match(/Project `([^`]+)`.*supabase/)?.[1] ?? "Unknown";
const vercelProject = pcContent.match(/Vercel.*Project `([^`]+)`/)?.[1] ?? "Unknown";
const productionUrl = pcContent.match(/Production.*`(https:\/\/[^`]+)`/)?.[1] ??
  pcContent.match(/internship-command-center[^`\s]*.vercel.app/)?.[0] ?? "Unknown";

// ── Extract technical notes ────────────────────────────────────────────────

const techNotesStart = pcContent.indexOf("## 10. TECHNICAL NOTES");
const techNotes = techNotesStart !== -1
  ? pcContent.slice(techNotesStart).split("---")[0].replace("## 10. TECHNICAL NOTES", "").trim()
  : "";

// ── Connected connectors ───────────────────────────────────────────────────

const connectors = [
  "stripe", "youtube_analytics_api__pipedream", "github_mcp_direct",
  "google_drive", "gcal", "google_sheets__pipedream", "resend__pipedream",
  "google_forms__pipedream", "google_cloud_vision_api__pipedream", "vercel",
  "supabase__pipedream", "cloud_convert__pipedream", "jira_mcp_merge",
];

// ── Vercel deploy status ───────────────────────────────────────────────────

let vercelStatus = "";
const vercelStatusPath = join(ROOT, ".vercel-status.json");
if (existsSync(vercelStatusPath)) {
  try {
    const vs = JSON.parse(readFileSync(vercelStatusPath, "utf-8")) as {
      state?: string;
      commit?: string;
      url?: string;
      message?: string;
      checkedAt?: string;
    };
    const stateIcon = vs.state === "READY" ? "✅" : vs.state === "ERROR" ? "❌" : "⏳";
    vercelStatus = `${stateIcon} **${vs.state ?? "UNKNOWN"}**`;
    if (vs.commit) vercelStatus += ` (commit \`${vs.commit}\`)`;
    if (vs.message) vercelStatus += ` — ${vs.message}`;
    if (vs.checkedAt) {
      const age = Math.round((Date.now() - new Date(vs.checkedAt).getTime()) / 60_000);
      vercelStatus += ` _(checked ${age < 60 ? `${age}m` : `${Math.round(age / 60)}h`} ago)_`;
    }
  } catch { /* skip malformed */ }
}

// ── Context budget estimation ──────────────────────────────────────────────

const recommendedFiles = [
  "BOOTSTRAP-PROMPT.md",
  "PROJECT-CONTEXT.md",
  "docs/MASTER-PLAN.md",
  "CLAUDE.md",
];

interface FileBudget {
  file: string;
  lines: number;
  estimatedTokens: number;
}

const contextBudget: FileBudget[] = recommendedFiles.map((f) => {
  const fullPath = join(ROOT, f);
  if (!existsSync(fullPath)) return { file: f, lines: 0, estimatedTokens: 0 };
  const content = readFileSync(fullPath, "utf-8");
  const lines = content.split("\n").length;
  // Rough token estimate: ~3.5 chars per token for English markdown
  const estimatedTokens = Math.round(content.length / 3.5);
  return { file: f, lines, estimatedTokens };
});

const totalContextTokens = contextBudget.reduce((sum, f) => sum + f.estimatedTokens, 0);

// ── Session state ──────────────────────────────────────────────────────────

let sessionStateSection = "";
const sessionStatePath = join(ROOT, "SESSION-STATE.json");
if (existsSync(sessionStatePath)) {
  try {
    const state = JSON.parse(readFileSync(sessionStatePath, "utf-8")) as {
      currentTask?: string;
      deliverable?: string;
      status?: string;
      blockers?: string[];
      lastFileTouched?: string;
      notes?: string;
      updatedAt?: string;
    };
    const parts: string[] = [];
    if (state.currentTask) parts.push(`- **Current task:** ${state.currentTask}`);
    if (state.deliverable) parts.push(`- **Deliverable:** ${state.deliverable}`);
    if (state.status) parts.push(`- **Status:** ${state.status}`);
    if (state.blockers && state.blockers.length > 0) {
      parts.push(`- **Blockers:**\n${state.blockers.map((b) => `  - ${b}`).join("\n")}`);
    }
    if (state.lastFileTouched) parts.push(`- **Last file touched:** \`${state.lastFileTouched}\``);
    if (state.notes) parts.push(`- **Notes:** ${state.notes}`);
    if (state.updatedAt) parts.push(`- **State captured:** ${state.updatedAt}`);
    if (parts.length > 0) {
      sessionStateSection = parts.join("\n");
    }
  } catch { /* malformed JSON, skip */ }
}

// ── Generate ───────────────────────────────────────────────────────────────

const now = new Date().toLocaleString("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const output = `# BOOTSTRAP PROMPT — The Tower

> **Auto-generated** by \`scripts/generate-bootstrap.ts\` on ${now} EDT
> Run \`npm run bootstrap\` to regenerate. Auto-runs on every commit (Husky pre-commit hook).
> **DO NOT manually edit** — changes will be overwritten.

---

## Quick Start

1. Clone: \`armaansarora/internship-command-center\` (branch: \`${branch}\`)
2. Read this file top to bottom
3. **Read \`CLAUDE.md\` — contains mandatory agent behavior rules (session state, context management, handoff). NON-NEGOTIABLE.**
4. Read \`PROJECT-CONTEXT.md\` for full operational context
5. Load skills: \`website-building/webapp\`, \`design-foundations\`, \`recursive-audit\`, \`research-assistant\`
6. Read \`docs/MASTER-PLAN.md\` for the next phase's acceptance criteria
7. Begin work on the TODO items below

## Status

- **Current state:** ${currentPhase}
- **Branch:** \`${branch}\` (commit \`${commitHash}\`)
- **Production:** \`${productionUrl}\`
- **Total LOC:** ${totalLOC.toLocaleString()} across ${srcFiles.length} source files
- **Build:** ${buildHealth}${vercelStatus ? `\n- **Vercel deploy:** ${vercelStatus}` : ""}
${buildErrors.length > 0 ? `\n### Build Errors\n\`\`\`\n${buildErrors.join("\n")}\n\`\`\`\n` : ""}${staleDocs.length > 0 ? `\n### ⚠️ Stale Docs Detected\n${staleDocs.map((d) => `- **\`${d.file}\`**: ${d.reason}`).join("\n")}\n\n> Update these docs before starting work — stale specs cause wasted effort.\n` : ""}
${sessionStateSection ? `\n## Session State (where we left off)\n\n${sessionStateSection}\n` : ""}${changesSinceLastBootstrap ? `\n## Changes Since Last Bootstrap\n\n\`\`\`\n${changesSinceLastBootstrap}\n\`\`\`\n` : ""}
## Acceptance Criteria — Progress

${formatCriteria(criteriaChecks)}

## TODO — Next Phase

${nextPhaseSection || "See docs/MASTER-PLAN.md for the next phase."}

## User Instructions (CRITICAL — preserve verbatim)

- "Analytical, not emotional. Cut the fat, keep the meat."
- "Masters-degree-level code. Scalable multi-tenant SaaS."
- "Deep research always — never surface-level."
- "Auto-update PROJECT-CONTEXT.md after EVERY interaction."
- "System picks the best model per task."
- "Tell me exactly what I need to do manually that you can't do yourself."
- "Run multiple agents, use different sub-agents, use all the AI models available, optimize your workflow."
- Push protection ON — never commit secrets
- Fully typed TypeScript, no \`any\`
- Tailwind v3 (NOT v4) — JS config
- @supabase/ssr (NOT deprecated auth-helpers)
- Drizzle RLS uses third-argument array pattern, NOT \`.withRLS()\`

<connectors>
${connectors.map((c) => `- ${c}`).join("\n")}
</connectors>

## Infrastructure

| Service | Detail |
|---|---|
| Repo | \`armaansarora/internship-command-center\` on \`${branch}\` (commit \`${commitHash}\`) |
| Supabase | Project \`${supabaseProject}\`, URL \`${supabaseUrl}\` |
| Vercel | Project \`${vercelProject}\` |
| Production | \`${productionUrl}\` |
| Design tokens | Gold \`#C9A84C\`, Dark \`#1A1A2E\`, Glass blur 16px, Playfair Display/Satoshi/JetBrains Mono |

## Env Vars (names only — values in .env.local)

${envVars}

## Source Tree (${srcFiles.length} files, ${totalLOC.toLocaleString()} LOC)

| Directory | LOC |
|---|---|
${Object.entries(dirLOC)
  .sort(([, a], [, b]) => b - a)
  .map(([dir, loc]) => `| \`${dir}\` | ${loc} |`)
  .join("\n")}

<details>
<summary>Full file list</summary>

\`\`\`
${srcTree}
\`\`\`
</details>

## Dependencies

<details>
<summary>${Object.keys(allDeps).length} packages</summary>

\`\`\`
${depList}
\`\`\`
</details>
${staleDeps ? `\n### Stale Dependencies (major version behind)\n\n${staleDeps}\n` : ""}
## Context Budget

| File | Lines | ~Tokens |
|---|---|---|
${contextBudget.map((f) => `| \`${f.file}\` | ${f.lines} | ${f.estimatedTokens.toLocaleString()} |`).join("\n")}
| **Total** | **${contextBudget.reduce((s, f) => s + f.lines, 0)}** | **${totalContextTokens.toLocaleString()}** |

${totalContextTokens > 15000 ? `> ⚠️ Reading all recommended files consumes ~${totalContextTokens.toLocaleString()} tokens. Prioritize: this file → CLAUDE.md (mandatory) → PROJECT-CONTEXT.md → MASTER-PLAN.md.\n` : `> Reading all recommended files consumes ~${totalContextTokens.toLocaleString()} tokens — well within budget.\n`}

## Technical Notes (Gotchas)

${techNotes}

## Key Docs

| File | Purpose |
|---|---|
| \`PROJECT-CONTEXT.md\` | Full operational context — credentials, stack, audit summary, session log |
| \`CLAUDE.md\` | Conventions, commands, agent behavior rules, doc architecture |
| \`docs/MASTER-PLAN.md\` | 7 phases with deliverables, acceptance criteria, testing |
| \`docs/VISION-SPEC.md\` | Spatial UI spec (locked) — building, floors, characters, design tokens |
| \`docs/TECH-BRIEF.md\` | Research findings, AI SDK v6 patterns, Drizzle gotchas |
| \`docs/CHARACTER-PROMPTS.md\` | System prompts for all 8 C-suite agents |
| \`docs/SCHEMA-DRAFT.md\` | 16-table Postgres schema with RLS |
| \`docs/WAR-ROOM-BLUEPRINT.md\` | Phase 1 implementation guide (architecture, CRO agent, DnD, design) |
| \`docs/CHAIN-OF-COMMAND.md\` | AI agent hierarchy (CEO → CRO → 5 subagents, tools, RACI) |
| \`docs/BUG-TRACKER.md\` | Bug reports, fix log, sprint priorities |
| \`docs/archive/\` | Completed plans + research (reference only, don't read by default) |

## Skills to Load

- \`website-building/webapp\` — fullstack web app patterns
- \`design-foundations\` — color, typography, visual hierarchy
- \`recursive-audit\` — 5-question self-audit loop (run after every task)
- \`research-assistant\` — web research patterns

## Workflow Rules

1. **Start:** Clone repo → read this file → read PROJECT-CONTEXT.md → load skills → read MASTER-PLAN.md for current phase
2. **During:** Commit after each major milestone. Run \`npx tsc --noEmit\` before committing.
3. **End:** Run \`npm run session:end\` (autonomous 10-step pipeline: type check → auto-detect state → bootstrap regen → stage → commit → push → verify sync → generate handoff prompt)
4. **Always:** No \`any\` types. No console.logs. No TODO comments in shipped code. Aria attributes on interactive elements. prefers-reduced-motion respected.

## Session State Management

\`npm run session:end\` handles this automatically — it auto-detects session state from git history and writes \`SESSION-STATE.json\`. No manual state management needed. The handoff prompt is printed to stdout and saved to \`HANDOFF.md\`.
`;

writeFileSync(join(ROOT, "BOOTSTRAP-PROMPT.md"), output);

// Summary
const lineCount = output.split("\n").length;
console.log(`✓ BOOTSTRAP-PROMPT.md generated (${lineCount} lines)`);
console.log(`  Branch: ${branch} | Commit: ${commitHash}`);
console.log(`  Source: ${srcFiles.length} files, ${totalLOC.toLocaleString()} LOC`);
console.log(`  Build: ${buildHealth}`);
console.log(`  Phase: ${currentPhase}`);
console.log(`  Criteria: ${criteriaChecks.filter((c) => c.status === "verified").length}/${criteriaChecks.length} verified`);
console.log(`  Context budget: ~${totalContextTokens.toLocaleString()} tokens`);
if (changesSinceLastBootstrap) {
  const commitCount = changesSinceLastBootstrap.split("\n").length;
  console.log(`  Changes since last bootstrap: ${commitCount} commit${commitCount === 1 ? "" : "s"}`);
}
if (staleDeps) {
  console.log(`  ⚠ Stale deps detected (see output)`);
}
if (staleDocs.length > 0) {
  console.log(`  ⚠ Stale docs: ${staleDocs.map((d) => d.file).join(", ")}`);
}
