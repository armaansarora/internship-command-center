import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/**
 * Read a required env var with a readable error if it's missing. Replaces the
 * old `process.env.X!` non-null assertions which crashed with a cryptic
 * `TypeError: Cannot read properties of undefined`. Once Agent 3 lands the
 * full Zod-parsed `@/lib/env` module that covers PUBLISHABLE_KEY, swap these
 * reads for `env.X`.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    },
  );
}

/**
 * Get the current authenticated user. Returns null if not authenticated.
 *
 * Wrapped in React's `cache()` so that multiple calls within a single
 * request (e.g. layout.getUser + page.requireUser → getUser) are deduped
 * to a single Supabase auth.getUser() round-trip. Per audit C5, this saves
 * 80-200 ms TTFB on every authenticated page render.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/**
 * Require authentication. Redirects to /lobby if not authenticated.
 * Use in Server Components and Server Actions.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect("/lobby");
  }
  return user;
}
