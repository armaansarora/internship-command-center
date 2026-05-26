import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { summariseFeedbackForBrain, type BrainFeedbackSignal } from "@/lib/artlab/memory/feedback-summary";
import type { StyleWinEntry } from "@/lib/artlab/memory/style-ledger";
import type { RejectionEntry } from "@/lib/artlab/memory/rejection-ledger";
import type { FoundryAgentKind } from "./types";

const AGENT_TO_SOURCE: Record<FoundryAgentKind, string> = {
  "character-master": "character",
  "floor-environment": "floor",
  "ui-texture": "ui-texture",
  "sprite-animator": "sprite-animation",
};

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => JSON.parse(line) as T);
}

export function loadFoundryMemoryScope(
  memoryDir: string,
  agent: FoundryAgentKind,
  opts: { topN: number },
): BrainFeedbackSignal {
  const winSource = AGENT_TO_SOURCE[agent];
  const wins = readJsonl<StyleWinEntry & { source?: string }>(join(memoryDir, "style-wins.jsonl"))
    .filter((w) => (w.source ?? "") === winSource);
  const rejections = readJsonl<RejectionEntry & { source?: string }>(join(memoryDir, "style-rejections.jsonl"))
    .filter((r) => (r.source ?? "") === winSource);
  if (opts.topN <= 0) {
    return {
      recentWins: [],
      recentRejections: [],
      winsCount: wins.length,
      rejectionsCount: rejections.length,
    };
  }
  return summariseFeedbackForBrain(wins, rejections, opts.topN);
}
