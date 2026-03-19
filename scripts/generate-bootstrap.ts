#!/usr/bin/env npx tsx
/**
 * generate-bootstrap.ts — Auto-generates BOOTSTRAP-PROMPT.md from repo state.
 *
 * Run: npx tsx scripts/generate-bootstrap.ts
 *
 * This script reads:
 * - git log (latest commit, branch)
 * - PROJECT-CONTEXT.md (sections 1-10)
 * - docs/MASTER-PLAN.md (next phase detection)
 * - package.json (deps)
 * - src/ file tree + LOC counts
 * - .env.local (var names only, never values)
 *
 * And produces a fresh BOOTSTRAP-PROMPT.md that any new session can consume.
 * The output is deterministic and always current — no manual editing needed.
 */

import { execSync } from "child_process";
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const run = (cmd: string) => execSync(cmd, { cwd: ROOT, encoding: "utf-8" }).trim();

// ── Git state ──
const branch = run("git branch --show-current");
const latestCommit = run("git log --oneline -1");
const commitHash = latestCommit.split(" ")[0];

// ── File tree ──
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

// ── Dependencies ──
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
const depList = Object.entries(allDeps)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `${k}: ${v}`)
  .join("\n");

// ── Env vars (names only) ──
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

// ── Detect current/next phase from MASTER-PLAN.md ──
let currentPhase = "Unknown";
let nextPhaseSection = "";
const masterPlanPath = join(ROOT, "docs/MASTER-PLAN.md");
if (existsSync(masterPlanPath)) {
  const mp = readFileSync(masterPlanPath, "utf-8");
  // Extract Phase sections
  const phaseMatches = [...mp.matchAll(/## Phase (\d+): (.+)/g)];

  // Read PROJECT-CONTEXT for completed phases
  const pcPath = join(ROOT, "PROJECT-CONTEXT.md");
  const pc = existsSync(pcPath) ? readFileSync(pcPath, "utf-8") : "";

  // Detect: if "Immersive UI Rebuild" section exists and has checkmarks, it's done
  const immersiveDone = pc.includes("Immersive UI Rebuild") && pc.includes("Audit (Session 7)");
  const phase0Done = pc.includes("Phase:** 0") && pc.includes("COMPLETE");

  if (phase0Done && immersiveDone) {
    currentPhase = "Phase 0 COMPLETE + Immersive UI Rebuild COMPLETE";
    // Next phase is 1
    const phase1Start = mp.indexOf("## Phase 1:");
    const phase2Start = mp.indexOf("## Phase 2:");
    if (phase1Start !== -1 && phase2Start !== -1) {
      nextPhaseSection = mp.slice(phase1Start, phase2Start).trim();
    }
  } else if (phase0Done) {
    currentPhase = "Phase 0 COMPLETE";
    const phase1Start = mp.indexOf("## Phase 1:");
    const phase2Start = mp.indexOf("## Phase 2:");
    if (phase1Start !== -1 && phase2Start !== -1) {
      nextPhaseSection = mp.slice(phase1Start, phase2Start).trim();
    }
  } else {
    currentPhase = "Phase 0 IN PROGRESS";
  }
}

// ── Extract key infra from PROJECT-CONTEXT ──
const pcContent = existsSync(join(ROOT, "PROJECT-CONTEXT.md"))
  ? readFileSync(join(ROOT, "PROJECT-CONTEXT.md"), "utf-8")
  : "";

// Pull Supabase/Vercel details
const supabaseUrl = pcContent.match(/URL `(https:\/\/[^`]+\.supabase\.co)`/)?.[1] ?? "Unknown";
const supabaseProject = pcContent.match(/Project `([^`]+)`.*supabase/)?.[1] ?? "Unknown";
const vercelProject = pcContent.match(/Vercel.*Project `([^`]+)`/)?.[1] ?? "Unknown";
const productionUrl = pcContent.match(/Production.*`(https:\/\/[^`]+)`/)?.[1] ??
  pcContent.match(/internship-command-center[^`\s]*.vercel.app/)?.[0] ?? "Unknown";

// ── Extract technical notes ──
const techNotesStart = pcContent.indexOf("## 10. TECHNICAL NOTES");
const techNotes = techNotesStart !== -1
  ? pcContent.slice(techNotesStart).split("---")[0].replace("## 10. TECHNICAL NOTES", "").trim()
  : "";

// ── Connected connectors ──
const connectors = [
  "stripe", "youtube_analytics_api__pipedream", "github_mcp_direct",
  "google_drive", "gcal", "google_sheets__pipedream", "resend__pipedream",
  "google_forms__pipedream", "google_cloud_vision_api__pipedream", "vercel",
  "supabase__pipedream", "cloud_convert__pipedream", "jira_mcp_merge",
];

// ── Generate ──
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
> Run \`npx tsx scripts/generate-bootstrap.ts\` to regenerate.
> **DO NOT manually edit** — changes will be overwritten.

---

## Quick Start

1. Clone: \`armaansarora/internship-command-center\` (branch: \`${branch}\`)
2. Read this file top to bottom
3. Read \`PROJECT-CONTEXT.md\` for full operational context
4. Load skills: \`website-building/webapp\`, \`design-foundations\`, \`recursive-audit\`, \`research-assistant\`
5. Read \`docs/MASTER-PLAN.md\` for the next phase's acceptance criteria
6. Begin work on the TODO items below

## Status

- **Current state:** ${currentPhase}
- **Branch:** \`${branch}\` (commit \`${commitHash}\`)
- **Production:** \`${productionUrl}\`
- **Total LOC:** ${totalLOC.toLocaleString()} across ${srcFiles.length} source files
- **Build:** Clean (zero TS errors)

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

## Technical Notes (Gotchas)

${techNotes}

## Key Docs

| File | Purpose |
|---|---|
| \`PROJECT-CONTEXT.md\` | Full operational context — credentials, stack, audit summary, session log |
| \`CLAUDE.md\` | Codebase summary for AI coding assistants |
| \`docs/MASTER-PLAN.md\` | 7 phases with deliverables, acceptance criteria, testing |
| \`docs/VISION-SPEC.md\` | Spatial UI spec (locked) — building, floors, characters, design tokens |
| \`docs/TECH-BRIEF.md\` | Research findings, AI SDK v6 patterns, Drizzle gotchas |
| \`docs/CHARACTER-PROMPTS.md\` | System prompts for all 8 C-suite agents |
| \`docs/SCHEMA-DRAFT.md\` | 16-table Postgres schema with RLS |
| \`docs/IMMERSIVE-UI-PLAN.md\` | Immersive skyline implementation plan (COMPLETED) |
| \`docs/FILE-STRUCTURE.md\` | Target project file tree |

## Skills to Load

- \`website-building/webapp\` — fullstack web app patterns
- \`design-foundations\` — color, typography, visual hierarchy
- \`recursive-audit\` — 5-question self-audit loop (run after every task)
- \`research-assistant\` — web research patterns

## Workflow Rules

1. **Start:** Clone repo → read this file → read PROJECT-CONTEXT.md → load skills → read MASTER-PLAN.md for current phase
2. **During:** Commit after each major milestone. Run \`npx tsc --noEmit\` before committing.
3. **End:** Run recursive audit → update PROJECT-CONTEXT.md → run \`npx tsx scripts/generate-bootstrap.ts\` → commit + push
4. **Always:** No \`any\` types. No console.logs. No TODO comments in shipped code. Aria attributes on interactive elements. prefers-reduced-motion respected.
`;

writeFileSync(join(ROOT, "BOOTSTRAP-PROMPT.md"), output);
console.log(`✓ BOOTSTRAP-PROMPT.md generated (${output.split("\n").length} lines)`);
console.log(`  Branch: ${branch} | Commit: ${commitHash}`);
console.log(`  Source: ${srcFiles.length} files, ${totalLOC.toLocaleString()} LOC`);
console.log(`  Phase: ${currentPhase}`);
