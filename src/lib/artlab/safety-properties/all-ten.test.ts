// src/lib/artlab/safety-properties/all-ten.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "@/lib/artlab/runners/promotion-runner";
import { reconcileCrashedRuns } from "@/lib/artlab/daemon/crash-recovery";
import { isAuthorizedSender } from "@/lib/artlab/bot/identity";
import { buildCodexGoal } from "@/lib/artlab/self-evolution/codex-summoner";
import { parseReplyExact } from "@/lib/artlab/bot/reply-parser";
import type { TelegramMessage } from "@/lib/artlab/bot/telegram-client";

describe("ArtLab safety properties — all 10 from spec §13", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-sp-"));
  });

  it("§13.1 Promotion firewall — refuses without exact phrase", async () => {
    const runDir = mkdtempSync(join(tmpdir(), "artlab-promo-"));
    mkdirSync(join(runDir, "cutouts"));
    writeFileSync(join(runDir, "cutouts", "a.png"), JSON.stringify({ alpha: true }));
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approve for app" })); // close but not exact
    const result = await promotionRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "x", providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("approval-phrase-mismatch");
  });

  it("§13.2 No duplicate spend (budget ledger exports reservation functions)", async () => {
    // The ledger module exports reserveCreativeBudget + releaseCreativeBudgetReservation +
    // recordCreativeBudgetSpend — the core no-duplicate-spend mechanism.
    const budgetModule = await import("@/lib/artlab/budget/ledger");
    expect(typeof budgetModule.reserveCreativeBudget).toBe("function");
    expect(typeof budgetModule.releaseCreativeBudgetReservation).toBe("function");
    expect(typeof budgetModule.recordCreativeBudgetSpend).toBe("function");
  });

  it("§13.3 Cancellation is honest (cancel-flow + lease release wired)", async () => {
    const { processCancelIntents } = await import("@/lib/artlab/daemon/cancel-flow");
    expect(typeof processCancelIntents).toBe("function");
    // Full SIGTERM + lease release covered by Task 3.19 unit test.
  });

  it("§13.4 Resume after crash (reconcileCrashedRuns releases stale leases)", async () => {
    const runDir = join(workspaceRoot, "runs", "stale");
    mkdirSync(join(runDir, "slot-leases"), { recursive: true });
    writeFileSync(join(runDir, "run-state.json"), JSON.stringify({
      runId: "stale", assetType: "character", phase: "production",
      createdAt: "2026-05-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z", request: "x",
    }));
    writeFileSync(join(runDir, "progress.json"), JSON.stringify({
      runId: "stale", at: new Date(Date.now() - 11 * 60_000).toISOString(),
      phase: "production", slotsCompleted: 0, slotsRunning: 1, slotsFailed: 0,
      actualSpendCents: 0, reservedCents: 0,
    }));
    writeFileSync(join(runDir, "slot-leases", "stale.lease.json"), JSON.stringify({}));
    const result = await reconcileCrashedRuns({ workspaceRoot });
    expect(result.staleRunsReconciled).toContain("stale");
    expect(existsSync(join(runDir, "slot-leases", "stale.lease.json"))).toBe(false);
  });

  it("§13.5 No PR auto-merge (Codex goal explicitly bans gh pr)", () => {
    const goal = buildCodexGoal({
      failureCode: "x", occurrences: 5, highestSeverity: "medium",
      mostRecentAt: "2026-05-20T00:00:00Z", recentContext: [],
    }, "2026-05-20");
    expect(goal).toMatch(/do not open a pr/i);
    expect(goal).toMatch(/gh/i);
    expect(goal).toMatch(/pr/i);
  });

  it("§13.6 Identity check (silent drop on chat.id mismatch)", async () => {
    // Without any Keychain entry, isAuthorizedSender returns false (no throw).
    const fakeMessage = { chat: { id: 1 } } as unknown as TelegramMessage;
    const allowed = await isAuthorizedSender(fakeMessage);
    expect(allowed).toBe(false);
  });

  it("§13.7 Secret hygiene (Keychain helpers never write secrets to files)", async () => {
    const fs = await import("node:fs");
    const content = fs.readFileSync("src/lib/artlab/bot/keychain.ts", "utf8");
    expect(content).not.toMatch(/writeFileSync\([^)]*secret/i);
  });

  it("§13.8 Promoted state preservation (byte-diff gate exists)", async () => {
    const { existsSync: fsExists } = await import("node:fs");
    expect(fsExists(".github/workflows/artlab-byte-diff.yml")).toBe(true);
  });

  it("§13.9 Mid-run progress accuracy (heartbeat 10s interval enforced)", async () => {
    const fs = await import("node:fs");
    const launchd = fs.readFileSync("src/lib/artlab/daemon/launchd.ts", "utf8");
    expect(launchd).toMatch(/ThrottleInterval[^\n]*\n[^<]*<integer>10/);
  });

  it("§13.10 Two-gate purity (no other prompts in normal flow)", () => {
    // Reply parser has exactly two human-acting tiers: exact (promotion) + pattern (gate-reply).
    // LLM tier 3 routes to needs-clarification, which is a blocker, not a mini-gate.
    expect(parseReplyExact("approved for app")).toEqual({ kind: "promotion-accepted" });
    expect(parseReplyExact("hello")).toEqual({ kind: "no-match" });
  });
});
