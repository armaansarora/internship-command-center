// src/lib/artlab/brainstorm/feedback-ledger.ts
//
// Append-only JSONL ledgers for brief adjustments + concept-board feedback.
// These are the bridge between the conversational Telegram surface and the
// brain — every tap or free-text message lands in here, the runner reads
// the ledger and tells the brain what to incorporate.

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BriefAdjustmentEntrySchema,
  type BriefAdjustmentEntry,
  type BriefAdjustmentDimension,
} from "./brief-schema";

export type { BriefAdjustmentEntry } from "./brief-schema";

const BRIEF_LEDGER = "brief-adjustments.jsonl";
const CONCEPT_LEDGER = "concept-feedback.jsonl";

export interface ConceptFeedbackEntry {
  at: string;
  polarity: "positive" | "negative" | "freetext";
  token?: string;            // e.g. "stance", "palette-drift"
  freeText?: string;
}

export function appendBriefAdjustment(runDir: string, entry: BriefAdjustmentEntry): void {
  BriefAdjustmentEntrySchema.parse(entry);
  appendFileSync(join(runDir, BRIEF_LEDGER), `${JSON.stringify(entry)}\n`);
}

export function readBriefAdjustments(runDir: string): BriefAdjustmentEntry[] {
  const path = join(runDir, BRIEF_LEDGER);
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const out: BriefAdjustmentEntry[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as unknown;
      out.push(BriefAdjustmentEntrySchema.parse(parsed));
    } catch { /* skip malformed */ }
  }
  return out;
}

export function appendConceptFeedback(runDir: string, entry: ConceptFeedbackEntry): void {
  appendFileSync(join(runDir, CONCEPT_LEDGER), `${JSON.stringify(entry)}\n`);
}

export function readConceptFeedback(runDir: string): ConceptFeedbackEntry[] {
  const path = join(runDir, CONCEPT_LEDGER);
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const out: ConceptFeedbackEntry[] = [];
  for (const line of lines) {
    try {
      out.push(JSON.parse(line) as ConceptFeedbackEntry);
    } catch { /* skip */ }
  }
  return out;
}

export function hasUnconsumedBriefAdjustments(runDir: string, lastConsumedIso?: string): boolean {
  const adjustments = readBriefAdjustments(runDir);
  if (!lastConsumedIso) return adjustments.length > 0;
  return adjustments.some((a) => a.at > lastConsumedIso);
}

export function summarizeAdjustments(adjustments: BriefAdjustmentEntry[]): Record<BriefAdjustmentDimension, BriefAdjustmentEntry[]> {
  const out: Partial<Record<BriefAdjustmentDimension, BriefAdjustmentEntry[]>> = {};
  for (const a of adjustments) {
    if (!out[a.dimension]) out[a.dimension] = [];
    out[a.dimension]!.push(a);
  }
  return out as Record<BriefAdjustmentDimension, BriefAdjustmentEntry[]>;
}
