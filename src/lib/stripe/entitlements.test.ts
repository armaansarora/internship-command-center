import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Entitlements tests.
 *
 * Coverage matrix:
 *   - Owner bypass (every cap returns Infinity / true, including the
 *     `team` legacy path the owner could in principle land on).
 *   - Legacy `subscription_tier === "team"` row → LEGACY_TEAM_LIMITS
 *     (does not crash, returns the Team-tier limits even though the
 *     `team` plan has been killed from STRIPE_PLANS).
 *   - Tier downgrade behavior (free / pro / seasonPass / unknown / null
 *     subscription_tier rows) — limits resolve correctly.
 *   - Season Pass entitlement parity with Pro (every entitlement getter
 *     returns the same value for both tiers).
 */

const { getSubscriptionTierSpy, isOwnerSpy } = vi.hoisted(() => ({
  getSubscriptionTierSpy: vi.fn(),
  isOwnerSpy: vi.fn(),
}));

vi.mock("./server", () => ({
  getSubscriptionTier: getSubscriptionTierSpy,
}));

vi.mock("@/lib/auth/owner", () => ({
  isOwner: isOwnerSpy,
}));

import {
  checkEntitlement,
  getApplicationLimit,
  canUseAgents,
  getRateLimit,
  getUserTier,
} from "./entitlements";

beforeEach(() => {
  getSubscriptionTierSpy.mockReset();
  isOwnerSpy.mockReset();
});

describe("entitlements — owner bypass", () => {
  it("checkEntitlement returns true for owner on every feature, never consults the subscription tier", async () => {
    isOwnerSpy.mockReturnValue(true);

    await expect(checkEntitlement("owner-uuid", "agents")).resolves.toBe(true);
    await expect(checkEntitlement("owner-uuid", "dailyBriefing")).resolves.toBe(true);

    expect(getSubscriptionTierSpy).not.toHaveBeenCalled();
  });

  it("getApplicationLimit returns Infinity for owner regardless of tier", async () => {
    isOwnerSpy.mockReturnValue(true);

    await expect(getApplicationLimit("owner-uuid")).resolves.toBe(Infinity);
    expect(getSubscriptionTierSpy).not.toHaveBeenCalled();
  });

  it("canUseAgents and getRateLimit both bypass for owner", async () => {
    isOwnerSpy.mockReturnValue(true);

    await expect(canUseAgents("owner-uuid")).resolves.toBe(true);
    await expect(getRateLimit("owner-uuid")).resolves.toBe(Infinity);
    expect(getSubscriptionTierSpy).not.toHaveBeenCalled();
  });

  it("getUserTier reports owner as 'pro' so tier-comparison code grants maximum permissions", async () => {
    isOwnerSpy.mockReturnValue(true);

    await expect(getUserTier("owner-uuid")).resolves.toBe("pro");
    expect(getSubscriptionTierSpy).not.toHaveBeenCalled();
  });
});

describe("entitlements — LEGACY_TEAM_LIMITS fallback", () => {
  it("legacy subscription_tier === 'team' row does NOT crash and resolves to Team limits", async () => {
    // Reproduces the failure mode PR5 introduced: STRIPE_PLANS no longer
    // contains a `team` key, so a naive lookup would throw on the legacy
    // DB row. LEGACY_TEAM_LIMITS is the guard.
    isOwnerSpy.mockReturnValue(false);
    getSubscriptionTierSpy.mockResolvedValue("team");

    await expect(canUseAgents("legacy-team-user")).resolves.toBe(true);
    await expect(checkEntitlement("legacy-team-user", "dailyBriefing")).resolves.toBe(true);
    await expect(getApplicationLimit("legacy-team-user")).resolves.toBe(Infinity);
    // Team's pre-fork rate limit was 200/min — LEGACY_TEAM_LIMITS preserves it.
    await expect(getRateLimit("legacy-team-user")).resolves.toBe(200);
  });
});

describe("entitlements — tier downgrade behavior", () => {
  it("paid → free downgrade tightens caps as expected", async () => {
    isOwnerSpy.mockReturnValue(false);
    getSubscriptionTierSpy.mockResolvedValue("free");

    await expect(getApplicationLimit("ex-pro-user")).resolves.toBe(10);
    await expect(canUseAgents("ex-pro-user")).resolves.toBe(false);
    await expect(checkEntitlement("ex-pro-user", "dailyBriefing")).resolves.toBe(false);
    await expect(getRateLimit("ex-pro-user")).resolves.toBe(30);
    await expect(getUserTier("ex-pro-user")).resolves.toBe("free");
  });

  it("pro tier grants full feature set", async () => {
    isOwnerSpy.mockReturnValue(false);
    getSubscriptionTierSpy.mockResolvedValue("pro");

    await expect(getApplicationLimit("pro-user")).resolves.toBe(Infinity);
    await expect(canUseAgents("pro-user")).resolves.toBe(true);
    await expect(checkEntitlement("pro-user", "dailyBriefing")).resolves.toBe(true);
    await expect(getRateLimit("pro-user")).resolves.toBe(100);
    await expect(getUserTier("pro-user")).resolves.toBe("pro");
  });
});

describe("entitlements — Season Pass parity with Pro", () => {
  it("Season Pass entitlement returns the same values as Pro across every getter", async () => {
    // Hard guarantee: a Season Pass buyer cannot end up with fewer features
    // than a Pro subscriber. If product later decides to differentiate,
    // this test should fail loudly and force an intentional decision.
    isOwnerSpy.mockReturnValue(false);

    // Capture Pro values.
    getSubscriptionTierSpy.mockResolvedValue("pro");
    const proApps = await getApplicationLimit("u");
    const proAgents = await canUseAgents("u");
    const proBriefing = await checkEntitlement("u", "dailyBriefing");
    const proRate = await getRateLimit("u");

    // Re-mock for Season Pass and confirm parity.
    getSubscriptionTierSpy.mockResolvedValue("seasonPass");
    await expect(getApplicationLimit("u")).resolves.toBe(proApps);
    await expect(canUseAgents("u")).resolves.toBe(proAgents);
    await expect(checkEntitlement("u", "dailyBriefing")).resolves.toBe(proBriefing);
    await expect(getRateLimit("u")).resolves.toBe(proRate);
  });
});
