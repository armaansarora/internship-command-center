// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SituationMapList } from "./SituationMapList";
import type { MapShape } from "@/lib/situation/outreach-arcs";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const userNode: MapShape["user"] = {
  id: "user",
  label: "You",
  angle: 0,
  ring: 0,
  kind: "user",
};

function shape(
  arcs: MapShape["arcs"],
  companies: MapShape["companies"] = [],
): MapShape {
  return {
    user: userNode,
    companies,
    cluster: null,
    arcs,
    activeCount: arcs.filter((a) => a.kind === "active").length,
  };
}

function render(shape: MapShape, names: Record<string, string>): Document {
  const html = renderToStaticMarkup(
    <SituationMapList shape={shape} companyNameById={names} />,
  );
  return new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
}

describe("SituationMapList", () => {
  it("empty arcs → 'The Situation Room is quiet.' (no decorative fallback)", () => {
    const doc = render(shape([]), {});
    const empty = doc.querySelector('[data-situation-map="empty"]');
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toMatch(/The Situation Room is quiet\./);
  });

  it("single active arc → Outgoing column has one row", () => {
    const doc = render(
      shape(
        [{ id: "o1", fromCompanyId: "c1", kind: "active", startedAtMs: 0 }],
        [
          {
            id: "c1",
            label: "Acme",
            angle: 0,
            ring: 1,
            kind: "company" as const,
          },
        ],
      ),
      { c1: "Acme" },
    );
    const list = doc.querySelector('[data-situation-map="list"]');
    expect(list).not.toBeNull();
    const rows = doc.querySelectorAll('[data-arc-kind="active"]');
    expect(rows.length).toBe(1);
    expect(rows[0]!.textContent).toContain("Acme");
  });

  it("sent arcs go into Incoming column, drafts + active into Outgoing", () => {
    const s = shape(
      [
        { id: "a", fromCompanyId: "c1", kind: "active", startedAtMs: 0 },
        { id: "b", fromCompanyId: "c2", kind: "draft", startedAtMs: 0 },
        { id: "c", fromCompanyId: "c3", kind: "completed", startedAtMs: 0 },
      ],
      [
        { id: "c1", label: "A", angle: 0, ring: 1, kind: "company" as const },
        { id: "c2", label: "B", angle: 0, ring: 1, kind: "company" as const },
        { id: "c3", label: "C", angle: 0, ring: 1, kind: "company" as const },
      ],
    );
    const doc = render(s, { c1: "A", c2: "B", c3: "C" });
    const columns = doc.querySelectorAll('[data-situation-map="list"] > div');
    expect(columns[0]!.textContent).toMatch(/Outgoing · 2/);
    expect(columns[1]!.textContent).toMatch(/Incoming · 1/);
  });

  it("each row is keyboard-accessible", () => {
    const doc = render(
      shape(
        [{ id: "o1", fromCompanyId: "c1", kind: "active", startedAtMs: 0 }],
        [{ id: "c1", label: "Acme", angle: 0, ring: 1, kind: "company" as const }],
      ),
      { c1: "Acme" },
    );
    const row = doc.querySelector('[role="button"][data-arc-kind]');
    expect(row?.getAttribute("tabindex")).toBe("0");
  });
});
