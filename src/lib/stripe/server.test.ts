import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  sessionFromSpy,
  sessionSelectSpy,
  sessionEqSpy,
  sessionSingleSpy,
  adminFromSpy,
  adminUpdateSpy,
  adminEqSpy,
  stripeCustomersCreateSpy,
} = vi.hoisted(() => ({
  sessionFromSpy: vi.fn(),
  sessionSelectSpy: vi.fn(),
  sessionEqSpy: vi.fn(),
  sessionSingleSpy: vi.fn(),
  adminFromSpy: vi.fn(),
  adminUpdateSpy: vi.fn(),
  adminEqSpy: vi.fn(),
  stripeCustomersCreateSpy: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: sessionFromSpy,
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: adminFromSpy,
  }),
}));

vi.mock("@/lib/env", () => ({
  requireEnv: () => ({ STRIPE_SECRET_KEY: "sk_test_mock" }),
  env: () => ({ NEXT_PUBLIC_APP_URL: "https://www.interntower.com" }),
}));

vi.mock("stripe", () => {
  class StripeMock {
    customers = {
      create: stripeCustomersCreateSpy,
    };
  }

  return { default: StripeMock };
});

const { createOrRetrieveCustomer } = await import("./server");

function mockProfileRead(stripeCustomerId: string | null): void {
  sessionFromSpy.mockReturnValue({ select: sessionSelectSpy });
  sessionSelectSpy.mockReturnValue({ eq: sessionEqSpy });
  sessionEqSpy.mockReturnValue({ single: sessionSingleSpy });
  sessionSingleSpy.mockResolvedValue({
    data: { stripe_customer_id: stripeCustomerId },
    error: null,
  });
}

function mockAdminUpdate(error: { message: string } | null = null): void {
  adminFromSpy.mockReturnValue({ update: adminUpdateSpy });
  adminUpdateSpy.mockReturnValue({ eq: adminEqSpy });
  adminEqSpy.mockResolvedValue({ error });
}

describe("createOrRetrieveCustomer", () => {
  beforeEach(() => {
    sessionFromSpy.mockReset();
    sessionSelectSpy.mockReset();
    sessionEqSpy.mockReset();
    sessionSingleSpy.mockReset();
    adminFromSpy.mockReset();
    adminUpdateSpy.mockReset();
    adminEqSpy.mockReset();
    stripeCustomersCreateSpy.mockReset();
  });

  it("returns the existing Stripe customer id without creating a new customer", async () => {
    mockProfileRead("cus_existing");

    const result = await createOrRetrieveCustomer("user-1", "user@example.com");

    expect(result).toBe("cus_existing");
    expect(stripeCustomersCreateSpy).not.toHaveBeenCalled();
    expect(adminFromSpy).not.toHaveBeenCalled();
  });

  it("persists a new Stripe customer id through the admin client", async () => {
    mockProfileRead(null);
    mockAdminUpdate();
    stripeCustomersCreateSpy.mockResolvedValue({ id: "cus_new" });

    const result = await createOrRetrieveCustomer("user-1", "user@example.com");

    expect(result).toBe("cus_new");
    expect(stripeCustomersCreateSpy).toHaveBeenCalledWith({
      email: "user@example.com",
      metadata: { supabase_user_id: "user-1" },
    });
    expect(adminFromSpy).toHaveBeenCalledWith("user_profiles");
    expect(adminUpdateSpy).toHaveBeenCalledWith({ stripe_customer_id: "cus_new" });
    expect(adminEqSpy).toHaveBeenCalledWith("id", "user-1");
  });

  it("throws when admin persistence fails", async () => {
    mockProfileRead(null);
    mockAdminUpdate({ message: "stripe_customer_id is managed by billing workflows" });
    stripeCustomersCreateSpy.mockResolvedValue({ id: "cus_new" });

    await expect(
      createOrRetrieveCustomer("user-1", "user@example.com"),
    ).rejects.toThrow("Failed to persist Stripe customer id");
  });
});
