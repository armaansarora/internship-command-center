import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe/server";
import { z } from "zod";

const CheckoutSchema = z.object({
  priceId: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  const user = await requireUser();

  const body: unknown = await request.json();
  const parsed = CheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { priceId } = parsed.data;
  const email = user.email ?? "";

  try {
    const url = await createCheckoutSession(user.id, email, priceId);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
