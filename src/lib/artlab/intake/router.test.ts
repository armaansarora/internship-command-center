import { describe, expect, it } from "vitest";
import { routeRequest } from "./router";

describe("intake router", () => {
  it("routes 'make Sol Navarro' to cno", () => {
    const result = routeRequest({ request: "make Sol Navarro" });
    expect(result.characterId).toBe("cno");
    expect(result.assetType).toBe("character");
  });

  it("emits needs-human when only style-modifier mentions exist with no explicit subject", () => {
    const result = routeRequest({ request: "make an Otis-compatible thing for the Tower" });
    expect(result.kind).toBe("needs-human");
    expect(result.reasonCodes).toContain("style-reference-modifier");
  });

  it("routes plain environment requests", () => {
    const result = routeRequest({ request: "make a war room background" });
    expect(result.assetType).toBe("environment");
  });

  it("routes plain ui-texture requests", () => {
    const result = routeRequest({ request: "make an elevator button texture" });
    expect(result.assetType).toBe("ui-texture");
  });
});
