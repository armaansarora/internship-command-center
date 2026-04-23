import { describe, it, expect } from "vitest";
import { pickIdleDetail, type IdleDetailKind } from "./useIdleDetail";

describe("pickIdleDetail", () => {
  it("always returns 'long-pause' on a rejection day", () => {
    const d = pickIdleDetail({
      userId: "u1",
      dateIso: "2026-04-22",
      recentRejection: true,
    });
    expect(d).toBe("long-pause");
  });

  it("is deterministic for the same user + date", () => {
    const a = pickIdleDetail({ userId: "u1", dateIso: "2026-04-22" });
    const b = pickIdleDetail({ userId: "u1", dateIso: "2026-04-22" });
    expect(a).toBe(b);
  });

  it("varies across consecutive days (eventually)", () => {
    const picks = new Set<IdleDetailKind>();
    for (let i = 0; i < 20; i += 1) {
      const dateIso = new Date(Date.UTC(2026, 3, 22 + i)).toISOString().slice(0, 10);
      picks.add(pickIdleDetail({ userId: "u1", dateIso }));
    }
    // Across 20 days the 3-item pool should cover at least 2 distinct values.
    expect(picks.size).toBeGreaterThanOrEqual(2);
  });

  it("never returns 'long-pause' without the rejection flag", () => {
    for (let i = 0; i < 50; i += 1) {
      const d = pickIdleDetail({
        userId: `u${i}`,
        dateIso: `2026-04-${String((i % 28) + 1).padStart(2, "0")}`,
      });
      expect(d).not.toBe("long-pause");
    }
  });

  it("picks from {photo-frame | pen | lamp} for non-rejection days", () => {
    for (let i = 0; i < 20; i += 1) {
      const d = pickIdleDetail({ userId: `seed${i}`, dateIso: "2026-04-22" });
      expect(["photo-frame", "pen", "lamp"]).toContain(d);
    }
  });

  it("different users on the same day can get different details", () => {
    const picks = new Set<IdleDetailKind>();
    for (let i = 0; i < 20; i += 1) {
      picks.add(pickIdleDetail({ userId: `u${i}`, dateIso: "2026-04-22" }));
    }
    expect(picks.size).toBeGreaterThanOrEqual(2);
  });
});
