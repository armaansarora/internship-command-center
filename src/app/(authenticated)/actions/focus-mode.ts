"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isProd } from "@/lib/env";
import { requireUser } from "@/lib/supabase/server";
import {
  FOCUS_MODE_COOKIE_MAX_AGE,
  FOCUS_MODE_COOKIE_NAME,
  FOCUS_MODE_VALUE_OFF,
  FOCUS_MODE_VALUE_ON,
  parseFocusModeCookie,
} from "@/lib/focus-mode/config";

/**
 * Toggle Focus Mode (Fix #4).
 *
 * Reads the current `tower_focus_mode` cookie, flips its value, writes the
 * new value, and revalidates the authenticated layout so the new prop
 * threads back into WorldShell on the next render.
 *
 * Auth-gated via `requireUser()` — the action only makes sense for
 * signed-in users (the world chrome it toggles is authenticated-only).
 */
export async function toggleFocusMode(): Promise<{ focusMode: boolean }> {
  await requireUser();

  const store = await cookies();
  const current = parseFocusModeCookie(
    store.get(FOCUS_MODE_COOKIE_NAME)?.value,
  );
  const next = !current;

  store.set(
    FOCUS_MODE_COOKIE_NAME,
    next ? FOCUS_MODE_VALUE_ON : FOCUS_MODE_VALUE_OFF,
    {
      path: "/",
      maxAge: FOCUS_MODE_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: false,
      secure: isProd(),
    },
  );

  revalidatePath("/", "layout");

  return { focusMode: next };
}
