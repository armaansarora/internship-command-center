// src/lib/artlab/self-evolution/scheduler.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSelfEvolutionScheduler } from "./scheduler";

describe("self-evolution scheduler", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-se-"));
    mkdirSync(join(workspaceRoot, "ledgers"));
  });

  it("does nothing if last-run was within the past hour", async () => {
    const lastRunPath = join(workspaceRoot, "self-evolution-last-run.json");
    writeFileSync(lastRunPath, JSON.stringify({ at: new Date().toISOString() }));
    const result = await runSelfEvolutionScheduler({ workspaceRoot, today: "2026-05-20", now: () => new Date() });
    expect(result.skipped).toBe("cooldown");
  });

  it("runs when last-run is > 1 hour ago and writes a new last-run record", async () => {
    process.env.ARTLAB_CODEX_MODE = "mock";
    const lastRunPath = join(workspaceRoot, "self-evolution-last-run.json");
    writeFileSync(lastRunPath, JSON.stringify({ at: new Date(Date.now() - 2 * 60 * 60_000).toISOString() }));
    // No friction in ledger → still runs the scheduler but produces 0 branches
    const result = await runSelfEvolutionScheduler({ workspaceRoot, today: "2026-05-20", now: () => new Date() });
    delete process.env.ARTLAB_CODEX_MODE;
    expect(result.skipped).toBeUndefined();
    expect(result.summonedBranches).toEqual([]);
    expect(existsSync(lastRunPath)).toBe(true);
  });

  it("summons codex for each actionable friction group", async () => {
    process.env.ARTLAB_CODEX_MODE = "mock";
    const ledgerPath = join(workspaceRoot, "ledgers", "improvements.jsonl");
    const events = Array.from({ length: 6 }, (_, i) => ({
      at: `2026-05-20T0${i}:00:00Z`,
      failureCode: "rembg-edge-halo",
      severity: "medium",
    }));
    writeFileSync(ledgerPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    const result = await runSelfEvolutionScheduler({ workspaceRoot, today: "2026-05-20", now: () => new Date() });
    delete process.env.ARTLAB_CODEX_MODE;
    expect(result.summonedBranches).toEqual(["artlab/fix/rembg-edge-halo-2026-05-20"]);
  });
});
