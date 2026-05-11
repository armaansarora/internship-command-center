// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CouncilTable,
  formatRelative,
  groupDossiersByRequest,
} from "./CouncilTable";
import type { Dossier } from "./HandoffDossierCard";

/**
 * Tests for CouncilTable.
 *
 * Coverage:
 *   1. Empty state when there are no dossiers.
 *   2. Grouping by request_id, with within-group ordering by created_at.
 *   3. Multiple dossiers in a request produce multiple lanes (no collapse).
 *   4. Multiple convening groups render newest-first.
 *   5. Next-action footer renders the parent-supplied sentence.
 *   6. Relative timestamp formatter handles seconds, minutes, hours, days.
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
    confidence: 70,
    disagreement: null,
    proposed_action: "Action",
    permission_needed: "none",
    deadline: null,
    recommendation: "Recommendation sentence",
    status: "ready",
    decided_at: null,
    executed_at: null,
    created_at: "2026-05-10T12:00:00.000Z",
    updated_at: "2026-05-10T12:00:00.000Z",
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

describe("groupDossiersByRequest", () => {
  it("returns [] for empty input", () => {
    expect(groupDossiersByRequest([])).toEqual([]);
  });

  it("groups by request_id and sorts within group by created_at ascending", () => {
    const groups = groupDossiersByRequest([
      dossier({ id: "a", request_id: "r-1", created_at: "2026-05-10T12:00:02Z" }),
      dossier({ id: "b", request_id: "r-1", created_at: "2026-05-10T12:00:01Z" }),
      dossier({ id: "c", request_id: "r-1", created_at: "2026-05-10T12:00:03Z" }),
    ]);
    expect(groups.length).toBe(1);
    expect(groups[0].dossiers.map((d) => d.id)).toEqual(["b", "a", "c"]);
  });

  it("sorts groups by earliest created_at descending (newest convening first)", () => {
    const groups = groupDossiersByRequest([
      dossier({ id: "old", request_id: "r-OLD", created_at: "2026-05-09T12:00:00Z" }),
      dossier({ id: "new", request_id: "r-NEW", created_at: "2026-05-10T12:00:00Z" }),
      dossier({ id: "mid", request_id: "r-MID", created_at: "2026-05-10T08:00:00Z" }),
    ]);
    expect(groups.map((g) => g.requestId)).toEqual(["r-NEW", "r-MID", "r-OLD"]);
  });
});

describe("formatRelative", () => {
  const base = Date.parse("2026-05-10T12:00:00.000Z");

  it("renders 'moments ago' for < 45 seconds", () => {
    expect(formatRelative("2026-05-10T11:59:30.000Z", base)).toBe("moments ago");
  });

  it("renders minutes for < 60m", () => {
    expect(formatRelative("2026-05-10T11:55:00.000Z", base)).toBe("5m ago");
  });

  it("renders hours for < 24h", () => {
    expect(formatRelative("2026-05-10T09:00:00.000Z", base)).toBe("3h ago");
  });

  it("renders days for < 7d", () => {
    expect(formatRelative("2026-05-08T12:00:00.000Z", base)).toBe("2d ago");
  });

  it("falls back to a calendar date for > 7d", () => {
    const out = formatRelative("2026-04-01T12:00:00.000Z", base);
    expect(out).not.toContain("ago");
  });

  it("returns the raw string when the iso is unparseable", () => {
    expect(formatRelative("not-a-date", base)).toBe("not-a-date");
  });
});

describe("CouncilTable — render", () => {
  it("renders the empty state when there are no dossiers", () => {
    const doc = render(
      <CouncilTable
        dossiers={[]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(doc.querySelector('[data-testid="council-table-empty"]')).not.toBeNull();
    expect(doc.querySelector('[data-testid="council-table"]')).toBeNull();
  });

  it("renders one convening per requestId", () => {
    const doc = render(
      <CouncilTable
        dossiers={[
          dossier({ id: "a", request_id: "r-A", owner: "cro" }),
          dossier({ id: "b", request_id: "r-B", owner: "cfo" }),
        ]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        now={() => Date.parse("2026-05-10T12:00:30Z")}
      />,
    );
    const root = doc.querySelector('[data-testid="council-table"]');
    expect(root?.getAttribute("data-convening-count")).toBe("2");
    const convenings = doc.querySelectorAll(
      '[data-testid="council-convening"]',
    );
    expect(convenings.length).toBe(2);
  });

  it("renders one DepartmentLane per dossier in a convening (no collapse)", () => {
    // Two dossiers from the SAME agent in one request — must render as two
    // adjacent lanes, not collapsed into one.
    const doc = render(
      <CouncilTable
        dossiers={[
          dossier({
            id: "a",
            request_id: "r-1",
            owner: "cro",
            recommendation: "First take",
            created_at: "2026-05-10T12:00:01Z",
          }),
          dossier({
            id: "b",
            request_id: "r-1",
            owner: "cro",
            recommendation: "Second take",
            created_at: "2026-05-10T12:00:02Z",
          }),
        ]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const lanes = doc.querySelectorAll('[data-testid="department-lane"]');
    expect(lanes.length).toBe(2);
    expect(Array.from(lanes).map((l) => l.getAttribute("data-dossier-id"))).toEqual(
      ["a", "b"],
    );
  });

  it("renders the next-action footer when supplied for that requestId", () => {
    const doc = render(
      <CouncilTable
        dossiers={[dossier({ id: "a", request_id: "r-NA" })]}
        nextActionByRequest={{ "r-NA": "Approve all three and let CRO move." }}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        now={() => Date.parse("2026-05-10T12:00:30Z")}
      />,
    );
    const footer = doc.querySelector(
      '[data-testid="council-convening-next-action"]',
    );
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toContain("Approve all three");
  });

  it("omits the next-action footer when no sentence is supplied for that request", () => {
    const doc = render(
      <CouncilTable
        dossiers={[dossier({ id: "a", request_id: "r-X" })]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        now={() => Date.parse("2026-05-10T12:00:30Z")}
      />,
    );
    expect(
      doc.querySelector('[data-testid="council-convening-next-action"]'),
    ).toBeNull();
  });

  it("convening header renders relative time using injected now()", () => {
    const now = () => Date.parse("2026-05-10T12:05:00Z");
    const doc = render(
      <CouncilTable
        dossiers={[
          dossier({ id: "a", request_id: "r-T", created_at: "2026-05-10T12:00:00Z" }),
        ]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        now={now}
      />,
    );
    const time = doc.querySelector(
      '[data-testid="council-convening-time"]',
    );
    expect(time?.textContent).toBe("5m ago");
    expect(time?.getAttribute("datetime")).toBe("2026-05-10T12:00:00Z");
  });

  it("counts dossiers in the convening header (singular vs plural)", () => {
    const doc1 = render(
      <CouncilTable
        dossiers={[dossier({ id: "x", request_id: "r" })]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        now={() => Date.parse("2026-05-10T12:00:30Z")}
      />,
    );
    expect(
      doc1
        .querySelector('[data-testid="council-convening-count"]')
        ?.textContent?.toLowerCase(),
    ).toBe("1 dossier");

    const doc3 = render(
      <CouncilTable
        dossiers={[
          dossier({ id: "x", request_id: "r" }),
          dossier({ id: "y", request_id: "r", created_at: "2026-05-10T12:00:01Z" }),
          dossier({ id: "z", request_id: "r", created_at: "2026-05-10T12:00:02Z" }),
        ]}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        now={() => Date.parse("2026-05-10T12:00:30Z")}
      />,
    );
    expect(
      doc3
        .querySelector('[data-testid="council-convening-count"]')
        ?.textContent?.toLowerCase(),
    ).toBe("3 dossiers");
  });
});
