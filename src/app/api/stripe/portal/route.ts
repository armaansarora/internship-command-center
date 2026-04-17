import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require-user";
import { createOrRetrieveCustomer, createBillingPortalSession } from "@/lib/stripe/server";

export async function POST(): Promise<Response> {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const { user } = auth;
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
