import { describe, it, expect } from "vitest";
import { applicationsToPlanets } from "./applications-to-planets";
import type { ApplicationInput, Status, Tier } from "./types";

const NOW = new Date("2026-04-23T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number, base: Date = NOW): string {
  return new Date(base.getTime() - days * DAY_MS).toISOString();
}

function makeApp(overrides: Partial<ApplicationInput> = {}): ApplicationInput {
  return {
    id: "app-1",
    companyName: "Acme Corp",
    role: "SWE Intern",
    tier: 2,
    status: "applied",
    matchScore: 0.85,
    appliedAt: isoDaysAgo(10),
    lastActivityAt: isoDaysAgo(2),
    hasOfferEverFired: false,
    ...overrides,
  };
}

describe("applicationsToPlanets — tier→radius ordering (stage mode)", () => {
  it("inner tier renders at smaller radius than outer tier", () => {
    const apps: ApplicationInput[] = [
      makeApp({ id: "t1", tier: 1 }),
      makeApp({ id: "t2", tier: 2 }),
      makeApp({ id: "t3", tier: 3 }),
      makeApp({ id: "t4", tier: 4 }),
    ];
    const planets = applicationsToPlanets(apps, "stage", NOW);
    const byId = Object.fromEntries(planets.map((p) => [p.id, p]));
    expect(byId.t1!.radius).toBeLessThan(byId.t2!.radius);
    expect(byId.t2!.radius).toBeLessThan(byId.t3!.radius);
    expect(byId.t3!.radius).toBeLessThan(byId.t4!.radius);
    expect(byId.t1!.radius).toBeCloseTo(0.2, 5);
    expect(byId.t2!.radius).toBeCloseTo(0.45, 5);
    expect(byId.t3!.radius).toBeCloseTo(0.7, 5);
    expect(byId.t4!.radius).toBeCloseTo(0.95, 5);
  });

  it("tier mode uses the same radius schedule as stage mode", () => {
    const apps: ApplicationInput[] = [
      makeApp({ id: "t1", tier: 1 }),
      makeApp({ id: "t4", tier: 4 }),
    ];
    const planets = applicationsToPlanets(apps, "tier", NOW);
    const byId = Object.fromEntries(planets.map((p) => [p.id, p]));
    expect(byId.t1!.radius).toBeCloseTo(0.2, 5);
    expect(byId.t4!.radius).toBeCloseTo(0.95, 5);
  });
});

describe("applicationsToPlanets — hash-stable angle", () => {
  it("same id produces the same angleDeg across calls", () => {
    const a = applicationsToPlanets([makeApp({ id: "stable-id" })], "stage", NOW);
    const b = applicationsToPlanets([makeApp({ id: "stable-id" })], "stage", NOW);
    expect(a[0]!.angleDeg).toBe(b[0]!.angleDeg);
  });

  it("angleDeg is in [0, 360)", () => {
    const ids = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];
    const planets = applicationsToPlanets(
      ids.map((id) => makeApp({ id })),
      "stage",
      NOW,
    );
    for (const p of planets) {
      expect(p.angleDeg).toBeGreaterThanOrEqual(0);
      expect(p.angleDeg).toBeLessThan(360);
    }
  });

  it("different ids produce different angles (no collisions in a small set)", () => {
    const ids = ["one", "two", "three", "four", "five"];
    const planets = applicationsToPlanets(
      ids.map((id) => makeApp({ id })),
      "stage",
      NOW,
    );
    const angles = planets.map((p) => p.angleDeg);
    expect(new Set(angles).size).toBe(angles.length);
  });

  it("angle is independent of mode (driven only by id)", () => {
    const stage = applicationsToPlanets([makeApp({ id: "x" })], "stage", NOW);
    const tier = applicationsToPlanets([makeApp({ id: "x" })], "tier", NOW);
    const velocity = applicationsToPlanets([makeApp({ id: "x" })], "velocity", NOW);
    expect(stage[0]!.angleDeg).toBe(tier[0]!.angleDeg);
    expect(stage[0]!.angleDeg).toBe(velocity[0]!.angleDeg);
  });
});

describe("applicationsToPlanets — supernova-once invariant", () => {
  it("offer + hasOfferEverFired=false → isSupernova true", () => {
    const planets = applicationsToPlanets(
      [makeApp({ status: "offer", hasOfferEverFired: false })],
      "stage",
      NOW,
    );
    expect(planets[0]!.isSupernova).toBe(true);
  });

  it("offer + hasOfferEverFired=true → isSupernova false (suppressed)", () => {
    const planets = applicationsToPlanets(
      [makeApp({ status: "offer", hasOfferEverFired: true })],
      "stage",
      NOW,
    );
    expect(planets[0]!.isSupernova).toBe(false);
  });

  it("non-offer status → isSupernova false regardless of flag", () => {
    const statuses: Status[] = [
      "discovered",
      "applied",
      "screening",
      "interview_scheduled",
      "interviewing",
      "under_review",
      "accepted",
      "rejected",
      "withdrawn",
    ];
    for (const status of statuses) {
      const planets = applicationsToPlanets(
        [makeApp({ status, hasOfferEverFired: false })],
        "stage",
        NOW,
      );
      expect(planets[0]!.isSupernova).toBe(false);
    }
  });
});

describe("applicationsToPlanets — fading rule", () => {
  it("rejected → isFading true", () => {
    const planets = applicationsToPlanets([makeApp({ status: "rejected" })], "stage", NOW);
    expect(planets[0]!.isFading).toBe(true);
  });

  it("withdrawn → isFading true", () => {
    const planets = applicationsToPlanets([makeApp({ status: "withdrawn" })], "stage", NOW);
    expect(planets[0]!.isFading).toBe(true);
  });

  it("active statuses → isFading false", () => {
    const statuses: Status[] = [
      "discovered",
      "applied",
      "screening",
      "interview_scheduled",
      "interviewing",
      "under_review",
      "offer",
      "accepted",
    ];
    for (const status of statuses) {
      const planets = applicationsToPlanets([makeApp({ status })], "stage", NOW);
      expect(planets[0]!.isFading).toBe(false);
    }
  });
});

describe("applicationsToPlanets — satellite rule", () => {
  it("interview_scheduled → hasSatellite true", () => {
    const planets = applicationsToPlanets(
      [makeApp({ status: "interview_scheduled" })],
      "stage",
      NOW,
    );
    expect(planets[0]!.hasSatellite).toBe(true);
  });

  it("interviewing → hasSatellite true", () => {
    const planets = applicationsToPlanets([makeApp({ status: "interviewing" })], "stage", NOW);
    expect(planets[0]!.hasSatellite).toBe(true);
  });

  it("non-interview statuses → hasSatellite false", () => {
    const statuses: Status[] = [
      "discovered",
      "applied",
      "screening",
      "under_review",
      "offer",
      "accepted",
      "rejected",
      "withdrawn",
    ];
    for (const status of statuses) {
      const planets = applicationsToPlanets([makeApp({ status })], "stage", NOW);
      expect(planets[0]!.hasSatellite).toBe(false);
    }
  });
});

describe("applicationsToPlanets — velocity mode", () => {
  it("recent application (≤7d) → radius clamped to floor (0.15)", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "fresh", appliedAt: isoDaysAgo(3) })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.radius).toBeCloseTo(0.15, 5);
  });

  it("mid-window application (e.g. 45d) → unclamped daysSince/90", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "mid", appliedAt: isoDaysAgo(45) })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.radius).toBeCloseTo(45 / 90, 5);
  });

  it("old application (>90d) → clamped to 1.0", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "old", appliedAt: isoDaysAgo(180) })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.radius).toBeCloseTo(1.0, 5);
  });

  it("recent < old in velocity mode", () => {
    const planets = applicationsToPlanets(
      [
        makeApp({ id: "recent", appliedAt: isoDaysAgo(2) }),
        makeApp({ id: "old", appliedAt: isoDaysAgo(60) }),
      ],
      "velocity",
      NOW,
    );
    const recent = planets.find((p) => p.id === "recent")!;
    const old = planets.find((p) => p.id === "old")!;
    expect(recent.radius).toBeLessThan(old.radius);
  });

  it("null appliedAt → treated as now (radius clamped to floor 0.15)", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "no-date", appliedAt: null })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.radius).toBeCloseTo(0.15, 5);
  });
});

describe("applicationsToPlanets — tier clamping", () => {
  const cases: Array<{ tier: number | null; label: string }> = [
    { tier: null, label: "null" },
    { tier: 0, label: "0" },
    { tier: -1, label: "-1" },
    { tier: 5, label: "5" },
    { tier: 99, label: "99" },
  ];

  for (const { tier, label } of cases) {
    it(`tier ${label} → coerced to 4 (outermost)`, () => {
      const planets = applicationsToPlanets(
        [makeApp({ id: `t-${label}`, tier })],
        "stage",
        NOW,
      );
      expect(planets[0]!.tier).toBe(4 satisfies Tier);
      expect(planets[0]!.radius).toBeCloseTo(0.95, 5);
    });
  }

  it("valid tiers (1-4) pass through unchanged", () => {
    for (const tier of [1, 2, 3, 4] as const) {
      const planets = applicationsToPlanets([makeApp({ id: `t${tier}`, tier })], "stage", NOW);
      expect(planets[0]!.tier).toBe(tier);
    }
  });
});

describe("applicationsToPlanets — velocity bucket boundaries (color tokens)", () => {
  it("≤7 days → recent", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "v", appliedAt: isoDaysAgo(7) })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.colorToken).toBe("--orrery-velocity-recent");
  });

  it("8 days → active", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "v", appliedAt: isoDaysAgo(8) })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.colorToken).toBe("--orrery-velocity-active");
  });

  it("30 days → still active (boundary)", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "v", appliedAt: isoDaysAgo(30) })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.colorToken).toBe("--orrery-velocity-active");
  });

  it("31 days → aging", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "v", appliedAt: isoDaysAgo(31) })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.colorToken).toBe("--orrery-velocity-aging");
  });

  it("60 days → still aging (boundary)", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "v", appliedAt: isoDaysAgo(60) })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.colorToken).toBe("--orrery-velocity-aging");
  });

  it(">60 days → cold", () => {
    const planets = applicationsToPlanets(
      [makeApp({ id: "v", appliedAt: isoDaysAgo(75) })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.colorToken).toBe("--orrery-velocity-cold");
  });

  it("null appliedAt → recent (treated as now)", () => {
    const planets = applicationsToPlanets(
      [makeApp({ appliedAt: null })],
      "velocity",
      NOW,
    );
    expect(planets[0]!.colorToken).toBe("--orrery-velocity-recent");
  });
});

describe("applicationsToPlanets — color tokens in stage and tier modes", () => {
  it("stage mode → colorToken is --orrery-status-${status}", () => {
    const planets = applicationsToPlanets(
      [makeApp({ status: "interviewing" })],
      "stage",
      NOW,
    );
    expect(planets[0]!.colorToken).toBe("--orrery-status-interviewing");
  });

  it("tier mode → colorToken is --orrery-tier-${tier}", () => {
    const planets = applicationsToPlanets([makeApp({ tier: 2 })], "tier", NOW);
    expect(planets[0]!.colorToken).toBe("--orrery-tier-2");
  });

  it("tier mode with clamped tier → colorToken reflects clamped value (4)", () => {
    const planets = applicationsToPlanets([makeApp({ tier: null })], "tier", NOW);
    expect(planets[0]!.colorToken).toBe("--orrery-tier-4");
  });
});

describe("applicationsToPlanets — sizePx", () => {
  it("tier 1 base size = 26px (14 + 4*3)", () => {
    const planets = applicationsToPlanets(
      [makeApp({ tier: 1, status: "applied" })],
      "stage",
      NOW,
    );
    expect(planets[0]!.sizePx).toBe(26);
  });

  it("tier 4 base size = 14px", () => {
    const planets = applicationsToPlanets(
      [makeApp({ tier: 4, status: "applied" })],
      "stage",
      NOW,
    );
    expect(planets[0]!.sizePx).toBe(14);
  });

  it("offer adds +6 to base, capped at 32", () => {
    const planets = applicationsToPlanets(
      [makeApp({ tier: 1, status: "offer", hasOfferEverFired: true })],
      "stage",
      NOW,
    );
    expect(planets[0]!.sizePx).toBe(32);
  });

  it("accepted adds +6, mid-tier example", () => {
    const planets = applicationsToPlanets(
      [makeApp({ tier: 3, status: "accepted" })],
      "stage",
      NOW,
    );
    expect(planets[0]!.sizePx).toBe(24);
  });
});

describe("applicationsToPlanets — passthrough fields", () => {
  it("preserves matchScore, appliedAt, lastActivityAt, label, role", () => {
    const applied = isoDaysAgo(5);
    const last = isoDaysAgo(1);
    const planets = applicationsToPlanets(
      [
        makeApp({
          id: "p1",
          companyName: "Northwind",
          role: "Backend Intern",
          matchScore: 0.42,
          appliedAt: applied,
          lastActivityAt: last,
        }),
      ],
      "stage",
      NOW,
    );
    expect(planets[0]!.id).toBe("p1");
    expect(planets[0]!.label).toBe("Northwind");
    expect(planets[0]!.role).toBe("Backend Intern");
    expect(planets[0]!.matchScore).toBe(0.42);
    expect(planets[0]!.appliedAt).toBe(applied);
    expect(planets[0]!.lastActivityAt).toBe(last);
  });

  it("preserves null matchScore, appliedAt, lastActivityAt", () => {
    const planets = applicationsToPlanets(
      [makeApp({ matchScore: null, appliedAt: null, lastActivityAt: null })],
      "stage",
      NOW,
    );
    expect(planets[0]!.matchScore).toBeNull();
    expect(planets[0]!.appliedAt).toBeNull();
    expect(planets[0]!.lastActivityAt).toBeNull();
  });
});
