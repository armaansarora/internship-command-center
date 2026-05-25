// src/lib/artlab/cli/bot-setup.ts
//
// Stores secrets that the daemon reads at start time. All four secrets are
// macOS Keychain entries under the `tower-artlab-*` service namespace:
//
//   tower-artlab-telegram-token  — BotFather token; daemon's telegram-poller uses it
//   tower-artlab-chat-id         — authorized chat.id; identity check rejects others
//   tower-artlab-gemini-key      — Gemini API key; runners use for real image generation
//   tower-artlab-anthropic-key   — Claude API key; brain authors prompt variations + recommendations
//
// At least one of (--token + --chat-id), --gemini-key, or --anthropic-key
// must be supplied. --token and --chat-id are paired (set together or not at all).

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
  const geminiKey = getFlag(input.args, "--gemini-key");
  const anthropicKey = getFlag(input.args, "--anthropic-key");

  const hasTelegram = token !== undefined || chatId !== undefined;
  if (hasTelegram) {
    if (!token) return { exitCode: 2, message: "bot setup: expected --token <BotFather-token>" };
    if (!chatId) return { exitCode: 2, message: "bot setup: expected --chat-id <numeric>" };
    if (!/^-?\d+$/.test(chatId)) return { exitCode: 2, message: "bot setup: --chat-id must be numeric" };
  }

  if (!hasTelegram && !geminiKey && !anthropicKey) {
    return {
      exitCode: 2,
      message: "bot setup: expected --token <T> --chat-id <N> and/or --gemini-key <K> and/or --anthropic-key <K>",
    };
  }

  const stored: string[] = [];
  if (token && chatId) {
    await setKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-telegram-token`, token);
    await setKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-chat-id`, chatId);
    stored.push("telegram-token", "chat-id");
  }
  if (geminiKey) {
    await setKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-gemini-key`, geminiKey);
    stored.push("gemini-key");
  }
  if (anthropicKey) {
    await setKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-anthropic-key`, anthropicKey);
    stored.push("anthropic-key");
  }

  return {
    exitCode: 0,
    message: `Bot setup complete. Stored in macOS Keychain under ${ARTLAB_KEYCHAIN_PREFIX}-* services: ${stored.join(", ")}.`,
  };
}
