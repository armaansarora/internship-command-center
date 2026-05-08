import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserSpy,
  rateLimitSpy,
  createOrRetrieveCustomerSpy,
  createBillingPortalSessionSpy,
} = vi.hoisted(() => ({
  requireUserSpy: vi.fn(),
  rateLimitSpy: vi.fn(),
  createOrRetrieveCustomerSpy: vi.fn(),
  createBillingPortalSessionSpy: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUserApi: requireUserSpy,
}));

vi.mock("@/lib/rate-limit-middleware", () => ({
  withRateLimit: rateLimitSpy,
}));

vi.mock("@/lib/stripe/server", () => ({
  createOrRetrieveCustomer: createOrRetrieveCustomerSpy,
  createBillingPortalSession: createBillingPortalSessionSpy,
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

describe("POST /api/stripe/portal", () => {
  beforeEach(() => {
    requireUserSpy.mockReset();
    rateLimitSpy.mockReset();
    createOrRetrieveCustomerSpy.mockReset();
    createBillingPortalSessionSpy.mockReset();
  });

  it("returns 401 when unauthenticated and never creates a portal session", async () => {
    requireUserSpy.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    });

    const res = await POST();

    expect(res.status).toBe(401);
    expect(rateLimitSpy).not.toHaveBeenCalled();
    expect(createOrRetrieveCustomerSpy).not.toHaveBeenCalled();
    expect(createBillingPortalSessionSpy).not.toHaveBeenCalled();
  });

  it("returns the rate-limit response before touching Stripe", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue({
      limited: true,
      headers: { "Retry-After": "12" },
      response: Response.json({ error: "Rate limit exceeded." }, { status: 429 }),
    });

    const res = await POST();

    expect(res.status).toBe(429);
    expect(rateLimitSpy).toHaveBeenCalledWith("user-billing");
    expect(createOrRetrieveCustomerSpy).not.toHaveBeenCalled();
    expect(createBillingPortalSessionSpy).not.toHaveBeenCalled();
  });

  it("creates a billing portal session for the authenticated user", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createOrRetrieveCustomerSpy.mockResolvedValue("cus_existing");
    createBillingPortalSessionSpy.mockResolvedValue(
      "https://billing.stripe.com/p/session_live",
    );

    const res = await POST();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(createOrRetrieveCustomerSpy).toHaveBeenCalledWith(
      "user-billing",
      "fresh@example.com",
    );
    expect(createBillingPortalSessionSpy).toHaveBeenCalledWith("cus_existing");
    await expect(res.json()).resolves.toEqual({
      url: "https://billing.stripe.com/p/session_live",
    });
  });

  it("returns 500 when portal session creation fails", async () => {
    requireUserSpy.mockResolvedValue(OK_AUTH);
    rateLimitSpy.mockResolvedValue(OK_RATE);
    createOrRetrieveCustomerSpy.mockResolvedValue("cus_existing");
    createBillingPortalSessionSpy.mockRejectedValue(new Error("stripe down"));

    const res = await POST();

    expect(res.status).toBe(500);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    await expect(res.json()).resolves.toEqual({
      error: "Failed to create billing portal session",
    });
  });
});
