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

export async function notifyPhase(input: PhaseNotifierInput): Promise<void> {
  const runDir = join(input.workspaceRoot, "runs", input.runId);
  const state = readRunStateSnapshot(runDir);
  if (!state) return;
  const chatId = chatIdForRun(runDir);
  if (!chatId) return; // CLI-originated runs don't get Telegram replies
  const characterId = characterDisplayId(runDir, state.characterId);

  if (state.blocker) {
    const display = displayFor(characterId);
    await safeSendText(input.telegram, chatId, [
      `⚠️ Run blocked`,
      ``,
      `Subject: ${display.displayName}`,
      `Run: ${shortId(input.runId)}`,
      `Phase: ${state.phase}`,
      `Blocker: ${state.blocker}`,
      ``,
      `Reply 'cancel ${input.runId}' to abandon, or wait for the engine to retry.`,
    ].join("\n"));
    return;
  }

  switch (state.phase) {
    case "concept-review": {
      try {
        const { media, caption } = buildConceptBoardAttachments({ runDir, characterId });
        await input.telegram.sendMediaGroup({ chatId, media });
        await safeSendText(input.telegram, chatId, caption);
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
        const { media, caption } = buildFinalBoardAttachments({ runDir, characterId, spriteCount: sprites });
        await input.telegram.sendMediaGroup({ chatId, media });
        await safeSendText(input.telegram, chatId, caption);
      } catch (err) {
        await safeSendText(input.telegram, chatId, fallbackFinalCaption(input.runId, characterId, err));
      }
      return;
    }
    case "closed": {
      const display = displayFor(characterId);
      const receiptPath = join(runDir, "promotion-receipt.json");
      const receipt = existsSync(receiptPath) ? safeParse<{ promotedAssets?: Array<{ targetRelativePath: string }> }>(receiptPath) : null;
      const promoted = receipt?.promotedAssets?.length ?? 0;
      const sample = receipt?.promotedAssets?.[0];
      const lines = [
        `🚀 ${display.displayName} promoted to the app`,
        ``,
        `Run: ${shortId(input.runId)}`,
        `Assets: ${promoted} written to public/art`,
      ];
      if (sample) lines.push(`Sample path: /art/${sample.targetRelativePath}`);
      lines.push("");
      lines.push("Ship it.");
      await safeSendText(input.telegram, chatId, lines.join("\n"));
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

function countSprites(runDir: string): number {
  const cutoutDir = join(runDir, "cutouts");
  if (!existsSync(cutoutDir)) return 0;
  try {
    return readdirSync(cutoutDir).filter((f) => f.endsWith(".png")).length;
  } catch { return 0; }
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

