// src/lib/artlab/daemon/phase-notifier.ts
//
// After a run-worker child exits, the daemon reads the run's current phase
// and (when the run originated from Telegram) pushes the appropriate board
// or status message back to the user. This is the bridge between the
// silent state-machine walker and the human surface — without it, the bot
// acknowledges triggers but never speaks again.
//
// The notifier is intentionally fault-tolerant: any error (missing file,
// Telegram API failure, malformed state) logs and returns rather than
// crashing the daemon.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { TelegramClient } from "@/lib/artlab/bot/telegram-client";
import { readRunStateSnapshot } from "@/lib/artlab/state/snapshots";
import {
  buildConceptBoardAttachments,
  buildFinalBoardAttachments,
} from "@/lib/artlab/bot/board-attachments";
import { displayFor } from "@/lib/artlab/intake/known-cast";
import {
  blockerNotice,
  conceptBoardCaption,
  conceptCritiqueCaption,
  finalBoardCaption,
  productionCritiqueCaption,
  promotedConfirmation,
  promotionCelebrationBrainAuthored,
  briefProposalCaption,
  type TelegramOutboundMessage,
} from "@/lib/artlab/bot/message-templates";
import { DesignBriefSchema, type DesignBrief } from "@/lib/artlab/brainstorm/brief-schema";

export interface PhaseNotifierInput {
  workspaceRoot: string;
  runId: string;
  telegram: TelegramClient;
}

interface QueueEntryShape {
  spec?: { chatId?: number; sourceSurface?: string; characterId?: string };
}

function readQueueEntry(runDir: string): QueueEntryShape | null {
  const path = join(runDir, "queue-entry.json");
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")) as QueueEntryShape; } catch { return null; }
}

function chatIdForRun(runDir: string): number | undefined {
  const entry = readQueueEntry(runDir);
  return typeof entry?.spec?.chatId === "number" ? entry.spec.chatId : undefined;
}

function characterDisplayId(runDir: string, fallback: string | undefined): string {
  const entry = readQueueEntry(runDir);
  return entry?.spec?.characterId ?? fallback ?? "character";
}

function spaceLabelFor(space: string): string {
  if (!space) return "";
  return space
    .split("-")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

function readBrief(runDir: string): DesignBrief | null {
  const path = join(runDir, "brief.json");
  if (!existsSync(path)) return null;
  try { return DesignBriefSchema.parse(JSON.parse(readFileSync(path, "utf8"))); }
  catch { return null; }
}

function readCritique(runDir: string): {
  summary?: string;
  recommendedLane?: number;
  perLane?: Array<{ laneIndex: number; critique: string; stars?: number; fitToBible?: string }>;
} | null {
  const path = join(runDir, "concept-critique.json");
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")) as ReturnType<typeof readCritique>; }
  catch { return null; }
}

function readProductionCritique(runDir: string): {
  overallVerdict?: "tight" | "minor-drift" | "major-drift";
  summary?: string;
  flaggedSprites?: Array<{ slotId: string; issue: string; severity: "minor" | "major" }>;
  approvedSpriteCount?: number;
} | null {
  const path = join(runDir, "production-critique.json");
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")) as ReturnType<typeof readProductionCritique>; }
  catch { return null; }
}

function readPromotionCelebration(runDir: string): { text: string } | null {
  const path = join(runDir, "promotion-celebration.json");
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")) as { text: string }; }
  catch { return null; }
}

function readRecommendation(runDir: string): { laneIndex: number; reasoning: string } | undefined {
  const path = join(runDir, "recommendation.json");
  if (!existsSync(path)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { laneIndex?: number; reasoning?: string };
    if (typeof parsed.laneIndex === "number" && typeof parsed.reasoning === "string") {
      return { laneIndex: parsed.laneIndex, reasoning: parsed.reasoning };
    }
  } catch { /* fall through */ }
  return undefined;
}

export async function notifyPhase(input: PhaseNotifierInput): Promise<void> {
  const runDir = join(input.workspaceRoot, "runs", input.runId);
  const state = readRunStateSnapshot(runDir);
  if (!state) return;
  const chatId = chatIdForRun(runDir);
  if (!chatId) return; // CLI-originated runs don't get Telegram replies
  const characterId = characterDisplayId(runDir, state.characterId);
  const display = displayFor(characterId);

  if (state.blocker) {
    await safeSend(input.telegram, chatId, blockerNotice({
      displayName: display.displayName,
      runId: input.runId,
      phase: state.phase,
      blocker: state.blocker,
    }));
    return;
  }

  switch (state.phase) {
    case "brief-review": {
      const brief = readBrief(runDir);
      if (!brief) return;
      await safeSend(input.telegram, chatId, briefProposalCaption({ brief }));
      return;
    }
    case "concept-review": {
      try {
        const { media } = buildConceptBoardAttachments({ runDir, characterId });
        await input.telegram.sendMediaGroup({ chatId, media });
        const subtitle = display.title
          ? `${display.title}${display.space ? ` · ${spaceLabelFor(display.space)}` : ""}`
          : undefined;
        const critique = readCritique(runDir);
        const brief = readBrief(runDir);
        if (critique) {
          await safeSend(input.telegram, chatId, conceptCritiqueCaption({
            runId: input.runId,
            displayName: display.displayName,
            subtitle,
            critique,
            iteration: brief?.iteration,
          }));
        } else {
          const recommendation = readRecommendation(runDir);
          await safeSend(input.telegram, chatId, conceptBoardCaption({
            displayName: display.displayName,
            subtitle,
            runId: input.runId,
            recommendation,
          }));
        }
      } catch (err) {
        await safeSendText(input.telegram, chatId, fallbackConceptCaption(input.runId, characterId, err));
      }
      return;
    }
    case "final-review": {
      try {
        const finalBoardPath = join(runDir, "final-board.png");
        if (!existsSync(finalBoardPath)) throw new Error("final-board.png missing");
        const sprites = countSprites(runDir);
        const { media } = buildFinalBoardAttachments({ runDir, characterId, spriteCount: sprites });
        await input.telegram.sendMediaGroup({ chatId, media });
        const subtitle = display.title
          ? `${display.title}${display.space ? ` · ${spaceLabelFor(display.space)}` : ""}`
          : undefined;
        const productionCritique = readProductionCritique(runDir);
        if (productionCritique) {
          await safeSend(input.telegram, chatId, productionCritiqueCaption({
            runId: input.runId,
            displayName: display.displayName,
            subtitle,
            spriteCount: sprites,
            space: display.space || undefined,
            critique: productionCritique,
          }));
        } else {
          await safeSend(input.telegram, chatId, finalBoardCaption({
            displayName: display.displayName,
            subtitle,
            spriteCount: sprites,
            runId: input.runId,
            space: display.space || undefined,
          }));
        }
      } catch (err) {
        await safeSendText(input.telegram, chatId, fallbackFinalCaption(input.runId, characterId, err));
      }
      return;
    }
    case "closed": {
      const receiptPath = join(runDir, "promotion-receipt.json");
      const receipt = existsSync(receiptPath) ? safeParse<{ promotedAssets?: Array<{ targetRelativePath: string }> }>(receiptPath) : null;
      const promoted = receipt?.promotedAssets?.length ?? 0;
      const spendPath = join(runDir, "run-state.json");
      const spend = readSpend(spendPath);
      const celebration = readPromotionCelebration(runDir);
      if (celebration && display.space) {
        await safeSend(input.telegram, chatId, promotionCelebrationBrainAuthored({
          text: celebration.text,
          runId: input.runId,
          liveUrl: `https://www.interntower.com/${display.space}?v=${input.runId.replace(/-/g, "").slice(0, 8)}`,
          spendCents: spend?.actualCents,
          capCents: spend?.capCents,
        }));
      } else {
        await safeSend(input.telegram, chatId, promotedConfirmation({
          displayName: display.displayName,
          runId: input.runId,
          assetCount: promoted,
          space: display.space || undefined,
          spend,
        }));
      }
      return;
    }
    default:
      // routed / generating-concepts / canary / production / strict-qa /
      // promoting / verifying — worker is still mid-pipeline, no user-facing
      // message is required.
      return;
  }
}

function shortId(runId: string): string { return runId.slice(0, 8); }

function safeParse<T>(path: string): T | null {
  try { return JSON.parse(readFileSync(path, "utf8")) as T; } catch { return null; }
}

function readSpend(runStatePath: string): { actualCents: number; capCents: number } | undefined {
  if (!existsSync(runStatePath)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(runStatePath, "utf8")) as {
      spend?: { actualCents?: number; perRunCapCents?: number; monthlyCeilingCents?: number };
    };
    const actual = parsed.spend?.actualCents;
    const cap = parsed.spend?.perRunCapCents ?? parsed.spend?.monthlyCeilingCents;
    if (typeof actual === "number" && typeof cap === "number") {
      return { actualCents: actual, capCents: cap };
    }
  } catch { /* fall through */ }
  return undefined;
}

function countSprites(runDir: string): number {
  const cutoutDir = join(runDir, "cutouts");
  if (!existsSync(cutoutDir)) return 0;
  try {
    return readdirSync(cutoutDir).filter((f) => f.endsWith(".png")).length;
  } catch { return 0; }
}

async function safeSend(telegram: TelegramClient, chatId: number, msg: TelegramOutboundMessage): Promise<void> {
  try {
    await telegram.sendMessage({
      chatId,
      text: msg.text,
      ...(msg.parseMode ? { parseMode: msg.parseMode } : {}),
      ...(msg.replyMarkup ? { replyMarkup: msg.replyMarkup } : {}),
      ...(msg.disableWebPagePreview ? { disableWebPagePreview: true } : {}),
    });
  } catch { /* swallow */ }
}

async function safeSendText(telegram: TelegramClient, chatId: number, text: string): Promise<void> {
  try { await telegram.sendMessage({ chatId, text }); } catch { /* swallow */ }
}

function fallbackConceptCaption(runId: string, characterId: string, err: unknown): string {
  const display = displayFor(characterId);
  return [
    `🎨 ${display.displayName} — Concept Board (5 directions ready)`,
    `Run: ${shortId(runId)}`,
    ``,
    `⚠️ Couldn't attach the lane images: ${err instanceof Error ? err.message : String(err)}`,
    ``,
    `Reply:`,
    `  ✅  approve direction 1-5`,
    `  🔁  revise: <change>`,
    `  ❌  reject`,
  ].join("\n");
}

function fallbackFinalCaption(runId: string, characterId: string, err: unknown): string {
  const display = displayFor(characterId);
  return [
    `📐 ${display.displayName} — Final Board ready`,
    `Run: ${shortId(runId)}`,
    ``,
    `⚠️ Couldn't attach the composite: ${err instanceof Error ? err.message : String(err)}`,
    ``,
    `Reply 'approved for app' to promote.`,
  ].join("\n");
}
