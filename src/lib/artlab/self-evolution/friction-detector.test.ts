// src/lib/artlab/self-evolution/friction-detector.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectFriction, FRICTION_THRESHOLD } from "./friction-detector";

describe("friction detector", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-fd-"));
    mkdirSync(join(workspaceRoot, "ledgers"));
  });

  it("FRICTION_THRESHOLD is 5 (spec section 10)", () => {
    expect(FRICTION_THRESHOLD).toBe(5);
  });

  it("groups improvements.jsonl entries by failureCode and reports occurrences ≥ threshold", async () => {
    const path = join(workspaceRoot, "ledgers", "improvements.jsonl");
    const events = [
      { at: "2026-05-20T00:00:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:01:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:02:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:03:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:04:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:05:00Z", failureCode: "concept-style-drift", severity: "low" },
    ];
    writeFileSync(path, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    const result = await detectFriction({ workspaceRoot });
    expect(result.actionable).toHaveLength(1);
    expect(result.actionable[0]!.failureCode).toBe("rembg-edge-halo");
    expect(result.actionable[0]!.occurrences).toBe(5);
  });

  it("filters severity < medium out of actionable", async () => {
    const path = join(workspaceRoot, "ledgers", "improvements.jsonl");
    const events = Array.from({ length: 6 }, (_, i) => ({
      at: `2026-05-20T00:0${i}:00Z`,
      failureCode: "minor-quibble",
      severity: "low",
    }));
    writeFileSync(path, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    const result = await detectFriction({ workspaceRoot });
    expect(result.actionable).toHaveLength(0);
  });

  it("returns empty when no ledger exists", async () => {
    const result = await detectFriction({ workspaceRoot });
    expect(result.actionable).toEqual([]);
  });
});
