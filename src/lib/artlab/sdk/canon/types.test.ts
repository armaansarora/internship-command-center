// src/lib/artlab/sdk/canon/types.test.ts
import { describe, expect, it } from "vitest";
import {
  ARTLAB_CANON_VERSION,
  ARTLAB_CANON_KINDS,
  ArtLabCanonKindSchema,
  ArtLabCanonHeaderSchema,
} from "./types";

describe("artlab sdk canon shared types", () => {
  it("declares the canon schema version", () => {
    expect(ARTLAB_CANON_VERSION).toBe("1.0.0");
  });

  it("enumerates all canon kinds", () => {
    expect(ARTLAB_CANON_KINDS).toEqual([
      "character",
      "palette",
      "typography",
      "motion-language",
      "space-tokens",
      "iconography-rules",
    ]);
  });

  it("validates a canon kind via the schema", () => {
    expect(() => ArtLabCanonKindSchema.parse("character")).not.toThrow();
    expect(() => ArtLabCanonKindSchema.parse("rogue")).toThrow();
  });

  it("parses a valid canon header", () => {
    const header = ArtLabCanonHeaderSchema.parse({
      kind: "character",
      schemaVersion: "1.0.0",
      id: "sol-navarro",
      revisedAt: "2026-05-25T00:00:00.000Z",
    });
    expect(header.kind).toBe("character");
    expect(header.id).toBe("sol-navarro");
  });

  it("rejects a header with the wrong schema version", () => {
    expect(() =>
      ArtLabCanonHeaderSchema.parse({
        kind: "character",
        schemaVersion: "0.9.0",
        id: "sol-navarro",
        revisedAt: "2026-05-25T00:00:00.000Z",
      }),
    ).toThrow();
  });
});
