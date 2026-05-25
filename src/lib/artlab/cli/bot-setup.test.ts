// src/lib/artlab/cli/bot-setup.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { runBotSetupSubcommand } from "./bot-setup";
import { getKeychainSecret, setKeychainSecret, deleteKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "@/lib/artlab/bot/keychain";

describe("artlab bot setup", () => {
  const TOKEN_SVC = `${ARTLAB_KEYCHAIN_PREFIX}-telegram-token`;
  const CHAT_ID_SVC = `${ARTLAB_KEYCHAIN_PREFIX}-chat-id`;
  const GEMINI_SVC = `${ARTLAB_KEYCHAIN_PREFIX}-gemini-key`;
  // The bot-setup CLI writes to fixed production keychain service names. Save
  // any pre-existing values (developer's real bot creds) before the test
  // overwrites them, and restore on cleanup so the test never destroys the
  // local daemon's wiring.
  let prevToken: string | null = null;
  let prevChatId: string | null = null;
  let prevGemini: string | null = null;

  beforeEach(async () => {
    prevToken = await getKeychainSecret(TOKEN_SVC).catch(() => null);
    prevChatId = await getKeychainSecret(CHAT_ID_SVC).catch(() => null);
    prevGemini = await getKeychainSecret(GEMINI_SVC).catch(() => null);
    await deleteKeychainSecret(TOKEN_SVC).catch(() => undefined);
    await deleteKeychainSecret(CHAT_ID_SVC).catch(() => undefined);
    await deleteKeychainSecret(GEMINI_SVC).catch(() => undefined);
  });
  afterEach(async () => {
    if (prevToken !== null) await setKeychainSecret(TOKEN_SVC, prevToken).catch(() => undefined);
    else await deleteKeychainSecret(TOKEN_SVC).catch(() => undefined);
    if (prevChatId !== null) await setKeychainSecret(CHAT_ID_SVC, prevChatId).catch(() => undefined);
    else await deleteKeychainSecret(CHAT_ID_SVC).catch(() => undefined);
    if (prevGemini !== null) await setKeychainSecret(GEMINI_SVC, prevGemini).catch(() => undefined);
    else await deleteKeychainSecret(GEMINI_SVC).catch(() => undefined);
  });

  it("writes both Keychain entries when --token and --chat-id provided non-interactively", async () => {
    const result = await runBotSetupSubcommand({
      args: ["--token", "TEST_TOKEN_123", "--chat-id", "8675309"],
    });
    expect(result.exitCode).toBe(0);
    expect(await getKeychainSecret(TOKEN_SVC)).toBe("TEST_TOKEN_123");
    expect(await getKeychainSecret(CHAT_ID_SVC)).toBe("8675309");
    expect(await getKeychainSecret(GEMINI_SVC)).toBeNull();
  });

  it("writes the gemini-key entry when --gemini-key provided alone", async () => {
    const result = await runBotSetupSubcommand({
      args: ["--gemini-key", "AIza_test_gemini_key_xyz"],
    });
    expect(result.exitCode).toBe(0);
    expect(await getKeychainSecret(GEMINI_SVC)).toBe("AIza_test_gemini_key_xyz");
    expect(await getKeychainSecret(TOKEN_SVC)).toBeNull();
    expect(await getKeychainSecret(CHAT_ID_SVC)).toBeNull();
  });

  it("writes all three Keychain entries when all flags provided together", async () => {
    const result = await runBotSetupSubcommand({
      args: ["--token", "T", "--chat-id", "1", "--gemini-key", "G"],
    });
    expect(result.exitCode).toBe(0);
    expect(await getKeychainSecret(TOKEN_SVC)).toBe("T");
    expect(await getKeychainSecret(CHAT_ID_SVC)).toBe("1");
    expect(await getKeychainSecret(GEMINI_SVC)).toBe("G");
  });

  it("exits 2 when --token missing but --chat-id supplied", async () => {
    const result = await runBotSetupSubcommand({ args: ["--chat-id", "8675309"] });
    expect(result.exitCode).toBe(2);
  });

  it("exits 2 when --chat-id is not numeric", async () => {
    const result = await runBotSetupSubcommand({ args: ["--token", "T", "--chat-id", "not-a-number"] });
    expect(result.exitCode).toBe(2);
  });

  it("exits 2 when no flags are provided", async () => {
    const result = await runBotSetupSubcommand({ args: [] });
    expect(result.exitCode).toBe(2);
  });
});
