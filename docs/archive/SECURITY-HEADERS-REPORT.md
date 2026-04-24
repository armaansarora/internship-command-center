# Security Headers Report — R0

**Date:** 2026-04-22
**Scanner:** `SECURITY_SCAN_URL=https://<target> npx tsx scripts/check-security-headers.ts`
**Target grade:** A on securityheaders.com

## Current headers (production, per `next.config.ts`)

| Header | Value |
|---|---|
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (2 years) |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(self), geolocation=()` |
| Content-Security-Policy-Report-Only | (full policy — see `next.config.ts`) |

## Why CSP is Report-Only (not enforced yet)

The initial CSP is broad on purpose — `'unsafe-inline'`/`'unsafe-eval'` for scripts and styles are required for Next.js development bootstrap, Tailwind JIT, and GSAP runtime. Shipping it as `-Report-Only` for the first release cycle lets us observe real violations in the browser console without breaking the luxury UI.

## Next step (R-polish, not R0)

After two consecutive weeks of clean Report-Only observations in production:
1. In `next.config.ts`, change the header key from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.
2. Re-scan. Confirm grade stays A.
3. Tighten script-src to replace `'unsafe-inline'`/`'unsafe-eval'` with nonces once Next.js 16's middleware-nonce pattern is wired in.

## Scanner exit codes

- `0` — all required headers present, CSP (any mode) present. Grade A achievable.
- `1` — at least one required header missing, or no CSP. Grade will drop to B or below.
- `2` — the curl itself failed (network, DNS, etc.).

Run in CI on a post-deploy step to gate promotions.
