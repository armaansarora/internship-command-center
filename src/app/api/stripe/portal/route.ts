import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { createOrRetrieveCustomer, createBillingPortalSession } from "@/lib/stripe/server";
import { log } from "@/lib/logger";

export async function POST(): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const rate = await withRateLimit(user.id);
  if (rate.response) return rate.response;
  const email = user.email ?? "";

  try {
    const customerId = await createOrRetrieveCustomer(user.id, email);
    const url = await createBillingPortalSession(customerId);
    return NextResponse.json({ url }, { headers: rate.headers });
  } catch (err) {
    log.error("stripe.portal.create_session_failed", err, { userId: user.id });
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500, headers: rate.headers },
    );
  }
}
