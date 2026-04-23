// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConflictsSection, type ConflictEntry } from "./ConflictsSection";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function render(conflicts: ConflictEntry[]): Document {
  const html = renderToStaticMarkup(<ConflictsSection conflicts={conflicts} />);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("ConflictsSection", () => {
  it("renders nothing when no conflicts", () => {
    const doc = render([]);
    expect(doc.querySelector('[data-situation-section="conflicts"]')).toBeNull();
  });

  it("renders one card per conflict with the body text", () => {
    const doc = render([
      {
        id: "n1",
        body: "Technical · Acme overlaps Dentist.",
        pairId: "interview:a|calendar_event:b",
        createdAt: new Date().toISOString(),
      },
      {
        id: "n2",
        body: "Behavioral · Foo overlaps Screening · Bar.",
        pairId: "interview:c|interview:d",
        createdAt: new Date().toISOString(),
      },
    ]);
    const section = doc.querySelector('[data-situation-section="conflicts"]');
    expect(section).not.toBeNull();
    const cards = doc.querySelectorAll('article[role="button"]');
    expect(cards.length).toBe(2);
    expect(cards[0]!.textContent).toContain("Technical · Acme overlaps Dentist.");
  });

  it("shows a count badge in the header", () => {
    const doc = render([
      {
        id: "n1",
        body: "A overlaps B.",
        pairId: "x",
        createdAt: new Date().toISOString(),
      },
      {
        id: "n2",
        body: "C overlaps D.",
        pairId: "y",
        createdAt: new Date().toISOString(),
      },
      {
        id: "n3",
        body: "E overlaps F.",
        pairId: "z",
        createdAt: new Date().toISOString(),
      },
    ]);
    const header = doc.querySelector('[data-situation-section="conflicts"] header');
    expect(header?.textContent).toMatch(/Conflict · 3/);
  });

  it("each card is keyboard-accessible (tabIndex + role=button)", () => {
    const doc = render([
      {
        id: "n1",
        body: "A overlaps B.",
        pairId: "x",
        createdAt: new Date().toISOString(),
      },
    ]);
    const card = doc.querySelector('article[role="button"]') as HTMLElement | null;
    expect(card?.getAttribute("tabindex")).toBe("0");
    expect(card?.getAttribute("aria-label")).toMatch(/Calendar conflict/);
  });

  it("respects prefers-reduced-motion for the pulse dot", () => {
    const doc = render([
      {
        id: "n1",
        body: "A overlaps B.",
        pairId: "x",
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(doc.documentElement.outerHTML).toMatch(/prefers-reduced-motion: reduce/);
  });
});
