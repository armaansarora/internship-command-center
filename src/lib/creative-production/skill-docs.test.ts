import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("creative production natural-language trigger", () => {
  it("teaches agents what Creative Production Engine means", () => {
    const skill = read(".agents/skills/creative-production-engine/SKILL.md");
    const claude = read("CLAUDE.md");
    const agents = read("AGENTS.md");
    const structure = read("STRUCTURE.md");
    const spec = read("docs/CREATIVE-PRODUCTION-ENGINE.md");
    const artlab = read(".artlab/README.md");

    for (const text of [skill, claude, agents, structure, spec, artlab]) {
      expect(text).toContain("Creative Production Engine");
      expect(text).toContain("npm run art:studio");
      expect(text).toContain("Housekeeping Gate");
      expect(text).toContain("Continuous Improvement Gate");
    }

    expect(skill).toContain("Trigger phrases");
    expect(skill).toContain("use the creative production engine");
    expect(skill).toContain("brainstorm first");
    expect(skill).toContain("approved for app");
    expect(skill).toContain("npm run art:studio -- --request");
    expect(skill).toContain("Parallel wave mode is the default");
    expect(skill).toContain("GPT-5.5 fast mode");
    expect(skill).toContain("--no-parallel");
    expect(skill).toContain("--mode lane --lane-brief");
    expect(skill).toContain("--mode validate-lane");
    expect(spec).toContain("adaptive request router");
    expect(spec).toContain("Parallel Wave Mode");
    expect(spec).toContain("default 15x parallel wave packet");
    expect(spec).toContain("awaiting-initial-approval");

    for (const text of [claude, agents, structure, artlab]) {
      expect(text).toContain("15x parallel");
      expect(text).toContain("GPT-5.5");
    }

    expect(artlab).toContain("--no-parallel");
    expect(artlab).toContain("--mode validate-lane");
  });
});
