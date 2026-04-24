import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("computeMatchCandidates", () => {
  const now = new Date("2026-04-24T12:00:00Z");
  const recent = new Date("2026-04-23T00:00:00Z").toISOString(); // <7d
  const cooling = new Date("2026-04-15T00:00:00Z").toISOString(); // <14d but >=7d
  const old = new Date("2026-03-01T00:00:00Z").toISOString(); // >30d

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("MATCH_ANON_SECRET", "test-secret-32-bytes-minimum-length-ok-padding");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns empty when no target companies", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const out = computeMatchCandidates({
      userTargets: [],
      counterpartyContacts: [
        { id: "c-1", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B" },
      ],
      now,
    });
    expect(out).toEqual([]);
  });

  it("returns empty when no counterparty contacts", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const out = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [],
      now,
    });
    expect(out).toEqual([]);
  });

  it("scores warm + company overlap + recent application = 1.0", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const out = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [
        { id: "c-1", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B" },
      ],
      now,
    });
    expect(out).toHaveLength(1);
    expect(out[0].companyContext).toBe("Acme");
    expect(parseFloat(out[0].edgeStrength)).toBeCloseTo(1.0, 3);
  });

  it("cold contacts score lower than warm contacts", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const out = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [
        { id: "c-cold", companyName: "Acme", lastContactAt: old, ownerUserId: "u-B" },
        { id: "c-warm", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B" },
      ],
      now,
    });
    expect(out).toHaveLength(2);
    // First entry must be higher-scoring (warm).
    expect(parseFloat(out[0].edgeStrength)).toBeGreaterThan(
      parseFloat(out[1].edgeStrength),
    );
  });

  it("excludes contacts at non-targeted companies", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const out = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [
        { id: "c-1", companyName: "Contoso", lastContactAt: recent, ownerUserId: "u-B" },
      ],
      now,
    });
    expect(out).toEqual([]);
  });

  it("matches company names case-insensitively", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const out = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [
        { id: "c-1", companyName: "acme", lastContactAt: recent, ownerUserId: "u-B" },
      ],
      now,
    });
    expect(out).toHaveLength(1);
    // Preserves the counterparty's case in output (not the target's).
    expect(out[0].companyContext).toBe("acme");
  });

  it("excludes contacts with null companyName", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const out = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [
        { id: "c-1", companyName: null, lastContactAt: recent, ownerUserId: "u-B" },
      ],
      now,
    });
    expect(out).toEqual([]);
  });

  it("treats null lastContactAt as cold (0.2 warmth)", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const out = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [
        { id: "c-1", companyName: "Acme", lastContactAt: null, ownerUserId: "u-B" },
      ],
      now,
    });
    expect(out).toHaveLength(1);
    expect(parseFloat(out[0].edgeStrength)).toBeCloseTo(0.2, 3);
  });

  it("is deterministic — same input produces same output twice", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const input = {
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [
        { id: "c-1", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B" },
        { id: "c-2", companyName: "Acme", lastContactAt: cooling, ownerUserId: "u-C" },
      ],
      now,
    };
    const a = computeMatchCandidates(input);
    const b = computeMatchCandidates(input);
    expect(a).toEqual(b);
  });

  it("uses anon keys (never raw contact ids) in output", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const out = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [
        {
          id: "raw-contact-id-not-leaked",
          companyName: "Acme",
          lastContactAt: recent,
          ownerUserId: "u-B",
        },
      ],
      now,
    });
    expect(out[0].counterpartyAnonKey).not.toBe("raw-contact-id-not-leaked");
    expect(out[0].counterpartyAnonKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("applies recencyFactor — 30d-old application scales score", async () => {
    const { computeMatchCandidates } = await import("../match-algorithm");
    const outRecent = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: recent }],
      counterpartyContacts: [
        { id: "c-1", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B" },
      ],
      now,
    });
    const outOld = computeMatchCandidates({
      userTargets: [{ companyName: "Acme", insertedAt: old }], // old target
      counterpartyContacts: [
        { id: "c-1", companyName: "Acme", lastContactAt: recent, ownerUserId: "u-B" },
      ],
      now,
    });
    expect(parseFloat(outRecent[0].edgeStrength)).toBeGreaterThan(
      parseFloat(outOld[0].edgeStrength),
    );
    // Old recency = 0.4, recent = 1.0 — so outOld = 0.4, outRecent = 1.0.
    expect(parseFloat(outOld[0].edgeStrength)).toBeCloseTo(0.4, 3);
  });
});
