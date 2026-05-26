import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleArtLabCanonGet } from "./canon-get";

let canonRoot: string;

beforeEach(() => {
  canonRoot = mkdtempSync(join(tmpdir(), "artlab-canon-get-"));
  mkdirSync(join(canonRoot, "characters"), { recursive: true });
  writeFileSync(
    join(canonRoot, "characters", "rafe-calder.yaml"),
    [
      "id: rafe-calder",
      "displayName: Rafe Calder",
      "title: Chief Revenue Officer",
      "wardrobe:",
      "  jacket: charcoal-wool",
      "  shirt: white-oxford",
    ].join("\n"),
  );
});

describe("handleArtLabCanonGet", () => {
  it("returns the parsed YAML payload for a known id", async () => {
    const result = await handleArtLabCanonGet({ id: "rafe-calder" }, { canonRoot });
    expect(result.id).toBe("rafe-calder");
    expect(result.kind).toBe("character");
    expect(result.yamlAsJson.title).toBe("Chief Revenue Officer");
    expect(result.sourcePath).toMatch(/rafe-calder\.yaml$/);
  });

  it("throws a typed error for an unknown id", async () => {
    await expect(handleArtLabCanonGet({ id: "ghost" }, { canonRoot })).rejects.toThrow(
      /canon entry not found/i,
    );
  });

  it("rejects malformed input", async () => {
    await expect(handleArtLabCanonGet({}, { canonRoot })).rejects.toThrow();
  });
});
