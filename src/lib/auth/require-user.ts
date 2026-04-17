import type { User } from "@supabase/supabase-js";
import { getUser } from "@/lib/supabase/server";

/**
 * API-route variant of `requireUser`.
 *
 * Returns `{ user }` when authenticated, or `{ response }` — a JSON 401
 * that callers should `return` immediately. Avoids the HTML 307 redirect
 * that `requireUser()` issues, which breaks JSON clients.
 *
 * Usage:
 *   const auth = await requireUserApi();
 *   if ("response" in auth) return auth.response;
 *   const { user } = auth;
 */
export type RequireUserApiResult =
  | { ok: true; user: User }
  | { ok: false; response: Response };

export async function requireUserApi(): Promise<RequireUserApiResult> {
  const user = await getUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json(
        { error: "Authentication required", code: "UNAUTHENTICATED" },
        { status: 401 }
      ),
    };
  }
  return { ok: true, user };
}
