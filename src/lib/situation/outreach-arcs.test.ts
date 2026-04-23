import { describe, it, expect } from "vitest";
import { shapeOutreachArcs } from "./outreach-arcs";

const NOW = 1_700_000_000_000;
const company = (id: string, name = "Acme") => ({ id, name, warmth: 50 });

describe("shapeOutreachArcs", () => {
  it("no outreach → empty arcs, no companies placed", () => {
    const shape = shapeOutreachArcs({
      outreach: [],
      companies: [company("c1")],
      nowMs: NOW,
    });
    expect(shape.arcs).toEqual([]);
    expect(shape.companies).toEqual([]);
    expect(shape.cluster).toBeNull();
    expect(shape.activeCount).toBe(0);
  });

  it("approved with send_after in the future → active arc", () => {
    const shape = shapeOutreachArcs({
      outreach: [
        {
          id: "o1",
          companyId: "c1",
          status: "approved",
          sendAfterMs: NOW + 10_000,
          approvedAtMs: NOW - 5_000,
          sentAtMs: null,
        },
      ],
      companies: [company("c1")],
      nowMs: NOW,
    });
    expect(shape.arcs).toHaveLength(1);
    expect(shape.arcs[0]!.kind).toBe("active");
    expect(shape.activeCount).toBe(1);
  });

  it("approved with send_after in the past → NOT active (cron picked it up)", () => {
    const shape = shapeOutreachArcs({
      outreach: [
        {
          id: "o1",
          companyId: "c1",
          status: "approved",
          sendAfterMs: NOW - 10_000,
          approvedAtMs: NOW - 60_000,
          sentAtMs: null,
        },
      ],
      companies: [company("c1")],
      nowMs: NOW,
    });
    expect(shape.arcs).toEqual([]);
  });

  it("pending_approval → draft arc", () => {
    const shape = shapeOutreachArcs({
      outreach: [
        {
          id: "o1",
          companyId: "c1",
          status: "pending_approval",
          sendAfterMs: null,
          approvedAtMs: null,
          sentAtMs: null,
        },
      ],
      companies: [company("c1")],
      nowMs: NOW,
    });
    expect(shape.arcs[0]!.kind).toBe("draft");
  });

  it("sent within 24h → completed arc; older than 24h → excluded", () => {
    const shape = shapeOutreachArcs({
      outreach: [
        {
          id: "recent",
          companyId: "c1",
          status: "sent",
          sendAfterMs: null,
          approvedAtMs: null,
          sentAtMs: NOW - 2 * 60 * 60 * 1000,
        },
        {
          id: "old",
          companyId: "c1",
          status: "sent",
          sendAfterMs: null,
          approvedAtMs: null,
          sentAtMs: NOW - 48 * 60 * 60 * 1000,
        },
      ],
      companies: [company("c1")],
      nowMs: NOW,
    });
    expect(shape.arcs.map((a) => a.id)).toEqual(["recent"]);
    expect(shape.arcs[0]!.kind).toBe("completed");
  });

  it("no arc when companyId is null (orphan outreach skipped)", () => {
    const shape = shapeOutreachArcs({
      outreach: [
        {
          id: "o1",
          companyId: null,
          status: "pending_approval",
          sendAfterMs: null,
          approvedAtMs: null,
          sentAtMs: null,
        },
      ],
      companies: [],
      nowMs: NOW,
    });
    expect(shape.arcs).toEqual([]);
  });

  it("deterministic angle — same company id always hashes to same angle", () => {
    const s1 = shapeOutreachArcs({
      outreach: [
        {
          id: "o1",
          companyId: "c1",
          status: "pending_approval",
          sendAfterMs: null,
          approvedAtMs: null,
          sentAtMs: null,
        },
      ],
      companies: [company("c1", "Acme")],
      nowMs: NOW,
    });
    const s2 = shapeOutreachArcs({
      outreach: [
        {
          id: "o2",
          companyId: "c1",
          status: "pending_approval",
          sendAfterMs: null,
          approvedAtMs: null,
          sentAtMs: null,
        },
      ],
      companies: [company("c1", "Acme")],
      nowMs: NOW + 1_000_000,
    });
    expect(s1.companies[0]!.angle).toBe(s2.companies[0]!.angle);
  });

  it("overflow past 50 companies clusters the least-warm", () => {
    const outreach = Array.from({ length: 55 }, (_, i) => ({
      id: `o${i}`,
      companyId: `c${i}`,
      status: "pending_approval",
      sendAfterMs: null,
      approvedAtMs: null,
      sentAtMs: null,
    }));
    // Warmth ramps — higher index = colder. Expect the bottom 5 to cluster.
    const companies = Array.from({ length: 55 }, (_, i) => ({
      id: `c${i}`,
      name: `Company ${i}`,
      warmth: 100 - i,
    }));
    const shape = shapeOutreachArcs({
      outreach,
      companies,
      nowMs: NOW,
    });
    expect(shape.companies).toHaveLength(50);
    expect(shape.cluster).not.toBeNull();
    expect(shape.cluster!.count).toBe(5);
    // Most-warm company (c0) must be placed; least-warm (c54) must not be.
    const placedIds = new Set(shape.companies.map((c) => c.id));
    expect(placedIds.has("c0")).toBe(true);
    expect(placedIds.has("c54")).toBe(false);
  });

  it("activeCount only counts 'active' kind", () => {
    const shape = shapeOutreachArcs({
      outreach: [
        {
          id: "a",
          companyId: "c1",
          status: "pending_approval",
          sendAfterMs: null,
          approvedAtMs: null,
          sentAtMs: null,
        },
        {
          id: "b",
          companyId: "c2",
          status: "approved",
          sendAfterMs: NOW + 5_000,
          approvedAtMs: NOW,
          sentAtMs: null,
        },
        {
          id: "c",
          companyId: "c3",
          status: "sent",
          sendAfterMs: null,
          approvedAtMs: null,
          sentAtMs: NOW - 1000,
        },
      ],
      companies: [company("c1"), company("c2"), company("c3")],
      nowMs: NOW,
    });
    expect(shape.activeCount).toBe(1);
  });
});
