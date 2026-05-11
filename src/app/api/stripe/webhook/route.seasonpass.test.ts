/**
 * Stripe webhook — Season Pass purchase mirror.
 *
 * The Season Pass uses Stripe's one-time payment mode, so the
 * `checkout.session.completed` event arrives with `session.subscription`
 * set to `null`. The existing webhook returns early for null subscription
 * (subscription-tier flips don't apply); this PR adds a separate branch
 * that mirrors the `season_pass_purchased` Plausible goal into
 * engagement_events for durable conversion tracking.
 *
 * Tests pin:
 *   1. The mirror fires when metadata.tier === "seasonPass".
 *   2. The mirror DOES NOT fire on a recurring-tier checkout (Pro/Team).
 *   3. The mirror DOES NOT fire on a one-time payment without the seasonPass tag.
 *   4. The webhook acks 200 in all three cases.
 */
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
  profileSingleSpy,
  recordServerEngagementEventSpy,
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
  profileSingleSpy: vi.fn(),
  recordServerEngagementEventSpy: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  requireEnv: requireEnvSpy,
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: constructEventSpy },
    subscriptions: { retrieve: retrieveSubscriptionSpy },
    checkout: {
      sessions: { listLineItems: listLineItemsSpy },
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
    error: vi.fn(),
  },
}));

vi.mock("@/lib/audit/log", () => ({
  logSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/server-engagement", () => ({
  recordServerEngagementEvent: recordServerEngagementEventSpy,
}));

const { POST } = await import("./route");

function makeSeasonPassEvent() {
  // Season Pass mode is `payment`; session.subscription is null. The Tower
  // checkout layer pins `metadata.tier === "seasonPass"` so the webhook
  // distinguishes Season Pass from other one-time SKUs.
  return {
    id: "evt_season_pass",
    type: "checkout.session.completed",
    livemode: false,
    data: {
      object: {
        id: "cs_season_pass",
        mode: "payment",
        metadata: {
          supabase_user_id: "user-purchaser",
          tier: "seasonPass",
        },
        subscription: null,
        currency: "usd",
      },
    },
  };
}

function makeRequest(): Request {
  return new Request("https://www.interntower.com/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: JSON.stringify({ id: "evt_season_pass" }),
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
        return { update: profileUpdateSpy };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

describe("POST /api/stripe/webhook — Season Pass purchase mirror", () => {
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
    profileSingleSpy.mockReset();
    recordServerEngagementEventSpy.mockReset();

    requireEnvSpy.mockReturnValue({ STRIPE_WEBHOOK_SECRET: "whsec_test" });
    getSupabaseAdminSpy.mockReturnValue(makeSupabase());

    webhookInsertMaybeSingleSpy.mockResolvedValue({
      data: { id: "evt_season_pass", status: "received" },
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
      data: { id: "user-purchaser" },
      error: null,
    });
    profileSelectSpy.mockReturnValue({ single: profileSingleSpy });
    profileEqSpy.mockReturnValue({ select: profileSelectSpy });
    profileUpdateSpy.mockReturnValue({ eq: profileEqSpy });

    recordServerEngagementEventSpy.mockResolvedValue(undefined);

    // Season Pass mode=payment branch resolves the purchased price via
    // listLineItems before stamping the tier + analytics mirror.
    listLineItemsSpy.mockResolvedValue({
      data: [{ price: { id: "price_season_pass" } }],
    });
    tierFromPriceIdSpy.mockReturnValue("seasonPass");
  });

  it("fires recordServerEngagementEvent('purchase', …) when metadata.tier === 'seasonPass'", async () => {
    constructEventSpy.mockReturnValue(makeSeasonPassEvent());

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });

    expect(recordServerEngagementEventSpy).toHaveBeenCalledTimes(1);
    expect(recordServerEngagementEventSpy).toHaveBeenCalledWith({
      eventType: "purchase",
      pathname: "/season-pass/purchased",
      userId: "user-purchaser",
      metadata: {
        goal: "season_pass_purchased",
        sku: "seasonPass",
        currency: "usd",
      },
    });
  });

  it("does NOT fire the mirror when subscription is set (recurring SKU branch)", async () => {
    constructEventSpy.mockReturnValue({
      id: "evt_pro",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          metadata: { supabase_user_id: "user-pro" },
          subscription: "sub_123",
        },
      },
    });
    retrieveSubscriptionSpy.mockResolvedValue({
      items: { data: [{ price: { id: "price_pro" } }] },
    });
    tierFromPriceIdSpy.mockReturnValue("pro");

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    // Recurring SKU branch — engagement_events mirror is NOT for Pro/Team.
    expect(recordServerEngagementEventSpy).not.toHaveBeenCalled();
  });

  it("does NOT fire the mirror on a one-time payment WITHOUT the seasonPass tier tag", async () => {
    constructEventSpy.mockReturnValue({
      id: "evt_other_oneoff",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          // Future one-off SKU that isn't the Season Pass — must not steal
          // the conversion goal.
          metadata: { supabase_user_id: "user-other", tier: "merch" },
          subscription: null,
          currency: "usd",
        },
      },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    expect(recordServerEngagementEventSpy).not.toHaveBeenCalled();
  });

  it("normalises the currency to lowercase even if Stripe sends uppercase", async () => {
    constructEventSpy.mockReturnValue({
      id: "evt_currency_caps",
      type: "checkout.session.completed",
      livemode: false,
      data: {
        object: {
          id: "cs_currency_caps",
          mode: "payment",
          metadata: {
            supabase_user_id: "user-currency",
            tier: "seasonPass",
          },
          subscription: null,
          currency: "USD",
        },
      },
    });

    await POST(makeRequest());

    const call = recordServerEngagementEventSpy.mock.calls[0]?.[0] as {
      metadata: { currency: string };
    };
    expect(call.metadata.currency).toBe("usd");
  });
});
