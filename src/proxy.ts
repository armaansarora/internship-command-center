export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/((?!sign-in|api/auth|api/inngest|_next/static|_next/image|favicon\\.|apple-touch-icon|manifest\\.json|sw\\.js|workbox-|sentry).*)",
  ],
};
