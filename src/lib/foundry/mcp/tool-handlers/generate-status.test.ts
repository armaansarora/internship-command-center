import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleFoundryGenerateStatus } from "./generate-status";

let workspaceRoot: string;
const RUN_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), "foundry-status-"));
});

function seedRun(state: Record<string, unknown>): void {
  const dir = join(workspaceRoot, "runs", RUN_ID);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "run-state.json"), JSON.stringify(state));
}

describe("handleFoundryGenerateStatus", () => {
  it("translates ArtLab run state into a Foundry status payload", async () => {
    seedRun({
      runId: RUN_ID,
      phase: "production",
      blocker: null,
      createdAt: "2026-05-25T12:00:00.000Z",
      updatedAt: "2026-05-25T12:10:00.000Z",
      progress: {
        phaseElapsedMs: 60000,
        estimatedRemainingMs: 240000,
        expectedSlotCount: 4,
        renderedSlotCount: 2,
      },
    });
    const result = await handleFoundryGenerateStatus({ runId: RUN_ID }, { workspaceRoot });
    expect(result.runId).toBe(RUN_ID);
    expect(result.status).toBe("running");
    expect(result.phase).toBe("production");
    expect(result.percentComplete).toBeGreaterThan(0);
    expect(result.etaSeconds).toBeGreaterThan(0);
  });

  it("maps phase=closed to status=promoted and emits promotedPackId when present", async () => {
    seedRun({
      runId: RUN_ID,
      phase: "closed",
      blocker: null,
      createdAt: "2026-05-25T12:00:00.000Z",
      updatedAt: "2026-05-25T12:30:00.000Z",
      progress: {
        phaseElapsedMs: 5000,
        estimatedRemainingMs: 0,
        expectedSlotCount: 1,
        renderedSlotCount: 1,
      },
      promotedPackId: "rafe-v4",
    });
    const result = await handleFoundryGenerateStatus({ runId: RUN_ID }, { workspaceRoot });
    expect(result.status).toBe("promoted");
    expect(result.percentComplete).toBe(100);
    expect(result.promotedPackId).toBe("rafe-v4");
  });

  it("maps blocker fields to the blockers array", async () => {
    seedRun({
      runId: RUN_ID,
      phase: "strict-qa",
      blocker: "needs-human",
      createdAt: "2026-05-25T12:00:00.000Z",
      updatedAt: "2026-05-25T12:15:00.000Z",
      progress: {
        phaseElapsedMs: 30000,
        estimatedRemainingMs: 0,
        expectedSlotCount: 1,
        renderedSlotCount: 1,
      },
    });
    const result = await handleFoundryGenerateStatus({ runId: RUN_ID }, { workspaceRoot });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toEqual(["needs-human"]);
  });

  it("throws if runId is unknown", async () => {
    await expect(
      handleFoundryGenerateStatus({ runId: RUN_ID }, { workspaceRoot }),
    ).rejects.toThrow(/run not found/i);
  });

  it("returns status=queued when only the foundry inbox file exists (no run-state yet)", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "foundry");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(
      join(inboxDir, `generate-${RUN_ID}.json`),
      JSON.stringify({ runId: RUN_ID, queuedAt: "2026-05-25T00:00:00.000Z", source: "foundry-mcp" }),
    );
    const result = await handleFoundryGenerateStatus({ runId: RUN_ID }, { workspaceRoot });
    expect(result.status).toBe("queued");
    expect(result.phase).toBe("queued");
    expect(result.percentComplete).toBe(0);
    expect(result.blockers).toEqual([]);
    expect(result.updatedAt).toBeTruthy();
  });

  it("error message hints at the processed-but-missing case when applicable", async () => {
    // Inbox file was archived by the poller but run-state.json was lost.
    const processed = join(workspaceRoot, "inbox", "foundry", ".processed");
    mkdirSync(processed, { recursive: true });
    writeFileSync(
      join(processed, `${RUN_ID}.json`),
      JSON.stringify({ runId: RUN_ID }),
    );
    await expect(
      handleFoundryGenerateStatus({ runId: RUN_ID }, { workspaceRoot }),
    ).rejects.toThrow(/run-state\.json missing/);
  });
});
