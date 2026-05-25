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
  | { kind: "approve-final" }
  | { kind: "refine-concept" };

export type BriefAction =
  | { kind: "approve" }
  | { kind: "adjust"; dimension: string }   // palette | age | energy | props | references | freetext
  | { kind: "cancel" };

export type BriefAdjustAction =
  | { kind: "pick"; subToken: string }      // e.g. palette-cool
  | { kind: "back" };

export type FeedbackAction =
  | { kind: "toggle"; polarity: "pos" | "neg"; token: string }
  | { kind: "next" }                         // move from positives to negatives
  | { kind: "done" }                         // commit and regenerate
  | { kind: "cancel" };

export type DecodedCallback =
  | { kind: "gate"; surface: GateSurface; shortRunId: string; action: GateAction }
  | { kind: "brief"; shortRunId: string; action: BriefAction }
  | { kind: "briefadj"; shortRunId: string; action: BriefAdjustAction }
  | { kind: "feedback"; shortRunId: string; action: FeedbackAction }
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

export function encodeBriefCallback(runId: string, action: BriefAction): string {
  const shortRunId = shortenRunId(runId);
  const token = encodeBriefAction(action);
  const payload = `brief:${shortRunId}:${token}`;
  assertWithinCap(payload);
  return payload;
}

export function encodeBriefAdjustCallback(runId: string, action: BriefAdjustAction): string {
  const shortRunId = shortenRunId(runId);
  const token = action.kind === "back" ? "b" : action.subToken.replace(/[^a-z0-9-]/gi, "").slice(0, 24);
  const payload = `briefadj:${shortRunId}:${token}`;
  assertWithinCap(payload);
  return payload;
}

export function encodeFeedbackCallback(runId: string, action: FeedbackAction): string {
  const shortRunId = shortenRunId(runId);
  let token: string;
  if (action.kind === "next") token = "next";
  else if (action.kind === "done") token = "done";
  else if (action.kind === "cancel") token = "x";
  else token = `${action.polarity}-${action.token.replace(/[^a-z0-9-]/gi, "").slice(0, 20)}`;
  const payload = `fb:${shortRunId}:${token}`;
  assertWithinCap(payload);
  return payload;
}

function assertWithinCap(payload: string): void {
  if (Buffer.byteLength(payload, "utf8") > CALLBACK_BYTE_CAP) {
    throw new Error(`callback_data exceeds ${CALLBACK_BYTE_CAP} bytes: ${payload}`);
  }
}

function encodeBriefAction(action: BriefAction): string {
  if (action.kind === "approve") return "a";
  if (action.kind === "cancel") return "x";
  return `adj-${action.dimension.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`;
}

function decodeBriefAction(token: string): BriefAction | null {
  if (token === "a") return { kind: "approve" };
  if (token === "x") return { kind: "cancel" };
  const m = token.match(/^adj-([a-z0-9]+)$/);
  if (m) return { kind: "adjust", dimension: m[1]! };
  return null;
}

function decodeBriefAdjustAction(token: string): BriefAdjustAction | null {
  if (token === "b") return { kind: "back" };
  if (!/^[a-z0-9-]+$/i.test(token)) return null;
  return { kind: "pick", subToken: token };
}

function decodeFeedbackAction(token: string): FeedbackAction | null {
  if (token === "next") return { kind: "next" };
  if (token === "done") return { kind: "done" };
  if (token === "x") return { kind: "cancel" };
  const m = token.match(/^(pos|neg)-([a-z0-9-]+)$/);
  if (m) return { kind: "toggle", polarity: m[1] as "pos" | "neg", token: m[2]! };
  return null;
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
  if (parts[0] === "brief" && parts.length === 3) {
    const shortRunId = parts[1]!;
    const action = decodeBriefAction(parts[2]!);
    if (!shortRunId || !action) return null;
    return { kind: "brief", shortRunId, action };
  }
  if (parts[0] === "briefadj" && parts.length === 3) {
    const shortRunId = parts[1]!;
    const action = decodeBriefAdjustAction(parts[2]!);
    if (!shortRunId || !action) return null;
    return { kind: "briefadj", shortRunId, action };
  }
  if (parts[0] === "fb" && parts.length === 3) {
    const shortRunId = parts[1]!;
    const action = decodeFeedbackAction(parts[2]!);
    if (!shortRunId || !action) return null;
    return { kind: "feedback", shortRunId, action };
  }
  return null;
}

function encodeAction(action: GateAction): string {
  switch (action.kind) {
    case "approve-direction": return `d${action.laneIndex}`;
    case "revise": return "r";
    case "reject": return "x";
    case "approve-final": return "a";
    case "refine-concept": return "rc";
  }
}

function decodeAction(token: string): GateAction | null {
  if (token === "r") return { kind: "revise" };
  if (token === "rc") return { kind: "refine-concept" };
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
  const refineRow = [
    button("🔁 Regenerate with feedback", encodeGateCallback("concept", runId, { kind: "refine-concept" })),
  ];
  const actionRow = [
    button("✏️ Revise (free-text)", encodeGateCallback("concept", runId, { kind: "revise" })),
    button("❌ Reject", encodeGateCallback("concept", runId, { kind: "reject" })),
  ];
  return { inline_keyboard: [directionRow, refineRow, actionRow] };
}

export function buildBriefInlineKeyboard(
  runId: string,
  adjustmentOptions: Array<{ label: string; dimension: string }>,
): TelegramInlineKeyboard {
  const rows: TelegramInlineKeyboardButton[][] = [
    [button("✅ Generate as planned", encodeBriefCallback(runId, { kind: "approve" }))],
  ];
  // One button per adjustment option, each on its own row for legibility.
  for (const opt of adjustmentOptions.slice(0, 5)) {
    rows.push([button(opt.label, encodeBriefCallback(runId, { kind: "adjust", dimension: opt.dimension }))]);
  }
  rows.push([button("❌ Cancel", encodeBriefCallback(runId, { kind: "cancel" }))]);
  return { inline_keyboard: rows };
}

export function buildBriefAdjustmentKeyboard(
  runId: string,
  options: Array<{ id: string; label: string }>,
): TelegramInlineKeyboard {
  const rows: TelegramInlineKeyboardButton[][] = options.slice(0, 6).map((opt) => [
    button(opt.label, encodeBriefAdjustCallback(runId, { kind: "pick", subToken: opt.id })),
  ]);
  rows.push([button("↩️ Back", encodeBriefAdjustCallback(runId, { kind: "back" }))]);
  return { inline_keyboard: rows };
}

export interface FeedbackOption {
  token: string;
  label: string;
  selected?: boolean;       // renders with ✓ prefix
}

export function buildFeedbackKeyboard(
  runId: string,
  polarity: "pos" | "neg",
  options: FeedbackOption[],
  isLastStep: boolean,
): TelegramInlineKeyboard {
  const rows: TelegramInlineKeyboardButton[][] = [];
  // Render options 2-per-row for compactness.
  for (let i = 0; i < options.length; i += 2) {
    const row: TelegramInlineKeyboardButton[] = [];
    for (const opt of options.slice(i, i + 2)) {
      const prefix = opt.selected ? "✓ " : (polarity === "pos" ? "👍 " : "👎 ");
      row.push(button(`${prefix}${opt.label}`, encodeFeedbackCallback(runId, { kind: "toggle", polarity, token: opt.token })));
    }
    rows.push(row);
  }
  // Control row
  const controls: TelegramInlineKeyboardButton[] = [];
  if (!isLastStep) {
    controls.push(button("➡️ Next (what didn't work?)", encodeFeedbackCallback(runId, { kind: "next" })));
  } else {
    controls.push(button("✅ Regenerate now", encodeFeedbackCallback(runId, { kind: "done" })));
  }
  controls.push(button("❌ Cancel", encodeFeedbackCallback(runId, { kind: "cancel" })));
  rows.push(controls);
  return { inline_keyboard: rows };
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
