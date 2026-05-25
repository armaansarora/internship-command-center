// src/lib/artlab/daemon/daemon.integration.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDaemonContext, runDaemonOnce } from "./entry";
import { createTelegramPoller } from "./telegram-poller";
import { createQueueProcessor } from "./queue-processor";
import { createSupervisor } from "./supervisor";
import { enqueueRun } from "@/lib/artlab/queue/queue";

describe("daemon integration", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-di-")); });

  it("single tick: heartbeat + telegram poll + queue drain", async () => {
    const sup = createSupervisor();
    const spawnRunner = vi.fn().mockReturnValue({ pid: 999, on: vi.fn(), kill: vi.fn() });
    const queueProcessor = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner });
    const tgClient = {
      getUpdates: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn(),
      sendMediaGroup: vi.fn(),
      downloadFile: vi.fn(),
      answerCallbackQuery: vi.fn(),
      editMessageReplyMarkup: vi.fn(),
    };
    const tgDispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const telegramPoller = createTelegramPoller({ workspaceRoot, client: tgClient, dispatch: tgDispatch });
    enqueueRun(workspaceRoot, { runId: "first", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    const ctx = createDaemonContext({ workspaceRoot, telegramPoller, queueProcessor });
    await runDaemonOnce(ctx);
    expect(existsSync(join(workspaceRoot, "daemon-heartbeat.json"))).toBe(true);
    expect(tgClient.getUpdates).toHaveBeenCalled();
    expect(spawnRunner).toHaveBeenCalledWith(expect.objectContaining({ runId: "first" }));
    expect(sup.activeChildren()).toHaveLength(1);
  });
});
