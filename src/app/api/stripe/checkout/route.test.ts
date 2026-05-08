import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserSpy, rateLimitSpy, createCheckoutSessionSpy } = vi.hoisted(
  () => ({
    requireUserSpy: vi.fn(),
    rateLimitSpy: vi.fn(),
    createCheckoutSessionSpy: vi.fn(),
  }),
);

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/stripe/server", () => ({
  createCheckoutSession: createCheckoutSessionSpy,
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
  });

  it("rejects unknown price IDs before touching Stripe", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);

    const res = await POST(makeRequest({ priceId: "price_unknown" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid request body" });
    expect(createCheckoutSessionSpy).not.toHaveBeenCalled();
  });

  it("creates a subscription Checkout session for an allowlisted price", async () => {
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
});
