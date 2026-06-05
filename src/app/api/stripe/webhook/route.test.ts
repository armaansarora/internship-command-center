import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireEnvSpy,
  constructEventSpy,
  retrieveSubscriptionSpy,
  listLineItemsSpy,
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
  profileMaybeSingleSpy,
  logErrorSpy,
  logWarnSpy,
} = vi.hoisted(() => ({
  requireEnvSpy: vi.fn(),
  constructEventSpy: vi.fn(),
  retrieveSubscriptionSpy: vi.fn(),
  listLineItemsSpy: vi.fn(),
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
  profileMaybeSingleSpy: vi.fn(),
  logErrorSpy: vi.fn(),
  logWarnSpy: vi.fn(),
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
    checkout: {
      sessions: {
        listLineItems: listLineItemsSpy,
      },
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
    warn: logWarnSpy,
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
        id: "cs_test_subscription",
        mode: "subscription",
        metadata: { supabase_user_id: "user-billing" },
        subscription: "sub_123",
      },
    },
  };
}

function makeSeasonPassCheckoutEvent() {
  return {
    id: "evt_season_pass_checkout",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_test_season_pass",
        mode: "payment",
        metadata: {
          supabase_user_id: "user-billing",
          tier: "seasonPass",
        },
        subscription: null,
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
    listLineItemsSpy.mockReset();
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
    profileMaybeSingleSpy.mockReset();
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

    profileMaybeSingleSpy.mockResolvedValue({
      data: { id: "user-billing" },
      error: null,
    });
    profileSelectSpy.mockReturnValue({ maybeSingle: profileMaybeSingleSpy });
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
    expect(profileMaybeSingleSpy).toHaveBeenCalledOnce();
  });

  // ── Season Pass durability ──────────────────────────────────────────────
  //
  // A Season Pass purchase delivers `checkout.session.completed` with
  // `mode: "payment"` and `subscription: null`. The webhook MUST resolve
  // the price id via `checkout.sessions.listLineItems` and persist the
  // tier — without this branch, a $149 purchase never grants entitlement.
  it("persists subscription_tier=seasonPass for one-time Season Pass checkout", async () => {
    constructEventSpy.mockReturnValue(makeSeasonPassCheckoutEvent());
    listLineItemsSpy.mockResolvedValue({
      data: [{ price: { id: "price_season_pass_live" } }],
    });
    tierFromPriceIdSpy.mockReturnValueOnce("seasonPass");

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    // The one-time SKU does NOT have a subscription, so the subscription
    // retrieve must NOT be called — that path is reserved for recurring
    // checkouts. listLineItems is the contract for one-time SKUs.
    expect(retrieveSubscriptionSpy).not.toHaveBeenCalled();
    expect(listLineItemsSpy).toHaveBeenCalledWith("cs_test_season_pass", {
      limit: 1,
    });
    expect(tierFromPriceIdSpy).toHaveBeenCalledWith("price_season_pass_live");
    expect(profileUpdateSpy).toHaveBeenCalledWith({
      subscription_tier: "seasonPass",
    });
    expect(profileEqSpy).toHaveBeenCalledWith("id", "user-billing");
  });

  it("acks the Season Pass webhook without writing a profile when line items are empty", async () => {
    constructEventSpy.mockReturnValue(makeSeasonPassCheckoutEvent());
    listLineItemsSpy.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(profileUpdateSpy).not.toHaveBeenCalled();
  });

  it("acks (and alerts on) a checkout whose profile row no longer exists", async () => {
    // maybeSingle() returns { data: null, error: null } for a 0-row update —
    // the user_profiles row was deleted between checkout and webhook delivery.
    // That is NOT retryable, so the webhook must ACK (200) rather than 500 and
    // send Stripe into days of retrying an unresolvable event. An alert is
    // logged so the dropped entitlement is observable.
    profileMaybeSingleSpy.mockResolvedValueOnce({ data: null, error: null });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    expect(logWarnSpy).toHaveBeenCalledWith(
      "stripe.webhook.tier_update_no_row",
      expect.objectContaining({
        alert: true,
        userId: "user-billing",
        tier: "pro",
        context: "checkout tier",
      }),
    );
    expect(webhookUpdateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
  });

  it("still fails (so Stripe retries) on a genuine DB error during tier persistence", async () => {
    // A real DB error is transient and the event is still resolvable, so the
    // webhook must 500 and let Stripe retry once the database recovers.
    profileMaybeSingleSpy.mockResolvedValueOnce({
      data: null,
      error: { message: "connection reset" },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "Handler failed" });
    expect(webhookUpdateSpy).toHaveBeenCalledWith({
      status: "failed",
      error: "Failed to persist checkout tier: connection reset",
    });
  });
});
