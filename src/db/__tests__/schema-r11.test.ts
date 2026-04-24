import { describe, it, expect } from "vitest";
import { getTableColumns } from "drizzle-orm";
import {
  matchCandidateIndex,
  matchEvents,
  matchRateLimits,
  userProfiles,
} from "../schema";

describe("R11 schema", () => {
  it("matchCandidateIndex has the expected columns", () => {
    const cols = Object.keys(getTableColumns(matchCandidateIndex));
    expect(cols).toEqual(
      expect.arrayContaining([
        "id",
        "userId",
        "counterpartyAnonKey",
        "companyContext",
        "edgeStrength",
        "insertedAt",
        "invalidatesAt",
      ]),
    );
  });

  it("matchEvents has the expected columns", () => {
    const cols = Object.keys(getTableColumns(matchEvents));
    expect(cols).toEqual(
      expect.arrayContaining([
        "id",
        "userId",
        "counterpartyAnonKey",
        "companyContext",
        "edgeStrength",
        "firedAt",
        "matchReason",
      ]),
    );
  });

  it("matchRateLimits has the expected columns", () => {
    const cols = Object.keys(getTableColumns(matchRateLimits));
    expect(cols).toEqual(
      expect.arrayContaining(["userId", "hourBucket", "count"]),
    );
  });

  it("userProfiles gains matchIndexLastRescanAt", () => {
    const cols = Object.keys(getTableColumns(userProfiles));
    expect(cols).toContain("matchIndexLastRescanAt");
  });
});
