import { describe, it, expect } from "vitest";
import { isConsentedShape } from "./consent-guard";

describe("R8 — isConsentedShape", () => {
  it("null consent → not consented", () => {
    expect(
      isConsentedShape({
        networking_consent_at: null,
        networking_revoked_at: null,
      }),
    ).toBe(false);
  });

  it("consent set, no revoke → consented", () => {
    expect(
      isConsentedShape({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: null,
      }),
    ).toBe(true);
  });

  it("revoked AFTER consent → not consented (P4)", () => {
    expect(
      isConsentedShape({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: "2026-04-05T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("re-consented after revoke → consented", () => {
    expect(
      isConsentedShape({
        networking_consent_at: "2026-04-10T00:00:00Z",
        networking_revoked_at: "2026-04-05T00:00:00Z",
      }),
    ).toBe(true);
  });

  it("exactly simultaneous → not consented (conservative)", () => {
    // Defensive: identical timestamps treat as not-consented. Real usage
    // has second- or millisecond-level precision so this is a no-op, but
    // it means ambiguity defaults to "no".
    expect(
      isConsentedShape({
        networking_consent_at: "2026-04-01T00:00:00Z",
        networking_revoked_at: "2026-04-01T00:00:00Z",
      }),
    ).toBe(false);
  });
});
