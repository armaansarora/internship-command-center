import { describe, it, expect } from "vitest";
import { buildCROSystemPrompt } from "./system-prompt";
import type { PipelineStats } from "@/lib/db/queries/applications-rest";
import type { SharedKnowledgeFlatMap } from "@/lib/db/queries/shared-knowledge-rest";

/**
 * R3.9 — CROSS-AGENT INTEL block in the CRO system prompt.
 *
 * The block is the visible half of the CIO→CRO shared-knowledge bridge: the
 * CIO writes timestamped intel notes via `writeSharedKnowledge`, the
 * orchestrator reads them with `readSharedKnowledge(userId, "cro")`, and the
 * CRO sees them at the tail of its system prompt right before forming a plan.
 *
 * What we're guarding:
 *   - No empty headers when there's nothing to share (undefined OR {}).
 *   - The exact section header / per-line shape — the CEO synthesis layer
 *     will eventually grep for "[CIO]" and similar tags.
 *   - Newest-first ordering by writtenAt.
 *   - Cap at 10 entries no matter how many the bus contains.
 *   - The split-on-first-colon entryKey extraction (CIO writes
 *     `company:UUID:intel`, which contains its own colons).
 */

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const baseStats: PipelineStats = {
  total: 12,
  discovered: 0,
  applied: 5,
  screening: 4,
  interviewing: 2,
  offers: 1,
  stale: 2,
  weeklyActivity: 4,
  conversionRate: 8,
  scheduledInterviews: 1,
  byStatus: { applied: 5, screening: 4, interview: 2, offer: 1 },
  appliedToScreeningRate: 80,
  screeningToInterviewRate: 50,
  interviewToOfferRate: 50,
  staleCount: 2,
  warmCount: 3,
  conversionLabel: "applied → offer",
};

function entry(
  value: string,
  writtenBy: string,
  writtenAt: string,
) {
  return { value, writtenAt, writtenBy };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("buildCROSystemPrompt — CROSS-AGENT INTEL block (R3.9)", () => {
  it("undefined sharedKnowledge → no CROSS-AGENT INTEL section", () => {
    const out = buildCROSystemPrompt(baseStats, "Armaan", [], null, undefined);
    expect(out).not.toContain("CROSS-AGENT INTEL");
    expect(out).not.toContain("[CIO]");
  });

  it("empty {} sharedKnowledge → no CROSS-AGENT INTEL section", () => {
    const out = buildCROSystemPrompt(baseStats, "Armaan", [], null, {});
    expect(out).not.toContain("CROSS-AGENT INTEL");
    // No orphan header even if the map is technically present.
    expect(out).not.toMatch(/CROSS-AGENT INTEL.*\n\s*$/);
  });

  it("a single CIO entry renders header + tag + value", () => {
    const map: SharedKnowledgeFlatMap = {
      "cio:company:acme:intel": entry(
        "Layoffs announced 4/20",
        "cio",
        "2026-04-20T10:00:00.000Z",
      ),
    };
    const out = buildCROSystemPrompt(baseStats, "Armaan", [], null, map);
    expect(out).toContain("CROSS-AGENT INTEL");
    expect(out).toContain("[CIO]");
    expect(out).toContain("Layoffs announced");
    // entryKey extracted via split-on-first-colon — preserves "company:acme:intel".
    expect(out).toContain("company:acme:intel");
  });

  it("multiple entries are ordered newest-first by writtenAt", () => {
    const map: SharedKnowledgeFlatMap = {
      "cio:company:older:intel": entry(
        "Old intel from January",
        "cio",
        "2026-01-15T09:00:00.000Z",
      ),
      "cio:company:newer:intel": entry(
        "Fresh intel from yesterday",
        "cio",
        "2026-04-21T09:00:00.000Z",
      ),
      "cio:company:middle:intel": entry(
        "Middle intel from March",
        "cio",
        "2026-03-10T09:00:00.000Z",
      ),
    };
    const out = buildCROSystemPrompt(baseStats, "Armaan", [], null, map);
    const idxNewer = out.indexOf("Fresh intel from yesterday");
    const idxMiddle = out.indexOf("Middle intel from March");
    const idxOlder = out.indexOf("Old intel from January");
    expect(idxNewer).toBeGreaterThan(-1);
    expect(idxMiddle).toBeGreaterThan(-1);
    expect(idxOlder).toBeGreaterThan(-1);
    expect(idxNewer).toBeLessThan(idxMiddle);
    expect(idxMiddle).toBeLessThan(idxOlder);
  });

  it("caps rendered entries at 10 even if the map contains 15", () => {
    const map: SharedKnowledgeFlatMap = {};
    // Build 15 distinct entries with distinct timestamps (newest = highest n).
    for (let n = 1; n <= 15; n++) {
      const padded = String(n).padStart(2, "0");
      const ts = `2026-04-${padded}T12:00:00.000Z`;
      map[`cio:company:co${padded}:intel`] = entry(
        `Intel value ${padded}`,
        "cio",
        ts,
      );
    }
    const out = buildCROSystemPrompt(baseStats, "Armaan", [], null, map);
    const matches = out.match(/Intel value \d{2}/g) ?? [];
    expect(matches.length).toBe(10);
    // The newest 10 are 06..15. 01..05 (oldest) must be dropped.
    expect(out).toContain("Intel value 15");
    expect(out).toContain("Intel value 06");
    expect(out).not.toContain("Intel value 05");
    expect(out).not.toContain("Intel value 01");
  });

  it("renders the writer tag in uppercase ([CIO] not [cio])", () => {
    const map: SharedKnowledgeFlatMap = {
      "cio:company:x:intel": entry("foo", "cio", "2026-04-20T10:00:00.000Z"),
    };
    const out = buildCROSystemPrompt(baseStats, "Armaan", [], null, map);
    expect(out).toContain("[CIO]");
    expect(out).not.toMatch(/\[cio]/);
  });

  it("appends the block at the END of the prompt (after MEMORY section)", () => {
    const map: SharedKnowledgeFlatMap = {
      "cio:company:x:intel": entry(
        "Tail block goes last",
        "cio",
        "2026-04-20T10:00:00.000Z",
      ),
    };
    const out = buildCROSystemPrompt(baseStats, "Armaan", [], null, map);
    const idxMemory = out.indexOf("MEMORY FROM PRIOR SESSIONS");
    const idxBlock = out.indexOf("CROSS-AGENT INTEL");
    expect(idxMemory).toBeGreaterThan(-1);
    expect(idxBlock).toBeGreaterThan(idxMemory);
  });

  it("preserves backwards compatibility: 4-arg call (no sharedKnowledge) still renders", () => {
    const out = buildCROSystemPrompt(baseStats, "Armaan", [], null);
    expect(out).toContain("LIVE PIPELINE SNAPSHOT");
    expect(out).not.toContain("CROSS-AGENT INTEL");
  });
});
