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
import { validateReferencePhoto } from "../intake/reference-attachment";
import { enqueueRun } from "../queue/queue";
import { advanceConceptApproval, advancePromotionApproval } from "./gate-advance";
import {
  approveBrief,
  cancelBrief,
  recordBriefAdjustmentAndReAuthor,
  recordConceptFeedbackAndRefine,
  findParkedBriefRunForChat,
  findMostRecentParkedRunForChat,
  autoCancelStaleParkedRuns,
} from "./brief-advance";
import { displayFor, findCastMember } from "../intake/known-cast";
import {
  triggerAck,
  triggerWithPhotoAck,
  bundleAck,
  conceptApprovedAck,
  promotionAcceptedAck,
  gateReplyEcho,
  gateReplyNoMatch,
  callbackAck,
  briefAdjustmentPrompt,
  briefCancelledAck,
  briefRegeneratingAck,
  feedbackPositivePrompt,
  feedbackNegativePrompt,
  triggerAckBrainAuthored,
  type TelegramOutboundMessage,
} from "./message-templates";
import { appendConceptFeedback } from "../brainstorm/feedback-ledger";
import type { FeedbackOption } from "./inline-keyboards";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readRunStateSnapshot, writeRunStateSnapshot } from "../state/snapshots";
import { appendArtLabEvent } from "../state/events";
import { readFileSync } from "node:fs";
import type { ArtLabQueueEntry } from "../queue/queue";
import type { DecodedCallback } from "./inline-keyboards";
import {
  DEFAULT_ADJUSTMENT_SUBOPTIONS,
  type BriefAdjustmentDimension,
} from "../brainstorm/brief-schema";

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

function inferContentType(path: string): string {
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.(jpe?g)$/i.test(path)) return "image/jpeg";
  if (/\.webp$/i.test(path)) return "image/webp";
  return "application/octet-stream";
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
    if (decoded.action.kind === "refine-concept") {
      if (chatId) {
        await safeAnswerCallback(input.telegram, callback.id, "Let me hear what worked.");
        if (callback.message) await safeClearKeyboard(input.telegram, callback.message.chat.id, callback.message.message_id);
        await send(input.telegram, chatId, feedbackPositivePrompt({
          runId: decoded.shortRunId,
          options: FEEDBACK_POSITIVE_OPTIONS,
          isLast: false,
        }));
      }
      return { action: { type: "callback-handled", callback: decoded } };
    }
  }
  if (decoded.kind === "brief") {
    if (decoded.action.kind === "approve") {
      const advance = await approveBrief({ workspaceRoot: input.workspaceRoot });
      if (advance.ok && chatId) {
        await safeAnswerCallback(input.telegram, callback.id, "✅ Generating 5 concept lanes…");
        if (callback.message) await safeClearKeyboard(input.telegram, callback.message.chat.id, callback.message.message_id);
      } else if (chatId) {
        await safeAnswerCallback(input.telegram, callback.id, "No brief waiting for approval.", true);
      }
      return { action: { type: "callback-handled", callback: decoded } };
    }
    if (decoded.action.kind === "cancel") {
      const advance = await cancelBrief({ workspaceRoot: input.workspaceRoot });
      if (advance.ok && chatId) {
        await safeAnswerCallback(input.telegram, callback.id, "❌ Cancelled.");
        if (callback.message) await safeClearKeyboard(input.telegram, callback.message.chat.id, callback.message.message_id);
        await send(input.telegram, chatId, briefCancelledAck({ runId: advance.runId }));
      }
      return { action: { type: "callback-handled", callback: decoded } };
    }
    if (decoded.action.kind === "adjust") {
      const dimension = decoded.action.dimension as BriefAdjustmentDimension;
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_ADJUSTMENT_SUBOPTIONS, dimension)) {
        await safeAnswerCallback(input.telegram, callback.id, "Unknown adjustment.");
        return { action: { type: "callback-handled", callback: decoded } };
      }
      if (dimension === "freetext") {
        await safeAnswerCallback(input.telegram, callback.id, "Send your feedback as a message — I'll incorporate it.");
        return { action: { type: "callback-handled", callback: decoded } };
      }
      const subOptions = DEFAULT_ADJUSTMENT_SUBOPTIONS[dimension];
      const runId = findParkedBriefRunForChat(input.workspaceRoot, callback.from.id) ?? "";
      if (!runId || !chatId) {
        await safeAnswerCallback(input.telegram, callback.id, "No parked brief found.", true);
        return { action: { type: "callback-handled", callback: decoded } };
      }
      const label = ADJUSTMENT_DIMENSION_LABELS[dimension] ?? `Adjust ${dimension}`;
      await safeAnswerCallback(input.telegram, callback.id, "Pick a direction.");
      await send(input.telegram, chatId, briefAdjustmentPrompt({ runId, dimensionLabel: label, options: subOptions }));
      return { action: { type: "callback-handled", callback: decoded } };
    }
  }
  if (decoded.kind === "feedback") {
    const runId = findFullRunIdByShortId(input.workspaceRoot, decoded.shortRunId);
    if (!runId || !chatId) {
      await safeAnswerCallback(input.telegram, callback.id, "Run not found.");
      return { action: { type: "callback-handled", callback: decoded } };
    }
    const runDir = join(input.workspaceRoot, "runs", runId);
    if (decoded.action.kind === "toggle") {
      appendConceptFeedback(runDir, {
        at: new Date().toISOString(),
        polarity: decoded.action.polarity === "pos" ? "positive" : "negative",
        token: decoded.action.token,
      });
      await safeAnswerCallback(input.telegram, callback.id, `✓ ${decoded.action.token}`);
      return { action: { type: "callback-handled", callback: decoded } };
    }
    if (decoded.action.kind === "next") {
      await safeAnswerCallback(input.telegram, callback.id, "Now what didn't work?");
      await send(input.telegram, chatId, feedbackNegativePrompt({
        runId: decoded.shortRunId,
        options: FEEDBACK_NEGATIVE_OPTIONS,
      }));
      return { action: { type: "callback-handled", callback: decoded } };
    }
    if (decoded.action.kind === "done") {
      // Advance run from concept-review → refining-concepts and re-enqueue.
      const state = readRunStateSnapshot(runDir);
      if (state && state.phase === "concept-review" && !state.blocker) {
        const now = new Date().toISOString();
        writeRunStateSnapshot(runDir, { ...state, phase: "refining-concepts", updatedAt: now });
        appendArtLabEvent(runDir, {
          runId,
          at: now,
          kind: "phase-transition",
          payload: { from: "concept-review", to: "refining-concepts", source: "bot" },
        });
        // Re-enqueue
        const queueEntryPath = join(runDir, "queue-entry.json");
        if (existsSync(queueEntryPath)) {
          try {
            const entry = JSON.parse(readFileSync(queueEntryPath, "utf8")) as ArtLabQueueEntry;
            const { enqueueRun: enq } = await import("../queue/queue");
            enq(input.workspaceRoot, { ...entry, enqueuedAt: now });
          } catch { /* ignore */ }
        }
        await safeAnswerCallback(input.telegram, callback.id, "🔁 Regenerating with your feedback…");
      } else {
        await safeAnswerCallback(input.telegram, callback.id, "Run isn't at concept-review.", true);
      }
      return { action: { type: "callback-handled", callback: decoded } };
    }
    if (decoded.action.kind === "cancel") {
      await safeAnswerCallback(input.telegram, callback.id, "Cancelled feedback collection.");
      return { action: { type: "callback-handled", callback: decoded } };
    }
  }
  if (decoded.kind === "briefadj") {
    if (decoded.action.kind === "back") {
      await safeAnswerCallback(input.telegram, callback.id, "Back to the main brief — tap an adjustment when ready.");
      return { action: { type: "callback-handled", callback: decoded } };
    }
    const subToken = decoded.action.subToken;
    // Map sub-token back to its parent dimension (the prefix before the first dash).
    const dimensionPrefix = subToken.split("-")[0] ?? "";
    const dimension = (["palette", "age", "energy", "props", "references"].includes(dimensionPrefix)
      ? dimensionPrefix
      : "freetext") as BriefAdjustmentDimension;
    const advance = await recordBriefAdjustmentAndReAuthor({
      workspaceRoot: input.workspaceRoot,
      entry: {
        at: new Date().toISOString(),
        dimension,
        chosenOption: subToken,
      },
    });
    if (advance.ok && chatId) {
      await safeAnswerCallback(input.telegram, callback.id, "🔄 Updating brief…");
      if (callback.message) await safeClearKeyboard(input.telegram, callback.message.chat.id, callback.message.message_id);
      await send(input.telegram, chatId, briefRegeneratingAck({ runId: advance.runId }));
    } else if (chatId) {
      await safeAnswerCallback(input.telegram, callback.id, "No parked brief.", true);
    }
    return { action: { type: "callback-handled", callback: decoded } };
  }
  // Clarification + feedback callbacks aren't wired yet (Tranche C) — ack so the user sees feedback.
  await safeAnswerCallback(input.telegram, callback.id, "Got it.");
  return { action: { type: "callback-handled", callback: decoded } };
}

const ADJUSTMENT_DIMENSION_LABELS: Record<string, string> = {
  palette: "How should the palette shift?",
  age: "How should the age range shift?",
  energy: "What energy should we lean into?",
  props: "How should the signature prop appear?",
  references: "Which references should we echo?",
};

const FEEDBACK_POSITIVE_OPTIONS: FeedbackOption[] = [
  { token: "stance", label: "Stance / posture" },
  { token: "palette", label: "Palette" },
  { token: "prop", label: "Prop arrangement" },
  { token: "face", label: "Face proportions" },
  { token: "backdrop", label: "Backdrop tone" },
];

const FEEDBACK_NEGATIVE_OPTIONS: FeedbackOption[] = [
  { token: "faces-similar", label: "Faces too similar" },
  { token: "palette-drift", label: "Palette drifted" },
  { token: "too-neutral", label: "Too neutral" },
  { token: "off-bible", label: "Off-bible lane(s)" },
  { token: "style-flat", label: "Style too flat" },
];

function findFullRunIdByShortId(workspaceRoot: string, shortId: string): string | null {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return null;
  const target = shortId.replace(/-/g, "").slice(0, 8);
  for (const id of readdirSync(runsDir)) {
    if (id.startsWith(".")) continue;
    if (id.replace(/-/g, "").slice(0, 8) === target) return id;
  }
  return null;
}

async function tryBrainTriggerAck(
  brain: ArtLabLlmBrain,
  request: string,
  display: ReturnType<typeof displayFor>,
): Promise<string | null> {
  try {
    const result = await brain.decide({
      kind: "compose-trigger-ack",
      input: {
        request,
        characterContext: {
          characterId: display.characterId,
          displayName: display.displayName,
          title: display.title,
          space: display.space,
        },
        etaSeconds: 45,
      },
    });
    const text = (result.outputJson as { text?: unknown }).text;
    if (typeof text === "string" && text.length > 0 && text.length < 400) return text;
  } catch {
    // non-fatal
  }
  return null;
}

async function dispatchTextOrPhoto(input: DispatchInboundInput, message: TelegramMessage): Promise<DispatchInboundResult> {
  if (!(await isAuthorizedSender(message))) {
    return { action: { type: "dropped", reason: "unauthorized" } };
  }
  const classified = classifyInbound(message);
  const now = input.now ?? (() => new Date());

  // Stateful free-text routing: when a run is parked at brief-review or
  // concept-review for this chat AND the user sends plain text (not a
  // command, promotion phrase, gate reply, or "make X" trigger), route the
  // text as feedback on the MOST RECENTLY UPDATED parked run (the one the
  // user just interacted with — not whichever phase comes alphabetically
  // first).
  //
  // Triggers starting with "make " always take precedence so the user can
  // start a new run regardless of parked state.
  if (
    (classified.kind === "trigger" || classified.kind === "bundle") &&
    !classified.commandName &&
    classified.text.length > 0 &&
    !/^make\s/i.test(classified.text)
  ) {
    // First, sweep any stale parked runs > 30 min old for this chat. This
    // prevents zombie runs from older sessions from hijacking feedback.
    autoCancelStaleParkedRuns(input.workspaceRoot, message.chat.id);

    const target = findMostRecentParkedRunForChat(input.workspaceRoot, message.chat.id);
    if (target) {
      if (target.phase === "brief-review") {
        const advance = await recordBriefAdjustmentAndReAuthor({
          workspaceRoot: input.workspaceRoot,
          runId: target.runId,
          entry: { at: new Date().toISOString(), dimension: "freetext", freeText: classified.text },
        });
        if (advance.ok) {
          await send(input.telegram, message.chat.id, briefRegeneratingAck({ runId: advance.runId }));
          return { action: { type: "callback-handled", callback: { kind: "brief", shortRunId: target.runId.slice(0, 8), action: { kind: "adjust", dimension: "freetext" } } } };
        }
      } else if (target.phase === "concept-review") {
        const advance = await recordConceptFeedbackAndRefine({
          workspaceRoot: input.workspaceRoot,
          runId: target.runId,
          freeText: classified.text,
        });
        if (advance.ok) {
          await send(input.telegram, message.chat.id, briefRegeneratingAck({ runId: advance.runId }));
          return { action: { type: "callback-handled", callback: { kind: "brief", shortRunId: target.runId.slice(0, 8), action: { kind: "adjust", dimension: "freetext" } } } };
        }
      }
    }
  }

  switch (classified.kind) {
    case "command": {
      const out = await handleBotCommand({
        workspaceRoot: input.workspaceRoot,
        commandName: classified.commandName!,
        args: classified.text.split(/\s+/).slice(1),
        chatId: message.chat.id,
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
      // Try brain-authored trigger ack first; fall back to deterministic template.
      const brainAck = await tryBrainTriggerAck(input.brain, classified.text, display);
      if (brainAck) {
        await send(input.telegram, message.chat.id, triggerAckBrainAuthored({ text: brainAck, runId }));
      } else {
        await send(input.telegram, message.chat.id, triggerAck({
          displayName: display.displayName,
          title: display.title,
          spaceLabel: display.space ? spaceLabelFor(display.space) : undefined,
          runId,
        }));
      }
      return { action: { type: "trigger-enqueued", runIds: [runId] } };
    }
    case "trigger-with-photo": {
      const runId = randomUUID();
      let attachmentPath: string | undefined;
      let photoMeta: { width: number; height: number; sizeKB: number; format?: string } | undefined;
      let photoRejection: string | undefined;
      try {
        const savedPath = await saveReferenceAttachment({
          workspaceRoot: input.workspaceRoot,
          runId,
          fileId: classified.photoFileId!,
          downloader: input.telegram,
        });
        // Validate AFTER save: read the file and check size + format + dims.
        // On reject, drop the path so the run proceeds text-only.
        const { readFileSync } = await import("node:fs");
        const bytes = readFileSync(savedPath);
        const contentType = inferContentType(savedPath);
        const validation = await validateReferencePhoto({ bytes, contentType });
        if (validation.ok) {
          attachmentPath = savedPath;
          photoMeta = {
            width: validation.width!,
            height: validation.height!,
            sizeKB: validation.sizeKB!,
            format: validation.format,
          };
        } else {
          photoRejection = validation.reason;
        }
      } catch {
        // attachment fetch / validation failure is non-fatal — proceed text-only
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
        photoMeta,
        photoRejection,
      }));
      return { action: { type: "trigger-enqueued", runIds: [runId] } };
    }
    case "bundle": {
      const bundle = parseBundle(classified.text);
      const runIds: string[] = [];
      const subjects: string[] = [];
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
          // Build a human-friendly subject for the ack. characterHint may be
          // a firstName ("Sol") rather than a characterId — resolve via
          // findCastMember which accepts either form, then fall back to the
          // raw request.
          if (child.characterHint) {
            const member = findCastMember(child.characterHint);
            subjects.push(member?.displayName ?? child.characterHint);
          } else {
            subjects.push(child.request);
          }
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
      await send(input.telegram, message.chat.id, bundleAck({
        runCount: runIds.length,
        subjects: subjects.length > 0 ? subjects : undefined,
      }));
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
