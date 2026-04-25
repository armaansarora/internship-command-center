# Launch-Ready Checklist

**Generated 2026-04-25 after R12 acceptance.** Single source of truth for everything between "code complete" and "users can pay you money."

Worst news first: **the building is built, but nothing user-facing exists outside it.** No `/terms`, no `/privacy`, no `/pricing` page, no marketing landing page, no waitlist form. Lobby is the only unauthenticated route. That's the gap to launch — not engineering, but the surface that earns trust before someone hands you their email.

Sized S/M/L/XL. No time estimates.

---

## §0 — Locked decisions (2026-04-25)

User picked these defaults; everything below this section is updated to reflect them. Tweak any value in `src/lib/launch-config.ts` and the rest of the app picks it up next render.

| # | Decision | Locked value |
|---|---|---|
| 1 | Pricing names | Free / Pro / Team |
| 2 | Pricing prices /mo | $0 / $29 / $79 |
| 3 | Trial | none — Free tier IS the trial |
| 4 | Annual billing | on, **15% off** ($0 / $296 / $806 per year) |
| 5 | Refund policy | no refunds, prorated cancel only |
| 6 | Beta gate | waitlist (admin invites manually) |
| 7 | Free tier app cap | 10 applications |
| 8 | Free tier AI calls/day | 25 |
| 9 | Domain | **interntower.com** (canonical: `https://www.interntower.com`) |
| 10 | Min age | 13 (COPPA threshold; flagged for GDPR-K review if EU is a heavy market) |
| 11 | Governing law | New York (switch to Delaware once incorporated) |
| 12 | Soft-delete window | 30 days |

Brand name remains "The Tower". All emails are now `@interntower.com` (`hello@interntower.com`, `concierge@interntower.com`).

**Annual billing implications:** Stripe yearly priceIds are placeholders (`yearlyPriceId: null`) in `src/lib/stripe/config.ts`. The /pricing toggle renders informational annual pricing today; checkout for annual won't work until you create the prices Stripe-side and paste the IDs. See §4.2 below.

---

## §1 — Business decisions only you can make

These cannot be derived from the codebase. They block legal copy + Stripe live-mode swap.

### 1.1 Pricing — final names, final prices

Currently in `src/lib/stripe/config.ts`: Free (10 apps) / Pro ($29/mo) / Team ($79/mo). Hardcoded in source. Three Stripe products + prices already created on the Stripe side (IDs in config look like live-mode format).

**Decide:**
- Names — keep Free/Pro/Team or rename? "Team" is misleading for a single-player tool; "Power" or "Concierge" reads more honestly.
- Prices — $29/$79 stand? Reference market: Teal $9-19, Huntr free-$15, Simplify free-$30. You're 2-4x most competitors. That can be right (your product is much more) but the price has to be defended in copy.
- Annual vs monthly — only monthly today. Annual at -20% is the standard play. Skip it for V1 unless friction is confirmed.

**Default:** keep Free/Pro/Team and $0/$29/$79 monthly-only for launch. Re-evaluate after first 100 users.

### 1.2 Trial length

No trial logic in the code today. Free tier (10 apps cap) is the de facto trial.

**Decide:** keep free tier as the trial, OR add 14-day Pro trial card-required, OR 7-day Pro trial card-not-required.

**Default:** keep free tier as trial. No card-required friction at signup. Cheapest path, lowest abandonment.

### 1.3 Refund policy

Stripe lets users self-portal-cancel mid-cycle (no refund) by default — you have the portal route already. Industry standard for SaaS at this price: no refunds, prorated cancellation only.

**Default:** "Cancel anytime through Settings → Billing. No refunds for partial months. 30-day money-back if Pro doesn't help you land an interview." That last sentence is a marketing weapon and you can swallow the cost on the few who claim it.

### 1.4 Beta gate vs open signup

`ALLOWED_EMAILS` and `OWNER_USER_ID` env vars exist in production. Suggests there's currently a closed-beta gate.

**Decide:** keep gated for V1 launch (waitlist → invite), OR open public on launch day, OR rolling release (e.g., 50/day off the waitlist via cron).

**Default:** rolling release off a waitlist. Lets you fix things in the first 48h before the firehose hits. Stripe + Supabase Auth fraud signals are weakest on day one.

### 1.5 First-100-user economics

You will lose money per user on Anthropic/OpenAI/Firecrawl on the Free tier. Need to know:
- Hard cap on Free-tier AI calls per day (today: rate limit, not budget cap)
- What happens when Firecrawl's 500 credits/month run out (today: graceful-empty — confirmed safe)
- Anthropic spend cap in console (set or unset?)

**Default:** before launch day, set Anthropic monthly cap to $100 in console. Ship a per-user-per-day AI-calls cap of 50 on Free tier (additive to existing rate limit, surfaced in Settings).

### 1.6 Eligibility / age

You are likely subject to COPPA if anyone under 13 signs up. Even-cleaner: gate on 16+ to dodge GDPR-K issues.

**Default:** "Must be 16+" in TOS, single checkbox at signup. No verification required (industry standard for non-financial SaaS).

---

## §2 — Legal copy (you write or you hire)

These three docs, hosted at three public routes.

### 2.1 Privacy Policy — `/privacy`

Has to cover, specifically:
- **What you collect:** email, OAuth scopes (Google, LinkedIn, Gmail read-only, Calendar), uploaded resumes, all application/contact data the user types in, derived pgvector embeddings.
- **R8 Rolodex consent surface:** the "share contacts for warm intros" toggle. Default off. Revocable in Settings → Networking.
- **R11 cross-user matching consent:** anonymized contact-anchor matching only fires after explicit consent (CURRENT_CONSENT_VERSION=2). Anonymized hashes are computed client-side, raw contact data never crosses user boundaries. Revoking purges the index.
- **Encryption at rest:** OAuth tokens AES-256-GCM, ENCRYPTION_KEY held in Vercel secrets, never in DB rows.
- **Data retention:** soft-delete via `user_profiles.deleted_at`, hard purge via `purge-sweeper` cron at day N. Pick N (default: 30 days).
- **GDPR / CCPA rights:** export (`/api/account/export` already exists) and delete (`/api/account/delete` already exists). State the SLA — 30 days is the legal max, 7 days is the realistic floor.
- **Sub-processors:** Supabase (DB, Auth, Storage), Vercel (hosting), Anthropic (LLM), OpenAI (embeddings, Whisper if voice on), Firecrawl (comp data), Resend (email), Sentry (errors), Stripe (billing). Listed by name with their privacy URLs.
- **Cookies/storage:** sessionStorage for entrance-played flag. No tracking cookies (you don't have analytics yet — see §3.2).
- **Children:** "not directed to under 16, do not use if under 16."

**Size:** L. ~2,500 words. Use Termly or Iubenda free tier to generate the skeleton, then hand-rewrite the R8/R11/encryption sections. Termly's auto-gen will not understand pgvector or anonymized matching.

### 2.2 Terms of Service — `/terms`

- Subscription terms (monthly, auto-renew, self-cancel via portal).
- Refund policy (decision §1.3).
- Acceptable use (no scraping, no ToS violations of LinkedIn/Gmail/etc., no using AI agents to spam recruiters).
- Limitation of liability (standard SaaS template — capped at fees paid in last 12 months).
- Termination (we can ban for AUP violations, you can cancel anytime).
- Governing law (your home state, e.g., California).
- Disclaimer that "this isn't job-search advice and we don't guarantee outcomes."

**Size:** L. ~1,800 words. Termly will get this 90% right.

### 2.3 Acceptable Use Policy — folded into ToS or separate

Specifically: no using The Tower to spam recruiters, no fake applications, no using cross-user matching to scrape connections, no commercial reselling.

**Size:** S. Folded into ToS is fine.

### 2.4 Required: legal review before live

Termly + your hand-edits gets you to "doesn't break the law." A real review (Avvo, LegalZoom, or a startup-friendly local attorney for ~$500) gets you to "wouldn't lose a small claim." For consumer SaaS at $29/mo collecting OAuth-tokens-to-Gmail, this is not optional.

**Default:** generate via Termly free → hand-edit R8/R11/encryption sections → pay one attorney $500-800 for a 1-hour review focused on the OAuth/data-sharing surface. Skip the attorney if you're staying in closed beta indefinitely.

---

## §3 — Ops I can execute (CLI / MCP / agent)

These I can do without touching your business decisions. Most are S.

### 3.1 Sentry — verify it's actually capturing

`@sentry/nextjs@10.45.0` installed. `sentry.{client,server,edge}.config.ts` initialized with `enabled: !!DSN`. `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel production (35 days old).

**Action:** trigger a deliberate error on a non-critical route, confirm it appears in Sentry dashboard. If yes, this is done. If no, debug DSN / sourcemap upload.

**Size:** S.

### 3.2 Analytics — pick one, install it

You currently have no product analytics. Sentry catches errors, not user behavior. You will fly blind on launch day.

**Options:**
- **PostHog** — free up to 1M events/month, self-hostable, session replay, feature flags. Heaviest. Best for "I want to learn from real users."
- **Plausible** — free 30-day trial then $9/mo for 10k pageviews, EU-hosted (privacy-first), no cookies. Lightest. Good for "just tell me traffic + conversion."
- **Vercel Analytics** — already on the platform you use. Cheapest path.

**Default:** Plausible. Cookie-less = simplest privacy policy. $9/mo until you outgrow it. PostHog is overkill until you have product surfaces to A/B test.

**Size:** S to install + add `<script>` tag. No code changes beyond `src/app/layout.tsx`.

### 3.3 Supabase Auth email templates — brand them

Default Supabase confirm/reset/magic-link emails are bland blue-button HTML and say "Supabase" in the footer. Out of character with the building.

**Action via Supabase MCP:** customize the four templates (confirm, magic-link, reset, invite) with Tower copy. Subject line tone: "Welcome to The Tower" / "Your key to The Tower" / "Reset your Tower passphrase" / "You've been issued an access card." Doorman/lobby voice.

**Size:** S. 4 templates, 30 min copy work, ships via MCP `apply_migration` style or dashboard.

### 3.4 Robots.txt + sitemap.xml + metadata

No `public/robots.txt`. No sitemap. Lobby/landing have no Open Graph image.

**Action:** add `src/app/robots.ts` and `src/app/sitemap.ts` (Next.js convention), add `<meta>` Open Graph tags to root layout, generate a 1200×630 OG image (the building skyline rendered at night with the gold accent).

**Size:** M. The OG image is the work — needs to look luxe, not generic.

### 3.5 Cron health monitoring

13 cron jobs in `vercel.json`. Vercel Cron has no native alerting on cron failures. If `match-index` silently fails for a week, you find out from a user complaint.

**Action:** add a `cron_runs` table that every cron writes to (timestamp + success/fail + error_msg), plus a Settings → Admin row for owner_user_id showing last-run-per-cron. Alternative: Sentry cron monitoring (paid, but it's there).

**Default:** ship the `cron_runs` table — Sentry cron monitors are $26/mo and overkill for 13 jobs you can self-monitor.

**Size:** M.

### 3.6 Rate-limit hardening pre-launch

`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. R0 hardening covered the surface. Verify the per-user-per-day AI cap from §1.5 is actually enforced before launch day.

**Size:** S to verify, M if it needs to be added.

### 3.7 CSP from Report-Only to Enforce

`next.config.ts` ships `Content-Security-Policy-Report-Only`. To enforce: rename to `Content-Security-Policy`. But you need to verify zero violations have been logged in production for at least 1 week first.

**Action:** check Vercel logs for `report-only` violations, fix any, then flip the header name.

**Size:** S to flip if clean, M if violations exist.

### 3.8 Apply pending migrations

Per partner-brief, three migrations need to be applied in Supabase Dashboard → SQL Editor:
- `0019_r9_observatory.sql` (rejection_reflections)
- `0020_r10_negotiation_parlor.sql` (offers, comp_bands, etc.)
- `0021_r10_offer_deadline_alerts.sql` (additive deadline_alerts_sent column)

Plus `0022_r11_cross_user_matching.sql` likely too — verify.

**Action via Supabase MCP:** I can apply these. Need your go-ahead since they're prod-impacting.

**Size:** S.

---

## §4 — Ops needing your hand

You alone can do these. Listed in order of "what blocks launch hardest."

### 4.1 Domain — buy + DNS + dependent provider updates

`interntower.com` is the locked domain (canonical: `https://www.interntower.com`). Buy if not owned, then point + update every provider that references the old domain.

**Steps:**
1. Confirm ownership at registrar.
2. In Vercel project → Settings → Domains → add `interntower.com` and `www.interntower.com` (set `www.interntower.com` as primary; apex 301-redirects to it).
3. At registrar, set the records Vercel shows you (typically A 76.76.21.21 for apex + CNAME `cname.vercel-dns.com` for www).
4. Wait for DNS propagation (15 min - 24h). Confirm HTTPS cert auto-provisions.
5. **Vercel env**: set `NEXT_PUBLIC_APP_URL=https://www.interntower.com` in Production, Preview, and Development.
6. **Supabase Dashboard** → Authentication → URL Configuration → Site URL = `https://www.interntower.com`. Add to "Redirect URLs": `https://www.interntower.com/**` and `http://localhost:3000/**`.
7. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs: add `https://www.interntower.com/api/gmail/callback` (and remove the old `thetower.app` entry once propagation is confirmed).
8. **LinkedIn Developer Console** → Auth tab → Authorized redirect URLs: add `https://www.interntower.com/api/auth/linkedin/callback`.
9. **Stripe** → live-mode webhook endpoint → see §4.2.
10. **Resend** → see §4.3.

**Blocking:** without a real domain, Stripe live mode, Google OAuth verification, LinkedIn OAuth, and email-sender domain verification all stay broken.

### 4.2 Stripe products test→live swap (+ annual prices)

Hardcoded IDs in `src/lib/stripe/config.ts` — `prod_UBV...` and `price_1TD...` formats. Verify these are LIVE-mode IDs (Stripe dashboard → toggle test/live, see if these products appear under live).

**Steps:**
1. In Stripe live mode, create three products if they don't exist:
   - **Free** — $0 monthly recurring
   - **Pro** — $29 monthly recurring
   - **Team** — $79 monthly recurring
2. **Add annual prices to Pro and Team** (per locked decision #4 — annual at 15% off):
   - Pro yearly: **$296/year**
   - Team yearly: **$806/year**
   - Stripe Dashboard → product page → "Add another price" → set interval = Yearly
3. Copy the four live `price_*` IDs into `src/lib/stripe/config.ts`:
   - `pro.priceId` (monthly), `pro.yearlyPriceId` (annual)
   - `team.priceId` (monthly), `team.yearlyPriceId` (annual)
   - `free.priceId` (monthly $0)
4. In Vercel → Settings → Environment Variables, confirm `STRIPE_SECRET_KEY` is `sk_live_...` not `sk_test_...`. Same for `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_live_...`).
5. In Stripe live mode, register the webhook endpoint pointing at `https://www.interntower.com/api/stripe/webhook`. Copy the signing secret. Update `STRIPE_WEBHOOK_SECRET` in Vercel.
6. Run a real $0 test purchase end-to-end (ideally on Free tier downgrade path so no real card is charged).

**Blocking (monthly):** test-mode keys silently fail in production for real users. This is the most common launch-day failure for solo SaaS founders.

**Non-blocking (annual):** while `yearlyPriceId` is `null` in the config, the public /pricing toggle still renders informational annual pricing but the checkout flow only accepts monthly. Once you paste real annual price IDs, both work end-to-end with no further code changes — the checkout's `VALID_PRICE_IDS` and the webhook's `priceToTier` mapping already include yearly priceIds when present.

### 4.3 Email sender domain verification — Resend

`RESEND_API_KEY` is set. Resend requires you to verify your sending domain (DKIM + SPF + DMARC records).

**Steps:**
1. In Resend dashboard → Domains → add `interntower.com`.
2. At your registrar, add the three DNS records Resend gives you.
3. Wait for verification.
4. Confirm send-from address is e.g. `concierge@interntower.com` not `onboarding@resend.dev`.

**Blocking:** unverified Resend means transactional emails go to spam, magic-link auth becomes 50% broken.

### 4.4 Google OAuth verification

You're using Gmail + Calendar scopes. Google requires app verification once you cross 100 users — without it, you hit the unverified-app warning screen which kills conversion.

**Steps:**
1. Google Cloud Console → OAuth consent screen → submit for verification.
2. Provide privacy policy URL (must be live).
3. Provide a recorded video walkthrough of how each scope is used.
4. Wait 4-6 weeks.

**Blocking past 100 users.** Not blocking V1 launch if you stay under 100.

### 4.5 LinkedIn OAuth — production app

`LINKEDIN_CLIENT_ID` is set in Vercel. Verify the LinkedIn app is in "Live" status not "Development" — same gotcha as Google.

**Size:** S to check.

### 4.6 Stripe — tax setup

If you're collecting from US states, you may owe sales tax on SaaS in some (CA, TX, NY have specific rules). Stripe Tax handles this for $0.50/transaction.

**Default:** enable Stripe Tax. $0.50/sub is cheaper than your accountant's hour to fix it later.

### 4.7 Legal review

Per §2.4 above. Optional if staying closed-beta, recommended otherwise.

### 4.8 Incorporate (if not already)

If you want to take payments under a business name and protect personal liability, you need an LLC or C-corp. Stripe technically lets sole proprietors collect, but TOS protections rest on the business being a real entity.

**Default for solo founder:** Delaware C-corp via Clerky ($800 + $500 first-year fees) if planning to raise. LLC via your home state ($50-300) if staying solo. Skip if you're explicitly running this as a personal project.

---

## §5 — First-run QA pass (golden path)

Walk this exact path on production with a fresh Gmail account before letting anyone in:

1. **Lobby load** — sky renders, weather hits, doorman idle animation plays.
2. **OAuth signup** — Google + (if testing) LinkedIn. Magic-link too.
3. **Onboarding** — name capture, target role, resume upload (PDF + DOCX).
4. **Penthouse first paint** — check empty states for every widget.
5. **Apply** — add an application via War Room. Verify it persists, status flow works.
6. **Discover** — let CRO Job Discovery cron fire (or trigger manually). Verify jobs land.
7. **Networking** — add a contact via Rolodex. Toggle R8 share-consent ON. Toggle R11 matching consent ON. Verify both surface in audit log.
8. **Interview prep** — schedule a fake interview. Run through CPO drill. Voice toggle on/off.
9. **Offer** — log an offer. Verify Negotiation Parlor door materializes. Run sim.
10. **Settings** — pricing cards visible. Click upgrade to Pro. Stripe checkout opens. Cancel — confirm graceful return.
11. **Account → Export** — verify zip downloads with all your data.
12. **Account → Delete** — verify soft-delete, then hard-purge after the cron runs.
13. **Cross-browser smoke** — Safari + Firefox + iOS Safari at minimum.
14. **Mobile** — every floor on iPhone-sized viewport. The Tower was designed desktop-first. Mobile gaps are likely real.

**Catch-list:** any 500, any console error, any layout break, any text that says "TODO" or "TBD" or "lorem", any link to a `/terms` or `/privacy` that 404s.

**Size:** XL. This is a full afternoon. You do it, not me — only you can spot off-character copy.

---

## §6 — Launch-day plan

### 6.1 Soft launch (recommended)

Before anything public:
1. **Friends-and-family round** — 5-10 people you trust. Hand them invites. Zero marketing. Just watch how they get stuck.
2. **Fix what they break.**
3. **Closed waitlist** — put up a single-page waitlist form (use the Lobby's existing `actions.ts` or a separate `/waitlist` route). Tease via your network.
4. **Roll waitlist** — 25-50/day off the list via a cron that sends invites. This protects against day-one infra surprises.

### 6.2 HN / Show HN draft

Title formula: "Show HN: The Tower – I built an immersive AI command center for my internship search"

Body: 3-4 paragraphs. Lead with the building metaphor (it's the differentiator). Show one screenshot of the lobby + one of the war room. Acknowledge it's solo-built. Close with what you'd love feedback on.

**Don't post until §5 QA is clean.** HN traffic on a broken landing is terminal.

### 6.3 Friend-of-friend distribution

Your network → their network. One email template, one DM template. The product sells itself once someone gets to the penthouse — your job is to get them through the lobby.

### 6.4 Week-1 metrics to watch

- **Activation:** signup → first application logged. Target >50%.
- **Retention:** D1 / D7 return. Target D7 >25%.
- **Conversion:** free → pro. Target 2-5% in week 1, real signal at week 4.
- **Cost per user:** Anthropic + OpenAI + Firecrawl + Vercel / signup count. Target <$2/user.
- **Sentry error rate:** errors / page-views. Target <0.5%.
- **Cron success rate:** target 100% — any failure is a real bug.

If Plausible (§3.2) ships, set up a single dashboard with all six.

### 6.5 Support channel

You need exactly one place users can reach you. Pick one:
- **Email** (`hello@interntower.com`) — simplest, slowest.
- **Intercom-style widget** — Crisp.chat free tier is fine.
- **Discord** — community signal, double-edged.

**Default:** email only for V1. Crisp later if support volume justifies it.

---

## §7 — Open follow-ups from the build

These came up during R0-R12 and weren't strictly launch-blocking but should be tracked:

- **HANDOFF.md option (iii)** — fully deprecate `scripts/session-end.ts`. Partner work, S.
- **Vercel preview env Firecrawl key** — currently set in production + development only (CLI v50 bug). Re-set via Dashboard if/when preview-env-tests need it.
- **GitHub branch protection** — add hardening-e2e workflow as required check on `main`. S.
- **`src/lib/` reorganization** — user-flagged 2026-04-23. Candidates: split into `src/lib/agents/`, `src/lib/ai/`, `src/lib/integrations/`. M.
- **R5.4 mini-phase** — live-compose streaming + pen-glow ink. Deferred from R5. Optional polish, not launch-blocking.
- **R12 §8 stretch expansions** — additional E2E scenarios (security/abuse/concurrency/scale). Optional.

---

## §8 — Suggested order of operations

If launching is the goal, this is the cheapest path:

1. **§1.1, §1.2, §1.3, §1.4, §1.6** — sit down for 30 min, lock the business decisions.
2. **§4.1** — buy + point domain. Without this, half of §4 is blocked.
3. **§3.8** — apply pending Supabase migrations (I can do, with your go-ahead).
4. **§2.1, §2.2** — generate via Termly, hand-edit, push live as `/terms` and `/privacy`.
5. **§4.3** — verify Resend domain.
6. **§4.2** — Stripe live-mode swap.
7. **§3.1, §3.2, §3.3, §3.4** — Sentry verify, Plausible install, Supabase email templates, robots/sitemap/OG. I can do all four in one batch.
8. **§5** — full QA pass. You do this.
9. **§6.1** — friends-and-family round.
10. **§4.7** — legal review (in parallel with §6.1 — reviewer doesn't block your QA).
11. **§3.7** — flip CSP to enforce after week 1 if clean.
12. **§6.2** — HN post.

Steps 1-7 are the real work. 8-12 is execution.

---

## What I need from you to start moving

Pick a starting point. Three options, lightest first:

1. **"Run §3"** — I batch the ops items I can do without touching your decisions. Sentry verify, Plausible install, Supabase email templates, robots/sitemap/OG, cron health table, migrations apply. Comes back in one PR. **Defaults to this.**
2. **"Lock §1"** — you make the 6 business decisions in this thread, I update the relevant config files (`STRIPE_PLANS`, free-tier limits, etc.) and stage the legal-copy skeleton.
3. **"Start §4.1"** — point me at your registrar; we wire up the domain end-to-end.
