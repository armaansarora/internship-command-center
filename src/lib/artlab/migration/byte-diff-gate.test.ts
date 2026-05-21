// src/lib/artlab/migration/byte-diff-gate.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertByteIdenticalPromotedState } from "./byte-diff-gate";

describe("byte-diff gate", () => {
  let publicArtRoot: string;
  beforeEach(() => {
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-bd-"));
    mkdirSync(join(publicArtRoot, "lobby", "otis"), { recursive: true });
    mkdirSync(join(publicArtRoot, "penthouse", "ceo"), { recursive: true });
    writeFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"), Buffer.from([1, 2, 3]));
    writeFileSync(join(publicArtRoot, "penthouse", "ceo", "idle.webp"), Buffer.from([4, 5, 6]));
  });

  it("passes when baseline matches current", async () => {
    const result = await assertByteIdenticalPromotedState({ publicArtRoot, baseline: null });
    expect(result.passed).toBe(true);
  });

  it("fails when a file's bytes have changed", async () => {
    const result1 = await assertByteIdenticalPromotedState({ publicArtRoot, baseline: null });
    expect(result1.passed).toBe(true);
    writeFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"), Buffer.from([9, 9, 9]));
    const result2 = await assertByteIdenticalPromotedState({
      publicArtRoot,
      baseline: result1.snapshot,
    });
    expect(result2.passed).toBe(false);
    expect(result2.diff?.changed.map((c) => c.path)).toContain("idle.webp");
  });
});
