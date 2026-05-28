// scripts/migrate-style-wins-character-id.ts
//
// One-shot migration: rewrite `style-wins.jsonl` entries whose
// `characterId` field carries the legacy roleSlug (e.g. "cno") to the
// canonical canon `header.id` (e.g. "sol-navarro").
//
// The drift surfaced because the intake router historically wrote roleSlugs
// to run-state and the promotion runner copied that slug into
// `appendStyleWin`. Future runs now write canon header.ids; this script
// backfills the historical entries so `getRelevantMemory({characterId:
// "sol-navarro"})` reads the same wins that the runtime cno→sol bridge would
// look up.
//
// Idempotency contract: running this script twice migrates 2 entries the
// first time and 0 the second time. We achieve idempotency by skipping
// entries whose `characterId` already matches a canon `header.id`.
//
// Atomicity: we read the entire file, transform every line, and write the
// new file via a temp+rename so a crash mid-write can't leave a corrupted
// ledger (this mirrors the temp+rename pattern in
// `src/lib/artlab/state/snapshots.ts`).
//
// Usage:
//   node --experimental-strip-types scripts/migrate-style-wins-character-id.ts
//   tsx scripts/migrate-style-wins-character-id.ts
//   set -a && source .env.local && set +a && tsx scripts/migrate-style-wins-character-id.ts
//
// The script targets the live workspace ledger at
// `.artlab/engine/memory/style-wins.jsonl` by default; override via the
// `ARTLAB_WORKSPACE_ROOT` env var or `--workspace-root <path>` flag.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadCanonIdentities, type CanonIdentity } from "@/lib/artlab/sdk/canon/canon-identity-map";

export interface MigrationResult {
  ledgerPath: string;
  totalEntries: number;
  migratedEntries: number;
  unchangedEntries: number;
  unrecognizedEntries: number;
  malformedLines: number;
}

interface StyleWinShape {
  characterId?: unknown;
  // Other fields are preserved verbatim; we only validate the characterId.
  [key: string]: unknown;
}

function defaultWorkspaceRoot(): string {
  const envRoot = process.env.ARTLAB_WORKSPACE_ROOT;
  if (envRoot && envRoot.length > 0) return envRoot;
  return resolve(process.cwd(), ".artlab/engine");
}

function parseArgs(argv: readonly string[]): { workspaceRoot: string; ledgerPath?: string } {
  let workspaceRoot = defaultWorkspaceRoot();
  let ledgerPath: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace-root" && argv[i + 1]) {
      workspaceRoot = argv[i + 1]!;
      i += 1;
      continue;
    }
    if (arg === "--ledger" && argv[i + 1]) {
      ledgerPath = argv[i + 1]!;
      i += 1;
      continue;
    }
  }
  return { workspaceRoot, ledgerPath };
}

function ledgerPathFor(workspaceRoot: string, override?: string): string {
  if (override) return override;
  return join(workspaceRoot, "memory", "style-wins.jsonl");
}

function migrateCharacterId(
  current: string,
  identities: readonly CanonIdentity[],
): { result: string; migrated: boolean; recognized: boolean } {
  // Header.id match → already canonical; idempotent no-op.
  const byHeaderId = identities.find((id) => id.headerId === current);
  if (byHeaderId) return { result: current, migrated: false, recognized: true };
  // RoleSlug match → migrate to header.id.
  const byRoleSlug = identities.find((id) => id.roleSlug === current);
  if (byRoleSlug) return { result: byRoleSlug.headerId, migrated: true, recognized: true };
  // Neither match → leave alone (could be a legacy character that's been
  // removed from canon, or a future canon entry not yet on disk). The
  // migration script does NOT delete entries — only rewrites recognized ones.
  return { result: current, migrated: false, recognized: false };
}

function atomicWrite(path: string, content: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    // Workspace ledger dir must exist for the migration to be meaningful;
    // we don't auto-create it because that would silently mask a typo'd
    // workspace root.
    throw new Error(`migrate-style-wins: ledger dir does not exist: ${dir}`);
  }
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, content, { encoding: "utf8" });
  renameSync(tmp, path);
}

export function migrateStyleWinsLedger(opts: {
  workspaceRoot: string;
  ledgerPath?: string;
  canonRoot?: string;
}): MigrationResult {
  const path = ledgerPathFor(opts.workspaceRoot, opts.ledgerPath);
  if (!existsSync(path)) {
    return {
      ledgerPath: path,
      totalEntries: 0,
      migratedEntries: 0,
      unchangedEntries: 0,
      unrecognizedEntries: 0,
      malformedLines: 0,
    };
  }
  const identities = loadCanonIdentities(opts.canonRoot ? { canonRoot: opts.canonRoot } : undefined);
  const raw = readFileSync(path, "utf8");
  const lines = raw.split("\n");
  const outLines: string[] = [];
  let totalEntries = 0;
  let migratedEntries = 0;
  let unchangedEntries = 0;
  let unrecognizedEntries = 0;
  let malformedLines = 0;
  for (const line of lines) {
    if (line.length === 0) {
      // Preserve blank line so a trailing newline survives the rewrite.
      outLines.push(line);
      continue;
    }
    let parsed: StyleWinShape;
    try {
      parsed = JSON.parse(line) as StyleWinShape;
    } catch {
      // Malformed JSON — copy through verbatim so the operator can fix by
      // hand. We never drop bytes the operator wrote.
      outLines.push(line);
      malformedLines += 1;
      continue;
    }
    totalEntries += 1;
    const current = parsed.characterId;
    if (typeof current !== "string" || current.length === 0) {
      // Entry has no characterId — pass through unchanged.
      outLines.push(line);
      unchangedEntries += 1;
      continue;
    }
    const { result, migrated, recognized } = migrateCharacterId(current, identities);
    if (!recognized) {
      outLines.push(line);
      unrecognizedEntries += 1;
      continue;
    }
    if (!migrated) {
      outLines.push(line);
      unchangedEntries += 1;
      continue;
    }
    const next: StyleWinShape = { ...parsed, characterId: result };
    outLines.push(JSON.stringify(next));
    migratedEntries += 1;
  }
  // Only rewrite when at least one migration actually changed content —
  // saves a needless atomic rename when the ledger is already canonical
  // (idempotent rerun → 0 bytes written).
  if (migratedEntries > 0) {
    atomicWrite(path, outLines.join("\n"));
  }
  return {
    ledgerPath: path,
    totalEntries,
    migratedEntries,
    unchangedEntries,
    unrecognizedEntries,
    malformedLines,
  };
}

// CLI entry — invoked when this file is run directly. We compare the
// basename of the executing script (`process.argv[1]`) to the basename of
// this module's URL, which works under tsx + macOS symlinks (`/tmp` ↔
// `/private/tmp`) where a full-path equality check fails. Tests import
// `migrateStyleWinsLedger` directly via vitest and never set
// `argv[1]` to this filename, so the CLI block stays inert under test.
const isCli = (() => {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    const fileUrl = import.meta.url;
    if (!fileUrl) return false;
    const fileBase = new URL(fileUrl).pathname.split("/").pop();
    const argvBase = argv1.split("/").pop();
    return fileBase !== undefined && fileBase === argvBase;
  } catch {
    return false;
  }
})();

if (isCli) {
  const args = parseArgs(process.argv.slice(2));
  const result = migrateStyleWinsLedger({
    workspaceRoot: args.workspaceRoot,
    ledgerPath: args.ledgerPath,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  // Non-zero exit only on malformed lines (operator needs to look at them);
  // unrecognized entries are merely informational.
  process.exit(result.malformedLines > 0 ? 1 : 0);
}
