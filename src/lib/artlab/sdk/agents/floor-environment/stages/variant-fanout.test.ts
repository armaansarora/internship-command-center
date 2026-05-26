import { describe, expect, it } from "vitest";
import { fanOutFoundryFloorVariants } from "./variant-fanout";
import type { FoundryFloorCanonEntry } from "../floor-canon";

const canon: FoundryFloorCanonEntry = {
  slug: "war-room",
  displayName: "The War Room",
  mood: "tactical-luxury",
  palette: ["#1A1A2E", "#C9A84C"],
  requiredElements: ["wall-mounted-boards"],
  aspectRatio: "16:9",
  typography: "playfair-display",
};

describe("fanOutFoundryFloorVariants", () => {
  it("returns one job per requested time-state", () => {
    const jobs = fanOutFoundryFloorVariants(canon, ["dawn", "midday", "night"]);
    expect(jobs.map((j) => j.timeState)).toEqual(["dawn", "midday", "night"]);
  });

  it("each job carries a complete prompt", () => {
    const jobs = fanOutFoundryFloorVariants(canon, ["dusk"]);
    expect(jobs[0]?.prompt).toContain("dusk");
    expect(jobs[0]?.prompt).toContain("The War Room");
  });

  it("each job declares the requested aspect ratio", () => {
    const jobs = fanOutFoundryFloorVariants(canon, ["morning"]);
    expect(jobs[0]?.aspectRatio).toBe("16:9");
  });

  it("each job has a stable jobId tied to slug+timeState", () => {
    const a = fanOutFoundryFloorVariants(canon, ["evening"]);
    const b = fanOutFoundryFloorVariants(canon, ["evening"]);
    expect(a[0]?.jobId).toBe(b[0]?.jobId);
    expect(a[0]?.jobId).toContain("war-room");
    expect(a[0]?.jobId).toContain("evening");
  });

  it("preserves input order without deduping", () => {
    const jobs = fanOutFoundryFloorVariants(canon, [
      "night",
      "dawn",
      "night",
    ]);
    expect(jobs.map((j) => j.timeState)).toEqual(["night", "dawn", "night"]);
  });
});
