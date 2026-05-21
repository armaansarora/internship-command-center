import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isAuthorizedSender, ARTLAB_CHAT_ID_KEYCHAIN_SERVICE } from "./identity";
import * as keychain from "./keychain";
import type { TelegramMessage } from "./telegram-client";

function msg(chatId: number): TelegramMessage {
  return { message_id: 1, chat: { id: chatId }, date: 0 };
}

describe("telegram identity verifier", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("returns true when chat.id matches the Keychain stored id", async () => {
    vi.spyOn(keychain, "getKeychainSecret").mockResolvedValue("12345");
    expect(await isAuthorizedSender(msg(12345))).toBe(true);
  });

  it("returns false when chat.id does not match", async () => {
    vi.spyOn(keychain, "getKeychainSecret").mockResolvedValue("12345");
    expect(await isAuthorizedSender(msg(99999))).toBe(false);
  });

  it("returns false (no throw) when Keychain entry missing", async () => {
    vi.spyOn(keychain, "getKeychainSecret").mockResolvedValue(null);
    expect(await isAuthorizedSender(msg(1))).toBe(false);
  });

  it("uses the canonical Keychain service slug", () => {
    expect(ARTLAB_CHAT_ID_KEYCHAIN_SERVICE).toBe("tower-artlab-chat-id");
  });
});
