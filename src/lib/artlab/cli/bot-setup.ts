// src/lib/artlab/cli/bot-setup.ts
import { setKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "@/lib/artlab/bot/keychain";

export interface BotSetupSubcommandInput {
  args: string[];
}

export interface BotSetupSubcommandResult {
  exitCode: number;
  message?: string;
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx === args.length - 1) return undefined;
  return args[idx + 1];
}

export async function runBotSetupSubcommand(input: BotSetupSubcommandInput): Promise<BotSetupSubcommandResult> {
  const token = getFlag(input.args, "--token");
  const chatId = getFlag(input.args, "--chat-id");
  if (!token) return { exitCode: 2, message: "bot setup: expected --token <BotFather-token>" };
  if (!chatId) return { exitCode: 2, message: "bot setup: expected --chat-id <numeric>" };
  if (!/^-?\d+$/.test(chatId)) return { exitCode: 2, message: "bot setup: --chat-id must be numeric" };
  await setKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-telegram-token`, token);
  await setKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-chat-id`, chatId);
  return {
    exitCode: 0,
    message: `Bot setup complete. Token and chat.id stored in macOS Keychain under ${ARTLAB_KEYCHAIN_PREFIX}-* services.`,
  };
}
