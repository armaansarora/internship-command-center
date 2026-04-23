import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Match every path except Next.js internals, static assets, and well-known
  // bot/monitoring paths. Public vs. protected routing is decided by
  // updateSession's `publicPaths` list — keep this matcher broad; the helper
  // handles the nuance.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-touch-icon.png|manifest.json|sitemap.xml|robots.txt|sw.js|workbox-.*|fonts/|sentry).*)",
  ],
};
