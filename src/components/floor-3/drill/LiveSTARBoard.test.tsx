// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { StarHints } from "../star/extract-star";
import { LiveSTARBoard } from "./LiveSTARBoard";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function renderBoard(hints: StarHints): Document {
  const html = renderToStaticMarkup(<LiveSTARBoard hints={hints} />);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

const EMPTY: StarHints = { situation: [], task: [], action: [], result: [] };

describe("LiveSTARBoard", () => {
  it("renders a region with 4 STAR column labels", () => {
    const doc = renderBoard(EMPTY);
    const region = doc.querySelector(
      'div[role="region"][aria-label="Live STAR whiteboard"]',
    );
    expect(region).not.toBeNull();
    const text = region?.textContent ?? "";
    expect(text).toMatch(/Situation/);
    expect(text).toMatch(/Task/);
    expect(text).toMatch(/Action/);
    expect(text).toMatch(/Result/);
  });

  it("populates each column when hints are passed", () => {
    const doc = renderBoard({
      situation: ["when I was at Acme"],
      task: ["I was asked to rebuild the onboarding flow"],
      action: ["I built a sampling harness"],
      result: ["25% drop in support tickets"],
    });
    const text = doc.body.textContent ?? "";
    expect(text).toMatch(/when I was at Acme/);
    expect(text).toMatch(/rebuild the onboarding flow/);
    expect(text).toMatch(/sampling harness/);
    expect(text).toMatch(/25% drop in support tickets/);
  });

  it("shows the em-dash placeholder for empty columns", () => {
    const doc = renderBoard(EMPTY);
    const dashes = Array.from(doc.querySelectorAll("span")).filter(
      (el) => el.textContent === "—",
    );
    expect(dashes.length).toBe(4);
  });

  it("has aria-live=polite on each column content area", () => {
    const doc = renderBoard({
      situation: ["hi"],
      task: [],
      action: [],
      result: [],
    });
    const region = doc.querySelector(
      'div[role="region"][aria-label="Live STAR whiteboard"]',
    );
    expect(region).not.toBeNull();
    const liveNodes = region?.querySelectorAll('[aria-live="polite"]') ?? [];
    expect(liveNodes.length).toBe(4);
  });

  it("re-renders when hints prop changes", () => {
    const empty = renderBoard(EMPTY);
    const emptyDashes = Array.from(empty.querySelectorAll("span")).filter(
      (el) => el.textContent === "—",
    );
    expect(emptyDashes.length).toBe(4);

    const populated = renderBoard({
      situation: ["when I was at a firm"],
      task: [],
      action: [],
      result: [],
    });
    expect(populated.body.textContent ?? "").toMatch(/when I was at a firm/);
  });

  it("renders multiple entries per column", () => {
    const doc = renderBoard({
      situation: [],
      task: [],
      action: ["I built the bot", "I deployed the worker", "I fixed the flake"],
      result: [],
    });
    const text = doc.body.textContent ?? "";
    expect(text).toMatch(/I built the bot/);
    expect(text).toMatch(/I deployed the worker/);
    expect(text).toMatch(/I fixed the flake/);
  });
});
