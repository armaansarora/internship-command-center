import { describe, expect, it } from "vitest";
import { KNOWN_CAST, findCastMember, listCastByCharacterId } from "./known-cast";

describe("known cast", () => {
  it("derives the cast from SEASON_ONE_CHARACTER_METADATA", () => {
    expect(KNOWN_CAST.length).toBeGreaterThanOrEqual(10);
    expect(KNOWN_CAST.find((c) => c.characterId === "otis")?.displayName).toBe("Otis Vale");
    expect(KNOWN_CAST.find((c) => c.characterId === "cro")?.displayName).toBe("Rafe Calder");
  });

  it("findCastMember matches by characterId, displayName, first name, or short label", () => {
    expect(findCastMember("cro")?.characterId).toBe("cro");
    expect(findCastMember("Rafe Calder")?.characterId).toBe("cro");
    expect(findCastMember("Rafe")?.characterId).toBe("cro");
    expect(findCastMember("CRO")?.characterId).toBe("cro");
  });

  it("listCastByCharacterId returns a keyed map", () => {
    const map = listCastByCharacterId();
    expect(map.cro?.displayName).toBe("Rafe Calder");
  });
});
