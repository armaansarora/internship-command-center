import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchInboundMessage } from "./bot-dispatcher";
import { getKeychainSecret, setKeychainSecret, deleteKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "./keychain";
import type { TelegramClient } from "./telegram-client";
import type { ArtLabLlmBrain } from "../orchestrator/llm-brain";

const TEST_CHAT_ID = 8675309;
const TEST_SERVICE = `${ARTLAB_KEYCHAIN_PREFIX}-chat-id`;

describe("bot integration — auth + classify + parse + ack", () => {
  let workspaceRoot: string;
  let sentMessages: { chatId: number; text: string }[];
  // Production daemon reads chat-id from the same keychain service. Save and
  // restore any pre-existing value so a developer running tests doesn't
  // accidentally lose their bot wiring.
  let prevChatId: string | null = null;

  beforeEach(async () => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-bot-int-"));
    sentMessages = [];
    prevChatId = await getKeychainSecret(TEST_SERVICE).catch(() => null);
    await setKeychainSecret(TEST_SERVICE, String(TEST_CHAT_ID));
  });

  afterEach(async () => {
    if (prevChatId !== null) {
      await setKeychainSecret(TEST_SERVICE, prevChatId).catch(() => undefined);
    } else {
      await deleteKeychainSecret(TEST_SERVICE).catch(() => undefined);
    }
  });

  function createClient(): TelegramClient {
    return {
      sendMessage: vi.fn().mockImplementation(async (o: { chatId: number; text: string }) => {
        sentMessages.push({ chatId: o.chatId, text: o.text });
        return { message_id: 1 };
      }),
      sendMediaGroup: vi.fn(),
      getUpdates: vi.fn(),
      downloadFile: vi.fn(),
      answerCallbackQuery: vi.fn(),
      editMessageReplyMarkup: vi.fn(),
    } as unknown as TelegramClient;
  }

  const mockBrain: ArtLabLlmBrain = {
    async decide() {
      return { kind: "reply-parser-fallback", outputJson: {}, confidence: 0, tokensIn: 0, tokensOut: 0, model: "claude-opus-4-7" };
    },
  };

  it("rejects unauthorized chat.id silently", async () => {
    const r = await dispatchInboundMessage({
      workspaceRoot, telegram: createClient(), brain: mockBrain,
      message: { chat: { id: 1234 }, message_id: 1, text: "make Sol", date: 0 },
    });
    expect(r.action).toEqual({ type: "dropped", reason: "unauthorized" });
    expect(sentMessages).toHaveLength(0);
  });

  it("authorized /status replies with 'no runs'", async () => {
    const r = await dispatchInboundMessage({
      workspaceRoot, telegram: createClient(), brain: mockBrain,
      message: { chat: { id: TEST_CHAT_ID }, message_id: 1, text: "/status", date: 0 },
    });
    expect(r.action.type).toBe("command-handled");
    expect(sentMessages[0]!.text).toMatch(/no active runs|active runs \(0\)/i);
  });

  it("'approved for app' is routed as promotion-accepted (action type is the contract)", async () => {
    const r = await dispatchInboundMessage({
      workspaceRoot, telegram: createClient(), brain: mockBrain,
      message: { chat: { id: TEST_CHAT_ID }, message_id: 1, text: "approved for app", date: 0 },
    });
    expect(r.action).toEqual({ type: "promotion-accepted" });
    // The dispatcher tries to advance a run at final-review; with no run in
    // this synthetic workspace it surfaces the no-run-at-final-review reason.
    // Either the success or the "couldn't find a run" message proves the
    // dispatcher routed the reply through the promotion path correctly.
    expect(sentMessages[0]!.text).toMatch(/promotion accepted|final-review gate/i);
  });
});
