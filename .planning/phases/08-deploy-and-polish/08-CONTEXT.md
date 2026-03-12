# Phase 8: Deploy & Polish - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the internship command center to Vercel as a production-quality deployed app accessible from any device. Includes GitHub repo setup, Vercel deployment with auto-deploy, production environment configuration, visual redesign (Vercel/Stripe-inspired aesthetic), PWA support, and performance optimization. The app goes from a local dev tool to a polished, deployed product.

</domain>

<decisions>
## Implementation Decisions

### GitHub Repository
- Create a separate public GitHub repo named `internship-command-center` (not a subfolder of the parent repo)
- Fresh start — no git history from the parent `Claude Code` repo
- Include `.planning/` directory in the repo (portfolio documentation)
- Extra-cautious `.gitignore`: node_modules, .next, .env*.local, data/*.db, .DS_Store, *.sqlite, coverage/, .vercel/, etc.
- README with screenshots — professional portfolio piece with project description, tech stack, and dashboard screenshots

### Vercel Deployment
- Auto-deploy from main branch = production deploy
- Preview deploys for all feature branches (DEPLOY-02 requirement)
- Vercel-only CI — no GitHub Actions; Vercel's `next build` catches type/build errors
- Serverless functions region: US East (iad1) — closest to NYU/NYC
- Default `.vercel.app` URL — no custom domain for now
- Auth.js login page is sufficient access control — no Vercel password protection

### Google OAuth Production
- Publish Google OAuth app from Testing mode to Production mode — removes 7-day refresh token expiry
- Add Vercel production URL to Google Cloud Console redirect URIs after first deploy (manual step)

### Security Hardening
- Essential security headers only: X-Frame-Options, X-Content-Type-Options, Referrer-Policy in next.config.ts
- npm audit fix — resolve what's easy, skip major version bumps
- ALLOWED_EMAILS moved to env var (comma-separated) — both local dev and production use env var for consistency

### Error Monitoring
- Add Sentry for production error tracking — real-time alerts with stack traces
- Vercel logs as secondary monitoring

### Turso Production Database
- Create Turso production database (account + database setup included in plan)
- Schema migration via `drizzle-kit push` — Drizzle schema as source of truth
- Data migration script: reads local SQLite, inserts all tables (applications, contacts, cover_letters, interview_prep, etc.) into Turso
- Turso built-in point-in-time recovery for backups
- Local dev keeps using `file:./data/internship.db` — production uses Turso URL

### Environment Parity
- `.env.example` file with all required vars and comments explaining where to get each one
- ALLOWED_EMAILS env var used everywhere (local + production)
- Local dev: SQLite file. Production: Turso URL. Same `@libsql/client` driver both ways.

### PWA Setup
- Basic PWA: manifest.json + service worker for home screen install
- Custom gradient app icon — modern, gradient style with blue-violet tones
- Full favicon set: favicon.ico, apple-touch-icon-180x180, favicon-32x32, favicon-16x16

### Visual Redesign — Full Overhaul
- **Aesthetic:** Vercel/Stripe-inspired — light backgrounds with bold blue-violet gradients as accents, smooth animations, premium feel
- **Color palette:** Light mode as default (dark mode still available via toggle). Blue-violet gradient as primary accent color. Move away from dark/techy vibe to elegant and visually rich.
- **Scope:** Full visual overhaul — sidebar, header, content, cards, tables, modals, everything gets the new treatment
- **Gradient headers:** Each page gets a subtle gradient header area with page title and optional subtitle — creates visual rhythm
- **Dashboard:** "Welcome home" feel — greeting banner with gradient, hero stats at top, spaced-out cards with visual accents. Breathes more.
- **Tracker:** Both table view AND card grid view with toggle. Table gets softer borders, gradient row accents, colored chips. Cards show company info with visual richness.
- **Visual elements:** Gradient accents + background shapes (circles, blobs) AND illustrations for empty states and decorative moments
- **Empty states:** Claude's discretion — SVG illustrations or rich icon+text, whichever fits best
- **Sign-in page:** Branded with app logo, name, tagline ("Your internship command center"), and "Sign in with Google" button. Professional first impression.
- **OG meta tags:** Full Open Graph setup with custom 1200x630 OG image for social sharing
- **next/image:** Use where applicable for image optimization

### Performance
- Caching strategy: Claude's discretion — benchmark after deploy, add caching only if needed
- `@next/bundle-analyzer` for build size visibility
- Dashboard < 2s load target (already parallelized with Promise.all())

### Pre-Deploy Checks
- Run `next build` + `eslint` locally before first push — fix any issues found

### Recovery Strategy
- Vercel instant rollback for deployment issues (built-in, one-click)
- Turso built-in point-in-time recovery for database issues

### Claude's Discretion
- Caching strategy specifics (ISR, unstable_cache, or none)
- Empty state illustration style (SVG vs icon-based)
- Exact gradient/color values within the blue-violet palette
- Sentry configuration details
- Service worker caching strategy for PWA
- Bundle analysis threshold decisions
- Specific security header values

</decisions>

<specifics>
## Specific Ideas

- "Vercel/Stripe-like" aesthetic — light backgrounds, bold gradients, smooth animations, premium developer feel
- Blue-violet gradient as the brand color — confident, ambitious energy
- Dashboard should feel like a "welcome home" screen, not a data dump
- Sign-in page tagline: "Your internship command center"
- Tracker needs both table and card grid views — toggle between them
- The whole app should feel pretty, not just functional — more use of images, shapes, colors, decorative elements
- README should be portfolio-quality with screenshots

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `next-themes` already installed — light/dark mode toggle infrastructure exists
- `motion` (Framer Motion) installed — animations for the visual overhaul
- `tailwind-merge` + `class-variance-authority` — variant system for new component styles
- `lucide-react` — icon library for UI elements
- `shadcn` components — base component library to restyle
- `sonner` — toast notifications (keep, just restyle)

### Established Patterns
- Tailwind CSS v4 with CSS variables — can swap color palette via CSS custom properties
- shadcn component system — restyle base components for new aesthetic
- Server components with Suspense boundaries — keep for data fetching
- Server actions with revalidatePath — keep for mutations
- Promise.all() parallelization on dashboard — keep for performance

### Integration Points
- `next.config.ts` — add security headers, PWA config
- `src/app/layout.tsx` — add manifest.json link, meta tags, OG tags
- `src/app/globals.css` — CSS variable palette swap for new colors
- `.env.local` — add SENTRY_DSN, update ALLOWED_EMAILS
- `src/auth.ts` — switch ALLOWED_EMAILS from hardcoded to env var
- New files: manifest.json, service worker, .env.example, migration script

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-deploy-and-polish*
*Context gathered: 2026-03-11*
