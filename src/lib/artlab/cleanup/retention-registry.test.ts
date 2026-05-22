import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREATIVE_RETENTION_STATUSES,
  planRetentionCleanup,
  readCreativeRetentionRegistry,
  summarizeRetentionRegistry,
  writeCreativeRetentionRegistry,
  type CreativeRetentionEntry,
} from "./index";

describe("creative production cleanup retention registry", () => {
  it("defines the complete v1 final retention status vocabulary", () => {
    expect(CREATIVE_RETENTION_STATUSES).toEqual([
      "draft",
      "candidate",
      "winner-reference",
      "staged",
      "approved",
      "rejected",
      "superseded",
      "archived",
    ]);
  });

  it("hides bad clutter in normal status while diagnostics can expose everything", () => {
    const entries: CreativeRetentionEntry[] = [
      { path: ".artlab/studio/mara/source.png", status: "draft", kind: "source", runId: "mara" },
      { path: ".artlab/studio/mara/candidate.png", status: "candidate", kind: "derived-asset", runId: "mara" },
      { path: ".artlab/studio/mara/winner.png", status: "winner-reference", kind: "derived-asset", runId: "mara" },
      { path: ".artlab/studio/mara/rejected.png", status: "rejected", kind: "failure-evidence", runId: "mara" },
      { path: ".artlab/studio/mara/old-board.html", status: "superseded", kind: "review-board", runId: "mara" },
      { path: ".artlab/archive/mara/old.png", status: "archived", kind: "archive", runId: "mara" },
    ];

    const normal = summarizeRetentionRegistry(entries, { mode: "normal" });
    const diagnostics = summarizeRetentionRegistry(entries, { mode: "diagnostic" });

    expect(normal.visibleEntries.map((entry) => entry.status)).toEqual([
      "draft",
      "candidate",
      "winner-reference",
    ]);
    expect(normal.hiddenCount).toBe(3);
    expect(diagnostics.visibleEntries).toHaveLength(entries.length);
    expect(diagnostics.hiddenCount).toBe(0);
  });

  it("never deletes live public art, approved manifests, approval receipts, budget receipts, or active run state", () => {
    const entries: CreativeRetentionEntry[] = [
      { path: "public/art/characters/mara.png", status: "superseded", kind: "live-public-art", runId: "mara" },
      { path: ".artlab/studio/mara/manifest.json", status: "approved", kind: "approved-manifest", runId: "mara" },
      { path: ".artlab/studio/mara/final-approval.json", status: "approved", kind: "approval-receipt", runId: "mara" },
      { path: ".artlab/studio/mara/budget.jsonl", status: "archived", kind: "budget-receipt", runId: "mara" },
      { path: ".artlab/studio/mara/run-state.json", status: "draft", kind: "active-run-state", runId: "mara" },
      { path: ".artlab/studio/mara/Downloads/image.png", status: "draft", kind: "loose-download", runId: "mara" },
      { path: ".artlab/studio/mara/temp-mask.png", status: "draft", kind: "temp-file", runId: "mara" },
      { path: ".artlab/studio/mara/rejected-raw.png", status: "rejected", kind: "failure-evidence", runId: "mara" },
    ];

    const plan = planRetentionCleanup(entries);

    expect(plan.protectedEntries.map((entry) => entry.path)).toEqual([
      "public/art/characters/mara.png",
      ".artlab/studio/mara/manifest.json",
      ".artlab/studio/mara/final-approval.json",
      ".artlab/studio/mara/budget.jsonl",
      ".artlab/studio/mara/run-state.json",
    ]);
    expect(plan.deleteEntries.map((entry) => entry.path)).toEqual([
      ".artlab/studio/mara/Downloads/image.png",
      ".artlab/studio/mara/temp-mask.png",
    ]);
    expect(plan.archiveEntries.map((entry) => entry.path)).toEqual([
      ".artlab/studio/mara/rejected-raw.png",
    ]);
  });

  it("persists a durable artifact registry for cleanup and fresh-agent diagnostics", async () => {
    const root = mkdtempSync(join(tmpdir(), "tower-retention-registry-"));
    const registryPath = join(root, "artifact-registry.json");
    const entries: CreativeRetentionEntry[] = [
      { path: "public/art/lobby/otis/regular/idle.webp", status: "approved", kind: "live-public-art", runId: "otis" },
      { path: ".artlab/studio/characters/mara/source.png", status: "candidate", kind: "source", runId: "mara" },
    ];

    await writeCreativeRetentionRegistry(registryPath, entries);

    expect(existsSync(registryPath)).toBe(true);
    expect(JSON.parse(readFileSync(registryPath, "utf8"))).toMatchObject({
      schemaVersion: "tower-creative-retention-registry-v1",
      entries,
    });
    await expect(readCreativeRetentionRegistry(registryPath)).resolves.toEqual(entries);
  });
});
