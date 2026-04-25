import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
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
const priceToTier: Record<string, SubscriptionTier> = Object.fromEntries(
  (Object.entries(STRIPE_PLANS) as [SubscriptionTier, (typeof STRIPE_PLANS)[SubscriptionTier]][]).flatMap(
    ([tier, plan]) => {
      const entries: [string, SubscriptionTier][] = [[plan.priceId, tier]];
      if (plan.yearlyPriceId) entries.push([plan.yearlyPriceId, tier]);
      return entries;
    },
  ),
);

export function tierFromPriceId(priceId: string): SubscriptionTier {
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
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

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
  const { error } = await supabase
    .from("user_profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

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

  if (tier === "pro" || tier === "team" || tier === "free") {
    return tier;
  }
  return "free";
}
