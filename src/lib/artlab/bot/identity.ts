import { getKeychainSecret } from "./keychain";
import type { TelegramMessage } from "./telegram-client";

export const ARTLAB_CHAT_ID_KEYCHAIN_SERVICE = "tower-artlab-chat-id";

export async function isAuthorizedSender(message: TelegramMessage): Promise<boolean> {
  const stored = await getKeychainSecret(ARTLAB_CHAT_ID_KEYCHAIN_SERVICE);
  if (stored === null) return false;
  const storedId = Number.parseInt(stored, 10);
  if (!Number.isFinite(storedId)) return false;
  return message.chat.id === storedId;
}
