import { describe, expect, it } from "vitest";
import { evaluateArtLabSvgAriaLabel } from "./svg-aria-label";

describe("evaluateArtLabSvgAriaLabel", () => {
  it("passes when aria-label matches expected text", () => {
    const svg = `<svg aria-label="Elevator door" role="img"><path/></svg>`;
    const out = evaluateArtLabSvgAriaLabel(svg, "Elevator door");
    expect(out.passed).toBe(true);
    expect(out.observed).toBe("Elevator door");
  });

  it("fails when aria-label is missing", () => {
    const svg = `<svg role="img"><path/></svg>`;
    const out = evaluateArtLabSvgAriaLabel(svg, "Elevator door");
    expect(out.passed).toBe(false);
    expect(out.reason).toContain("missing");
  });

  it("fails when aria-label is present but differs", () => {
    const svg = `<svg aria-label="Wrong" role="img"><path/></svg>`;
    const out = evaluateArtLabSvgAriaLabel(svg, "Elevator door");
    expect(out.passed).toBe(false);
    expect(out.observed).toBe("Wrong");
  });

  it("accepts whitespace differences case-sensitively", () => {
    const svg = `<svg aria-label="elevator door"><path/></svg>`;
    const out = evaluateArtLabSvgAriaLabel(svg, "Elevator door");
    expect(out.passed).toBe(false);
  });
});
