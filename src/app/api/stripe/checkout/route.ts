import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { createCheckoutSession } from "@/lib/stripe/server";
import { STRIPE_PLANS } from "@/lib/stripe/config";
import { log } from "@/lib/logger";
import { z } from "zod";

const VALID_PRICE_IDS: ReadonlySet<string> = new Set(
  Object.values(STRIPE_PLANS).map((plan) => plan.priceId)
);

const CheckoutSchema = z.object({
  priceId: z
    .string()
    .min(1)
    .refine((value) => VALID_PRICE_IDS.has(value), "Unknown priceId"),
});

export async function POST(request: Request): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const rate = await withRateLimit(user.id);
  if (rate.response) return rate.response;

  const body: unknown = await request.json();
  const parsed = CheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers: rate.headers },
    );
  }

  const { priceId } = parsed.data;
  const email = user.email ?? "";

  try {
    const url = await createCheckoutSession(user.id, email, priceId);
    return NextResponse.json({ url }, { headers: rate.headers });
  } catch (err) {
    log.error("stripe.checkout.create_session_failed", err, { userId: user.id });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500, headers: rate.headers },
    );
  }
}
