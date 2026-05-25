import { readFileSync } from "node:fs";
import { basename } from "node:path";

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;     // ≤ 64 bytes per Telegram spec
  url?: string;               // alternative to callback_data
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export type TelegramParseMode = "HTML" | "MarkdownV2";

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number; username?: string };
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
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
  parseMode?: TelegramParseMode;
}

export interface TelegramClientOptions {
  token: string;
  fetch?: typeof fetch;
}

export interface TelegramClient {
  getUpdates(opts: { offset: number; timeoutSec?: number }): Promise<TelegramUpdate[]>;
  sendMessage(opts: {
    chatId: number;
    text: string;
    replyTo?: number;
    parseMode?: TelegramParseMode;
    replyMarkup?: TelegramInlineKeyboard;
    disableWebPagePreview?: boolean;
  }): Promise<TelegramSendResult>;
  sendMediaGroup(opts: { chatId: number; media: TelegramMediaPhoto[] }): Promise<TelegramSendResult[]>;
  downloadFile(opts: { fileId: string }): Promise<{ contentType: string; bytes: Buffer }>;
  answerCallbackQuery(opts: { callbackQueryId: string; text?: string; showAlert?: boolean }): Promise<void>;
  editMessageReplyMarkup(opts: { chatId: number; messageId: number; replyMarkup?: TelegramInlineKeyboard }): Promise<void>;
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
      url.searchParams.set("allowed_updates", JSON.stringify(["message", "edited_message", "callback_query"]));
      const response = await f(url.toString());
      const json = (await response.json()) as { ok: boolean; result?: TelegramUpdate[]; description?: string };
      if (!response.ok || !json.ok) {
        throw new Error(`telegram getUpdates failed: HTTP ${response.status} ${json.description ?? ""}`);
      }
      return json.result ?? [];
    },

    async sendMessage({ chatId, text, replyTo, parseMode, replyMarkup, disableWebPagePreview }) {
      const body: Record<string, unknown> = { chat_id: chatId, text };
      if (replyTo) body.reply_to_message_id = replyTo;
      if (parseMode) body.parse_mode = parseMode;
      if (replyMarkup) body.reply_markup = replyMarkup;
      if (disableWebPagePreview) body.disable_web_page_preview = true;
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
        const payload: Record<string, unknown> = { type: m.type, media: `attach://${fileKey}` };
        if (m.caption) payload.caption = m.caption;
        if (m.parseMode) payload.parse_mode = m.parseMode;
        return payload;
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

    async answerCallbackQuery({ callbackQueryId, text, showAlert }) {
      const body: Record<string, unknown> = { callback_query_id: callbackQueryId };
      if (text) body.text = text;
      if (showAlert) body.show_alert = true;
      await callJson<true>("answerCallbackQuery", body);
    },

    async editMessageReplyMarkup({ chatId, messageId, replyMarkup }) {
      const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId };
      if (replyMarkup) body.reply_markup = replyMarkup;
      try {
        await callJson<unknown>("editMessageReplyMarkup", body);
      } catch {
        // editing fails when the markup is identical or the message is too old — non-fatal
      }
    },
  };
}
