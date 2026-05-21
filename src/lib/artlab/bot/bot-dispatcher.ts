import { classifyInbound } from "./inbound-classifier";
import { handleBotCommand } from "./commands";
import { parseReply, type ComposedReplyResult } from "./reply-parser";
import { isAuthorizedSender } from "./identity";
import type { TelegramClient, TelegramMessage } from "./telegram-client";
import type { ArtLabLlmBrain } from "../orchestrator/llm-brain";

export interface DispatchInboundInput {
  workspaceRoot: string;
  telegram: TelegramClient;
  brain: ArtLabLlmBrain;
  message: TelegramMessage;
}

export interface DispatchInboundResult {
  action:
    | { type: "dropped"; reason: "unauthorized" }
    | { type: "command-handled"; commandName: string }
    | { type: "gate-reply"; reply: ComposedReplyResult }
    | { type: "promotion-accepted" }
    | { type: "trigger-enqueued"; runId: string };
}

export async function dispatchInboundMessage(input: DispatchInboundInput): Promise<DispatchInboundResult> {
  if (!(await isAuthorizedSender(input.message))) {
    return { action: { type: "dropped", reason: "unauthorized" } };
  }
  const classified = classifyInbound(input.message);
  switch (classified.kind) {
    case "command": {
      const out = await handleBotCommand({
        workspaceRoot: input.workspaceRoot,
        commandName: classified.commandName!,
        args: classified.text.split(/\s+/).slice(1),
      });
      await input.telegram.sendMessage({ chatId: input.message.chat.id, text: out.text });
      return { action: { type: "command-handled", commandName: classified.commandName! } };
    }
    case "promotion": {
      const parsed = await parseReply(classified.text, input.brain);
      if (parsed.kind === "promotion-accepted") {
        await input.telegram.sendMessage({ chatId: input.message.chat.id, text: "Promotion accepted. Engine continuing." });
        return { action: { type: "promotion-accepted" } };
      }
      if (parsed.kind === "echo-back-required-phrase") {
        await input.telegram.sendMessage({ chatId: input.message.chat.id, text: parsed.message });
      }
      return { action: { type: "gate-reply", reply: parsed } };
    }
    case "gate-reply": {
      const parsed = await parseReply(classified.text, input.brain);
      await input.telegram.sendMessage({ chatId: input.message.chat.id, text: `Reply received: ${classified.text}` });
      return { action: { type: "gate-reply", reply: parsed } };
    }
    case "trigger":
    case "trigger-with-photo":
    case "bundle": {
      await input.telegram.sendMessage({
        chatId: input.message.chat.id,
        text: `Got it — ${classified.kind}. Engine routing.`,
      });
      return { action: { type: "trigger-enqueued", runId: "pending-routing" } };
    }
  }
}
