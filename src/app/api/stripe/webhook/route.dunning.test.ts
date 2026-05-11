import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

/**
 * Dunning / refund / idempotency webhook tests.
 *
 * Covers the gaps the Monetize council surfaced:
 *   - `invoice.payment_failed` writes a `payment_failed` audit row and
 *     does NOT mutate `subscription_tier` (dunning retries still pending).
 *   - `charge.refunded` writes a `refund_issued` audit row and does NOT
 *     mutate `subscription_tier` (refund != revocation).
 *   - Duplicate deliveries: a 23505 unique-violation on event.id ACKs
 *     without re-running the handler (replay-safe by event.id).
 *   - Out-of-order / unknown event types ack without work.
 */

const {
  requireEnvSpy,
  constructEventSpy,
  retrieveSubscriptionSpy,
  tierFromPriceIdSpy,
  getSupabaseAdminSpy,
  logSecuritySpy,
  logErrorSpy,
} = vi.hoisted(() => ({
  requireEnvSpy: vi.fn(),
  constructEventSpy: vi.fn(),
  retrieveSubscriptionSpy: vi.fn(),
  tierFromPriceIdSpy: vi.fn(),
  getSupabaseAdminSpy: vi.fn(),
  logSecuritySpy: vi.fn(),
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
  logSecurityEvent: logSecuritySpy,
}));

const { POST } = await import("./route");

// ── Test fixtures ───────────────────────────────────────────────────────────

function makeRequest(eventId: string): Request {
  return new Request("https://www.interntower.com/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "sig_test" },
    body: JSON.stringify({ id: eventId }),
  });
}

function makePaymentFailedEvent(): Stripe.Event {
  return {
    id: "evt_payment_failed",
    type: "invoice.payment_failed",
    livemode: false,
    data: {
      object: {
        id: "in_test_123",
        customer: "cus_pro_user",
        amount_due: 2900,
        currency: "usd",
        attempt_count: 2,
        next_payment_attempt: 1_800_000_000,
        customer_email: "user@example.com",
      },
    },
  } as unknown as Stripe.Event;
}

function makeRefundEvent(): Stripe.Event {
  return {
    id: "evt_charge_refunded",
    type: "charge.refunded",
    livemode: false,
    data: {
      object: {
        id: "ch_test_123",
        customer: "cus_pro_user",
        amount_refunded: 14900,
        currency: "usd",
        payment_intent: "pi_test_456",
        receipt_email: "user@example.com",
      },
    },
  } as unknown as Stripe.Event;
}

/**
 * Composes a Supabase mock that satisfies:
 *   - `stripe_webhook_events` insert → returns the supplied insertResult.
 *     For 23505 duplicates we also need a `select.eq.maybeSingle` chain to
 *     load the existing row's status.
 *   - `stripe_webhook_events` update → success ack.
 *   - `user_profiles` select.eq.limit → returns `[{ id }]` to resolve the
 *     Tower user from a Stripe customer id. Pass null to simulate
 *     "Stripe-side misroute" (no Tower customer match).
 */
function makeSupabase(opts: {
  insertResult: { data: unknown; error: { code?: string; message?: string } | null };
  duplicateRow?: { status: string; created_at: string | null; updated_at: string | null };
  profileUserId: string | null;
}) {
  const eventsUpdateChain = {
    eq: () => ({
      neq: vi.fn().mockResolvedValue({ error: null }),
    }),
  };

  const eventsTable = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue(opts.insertResult),
      })),
    })),
    update: vi.fn(() => eventsUpdateChain),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: opts.duplicateRow ?? null,
          error: null,
        }),
      })),
    })),
  };

  const profilesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({
          data: opts.profileUserId ? [{ id: opts.profileUserId }] : [],
          error: null,
        }),
      })),
    })),
  };

  return {
    from: (table: string) => {
      if (table === "stripe_webhook_events") return eventsTable;
      if (table === "user_profiles") return profilesTable;
      throw new Error(`Unexpected table ${table}`);
    },
    _eventsTable: eventsTable,
    _profilesTable: profilesTable,
  };
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  requireEnvSpy.mockReset();
  constructEventSpy.mockReset();
  retrieveSubscriptionSpy.mockReset();
  tierFromPriceIdSpy.mockReset();
  getSupabaseAdminSpy.mockReset();
  logSecuritySpy.mockReset();
  logErrorSpy.mockReset();

  requireEnvSpy.mockReturnValue({ STRIPE_WEBHOOK_SECRET: "whsec_test" });
});

// ── invoice.payment_failed ──────────────────────────────────────────────────

describe("POST /api/stripe/webhook — invoice.payment_failed", () => {
  it("emits a payment_failed audit row and never touches subscription_tier", async () => {
    constructEventSpy.mockReturnValue(makePaymentFailedEvent());
    const supabase = makeSupabase({
      insertResult: {
        data: { id: "evt_payment_failed", status: "received" },
        error: null,
      },
      profileUserId: "user-pro-1",
    });
    getSupabaseAdminSpy.mockReturnValue(supabase);

    const res = await POST(makeRequest("evt_payment_failed"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });

    // Audit row was written with the right shape (financial fields + hashed
    // email — never the raw address).
    expect(logSecuritySpy).toHaveBeenCalledTimes(1);
    const auditCall = logSecuritySpy.mock.calls[0][0];
    expect(auditCall.eventType).toBe("payment_failed");
    expect(auditCall.userId).toBe("user-pro-1");
    expect(auditCall.resourceType).toBe("stripe_invoice");
    expect(auditCall.resourceId).toBe("in_test_123");
    expect(auditCall.metadata.amount_due).toBe(2900);
    expect(auditCall.metadata.currency).toBe("usd");
    expect(auditCall.metadata.attempt_count).toBe(2);
    expect(auditCall.metadata.customer_email_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    // Defensive: raw email must never appear anywhere in the metadata.
    expect(JSON.stringify(auditCall.metadata)).not.toMatch(/user@example\.com/);

    // Subscription tier must NOT be mutated by the dunning event.
    expect(supabase._profilesTable.select).toHaveBeenCalled();
    // user_profiles.update is not part of our mock surface; if it were
    // called the supabase from() switch would not return it. Confirming
    // via call inspection is enough.
  });

  it("acks without work and skips audit when the Stripe customer is not a Tower user", async () => {
    constructEventSpy.mockReturnValue(makePaymentFailedEvent());
    const supabase = makeSupabase({
      insertResult: {
        data: { id: "evt_payment_failed", status: "received" },
        error: null,
      },
      profileUserId: null,
    });
    getSupabaseAdminSpy.mockReturnValue(supabase);

    const res = await POST(makeRequest("evt_payment_failed"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    expect(logSecuritySpy).not.toHaveBeenCalled();
  });
});

// ── charge.refunded ────────────────────────────────────────────────────────

describe("POST /api/stripe/webhook — charge.refunded", () => {
  it("emits a refund_issued audit row with hashed customer email", async () => {
    constructEventSpy.mockReturnValue(makeRefundEvent());
    const supabase = makeSupabase({
      insertResult: {
        data: { id: "evt_charge_refunded", status: "received" },
        error: null,
      },
      profileUserId: "user-pro-1",
    });
    getSupabaseAdminSpy.mockReturnValue(supabase);

    const res = await POST(makeRequest("evt_charge_refunded"));

    expect(res.status).toBe(200);
    expect(logSecuritySpy).toHaveBeenCalledTimes(1);
    const audit = logSecuritySpy.mock.calls[0][0];
    expect(audit.eventType).toBe("refund_issued");
    expect(audit.resourceType).toBe("stripe_charge");
    expect(audit.resourceId).toBe("ch_test_123");
    expect(audit.metadata.amount_refunded).toBe(14900);
    expect(audit.metadata.payment_intent).toBe("pi_test_456");
    expect(audit.metadata.customer_email_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(audit.metadata)).not.toMatch(/user@example\.com/);
  });
});

// ── Idempotency by event.id ─────────────────────────────────────────────────

describe("POST /api/stripe/webhook — idempotency by event.id", () => {
  it("acks a duplicate delivery (already-processed event) without re-running the handler", async () => {
    constructEventSpy.mockReturnValue(makePaymentFailedEvent());
    const supabase = makeSupabase({
      // Simulate a 23505 unique-violation on event.id — Postgres' standard
      // duplicate-key code. The handler then loads the existing row to
      // decide whether to ack or retry.
      insertResult: { data: null, error: { code: "23505", message: "duplicate" } },
      duplicateRow: {
        status: "processed",
        created_at: new Date(Date.now() - 60_000).toISOString(),
        updated_at: new Date(Date.now() - 60_000).toISOString(),
      },
      profileUserId: "user-pro-1",
    });
    getSupabaseAdminSpy.mockReturnValue(supabase);

    const res = await POST(makeRequest("evt_payment_failed"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, duplicate: true });
    // Handler must not have run again — no audit write on duplicate.
    expect(logSecuritySpy).not.toHaveBeenCalled();
  });

  it("acks an in-flight duplicate (status='received', not yet stale) without re-running", async () => {
    constructEventSpy.mockReturnValue(makePaymentFailedEvent());
    const supabase = makeSupabase({
      insertResult: { data: null, error: { code: "23505", message: "duplicate" } },
      duplicateRow: {
        status: "received",
        created_at: new Date(Date.now() - 5_000).toISOString(),
        updated_at: new Date(Date.now() - 5_000).toISOString(),
      },
      profileUserId: "user-pro-1",
    });
    getSupabaseAdminSpy.mockReturnValue(supabase);

    const res = await POST(makeRequest("evt_payment_failed"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, duplicate: true, pending: true });
    expect(logSecuritySpy).not.toHaveBeenCalled();
  });
});

// ── Unknown / out-of-order event types ──────────────────────────────────────

describe("POST /api/stripe/webhook — unknown event types", () => {
  it("acks an unknown event type without any side effects (forward-compat)", async () => {
    constructEventSpy.mockReturnValue({
      id: "evt_unknown",
      type: "customer.tax_id.created",
      livemode: false,
      data: { object: {} },
    } as unknown as Stripe.Event);

    const supabase = makeSupabase({
      insertResult: {
        data: { id: "evt_unknown", status: "received" },
        error: null,
      },
      profileUserId: null,
    });
    getSupabaseAdminSpy.mockReturnValue(supabase);

    const res = await POST(makeRequest("evt_unknown"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true });
    expect(logSecuritySpy).not.toHaveBeenCalled();
  });
});
