import { describe, it, expect } from "vitest";
import {
  APPLICATION_STATUSES,
  CLOSED_STATUSES,
  ACTIVE_STATUSES,
  FUNNEL_STATUSES,
  isActiveStatus,
  isClosedStatus,
} from "./application";

describe("application status groupings", () => {
  it("active + closed = full enum", () => {
    const union = new Set<string>([...ACTIVE_STATUSES, ...CLOSED_STATUSES]);
    expect(union.size).toBe(APPLICATION_STATUSES.length);
  });

  it("funnel excludes closed statuses", () => {
    for (const s of FUNNEL_STATUSES) {
      expect(isClosedStatus(s)).toBe(false);
    }
  });

  it("isActiveStatus / isClosedStatus agree on the enum", () => {
    for (const s of APPLICATION_STATUSES) {
      expect(isActiveStatus(s) || isClosedStatus(s)).toBe(true);
      expect(isActiveStatus(s) && isClosedStatus(s)).toBe(false);
    }
  });

  it("rejects unknown statuses", () => {
    expect(isActiveStatus("totally-made-up")).toBe(false);
    expect(isClosedStatus("totally-made-up")).toBe(false);
  });
});
