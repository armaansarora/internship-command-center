// scripts/check-dead-doc-links.ts
//
// Dead-doc-link checker for The Tower repo.
//
// Walks `CLAUDE.md`, `STRUCTURE.md`, and every `.md` file under `docs/`
// (excluding `docs/legacy/`). Extracts two flavours of markdown link:
//
//   1. `docs/...md`         — repo-root-relative reference (with or without
//                              surrounding backticks or brackets).
//   2. `](./...md)`         — same-directory relative markdown link,
//                              resolved against the source file's directory.
//
// Lines inside fenced code blocks (``` … ```) are skipped — those contain
// literal shell commands, sample prompts, or other text that is not a
// navigational link. Single-line inline backticks are still scanned because
// `` `docs/foo.md` `` is the common markdown form for naming a doc.
//
// Any reference that does NOT resolve to an existing file on disk is
// reported as a dead link. On dead links, prints one line per finding to
// stderr in the format `DEAD: <source>:<line> → <path>` and exits 1.
// On a clean repo, prints nothing and exits 0.
//
// Output stream choice: dead findings go to stderr because their presence
// IS an error; stdout is left clean for grep-friendly pipelines.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export interface DeadDocLink {
  source: string;
  line: number;
  path: string;
}

const DOCS_PREFIX_PATTERN = /(?<![\w/])docs\/[A-Za-z0-9_./\-]+\.md/g;
const DOT_SLASH_PATTERN = /\]\(\.\/([^)]+\.md)\)/g;

function walkMarkdown(dir: string, root: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).slice().sort()) {
    const full = join(dir, name);
    const rel = relative(root, full);
    // Skip the legacy archive entirely.
    if (rel === "docs/legacy" || rel.startsWith("docs/legacy/")) continue;
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      out.push(...walkMarkdown(full, root));
    } else if (full.endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function collectSources(root: string): string[] {
  const sources: string[] = [];
  for (const rootDoc of ["CLAUDE.md", "STRUCTURE.md"]) {
    const abs = join(root, rootDoc);
    if (existsSync(abs)) sources.push(abs);
  }
  sources.push(...walkMarkdown(join(root, "docs"), root));
  return sources;
}

export function findDeadDocLinks(input: { root: string }): DeadDocLink[] {
  const root = resolve(input.root);
  const sources = collectSources(root);
  const dead: DeadDocLink[] = [];

  for (const abs of sources) {
    const sourceRel = relative(root, abs);
    let content: string;
    try {
      content = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const lines = content.split("\n");
    let inFence = false;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";

      // Toggle fenced-code-block state on lines that START with ``` or ~~~.
      // (Tildes are part of CommonMark, kept for safety.)
      if (/^\s{0,3}(```|~~~)/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      // Pattern 1: docs/...md — resolve against repo root.
      const docsMatches = line.matchAll(DOCS_PREFIX_PATTERN);
      for (const match of docsMatches) {
        const refRaw = match[0];
        const resolved = join(root, refRaw);
        if (!existsSync(resolved)) {
          dead.push({ source: sourceRel, line: i + 1, path: refRaw });
        }
      }

      // Pattern 2: ](./...md) — resolve against source file's dir.
      const dotMatches = line.matchAll(DOT_SLASH_PATTERN);
      for (const match of dotMatches) {
        const refRel = match[1] ?? "";
        const sourceDir = dirname(abs);
        const resolvedAbs = resolve(sourceDir, refRel);
        if (!existsSync(resolvedAbs)) {
          const reported = relative(root, resolvedAbs);
          dead.push({ source: sourceRel, line: i + 1, path: reported });
        }
      }
    }
  }

  dead.sort((a, b) => {
    if (a.source !== b.source) return a.source < b.source ? -1 : 1;
    if (a.line !== b.line) return a.line - b.line;
    return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  });

  return dead;
}

async function main(): Promise<number> {
  const root = process.cwd();
  const dead = findDeadDocLinks({ root });
  if (dead.length === 0) return 0;
  for (const entry of dead) {
    process.stderr.write(`DEAD: ${entry.source}:${entry.line} → ${entry.path}\n`);
  }
  return 1;
}

const invokedPath = process.argv[1] ?? "";
const isDirectInvocation =
  invokedPath.endsWith("/check-dead-doc-links.ts") ||
  invokedPath.endsWith("\\check-dead-doc-links.ts") ||
  invokedPath.endsWith("/check-dead-doc-links.js") ||
  invokedPath.endsWith("\\check-dead-doc-links.js");

if (isDirectInvocation) {
  void main().then((code) => process.exit(code));
}
