import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleFoundryCanonList } from "./canon-list";

let canonRoot: string;

beforeEach(() => {
  canonRoot = mkdtempSync(join(tmpdir(), "foundry-canon-"));
  mkdirSync(join(canonRoot, "characters"), { recursive: true });
  mkdirSync(join(canonRoot, "floors"), { recursive: true });
  writeFileSync(
    join(canonRoot, "characters", "rafe-calder.yaml"),
    "id: rafe-calder\ndisplayName: Rafe Calder\nsummary: CRO, the War Room\n",
  );
  writeFileSync(
    join(canonRoot, "floors", "war-room.yaml"),
    "id: war-room\ndisplayName: War Room\nsummary: Floor 7 — pipeline\n",
  );
});

describe("handleFoundryCanonList", () => {
  it("returns every entry when no filter is passed", async () => {
    const result = await handleFoundryCanonList({}, { canonRoot });
    expect(result.entries).toHaveLength(2);
    expect(result.entries.map((e) => e.id).sort()).toEqual(["rafe-calder", "war-room"]);
  });

  it("filters by kind when a kind is supplied", async () => {
    const result = await handleFoundryCanonList({ kind: "character" }, { canonRoot });
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.id).toBe("rafe-calder");
    expect(result.entries[0]?.kind).toBe("character");
  });

  it("returns an empty list (not an error) for an unknown filter result", async () => {
    const result = await handleFoundryCanonList({ kind: "palette" }, { canonRoot });
    expect(result.entries).toEqual([]);
  });
});
