// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FinalCountdownSection,
  type CountdownCard,
} from "./FinalCountdownSection";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const H = 60 * 60 * 1000;

function render(cards: CountdownCard[]): Document {
  const html = renderToStaticMarkup(<FinalCountdownSection cards={cards} />);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("FinalCountdownSection", () => {
  it("renders nothing when no cards", () => {
    const doc = render([]);
    expect(doc.querySelector('[data-situation-section="final-countdown"]')).toBeNull();
  });

  it("renders nothing when all deadlines are > 7 days out or past", () => {
    const doc = render([
      {
        id: "a",
        companyName: "Far",
        role: "Eng",
        deadlineAtMs: Date.now() + 10 * 24 * H,
      },
      {
        id: "b",
        companyName: "Past",
        role: "Eng",
        deadlineAtMs: Date.now() - 1 * H,
      },
    ]);
    expect(doc.querySelector('[data-situation-section="final-countdown"]')).toBeNull();
  });

  it("tiers: <24h → red (t_24h)", () => {
    const doc = render([
      {
        id: "a",
        companyName: "Acme",
        role: "SWE",
        deadlineAtMs: Date.now() + 12 * H,
      },
    ]);
    const card = doc.querySelector("[data-tier]");
    expect(card?.getAttribute("data-tier")).toBe("t_24h");
  });

  it("tiers: 24-72h → amber (t_72h)", () => {
    const doc = render([
      {
        id: "a",
        companyName: "Acme",
        role: "SWE",
        deadlineAtMs: Date.now() + 48 * H,
      },
    ]);
    const card = doc.querySelector("[data-tier]");
    expect(card?.getAttribute("data-tier")).toBe("t_72h");
  });

  it("tiers: 72h-7d → soft amber (t_7d)", () => {
    const doc = render([
      {
        id: "a",
        companyName: "Acme",
        role: "SWE",
        deadlineAtMs: Date.now() + 5 * 24 * H,
      },
    ]);
    const card = doc.querySelector("[data-tier]");
    expect(card?.getAttribute("data-tier")).toBe("t_7d");
  });

  it("sorts ascending by deadline (nearest first)", () => {
    const doc = render([
      {
        id: "b",
        companyName: "Bravo",
        role: "Eng",
        deadlineAtMs: Date.now() + 5 * 24 * H,
      },
      {
        id: "a",
        companyName: "Alpha",
        role: "Eng",
        deadlineAtMs: Date.now() + 12 * H,
      },
      {
        id: "c",
        companyName: "Charlie",
        role: "Eng",
        deadlineAtMs: Date.now() + 48 * H,
      },
    ]);
    const companyNodes = doc.querySelectorAll("article");
    expect(companyNodes[0]!.textContent).toContain("Alpha");
    expect(companyNodes[1]!.textContent).toContain("Charlie");
    expect(companyNodes[2]!.textContent).toContain("Bravo");
  });

  it("keyboard-accessible (role=button, tabindex)", () => {
    const doc = render([
      {
        id: "a",
        companyName: "Acme",
        role: "SWE",
        deadlineAtMs: Date.now() + 12 * H,
      },
    ]);
    const card = doc.querySelector("article[role='button']") as HTMLElement | null;
    expect(card).not.toBeNull();
    expect(card?.getAttribute("tabindex")).toBe("0");
  });

  it("count badge in header matches number of visible cards", () => {
    const now = Date.now();
    const doc = render([
      { id: "a", companyName: "A", role: "E", deadlineAtMs: now + 1 * H },
      { id: "b", companyName: "B", role: "E", deadlineAtMs: now + 2 * H },
      // Not visible: deadline > 7 days.
      { id: "c", companyName: "C", role: "E", deadlineAtMs: now + 30 * 24 * H },
    ]);
    const header = doc.querySelector('[data-situation-section="final-countdown"] header');
    expect(header?.textContent).toMatch(/Final Countdown · 2/);
  });
});
