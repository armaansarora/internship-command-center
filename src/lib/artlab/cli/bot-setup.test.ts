// src/lib/artlab/cli/bot-setup.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { runBotSetupSubcommand } from "./bot-setup";
import { getKeychainSecret, deleteKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "@/lib/artlab/bot/keychain";

describe("artlab bot setup", () => {
  const TOKEN_SVC = `${ARTLAB_KEYCHAIN_PREFIX}-telegram-token`;
  const CHAT_ID_SVC = `${ARTLAB_KEYCHAIN_PREFIX}-chat-id`;

  beforeEach(async () => {
    await deleteKeychainSecret(TOKEN_SVC).catch(() => undefined);
    await deleteKeychainSecret(CHAT_ID_SVC).catch(() => undefined);
  });
  afterEach(async () => {
    await deleteKeychainSecret(TOKEN_SVC).catch(() => undefined);
    await deleteKeychainSecret(CHAT_ID_SVC).catch(() => undefined);
  });

  it("writes both Keychain entries when --token and --chat-id provided non-interactively", async () => {
    const result = await runBotSetupSubcommand({
      args: ["--token", "TEST_TOKEN_123", "--chat-id", "8675309"],
    });
    expect(result.exitCode).toBe(0);
    expect(await getKeychainSecret(TOKEN_SVC)).toBe("TEST_TOKEN_123");
    expect(await getKeychainSecret(CHAT_ID_SVC)).toBe("8675309");
  });

  it("exits 2 when --token missing", async () => {
    const result = await runBotSetupSubcommand({ args: ["--chat-id", "8675309"] });
    expect(result.exitCode).toBe(2);
  });

  it("exits 2 when --chat-id is not numeric", async () => {
    const result = await runBotSetupSubcommand({ args: ["--token", "T", "--chat-id", "not-a-number"] });
    expect(result.exitCode).toBe(2);
  });
});
