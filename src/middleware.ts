export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    "/((?!sign-in|api/auth|_next/static|_next/image|favicon|apple-touch-icon|manifest|sw|workbox|sentry).*)",
  ],
};
