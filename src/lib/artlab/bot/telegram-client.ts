import { readFileSync } from "node:fs";
import { basename } from "node:path";

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number; username?: string };
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }[];
  date: number;
}

export interface TelegramSendResult { message_id: number; }

export interface TelegramMediaPhoto {
  type: "photo";
  path: string;
  caption?: string;
}

export interface TelegramClientOptions {
  token: string;
  fetch?: typeof fetch;
}

export interface TelegramClient {
  getUpdates(opts: { offset: number; timeoutSec?: number }): Promise<TelegramUpdate[]>;
  sendMessage(opts: { chatId: number; text: string; replyTo?: number }): Promise<TelegramSendResult>;
  sendMediaGroup(opts: { chatId: number; media: TelegramMediaPhoto[] }): Promise<TelegramSendResult[]>;
  downloadFile(opts: { fileId: string }): Promise<{ contentType: string; bytes: Buffer }>;
}

const TELEGRAM_API_BASE = "https://api.telegram.org";

export function createTelegramClient(options: TelegramClientOptions): TelegramClient {
  const f = options.fetch ?? fetch;
  const apiUrl = (m: string): string => `${TELEGRAM_API_BASE}/bot${options.token}/${m}`;
  const fileUrl = (p: string): string => `${TELEGRAM_API_BASE}/file/bot${options.token}/${p}`;

  async function callJson<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await f(apiUrl(method), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { ok: boolean; result?: T; description?: string };
    if (!response.ok || !json.ok) {
      throw new Error(`telegram ${method} failed: HTTP ${response.status} ${json.description ?? ""}`);
    }
    return json.result as T;
  }

  return {
    async getUpdates({ offset, timeoutSec = 60 }) {
      const url = new URL(apiUrl("getUpdates"));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("timeout", String(timeoutSec));
      url.searchParams.set("allowed_updates", JSON.stringify(["message", "edited_message"]));
      const response = await f(url.toString());
      const json = (await response.json()) as { ok: boolean; result?: TelegramUpdate[]; description?: string };
      if (!response.ok || !json.ok) {
        throw new Error(`telegram getUpdates failed: HTTP ${response.status} ${json.description ?? ""}`);
      }
      return json.result ?? [];
    },

    async sendMessage({ chatId, text, replyTo }) {
      const body: Record<string, unknown> = { chat_id: chatId, text };
      if (replyTo) body.reply_to_message_id = replyTo;
      return await callJson<TelegramSendResult>("sendMessage", body);
    },

    async sendMediaGroup({ chatId, media }) {
      const form = new FormData();
      form.set("chat_id", String(chatId));
      const mediaPayload = media.map((m, idx) => {
        const fileKey = `media${idx}`;
        const bytes = readFileSync(m.path);
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
        form.set(fileKey, blob, basename(m.path));
        return { type: m.type, media: `attach://${fileKey}`, caption: m.caption };
      });
      form.set("media", JSON.stringify(mediaPayload));
      const response = await f(apiUrl("sendMediaGroup"), { method: "POST", body: form });
      const json = (await response.json()) as { ok: boolean; result?: TelegramSendResult[]; description?: string };
      if (!response.ok || !json.ok) {
        throw new Error(`telegram sendMediaGroup failed: HTTP ${response.status} ${json.description ?? ""}`);
      }
      return json.result ?? [];
    },

    async downloadFile({ fileId }) {
      const meta = await callJson<{ file_path: string }>("getFile", { file_id: fileId });
      const url = fileUrl(meta.file_path);
      const response = await f(url);
      if (!response.ok) throw new Error(`telegram downloadFile HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return {
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
        bytes: Buffer.from(arrayBuffer),
      };
    },
  };
}
