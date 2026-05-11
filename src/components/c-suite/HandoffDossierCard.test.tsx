// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  HandoffDossierCard,
  confidenceBucket,
  confidenceColor,
  parseEvidence,
  parseDisagreement,
  type Dossier,
} from "./HandoffDossierCard";

/**
 * Tests for the standalone HandoffDossierCard.
 *
 * Verifies:
 *   1. Confidence bucket boundaries (0-39 red, 40-69 amber, 70-89 gold,
 *      90-100 green, null/out-of-range grey).
 *   2. Status pill renders the right label for each enum.
 *   3. Evidence + open questions render in the expanded section.
 *   4. Disagreement note renders when present, hidden when absent.
 *   5. Permission chip copy matches the enum.
 */

function dossier(overrides: Partial<Dossier> = {}): Dossier {
  return {
    id: "d-1",
    user_id: "u-1",
    request_id: "r-1",
    dispatch_id: null,
    owner: "cro",
    requesting_agent: "ceo",
    task: "Review pipeline",
    evidence: [],
    open_questions: [],
    confidence: 80,
    disagreement: null,
    proposed_action: "Move 3 stale apps to interview",
    permission_needed: "none",
    deadline: null,
    recommendation: "Stripe still warm — recommend pushing forward this week.",
    status: "ready",
    decided_at: null,
    executed_at: null,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    ...overrides,
  };
}

function render(node: React.ReactElement): Document {
  const html = renderToStaticMarkup(node);
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("confidenceBucket", () => {
  it("returns 'unknown' for null, undefined, NaN, and out-of-range values", () => {
    expect(confidenceBucket(null)).toBe("unknown");
    expect(confidenceBucket(undefined)).toBe("unknown");
    expect(confidenceBucket(NaN)).toBe("unknown");
    expect(confidenceBucket(-1)).toBe("unknown");
    expect(confidenceBucket(101)).toBe("unknown");
  });

  it("maps 0-39 to 'low' (red)", () => {
    expect(confidenceBucket(0)).toBe("low");
    expect(confidenceBucket(20)).toBe("low");
    expect(confidenceBucket(39)).toBe("low");
    expect(confidenceColor(20)).toBe("#FF6B6B");
  });

  it("maps 40-69 to 'mid' (amber)", () => {
    expect(confidenceBucket(40)).toBe("mid");
    expect(confidenceBucket(55)).toBe("mid");
    expect(confidenceBucket(69)).toBe("mid");
    expect(confidenceColor(55)).toBe("#FFA500");
  });

  it("maps 70-89 to 'high' (gold)", () => {
    expect(confidenceBucket(70)).toBe("high");
    expect(confidenceBucket(80)).toBe("high");
    expect(confidenceBucket(89)).toBe("high");
    expect(confidenceColor(80)).toBe("#C9A84C");
  });

  it("maps 90-100 to 'veryHigh' (green)", () => {
    expect(confidenceBucket(90)).toBe("veryHigh");
    expect(confidenceBucket(95)).toBe("veryHigh");
    expect(confidenceBucket(100)).toBe("veryHigh");
    expect(confidenceColor(100)).toBe("#8BD17C");
  });

  it("unknown bucket maps to grey", () => {
    expect(confidenceColor(null)).toBe("#6B7280");
  });
});

describe("parseEvidence", () => {
  it("returns [] for non-arrays", () => {
    expect(parseEvidence(null)).toEqual([]);
    expect(parseEvidence(undefined)).toEqual([]);
    expect(parseEvidence("hello")).toEqual([]);
    expect(parseEvidence({ kind: "x" })).toEqual([]);
  });

  it("normalises array entries, dropping primitives", () => {
    const e = parseEvidence([
      { kind: "application", id: "a-1", summary: "Stripe – Software Eng" },
      "skip me",
      null,
      { kind: 12, id: "a-2", summary: 9 }, // wrong types
      { summary: "missing fields" },
    ]);
    expect(e.length).toBe(3);
    expect(e[0]).toEqual({
      kind: "application",
      id: "a-1",
      summary: "Stripe – Software Eng",
    });
    expect(e[1]).toEqual({ kind: undefined, id: "a-2", summary: undefined });
    expect(e[2]).toEqual({ kind: undefined, id: undefined, summary: "missing fields" });
  });
});

describe("parseDisagreement", () => {
  it("returns null for null, empty string, empty object, arrays", () => {
    expect(parseDisagreement(null)).toBeNull();
    expect(parseDisagreement(undefined)).toBeNull();
    expect(parseDisagreement("")).toBeNull();
    expect(parseDisagreement({})).toBeNull();
    expect(parseDisagreement([])).toBeNull();
  });

  it("accepts a bare string", () => {
    expect(parseDisagreement("CFO is wrong about runway")).toEqual({
      note: "CFO is wrong about runway",
    });
  });

  it("accepts a structured object with optional 'with'", () => {
    expect(parseDisagreement({ note: "Push back", with: "cfo" })).toEqual({
      note: "Push back",
      with: "cfo",
    });
    expect(parseDisagreement({ note: "Solo" })).toEqual({ note: "Solo" });
  });
});

describe("HandoffDossierCard — render", () => {
  it("renders the owner badge in uppercase + recommendation + proposed action", () => {
    const doc = render(<HandoffDossierCard dossier={dossier()} />);
    const ownerBadge = doc.querySelector('[data-testid="dossier-owner-badge"]');
    expect(ownerBadge?.textContent?.trim()).toBe("CRO");

    const rec = doc.querySelector('[data-testid="dossier-recommendation"]');
    expect(rec?.textContent).toContain("Stripe still warm");

    const action = doc.querySelector('[data-testid="dossier-proposed-action"]');
    expect(action?.textContent).toContain("Move 3 stale apps to interview");
  });

  it("sets confidence bucket attribute on the dot", () => {
    const doc = render(
      <HandoffDossierCard dossier={dossier({ confidence: 95 })} />,
    );
    const dot = doc.querySelector('[data-testid="dossier-confidence-dot"]');
    expect(dot?.getAttribute("data-confidence-bucket")).toBe("veryHigh");
    // a11y: aria-label conveys the confidence number.
    expect(dot?.getAttribute("aria-label")).toContain("95");
  });

  it("uses 'Confidence not estimated' aria-label when confidence is null", () => {
    const doc = render(
      <HandoffDossierCard dossier={dossier({ confidence: null })} />,
    );
    const dot = doc.querySelector('[data-testid="dossier-confidence-dot"]');
    expect(dot?.getAttribute("aria-label")).toBe("Confidence not estimated");
    expect(dot?.getAttribute("data-confidence-bucket")).toBe("unknown");
  });

  it("renders the status pill with the correct enum label", () => {
    for (const status of [
      "draft",
      "ready",
      "approved",
      "rejected",
      "executed",
      "expired",
    ] as const) {
      const doc = render(<HandoffDossierCard dossier={dossier({ status })} />);
      const pill = doc.querySelector('[data-testid="dossier-status-pill"]');
      expect(pill?.getAttribute("data-status")).toBe(status);
      // ready → "Ready", rejected → "Declined" (UX choice — softer)
      const label = pill?.textContent?.trim().toLowerCase() ?? "";
      if (status === "ready") expect(label).toBe("ready");
      if (status === "rejected") expect(label).toBe("declined");
      if (status === "executed") expect(label).toBe("executed");
    }
  });

  it("renders the permission chip copy for each enum", () => {
    for (const [permission, expected] of [
      ["none", "no permission needed"],
      ["draft", "permission: draft"],
      ["send", "permission: send"],
    ] as const) {
      const doc = render(
        <HandoffDossierCard
          dossier={dossier({ permission_needed: permission })}
        />,
      );
      const chip = doc.querySelector('[data-testid="dossier-permission-chip"]');
      expect(chip?.textContent?.trim().toLowerCase()).toBe(expected);
    }
  });

  it("evidence summary counts items, singular vs plural", () => {
    const doc1 = render(
      <HandoffDossierCard
        dossier={dossier({
          evidence: [{ kind: "application", id: "a-1", summary: "x" }],
        })}
      />,
    );
    expect(
      doc1
        .querySelector('[data-testid="dossier-evidence-summary"]')
        ?.textContent,
    ).toBe("Based on 1 record");

    const doc3 = render(
      <HandoffDossierCard
        dossier={dossier({
          evidence: [
            { kind: "x", id: "1", summary: "s1" },
            { kind: "x", id: "2", summary: "s2" },
            { kind: "x", id: "3", summary: "s3" },
          ],
        })}
      />,
    );
    expect(
      doc3
        .querySelector('[data-testid="dossier-evidence-summary"]')
        ?.textContent,
    ).toBe("Based on 3 records");
  });

  it("hides the expand toggle when there is nothing to expand", () => {
    const doc = render(<HandoffDossierCard dossier={dossier()} />);
    expect(
      doc.querySelector('[data-testid="dossier-expand-toggle"]'),
    ).toBeNull();
  });

  it("renders evidence list + open questions in expanded view", () => {
    const doc = render(
      <HandoffDossierCard
        dossier={dossier({
          evidence: [
            { kind: "application", id: "a-1", summary: "Stripe SWE" },
          ],
          open_questions: ["Is the recruiter still active?"],
        })}
        expanded
      />,
    );
    const details = doc.querySelector('[data-testid="dossier-details"]');
    expect(details).not.toBeNull();
    expect(
      doc.querySelector('[data-testid="dossier-evidence-list"]')?.textContent,
    ).toContain("Stripe SWE");
    expect(
      doc.querySelector('[data-testid="dossier-open-questions"]')?.textContent,
    ).toContain("recruiter");
  });

  it("renders disagreement note with the 'with' subject when present", () => {
    const doc = render(
      <HandoffDossierCard
        dossier={dossier({
          disagreement: { note: "Pipeline is colder than CFO claims", with: "cfo" },
        })}
        expanded
      />,
    );
    const note = doc.querySelector('[data-testid="dossier-disagreement"]');
    expect(note?.textContent).toContain("Pipeline is colder");
    expect(note?.textContent).toContain("CFO");
  });

  it("never renders disagreement note when value is null", () => {
    const doc = render(
      <HandoffDossierCard
        dossier={dossier({ disagreement: null })}
        expanded
      />,
    );
    expect(
      doc.querySelector('[data-testid="dossier-disagreement"]'),
    ).toBeNull();
  });
});
