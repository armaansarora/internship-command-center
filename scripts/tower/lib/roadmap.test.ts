import { describe, it, expect } from "vitest";
import { extractBrief, listPhases, parseRoadmap } from "./roadmap.js";

const SAMPLE = `
# Roadmap

## §7 — The Briefs

### R0 — Hardening Sprint
**Intent:** Fix the session bug and pin auth.
**Anchors:** src/proxy.ts, middleware.ts
**Proof:** Session survives refresh. Cookies match across server/client.

### R1 — The Observatory
**Intent:** Analytics redesign.
**Anchors:** floor-2
**Proof:** CFO whiteboard shows live pipeline velocity.

### R2 — The War Room
**Intent:** Pipeline heat map.
**Anchors:** floor-7
**Proof:** Live updates, decay, CRO reaction.

## §8 — Something else
`;

describe("parseRoadmap", () => {
  it("finds briefs section", () => {
    const briefs = parseRoadmap(SAMPLE);
    expect(Object.keys(briefs).sort()).toEqual(["R0", "R1", "R2"]);
  });

  it("captures intent, anchors, proof", () => {
    const briefs = parseRoadmap(SAMPLE);
    expect(briefs.R0.intent).toContain("session bug");
    expect(briefs.R0.anchors).toContain("src/proxy.ts");
    expect(briefs.R0.proof).toContain("Session survives");
  });

  it("captures phase name", () => {
    const briefs = parseRoadmap(SAMPLE);
    expect(briefs.R1.name).toBe("The Observatory");
  });
});

describe("extractBrief", () => {
  it("returns single phase brief text", () => {
    const text = extractBrief(SAMPLE, "R2");
    expect(text).toContain("Pipeline heat map");
    expect(text).not.toContain("Observatory");
  });

  it("throws on unknown phase", () => {
    expect(() => extractBrief(SAMPLE, "R99")).toThrow(/R99/);
  });
});

describe("listPhases", () => {
  it("returns phase ids in roadmap order", () => {
    expect(listPhases(SAMPLE)).toEqual(["R0", "R1", "R2"]);
  });
});
