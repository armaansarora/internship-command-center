import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { createOrRetrieveCustomer, createBillingPortalSession } from "@/lib/stripe/server";

export async function POST(): Promise<NextResponse> {
  const user = await requireUser();
  const email = user.email ?? "";

  try {
    const customerId = await createOrRetrieveCustomer(user.id, email);
    const url = await createBillingPortalSession(customerId);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 },
    );
  }
}
