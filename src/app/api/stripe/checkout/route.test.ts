import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserSpy,
  rateLimitSpy,
  createCheckoutSessionSpy,
  createSeasonPassCheckoutSessionSpy,
  envSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  createCheckoutSessionSpy: vi.fn(),
  createSeasonPassCheckoutSessionSpy: vi.fn(),
  envSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/stripe/server", () => ({
  createCheckoutSession: createCheckoutSessionSpy,
  createSeasonPassCheckoutSession: createSeasonPassCheckoutSessionSpy,
}));

vi.mock("@/lib/env", () => ({
  env: envSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    error: vi.fn(),
  },
}));

const { POST } = await import("./route");

const OK_AUTH = {
  ok: true as const,
  user: { id: "user-billing", email: "fresh@example.com" },
};

const OK_RATE = {
  limited: false,
  headers: {
    "X-RateLimit-Limit": "5",
    "X-RateLimit-Remaining": "4",
  },
  response: null,
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    createCheckoutSessionSpy.mockReset();
    createSeasonPassCheckoutSessionSpy.mockReset();
    envSpy.mockReset();
    // Default env: Season Pass price id is configured.
    envSpy.mockReturnValue({
      STRIPE_SEASON_PASS_PRICE_ID: "price_season_pass_live",
    });
  });

  it("returns 401 when unauthenticated and never creates a Checkout session", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await POST(makeRequest({ priceId: "price_1TQb9t0uey7yEjQosCsbrK3t" }));

    expect(res.status).toBe(401);
    expect(rateLimitSpy).not.toHaveBeenCalled();
    expect(createCheckoutSessionSpy).not.toHaveBeenCalled();
    expect(createSeasonPassCheckoutSessionSpy).not.toHaveBeenCalled();
  });

  it("returns the rate-limit response before validating or creating a session", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue({
      limited: true,
      headers: { "Retry-After": "12" },
      response: Response.json({ error: "Rate limit exceeded." }, { status: 429 }),
    });

    const res = await POST(makeRequest({ priceId: "not-a-real-price" }));

    expect(res.status).toBe(429);
    expect(rateLimitSpy).toHaveBeenCalledWith("user-billing");
    expect(createCheckoutSessionSpy).not.toHaveBeenCalled();
    expect(createSeasonPassCheckoutSessionSpy).not.toHaveBeenCalled();
  });

  it("rejects unknown recurring price IDs before touching Stripe", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);

    const res = await POST(makeRequest({ priceId: "price_unknown" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid request body" });
    expect(createCheckoutSessionSpy).not.toHaveBeenCalled();
    expect(createSeasonPassCheckoutSessionSpy).not.toHaveBeenCalled();
  });

  it("creates a subscription Checkout session for an allowlisted recurring price", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createCheckoutSessionSpy.mockResolvedValue(
      "https://checkout.stripe.com/c/session_live",
    );

    const priceId = "price_1TQb9u0uey7yEjQoW7qgKVfT";
    const res = await POST(makeRequest({ priceId }));

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(createCheckoutSessionSpy).toHaveBeenCalledWith(
      "user-billing",
      "fresh@example.com",
      priceId,
    );
    expect(createSeasonPassCheckoutSessionSpy).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      url: "https://checkout.stripe.com/c/session_live",
    });
  });

  it("returns 500 when Stripe session creation fails", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createCheckoutSessionSpy.mockRejectedValue(new Error("stripe down"));

    const res = await POST(makeRequest({ priceId: "price_1TQb9t0uey7yEjQosCsbrK3t" }));

    expect(res.status).toBe(500);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    await expect(res.json()).resolves.toEqual({
      error: "Failed to create checkout session",
    });
  });

  // ── Season Pass branch ────────────────────────────────────────────────────

  it("creates a one-time Checkout session for tier === 'seasonPass'", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createSeasonPassCheckoutSessionSpy.mockResolvedValue(
      "https://checkout.stripe.com/c/season_pass_live",
    );

    const res = await POST(makeRequest({ tier: "seasonPass" }));

    expect(res.status).toBe(200);
    expect(createSeasonPassCheckoutSessionSpy).toHaveBeenCalledWith(
      "user-billing",
      "fresh@example.com",
      "price_season_pass_live",
    );
    expect(createCheckoutSessionSpy).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      url: "https://checkout.stripe.com/c/season_pass_live",
    });
  });

  it("returns 500 (Invalid env) when STRIPE_SEASON_PASS_PRICE_ID is unset and tier === 'seasonPass'", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    envSpy.mockReturnValueOnce({ STRIPE_SEASON_PASS_PRICE_ID: undefined });

    const res = await POST(makeRequest({ tier: "seasonPass" }));

    expect(res.status).toBe(500);
    expect(createSeasonPassCheckoutSessionSpy).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toEqual({
      error: "Failed to create checkout session",
    });
  });

  it("rejects an empty body (neither tier nor priceId)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);

    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(createCheckoutSessionSpy).not.toHaveBeenCalled();
    expect(createSeasonPassCheckoutSessionSpy).not.toHaveBeenCalled();
  });

  // ── Failure-mode coverage (Stripe SDK error fan-out) ──────────────────────

  it("returns generic copy for a card-declined Stripe error (never the raw Stripe message)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createCheckoutSessionSpy.mockRejectedValue(
      Object.assign(new Error("Your card was declined."), {
        type: "StripeCardError",
        code: "card_declined",
      }),
    );

    const res = await POST(makeRequest({ priceId: "price_1TQb9t0uey7yEjQosCsbrK3t" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to create checkout session" });
    // Defensive: raw Stripe message must not leak through.
    expect(JSON.stringify(body)).not.toMatch(/card was declined/i);
  });

  it("returns generic copy for a 3DS authentication_required error", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createCheckoutSessionSpy.mockRejectedValue(
      Object.assign(new Error("Authentication required."), {
        type: "StripeCardError",
        code: "authentication_required",
      }),
    );

    const res = await POST(makeRequest({ priceId: "price_1TQb9t0uey7yEjQosCsbrK3t" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to create checkout session",
    });
  });

  it("returns generic copy when Stripe reports a currency mismatch (invalid_request_error)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createCheckoutSessionSpy.mockRejectedValue(
      Object.assign(
        new Error(
          "The currency provided (eur) does not match the Customer's default currency (usd).",
        ),
        { type: "StripeInvalidRequestError", code: "currency_mismatch" },
      ),
    );

    const res = await POST(makeRequest({ priceId: "price_1TQb9t0uey7yEjQosCsbrK3t" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to create checkout session" });
    expect(JSON.stringify(body)).not.toMatch(/currency/i);
  });

  it("returns generic copy when Stripe reports a prior active subscription exists", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createCheckoutSessionSpy.mockRejectedValue(
      Object.assign(
        new Error("Customer has an active subscription on this product."),
        { type: "StripeInvalidRequestError", code: "resource_already_exists" },
      ),
    );

    const res = await POST(makeRequest({ priceId: "price_1TQb9t0uey7yEjQosCsbrK3t" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to create checkout session",
    });
  });

  it("returns generic copy when Stripe reports an expired checkout session (race on retry)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createCheckoutSessionSpy.mockRejectedValue(
      Object.assign(new Error("This Checkout Session has expired."), {
        type: "StripeInvalidRequestError",
        code: "resource_expired",
      }),
    );

    const res = await POST(makeRequest({ priceId: "price_1TQb9t0uey7yEjQosCsbrK3t" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to create checkout session",
    });
  });

  it("returns generic copy for Season Pass when Stripe SDK throws (no raw Stripe error leaks)", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createSeasonPassCheckoutSessionSpy.mockRejectedValue(
      Object.assign(new Error("Your card was declined."), {
        type: "StripeCardError",
        code: "card_declined",
      }),
    );

    const res = await POST(makeRequest({ tier: "seasonPass" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to create checkout session" });
    expect(JSON.stringify(body)).not.toMatch(/card was declined/i);
  });
});
