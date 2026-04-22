import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Match every path except Next.js internals and static assets.
  // Public vs. protected routing is decided by updateSession's `publicPaths`
  // list — keep this matcher broad; the helper handles the nuance.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|manifest.json|sw.js|workbox-.*|sentry).*)",
  ],
};
