#!/usr/bin/env npx tsx
/**
 * auto-organize-docs.ts — Automated documentation maintenance.
 *
 * Runs on every commit (via Husky pre-commit hook) alongside generate-bootstrap.ts.
 * Handles 4 automations:
 *
 * 1. AUTO-ARCHIVE: Moves Tier 3 docs to docs/archive/ when stale (>30d) + unreferenced by src/
 * 2. AUTO-GENERATE KEY COMPONENTS: Rewrites CLAUDE.md "Key Components" section from src/ tree
 * 3. AUTO-GENERATE DOC MAP: Rewrites PROJECT-CONTEXT.md "Document Map" table with real line counts
 * 4. AUTO-APPEND SESSION LOG: Appends session entry to PROJECT-CONTEXT.md from SESSION-STATE.json
 *
 * Idempotent — safe to run multiple times. Only modifies files when actual changes are needed.
 */

import { execSync } from "child_process";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  renameSync,
} from "fs";
import { join, relative, basename, dirname } from "path";
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

// Track what we changed for summary output
const changes: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTO-ARCHIVE — Move stale, unreferenced Tier 3 docs to docs/archive/
// ─────────────────────────────────────────────────────────────────────────────

function autoArchiveStaleDocs(): void {
  // Tier 3 reference specs — candidates for archival
  // Excludes: MASTER-PLAN (always needed), VISION-SPEC (locked design spec), TECH-BRIEF (active gotchas)
  const archiveCandidates = [
    "docs/IMMERSIVE-UI-PLAN.md",
    "docs/AUDIT.md",
  ];

  // Also check docs/research/ for any non-archived research files
  const researchDir = join(ROOT, "docs/research");
  if (existsSync(researchDir)) {
    const researchFiles = readdirSync(researchDir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => `docs/research/${f}`);
    archiveCandidates.push(...researchFiles);
  }

  // Check which docs are referenced by source code
  const srcContent = getAllSrcContent();

  const archiveDir = join(ROOT, "docs/archive");
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  for (const docPath of archiveCandidates) {
    const fullPath = join(ROOT, docPath);
    if (!existsSync(fullPath)) continue;

    // Check if any source file references this doc
    const docName = basename(docPath);
    const isReferenced = srcContent.includes(docName) ||
      srcContent.includes(docPath);

    if (isReferenced) continue; // Still referenced, don't archive

    // Check staleness via git last modification
    const lastModified = getGitLastModified(docPath);
    const daysSinceModified = lastModified
      ? Math.round((Date.now() - lastModified.getTime()) / 86400000)
      : 999;

    if (daysSinceModified < 30) continue; // Recently modified, keep it

    // Move to archive
    const archiveSubdir = docPath.includes("research/")
      ? join(archiveDir, "research")
      : archiveDir;
    if (!existsSync(archiveSubdir)) {
      mkdirSync(archiveSubdir, { recursive: true });
    }

    const destPath = join(archiveSubdir, docName);
    if (!existsSync(destPath)) {
      renameSync(fullPath, destPath);
      changes.push(`📦 Archived: ${docPath} → docs/archive/${docPath.includes("research/") ? "research/" : ""}${docName} (${daysSinceModified}d stale, unreferenced)`);
    }
  }

  // Clean up empty docs/research/ directory
  if (existsSync(researchDir)) {
    const remaining = readdirSync(researchDir);
    if (remaining.length === 0) {
      try {
        execSync(`rmdir "${researchDir}"`, { cwd: ROOT });
        changes.push("🗑️ Removed empty docs/research/ directory");
      } catch { /* non-empty or permissions */ }
    }
  }
}

function getAllSrcContent(): string {
  const srcDir = join(ROOT, "src");
  if (!existsSync(srcDir)) return "";
  const files = walkDir(srcDir, [".ts", ".tsx"]);
  return files.map((f) => readFileSync(f, "utf-8")).join("\n");
}

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

function getGitLastModified(filePath: string): Date | null {
  const dateStr = run(`git log -1 --format=%aI -- "${filePath}" 2>/dev/null`);
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. AUTO-GENERATE KEY COMPONENTS — Rewrite CLAUDE.md section from src/ tree
// ─────────────────────────────────────────────────────────────────────────────

interface ComponentInfo {
  name: string;
  path: string;
  lines: number;
  description: string;
}

function extractComponentDescription(filePath: string): string {
  const content = readFileSync(filePath, "utf-8");
  // Try to extract from JSDoc comment (/** ... */)
  const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)(?:\n|\*\/)/);
  if (jsdocMatch) return jsdocMatch[1].trim();

  // Try to extract from a component-level // comment that describes the component
  // Match: // ComponentName — description  or  // ComponentName - description
  const lines = content.split("\n");
  for (const line of lines.slice(0, 30)) {
    const trimmed = line.trim();
    const namedComment = trimmed.match(/^\/\/\s*\w+\s*[\u2014\u2013-]+\s*(.+)/);
    if (namedComment && namedComment[1].length > 10) {
      return namedComment[1].trim();
    }
  }

  // Infer from common patterns in code
  if (content.includes("useEffect") && content.includes("canvas"))
    return "Canvas-based procedural renderer";
  if (content.includes("createContext")) return "React context provider";
  if (content.includes("gsap") || content.includes("GSAP"))
    return "GSAP-animated component";

  return "";
}

function autoGenerateKeyComponents(): void {
  const claudePath = join(ROOT, "CLAUDE.md");
  if (!existsSync(claudePath)) return;

  const claudeContent = readFileSync(claudePath, "utf-8");

  // Find all component files
  const componentFiles = [
    ...walkDir(join(ROOT, "src/components"), [".tsx"]),
  ].sort();

  if (componentFiles.length === 0) return;

  const components: ComponentInfo[] = componentFiles.map((f) => {
    const content = readFileSync(f, "utf-8");
    return {
      name: basename(f),
      path: relative(ROOT, f),
      lines: content.split("\n").length,
      description: extractComponentDescription(f),
    };
  });

  // Also include key *-client.tsx page files (they're effectively components)
  const clientPages = walkDir(join(ROOT, "src/app"), [".tsx"])
    .filter((f) => f.includes("-client.tsx"))
    .sort();

  for (const f of clientPages) {
    const content = readFileSync(f, "utf-8");
    components.push({
      name: basename(f),
      path: relative(ROOT, f),
      lines: content.split("\n").length,
      description: extractComponentDescription(f),
    });
  }

  // Sort once, largest first. CLAUDE.md embeds only the top slice so the
  // file stays under Claude Code's 40k-char perf threshold; the full map
  // lives in docs/KEY-COMPONENTS.md and is one Read away for agents.
  const sorted = [...components].sort((a, b) => b.lines - a.lines);
  const CLAUDE_MD_TOP_N = 25;

  const renderLine = (c: ComponentInfo): string => {
    const desc = c.description ? ` — ${c.description}` : "";
    return `- \`${c.path}\` (${c.lines} LOC)${desc}`;
  };

  const topLines = sorted.slice(0, CLAUDE_MD_TOP_N).map(renderLine).join("\n");
  const fullLines = sorted.map(renderLine).join("\n");

  const pointer = `\n\n> ${sorted.length - CLAUDE_MD_TOP_N} smaller components omitted — full list in \`docs/KEY-COMPONENTS.md\`.`;
  const newSection = `## Key Components\n\n> Auto-generated by \`scripts/auto-organize-docs.ts\`. Top ${CLAUDE_MD_TOP_N} by LOC. Do not edit manually.\n\n${topLines}${sorted.length > CLAUDE_MD_TOP_N ? pointer : ""}\n`;

  // Write the full list to its sibling file.
  const fullPath = join(ROOT, "docs/KEY-COMPONENTS.md");
  const fullContent = `# Key Components (full map)\n\n> Auto-generated by \`scripts/auto-organize-docs.ts\`. Do not edit manually.\n> CLAUDE.md embeds the top ${CLAUDE_MD_TOP_N} of these by LOC; this file is the complete list.\n\n${fullLines}\n`;
  const priorFull = existsSync(fullPath) ? readFileSync(fullPath, "utf-8") : "";
  if (priorFull !== fullContent) {
    writeFileSync(fullPath, fullContent);
    changes.push(`🔧 docs/KEY-COMPONENTS.md: ${sorted.length} entries (full component map)`);
  }

  // Replace existing section in CLAUDE.md
  const sectionRegex = /## Key Components[\s\S]*?(?=\n## |\n$)/;
  if (sectionRegex.test(claudeContent)) {
    const oldSection = claudeContent.match(sectionRegex)?.[0] ?? "";
    const newContent = claudeContent.replace(sectionRegex, newSection);
    if (newContent !== claudeContent) {
      writeFileSync(claudePath, newContent);
      const oldCount = (oldSection.match(/^- /gm) ?? []).length;
      const newCount = Math.min(sorted.length, CLAUDE_MD_TOP_N);
      if (oldCount !== newCount) {
        changes.push(`🔧 CLAUDE.md Key Components: ${oldCount} → ${newCount} entries (top-${CLAUDE_MD_TOP_N} embed)`);
      } else {
        changes.push("🔧 CLAUDE.md Key Components: refreshed descriptions/LOC counts");
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. AUTO-GENERATE DOC MAP — Rewrite PROJECT-CONTEXT.md section 6
// ─────────────────────────────────────────────────────────────────────────────

interface DocInfo {
  path: string;
  purpose: string;
  lines: number;
}

function getDocPurpose(filePath: string): string {
  const name = basename(filePath);
  const purposeMap: Record<string, string> = {
    "PROJECT-CONTEXT.md": "Operational context, credentials, stack, audit summary, session log (root)",
    "BOOTSTRAP-PROMPT.md": "Auto-generated session entry point — source tree, build health, acceptance criteria (root)",
    "CLAUDE.md": "Codebase summary, conventions, agent behavior rules, doc architecture (root)",
    "MASTER-PLAN.md": "7 phases with deliverables, acceptance criteria, testing strategy",
    "VISION-SPEC.md": "Locked spatial UI spec: building, floors, characters, cursor, day/night, design tokens",
    "TECH-BRIEF.md": "Research synthesis + Google OAuth setup, SDK patterns, gotchas",
    "SCHEMA-DRAFT.md": "16-table Postgres schema: RLS, pgvector HNSW indexes, post-push SQL triggers",
    "CHARACTER-PROMPTS.md": "System prompts for all 8 characters + Concierge, multi-tenant ready",
    "WAR-ROOM-BLUEPRINT.md": "Phase 1 implementation guide — architecture, CRO agent, DnD, design tokens",
    "CHAIN-OF-COMMAND.md": "AI agent hierarchy: CEO → CRO → 5 subagents, system prompts, tools, RACI",
    "BUG-TRACKER.md": "Bug reports, fix log, sprint priorities",
  };

  // Try to get from the first heading or description line
  if (purposeMap[name]) return purposeMap[name];

  // Fallback: extract from first non-empty, non-heading line
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---") && !trimmed.startsWith(">")) {
      return trimmed.slice(0, 80);
    }
  }
  return "";
}

function autoGenerateDocMap(): void {
  const pcPath = join(ROOT, "PROJECT-CONTEXT.md");
  if (!existsSync(pcPath)) return;

  const pcContent = readFileSync(pcPath, "utf-8");

  // Collect all active docs
  const docs: DocInfo[] = [];

  // Root docs
  for (const name of ["PROJECT-CONTEXT.md", "BOOTSTRAP-PROMPT.md", "CLAUDE.md"]) {
    const fullPath = join(ROOT, name);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, "utf-8");
      docs.push({
        path: name,
        purpose: getDocPurpose(fullPath),
        lines: content.split("\n").length,
      });
    }
  }

  // docs/ directory (non-archive)
  const docsDir = join(ROOT, "docs");
  if (existsSync(docsDir)) {
    const docFiles = readdirSync(docsDir)
      .filter((f) => f.endsWith(".md"))
      .sort();
    for (const name of docFiles) {
      const fullPath = join(docsDir, name);
      const content = readFileSync(fullPath, "utf-8");
      docs.push({
        path: `docs/${name}`,
        purpose: getDocPurpose(fullPath),
        lines: content.split("\n").length,
      });
    }
  }

  // Archive entry (just a summary)
  const archiveDir = join(ROOT, "docs/archive");
  if (existsSync(archiveDir)) {
    const archiveFiles = walkDir(archiveDir, [".md"]);
    if (archiveFiles.length > 0) {
      docs.push({
        path: "docs/archive/",
        purpose: `Completed plans + research (${archiveFiles.length} files, reference only)`,
        lines: 0,
      });
    }
  }

  // Generate new table (round line counts to nearest 10 to prevent self-referential churn)
  const tableRows = docs
    .map((d) => {
      const rounded = d.lines > 0 ? Math.round(d.lines / 10) * 10 : 0;
      const lineStr = rounded > 0 ? `~${rounded}` : "varies";
      return `| \`${d.path}\` | ${d.purpose} | ${lineStr} |`;
    })
    .join("\n");

  const newSection = `## 6. DOCUMENT MAP\n\n> Auto-generated by \`scripts/auto-organize-docs.ts\`. Do not edit manually.\n\nAll planning docs are in \`docs/\`. Operational files stay in root.\n\n| File | Purpose | Lines |\n|---|---|---|\n${tableRows}`;

  // Replace existing section 6
  const sectionRegex = /## 6\. DOCUMENT MAP[\s\S]*?(?=\n## 7\.)/;
  if (sectionRegex.test(pcContent)) {
    const newContent = pcContent.replace(sectionRegex, newSection + "\n\n");
    if (newContent !== pcContent) {
      writeFileSync(pcPath, newContent);
      changes.push(`📋 PROJECT-CONTEXT.md §6 Doc Map: auto-updated with ${docs.length} entries and real line counts`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AUTO-APPEND SESSION LOG — Add entry from SESSION-STATE.json
// ─────────────────────────────────────────────────────────────────────────────

interface SessionState {
  currentTask?: string;
  deliverable?: string;
  status?: string;
  blockers?: string[];
  lastFileTouched?: string;
  notes?: string;
  filesChanged?: string[];
  commitCount?: number;
  locAdded?: number;
  locRemoved?: number;
  updatedAt?: string;
  sessionLogWritten?: boolean;
}

function autoAppendSessionLog(): void {
  const statePath = join(ROOT, "SESSION-STATE.json");
  const pcPath = join(ROOT, "PROJECT-CONTEXT.md");
  if (!existsSync(statePath) || !existsSync(pcPath)) return;

  let state: SessionState;
  try {
    state = JSON.parse(readFileSync(statePath, "utf-8")) as SessionState;
  } catch {
    return; // Malformed JSON
  }

  // Don't append if status is still in_progress (session still active)
  if (state.status === "in_progress") return;

  // Don't append if we already wrote this session's log
  if (state.sessionLogWritten) return;

  // Don't append if no meaningful task was done
  if (!state.currentTask || state.currentTask === "General development") return;

  const pcContent = readFileSync(pcPath, "utf-8");

  // Find the last session number — only search within the session log section
  const sessionLogStart = pcContent.indexOf("## 9. SESSION LOG");
  if (sessionLogStart === -1) return;
  const sessionLogEnd = pcContent.indexOf("\n---\n", sessionLogStart);
  const sessionLogText = sessionLogEnd !== -1
    ? pcContent.slice(sessionLogStart, sessionLogEnd)
    : pcContent.slice(sessionLogStart);

  // Match session log rows: "| <number> | <date> | <description> |"
  const sessionMatches = [...sessionLogText.matchAll(/^\| (\d+) \| \d{4}-/gm)];
  const lastSessionNum = sessionMatches.length > 0
    ? Math.max(...sessionMatches.map((m) => parseInt(m[1])))
    : 0;
  const nextSessionNum = lastSessionNum + 1;

  // Build description from state
  const date = state.updatedAt
    ? new Date(state.updatedAt).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  let description = `**${state.currentTask}.**`;
  if (state.notes) description += ` ${state.notes}`;
  if (state.filesChanged && state.filesChanged.length > 0) {
    description += ` Files: ${state.filesChanged.join(", ")}.`;
  }

  const newRow = `| ${nextSessionNum} | ${date} | ${description} |`;

  // Find the insertion point — after the last session log row, before "---"
  const sessionLogSection = pcContent.indexOf("## 9. SESSION LOG");
  if (sessionLogSection === -1) return;

  // Find the section end (next "---" after session log)
  const afterSessionLog = pcContent.indexOf("\n---\n", sessionLogSection);
  if (afterSessionLog === -1) return;

  // Insert the new row before the "---"
  const newContent = pcContent.slice(0, afterSessionLog) + "\n" + newRow + pcContent.slice(afterSessionLog);
  writeFileSync(pcPath, newContent);

  // Mark as written so we don't double-append
  state.sessionLogWritten = true;
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");

  changes.push(`📝 PROJECT-CONTEXT.md §9: auto-appended session ${nextSessionNum} log entry`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — Run all automations
// ─────────────────────────────────────────────────────────────────────────────

console.log("[auto-organize] Running doc automations...");

autoArchiveStaleDocs();
autoGenerateKeyComponents();
autoGenerateDocMap();
autoAppendSessionLog();

if (changes.length > 0) {
  console.log(`[auto-organize] ${changes.length} change(s):`);
  for (const c of changes) {
    console.log(`  ${c}`);
  }
} else {
  console.log("[auto-organize] ✓ All docs are current. No changes needed.");
}
