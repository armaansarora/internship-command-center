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
import { advanceConceptApproval, advancePromotionApproval } from "./gate-advance";
import { displayFor } from "../intake/known-cast";

function shortId(runId: string): string { return runId.slice(0, 8); }

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
        const advance = await advancePromotionApproval({ workspaceRoot: input.workspaceRoot });
        if (advance.ok) {
          await input.telegram.sendMessage({
            chatId: input.message.chat.id,
            text: [
              `🚀 Promotion accepted`,
              ``,
              `Run: ${shortId(advance.runId)}`,
              `Status: writing to public/art now…`,
              ``,
              `I'll send a confirmation when the assets land.`,
            ].join("\n"),
          });
        } else {
          await input.telegram.sendMessage({
            chatId: input.message.chat.id,
            text: [
              `🤔 Heard "approved for app" — but no run is parked at the final-review gate.`,
              ``,
              `Reason: ${advance.reason}`,
              ``,
              `Trigger a new run with: make <character name>`,
            ].join("\n"),
          });
        }
        return { action: { type: "promotion-accepted" } };
      }
      if (parsed.kind === "echo-back-required-phrase") {
        await input.telegram.sendMessage({ chatId: input.message.chat.id, text: parsed.message });
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
          await input.telegram.sendMessage({
            chatId: input.message.chat.id,
            text: [
              `✅ Direction ${parsed.action.laneIndex} locked in`,
              ``,
              `Run: ${shortId(advance.runId)}`,
              `Walking: canary → production → strict-qa → final-review`,
              ``,
              `I'll send the final board the moment it's ready.`,
            ].join("\n"),
          });
        } else {
          await input.telegram.sendMessage({
            chatId: input.message.chat.id,
            text: [
              `🤔 Heard "approve direction ${parsed.action.laneIndex}" — but no run is parked at the concept-review gate.`,
              ``,
              `Reason: ${advance.reason}`,
              ``,
              `Trigger a new run with: make <character name>`,
            ].join("\n"),
          });
        }
      } else {
        await input.telegram.sendMessage({
          chatId: input.message.chat.id,
          text: `📝 Reply received: "${classified.text}"\n\n(Waiting on the engine to surface a gate — no immediate action taken.)`,
        });
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
        chatId: input.message.chat.id,
        now,
      });
      await input.telegram.sendMessage({
        chatId: input.message.chat.id,
        text: [
          `🎨 Queued`,
          ``,
          `Subject: ${display.displayName}${display.title ? ` — ${display.title}` : ""}`,
          `Run: ${shortId(runId)}`,
          ``,
          `Generating 5 concept directions… (~5-15s)`,
        ].join("\n"),
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
          chatId: input.message.chat.id,
          attachmentPath,
        },
      });
      await input.telegram.sendMessage({
        chatId: input.message.chat.id,
        text: [
          `📸 Queued (with reference photo)`,
          ``,
          `Subject: ${display.displayName}${display.title ? ` — ${display.title}` : ""}`,
          `Run: ${shortId(runId)}`,
          ``,
          `Generating 5 concept directions using your reference…`,
        ].join("\n"),
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
        text: [
          `📦 Bundle queued`,
          ``,
          `${runIds.length} linked run${runIds.length === 1 ? "" : "s"}.`,
          `I'll surface concept boards for each as they finish.`,
        ].join("\n"),
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
