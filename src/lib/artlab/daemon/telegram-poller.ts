// src/lib/artlab/daemon/telegram-poller.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TelegramClient, TelegramUpdate } from "@/lib/artlab/bot/telegram-client";

export interface TelegramPollerInput {
  workspaceRoot: string;
  client: TelegramClient;
  dispatch(opts: {
    message?: NonNullable<TelegramUpdate["message"]>;
    callbackQuery?: NonNullable<TelegramUpdate["callback_query"]>;
  }): Promise<unknown>;
}

export interface TelegramPoller { tick(): Promise<void>; }

function offsetPath(root: string): string { return join(root, "telegram-offset.json"); }

function readOffset(root: string): number {
  const path = offsetPath(root);
  if (!existsSync(path)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { lastUpdateId?: number };
    return typeof parsed.lastUpdateId === "number" ? parsed.lastUpdateId + 1 : 0;
  } catch { return 0; }
}

function writeOffset(root: string, lastUpdateId: number): void {
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  const path = offsetPath(root);
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify({ lastUpdateId }, null, 2)}\n`);
  renameSync(tmp, path);
}

function recordPoisonMessage(root: string, updateId: number, err: unknown): void {
  try {
    if (!existsSync(root)) mkdirSync(root, { recursive: true });
    const line = JSON.stringify({
      at: new Date().toISOString(),
      source: "telegram-poller",
      updateId,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    appendFileSync(join(root, "daemon-errors.jsonl"), `${line}\n`);
  } catch { /* never let logging crash the poller */ }
}

export function createTelegramPoller(input: TelegramPollerInput): TelegramPoller {
  return {
    async tick(): Promise<void> {
      const offset = readOffset(input.workspaceRoot);
      const updates = await input.client.getUpdates({ offset });
      if (updates.length === 0) return;
      for (const update of updates) {
        const message = update.message ?? update.edited_message;
        const callbackQuery = update.callback_query;
        if (message || callbackQuery) {
          try {
            await input.dispatch({ message, callbackQuery });
          } catch (err) {
            recordPoisonMessage(input.workspaceRoot, update.update_id, err);
          }
        }
        writeOffset(input.workspaceRoot, update.update_id);
      }
    },
  };
}
