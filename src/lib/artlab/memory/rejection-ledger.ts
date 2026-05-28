import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// RejectionEntry — Unit 4 (2026-05-27): the rejection ledger was a definition
// without callers. Production code never wrote to `style-rejections.jsonl`, so
// the brain agents' `recentRejections` array was always empty — every
// rejection signal was silently lost.
//
// As part of wiring the writers (`strict-qa-runner`, `concept-runner`,
// `concept-critique-blocker`, `bot/brief-advance`, `bot/gate-advance`), the
// shape is aligned with the BrainRejectionSummary contract: `{at, reason,
// codes}` — naming the raw fields the same as the brain-facing summary
// removes the legacy `rejectedAt`/`qaFailureCodes`/`promptHashRejected`
// rename layer that lived inside `feedback-summary.ts`.
//
// Schema-additive fields (`source`, `lane`, `promptHash`) are optional so
// callers can record a rejection from any of the five wiring sites without
// fabricating data they don't have.
export const RejectionEntrySchema = z
  .object({
    at: z.string().datetime({ offset: true }),
    characterId: z.string().min(1),
    reason: z.string().min(1),
    codes: z.array(z.string()),
    lane: z.number().int().min(1).optional(),
    promptHash: z.string().min(1).optional(),
    // Agent-kind scope used by `loadArtLabMemoryScope` to keep
    // character-master rejections out of floor-environment brain prompts and
    // vice versa. Mirrors the `source` field on `StyleWinEntry`.
    source: z.string().optional(),
  })
  .strict();
export type RejectionEntry = z.infer<typeof RejectionEntrySchema>;

function path(memoryDir: string): string {
  return join(memoryDir, "style-rejections.jsonl");
}

export function appendRejection(memoryDir: string, entry: RejectionEntry): void {
  RejectionEntrySchema.parse(entry);
  appendFileSync(path(memoryDir), `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
}

export function readRejections(memoryDir: string, filter?: { characterId?: string }): RejectionEntry[] {
  const p = path(memoryDir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  const all = raw.split("\n").map((line) => RejectionEntrySchema.parse(JSON.parse(line)));
  if (filter?.characterId) return all.filter((r) => r.characterId === filter.characterId);
  return all;
}
