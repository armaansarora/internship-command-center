import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const CREATIVE_RETENTION_STATUSES = [
  "draft",
  "candidate",
  "winner-reference",
  "staged",
  "approved",
  "rejected",
  "superseded",
  "archived",
] as const;

export type CreativeRetentionStatus = (typeof CREATIVE_RETENTION_STATUSES)[number];

export type CreativeRetentionKind =
  | "source"
  | "derived-asset"
  | "review-board"
  | "failure-evidence"
  | "archive"
  | "live-public-art"
  | "approved-manifest"
  | "approval-receipt"
  | "budget-receipt"
  | "active-run-state"
  | "loose-download"
  | "duplicate-binary"
  | "orphan-preview"
  | "temp-file"
  | "unreferenced-intermediate";

export interface CreativeRetentionEntry {
  path: string;
  status: CreativeRetentionStatus;
  kind: CreativeRetentionKind;
  runId: string;
  notes?: string;
}

export interface CreativeRetentionSummary {
  mode: "normal" | "diagnostic";
  visibleEntries: CreativeRetentionEntry[];
  hiddenEntries: CreativeRetentionEntry[];
  hiddenCount: number;
  countsByStatus: Record<CreativeRetentionStatus, number>;
}

export interface CreativeRetentionCleanupPlan {
  protectedEntries: CreativeRetentionEntry[];
  archiveEntries: CreativeRetentionEntry[];
  deleteEntries: CreativeRetentionEntry[];
  keepEntries: CreativeRetentionEntry[];
}

export interface CreativeRetentionRegistryFile {
  schemaVersion: "tower-creative-retention-registry-v1";
  updatedAt: string;
  entries: CreativeRetentionEntry[];
}

const HIDDEN_IN_NORMAL = new Set<CreativeRetentionStatus>([
  "rejected",
  "superseded",
  "archived",
]);

const PROTECTED_KINDS = new Set<CreativeRetentionKind>([
  "live-public-art",
  "approved-manifest",
  "approval-receipt",
  "budget-receipt",
  "active-run-state",
]);

const DELETE_KINDS = new Set<CreativeRetentionKind>([
  "loose-download",
  "duplicate-binary",
  "orphan-preview",
  "temp-file",
  "unreferenced-intermediate",
]);

function emptyCounts(): Record<CreativeRetentionStatus, number> {
  return {
    draft: 0,
    candidate: 0,
    "winner-reference": 0,
    staged: 0,
    approved: 0,
    rejected: 0,
    superseded: 0,
    archived: 0,
  };
}

export function isProtectedCreativeRetentionEntry(entry: CreativeRetentionEntry): boolean {
  return entry.path.startsWith("public/art/") || PROTECTED_KINDS.has(entry.kind);
}

export function summarizeRetentionRegistry(
  entries: readonly CreativeRetentionEntry[],
  options: { mode: "normal" | "diagnostic" },
): CreativeRetentionSummary {
  const countsByStatus = emptyCounts();

  for (const entry of entries) {
    countsByStatus[entry.status] += 1;
  }

  if (options.mode === "diagnostic") {
    return {
      mode: "diagnostic",
      visibleEntries: [...entries],
      hiddenEntries: [],
      hiddenCount: 0,
      countsByStatus,
    };
  }

  const visibleEntries = entries.filter((entry) => !HIDDEN_IN_NORMAL.has(entry.status));
  const hiddenEntries = entries.filter((entry) => HIDDEN_IN_NORMAL.has(entry.status));

  return {
    mode: "normal",
    visibleEntries,
    hiddenEntries,
    hiddenCount: hiddenEntries.length,
    countsByStatus,
  };
}

export function planRetentionCleanup(entries: readonly CreativeRetentionEntry[]): CreativeRetentionCleanupPlan {
  const protectedEntries: CreativeRetentionEntry[] = [];
  const archiveEntries: CreativeRetentionEntry[] = [];
  const deleteEntries: CreativeRetentionEntry[] = [];
  const keepEntries: CreativeRetentionEntry[] = [];

  for (const entry of entries) {
    if (isProtectedCreativeRetentionEntry(entry)) {
      protectedEntries.push(entry);
      continue;
    }

    if (DELETE_KINDS.has(entry.kind)) {
      deleteEntries.push(entry);
      continue;
    }

    if (entry.status === "rejected" || entry.status === "superseded") {
      archiveEntries.push(entry);
      continue;
    }

    keepEntries.push(entry);
  }

  return {
    protectedEntries,
    archiveEntries,
    deleteEntries,
    keepEntries,
  };
}

export async function writeCreativeRetentionRegistry(
  path: string,
  entries: readonly CreativeRetentionEntry[],
  now = new Date(),
): Promise<CreativeRetentionRegistryFile> {
  const registry: CreativeRetentionRegistryFile = {
    schemaVersion: "tower-creative-retention-registry-v1",
    updatedAt: now.toISOString(),
    entries: [...entries],
  };
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;

  await mkdir(dirname(path), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(registry, null, 2)}\n`);
  await rename(tempPath, path);

  return registry;
}

export async function readCreativeRetentionRegistry(
  path: string,
): Promise<CreativeRetentionEntry[]> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<CreativeRetentionRegistryFile>;

  if (parsed.schemaVersion !== "tower-creative-retention-registry-v1" || !Array.isArray(parsed.entries)) {
    throw new Error(`Invalid creative retention registry at ${path}.`);
  }

  return parsed.entries;
}
