import { randomUUID } from "node:crypto";
import { classifyInbound } from "./inbound-classifier";
import { handleBotCommand } from "./commands";
import { parseReply, type ComposedReplyResult } from "./reply-parser";
import { isAuthorizedSender } from "./identity";
import type { TelegramClient, TelegramMessage } from "./telegram-client";
import type { ArtLabLlmBrain } from "../orchestrator/llm-brain";
import { routeRequest } from "../intake/router";
import { parseBundle } from "../intake/bundle-parser";
import { saveReferenceAttachment } from "../intake/reference-attachment-fs";
import { enqueueRun } from "../queue/queue";

export interface DispatchInboundInput {
  workspaceRoot: string;
  telegram: TelegramClient;
  brain: ArtLabLlmBrain;
  message: TelegramMessage;
  now?: () => Date;
}

export interface DispatchInboundResult {
  action:
    | { type: "dropped"; reason: "unauthorized" }
    | { type: "command-handled"; commandName: string }
    | { type: "gate-reply"; reply: ComposedReplyResult }
    | { type: "promotion-accepted" }
    | { type: "trigger-enqueued"; runIds: string[] };
}

export async function dispatchInboundMessage(input: DispatchInboundInput): Promise<DispatchInboundResult> {
  if (!(await isAuthorizedSender(input.message))) {
    return { action: { type: "dropped", reason: "unauthorized" } };
  }
  const classified = classifyInbound(input.message);
  const now = input.now ?? (() => new Date());
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
    case "trigger": {
      const runId = enqueueSingleRun({
        workspaceRoot: input.workspaceRoot,
        request: classified.text,
        sourceSurface: "telegram",
        chatId: input.message.chat.id,
        now,
      });
      await input.telegram.sendMessage({
        chatId: input.message.chat.id,
        text: `Got it — engine queued run ${runId}.`,
      });
      return { action: { type: "trigger-enqueued", runIds: [runId] } };
    }
    case "trigger-with-photo": {
      const runId = randomUUID();
      let attachmentPath: string | undefined;
      try {
        attachmentPath = await saveReferenceAttachment({
          workspaceRoot: input.workspaceRoot,
          runId,
          fileId: classified.photoFileId!,
          downloader: input.telegram,
        });
      } catch {
        // attachment fetch failure is non-fatal — proceed with text-only routing
      }
      const outcome = routeRequest({ request: classified.text });
      enqueueRun(input.workspaceRoot, {
        runId,
        priority: "default",
        enqueuedAt: now().toISOString(),
        spec: {
          sourceSurface: "telegram",
          intent: "produce",
          request: classified.text,
          assetType: outcome.assetType,
          characterId: outcome.characterId,
          chatId: input.message.chat.id,
          attachmentPath,
        },
      });
      await input.telegram.sendMessage({
        chatId: input.message.chat.id,
        text: `Got it — engine queued run ${runId} with your reference photo.`,
      });
      return { action: { type: "trigger-enqueued", runIds: [runId] } };
    }
    case "bundle": {
      const bundle = parseBundle(classified.text);
      const runIds: string[] = [];
      if (bundle) {
        for (const child of bundle.children) {
          const runId = randomUUID();
          enqueueRun(input.workspaceRoot, {
            runId,
            priority: "default",
            enqueuedAt: now().toISOString(),
            spec: {
              sourceSurface: "telegram",
              intent: "produce",
              request: child.request,
              assetType: child.assetType,
              characterId: child.characterHint,
              chatId: input.message.chat.id,
              bundleId: bundle.bundleId,
            },
          });
          runIds.push(runId);
        }
      } else {
        runIds.push(enqueueSingleRun({
          workspaceRoot: input.workspaceRoot,
          request: classified.text,
          sourceSurface: "telegram",
          chatId: input.message.chat.id,
          now,
        }));
      }
      await input.telegram.sendMessage({
        chatId: input.message.chat.id,
        text: `Got it — engine queued ${runIds.length} run${runIds.length === 1 ? "" : "s"} from your bundle.`,
      });
      return { action: { type: "trigger-enqueued", runIds } };
    }
  }
}

function enqueueSingleRun(input: {
  workspaceRoot: string;
  request: string;
  sourceSurface: "telegram" | "cli";
  chatId?: number;
  now: () => Date;
}): string {
  const outcome = routeRequest({ request: input.request });
  const runId = randomUUID();
  enqueueRun(input.workspaceRoot, {
    runId,
    priority: "default",
    enqueuedAt: input.now().toISOString(),
    spec: {
      sourceSurface: input.sourceSurface,
      intent: "produce",
      request: input.request,
      assetType: outcome.assetType,
      characterId: outcome.characterId,
      ...(input.chatId !== undefined ? { chatId: input.chatId } : {}),
    },
  });
  return runId;
}
