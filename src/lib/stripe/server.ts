import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireEnv, env } from "@/lib/env";
import { STRIPE_PLANS, type SubscriptionTier } from "./config";

// ---------------------------------------------------------------------------
// Lazy-init Stripe SDK
// ---------------------------------------------------------------------------
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const { STRIPE_SECRET_KEY } = requireEnv(["STRIPE_SECRET_KEY"] as const);
    _stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}

// ---------------------------------------------------------------------------
// Price ID → tier name mapping
// ---------------------------------------------------------------------------
type CheckoutTier = Exclude<SubscriptionTier, "team">;

const priceToTier: Record<string, CheckoutTier> = Object.fromEntries(
  (Object.entries(STRIPE_PLANS) as [CheckoutTier, (typeof STRIPE_PLANS)[CheckoutTier]][]).flatMap(
    ([tier, plan]) => {
      const entries: [string, CheckoutTier][] = [];
      if (plan.priceId) entries.push([plan.priceId, tier]);
      if (plan.yearlyPriceId) entries.push([plan.yearlyPriceId, tier]);
      return entries;
    },
  ),
);

export function tierFromPriceId(priceId: string): SubscriptionTier {
  // The Season Pass price id is sourced from env (`STRIPE_SEASON_PASS_PRICE_ID`)
  // because the static STRIPE_PLANS.seasonPass.priceId is empty by design.
  // Check the env-driven id first so webhook deliveries for the one-time SKU
  // map to "seasonPass".
  const seasonPassPriceId = env().STRIPE_SEASON_PASS_PRICE_ID;
  if (seasonPassPriceId && priceId === seasonPassPriceId) {
    return "seasonPass";
  }
  return priceToTier[priceId] ?? "free";
}

// ---------------------------------------------------------------------------
// createOrRetrieveCustomer
// ---------------------------------------------------------------------------
export async function createOrRetrieveCustomer(
  userId: string,
  email: string,
): Promise<string> {
  const supabase = await createClient();

  // Check if we already have a customer ID stored
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (profileError) {
    throw new Error(`Failed to retrieve Stripe customer id: ${profileError.message}`);
  }

  const existingCustomerId = profile?.stripe_customer_id as string | null | undefined;

  if (existingCustomerId) {
    return existingCustomerId;
  }

  // Create a new Stripe customer
  const customer = await getStripe().customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  // Persist the customer ID
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("user_profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to persist Stripe customer id: ${error.message}`);
  }

  return customer.id;
}

// ---------------------------------------------------------------------------
// createCheckoutSession
// ---------------------------------------------------------------------------
export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
): Promise<string> {
  const customerId = await createOrRetrieveCustomer(userId, email);
  const domain = env().NEXT_PUBLIC_APP_URL;

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${domain}/settings?upgrade=success`,
    cancel_url: `${domain}/settings?upgrade=cancelled`,
    metadata: { supabase_user_id: userId },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session.url;
}

// ---------------------------------------------------------------------------
// createSeasonPassCheckoutSession (one-time payment)
// ---------------------------------------------------------------------------
/**
 * Create a Stripe Checkout Session for the Internship Season Pass ($149,
 * one-time). Quantity is hard-capped at 1 — a Season Pass is per-user, not
 * a seat. The caller is responsible for passing the env-driven price id;
 * the route layer enforces "STRIPE_SEASON_PASS_PRICE_ID unset" as a clear
 * operator error.
 */
export async function createSeasonPassCheckoutSession(
  userId: string,
  email: string,
  seasonPassPriceId: string,
): Promise<string> {
  const customerId = await createOrRetrieveCustomer(userId, email);
  const domain = env().NEXT_PUBLIC_APP_URL;

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: seasonPassPriceId, quantity: 1 }],
    success_url: `${domain}/settings?upgrade=success&plan=seasonPass`,
    cancel_url: `${domain}/settings?upgrade=cancelled`,
    metadata: {
      supabase_user_id: userId,
      tier: "seasonPass",
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session.url;
}

// ---------------------------------------------------------------------------
// createBillingPortalSession
// ---------------------------------------------------------------------------
export async function createBillingPortalSession(
  customerId: string,
): Promise<string> {
  const domain = env().NEXT_PUBLIC_APP_URL;

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${domain}/settings`,
  });

  return portalSession.url;
}

// ---------------------------------------------------------------------------
// getSubscriptionTier
// ---------------------------------------------------------------------------
export async function getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  const tier = profile?.subscription_tier as string | null | undefined;

  if (
    tier === "pro" ||
    tier === "team" ||
    tier === "seasonPass" ||
    tier === "free"
  ) {
    return tier;
  }
  return "free";
}
