// src/lib/artlab/migration/archive-legacy.ts
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";

const LEGACY_TOP_LEVEL = new Set([
  "studio",
  "runs",
  "characters",
  "browser-sessions",
  "tooling",
]);
const PROTECTED_TOP_LEVEL = new Set([
  "engine",
  "legacy",
  ".gitkeep",
]);

export interface ArchiveLegacyInput { artlabRoot: string; }
export interface ArchiveLegacyResult {
  movedTopLevelDirs: string[];
  collisionsRenamed: Array<{ entry: string; renamedTo: string }>;
}

function ensureUniqueDst(dst: string): string {
  if (!existsSync(dst)) return dst;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${dst}-${stamp}`;
}

export async function archiveLegacyArtlabWorkspace(input: ArchiveLegacyInput): Promise<ArchiveLegacyResult> {
  if (!existsSync(input.artlabRoot)) return { movedTopLevelDirs: [], collisionsRenamed: [] };
  const legacyDir = join(input.artlabRoot, "legacy");
  if (!existsSync(legacyDir)) mkdirSync(legacyDir, { recursive: true });
  const moved: string[] = [];
  const collisionsRenamed: ArchiveLegacyResult["collisionsRenamed"] = [];
  for (const entry of readdirSync(input.artlabRoot)) {
    if (PROTECTED_TOP_LEVEL.has(entry)) continue;
    if (!LEGACY_TOP_LEVEL.has(entry)) continue;
    const src = join(input.artlabRoot, entry);
    if (!statSync(src).isDirectory()) continue;
    const naturalDst = join(legacyDir, entry);
    const dst = ensureUniqueDst(naturalDst);
    renameSync(src, dst);
    moved.push(entry);
    if (dst !== naturalDst) {
      collisionsRenamed.push({ entry, renamedTo: dst });
    }
  }
  return { movedTopLevelDirs: moved, collisionsRenamed };
}
