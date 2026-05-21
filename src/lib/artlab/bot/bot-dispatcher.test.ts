import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchInboundMessage } from "./bot-dispatcher";
import * as identity from "./identity";
import type { TelegramClient } from "./telegram-client";
import type { ArtLabLlmBrain } from "../orchestrator/llm-brain";

describe("telegram bot dispatcher", () => {
  let workspaceRoot: string;
  let sentMessages: { chatId: number; text: string }[];

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-disp-"));
    sentMessages = [];
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  function createClient(): TelegramClient {
    return {
      sendMessage: vi.fn().mockImplementation(async (o: { chatId: number; text: string }) => {
        sentMessages.push({ chatId: o.chatId, text: o.text });
        return { message_id: 1 };
      }),
      sendMediaGroup: vi.fn(),
      getUpdates: vi.fn(),
      downloadFile: vi.fn(),
    } as unknown as TelegramClient;
  }

  const mockBrain: ArtLabLlmBrain = {
    async decide() {
      return { kind: "reply-parser-fallback", outputJson: {}, confidence: 0, tokensIn: 0, tokensOut: 0, model: "claude-opus-4-7" };
    },
  };

  it("silently drops messages from unauthorized chat.id (safety property #6)", async () => {
    vi.spyOn(identity, "isAuthorizedSender").mockResolvedValue(false);
    await dispatchInboundMessage({
      workspaceRoot, telegram: createClient(), brain: mockBrain,
      message: { chat: { id: 99 }, message_id: 1, text: "evil", date: 0 },
    });
    expect(sentMessages).toHaveLength(0);
  });

  it("handles /status for authorized sender", async () => {
    vi.spyOn(identity, "isAuthorizedSender").mockResolvedValue(true);
    await dispatchInboundMessage({
      workspaceRoot, telegram: createClient(), brain: mockBrain,
      message: { chat: { id: 1 }, message_id: 1, text: "/status", date: 0 },
    });
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]!.text).toMatch(/no .* runs/i);
  });

  it("accepts 'approved for app'", async () => {
    vi.spyOn(identity, "isAuthorizedSender").mockResolvedValue(true);
    const r = await dispatchInboundMessage({
      workspaceRoot, telegram: createClient(), brain: mockBrain,
      message: { chat: { id: 1 }, message_id: 1, text: "approved for app", date: 0 },
    });
    expect(r.action).toEqual({ type: "promotion-accepted" });
  });
});
