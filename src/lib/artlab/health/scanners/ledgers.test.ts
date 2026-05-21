import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanLedgers } from "./ledgers";

describe("ledgers scanner", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-ledgers-")); });

  it("returns zero when no runs", () => {
    const result = scanLedgers(workspaceRoot);
    expect(result.totalSpentCents).toBe(0);
    expect(result.byRun).toEqual({});
  });

  it("sums spend across runs", () => {
    const r1 = join(workspaceRoot, "runs", "r1");
    mkdirSync(r1, { recursive: true });
    writeFileSync(join(r1, "provider-budget-ledger.json"), JSON.stringify({ totals: { spentCents: 333 } }));
    const r2 = join(workspaceRoot, "runs", "r2");
    mkdirSync(r2, { recursive: true });
    writeFileSync(join(r2, "provider-budget-ledger.json"), JSON.stringify({ totals: { spentCents: 1200 } }));
    const result = scanLedgers(workspaceRoot);
    expect(result.totalSpentCents).toBe(1533);
    expect(result.byRun.r1).toBe(333);
    expect(result.byRun.r2).toBe(1200);
  });
});
