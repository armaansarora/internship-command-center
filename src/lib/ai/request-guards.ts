import type { UIMessage } from "ai";

const MAX_UI_MESSAGES = 40;
const MAX_UI_MESSAGE_TEXT_CHARS = 20_000;
const MAX_UI_MESSAGE_BODY_CHARS = 80_000;

type GuardResult =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function textCharsFromPart(part: unknown): number {
  if (!isRecord(part)) return 0;
  return part.type === "text" && typeof part.text === "string"
    ? part.text.length
    : 0;
}

function textCharsFromMessage(message: unknown): number {
  if (!isRecord(message)) return 0;
  if (typeof message.content === "string") return message.content.length;
  if (!Array.isArray(message.parts)) return 0;
  return message.parts.reduce((sum, part) => sum + textCharsFromPart(part), 0);
}

/**
 * Boundary guard for AI SDK UIMessage payloads.
 *
 * The AI SDK performs the deeper model-message conversion. This guard keeps
 * route handlers from accepting unbounded arrays or oversized text payloads
 * before quota/rate-limit accounting and prompt construction.
 */
export function parseUiMessageBody(raw: unknown): GuardResult {
  if (!isRecord(raw) || !Array.isArray(raw.messages)) {
    return { ok: false, error: "invalid body" };
  }

  const serialized = JSON.stringify(raw);
  if (serialized.length > MAX_UI_MESSAGE_BODY_CHARS) {
    return { ok: false, error: "body too large" };
  }

  if (raw.messages.length > MAX_UI_MESSAGES) {
    return { ok: false, error: "too many messages" };
  }

  const textChars = raw.messages.reduce(
    (sum, message) => sum + textCharsFromMessage(message),
    0,
  );
  if (textChars > MAX_UI_MESSAGE_TEXT_CHARS) {
    return { ok: false, error: "messages too large" };
  }

  return { ok: true, messages: raw.messages as UIMessage[] };
}
