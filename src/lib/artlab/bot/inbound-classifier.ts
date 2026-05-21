import type { TelegramMessage } from "./telegram-client";

export const ARTLAB_INBOUND_KINDS = [
  "trigger", "trigger-with-photo", "gate-reply", "bundle", "command", "promotion",
] as const;
export type ArtLabInboundKind = (typeof ARTLAB_INBOUND_KINDS)[number];

export interface ArtLabInboundClassification {
  kind: ArtLabInboundKind;
  text: string;
  photoFileId?: string;
  commandName?: string;
}

const PROMOTION_PHRASE = /^\s*approved\s+for\s+app\s*$/i;
const GATE_REPLY = /^\s*(approve\s+direction\s+\d+|revise:.*|reject|archive|cancel(\s+\S+)?)\s*$/i;
const COMMAND = /^\/([a-z]+)(?:\s|$)/i;
const BUNDLE_PHRASES = [
  /\bwith\s+\S+\s+in\s+it\b/i,
  /\b\S+\s+and\s+\S+\s+together\b/i,
  /\bthe\s+\w+\s+floor\b/i,
];

export function classifyInbound(message: TelegramMessage): ArtLabInboundClassification {
  const text = (message.text ?? message.caption ?? "").trim();
  if (PROMOTION_PHRASE.test(text)) return { kind: "promotion", text };
  if (GATE_REPLY.test(text)) return { kind: "gate-reply", text };
  const commandMatch = text.match(COMMAND);
  if (commandMatch) return { kind: "command", text, commandName: commandMatch[1]!.toLowerCase() };
  if ((message.photo?.length ?? 0) > 0) {
    const photoFileId = message.photo!.at(-1)!.file_id;
    return { kind: "trigger-with-photo", text, photoFileId };
  }
  if (BUNDLE_PHRASES.some((p) => p.test(text))) return { kind: "bundle", text };
  return { kind: "trigger", text };
}
