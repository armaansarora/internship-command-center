import { describe, it, expect } from "vitest";
import { computeEligibleBeats, beatCopy } from "./deadline-beats";

const H = 60 * 60 * 1000;

describe("computeEligibleBeats", () => {
  const now = 1_700_000_000_000;

  it("returns empty when no apps", () => {
    expect(computeEligibleBeats([], now)).toEqual([]);
  });

  it("fires t_24h when deadline is 24h out + key missing", () => {
    const fires = computeEligibleBeats(
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          company: "Acme",
          deadlineAtMs: now + 24 * H,
          alertsSent: {},
        },
      ],
      now,
    );
    expect(fires).toHaveLength(1);
    expect(fires[0]!.kind).toBe("t_24h");
  });

  it("fires t_4h when deadline is 3h out + t_4h missing (t_24h presence tolerated)", () => {
    const fires = computeEligibleBeats(
      [
        {
          id: "22222222-2222-4222-8222-222222222222",
          company: "Foo",
          deadlineAtMs: now + 3 * H,
          alertsSent: { t_24h: "already_fired_earlier" },
        },
      ],
      now,
    );
    expect(fires).toHaveLength(1);
    expect(fires[0]!.kind).toBe("t_4h");
  });

  it("fires t_0 when deadline is 30m past + t_0 missing", () => {
    const fires = computeEligibleBeats(
      [
        {
          id: "33333333-3333-4333-8333-333333333333",
          company: "Bar",
          deadlineAtMs: now - 0.5 * H,
          alertsSent: { t_24h: "x", t_4h: "y" },
        },
      ],
      now,
    );
    expect(fires).toHaveLength(1);
    expect(fires[0]!.kind).toBe("t_0");
  });

  it("does not fire t_0 for long-passed deadlines", () => {
    const fires = computeEligibleBeats(
      [
        {
          id: "44444444-4444-4444-8444-444444444444",
          company: "Stale",
          deadlineAtMs: now - 48 * H,
          alertsSent: {},
        },
      ],
      now,
    );
    expect(fires).toEqual([]);
  });

  it("does not fire a beat whose key is already sent", () => {
    const fires = computeEligibleBeats(
      [
        {
          id: "55555555-5555-4555-8555-555555555555",
          company: "Dup",
          deadlineAtMs: now + 24 * H,
          alertsSent: { t_24h: "already" },
        },
      ],
      now,
    );
    expect(fires).toEqual([]);
  });

  it("fires at most one beat per app per run", () => {
    // App is at t=0 (deadline now). Only t_0 fires — t_24h and t_4h would
    // also be eligible by delta but the `continue` in the detector means
    // a single fire per app per run.
    const fires = computeEligibleBeats(
      [
        {
          id: "66666666-6666-4666-8666-666666666666",
          company: "Now",
          deadlineAtMs: now,
          alertsSent: {},
        },
      ],
      now,
    );
    expect(fires).toHaveLength(1);
  });

  it("does not fire if deadline is > 25h out", () => {
    const fires = computeEligibleBeats(
      [
        {
          id: "77777777-7777-4777-8777-777777777777",
          company: "Future",
          deadlineAtMs: now + 72 * H,
          alertsSent: {},
        },
      ],
      now,
    );
    expect(fires).toEqual([]);
  });
});

describe("beatCopy", () => {
  it("produces tier-aware title + body", () => {
    expect(beatCopy("t_24h", "Acme").title).toMatch(/24h/);
    expect(beatCopy("t_4h", "Acme").title).toMatch(/4h/);
    expect(beatCopy("t_0", "Acme").title).toMatch(/now/);
  });
});
