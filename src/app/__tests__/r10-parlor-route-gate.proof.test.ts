import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * /parlor route-gate invariant.
 *
 * NON-NEGOTIABLE: `/parlor` must redirect to `/c-suite` for any user whose
 * `offers` count is zero. The Negotiation Parlor is an offer-gated annex —
 * there is no deep-link, no manual URL, no quick-action that can get a user
 * into the Parlor before their first offer parses. This is the mirror
 * architectural invariant to the R10.5 door-absence proof: the door is
 * ABSENT from the C-Suite, and the route itself REDIRECTS AWAY, so there
 * are two independent guards against an empty annex.
 *
 * Strategy: mock `next/navigation`'s `redirect` to throw a sentinel error
 * the test can match, then mock the auth + offers helpers the page uses.
 * If `Page()` resolves (doesn't throw) when offerCount===0, the guard has
 * regressed — fix the gate, don't loosen the test.
 */

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({}) as unknown as never),
  requireUser: vi.fn(async () => ({ id: "u1", email: "test@test.com" })),
  getUser: vi.fn(async () => ({ id: "u1", email: "test@test.com" })),
}));

vi.mock("@/lib/db/queries/offers-rest", () => ({
  countOffersForUser: vi.fn(async () => 0),
  getOffersForUser: vi.fn(async () => []),
}));

describe("GET /parlor route gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to /c-suite when offerCount === 0", async () => {
    const { default: Page } = await import("@/app/(authenticated)/parlor/page");
    await expect(Page()).rejects.toThrow(/REDIRECT:\/c-suite/);
  });
});
