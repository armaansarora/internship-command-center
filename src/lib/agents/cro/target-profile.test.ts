import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  TargetProfileSchema,
  serializeTargetProfile,
  tryParseTargetProfile,
  TARGET_PROFILE_MARKER,
} from "./target-profile";

describe("target-profile", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "key";
    Object.assign(process.env, { NODE_ENV: "development" });
  });

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k];
    }
    Object.assign(process.env, origEnv);
  });
  const sample = {
    version: 1 as const,
    roles: ["Software Engineer"],
    level: ["intern" as const, "new_grad" as const],
    companies: ["Stripe", "Ramp"],
    geos: ["NYC", "SF Bay Area"],
    musts: ["Visa sponsorship"],
    nices: ["AI / infra focus"],
    notes: "Prefer Series B+ with public engineering culture.",
  };

  it("schema parses and back-fills defaults", () => {
    const minimal = {
      roles: ["Product Manager"],
      geos: ["NYC"],
    };
    const parsed = TargetProfileSchema.parse(minimal);
    expect(parsed.version).toBe(1);
    expect(parsed.level).toEqual(["intern", "new_grad"]);
    expect(parsed.companies).toEqual([]);
    expect(parsed.musts).toEqual([]);
    expect(parsed.nices).toEqual([]);
  });

  it("schema rejects zero roles or zero geos", () => {
    expect(() =>
      TargetProfileSchema.parse({ roles: [], geos: ["NYC"] })
    ).toThrow();
    expect(() =>
      TargetProfileSchema.parse({ roles: ["SWE"], geos: [] })
    ).toThrow();
  });

  it("serialization starts with the marker + contains JSON + narrative", () => {
    const text = serializeTargetProfile(TargetProfileSchema.parse(sample));
    expect(text.startsWith(TARGET_PROFILE_MARKER)).toBe(true);
    expect(text).toContain(JSON.stringify(TargetProfileSchema.parse(sample)));
    expect(text).toContain("Role focus: Software Engineer");
    expect(text).toContain("Target companies: Stripe, Ramp");
    expect(text).toContain("Must-haves: Visa sponsorship");
    expect(text).toContain("Nice-to-haves: AI / infra focus");
  });

  it("serialize → parse round-trip preserves structured data", () => {
    const parsed = TargetProfileSchema.parse(sample);
    const text = serializeTargetProfile(parsed);
    const back = tryParseTargetProfile(text);
    expect(back).not.toBeNull();
    expect(back).toEqual(parsed);
  });

  it("parse returns null for content without the marker", () => {
    expect(tryParseTargetProfile("just a plain memory")).toBeNull();
    expect(tryParseTargetProfile("")).toBeNull();
    expect(tryParseTargetProfile(null)).toBeNull();
    expect(tryParseTargetProfile(undefined)).toBeNull();
  });

  it("parse returns null on malformed JSON under the marker", () => {
    const broken = `${TARGET_PROFILE_MARKER}\n{not json}\n\nSomething here`;
    expect(tryParseTargetProfile(broken)).toBeNull();
  });

  it("parse returns null if the JSON is valid but fails schema", () => {
    const bad = `${TARGET_PROFILE_MARKER}\n${JSON.stringify({ roles: [], geos: [] })}\n\nx`;
    expect(tryParseTargetProfile(bad)).toBeNull();
  });

  it("narrative omits empty sections to keep the embedding signal strong", () => {
    const lean = TargetProfileSchema.parse({
      roles: ["SWE"],
      geos: ["Remote"],
    });
    const text = serializeTargetProfile(lean);
    expect(text).not.toContain("Target companies:");
    expect(text).not.toContain("Must-haves:");
    expect(text).not.toContain("Nice-to-haves:");
    expect(text).toContain("Role focus: SWE");
  });
});
