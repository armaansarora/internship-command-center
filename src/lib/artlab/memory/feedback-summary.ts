// src/lib/artlab/memory/feedback-summary.ts
//
// Compact brain-facing summary of the style-wins + rejections ledgers.
//
// Round 1 surfaced both ledgers into the Tower context (via
// tower-context.ts → recentStyleWins / recentRejections), but brain prompts
// only ever sent the COUNTS (e.g. `winsCount: 2`). The actual signal —
// which techniques worked, which patterns got rejected — was lost.
//
// This helper turns the raw entries into a small, brain-friendly payload:
// up to N wins as `{at, techniques}` and up to N rejections as
// `{at, reason, codes}`. ≤ 50 chars per entry keeps the token cost tiny
// (~300 chars for 3+3) while giving the brain a usable signal.

import type { RejectionEntry } from "./rejection-ledger";
import type { StyleWinEntry } from "./style-ledger";

const DEFAULT_TOP_N = 3;
const MAX_TECHNIQUE_CHARS = 50;

export interface BrainWinSummary {
  at: string;                  // YYYY-MM-DD
  techniques: string;          // joined, capped at MAX_TECHNIQUE_CHARS
}

export interface BrainRejectionSummary {
  at: string;                  // YYYY-MM-DD
  reason: string;              // capped at MAX_TECHNIQUE_CHARS
  codes: string;               // joined qaFailureCodes, capped at MAX_TECHNIQUE_CHARS
}

export interface BrainFeedbackSignal {
  recentWins: BrainWinSummary[];
  recentRejections: BrainRejectionSummary[];
  winsCount: number;
  rejectionsCount: number;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Summarise the raw ledger entries for inclusion in a brain prompt input.
 * `wins` and `rejections` should be pre-filtered by characterId by the caller
 * (the Tower-context loader already does this via `getRelevantMemory`).
 */
export function summariseFeedbackForBrain(
  wins: readonly StyleWinEntry[],
  rejections: readonly RejectionEntry[],
  topN: number = DEFAULT_TOP_N,
): BrainFeedbackSignal {
  // Take the most-recent N of each (ledgers are append-only, newest at end).
  const winsTail = wins.slice(-topN).reverse();
  const rejectionsTail = rejections.slice(-topN).reverse();
  return {
    recentWins: winsTail.map((w) => ({
      at: w.promotedAt.slice(0, 10),
      techniques: truncate(w.winningTechniques.join(", "), MAX_TECHNIQUE_CHARS),
    })),
    recentRejections: rejectionsTail.map((r) => ({
      at: r.rejectedAt.slice(0, 10),
      reason: truncate(r.reason, MAX_TECHNIQUE_CHARS),
      codes: truncate(r.qaFailureCodes.join(", "), MAX_TECHNIQUE_CHARS),
    })),
    winsCount: wins.length,
    rejectionsCount: rejections.length,
  };
}
