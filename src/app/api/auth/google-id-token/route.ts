import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { getSafePostAuthPath } from "@/lib/auth/safe-next-path";
import { isEmailAllowedForBeta } from "@/lib/auth/beta-gate";
import { needsLobbyOnboardingAfterAuth } from "@/lib/auth/post-auth-profile";
import { log } from "@/lib/logger";

const GoogleCredentialSchema = z.object({
  credential: z.string().min(1),
  next: z.string().optional().nullable(),
  nonce: z.string().min(1).optional().nullable(),
});

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_request", 400);
  }

  const parsed = GoogleCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalid_request", 400);
  }

  const supabase = await createClient();
  const signInCredentials = {
    provider: "google",
    token: parsed.data.credential,
    ...(parsed.data.nonce ? { nonce: parsed.data.nonce } : {}),
  } as const;
  const { data, error } = await supabase.auth.signInWithIdToken(signInCredentials);

  if (error) {
    log.warn("auth.google_id_token.exchange_failed", { error: error.message });
    return jsonError("auth_failed", 401);
  }

  const user = data.user ?? data.session?.user ?? null;
  const email = user?.email ?? null;
  if (!isEmailAllowedForBeta(email)) {
    await supabase.auth.signOut();
    log.warn("auth.google_id_token.beta_gate_denied", {
      domain: email?.split("@")[1] ?? "unknown",
    });
    return jsonError("beta_not_invited", 403);
  }

  if (await needsLobbyOnboardingAfterAuth(supabase, user)) {
    return NextResponse.json({ next: "/lobby" });
  }

  return NextResponse.json({
    next: getSafePostAuthPath(parsed.data.next ?? null),
  });
}
