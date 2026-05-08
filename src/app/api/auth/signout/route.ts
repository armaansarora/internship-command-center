import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { log } from "@/lib/logger";
import { withSupabaseAuthTimeout } from "@/lib/auth/supabase-auth-errors";

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();

  // Tier C: side-effectful op, 5 rpm. We need the user's id BEFORE sign-out
  // so we can still rate-limit by user identity (a malicious loop of signouts
  // without a user would just bounce off the `getUser` nullcheck below).
  const userId = await readUserIdForRateLimit(supabase);

  if (userId) {
    const rate = await withRateLimit(userId, "C");
    if (rate.response) return rate.response;
  }

  await signOutBestEffort(supabase, userId);

  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/lobby`, { status: 302 });
  clearSupabaseAuthCookies(response, request);
  return response;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function readUserIdForRateLimit(
  supabase: SupabaseServerClient,
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await withSupabaseAuthTimeout(supabase.auth.getUser());
    return user?.id ?? null;
  } catch (err) {
    log.warn("auth.signout.get_user_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

async function signOutBestEffort(
  supabase: SupabaseServerClient,
  userId: string | null,
): Promise<void> {
  try {
    await withSupabaseAuthTimeout(supabase.auth.signOut());
  } catch (err) {
    log.warn("auth.signout.supabase_failed", {
      userId: userId ?? "unknown",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function clearSupabaseAuthCookies(response: NextResponse, request: Request): void {
  const baseName = getSupabaseAuthCookieBaseName();
  if (!baseName) return;

  const names = new Set<string>([baseName]);
  for (let i = 0; i < 5; i += 1) {
    names.add(`${baseName}.${i}`);
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name?.startsWith(baseName)) names.add(name);
  }

  for (const name of names) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
}

function getSupabaseAuthCookieBaseName(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const projectRef = new URL(url).hostname.split(".")[0] ?? "localhost";
    return `sb-${projectRef}-auth-token`;
  } catch {
    return null;
  }
}
