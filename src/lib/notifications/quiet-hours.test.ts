/**
 * computeDeliverAfter table-driven tests.
 *
 * Every case constructs `now` as a UTC instant whose projection in the
 * supplied `userTimezone` equals a known wall-clock — that lets each row
 * read like "when the user sees 03:00 in NYC, given quiet 22→07, return
 * the user-local 07:00 as UTC ISO."
 *
 * The fixtures cover every branch of computeDeliverAfter:
 *   - null quiet hours (bypass)
 *   - wrap-around window, inside on the evening side
 *   - wrap-around window, inside on the morning side
 *   - wrap-around window, outside entirely
 *   - wrap-around window, exactly on start (inside)
 *   - wrap-around window, exactly on end (outside — half-open)
 *   - non-wrap window, inside
 *   - non-wrap window, outside
 *
 * DST-sensitive TZs are covered by America/New_York and America/Los_Angeles;
 * a far-east non-DST zone by Asia/Tokyo; UTC as a null-check baseline.
 */
import { describe, it, expect } from "vitest";
import { computeDeliverAfter, type QuietHours } from "./quiet-hours";

/**
 * Build a UTC instant whose wall-clock in `tz` is `(y, mo, d, h, mi)`.
 * Uses the same successive-approximation loop as the implementation so
 * the tests aren't dependent on hand-calibrated offsets.
 */
function atUserLocal(
  y: number,
  mo: number, // 1-12
  d: number,
  h: number,
  mi: number,
  tz: string,
): Date {
  let guess = new Date(Date.UTC(y, mo - 1, d, h, mi, 0, 0));
  for (let i = 0; i < 2; i += 1) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const bag: Record<string, string> = {};
    for (const p of fmt.formatToParts(guess)) {
      if (p.type !== "literal") bag[p.type] = p.value;
    }
    const py = Number(bag.year);
    const pmo = Number(bag.month);
    const pd = Number(bag.day);
    const ph = Number(bag.hour);
    const pmi = Number(bag.minute);
    const ps = Number(bag.second);
    const diff =
      Date.UTC(y, mo - 1, d, h, mi, 0, 0) -
      Date.UTC(py, pmo - 1, pd, ph, pmi, ps, 0);
    if (diff === 0) return guess;
    guess = new Date(guess.getTime() + diff);
  }
  return guess;
}

const Q_OVERNIGHT: QuietHours = { start: "22:00", end: "07:00" };
const Q_NON_WRAP: QuietHours = { start: "13:00", end: "14:00" };

describe("computeDeliverAfter", () => {
  it("returns now when quietHours is null", () => {
    const now = new Date("2026-04-23T08:00:00.000Z");
    const out = computeDeliverAfter({
      now,
      userTimezone: "UTC",
      quietHours: null,
    });
    expect(out).toBe(now.toISOString());
  });

  it("returns now when quietHours is null, NY tz", () => {
    const now = new Date("2026-04-23T07:30:00.000Z"); // 03:30 EDT
    const out = computeDeliverAfter({
      now,
      userTimezone: "America/New_York",
      quietHours: null,
    });
    expect(out).toBe(now.toISOString());
  });

  describe("wrap-around 22:00 → 07:00", () => {
    it("03:00 NY → returns today 07:00 NY as UTC", () => {
      const now = atUserLocal(2026, 4, 23, 3, 0, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_OVERNIGHT,
      });
      const expected = atUserLocal(2026, 4, 23, 7, 0, "America/New_York");
      expect(out).toBe(expected.toISOString());
    });

    it("12:00 NY → returns now (outside quiet)", () => {
      const now = atUserLocal(2026, 4, 23, 12, 0, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_OVERNIGHT,
      });
      expect(out).toBe(now.toISOString());
    });

    it("21:59 NY → returns now (one minute before start)", () => {
      const now = atUserLocal(2026, 4, 23, 21, 59, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_OVERNIGHT,
      });
      expect(out).toBe(now.toISOString());
    });

    it("22:00 NY → returns tomorrow 07:00 NY as UTC", () => {
      const now = atUserLocal(2026, 4, 23, 22, 0, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_OVERNIGHT,
      });
      const expected = atUserLocal(2026, 4, 24, 7, 0, "America/New_York");
      expect(out).toBe(expected.toISOString());
    });

    it("07:00 NY → returns now (boundary: half-open on end)", () => {
      const now = atUserLocal(2026, 4, 23, 7, 0, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_OVERNIGHT,
      });
      expect(out).toBe(now.toISOString());
    });

    it("06:59 NY → returns today 07:00 NY as UTC (morning side)", () => {
      const now = atUserLocal(2026, 4, 23, 6, 59, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_OVERNIGHT,
      });
      const expected = atUserLocal(2026, 4, 23, 7, 0, "America/New_York");
      expect(out).toBe(expected.toISOString());
    });

    it("03:00 LA → returns today 07:00 LA as UTC", () => {
      const now = atUserLocal(2026, 4, 23, 3, 0, "America/Los_Angeles");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/Los_Angeles",
        quietHours: Q_OVERNIGHT,
      });
      const expected = atUserLocal(2026, 4, 23, 7, 0, "America/Los_Angeles");
      expect(out).toBe(expected.toISOString());
    });

    it("23:30 Tokyo (non-DST) → returns tomorrow 07:00 Tokyo as UTC", () => {
      const now = atUserLocal(2026, 4, 23, 23, 30, "Asia/Tokyo");
      const out = computeDeliverAfter({
        now,
        userTimezone: "Asia/Tokyo",
        quietHours: Q_OVERNIGHT,
      });
      const expected = atUserLocal(2026, 4, 24, 7, 0, "Asia/Tokyo");
      expect(out).toBe(expected.toISOString());
    });

    it("02:00 UTC → returns today 07:00 UTC", () => {
      const now = new Date(Date.UTC(2026, 3, 23, 2, 0, 0, 0));
      const out = computeDeliverAfter({
        now,
        userTimezone: "UTC",
        quietHours: Q_OVERNIGHT,
      });
      const expected = new Date(Date.UTC(2026, 3, 23, 7, 0, 0, 0));
      expect(out).toBe(expected.toISOString());
    });
  });

  describe("non-wrap 13:00 → 14:00", () => {
    it("13:30 → returns today 14:00", () => {
      const now = atUserLocal(2026, 4, 23, 13, 30, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_NON_WRAP,
      });
      const expected = atUserLocal(2026, 4, 23, 14, 0, "America/New_York");
      expect(out).toBe(expected.toISOString());
    });

    it("13:00 → returns today 14:00 (inclusive on start)", () => {
      const now = atUserLocal(2026, 4, 23, 13, 0, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_NON_WRAP,
      });
      const expected = atUserLocal(2026, 4, 23, 14, 0, "America/New_York");
      expect(out).toBe(expected.toISOString());
    });

    it("14:00 → returns now (half-open on end)", () => {
      const now = atUserLocal(2026, 4, 23, 14, 0, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_NON_WRAP,
      });
      expect(out).toBe(now.toISOString());
    });

    it("09:00 → returns now (outside window)", () => {
      const now = atUserLocal(2026, 4, 23, 9, 0, "America/New_York");
      const out = computeDeliverAfter({
        now,
        userTimezone: "America/New_York",
        quietHours: Q_NON_WRAP,
      });
      expect(out).toBe(now.toISOString());
    });
  });

  it("treats degenerate start==end window as no-quiet", () => {
    const now = atUserLocal(2026, 4, 23, 3, 0, "America/New_York");
    const out = computeDeliverAfter({
      now,
      userTimezone: "America/New_York",
      quietHours: { start: "07:00", end: "07:00" },
    });
    expect(out).toBe(now.toISOString());
  });
});
