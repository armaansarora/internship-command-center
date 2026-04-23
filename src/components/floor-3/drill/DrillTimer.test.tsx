// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DrillTimer, formatTimerLabel, timerColor } from "./DrillTimer";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("formatTimerLabel", () => {
  it("renders 0:00 for 0ms", () => {
    expect(formatTimerLabel(0)).toBe("0:00");
  });

  it("renders 1:05 for 65000ms", () => {
    expect(formatTimerLabel(65_000)).toBe("1:05");
  });

  it("pads seconds with leading zero", () => {
    expect(formatTimerLabel(61_000)).toBe("1:01");
  });

  it("handles negative input safely", () => {
    expect(formatTimerLabel(-100)).toBe("0:00");
  });

  it("renders 2:00 at the wrap-it line", () => {
    expect(formatTimerLabel(120_000)).toBe("2:00");
  });

  it("renders 1:30 at the amber threshold", () => {
    expect(formatTimerLabel(90_000)).toBe("1:30");
  });
});

describe("timerColor", () => {
  it("is cool blue under 90s", () => {
    expect(timerColor(0)).toBe("#4A9EDB");
    expect(timerColor(30_000)).toBe("#4A9EDB");
    expect(timerColor(90_000)).toBe("#4A9EDB");
  });

  it("turns amber strictly past 90s", () => {
    expect(timerColor(90_001)).toBe("#F59E0B");
    expect(timerColor(91_000)).toBe("#F59E0B");
    expect(timerColor(120_000)).toBe("#F59E0B");
  });

  it("turns red strictly past 120s", () => {
    expect(timerColor(120_001)).toBe("#DC3C3C");
    expect(timerColor(125_000)).toBe("#DC3C3C");
    expect(timerColor(200_000)).toBe("#DC3C3C");
  });
});

describe("DrillTimer", () => {
  function render(elapsedMs: number, targetSeconds: number): Document {
    const html = renderToStaticMarkup(
      <DrillTimer elapsedMs={elapsedMs} targetSeconds={targetSeconds} />,
    );
    return new DOMParser().parseFromString(
      `<!doctype html><body>${html}</body>`,
      "text/html",
    );
  }

  it("renders role=timer with accessible label", () => {
    const doc = render(42_000, 90);
    const t = doc.querySelector('[role="timer"]');
    expect(t).not.toBeNull();
    expect(t?.getAttribute("aria-label")).toMatch(/0:42/);
    expect(t?.getAttribute("aria-label")).toMatch(/90 seconds/);
  });

  it("displays the label text in the DOM", () => {
    const doc = render(65_000, 90);
    expect(doc.body.textContent ?? "").toMatch(/1:05/);
  });
});
