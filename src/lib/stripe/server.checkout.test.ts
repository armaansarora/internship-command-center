import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Checkout-creator tests.
 *
 * Asserts the Stripe API contract:
 *   1. Both creators forward an `idempotencyKey` to Stripe (the
 *      `Idempotency-Key` HTTP header). Stripe deduplicates create calls
 *      within 24h so a double-click on /pricing never lands two sessions.
 *   2. The key is deterministic in (userId, priceId, mode) — replays for
 *      the same user/SKU return the same key (and therefore the same URL).
 *   3. The key differs across modes for the same user — Pro and Season
 *      Pass do not collide.
 *   4. Different users with the same priceId still get distinct keys.
 *   5. Stripe SDK error propagation: card-declined / 3DS-challenge /
 *      currency-mismatch surface as a thrown Error (caller catches at
 *      the route layer and returns generic copy).
 */

const {
  sessionFromSpy,
  sessionSelectSpy,
  sessionEqSpy,
  sessionSingleSpy,
  checkoutSessionsCreateSpy,
} = vi.hoisted(() => ({
  sessionFromSpy: vi.fn(),
  sessionSelectSpy: vi.fn(),
  sessionEqSpy: vi.fn(),
  sessionSingleSpy: vi.fn(),
  checkoutSessionsCreateSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: sessionFromSpy,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: vi.fn(),
  }),
}));

vi.mock("@/lib/env", () => ({
  requireEnv: () => ({ STRIPE_SECRET_KEY: "sk_test_mock" }),
  env: () => ({
    NEXT_PUBLIC_APP_URL: "https://www.interntower.com",
    STRIPE_SEASON_PASS_PRICE_ID: "price_season_pass_live",
  }),
}));

vi.mock("stripe", () => {
  class StripeMock {
    customers = {
      create: vi.fn(),
    };
    checkout = {
      sessions: {
        create: checkoutSessionsCreateSpy,
      },
    };
  }

  return { default: StripeMock };
});

const { createCheckoutSession, createSeasonPassCheckoutSession } = await import(
  "./server"
);

function mockProfileWithCustomerId(customerId: string): void {
  sessionFromSpy.mockReturnValue({ select: sessionSelectSpy });
  sessionSelectSpy.mockReturnValue({ eq: sessionEqSpy });
  sessionEqSpy.mockReturnValue({ single: sessionSingleSpy });
  sessionSingleSpy.mockResolvedValue({
    data: { stripe_customer_id: customerId },
    error: null,
  });
}

beforeEach(() => {
  sessionFromSpy.mockReset();
  sessionSelectSpy.mockReset();
  sessionEqSpy.mockReset();
  sessionSingleSpy.mockReset();
  checkoutSessionsCreateSpy.mockReset();
});

describe("createCheckoutSession — idempotency key", () => {
  it("forwards an idempotencyKey to checkout.sessions.create", async () => {
    mockProfileWithCustomerId("cus_pro");
    checkoutSessionsCreateSpy.mockResolvedValue({
      url: "https://checkout.stripe.com/c/session_1",
    });

    await createCheckoutSession(
      "user-1",
      "user@example.com",
      "price_1TQb9t0uey7yEjQosCsbrK3t",
    );

    expect(checkoutSessionsCreateSpy).toHaveBeenCalledTimes(1);
    const [params, options] = checkoutSessionsCreateSpy.mock.calls[0];
    expect(params.mode).toBe("subscription");
    expect(options).toBeDefined();
    expect(typeof options.idempotencyKey).toBe("string");
    expect(options.idempotencyKey).toMatch(/^checkout:subscription:[a-f0-9]{64}$/);
  });

  it("yields the same idempotencyKey across replays for the same (user, price, mode)", async () => {
    mockProfileWithCustomerId("cus_pro");
    checkoutSessionsCreateSpy.mockResolvedValue({
      url: "https://checkout.stripe.com/c/session_1",
    });

    await createCheckoutSession(
      "user-1",
      "user@example.com",
      "price_1TQb9t0uey7yEjQosCsbrK3t",
    );
    await createCheckoutSession(
      "user-1",
      "user@example.com",
      "price_1TQb9t0uey7yEjQosCsbrK3t",
    );

    expect(checkoutSessionsCreateSpy).toHaveBeenCalledTimes(2);
    const keyA = checkoutSessionsCreateSpy.mock.calls[0][1].idempotencyKey;
    const keyB = checkoutSessionsCreateSpy.mock.calls[1][1].idempotencyKey;
    expect(keyA).toBe(keyB);
  });

  it("yields distinct idempotencyKeys for different users on the same priceId", async () => {
    mockProfileWithCustomerId("cus_pro");
    checkoutSessionsCreateSpy.mockResolvedValue({
      url: "https://checkout.stripe.com/c/session_1",
    });

    await createCheckoutSession("user-1", "a@example.com", "price_1TQb9t0uey7yEjQosCsbrK3t");
    await createCheckoutSession("user-2", "b@example.com", "price_1TQb9t0uey7yEjQosCsbrK3t");

    const keyA = checkoutSessionsCreateSpy.mock.calls[0][1].idempotencyKey;
    const keyB = checkoutSessionsCreateSpy.mock.calls[1][1].idempotencyKey;
    expect(keyA).not.toBe(keyB);
  });
});

describe("createSeasonPassCheckoutSession — idempotency key", () => {
  it("forwards an idempotencyKey to the one-time session and tags it as mode=payment", async () => {
    mockProfileWithCustomerId("cus_season");
    checkoutSessionsCreateSpy.mockResolvedValue({
      url: "https://checkout.stripe.com/c/season_pass_1",
    });

    await createSeasonPassCheckoutSession(
      "user-1",
      "user@example.com",
      "price_season_pass_live",
    );

    expect(checkoutSessionsCreateSpy).toHaveBeenCalledTimes(1);
    const [params, options] = checkoutSessionsCreateSpy.mock.calls[0];
    expect(params.mode).toBe("payment");
    expect(options.idempotencyKey).toMatch(/^checkout:payment:[a-f0-9]{64}$/);
  });

  it("yields a different idempotencyKey than the subscription path for the same user (cross-mode replay-safety)", async () => {
    mockProfileWithCustomerId("cus_pro");
    checkoutSessionsCreateSpy.mockResolvedValue({
      url: "https://checkout.stripe.com/c/x",
    });

    await createCheckoutSession(
      "user-1",
      "user@example.com",
      "price_1TQb9t0uey7yEjQosCsbrK3t",
    );

    mockProfileWithCustomerId("cus_season");
    await createSeasonPassCheckoutSession(
      "user-1",
      "user@example.com",
      "price_season_pass_live",
    );

    const subKey = checkoutSessionsCreateSpy.mock.calls[0][1].idempotencyKey;
    const payKey = checkoutSessionsCreateSpy.mock.calls[1][1].idempotencyKey;
    expect(subKey.startsWith("checkout:subscription:")).toBe(true);
    expect(payKey.startsWith("checkout:payment:")).toBe(true);
    expect(subKey).not.toBe(payKey);
  });
});

describe("checkout — Stripe error propagation (card-declined, 3DS-challenge, currency-mismatch)", () => {
  it("propagates a Stripe card_declined error from checkout.sessions.create", async () => {
    mockProfileWithCustomerId("cus_pro");
    checkoutSessionsCreateSpy.mockRejectedValue(
      Object.assign(new Error("Your card was declined."), {
        type: "StripeCardError",
        code: "card_declined",
      }),
    );

    await expect(
      createCheckoutSession(
        "user-1",
        "user@example.com",
        "price_1TQb9t0uey7yEjQosCsbrK3t",
      ),
    ).rejects.toThrow("Your card was declined.");
  });

  it("propagates a 3DS-authentication-required error so the route can return generic copy", async () => {
    mockProfileWithCustomerId("cus_pro");
    checkoutSessionsCreateSpy.mockRejectedValue(
      Object.assign(new Error("Authentication required."), {
        type: "StripeCardError",
        code: "authentication_required",
      }),
    );

    await expect(
      createCheckoutSession(
        "user-1",
        "user@example.com",
        "price_1TQb9t0uey7yEjQosCsbrK3t",
      ),
    ).rejects.toThrow("Authentication required.");
  });

  it("propagates a currency-mismatch invalid_request_error from Stripe", async () => {
    mockProfileWithCustomerId("cus_pro");
    checkoutSessionsCreateSpy.mockRejectedValue(
      Object.assign(
        new Error(
          "The currency provided (eur) does not match the Customer's default currency (usd).",
        ),
        { type: "StripeInvalidRequestError", code: "currency_mismatch" },
      ),
    );

    await expect(
      createCheckoutSession(
        "user-1",
        "user@example.com",
        "price_1TQb9t0uey7yEjQosCsbrK3t",
      ),
    ).rejects.toThrow(/currency/i);
  });

  it("throws when Stripe returns a session with no URL (treated as Stripe-down)", async () => {
    mockProfileWithCustomerId("cus_pro");
    checkoutSessionsCreateSpy.mockResolvedValue({ url: null });

    await expect(
      createCheckoutSession(
        "user-1",
        "user@example.com",
        "price_1TQb9t0uey7yEjQosCsbrK3t",
      ),
    ).rejects.toThrow("Stripe did not return a checkout URL");
  });
});
