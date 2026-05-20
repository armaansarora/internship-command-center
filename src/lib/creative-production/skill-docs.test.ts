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
    expect(skill).toContain("--mode coordinate");
    expect(skill).toContain("--mode improve");
    expect(skill).toContain("review-board.html");
    expect(skill).toContain("promotion-gate.json");
	    expect(skill).toContain("--max-attempts");
	    expect(skill).toContain("--request-timeout-ms");
	    expect(skill).toContain("--force-unlock");
	    expect(skill).toContain("cutout-bootstrap");
	    expect(skill).toContain("cutout-benchmark");
	    expect(skill).toContain("cutout-readiness");
	    expect(skill).toContain("cutout-auto");
	    expect(skill).toContain("cutout-doctor");
    expect(skill).toContain("exactly 5 total images");
    expect(skill).toContain("do not stop at `initial-direction-approved`");
    expect(spec).toContain("adaptive request router");
    expect(spec).toContain("Parallel Wave Mode");
    expect(spec).toContain("default five-lane parallel packet");
    expect(spec).toContain("direction-generating");
    expect(spec).toContain("direction-review-ready");
    expect(spec).toContain("pre-image human approval gate");
    expect(spec).toContain("Creative Capabilities");
    expect(spec).toContain("shader effects");
	    expect(spec).toContain("api-run.lock");
	    expect(spec).toContain("api-run-state.json");
	    expect(spec).toContain("--phase production-pack");
	    expect(spec).toContain("cutout-auto");
	    expect(spec).toContain("cutout-readiness");
    expect(spec).toContain("continuous-improvement-report.json");
    expect(spec).toContain("`initial-direction-approved` is an internal checkpoint");

	    for (const text of [skill, spec, artlab]) {
	      expect(text).not.toContain("#00ff00");
	      expect(text.toLowerCase()).not.toContain("chroma");
	      expect(text.toLowerCase()).not.toContain("green matte");
	      expect(text).not.toContain("extract-alpha");
	    }

    for (const text of [claude, agents, structure, artlab]) {
      expect(text).toContain("five-lane parallel");
      expect(text).toContain("GPT-5.5");
      expect(text).toContain("coordinate");
    }

    expect(artlab).toContain("--no-parallel");
    expect(artlab).toContain("--mode validate-lane");
    expect(artlab).toContain("coordinator-review.json");
    expect(artlab).toContain("--mode improve");
    expect(artlab).toContain("api-run.lock");
  });
});
