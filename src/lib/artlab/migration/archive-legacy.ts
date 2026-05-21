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
export interface ArchiveLegacyResult { movedTopLevelDirs: string[]; }

export async function archiveLegacyArtlabWorkspace(input: ArchiveLegacyInput): Promise<ArchiveLegacyResult> {
  if (!existsSync(input.artlabRoot)) return { movedTopLevelDirs: [] };
  const legacyDir = join(input.artlabRoot, "legacy");
  if (!existsSync(legacyDir)) mkdirSync(legacyDir, { recursive: true });
  const moved: string[] = [];
  for (const entry of readdirSync(input.artlabRoot)) {
    if (PROTECTED_TOP_LEVEL.has(entry)) continue;
    if (!LEGACY_TOP_LEVEL.has(entry)) continue;
    const src = join(input.artlabRoot, entry);
    if (!statSync(src).isDirectory()) continue;
    const dst = join(legacyDir, entry);
    renameSync(src, dst);
    moved.push(entry);
  }
  return { movedTopLevelDirs: moved };
}
