// src/lib/artlab/daemon/telegram-poller.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TelegramClient } from "@/lib/artlab/bot/telegram-client";
import { createTelegramPoller } from "./telegram-poller";

function mockClient(overrides: Partial<TelegramClient> = {}): TelegramClient {
  return {
    getUpdates: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn(),
    sendMediaGroup: vi.fn(),
    downloadFile: vi.fn(),
    answerCallbackQuery: vi.fn(),
    editMessageReplyMarkup: vi.fn(),
    ...overrides,
  };
}

describe("telegram poller", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-tp-")); });

  it("first tick uses offset=0 then offset=lastUpdateId+1", async () => {
    const updates = [
      { update_id: 7, message: { chat: { id: 1 }, message_id: 1, text: "hi", date: 0 } },
      { update_id: 9, message: { chat: { id: 1 }, message_id: 2, text: "/status", date: 0 } },
    ];
    const client = mockClient({
      getUpdates: vi.fn()
        .mockResolvedValueOnce(updates)
        .mockResolvedValueOnce([]),
    });
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    expect(client.getUpdates).toHaveBeenCalledWith({ offset: 0 });
    await poller.tick();
    expect(client.getUpdates).toHaveBeenLastCalledWith({ offset: 10 });
  });

  it("persists last offset between ticks via offset.json", async () => {
    const updates = [{ update_id: 99, message: { chat: { id: 1 }, message_id: 1, text: "hi", date: 0 } }];
    const client = mockClient({
      getUpdates: vi.fn().mockResolvedValueOnce(updates),
    });
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    const offsetPath = join(workspaceRoot, "telegram-offset.json");
    expect(existsSync(offsetPath)).toBe(true);
    const parsed = JSON.parse(readFileSync(offsetPath, "utf8"));
    expect(parsed.lastUpdateId).toBe(99);
  });

  it("dispatches each message exactly once", async () => {
    const client = mockClient({
      getUpdates: vi.fn().mockResolvedValueOnce([
        { update_id: 1, message: { chat: { id: 1 }, message_id: 1, text: "a", date: 0 } },
        { update_id: 2, message: { chat: { id: 1 }, message_id: 2, text: "b", date: 0 } },
      ]),
    });
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("passes callback_query updates through to dispatch", async () => {
    const client = mockClient({
      getUpdates: vi.fn().mockResolvedValueOnce([
        {
          update_id: 4,
          callback_query: {
            id: "cb-1",
            from: { id: 1 },
            data: "gate:c:a4f3c721:d3",
            message: { chat: { id: 1 }, message_id: 5, date: 0 },
          },
        },
      ]),
    });
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "callback-handled" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    expect(dispatch).toHaveBeenCalledTimes(1);
    const arg = dispatch.mock.calls[0]![0] as { callbackQuery?: { id: string } };
    expect(arg.callbackQuery?.id).toBe("cb-1");
  });

  it("does not stall on a poison message — advances offset past the failing update and logs to daemon-errors.jsonl", async () => {
    const client = mockClient({
      getUpdates: vi.fn()
        .mockResolvedValueOnce([
          { update_id: 1, message: { chat: { id: 1 }, message_id: 1, text: "good", date: 0 } },
          { update_id: 2, message: { chat: { id: 1 }, message_id: 2, text: "poison", date: 0 } },
          { update_id: 3, message: { chat: { id: 1 }, message_id: 3, text: "good", date: 0 } },
        ])
        .mockResolvedValueOnce([]),
    });
    const dispatch = vi.fn(async (opts: { message?: { text?: string } }) => {
      if (opts.message?.text === "poison") throw new Error("dispatch failure");
      return { action: { type: "dropped" as const, reason: "unauthorized" as const } };
    });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    expect(dispatch).toHaveBeenCalledTimes(3); // all three messages tried, poison did not block #3
    const offsetPath = join(workspaceRoot, "telegram-offset.json");
    expect(JSON.parse(readFileSync(offsetPath, "utf8")).lastUpdateId).toBe(3);
    const errorsPath = join(workspaceRoot, "daemon-errors.jsonl");
    expect(existsSync(errorsPath)).toBe(true);
    const errorLine = readFileSync(errorsPath, "utf8").trim().split("\n")[0]!;
    const parsed = JSON.parse(errorLine);
    expect(parsed.source).toBe("telegram-poller");
    expect(parsed.updateId).toBe(2);
    expect(parsed.message).toContain("dispatch failure");
    await poller.tick();
    expect(client.getUpdates).toHaveBeenLastCalledWith({ offset: 4 });
  });
});
