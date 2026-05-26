import { describe, expect, it } from "vitest";
import { evaluateFoundrySvgStrokeWidth } from "./svg-stroke-width";

describe("evaluateFoundrySvgStrokeWidth", () => {
  it("passes when every stroke-width matches the target within tolerance", () => {
    const svg = `<svg><path stroke-width="1.5" /><path stroke-width="1.6" /></svg>`;
    const out = evaluateFoundrySvgStrokeWidth(svg, {
      strokeWidthPx: 1.5,
      strokeWidthTolerancePx: 0.4,
    });
    expect(out.passed).toBe(true);
    expect(out.observed).toEqual([1.5, 1.6]);
  });

  it("fails when any stroke-width is outside tolerance", () => {
    const svg = `<svg><path stroke-width="1.5" /><path stroke-width="3.0" /></svg>`;
    const out = evaluateFoundrySvgStrokeWidth(svg, {
      strokeWidthPx: 1.5,
      strokeWidthTolerancePx: 0.4,
    });
    expect(out.passed).toBe(false);
    expect(out.outliers).toEqual([3.0]);
  });

  it("inherits the parent stroke-width on the svg element", () => {
    const svg = `<svg stroke-width="1.5"><path d="M0 0 L10 10" /></svg>`;
    const out = evaluateFoundrySvgStrokeWidth(svg, {
      strokeWidthPx: 1.5,
      strokeWidthTolerancePx: 0.4,
    });
    expect(out.passed).toBe(true);
    expect(out.observed).toEqual([1.5]);
  });

  it("fails when no stroke-width declared anywhere", () => {
    const svg = `<svg><path d="M0 0 L10 10" /></svg>`;
    const out = evaluateFoundrySvgStrokeWidth(svg, {
      strokeWidthPx: 1.5,
      strokeWidthTolerancePx: 0.4,
    });
    expect(out.passed).toBe(false);
    expect(out.reason).toContain("no stroke-width");
  });
});
