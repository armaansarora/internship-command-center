import { getKeychainSecret } from "./keychain";
import type { TelegramCallbackQuery, TelegramMessage } from "./telegram-client";

export const ARTLAB_CHAT_ID_KEYCHAIN_SERVICE = "tower-artlab-chat-id";

async function authorizedChatId(): Promise<number | null> {
  const stored = await getKeychainSecret(ARTLAB_CHAT_ID_KEYCHAIN_SERVICE);
  if (stored === null) return null;
  const storedId = Number.parseInt(stored, 10);
  return Number.isFinite(storedId) ? storedId : null;
}

export async function isAuthorizedSender(message: TelegramMessage): Promise<boolean> {
  const expected = await authorizedChatId();
  if (expected === null) return false;
  return message.chat.id === expected;
}

export async function isAuthorizedCallback(callback: TelegramCallbackQuery): Promise<boolean> {
  const expected = await authorizedChatId();
  if (expected === null) return false;
  if (callback.message?.chat.id === expected) return true;
  // Some callback payloads omit the originating chat; allow if sender id matches.
  return callback.from.id === expected;
}
