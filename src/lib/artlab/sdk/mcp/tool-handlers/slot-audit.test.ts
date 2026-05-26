import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleArtLabSlotAudit } from "./slot-audit";

let workspaceRoot: string;

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-slot-audit-"));
  // Slot registry under workspaceRoot/slots/registry.json
  mkdirSync(join(workspaceRoot, "slots"), { recursive: true });
  writeFileSync(
    join(workspaceRoot, "slots", "registry.json"),
    JSON.stringify({
      slots: [
        {
          slotId: "rafe.idle",
          kind: "character",
          characterId: "rafe-calder",
          description: "Rafe idle sprite",
        },
        {
          slotId: "war-room.background",
          kind: "floor",
          space: "war-room",
          description: "War room bg",
        },
        {
          slotId: "tower.button.bg",
          kind: "ui-texture",
          description: "Tower button background",
        },
      ],
    }),
  );
  // Promoted packs under workspaceRoot/packs/
  mkdirSync(join(workspaceRoot, "packs", "rafe-v3"), { recursive: true });
  writeFileSync(
    join(workspaceRoot, "packs", "rafe-v3", "manifest.json"),
    JSON.stringify({
      packId: "rafe-v3",
      kind: "character",
      slotId: "rafe.idle",
      promotedAt: "2026-05-25T12:00:00.000Z",
      characterId: "rafe-calder",
    }),
  );
});

describe("handleArtLabSlotAudit", () => {
  it("returns slots without a matching promoted pack", async () => {
    const result = await handleArtLabSlotAudit(
      {},
      {
        slotRegistryPath: join(workspaceRoot, "slots", "registry.json"),
        packsRoot: join(workspaceRoot, "packs"),
      },
    );
    expect(result.totalCount).toBe(3);
    expect(result.coveredCount).toBe(1);
    expect(result.missing.map((s) => s.slotId).sort()).toEqual([
      "tower.button.bg",
      "war-room.background",
    ]);
  });

  it("respects kind filter", async () => {
    const result = await handleArtLabSlotAudit(
      { kind: "floor" },
      {
        slotRegistryPath: join(workspaceRoot, "slots", "registry.json"),
        packsRoot: join(workspaceRoot, "packs"),
      },
    );
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.slotId).toBe("war-room.background");
  });

  it("respects space filter", async () => {
    const result = await handleArtLabSlotAudit(
      { space: "war-room" },
      {
        slotRegistryPath: join(workspaceRoot, "slots", "registry.json"),
        packsRoot: join(workspaceRoot, "packs"),
      },
    );
    expect(result.missing.map((s) => s.slotId)).toEqual(["war-room.background"]);
  });
});
