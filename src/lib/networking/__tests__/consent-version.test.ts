import { describe, it, expect } from "vitest";
import { CURRENT_CONSENT_VERSION } from "../consent-version";

describe("CURRENT_CONSENT_VERSION", () => {
  it("is set to 2 for R11 matching copy bump", () => {
    expect(CURRENT_CONSENT_VERSION).toBe(2);
  });
});
