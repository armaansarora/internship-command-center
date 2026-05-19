import { describe, expect, it } from "vitest";
import {
  assertCreativeRunTransition,
  getNextCreativeRunAction,
  type CreativeRunState,
} from "./index";

describe("creative production run state machine", () => {
  it("blocks promotion and app integration before the exact final approval gate", () => {
    expect(() => assertCreativeRunTransition({
      from: "final-board-ready",
      to: "promoted",
    })).toThrow("approved-for-app");

    expect(() => assertCreativeRunTransition({
      from: "strict-qa",
      to: "integrated",
      approvalPhrase: "approved for app",
    })).toThrow("Illegal creative run transition");
  });

  it("allows the two-gate happy path in order", () => {
    const path: CreativeRunState[] = [
      "briefing",
      "initial-concepts",
      "identity-locked",
      "canary-required",
      "canary-running",
      "canary-passed",
      "production-running",
      "repairing",
      "strict-qa",
      "final-board-ready",
      "approved-for-app",
      "promoted",
      "integrated",
      "browser-verified",
      "closed",
    ];

    path.slice(0, -1).forEach((from, index) => {
      expect(assertCreativeRunTransition({
        from,
        to: path[index + 1]!,
        approvalPhrase: path[index + 1] === "approved-for-app" ? "approved for app" : undefined,
      })).toBe(path[index + 1]);
    });
  });

  it("returns the next legal operator action in plain language", () => {
    expect(getNextCreativeRunAction("canary-required")).toContain("run the one-slot production canary");
    expect(getNextCreativeRunAction("canary-passed")).toContain("Full-production-ready");
    expect(getNextCreativeRunAction("final-board-ready")).toContain("Wait for Armaan");
    expect(getNextCreativeRunAction("promoted")).toContain("integrate promoted assets");
  });
});
