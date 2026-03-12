# Phase 8: Deploy & Polish - Research

**Researched:** 2026-03-11
**Domain:** Vercel deployment, visual redesign, PWA, production hardening
**Confidence:** HIGH

## Summary

Phase 8 transforms a fully-featured local Next.js 16 app into a production-deployed, visually polished product on Vercel. The technical surface area spans six distinct domains: (1) GitHub repo creation and CI/CD via Vercel, (2) Turso production database setup with data migration, (3) Google OAuth production publishing, (4) Sentry error monitoring, (5) a comprehensive visual redesign to a Vercel/Stripe-inspired aesthetic, and (6) PWA support with service worker and manifest.

The app already uses `@libsql/client` for Turso, Auth.js v5 with JWT strategy, Tailwind CSS v4 with CSS variables, and shadcn components -- all of which are Vercel-native patterns. The deployment itself is straightforward (push to GitHub, connect to Vercel). The larger effort is the visual overhaul (new color palette, gradient headers, card/table restyling, sign-in page redesign, OG image, favicon set) and the supporting production infrastructure (Sentry, security headers, PWA, bundle analysis).

**Primary recommendation:** Structure this phase as infrastructure-first (GitHub repo, Vercel deploy, Turso production DB, env vars, Google OAuth publish) followed by visual redesign waves, then PWA/performance polish last. Get a working production URL early so visual changes can be verified on real infrastructure.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Create separate public GitHub repo named `internship-command-center` (fresh start, no parent git history)
- Include `.planning/` directory in repo (portfolio documentation)
- Extra-cautious `.gitignore`: node_modules, .next, .env*.local, data/*.db, .DS_Store, *.sqlite, coverage/, .vercel/, etc.
- README with screenshots -- professional portfolio piece
- Auto-deploy from main branch = production deploy; preview deploys for feature branches
- Vercel-only CI -- no GitHub Actions; Vercel's `next build` catches type/build errors
- Serverless functions region: US East (iad1)
- Default `.vercel.app` URL -- no custom domain
- Auth.js login page is sufficient access control
- Publish Google OAuth app from Testing to Production mode
- Add Vercel production URL to Google Cloud Console redirect URIs after first deploy (manual step)
- Essential security headers only: X-Frame-Options, X-Content-Type-Options, Referrer-Policy in next.config.ts
- npm audit fix -- resolve easy issues, skip major version bumps
- ALLOWED_EMAILS moved to env var (comma-separated) -- both local and production
- Add Sentry for production error tracking
- Create Turso production database (account + database setup in plan)
- Schema migration via `drizzle-kit push` -- Drizzle schema as source of truth
- Data migration script: reads local SQLite, inserts all tables into Turso production
- Turso built-in point-in-time recovery for backups
- Local dev keeps `file:./data/internship.db` -- production uses Turso URL
- `.env.example` file with all required vars and comments
- Basic PWA: manifest.json + service worker for home screen install
- Custom gradient app icon -- blue-violet tones
- Full favicon set: favicon.ico, apple-touch-icon-180x180, favicon-32x32, favicon-16x16
- Visual redesign: Vercel/Stripe-inspired -- light backgrounds with bold blue-violet gradients, smooth animations, premium feel
- Light mode as default (dark mode still available via toggle)
- Full visual overhaul -- sidebar, header, content, cards, tables, modals, everything
- Gradient headers on each page with title and subtitle
- Dashboard: "Welcome home" feel with greeting banner, hero stats, spaced-out cards
- Tracker: both table and card grid views with toggle
- Gradient accents + background shapes (circles, blobs) AND illustrations for empty states
- Branded sign-in page with app logo, name, tagline
- Full Open Graph setup with custom 1200x630 OG image
- Use `next/image` where applicable
- `@next/bundle-analyzer` for build size visibility
- Dashboard < 2s load target
- Run `next build` + `eslint` locally before first push
- Vercel instant rollback for deployment issues

### Claude's Discretion
- Caching strategy specifics (ISR, unstable_cache, or none)
- Empty state illustration style (SVG vs icon-based)
- Exact gradient/color values within the blue-violet palette
- Sentry configuration details
- Service worker caching strategy for PWA
- Bundle analysis threshold decisions
- Specific security header values

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPLOY-01 | Vercel deployment with auto-deploy from GitHub on push | GitHub repo setup, Vercel project connection, vercel.json config, region setting |
| DEPLOY-02 | Preview deploys per branch | Vercel default behavior -- preview deploys are automatic for non-production branches |
| DEPLOY-03 | All environment variables configured in Vercel (Turso, Google OAuth, Claude API, Tavily API) | Vercel dashboard env var setup, Turso production DB creation, Google OAuth redirect URI update |
| DEPLOY-04 | App accessible from any device (laptop, phone, school computer) | PWA manifest, service worker, responsive design (already done), favicon set |
| DEPLOY-05 | Performance: dashboard loads in < 2 seconds on Vercel | Bundle analyzer, iad1 region selection, existing Promise.all() parallelization, optional caching |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.1.6 | App framework | Already installed, Vercel-native |
| @libsql/client | ^0.17.0 | Turso DB driver | Already installed, same driver local + production |
| drizzle-orm | ^0.45.1 | ORM | Already installed, schema as source of truth |
| next-auth | ^5.0.0-beta.30 | Authentication | Already installed, JWT strategy |
| motion | ^12.35.2 | Animations | Already installed, for visual overhaul animations |
| next-themes | ^0.4.6 | Theme toggle | Already installed, light/dark mode |
| tailwindcss | ^4 | Styling | Already installed, CSS variable palette swap |

### New Dependencies
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @sentry/nextjs | latest | Error monitoring | Production error tracking with stack traces |
| @next/bundle-analyzer | latest | Bundle analysis | Build size visibility, run with ANALYZE=true |

### No External Dependencies Needed
| Problem | Solution |
|---------|----------|
| PWA manifest | Next.js built-in `manifest.ts` or static `manifest.json` in app directory |
| Service worker | Manual `public/sw.js` file -- minimal caching strategy, no library needed |
| OG image | Next.js built-in `opengraph-image.tsx` file convention or static image file |
| Security headers | `next.config.ts` headers() function -- built-in Next.js feature |

**Installation:**
```bash
npm install @sentry/nextjs @next/bundle-analyzer
```

## Architecture Patterns

### New Files Structure
```
internship-command-center/
├── .env.example                    # All env vars with comments
├── .gitignore                      # Extra-cautious (already good, minor additions)
├── README.md                       # Portfolio-quality with screenshots
├── next.config.ts                  # + security headers, Sentry, bundle analyzer
├── sentry.client.config.ts         # Sentry browser init
├── sentry.server.config.ts         # Sentry Node.js init
├── sentry.edge.config.ts           # Sentry edge init
├── src/
│   ├── instrumentation.ts          # Sentry instrumentation hook
│   ├── app/
│   │   ├── manifest.ts             # PWA manifest (or manifest.json in public/)
│   │   ├── opengraph-image.tsx     # Dynamic OG image generation (or static .png)
│   │   ├── global-error.tsx        # Sentry error boundary
│   │   ├── layout.tsx              # + manifest link, meta tags, OG tags, theme changes
│   │   ├── globals.css             # New color palette (blue-violet), light mode defaults
│   │   ├── sign-in/page.tsx        # Redesigned branded sign-in
│   │   └── [all existing routes]   # Visual overhaul applied
│   └── components/
│       └── [existing + restyled]   # Gradient headers, card redesigns, etc.
├── public/
│   ├── sw.js                       # Service worker
│   ├── favicon.ico                 # 48x48 multi-size
│   ├── favicon-16x16.png           # 16x16
│   ├── favicon-32x32.png           # 32x32
│   ├── apple-touch-icon.png        # 180x180
│   ├── icon-192.png                # PWA icon
│   ├── icon-512.png                # PWA icon (splash)
│   └── og-image.png                # 1200x630 (if using static OG image)
└── scripts/
    └── migrate-to-turso.ts         # Data migration: local SQLite -> Turso production
```

### Pattern 1: Vercel Deployment Flow
**What:** Push to GitHub -> Vercel auto-deploys
**When:** Every push to main = production, every branch push = preview
**Steps:**
1. Create GitHub repo `internship-command-center`
2. Initialize fresh git, copy files (excluding .env, data/, node_modules)
3. Push to GitHub
4. Connect repo to Vercel via dashboard or `vercel` CLI
5. Set region to `iad1` (US East)
6. Add all env vars in Vercel dashboard
7. First deploy triggers automatically

### Pattern 2: Security Headers in next.config.ts
**What:** Essential security headers via Next.js config
**Example:**
```typescript
// next.config.ts
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

### Pattern 3: CSS Variable Palette Swap for Visual Redesign
**What:** Change the entire app's look by swapping CSS custom properties
**Why:** The app already uses shadcn's CSS variable system via oklch colors in globals.css
**Example:**
```css
/* Light mode (new default) - blue-violet accent palette */
:root {
  --radius: 0.625rem;
  --background: oklch(0.985 0.002 280);       /* near-white with slight violet tint */
  --foreground: oklch(0.15 0.02 280);          /* near-black */
  --primary: oklch(0.55 0.25 275);             /* blue-violet */
  --primary-foreground: oklch(0.98 0 0);       /* white text on primary */
  /* ... rest of palette */
}

/* Dark mode preserved */
.dark {
  --background: oklch(0.12 0.02 280);
  --foreground: oklch(0.95 0 0);
  --primary: oklch(0.65 0.25 275);
  /* ... */
}
```

### Pattern 4: PWA Manifest via Next.js Built-in
**What:** Use Next.js App Router manifest.ts file convention
**Example:**
```typescript
// src/app/manifest.ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Internship Command Center',
    short_name: 'ICC',
    description: 'Your internship command center',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f7ff',
    theme_color: '#6d28d9',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
```

### Pattern 5: OG Image via Next.js File Convention
**What:** Static or dynamic OG image using Next.js opengraph-image convention
**Option A (static):** Place `opengraph-image.png` (1200x630) in `src/app/` directory
**Option B (dynamic):** Create `src/app/opengraph-image.tsx` using ImageResponse from `next/og`
**Recommendation:** Static image is simpler and sufficient for a single-app portfolio project. Create a branded 1200x630 PNG with app name, tagline, and gradient background.

### Pattern 6: Turso Production Database Setup
**What:** Create production Turso DB, push schema, migrate data
**Steps:**
```bash
# 1. Install Turso CLI (if not already)
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Login to Turso
turso auth login

# 3. Create production database
turso db create internship-command-center --location iad1

# 4. Get connection URL and token
turso db show internship-command-center --url
turso db tokens create internship-command-center

# 5. Push schema to production DB
TURSO_DATABASE_URL=<production-url> TURSO_AUTH_TOKEN=<token> npx drizzle-kit push

# 6. Run data migration script
npx tsx scripts/migrate-to-turso.ts
```

### Pattern 7: Data Migration Script
**What:** Script that reads local SQLite and inserts into Turso production
**Example:**
```typescript
// scripts/migrate-to-turso.ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/db/schema';

const localDb = drizzle(createClient({ url: 'file:./data/internship.db' }));
const prodDb = drizzle(createClient({
  url: process.env.TURSO_PROD_URL!,
  authToken: process.env.TURSO_PROD_TOKEN!,
}));

// Read all tables from local, insert into production
// Order matters for foreign keys: applications first, then dependent tables
```

### Anti-Patterns to Avoid
- **Committing .env files:** The .gitignore already blocks `.env*` but verify before first push
- **Pushing local SQLite DB:** Ensure `data/` and `*.sqlite` are gitignored
- **Hardcoding production URLs:** All URLs must come from environment variables
- **Using `drizzle-kit migrate` when `push` is decided:** CONTEXT.md explicitly chose `drizzle-kit push` for simplicity
- **Force-setting dark theme in layout.tsx:** Currently `forcedTheme="dark"` -- must be removed for light mode default
- **Forgetting AUTH_TRUST_HOST:** Must be set to `true` in Vercel env vars for Auth.js behind Vercel's proxy

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error monitoring | Custom error logging | @sentry/nextjs | Stack traces, source maps, alerting, breadcrumbs |
| Bundle analysis | Manual size checking | @next/bundle-analyzer | Visual treemap, automatic report generation |
| PWA manifest | Manual link tags | Next.js manifest.ts file convention | Auto-generates manifest link in head |
| OG meta tags | Manual meta tags in head | Next.js metadata API | Type-safe, auto-generates all required tags |
| Service worker registration | Complex SW lifecycle management | Simple public/sw.js + manual register | Basic caching is all that's needed for home screen install |
| Color palette | Manual hex/rgb values everywhere | CSS custom properties (oklch) | Single source of truth, theme-aware |
| Favicon generation | Manual resizing | Generate from single SVG source | Consistent across all sizes |

**Key insight:** Next.js 16 has built-in support for manifest, OG images, and metadata -- no external packages needed for any of these. The only new packages are Sentry (complex enough to warrant a library) and bundle-analyzer (Vercel's official tool).

## Common Pitfalls

### Pitfall 1: AUTH_TRUST_HOST Not Set
**What goes wrong:** Auth.js fails in production with CSRF errors because Vercel proxies requests
**Why it happens:** Auth.js needs to trust the host header when behind a reverse proxy
**How to avoid:** Set `AUTH_TRUST_HOST=true` in Vercel environment variables
**Warning signs:** Sign-in redirects fail or return CSRF token errors

### Pitfall 2: Google OAuth Redirect URI Mismatch
**What goes wrong:** Google OAuth returns "redirect_uri_mismatch" error in production
**Why it happens:** The Vercel production URL must be added to Google Cloud Console's authorized redirect URIs
**How to avoid:** After first deploy, add `https://<app>.vercel.app/api/auth/callback/google` to Google Cloud Console
**Warning signs:** OAuth flow fails only in production, works locally

### Pitfall 3: Google OAuth Testing Mode Token Expiry
**What goes wrong:** Users get signed out after 7 days, refresh tokens stop working
**Why it happens:** Google OAuth apps in "Testing" mode have 7-day refresh token expiry
**How to avoid:** Publish the OAuth app to "Production" mode in Google Cloud Console before deploying. For internal-use apps with sensitive scopes (Gmail, Calendar), this may require verification or choosing "Internal" user type if using a Google Workspace account.
**Warning signs:** Auth works initially but breaks after a week

### Pitfall 4: Turso Auth Token Not Set for Production
**What goes wrong:** Database queries fail with authentication errors
**Why it happens:** Local dev uses `file:./data/internship.db` (no token needed), but Turso cloud requires auth token
**How to avoid:** Set both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel env vars
**Warning signs:** 500 errors on any page that queries the database

### Pitfall 5: forcedTheme="dark" Blocks Light Mode
**What goes wrong:** Light mode toggle does not work despite changing CSS variables
**Why it happens:** Current layout.tsx has `forcedTheme="dark"` on ThemeProvider, which overrides all theme switching
**How to avoid:** Remove `forcedTheme="dark"`, change `defaultTheme` to `"light"`, update `<html className="dark">` to remove hardcoded dark class
**Warning signs:** Theme toggle visually changes but colors don't update

### Pitfall 6: Toaster Theme Hardcoded to Dark
**What goes wrong:** Toast notifications appear in dark theme even in light mode
**Why it happens:** Current layout.tsx has `<Toaster theme="dark" .../>` hardcoded
**How to avoid:** Change to `theme="system"` or remove theme prop to follow system/next-themes preference
**Warning signs:** Dark toast popups on light background

### Pitfall 7: Missing NEXTAUTH_URL / AUTH_URL
**What goes wrong:** Auth callbacks redirect to wrong URL or localhost
**Why it happens:** Auth.js auto-detects URL on Vercel when AUTH_TRUST_HOST is true, but only if no conflicting NEXTAUTH_URL is set
**How to avoid:** Do NOT set NEXTAUTH_URL in Vercel env vars -- Auth.js v5 on Vercel auto-detects. Only set AUTH_TRUST_HOST=true
**Warning signs:** Redirect loops or redirects to localhost:3000

### Pitfall 8: Foreign Key Order in Data Migration
**What goes wrong:** Migration script fails with foreign key constraint errors
**Why it happens:** Tables with foreign keys (follow_ups, cover_letters, interview_prep, contacts) reference applications
**How to avoid:** Insert tables in dependency order: applications -> companyResearch -> followUps -> contacts -> coverLetters -> interviewPrep
**Warning signs:** "FOREIGN KEY constraint failed" errors during migration

## Code Examples

### Sentry Configuration (next.config.ts wrapping)
```typescript
// next.config.ts
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  org: "your-org",
  project: "internship-command-center",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
```

### Sentry Client Init
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
});
```

### Sentry Server Init
```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

### Sentry Instrumentation Hook
```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = async (...args: unknown[]) => {
  const Sentry = await import("@sentry/nextjs");
  return (Sentry.captureRequestError as Function)(...args);
};
```

### Global Error Boundary (App Router)
```typescript
// src/app/global-error.tsx
"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html><body>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </body></html>
  );
}
```

### Bundle Analyzer Setup
```typescript
// next.config.ts (alternative pattern if not using Sentry wrapper)
import bundleAnalyzer from "@next/bundle-analyzer";
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});
// Then: ANALYZE=true npm run build
```

### Service Worker (minimal)
```javascript
// public/sw.js
const CACHE_NAME = "icc-v1";
const PRECACHE_URLS = ["/", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
```

### Service Worker Registration (in layout or client component)
```typescript
// Register in a client component or useEffect in layout
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
```

### .env.example
```bash
# === Required for all environments ===

# Turso Database
# Local dev: file:./data/internship.db
# Production: libsql://<db-name>-<org>.turso.io
TURSO_DATABASE_URL=
# Not needed for local file: URLs. Required for Turso cloud.
TURSO_AUTH_TOKEN=

# Auth.js
# Generate with: npx auth secret
AUTH_SECRET=
# Google Cloud Console > Credentials > OAuth 2.0 Client ID
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
# Comma-separated allowed emails
ALLOWED_EMAILS=user@example.com
# Set to true when behind a proxy (Vercel)
AUTH_TRUST_HOST=true

# Anthropic Claude API (cover letters, interview prep, follow-up emails)
ANTHROPIC_API_KEY=

# Tavily API (company research)
TAVILY_API_KEY=

# === Optional ===

# Sentry (production error monitoring)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-pwa package | Built-in manifest.ts + manual SW | Next.js 13+ (App Router) | No external dependency needed |
| Manual OG meta tags | opengraph-image.tsx file convention | Next.js 13.3+ | Type-safe, auto-generated |
| @vercel/og separate package | next/og built into Next.js | Next.js 14+ | No separate install needed |
| forcedTheme for single theme | defaultTheme + CSS variable swap | Always available | Allows runtime switching |
| next.config.js (CommonJS) | next.config.ts (TypeScript) | Next.js 15+ | Type-safe config |

**Important notes for this project:**
- `forcedTheme="dark"` in layout.tsx MUST be removed to enable the light mode default
- The `<html className="dark">` hardcoded class MUST be removed
- `<Toaster theme="dark" .../>` MUST change to `theme="system"`

## Open Questions

1. **Google OAuth Verification for Sensitive Scopes**
   - What we know: The app uses Gmail and Calendar scopes (sensitive/restricted). Publishing from Testing to Production may trigger Google's verification process.
   - What's unclear: Whether a personal-use app with restricted scopes can skip verification by using "Internal" user type (only available for Google Workspace accounts, not personal Gmail).
   - Recommendation: Attempt to publish to Production. If verification is required for personal Gmail OAuth, the app still works -- tokens just expire every 7 days. Document the workaround (re-sign-in weekly) if verification is blocked.

2. **Sentry Free Tier Limits**
   - What we know: Sentry offers a free Developer tier with limited events/month
   - What's unclear: Exact current limits for the free plan
   - Recommendation: Sign up for free tier. For a single-user app, free tier is more than sufficient. Set low sample rates (0.1 for traces) to stay within limits.

3. **OG Image: Static vs Dynamic**
   - What we know: Both approaches work. Static is a PNG file, dynamic uses ImageResponse.
   - Recommendation: Use a static 1200x630 PNG with the app branding. Simpler, no runtime cost, and the OG image content never changes. Can be created as an SVG first, then exported to PNG.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | Vercel auto-deploy from GitHub | manual-only | N/A -- verify via Vercel dashboard after push | N/A |
| DEPLOY-02 | Preview deploys per branch | manual-only | N/A -- create test branch, verify preview URL appears | N/A |
| DEPLOY-03 | All env vars configured | smoke | `curl -s https://<app>.vercel.app/api/auth/providers` | N/A |
| DEPLOY-04 | App accessible from any device | manual-only | N/A -- open production URL on phone/laptop | N/A |
| DEPLOY-05 | Dashboard < 2s load | smoke | `curl -o /dev/null -s -w '%{time_total}' https://<app>.vercel.app/` | N/A |

### Additional Validation
| Check | Type | Command |
|-------|------|---------|
| Build succeeds | automated | `npm run build` |
| Lint passes | automated | `npm run lint` |
| Existing tests pass | automated | `npx vitest run` |
| Security headers present | smoke | `curl -I https://<app>.vercel.app/ \| grep -i x-frame` |
| PWA manifest accessible | smoke | `curl -s https://<app>.vercel.app/manifest.webmanifest` |
| OG image accessible | smoke | `curl -s -o /dev/null -w '%{http_code}' https://<app>.vercel.app/opengraph-image` |

### Sampling Rate
- **Per task commit:** `npm run build && npm run lint`
- **Per wave merge:** `npx vitest run && npm run build`
- **Phase gate:** Full suite green + production URL accessible + all smoke checks pass

### Wave 0 Gaps
- None -- existing test infrastructure covers all automated checks. Phase 8 requirements are primarily deployment/infrastructure that require manual verification against the live production URL.

## Sources

### Primary (HIGH confidence)
- [Vercel docs: Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) -- deployment, env vars, regions
- [Vercel docs: Environment Variables](https://vercel.com/docs/environment-variables) -- scoping, dashboard setup
- [Next.js docs: PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) -- built-in manifest support
- [Next.js docs: Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) -- file conventions
- [Next.js docs: Security headers](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers) -- headers() config
- [Sentry docs: Next.js setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/) -- @sentry/nextjs configuration
- [Drizzle docs: Turso setup](https://orm.drizzle.team/docs/tutorials/drizzle-with-turso) -- drizzle-kit push workflow
- [Drizzle docs: drizzle-kit push](https://orm.drizzle.team/docs/drizzle-kit-push) -- push vs migrate

### Secondary (MEDIUM confidence)
- [Google OAuth production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance) -- publishing from Testing to Production
- [Google Cloud: Manage App Audience](https://support.google.com/cloud/answer/15549945) -- test vs production mode
- [@next/bundle-analyzer npm](https://www.npmjs.com/package/@next/bundle-analyzer) -- setup and usage

### Tertiary (LOW confidence)
- Sentry free tier limits -- not verified against current pricing page, may have changed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries already installed, only adding Sentry + bundle-analyzer
- Architecture: HIGH -- Vercel + Next.js deployment is well-documented, patterns are standard
- Visual redesign: HIGH -- CSS variable swap approach is proven, shadcn already uses this pattern
- Pitfalls: HIGH -- common deployment gotchas are well-documented, AUTH_TRUST_HOST and OAuth redirect URI issues are known
- PWA: MEDIUM -- basic PWA is straightforward, but service worker caching strategies have nuances
- Google OAuth verification: LOW -- unclear if sensitive scopes on personal Gmail account require verification

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable domain, 30 days)
