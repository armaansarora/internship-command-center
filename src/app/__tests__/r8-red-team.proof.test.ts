import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const RT_PATH = resolve(process.cwd(), ".tower/ledger/r8/red-team.md");

describe("R8 P10 — Red Team checklist filed", () => {
  it("file exists", () => {
    expect(existsSync(RT_PATH)).toBe(true);
  });

  it("contains at least 10 lines marked '- ✓' at the top of a question", () => {
    const body = readFileSync(RT_PATH, "utf8");
    const ticks = (body.match(/^-\s+✓/gm) ?? []).length;
    expect(ticks).toBeGreaterThanOrEqual(10);
  });

  it("has zero '- ✗' lines (any failure blocks acceptance)", () => {
    const body = readFileSync(RT_PATH, "utf8");
    expect(body).not.toMatch(/^-\s+✗/m);
  });

  it("includes the canonical Q1 / Q5 / Q7 / Q9 / Q10 phrasing", () => {
    const body = readFileSync(RT_PATH, "utf8");
    expect(body).toMatch(/un-consented user's name/);
    expect(body).toMatch(/every field that would be shared/);
    expect(body).toMatch(/private_note ever appear/);
    expect(body).toMatch(/RLS/);
    expect(body).toMatch(/audit trail/);
  });
});
