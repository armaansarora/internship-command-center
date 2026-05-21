// src/lib/artlab/daemon/telegram-poller.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TelegramClient } from "@/lib/artlab/bot/telegram-client";
import { createTelegramPoller } from "./telegram-poller";

describe("telegram poller", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-tp-")); });

  it("first tick uses offset=0 then offset=lastUpdateId+1", async () => {
    const updates = [
      { update_id: 7, message: { chat: { id: 1 }, message_id: 1, text: "hi", date: 0 } },
      { update_id: 9, message: { chat: { id: 1 }, message_id: 2, text: "/status", date: 0 } },
    ];
    const client = {
      getUpdates: vi.fn()
        .mockResolvedValueOnce(updates)
        .mockResolvedValueOnce([]),
      sendMessage: vi.fn(),
      sendMediaGroup: vi.fn(),
      downloadFile: vi.fn(),
    } satisfies TelegramClient;
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    expect(client.getUpdates).toHaveBeenCalledWith({ offset: 0 });
    await poller.tick();
    expect(client.getUpdates).toHaveBeenLastCalledWith({ offset: 10 });
  });

  it("persists last offset between ticks via offset.json", async () => {
    const updates = [{ update_id: 99, message: { chat: { id: 1 }, message_id: 1, text: "hi", date: 0 } }];
    const client = {
      getUpdates: vi.fn().mockResolvedValueOnce(updates),
      sendMessage: vi.fn(),
      sendMediaGroup: vi.fn(),
      downloadFile: vi.fn(),
    } satisfies TelegramClient;
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    const offsetPath = join(workspaceRoot, "telegram-offset.json");
    expect(existsSync(offsetPath)).toBe(true);
    const parsed = JSON.parse(readFileSync(offsetPath, "utf8"));
    expect(parsed.lastUpdateId).toBe(99);
  });

  it("dispatches each message exactly once", async () => {
    const client = {
      getUpdates: vi.fn().mockResolvedValueOnce([
        { update_id: 1, message: { chat: { id: 1 }, message_id: 1, text: "a", date: 0 } },
        { update_id: 2, message: { chat: { id: 1 }, message_id: 2, text: "b", date: 0 } },
      ]),
      sendMessage: vi.fn(),
      sendMediaGroup: vi.fn(),
      downloadFile: vi.fn(),
    } satisfies TelegramClient;
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});
