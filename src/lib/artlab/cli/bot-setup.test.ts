// src/lib/artlab/cli/bot-setup.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { runBotSetupSubcommand } from "./bot-setup";
import { getKeychainSecret, setKeychainSecret, deleteKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "@/lib/artlab/bot/keychain";

describe("artlab bot setup", () => {
  const TOKEN_SVC = `${ARTLAB_KEYCHAIN_PREFIX}-telegram-token`;
  const CHAT_ID_SVC = `${ARTLAB_KEYCHAIN_PREFIX}-chat-id`;
  // The bot-setup CLI writes to fixed production keychain service names. Save
  // any pre-existing values (developer's real bot creds) before the test
  // overwrites them, and restore on cleanup so the test never destroys the
  // local daemon's wiring.
  let prevToken: string | null = null;
  let prevChatId: string | null = null;

  beforeEach(async () => {
    prevToken = await getKeychainSecret(TOKEN_SVC).catch(() => null);
    prevChatId = await getKeychainSecret(CHAT_ID_SVC).catch(() => null);
    await deleteKeychainSecret(TOKEN_SVC).catch(() => undefined);
    await deleteKeychainSecret(CHAT_ID_SVC).catch(() => undefined);
  });
  afterEach(async () => {
    if (prevToken !== null) {
      await setKeychainSecret(TOKEN_SVC, prevToken).catch(() => undefined);
    } else {
      await deleteKeychainSecret(TOKEN_SVC).catch(() => undefined);
    }
    if (prevChatId !== null) {
      await setKeychainSecret(CHAT_ID_SVC, prevChatId).catch(() => undefined);
    } else {
      await deleteKeychainSecret(CHAT_ID_SVC).catch(() => undefined);
    }
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
