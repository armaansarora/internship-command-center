import { randomUUID } from "node:crypto";
import { classifyCallback, classifyInbound } from "./inbound-classifier";
import { handleBotCommand } from "./commands";
import { parseReply, type ComposedReplyResult } from "./reply-parser";
import { isAuthorizedSender, isAuthorizedCallback } from "./identity";
import type { TelegramCallbackQuery, TelegramClient, TelegramMessage, TelegramInlineKeyboard } from "./telegram-client";
import type { ArtLabLlmBrain } from "../orchestrator/llm-brain";
import { routeRequest } from "../intake/router";
import { parseBundle } from "../intake/bundle-parser";
import { saveReferenceAttachment } from "../intake/reference-attachment-fs";
import { enqueueRun } from "../queue/queue";
import { advanceConceptApproval, advancePromotionApproval } from "./gate-advance";
import { displayFor } from "../intake/known-cast";
import {
  triggerAck,
  triggerWithPhotoAck,
  bundleAck,
  conceptApprovedAck,
  promotionAcceptedAck,
  gateReplyEcho,
  gateReplyNoMatch,
  callbackAck,
  type TelegramOutboundMessage,
} from "./message-templates";
import type { DecodedCallback } from "./inline-keyboards";

async function send(telegram: TelegramClient, chatId: number, msg: TelegramOutboundMessage): Promise<void> {
  await telegram.sendMessage({
    chatId,
    text: msg.text,
    ...(msg.parseMode ? { parseMode: msg.parseMode } : {}),
    ...(msg.replyMarkup ? { replyMarkup: msg.replyMarkup } : {}),
    ...(msg.disableWebPagePreview ? { disableWebPagePreview: true } : {}),
  });
}

function spaceLabelFor(space: string): string {
  return space
    .split("-")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

export interface DispatchInboundInput {
  workspaceRoot: string;
  telegram: TelegramClient;
  brain: ArtLabLlmBrain;
  message?: TelegramMessage;
  callbackQuery?: TelegramCallbackQuery;
  now?: () => Date;
}

export interface DispatchInboundResult {
  action:
    | { type: "dropped"; reason: "unauthorized" | "no-payload" | "unrecognized-callback" }
    | { type: "command-handled"; commandName: string }
    | { type: "gate-reply"; reply: ComposedReplyResult }
    | { type: "promotion-accepted" }
    | { type: "callback-handled"; callback: DecodedCallback }
    | { type: "trigger-enqueued"; runIds: string[] };
}

export async function dispatchInboundMessage(input: DispatchInboundInput): Promise<DispatchInboundResult> {
  if (input.callbackQuery) {
    return await dispatchCallback(input, input.callbackQuery);
  }
  if (!input.message) {
    return { action: { type: "dropped", reason: "no-payload" } };
  }
  return await dispatchTextOrPhoto(input, input.message);
}

async function dispatchCallback(input: DispatchInboundInput, callback: TelegramCallbackQuery): Promise<DispatchInboundResult> {
  if (!(await isAuthorizedCallback(callback))) {
    return { action: { type: "dropped", reason: "unauthorized" } };
  }
  const classified = classifyCallback(callback);
  if (!classified || !classified.callback) {
    await safeAnswerCallback(input.telegram, callback.id, "Unrecognized button.");
    return { action: { type: "dropped", reason: "unrecognized-callback" } };
  }
  const decoded = classified.callback;
  const chatId = callback.message?.chat.id;
  if (decoded.kind === "gate") {
    if (decoded.surface === "concept" && decoded.action.kind === "approve-direction") {
      const advance = await advanceConceptApproval({
        workspaceRoot: input.workspaceRoot,
        laneIndex: decoded.action.laneIndex,
      });
      if (advance.ok && chatId) {
        await safeAnswerCallback(
          input.telegram,
          callback.id,
          callbackAck({ surface: "concept", action: `d${decoded.action.laneIndex}` }).text,
        );
        if (callback.message) await safeClearKeyboard(input.telegram, callback.message.chat.id, callback.message.message_id);
        await send(input.telegram, chatId, conceptApprovedAck({ laneIndex: decoded.action.laneIndex, runId: advance.runId }));
      } else if (chatId) {
        await safeAnswerCallback(input.telegram, callback.id, "No run waiting at concept-review.", true);
        await send(input.telegram, chatId, gateReplyNoMatch({
          surface: "concept",
          laneIndex: decoded.action.laneIndex,
          reason: advance.ok ? "unknown" : advance.reason,
        }));
      }
      return { action: { type: "callback-handled", callback: decoded } };
    }
    if (decoded.surface === "final" && decoded.action.kind === "approve-final") {
      const advance = await advancePromotionApproval({ workspaceRoot: input.workspaceRoot });
      if (advance.ok && chatId) {
        await safeAnswerCallback(input.telegram, callback.id, callbackAck({ surface: "final", action: "a" }).text);
        if (callback.message) await safeClearKeyboard(input.telegram, callback.message.chat.id, callback.message.message_id);
        await send(input.telegram, chatId, promotionAcceptedAck({ runId: advance.runId }));
      } else if (chatId) {
        await safeAnswerCallback(input.telegram, callback.id, "No run waiting at final-review.", true);
        await send(input.telegram, chatId, gateReplyNoMatch({
          surface: "promotion",
          reason: advance.ok ? "unknown" : advance.reason,
        }));
      }
      return { action: { type: "callback-handled", callback: decoded } };
    }
    if (decoded.action.kind === "revise") {
      await safeAnswerCallback(input.telegram, callback.id, "Reply with: revise: <your change>");
      return { action: { type: "callback-handled", callback: decoded } };
    }
    if (decoded.action.kind === "reject") {
      await safeAnswerCallback(input.telegram, callback.id, "Reply 'reject' to abandon this run.");
      return { action: { type: "callback-handled", callback: decoded } };
    }
  }
  // Clarification callbacks aren't wired yet (Phase C) — ack so the user sees feedback.
  await safeAnswerCallback(input.telegram, callback.id, "Got it.");
  return { action: { type: "callback-handled", callback: decoded } };
}

async function dispatchTextOrPhoto(input: DispatchInboundInput, message: TelegramMessage): Promise<DispatchInboundResult> {
  if (!(await isAuthorizedSender(message))) {
    return { action: { type: "dropped", reason: "unauthorized" } };
  }
  const classified = classifyInbound(message);
  const now = input.now ?? (() => new Date());
  switch (classified.kind) {
    case "command": {
      const out = await handleBotCommand({
        workspaceRoot: input.workspaceRoot,
        commandName: classified.commandName!,
        args: classified.text.split(/\s+/).slice(1),
      });
      await send(input.telegram, message.chat.id, out.message);
      return { action: { type: "command-handled", commandName: classified.commandName! } };
    }
    case "promotion": {
      const parsed = await parseReply(classified.text, input.brain);
      if (parsed.kind === "promotion-accepted") {
        const advance = await advancePromotionApproval({ workspaceRoot: input.workspaceRoot });
        if (advance.ok) {
          await send(input.telegram, message.chat.id, promotionAcceptedAck({ runId: advance.runId }));
        } else {
          await send(input.telegram, message.chat.id, gateReplyNoMatch({
            surface: "promotion",
            reason: advance.reason,
          }));
        }
        return { action: { type: "promotion-accepted" } };
      }
      if (parsed.kind === "echo-back-required-phrase") {
        await input.telegram.sendMessage({ chatId: message.chat.id, text: parsed.message });
      }
      return { action: { type: "gate-reply", reply: parsed } };
    }
    case "gate-reply": {
      const parsed = await parseReply(classified.text, input.brain);
      if (parsed.kind === "matched" && parsed.action.type === "approve-direction") {
        const advance = await advanceConceptApproval({
          workspaceRoot: input.workspaceRoot,
          laneIndex: parsed.action.laneIndex,
        });
        if (advance.ok) {
          await send(input.telegram, message.chat.id, conceptApprovedAck({
            laneIndex: parsed.action.laneIndex,
            runId: advance.runId,
          }));
        } else {
          await send(input.telegram, message.chat.id, gateReplyNoMatch({
            surface: "concept",
            laneIndex: parsed.action.laneIndex,
            reason: advance.reason,
          }));
        }
      } else {
        await send(input.telegram, message.chat.id, gateReplyEcho({ rawText: classified.text }));
      }
      return { action: { type: "gate-reply", reply: parsed } };
    }
    case "trigger": {
      const outcome = routeRequest({ request: classified.text });
      const display = displayFor(outcome.characterId);
      const runId = enqueueSingleRun({
        workspaceRoot: input.workspaceRoot,
        request: classified.text,
        sourceSurface: "telegram",
        chatId: message.chat.id,
        now,
      });
      await send(input.telegram, message.chat.id, triggerAck({
        displayName: display.displayName,
        title: display.title,
        spaceLabel: display.space ? spaceLabelFor(display.space) : undefined,
        runId,
      }));
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
      const display = displayFor(outcome.characterId);
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
          chatId: message.chat.id,
          attachmentPath,
        },
      });
      await send(input.telegram, message.chat.id, triggerWithPhotoAck({
        displayName: display.displayName,
        title: display.title,
        spaceLabel: display.space ? spaceLabelFor(display.space) : undefined,
        runId,
      }));
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
              chatId: message.chat.id,
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
          chatId: message.chat.id,
          now,
        }));
      }
      await send(input.telegram, message.chat.id, bundleAck({ runCount: runIds.length }));
      return { action: { type: "trigger-enqueued", runIds } };
    }
    case "callback":
      // Should never reach here — callbacks go through dispatchCallback.
      return { action: { type: "dropped", reason: "no-payload" } };
  }
  return { action: { type: "dropped", reason: "no-payload" } };
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

async function safeAnswerCallback(
  telegram: TelegramClient,
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean,
): Promise<void> {
  try {
    await telegram.answerCallbackQuery({
      callbackQueryId,
      ...(text ? { text } : {}),
      ...(showAlert ? { showAlert: true } : {}),
    });
  } catch { /* non-fatal */ }
}

async function safeClearKeyboard(telegram: TelegramClient, chatId: number, messageId: number): Promise<void> {
  try {
    await telegram.editMessageReplyMarkup({ chatId, messageId, replyMarkup: undefined as unknown as TelegramInlineKeyboard });
  } catch { /* editing fails when markup is already cleared — non-fatal */ }
}
