import { describe, expect, it } from "vitest";
import { parseBundle } from "./bundle-parser";

describe("bundle parser", () => {
  it("returns null for a single-asset request", () => {
    expect(parseBundle("make Rafe Calder")).toBeNull();
  });

  it("parses 'X with Y in it' as environment+character bundle", () => {
    const parsed = parseBundle("make the war room with Rafe in it");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.length).toBe(2);
    expect(parsed!.children.some((c) => c.assetType === "environment")).toBe(true);
    expect(parsed!.children.some((c) => c.assetType === "character" && c.characterHint === "Rafe")).toBe(true);
    expect(parsed!.promotionPolicy).toBe("atomic");
  });

  it("parses 'X and Y together' as two characters bundle", () => {
    const parsed = parseBundle("make Rafe and Mara together");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.length).toBe(2);
    expect(parsed!.children.every((c) => c.assetType === "character")).toBe(true);
  });

  it("parses 'X for Z' as scoped bundle", () => {
    const parsed = parseBundle("make a button for the war room");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.some((c) => c.assetType === "ui-texture")).toBe(true);
    expect(parsed!.children.some((c) => c.assetType === "environment")).toBe(true);
  });

  it("parses 'the [room] floor' as environment+characters bundle", () => {
    const parsed = parseBundle("make the lobby floor");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.some((c) => c.assetType === "environment")).toBe(true);
  });

  it("parses 'X and Y' (no 'together') as two characters bundle", () => {
    const parsed = parseBundle("make Sol and Mara");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.length).toBe(2);
    expect(parsed!.children.every((c) => c.assetType === "character")).toBe(true);
  });

  it("parses 'X + Y' (plus glue) as two characters bundle", () => {
    const parsed = parseBundle("design Sol + Otis");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.length).toBe(2);
  });

  it("parses a comma-separated cast list", () => {
    const parsed = parseBundle("make Sol, Mara, Otis");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.length).toBe(3);
  });

  it("does NOT bundle a single character mentioned alone", () => {
    expect(parseBundle("make Sol")).toBeNull();
  });

  it("does NOT bundle multi-character text when a room is also named (defer to the room+character path)", () => {
    // Room is named with a character → bundle parser's catch-all defers
    // (the "with X in it" form already handles this above). Returns null
    // here; the dispatcher classifier routes to single-character intake.
    const parsed = parseBundle("Sol in the lobby");
    expect(parsed).toBeNull();
  });
});
