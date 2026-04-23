// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DebriefBinderShelf } from "./DebriefBinderShelf";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function render(binders: Parameters<typeof DebriefBinderShelf>[0]["binders"]): Document {
  const html = renderToStaticMarkup(<DebriefBinderShelf binders={binders} />);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("DebriefBinderShelf — physical artifact, NOT JSON dump", () => {
  it("renders the empty-shelf invitation when no binders", () => {
    const doc = render([]);
    const section = doc.querySelector('section[aria-label="Debrief binder shelf"]');
    expect(section).not.toBeNull();
    const status = doc.querySelector('[role="status"]');
    expect(status?.textContent?.toLowerCase()).toContain("shelf empty");
  });

  it("renders one <button> per binder with company name in aria-label", () => {
    const doc = render([
      {
        id: "b1",
        title: "Debrief — CBRE (1)",
        company: "CBRE",
        round: "1",
        totalScore: 82,
        createdAt: new Date().toISOString(),
      },
      {
        id: "b2",
        title: "Debrief — CBRE (2)",
        company: "CBRE",
        round: "2",
        totalScore: 70,
        createdAt: new Date().toISOString(),
      },
      {
        id: "b3",
        title: "Debrief — Blackstone (1)",
        company: "Blackstone",
        round: "1",
        totalScore: 91,
        createdAt: new Date().toISOString(),
      },
    ]);
    const spines = doc.querySelectorAll('button[aria-label^="Debrief binder"]');
    expect(spines.length).toBe(3);
  });

  it("groups binders by company (listitems labeled per-company)", () => {
    const doc = render([
      {
        id: "b1",
        title: "",
        company: "CBRE",
        round: "1",
        totalScore: 80,
        createdAt: new Date().toISOString(),
      },
      {
        id: "b2",
        title: "",
        company: "Blackstone",
        round: "1",
        totalScore: 75,
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(doc.querySelector('[role="listitem"][aria-label*="CBRE"]')).not.toBeNull();
    expect(doc.querySelector('[role="listitem"][aria-label*="Blackstone"]')).not.toBeNull();
  });

  it("ANTI-PATTERN GUARD: no <pre> or <code> JSON blocks in the shelf render", () => {
    const doc = render([
      {
        id: "b1",
        title: "",
        company: "CBRE",
        round: "1",
        totalScore: 80,
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(doc.querySelectorAll("pre").length).toBe(0);
    expect(doc.querySelectorAll("code").length).toBe(0);
  });

  it("embosses the company name inside the binder button", () => {
    const doc = render([
      {
        id: "b1",
        title: "",
        company: "CBRE",
        round: "1",
        totalScore: 80,
        createdAt: new Date().toISOString(),
      },
    ]);
    const spine = doc.querySelector('button[aria-label*="CBRE"]');
    expect(spine?.textContent).toContain("CBRE");
    expect(spine?.textContent).toContain("R1");
  });
});
