import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireEnvSpy,
  constructEventSpy,
  retrieveSubscriptionSpy,
  tierFromPriceIdSpy,
  getSupabaseAdminSpy,
  webhookInsertSpy,
  webhookInsertSelectSpy,
  webhookInsertMaybeSingleSpy,
  webhookUpdateSpy,
  webhookUpdateEqSpy,
  webhookUpdateNeqSpy,
  profileUpdateSpy,
  profileEqSpy,
  profileSelectSpy,
  profileSingleSpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  requireEnvSpy: vi.fn(),
  constructEventSpy: vi.fn(),
  retrieveSubscriptionSpy: vi.fn(),
  tierFromPriceIdSpy: vi.fn(),
  getSupabaseAdminSpy: vi.fn(),
  webhookInsertSpy: vi.fn(),
  webhookInsertSelectSpy: vi.fn(),
  webhookInsertMaybeSingleSpy: vi.fn(),
  webhookUpdateSpy: vi.fn(),
  webhookUpdateEqSpy: vi.fn(),
  webhookUpdateNeqSpy: vi.fn(),
  profileUpdateSpy: vi.fn(),
  profileEqSpy: vi.fn(),
  profileSelectSpy: vi.fn(),
  profileSingleSpy: vi.fn(),
  logErrorSpy: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  requireEnv: requireEnvSpy,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: constructEventSpy,
    },
    subscriptions: {
      retrieve: retrieveSubscriptionSpy,
    },
  }),
  tierFromPriceId: tierFromPriceIdSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminSpy,
}));

vi.mock("@/lib/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: logErrorSpy,
  },
}));

vi.mock("@/lib/audit/log", () => ({
  logSecurityEvent: vi.fn(),
}));

const { POST } = await import("./route");

function makeCheckoutEvent() {
  return {
    id: "evt_checkout",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        metadata: { supabase_user_id: "user-billing" },
        subscription: "sub_123",
      },
    },
  };
}

function makeRequest(): Request {
  return new Request("https://www.interntower.com/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: JSON.stringify({ id: "evt_checkout" }),
  });
}

function makeSupabase() {
  return {
    from: (table: string) => {
      if (table === "stripe_webhook_events") {
        return {
          insert: webhookInsertSpy,
          update: webhookUpdateSpy,
        };
      }
      if (table === "user_profiles") {
        return {
          update: profileUpdateSpy,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    requireEnvSpy.mockReset();
    constructEventSpy.mockReset();
    retrieveSubscriptionSpy.mockReset();
    tierFromPriceIdSpy.mockReset();
    getSupabaseAdminSpy.mockReset();
    webhookInsertSpy.mockReset();
    webhookInsertSelectSpy.mockReset();
    webhookInsertMaybeSingleSpy.mockReset();
    webhookUpdateSpy.mockReset();
    webhookUpdateEqSpy.mockReset();
    webhookUpdateNeqSpy.mockReset();
    profileUpdateSpy.mockReset();
    profileEqSpy.mockReset();
    profileSelectSpy.mockReset();
    profileSingleSpy.mockReset();
    logErrorSpy.mockReset();

    requireEnvSpy.mockReturnValue({ STRIPE_WEBHOOK_SECRET: "whsec_test" });
    constructEventSpy.mockReturnValue(makeCheckoutEvent());
    retrieveSubscriptionSpy.mockResolvedValue({
      items: { data: [{ price: { id: "price_pro" } }] },
    });
    tierFromPriceIdSpy.mockReturnValue("pro");
    getSupabaseAdminSpy.mockReturnValue(makeSupabase());

    webhookInsertMaybeSingleSpy.mockResolvedValue({
      data: { id: "evt_checkout", status: "received" },
      error: null,
    });
    webhookInsertSelectSpy.mockReturnValue({
      maybeSingle: webhookInsertMaybeSingleSpy,
    });
    webhookInsertSpy.mockReturnValue({ select: webhookInsertSelectSpy });

    webhookUpdateEqSpy.mockReturnValue({ neq: webhookUpdateNeqSpy });
    webhookUpdateNeqSpy.mockResolvedValue({ error: null });
    webhookUpdateSpy.mockReturnValue({
      eq: webhookUpdateEqSpy,
      neq: webhookUpdateNeqSpy,
    });

    profileSingleSpy.mockResolvedValue({
      data: { id: "user-billing" },
      error: null,
    });
    profileSelectSpy.mockReturnValue({ single: profileSingleSpy });
    profileEqSpy.mockReturnValue({ select: profileSelectSpy });
    profileUpdateSpy.mockReturnValue({ eq: profileEqSpy });
  });

  it("confirms checkout tier persistence updates a profile row", async () => {
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    expect(profileUpdateSpy).toHaveBeenCalledWith({ subscription_tier: "pro" });
    expect(profileEqSpy).toHaveBeenCalledWith("id", "user-billing");
    expect(profileSelectSpy).toHaveBeenCalledWith("id");
    expect(profileSingleSpy).toHaveBeenCalledOnce();
  });

  it("fails the webhook when checkout tier persistence touches no profile row", async () => {
    profileSingleSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "No rows found" },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Handler failed" });
    expect(logErrorSpy).toHaveBeenCalledWith(
      "stripe.webhook.handler_failed",
      expect.any(Error),
      { eventId: "evt_checkout", type: "checkout.session.completed" },
    );
    expect(webhookUpdateSpy).toHaveBeenCalledWith({
      status: "failed",
      error: "Failed to persist checkout tier: No rows found",
    });
  });
});
