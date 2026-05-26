// src/lib/foundry/canon/types.test.ts
import { describe, expect, it } from "vitest";
import {
  FOUNDRY_CANON_VERSION,
  FOUNDRY_CANON_KINDS,
  FoundryCanonKindSchema,
  FoundryCanonHeaderSchema,
} from "./types";

describe("foundry canon shared types", () => {
  it("declares the canon schema version", () => {
    expect(FOUNDRY_CANON_VERSION).toBe("1.0.0");
  });

  it("enumerates all canon kinds", () => {
    expect(FOUNDRY_CANON_KINDS).toEqual([
      "character",
      "palette",
      "typography",
      "motion-language",
      "space-tokens",
      "iconography-rules",
    ]);
  });

  it("validates a canon kind via the schema", () => {
    expect(() => FoundryCanonKindSchema.parse("character")).not.toThrow();
    expect(() => FoundryCanonKindSchema.parse("rogue")).toThrow();
  });

  it("parses a valid canon header", () => {
    const header = FoundryCanonHeaderSchema.parse({
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
      FoundryCanonHeaderSchema.parse({
        kind: "character",
        schemaVersion: "0.9.0",
        id: "sol-navarro",
        revisedAt: "2026-05-25T00:00:00.000Z",
      }),
    ).toThrow();
  });
});
