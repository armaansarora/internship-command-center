---
phase: 08-deploy-and-polish
plan: 01
subsystem: infra
tags: [sentry, bundle-analyzer, security-headers, env-config, next-config]

requires:
  - phase: 07-smarter-ai-and-networking
    provides: Complete application with all features for production deployment
provides:
  - Production-ready next.config.ts with security headers, Sentry, and bundle analyzer
  - Sentry error monitoring configuration (client, server, edge)
  - Global error boundary with Sentry capture
  - .env.example documenting all required environment variables
  - Hardened .gitignore for production deployment
affects: [08-02, 08-03, 08-04, 08-05, 08-06, 08-07]

tech-stack:
  added: ["@sentry/nextjs@10.43.0", "@next/bundle-analyzer@16.1.6"]
  patterns: ["withSentryConfig + withBundleAnalyzer config wrapping", "DSN-guarded Sentry init", "instrumentation.ts runtime-based Sentry loading"]

key-files:
  created:
    - internship-command-center/.env.example
    - internship-command-center/sentry.client.config.ts
    - internship-command-center/sentry.server.config.ts
    - internship-command-center/sentry.edge.config.ts
    - internship-command-center/src/instrumentation.ts
    - internship-command-center/src/app/global-error.tsx
  modified:
    - internship-command-center/next.config.ts
    - internship-command-center/.gitignore
    - internship-command-center/package.json

key-decisions:
  - "Sentry source map upload disabled when no SENTRY_AUTH_TOKEN for Turbopack compatibility"
  - "Sentry org/project read from env vars (not hardcoded) for portability"
  - "DSN-guarded Sentry.init() so app works without Sentry configured"

patterns-established:
  - "Sentry DSN guard: wrap Sentry.init() in if(DSN) check so monitoring is opt-in"
  - "Config chaining: withSentryConfig(withBundleAnalyzer(nextConfig)) for composable Next.js config"

requirements-completed: [DEPLOY-05]

duration: 3min
completed: 2026-03-11
---

# Phase 08 Plan 01: Production Infrastructure Summary

**Sentry error monitoring, security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy), bundle analyzer, and .env.example with 14 documented environment variables**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T23:50:40Z
- **Completed:** 2026-03-11T23:54:39Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Installed @sentry/nextjs and @next/bundle-analyzer, ran npm audit fix
- Configured security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin)
- Created full Sentry configuration: client, server, edge configs with DSN guards, instrumentation.ts, and global-error.tsx boundary
- Created .env.example with all 14 environment variables documented with comments
- Hardened .gitignore with *.sqlite, .turso/, .sentryclirc entries and .env.example whitelist

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, audit fix, create .env.example and update .gitignore** - `ee50ec8` (chore)
2. **Task 2: Configure Sentry, security headers, and bundle analyzer in next.config.ts** - `994100e` (feat)

## Files Created/Modified
- `internship-command-center/.env.example` - All required and optional env vars with comments
- `internship-command-center/.gitignore` - Production-cautious with *.sqlite, .turso/, .sentryclirc
- `internship-command-center/package.json` - Added @sentry/nextjs and @next/bundle-analyzer
- `internship-command-center/next.config.ts` - Security headers + Sentry + bundle analyzer wrapping
- `internship-command-center/sentry.client.config.ts` - Browser Sentry init with replay on error
- `internship-command-center/sentry.server.config.ts` - Node.js Sentry init
- `internship-command-center/sentry.edge.config.ts` - Edge runtime Sentry init
- `internship-command-center/src/instrumentation.ts` - Runtime-based Sentry loading + request error capture
- `internship-command-center/src/app/global-error.tsx` - Global error boundary with Sentry.captureException

## Decisions Made
- Sentry source map upload disabled when no SENTRY_AUTH_TOKEN -- avoids Turbopack build failures locally while enabling uploads in CI/production with token
- Sentry org/project configured via environment variables rather than hardcoded -- allows different Sentry projects per environment
- Removed deprecated disableLogger and automaticVercelMonitors options from Sentry config

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Sentry Turbopack compatibility**
- **Found during:** Task 2 (Sentry + security headers config)
- **Issue:** withSentryConfig with deprecated options caused build failure -- Turbopack doesn't generate pages-manifest.json that Sentry's build step expects
- **Fix:** Removed deprecated disableLogger and automaticVercelMonitors options, added sourcemaps.disable conditional on missing SENTRY_AUTH_TOKEN
- **Files modified:** internship-command-center/next.config.ts
- **Verification:** `npm run build` succeeds with all routes generated
- **Committed in:** 994100e (Task 2 commit)

**2. [Rule 1 - Bug] Fixed instrumentation.ts type error**
- **Found during:** Task 2 (instrumentation.ts creation)
- **Issue:** `NextConfig` type from "next/server" doesn't exist -- caused tsc --noEmit failure
- **Fix:** Changed onRequestError parameter type to `...args: unknown[]`
- **Files modified:** internship-command-center/src/instrumentation.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 994100e (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for build to succeed. No scope creep.

## Issues Encountered
- npm audit has 4 remaining moderate vulnerabilities in esbuild/drizzle-kit chain -- requires major version bumps, skipped per plan instructions
- Build lock file from previous build needed clearing before rebuild

## User Setup Required
None - no external service configuration required. Sentry is opt-in via env vars.

## Next Phase Readiness
- Production infrastructure layer complete -- security headers, Sentry monitoring, bundle analysis all configured
- Build passes cleanly with all new configurations
- Ready for Plan 02 (Vercel deployment, GitHub repo, Turso production DB)

---
*Phase: 08-deploy-and-polish*
*Completed: 2026-03-11*
