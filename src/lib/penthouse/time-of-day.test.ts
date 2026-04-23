import { describe, it, expect } from "vitest";
import { timeOfDayFor, TIME_OF_DAY_WINDOWS } from "./time-of-day";

/** Build a Date for `hour:minute` UTC — then project into the given tz in the caller. */
function atUtc(hour: number, minute = 0, day = 15, month = 3, year = 2026): Date {
  return new Date(Date.UTC(year, month, day, hour, minute));
}

describe("timeOfDayFor — boundaries", () => {
  // Using UTC timezone for simplicity; boundaries tested directly.
  it.each([
    [4, 59, "late-night"],
    [5, 0, "morning"],
    [11, 59, "morning"],
    [12, 0, "afternoon"],
    [16, 59, "afternoon"],
    [17, 0, "evening"],
    [20, 59, "evening"],
    [21, 0, "late-night"],
    [23, 59, "late-night"],
    [0, 0, "late-night"],
  ])(
    "UTC %i:%i → %s",
    (hour, minute, expected) => {
      const now = atUtc(hour, minute);
      expect(timeOfDayFor(now, "UTC")).toBe(expected);
    }
  );
});

describe("timeOfDayFor — cross-timezone", () => {
  // 12:00 UTC is 8am ET, 9pm JST, 1pm CET.
  const noon = atUtc(12, 0);

  it("reads 12:00 UTC as 'morning' in America/New_York (08:00 local)", () => {
    expect(timeOfDayFor(noon, "America/New_York")).toBe("morning");
  });

  it("reads 12:00 UTC as 'late-night' in Asia/Tokyo (21:00 local)", () => {
    expect(timeOfDayFor(noon, "Asia/Tokyo")).toBe("late-night");
  });

  it("reads 12:00 UTC as 'afternoon' in Europe/Berlin (13:00 or 14:00 local)", () => {
    // Depends on DST, but both 13 and 14 are afternoon — test stays stable.
    expect(timeOfDayFor(noon, "Europe/Berlin")).toBe("afternoon");
  });
});

describe("timeOfDayFor — fallback", () => {
  it("falls back to runtime local hour when tz is undefined", () => {
    // Can only assert the result is a valid window.
    const result = timeOfDayFor(new Date());
    expect(["morning", "afternoon", "evening", "late-night"]).toContain(result);
  });

  it("falls back gracefully on invalid tz string", () => {
    const result = timeOfDayFor(atUtc(12, 0), "Not/A_Zone");
    expect(["morning", "afternoon", "evening", "late-night"]).toContain(result);
  });
});

describe("TIME_OF_DAY_WINDOWS — exported constants", () => {
  it("morning starts at 5", () => {
    expect(TIME_OF_DAY_WINDOWS.morning.startHour).toBe(5);
  });
  it("late-night wraps past midnight", () => {
    expect(TIME_OF_DAY_WINDOWS["late-night"].startHour).toBe(21);
    expect(TIME_OF_DAY_WINDOWS["late-night"].endHour).toBe(5);
  });
});
