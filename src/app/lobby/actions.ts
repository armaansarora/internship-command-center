"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action: initiate Google OAuth sign-in.
 *
 * Performance: by living server-side, this avoids shipping the entire
 * `@supabase/supabase-js` browser client (~206 KB) to the public /lobby
 * route. Replaces the previous client-side `supabase.auth.signInWithOAuth`
 * call. Per audit C1.
 *
 * The action redirects to the OAuth provider URL returned by Supabase.
 * If the provider call fails, the action redirects back to /lobby with
 * an `error` query parameter so the client can surface the message.
 */
export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createClient();

  // Derive the absolute origin (works in Vercel preview / prod / local)
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data?.url) {
    const message = encodeURIComponent(error?.message ?? "Sign-in failed");
    redirect(`/lobby?error=${message}`);
  }

  redirect(data.url);
}
