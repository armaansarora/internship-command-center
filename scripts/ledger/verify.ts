#!/usr/bin/env tsx
/**
 * scripts/ledger/verify.ts — Phase Ledger drift detector.
 *
 * Reads every `.ledger/R*.yml` file, and for each task in `in_progress` or
 * `complete` status, parses the `notes` field (format: "Evidence: p1, p2, ...")
 * and checks whether each evidence path exists in the repo.
 *
 * Flags:
 *   --warn-only   Print problems to stderr; exit 0 regardless.
 *   (default)     Print problems; exit 1 if any.
 *
 * End of output always prints:
 *   ledger verify OK — N phase file(s), M issue(s)
 */
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

interface TaskShape {
  status?: string;
  notes?: string;
}

interface LedgerShape {
  phase?: string;
  tasks?: Record<string, TaskShape>;
}

function parseEvidence(notes: string | undefined): string[] {
  if (!notes) return [];
  // Notes are single-line YAML strings; collapse any embedded newlines first.
  const flat = notes.replace(/\s+/g, " ").trim();
  const match = flat.match(/Evidence:\s*(.+)$/i);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function findLedgerFiles(repoRoot: string): string[] {
  const dir = path.join(repoRoot, ".ledger");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^R\d+.*\.ya?ml$/.test(f))
    .map((f) => path.join(dir, f))
    .sort();
}

function main(): void {
  const argv = process.argv.slice(2);
  const warnOnly = argv.includes("--warn-only");
  const repoRoot = process.cwd();

  const files = findLedgerFiles(repoRoot);
  const problems: string[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = YAML.parse(raw) as LedgerShape | null;
    if (!parsed || !parsed.tasks) continue;

    for (const [taskId, task] of Object.entries(parsed.tasks)) {
      if (task.status !== "in_progress" && task.status !== "complete") continue;
      const paths = parseEvidence(task.notes);
      for (const p of paths) {
        const abs = path.isAbsolute(p) ? p : path.join(repoRoot, p);
        if (!fs.existsSync(abs)) {
          problems.push(`${taskId}: missing evidence — ${p}`);
        }
      }
    }
  }

  for (const line of problems) {
    if (warnOnly) {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }

  const summary = `ledger verify OK — ${files.length} phase file(s), ${problems.length} issue(s)`;
  process.stdout.write(summary + "\n");

  if (!warnOnly && problems.length > 0) process.exit(1);
  process.exit(0);
}

main();
