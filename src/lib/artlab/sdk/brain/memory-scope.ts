import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { summariseFeedbackForBrain, type BrainFeedbackSignal } from "@/lib/artlab/memory/feedback-summary";
import type { StyleWinEntry } from "@/lib/artlab/memory/style-ledger";
import type { RejectionEntry } from "@/lib/artlab/memory/rejection-ledger";
import type { ArtLabAgentKind } from "./types";

const AGENT_TO_SOURCE: Record<ArtLabAgentKind, string> = {
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

// Unit 4 (2026-05-27) — `"artlab-promotion"` is a workflow-origin marker
// emitted by `promotion-runner` instead of an agent-kind marker. Treat it as
// visible to every agent so promotion wins are not silently filtered out of
// brain-facing memory scopes. Per-agent sources (`"character"`, `"floor"`,
// `"ui-texture"`, `"sprite-animation"`) continue to scope to one agent each.
const CROSS_AGENT_WIN_SOURCES = new Set<string>(["artlab-promotion"]);

function matchesScope(source: string | undefined, expected: string): boolean {
  const s = source ?? "";
  if (s === expected) return true;
  if (CROSS_AGENT_WIN_SOURCES.has(s)) return true;
  return false;
}

export function loadArtLabMemoryScope(
  memoryDir: string,
  agent: ArtLabAgentKind,
  opts: { topN: number },
): BrainFeedbackSignal {
  const winSource = AGENT_TO_SOURCE[agent];
  const wins = readJsonl<StyleWinEntry & { source?: string }>(join(memoryDir, "style-wins.jsonl"))
    .filter((w) => matchesScope(w.source, winSource));
  const rejections = readJsonl<RejectionEntry & { source?: string }>(join(memoryDir, "style-rejections.jsonl"))
    .filter((r) => matchesScope(r.source, winSource));
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
