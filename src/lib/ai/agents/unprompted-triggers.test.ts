import { describe, it, expect } from "vitest";
import {
  shouldFireStaleCluster,
  shouldFireRejectionCluster,
  shouldFireOfferArrived,
  type MiniApp,
  type MiniNotification,
} from "./unprompted-triggers";

// Fixed "now" for deterministic time math across all tests.
const NOW = new Date("2026-04-22T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function isoAgo(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

function makeApp(partial: Partial<MiniApp> & { id: string }): MiniApp {
  return {
    status: "applied",
    last_activity_at: null,
    updated_at: NOW.toISOString(),
    created_at: NOW.toISOString(),
    company_name: "Acme Corp",
    role: "Software Engineer Intern",
    ...partial,
  };
}

describe("shouldFireStaleCluster", () => {
  it("fires when 6 early-pipeline apps have been idle 14+ days", () => {
    const apps: MiniApp[] = Array.from({ length: 6 }, (_, i) =>
      makeApp({
        id: `app-${i}`,
        status: i % 2 === 0 ? "applied" : "screening",
        last_activity_at: isoAgo(15 * DAY + i * HOUR),
        company_name: `Company ${i}`,
      }),
    );

    const decision = shouldFireStaleCluster(apps, NOW);

    expect(decision).not.toBeNull();
    expect(decision?.type).toBe("stale_cluster");
    expect(decision?.priority).toBe("high");
    expect(decision?.title).toBe("Pipeline going cold");
    expect(decision?.sourceEntityId).toBeNull();
    expect(decision?.sourceEntityType).toBeNull();
    expect(decision?.actions).toEqual([{ label: "See briefing", floor: "1" }]);
    // Body should include the count and the oldest stale app's company + role.
    expect(decision?.body).toContain("6");
    // Oldest = highest idx (+5h) because isoAgo(15d + 5h) is further in the past.
    expect(decision?.body).toContain("Company 5");
    expect(decision?.body).toContain("Software Engineer Intern");
  });

  it("returns null when only 4 apps are stale (threshold is >5)", () => {
    const apps: MiniApp[] = Array.from({ length: 4 }, (_, i) =>
      makeApp({
        id: `app-${i}`,
        status: "applied",
        last_activity_at: isoAgo(20 * DAY),
      }),
    );
    expect(shouldFireStaleCluster(apps, NOW)).toBeNull();
  });

  it("returns null when 6 apps have recent activity (inside 14d window)", () => {
    const apps: MiniApp[] = Array.from({ length: 6 }, (_, i) =>
      makeApp({
        id: `app-${i}`,
        status: "applied",
        last_activity_at: isoAgo(3 * DAY),
      }),
    );
    expect(shouldFireStaleCluster(apps, NOW)).toBeNull();
  });

  it("ignores apps whose status is not 'applied' or 'screening'", () => {
    const apps: MiniApp[] = [
      ...Array.from({ length: 6 }, (_, i) =>
        makeApp({
          id: `app-${i}`,
          status: "interview_scheduled",
          last_activity_at: isoAgo(30 * DAY),
        }),
      ),
    ];
    expect(shouldFireStaleCluster(apps, NOW)).toBeNull();
  });

  it("returns null when apps have no last_activity_at (never-active apps are not stale)", () => {
    const apps: MiniApp[] = Array.from({ length: 6 }, (_, i) =>
      makeApp({
        id: `app-${i}`,
        status: "applied",
        last_activity_at: null,
      }),
    );
    expect(shouldFireStaleCluster(apps, NOW)).toBeNull();
  });
});

describe("shouldFireRejectionCluster", () => {
  it("fires when 3 rejections landed in the last 7 days", () => {
    const apps: MiniApp[] = [
      makeApp({ id: "r1", status: "rejected", updated_at: isoAgo(1 * DAY) }),
      makeApp({ id: "r2", status: "rejected", updated_at: isoAgo(3 * DAY) }),
      makeApp({ id: "r3", status: "rejected", updated_at: isoAgo(6 * DAY) }),
    ];
    const decision = shouldFireRejectionCluster(apps, NOW);
    expect(decision).not.toBeNull();
    expect(decision?.type).toBe("rejection_cluster");
    expect(decision?.priority).toBe("medium");
    expect(decision?.title).toContain("3");
    expect(decision?.title).toContain("regroup");
    expect(decision?.body).toContain("3");
    expect(decision?.sourceEntityId).toBeNull();
    expect(decision?.actions).toEqual([{ label: "See briefing", floor: "1" }]);
  });

  it("returns null with only 2 rejections in window", () => {
    const apps: MiniApp[] = [
      makeApp({ id: "r1", status: "rejected", updated_at: isoAgo(1 * DAY) }),
      makeApp({ id: "r2", status: "rejected", updated_at: isoAgo(4 * DAY) }),
    ];
    expect(shouldFireRejectionCluster(apps, NOW)).toBeNull();
  });

  it("returns null when 3 rejections are older than 7 days", () => {
    const apps: MiniApp[] = [
      makeApp({ id: "r1", status: "rejected", updated_at: isoAgo(10 * DAY) }),
      makeApp({ id: "r2", status: "rejected", updated_at: isoAgo(15 * DAY) }),
      makeApp({ id: "r3", status: "rejected", updated_at: isoAgo(20 * DAY) }),
    ];
    expect(shouldFireRejectionCluster(apps, NOW)).toBeNull();
  });

  it("only counts apps with status='rejected' (ignores other statuses)", () => {
    const apps: MiniApp[] = [
      makeApp({ id: "a1", status: "rejected", updated_at: isoAgo(1 * DAY) }),
      makeApp({ id: "a2", status: "applied", updated_at: isoAgo(1 * DAY) }),
      makeApp({ id: "a3", status: "screening", updated_at: isoAgo(2 * DAY) }),
    ];
    expect(shouldFireRejectionCluster(apps, NOW)).toBeNull();
  });
});

describe("shouldFireOfferArrived", () => {
  it("emits one decision for a new offer with no prior ceo notification", () => {
    const apps: MiniApp[] = [
      makeApp({
        id: "off-1",
        status: "offer",
        updated_at: isoAgo(2 * HOUR),
        company_name: "Scale AI",
        role: "ML Intern",
      }),
    ];
    const decisions = shouldFireOfferArrived(apps, [], NOW);
    expect(decisions).toHaveLength(1);
    const d = decisions[0];
    expect(d.type).toBe("offer_arrived");
    expect(d.priority).toBe("critical");
    expect(d.title).toBe("Offer in from Scale AI");
    expect(d.body).toContain("Scale AI");
    expect(d.body).toContain("ML Intern");
    expect(d.sourceEntityId).toBe("off-1");
    expect(d.sourceEntityType).toBe("application");
    expect(d.actions).toEqual([{ label: "See briefing", floor: "1" }]);
  });

  it("suppresses the decision when a ceo notification already exists for that app within 24h", () => {
    const apps: MiniApp[] = [
      makeApp({
        id: "off-1",
        status: "offer",
        updated_at: isoAgo(2 * HOUR),
      }),
    ];
    const existing: MiniNotification[] = [
      {
        source_agent: "ceo",
        source_entity_id: "off-1",
        source_entity_type: "application",
        created_at: isoAgo(1 * HOUR),
      },
    ];
    const decisions = shouldFireOfferArrived(apps, existing, NOW);
    expect(decisions).toEqual([]);
  });

  it("does NOT suppress if the existing notification is older than 24h", () => {
    const apps: MiniApp[] = [
      makeApp({
        id: "off-1",
        status: "offer",
        updated_at: isoAgo(2 * HOUR),
      }),
    ];
    const existing: MiniNotification[] = [
      {
        source_agent: "ceo",
        source_entity_id: "off-1",
        source_entity_type: "application",
        created_at: isoAgo(30 * HOUR),
      },
    ];
    const decisions = shouldFireOfferArrived(apps, existing, NOW);
    expect(decisions).toHaveLength(1);
  });

  it("does NOT suppress when the prior notification was from a different agent", () => {
    const apps: MiniApp[] = [
      makeApp({ id: "off-1", status: "offer", updated_at: isoAgo(2 * HOUR) }),
    ];
    const existing: MiniNotification[] = [
      {
        source_agent: "cro",
        source_entity_id: "off-1",
        source_entity_type: "application",
        created_at: isoAgo(1 * HOUR),
      },
    ];
    expect(shouldFireOfferArrived(apps, existing, NOW)).toHaveLength(1);
  });

  it("emits one decision per new offer when there are multiple", () => {
    const apps: MiniApp[] = [
      makeApp({
        id: "off-a",
        status: "offer",
        updated_at: isoAgo(1 * HOUR),
        company_name: "Scale",
      }),
      makeApp({
        id: "off-b",
        status: "offer",
        updated_at: isoAgo(3 * HOUR),
        company_name: "Anthropic",
      }),
    ];
    const decisions = shouldFireOfferArrived(apps, [], NOW);
    expect(decisions).toHaveLength(2);
    const ids = decisions.map((d) => d.sourceEntityId).sort();
    expect(ids).toEqual(["off-a", "off-b"]);
    const titles = decisions.map((d) => d.title).sort();
    expect(titles).toEqual(["Offer in from Anthropic", "Offer in from Scale"]);
  });

  it("returns [] for an offer whose updated_at is older than 24h", () => {
    const apps: MiniApp[] = [
      makeApp({ id: "off-old", status: "offer", updated_at: isoAgo(30 * HOUR) }),
    ];
    expect(shouldFireOfferArrived(apps, [], NOW)).toEqual([]);
  });

  it("returns [] when no apps are in offer status", () => {
    const apps: MiniApp[] = [
      makeApp({ id: "a1", status: "applied", updated_at: isoAgo(1 * HOUR) }),
      makeApp({ id: "a2", status: "screening", updated_at: isoAgo(1 * HOUR) }),
    ];
    expect(shouldFireOfferArrived(apps, [], NOW)).toEqual([]);
  });
});
