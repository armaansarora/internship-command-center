import { describe, expect, it } from "vitest";
import { routeRequest } from "./router";

const RAFE_REQUEST = `Create the next Season 1 character initial designs for Rafe Calder, characterId cro, based directly on docs/CHARACTER-BIBLE.md Rafe Calder entry and docs/CHARACTER-IMAGE-PROMPTS.md Rafe Calder prompt refs. Generate the five initial prompt-only Tower/Otis-compatible concept designs...`;

describe("intake router — Rafe→Otis regression", () => {
  // Outcome `characterId` is now the canon `header.id` (`rafe-calder`). The
  // legacy roleSlug (`cro`) is surfaced on `outcome.roleSlug` for callers
  // that still key on it.
  it("routes the exact misrouted Rafe request to Rafe Calder (canon header.id rafe-calder), not Otis", () => {
    const result = routeRequest({ request: RAFE_REQUEST });
    expect(result.kind).toBe("ambiguous-resolved-or-confident");
    expect(result.assetType).toBe("character");
    expect(result.characterId).toBe("rafe-calder");
    expect(result.roleSlug).toBe("cro");
    expect(result.displayName).toBe("Rafe Calder");
  });

  it("recognizes 'Tower/Otis-compatible' as a style envelope reference, NOT an Otis request", () => {
    const result = routeRequest({ request: RAFE_REQUEST });
    expect(result.characterId).not.toBe("otis");
  });

  it("preserves the explicit characterId:cro signal as the strongest evidence", () => {
    const result = routeRequest({ request: "make characterId: cro" });
    expect(result.characterId).toBe("rafe-calder");
    expect(result.roleSlug).toBe("cro");
  });
});
