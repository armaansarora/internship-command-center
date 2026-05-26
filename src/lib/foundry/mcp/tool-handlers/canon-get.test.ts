import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleFoundryCanonGet } from "./canon-get";

let canonRoot: string;

beforeEach(() => {
  canonRoot = mkdtempSync(join(tmpdir(), "foundry-canon-get-"));
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

describe("handleFoundryCanonGet", () => {
  it("returns the parsed YAML payload for a known id", async () => {
    const result = await handleFoundryCanonGet({ id: "rafe-calder" }, { canonRoot });
    expect(result.id).toBe("rafe-calder");
    expect(result.kind).toBe("character");
    expect(result.yamlAsJson.title).toBe("Chief Revenue Officer");
    expect(result.sourcePath).toMatch(/rafe-calder\.yaml$/);
  });

  it("throws a typed error for an unknown id", async () => {
    await expect(handleFoundryCanonGet({ id: "ghost" }, { canonRoot })).rejects.toThrow(
      /canon entry not found/i,
    );
  });

  it("rejects malformed input", async () => {
    await expect(handleFoundryCanonGet({}, { canonRoot })).rejects.toThrow();
  });
});
