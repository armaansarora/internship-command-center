// src/lib/artlab/bot/inline-keyboards.ts
//
// Callback-data encoder/decoder + factory functions for the bot's inline
// keyboards. Telegram caps callback_data at 64 bytes; we encode as
//
//   gate:<surface>:<shortRunId>:<action>
//
// where surface is "c" (concept) / "f" (final) / "x" (clarification),
// shortRunId is the first 8 chars of the runId (collision-safe within an
// active session), and action is a single token. Total bytes ≤ 24, well
// under the cap.
//
// Special "free-form" callbacks (clarification options) don't have a runId;
// they encode as `clar:<token>` and the bot dispatcher resolves them via
// the parked clarification state.

import type { TelegramInlineKeyboard, TelegramInlineKeyboardButton } from "./telegram-client";

const CALLBACK_BYTE_CAP = 64;

export type GateSurface = "concept" | "final";
export type GateAction =
  | { kind: "approve-direction"; laneIndex: number }
  | { kind: "revise" }
  | { kind: "reject" }
  | { kind: "approve-final" };

export type DecodedCallback =
  | { kind: "gate"; surface: GateSurface; shortRunId: string; action: GateAction }
  | { kind: "clarification"; optionId: string };

const SURFACE_CODE: Record<GateSurface, string> = { concept: "c", final: "f" };
const SURFACE_FROM_CODE: Record<string, GateSurface> = { c: "concept", f: "final" };

export function shortenRunId(runId: string): string {
  return runId.replace(/-/g, "").slice(0, 8);
}

export function encodeGateCallback(surface: GateSurface, runId: string, action: GateAction): string {
  const shortRunId = shortenRunId(runId);
  const actionToken = encodeAction(action);
  const payload = `gate:${SURFACE_CODE[surface]}:${shortRunId}:${actionToken}`;
  if (Buffer.byteLength(payload, "utf8") > CALLBACK_BYTE_CAP) {
    throw new Error(`callback_data exceeds ${CALLBACK_BYTE_CAP} bytes: ${payload}`);
  }
  return payload;
}

export function encodeClarificationCallback(optionId: string): string {
  const safe = optionId.replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
  const payload = `clar:${safe}`;
  if (Buffer.byteLength(payload, "utf8") > CALLBACK_BYTE_CAP) {
    throw new Error(`callback_data exceeds ${CALLBACK_BYTE_CAP} bytes: ${payload}`);
  }
  return payload;
}

export function decodeCallback(data: string): DecodedCallback | null {
  const parts = data.split(":");
  if (parts[0] === "gate" && parts.length === 4) {
    const surface = SURFACE_FROM_CODE[parts[1]!];
    const shortRunId = parts[2]!;
    const action = decodeAction(parts[3]!);
    if (!surface || !shortRunId || !action) return null;
    return { kind: "gate", surface, shortRunId, action };
  }
  if (parts[0] === "clar" && parts.length === 2) {
    return { kind: "clarification", optionId: parts[1]! };
  }
  return null;
}

function encodeAction(action: GateAction): string {
  switch (action.kind) {
    case "approve-direction": return `d${action.laneIndex}`;
    case "revise": return "r";
    case "reject": return "x";
    case "approve-final": return "a";
  }
}

function decodeAction(token: string): GateAction | null {
  if (token === "r") return { kind: "revise" };
  if (token === "x") return { kind: "reject" };
  if (token === "a") return { kind: "approve-final" };
  const lane = token.match(/^d([1-5])$/);
  if (lane) return { kind: "approve-direction", laneIndex: Number(lane[1]!) };
  return null;
}

function button(text: string, callbackData: string): TelegramInlineKeyboardButton {
  return { text, callback_data: callbackData };
}

export function buildConceptInlineKeyboard(runId: string): TelegramInlineKeyboard {
  const directionRow = [1, 2, 3, 4, 5].map((i) =>
    button(`✅ ${i}`, encodeGateCallback("concept", runId, { kind: "approve-direction", laneIndex: i })),
  );
  const actionRow = [
    button("🔁 Revise", encodeGateCallback("concept", runId, { kind: "revise" })),
    button("❌ Reject", encodeGateCallback("concept", runId, { kind: "reject" })),
  ];
  return { inline_keyboard: [directionRow, actionRow] };
}

export function buildFinalInlineKeyboard(runId: string): TelegramInlineKeyboard {
  return {
    inline_keyboard: [[
      button("✅ Approve for app", encodeGateCallback("final", runId, { kind: "approve-final" })),
      button("❌ Reject", encodeGateCallback("final", runId, { kind: "reject" })),
    ]],
  };
}

export interface ClarificationOption {
  id: string;     // short token (a-z0-9_-)
  label: string;  // display text (≤ 30 chars)
}

export function buildClarificationKeyboard(options: ClarificationOption[]): TelegramInlineKeyboard {
  const rows: TelegramInlineKeyboardButton[][] = options.map((opt) => [
    button(opt.label, encodeClarificationCallback(opt.id)),
  ]);
  return { inline_keyboard: rows };
}

export function buildUrlKeyboard(label: string, url: string): TelegramInlineKeyboard {
  return { inline_keyboard: [[{ text: label, url }]] };
}
