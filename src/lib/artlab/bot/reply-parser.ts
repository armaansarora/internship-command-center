export const REQUIRED_PROMOTION_PHRASE = "approved for app";

export type Tier1Result =
  | { kind: "promotion-accepted" }
  | { kind: "echo-back-required-phrase"; message: string }
  | { kind: "no-match" };

const NEAR_PROMOTION_PATTERNS = [
  /\bapprove\s+for\s+app\b/i,
  /\bapproved\s+for\s+the\s+app\b/i,
  /\bapprove\s+app\b/i,
  /\bship\s+(it|to\s+app)\b/i,
  /\bpromote\s+(it|to\s+app)\b/i,
];

export function parseReplyExact(input: string): Tier1Result {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === REQUIRED_PROMOTION_PHRASE) return { kind: "promotion-accepted" };
  if (NEAR_PROMOTION_PATTERNS.some((p) => p.test(input))) {
    return {
      kind: "echo-back-required-phrase",
      message: `I read that as wanting to promote — please reply with the exact phrase: ${REQUIRED_PROMOTION_PHRASE}`,
    };
  }
  return { kind: "no-match" };
}

export type Tier2Action =
  | { type: "approve-direction"; laneIndex: number }
  | { type: "revise"; text: string }
  | { type: "reject" }
  | { type: "cancel"; runId: string };

export type Tier2Result =
  | { kind: "matched"; action: Tier2Action }
  | { kind: "no-match" };

const APPROVE_DIRECTION = /^\s*approve\s+direction\s+(\d+)\s*$/i;
const APPROVE_DIRECTION_LOOSE = /^\s*approve\s+direction\s+(\d+)\s*$/i;
const REVISE = /^\s*revise:\s*(.+?)\s*$/i;
const REJECT = /^\s*(reject|archive)\s*$/i;
const CANCEL = /^\s*cancel\s+(\S+)\s*$/i;

function normalizeSpaces(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function parseReplyPattern(input: string): Tier2Result {
  const norm = normalizeSpaces(input);
  let m: RegExpMatchArray | null;
  if ((m = norm.match(APPROVE_DIRECTION_LOOSE))) {
    return { kind: "matched", action: { type: "approve-direction", laneIndex: Number.parseInt(m[1]!, 10) } };
  }
  if ((m = input.match(APPROVE_DIRECTION))) {
    return { kind: "matched", action: { type: "approve-direction", laneIndex: Number.parseInt(m[1]!, 10) } };
  }
  if ((m = input.match(REVISE))) {
    return { kind: "matched", action: { type: "revise", text: m[1]! } };
  }
  if (REJECT.test(input)) return { kind: "matched", action: { type: "reject" } };
  if ((m = input.match(CANCEL))) {
    return { kind: "matched", action: { type: "cancel", runId: m[1]! } };
  }
  return { kind: "no-match" };
}
