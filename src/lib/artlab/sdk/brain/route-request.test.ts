import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { routeArtLabRequest } from "./route-request";

describe("routeArtLabRequest", () => {
  it("returns a clarifying question when meta confidence is low", async () => {
    const result = await routeArtLabRequest("do the thing", {
      env: { ANTHROPIC_API_KEY: undefined },
      metaCallOverride: async () => ({
        text: JSON.stringify({ agent: "character-master", parsedArgs: {}, confidence: 0.4 }),
        tokensIn: 1, tokensOut: 1, durationMs: 0,
      }),
    });
    expect("needsClarification" in result ? result.needsClarification : false).toBe(true);
  });

  it("dispatches to the named brain with parsedArgs when confidence is high", async () => {
    const result = await routeArtLabRequest("make a War Room dusk", {
      env: { ANTHROPIC_API_KEY: undefined },
      metaCallOverride: async () => ({
        text: JSON.stringify({
          agent: "floor-environment",
          parsedArgs: { space: "war-room", directive: "dusk", timeStates: ["dusk"], recentWins: [], recentRejections: [] },
          confidence: 0.95,
        }),
        tokensIn: 1, tokensOut: 1, durationMs: 0,
      }),
    });
    expect("agent" in result && result.agent).toBe("floor-environment");
  });

  it("propagates meta-orchestrator errors (non-JSON) as typed Error", async () => {
    await expect(
      routeArtLabRequest("x", {
        env: {},
        metaCallOverride: async () => ({ text: "not json", tokensIn: 0, tokensOut: 0, durationMs: 0 }),
      }),
    ).rejects.toThrow(/meta-orchestrator/i);
  });

  // ───────────────────────────────────────────────────────────────────────
  // Critical regression — meta-orchestrator's `parsedArgs` is the only
  // input to the per-agent brain. In production it NEVER carries the
  // `recentWins`/`recentRejections` arrays — those come from the daemon's
  // memory ledger. Before this fix, `route-request` parsed `parsedArgs`
  // directly with the strict per-agent schema, so every real (non-mocked)
  // enrichment threw a Zod error and the inbox payload's `brainHintStatus`
  // landed at `"failed"` on 100% of routed requests.
  //
  // Fix (option b): route-request must hydrate the missing feedback signals
  // before parsing — either from a `memoryDir` (production) or from
  // an empty default (smoke tests). The contract below pins both modes.
  // ───────────────────────────────────────────────────────────────────────
  describe("schema-gap regression — feedback signal hydration", () => {
    it("succeeds when meta omits recentWins/recentRejections and no memoryDir is supplied", async () => {
      const result = await routeArtLabRequest("Rafe jacket update", {
        env: { ANTHROPIC_API_KEY: undefined }, // dryRun
        metaCallOverride: async () => ({
          text: JSON.stringify({
            agent: "character-master",
            parsedArgs: { characterId: "rafe-calder", directive: "swap to charcoal wool" },
            confidence: 0.95,
          }),
          tokensIn: 1, tokensOut: 1, durationMs: 0,
        }),
      });
      expect("agent" in result && result.agent).toBe("character-master");
    });

    it("hydrates recentWins/recentRejections from memoryDir when supplied", async () => {
      const memoryDir = mkdtempSync(join(tmpdir(), "artlab-route-mem-"));
      writeFileSync(
        join(memoryDir, "style-wins.jsonl"),
        JSON.stringify({
          characterId: "rafe-calder",
          promotedAt: "2026-05-25T12:00:00.000Z",
          winningTechniques: ["wool-luxe"],
          promptHash: "h1",
          totalCostCents: 100,
          source: "character",
        }) + "\n",
      );
      writeFileSync(
        join(memoryDir, "style-rejections.jsonl"),
        JSON.stringify({
          characterId: "rafe-calder",
          runId: "r1",
          lane: 1,
          rejectedAt: "2026-05-24T12:00:00.000Z",
          reason: "wrong color",
          qaFailureCodes: ["WARDROBE"],
          promptHashRejected: "h0",
          source: "character",
        }) + "\n",
      );
      const result = await routeArtLabRequest("Rafe jacket update", {
        env: { ANTHROPIC_API_KEY: undefined }, // dryRun — echo back the parsed input
        memoryDir,
        metaCallOverride: async () => ({
          text: JSON.stringify({
            agent: "character-master",
            parsedArgs: { characterId: "rafe-calder", directive: "swap to charcoal wool" },
            confidence: 0.95,
          }),
          tokensIn: 1, tokensOut: 1, durationMs: 0,
        }),
      });
      expect("agent" in result && result.agent).toBe("character-master");
      const echo = (result as { output: { echoedInput?: { recentWins: Array<{ techniques: string }>; recentRejections: Array<{ codes: string }> } } }).output.echoedInput;
      // The dryRun anthropic client echoes back the parsed input — verify the
      // hydration actually injected the ledger entries.
      expect(echo?.recentWins.map((w) => w.techniques)).toContain("wool-luxe");
      expect(echo?.recentRejections.map((r) => r.codes)).toContain("WARDROBE");
    });

    it("prefers explicit parsedArgs.recentWins/Rejections over hydrated defaults", async () => {
      const memoryDir = mkdtempSync(join(tmpdir(), "artlab-route-mem-explicit-"));
      writeFileSync(
        join(memoryDir, "style-wins.jsonl"),
        JSON.stringify({
          characterId: "rafe-calder",
          promotedAt: "2026-05-25T12:00:00.000Z",
          winningTechniques: ["should-be-overridden"],
          promptHash: "h1",
          totalCostCents: 100,
          source: "character",
        }) + "\n",
      );
      const explicitWins = [{ at: "2026-05-26T00:00:00.000Z", techniques: "explicit-from-caller" }];
      const result = await routeArtLabRequest("Rafe jacket update", {
        env: { ANTHROPIC_API_KEY: undefined },
        memoryDir,
        metaCallOverride: async () => ({
          text: JSON.stringify({
            agent: "character-master",
            parsedArgs: {
              characterId: "rafe-calder",
              directive: "swap to charcoal wool",
              recentWins: explicitWins,
              recentRejections: [],
            },
            confidence: 0.95,
          }),
          tokensIn: 1, tokensOut: 1, durationMs: 0,
        }),
      });
      const echo = (result as { output: { echoedInput?: { recentWins: Array<{ techniques: string }> } } }).output.echoedInput;
      expect(echo?.recentWins.map((w) => w.techniques)).toEqual(["explicit-from-caller"]);
    });
  });
});
