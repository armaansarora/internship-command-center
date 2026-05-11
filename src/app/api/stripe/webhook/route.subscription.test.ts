/**
 * Subscription-lifecycle contract tests for POST /api/stripe/webhook.
 *
 * The existing route.test.ts only covers `checkout.session.completed`. This
 * file rounds out the dispatch table for subscription events + signature
 * + duplicate paths.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const {
  requireEnvSpy,
  constructEventSpy,
  retrieveSubscriptionSpy,
  tierFromPriceIdSpy,
  webhookInsertSpy,
  webhookInsertSelectSpy,
  webhookInsertMaybeSingleSpy,
  webhookUpdateSpy,
  webhookUpdateEqSpy,
  webhookUpdateNeqSpy,
  webhookLookupSelectSpy,
  webhookLookupEqSpy,
  webhookLookupMaybeSingleSpy,
  profileUpdateSpy,
  profileEqSpy,
  profileSelectSpy,
  profileSingleSpy,
  profileLookupSpy,
  profileLookupEqSpy,
  profileLookupLimitSpy,
  logSecurityEventSpy,
} = vi.hoisted(() => ({
  requireEnvSpy: vi.fn(),
  constructEventSpy: vi.fn(),
  retrieveSubscriptionSpy: vi.fn(),
  tierFromPriceIdSpy: vi.fn(),
  webhookInsertSpy: vi.fn(),
  webhookInsertSelectSpy: vi.fn(),
  webhookInsertMaybeSingleSpy: vi.fn(),
  webhookUpdateSpy: vi.fn(),
  webhookUpdateEqSpy: vi.fn(),
  webhookUpdateNeqSpy: vi.fn(),
  webhookLookupSelectSpy: vi.fn(),
  webhookLookupEqSpy: vi.fn(),
  webhookLookupMaybeSingleSpy: vi.fn(),
  profileUpdateSpy: vi.fn(),
  profileEqSpy: vi.fn(),
  profileSelectSpy: vi.fn(),
  profileSingleSpy: vi.fn(),
  profileLookupSpy: vi.fn(),
  profileLookupEqSpy: vi.fn(),
  profileLookupLimitSpy: vi.fn(),
  logSecurityEventSpy: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ requireEnv: requireEnvSpy }));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: constructEventSpy },
    subscriptions: { retrieve: retrieveSubscriptionSpy },
  }),
  tierFromPriceId: tierFromPriceIdSpy,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => makeSupabase(),
}));

vi.mock("@/lib/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/audit/log", () => ({ logSecurityEvent: logSecurityEventSpy }));

function makeSupabase() {
  return {
    from: (table: string) => {
      if (table === "stripe_webhook_events") {
        return {
          insert: webhookInsertSpy,
          update: webhookUpdateSpy,
          select: webhookLookupSelectSpy,
        };
      }
      if (table === "user_profiles") {
        return { update: profileUpdateSpy, select: profileLookupSpy };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}

const { POST } = await import("./route");

function makeRequest(): Request {
  return new Request("https://www.interntower.com/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: JSON.stringify({ id: "evt" }),
  });
}

function makeSubscriptionEvent(
  type: string,
  opts: { priceId?: string; customer?: string; status?: string } = {},
): Stripe.Event {
  return {
    id: "evt_sub_1",
    type,
    livemode: false,
    data: {
      object: {
        customer: opts.customer ?? "cus_123",
        status: opts.status ?? "active",
        items: { data: [{ price: { id: opts.priceId ?? "price_pro" } }] },
      },
    },
  } as unknown as Stripe.Event;
}

function setupInsertOk(): void {
  webhookInsertMaybeSingleSpy.mockResolvedValue({
    data: { id: "evt_sub_1", status: "received" },
    error: null,
  });
  webhookInsertSelectSpy.mockReturnValue({ maybeSingle: webhookInsertMaybeSingleSpy });
  webhookInsertSpy.mockReturnValue({ select: webhookInsertSelectSpy });
}

function setupWebhookUpdateOk(): void {
  webhookUpdateEqSpy.mockReturnValue({ neq: webhookUpdateNeqSpy });
  webhookUpdateNeqSpy.mockResolvedValue({ error: null });
  webhookUpdateSpy.mockImplementation(() => ({ eq: webhookUpdateEqSpy, neq: webhookUpdateNeqSpy }));
}

function setupProfileUpdateOk(): void {
  profileSingleSpy.mockResolvedValue({ data: { id: "user-1" }, error: null });
  profileSelectSpy.mockReturnValue({ single: profileSingleSpy });
  profileEqSpy.mockReturnValue({ select: profileSelectSpy });
  profileUpdateSpy.mockReturnValue({ eq: profileEqSpy });
}

function setupCustomerLookup(userId: string | null): void {
  profileLookupLimitSpy.mockResolvedValue({
    data: userId ? [{ id: userId }] : [],
    error: null,
  });
  profileLookupEqSpy.mockReturnValue({ limit: profileLookupLimitSpy });
  profileLookupSpy.mockReturnValue({ eq: profileLookupEqSpy });
}

describe("POST /api/stripe/webhook — subscription lifecycle", () => {
  beforeEach(() => {
    requireEnvSpy.mockReset();
    constructEventSpy.mockReset();
    retrieveSubscriptionSpy.mockReset();
    tierFromPriceIdSpy.mockReset();
    webhookInsertSpy.mockReset();
    webhookInsertSelectSpy.mockReset();
    webhookInsertMaybeSingleSpy.mockReset();
    webhookUpdateSpy.mockReset();
    webhookUpdateEqSpy.mockReset();
    webhookUpdateNeqSpy.mockReset();
    webhookLookupSelectSpy.mockReset();
    webhookLookupEqSpy.mockReset();
    webhookLookupMaybeSingleSpy.mockReset();
    profileUpdateSpy.mockReset();
    profileEqSpy.mockReset();
    profileSelectSpy.mockReset();
    profileSingleSpy.mockReset();
    profileLookupSpy.mockReset();
    profileLookupEqSpy.mockReset();
    profileLookupLimitSpy.mockReset();
    logSecurityEventSpy.mockReset();

    requireEnvSpy.mockReturnValue({ STRIPE_WEBHOOK_SECRET: "whsec_test" });
    tierFromPriceIdSpy.mockReturnValue("pro");
    setupInsertOk();
    setupWebhookUpdateOk();
    setupProfileUpdateOk();
    setupCustomerLookup("user-1");
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = new Request("https://www.interntower.com/api/stripe/webhook", {
      method: "POST",
      body: JSON.stringify({ id: "evt" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(webhookInsertSpy).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification fails", async () => {
    constructEventSpy.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
    expect(webhookInsertSpy).not.toHaveBeenCalled();
  });

  it("acks customer.subscription.created and writes the new tier", async () => {
    constructEventSpy.mockReturnValue(makeSubscriptionEvent("customer.subscription.created"));
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(profileUpdateSpy).toHaveBeenCalledWith({ subscription_tier: "pro" });
    expect(logSecurityEventSpy).toHaveBeenCalled();
  });

  it("writes free tier on customer.subscription.updated when status is canceled", async () => {
    constructEventSpy.mockReturnValue(
      makeSubscriptionEvent("customer.subscription.updated", { status: "canceled" }),
    );
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(profileUpdateSpy).toHaveBeenCalledWith({ subscription_tier: "free" });
  });

  it("writes free tier on customer.subscription.deleted", async () => {
    constructEventSpy.mockReturnValue(makeSubscriptionEvent("customer.subscription.deleted"));
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(profileUpdateSpy).toHaveBeenCalledWith({ subscription_tier: "free" });
    expect(logSecurityEventSpy).toHaveBeenCalled();
  });

  it("acks subscription.updated for unknown customer without persisting tier", async () => {
    setupCustomerLookup(null);
    constructEventSpy.mockReturnValue(makeSubscriptionEvent("customer.subscription.updated"));
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(profileUpdateSpy).not.toHaveBeenCalled();
  });

  it("acks unknown event types without writing the user profile", async () => {
    constructEventSpy.mockReturnValue({
      id: "evt_misc",
      type: "invoice.payment_failed",
      livemode: false,
      data: { object: {} },
    } as unknown as Stripe.Event);
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    expect(profileUpdateSpy).not.toHaveBeenCalled();
  });

  it("acks an already-processed duplicate event without re-processing", async () => {
    webhookInsertMaybeSingleSpy.mockResolvedValue({ data: null, error: { code: "23505" } });
    webhookLookupMaybeSingleSpy.mockResolvedValue({
      data: {
        status: "processed",
        created_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-01T00:00:01Z",
      },
      error: null,
    });
    webhookLookupEqSpy.mockReturnValue({ maybeSingle: webhookLookupMaybeSingleSpy });
    webhookLookupSelectSpy.mockReturnValue({ eq: webhookLookupEqSpy });
    constructEventSpy.mockReturnValue(makeSubscriptionEvent("customer.subscription.created"));

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { received: boolean; duplicate?: boolean };
    expect(body.received).toBe(true);
    expect(body.duplicate).toBe(true);
    expect(profileUpdateSpy).not.toHaveBeenCalled();
  });
});
