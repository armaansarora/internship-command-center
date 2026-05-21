// src/lib/artlab/speed/quality-equivalence.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertQualityEquivalent } from "./quality-equivalence";

describe("quality equivalence", () => {
  let dirA: string;
  let dirB: string;
  beforeEach(() => {
    dirA = mkdtempSync(join(tmpdir(), "artlab-qe-a-"));
    dirB = mkdtempSync(join(tmpdir(), "artlab-qe-b-"));
  });

  it("passes when artifact shapes match (timestamps allowed to differ)", () => {
    writeFileSync(join(dirA, "asset-doctor.json"), JSON.stringify({ entries: [{ cutoutPath: "a", alpha: true, notes: [] }] }));
    writeFileSync(join(dirB, "asset-doctor.json"), JSON.stringify({ entries: [{ cutoutPath: "a", alpha: true, notes: [] }] }));
    writeFileSync(join(dirA, "run-state.json"), JSON.stringify({ phase: "closed", createdAt: "2026-05-20T01:00:00Z" }));
    writeFileSync(join(dirB, "run-state.json"), JSON.stringify({ phase: "closed", createdAt: "2026-05-20T02:00:00Z" }));
    const result = assertQualityEquivalent({ runDirA: dirA, runDirB: dirB });
    expect(result.equivalent).toBe(true);
  });

  it("fails when asset-doctor entries differ", () => {
    writeFileSync(join(dirA, "asset-doctor.json"), JSON.stringify({ entries: [{ cutoutPath: "a", alpha: true, notes: [] }] }));
    writeFileSync(join(dirB, "asset-doctor.json"), JSON.stringify({ entries: [{ cutoutPath: "a", alpha: false, notes: ["missing alpha"] }] }));
    const result = assertQualityEquivalent({ runDirA: dirA, runDirB: dirB });
    expect(result.equivalent).toBe(false);
    expect(result.differences).toContain("asset-doctor.json");
  });
});
