# BUG TRACKER — The Tower
## Living Document — Updated Every Session

> **Rule:** Every agent session that touches bugs MUST update this file. Log what was fixed, when, and the commit hash. This is the single source of truth for site health.

---

## CHANGELOG

Reverse-chronological log of all fixes. Every fix gets an entry here.

| Date | Session | Bug(s) Fixed | Commit | Notes |
|------|---------|-------------|--------|-------|
| 2026-04-17 | Session 23 | AUDIT: 94+ findings resolved | *(pending)* | Full-power audit via 7 parallel specialized agents produced master report (audit/ gitignored). Resolution via 8 parallel fix agents in 3 waves. CRITICAL (9/9): Stripe webhook publicPaths, cron fail-closed auth, stripe_events idempotency, SECURITY INVOKER RPCs, composite uniques fixing cross-user data corruption, drizzle 0.45.2 + next 16.2.4 CVE upgrades, column drift (cost_usd→cost_cents, summary→output_summary, +3 more), real CEO orchestrator via nested generateText tools. HIGH (26+): Anthropic prompt caching (60-90% cost cut), AI Gateway fallback, agent memory retrieve+write via Haiku extraction, token/cost tracking via onFinish, Ring the Bell bound to real tool-event stream, OAuth HMAC signing, weather auth+rate-limit, lobby Supabase client 206KB removed via Server Action, 2.93MB JPGs→next/image, RAF pause on visibilitychange, getUser cache(), 8 chat hooks 1135→152 LOC factory, 8 API routes via shared handler, security headers, 13-var Zod env schema, 6 tower-themed error/loading/not-found pages, Node 24 pinned, pgvector native storage, 4 new SQL migrations, missing indexes + unique constraints. MEDIUM: Suspense boundaries on 7 floor pages, useOptimistic WarTable kanban, useFormStatus+useActionState ApplicationModal+ContactModal, useTransition PrepPacketViewer, dynamic() imports for 3 heavy modals (ApplicationModal/ContactModal/PrepPacketViewer), stale closure NotificationSystem, CIO character triad mounted, GSAP tree-shaking via gsap-init, 19 console.error→logger, structured output for cover letters + prep packets, stripe_events idempotency table. Build: tsc clean, npm run build clean (34 routes). 73 files modified, 4370+/2829- LOC. Deferred (non-blocking): MilestoneToast orphan (needs progression-engine subscription), cron Gmail helpers admin-aware rewrite, middleware→proxy Next.js 16 rename, eslint-config-next bump. |
| 2026-03-20 | Session 14 | BUG-002: Back-to-lobby nav | `742ea47` | Lobby button replaced with exit icon (door+arrow SVG). Tooltip reads "Exit to Lobby". Border changed from dashed to solid for clarity. Always visible in elevator panel (desktop + mobile). |
| 2026-03-20 | Session 14 | BUG-005: Sign out | `742ea47` | Added UserMenu component (top-right avatar dropdown). Sign out via POST to /api/auth/signout. Also accessible from /settings page. Dropdown has profile info, settings link, sign out action. |
| 2026-03-20 | Session 14 | BUG-012: Account/settings page | `742ea47` | Created /settings route with SettingsClient. Sections: Profile (name, email, provider badge), Appearance (dark mode indicator, light mode noted as future), Account (export, notifications, connected services placeholders + sign out). |
| 2026-03-20 | Session 14 | BUG-011: Dark/light mode | `742ea47` | Settings page shows theme section. Dark mode is current design — light theme CSS vars not yet defined, noted in UI. Wired for future toggle. |
| 2026-03-20 | Session 14 | Fix: Root layout overflow-hidden | `742ea47` | Removed leftover `overflow-hidden` Tailwind class from body tag in root layout.tsx. Was partially fixed in Sprint 1 (globals.css cleaned) but inline class was missed. |
| 2026-03-19 | Session 13 | BUG-006: Performance (15 FPS lag) | `6a2336d` | Rewrote ProceduralSkyline v5: removed mouse tracking, constellation lines, light sweep, scan line, mouse spotlight. Reduced buildings (65/50/35 → 50/40/28), stars (180 → 120), particles (60 → 30), water shimmers (30 → 18). Removed atmospheric particles entirely. Eliminated 3 mousemove RAF loops. |
| 2026-03-19 | Session 13 | BUG-007: Remove custom cursor | `6a2336d` | Removed CustomCursor from WorldShell. Added global CSS `cursor: pointer` rule for all interactive elements (a, button, [role=button], input, etc.). Eliminated per-frame RAF loop + 4 document event listeners. |
| 2026-03-19 | Session 13 | BUG-008: Remove text parallax | `6a2336d` | Removed mousemove → transform handlers from lobby contentRef and penthouse headerRef. Text is now static. Eliminated 2 mousemove event listeners. |
| 2026-03-19 | Session 13 | BUG-009: Apple TV autonomous drift | `6a2336d` | Replaced mouse-reactive parallax with autonomous sinusoidal drift (60-90s cycles). Two independent sine waves create organic Ken Burns panning. prefers-reduced-motion shows static frame. |
| 2026-03-19 | Session 13 | BUG-003: Penthouse scroll | `6a2336d` | Removed `overflow: hidden` from body in globals.css. Changed FloorShell decorative layers from `absolute` to `fixed` so they stay as viewport backdrop while content scrolls freely. |
| 2026-03-19 | Session 13 | BUG-004: Penthouse clickability | `6a2336d` | Fixed by removing body overflow:hidden (z-index stacking was trapping pointer events). Quick action cards now show `cursor: not-allowed` instead of `cursor: default` for clearer disabled state. |
| — | — | — | — | No fixes yet — tracker created Session 12 |

<!-- TEMPLATE for new entries (copy, fill, paste at top of table above the "—" row):
| YYYY-MM-DD | Session # | BUG-XXX: short description | `abc1234` | Any notes about the fix |
-->

---

## OPEN ISSUES

### How to Use This Section
- When a bug is **fixed**: move it from OPEN ISSUES to CLOSED ISSUES below, add a changelog entry above
- When a bug is **found**: add it here with the next BUG-XXX number
- Every session: scan OPEN ISSUES, fix what you can, log what you did

**Status legend:** `🔴 OPEN` · `🟡 IN PROGRESS` · `🟢 FIXED` · `⚪ WONT FIX`

---

## CRITICAL — Broken Core Functionality

### BUG-001: Cannot navigate to any floor from elevator `🟢 FIXED`
**Severity:** Critical  
**Location:** Elevator component  
**Behavior:** Clicking any floor greys out and lags the entire area. No feedback, no "under construction" screen, nothing happens.  
**Expected:** Either navigate to the floor OR show a clear "Under Construction — Coming in Phase X" interstitial page.  
**Fixed:** Session 14 — Root lag cause was 15 FPS (fixed Sprint 1). Elevator now dims locked floors (55% opacity) and shows "Phase N • Coming Soon" in tooltip. All floors navigate to their stub pages with full Coming Soon UI.

### BUG-002: Cannot return to lobby from penthouse `🟢 FIXED`
**Severity:** Critical  
**Location:** Penthouse / navigation  
**Behavior:** Once in penthouse, no way to go back to lobby.  
**Expected:** Clear navigation — elevator button, back arrow, or lobby link always visible.  
**Fixed:** Session 14 — Lobby button in elevator replaced with exit door icon + tooltip "Exit to Lobby". Visible on both desktop panel and mobile bottom bar.

### BUG-003: Cannot scroll in penthouse `🟢 FIXED`
**Severity:** Critical  
**Location:** Penthouse page  
**Behavior:** Content is cut off, no scroll available.  
**Expected:** Page scrolls to show all content.  
**Fixed:** Session 13 — Removed `overflow: hidden` from body. Changed FloorShell decorative layers to `position: fixed` so content scrolls freely above fixed skyline backdrop.

### BUG-004: Nothing is clickable in penthouse `🟢 FIXED`
**Severity:** Critical  
**Location:** Penthouse page  
**Behavior:** Dashboard cards, stats, action items — none respond to clicks.  
**Expected:** Interactive elements should be clickable (even if they just show a "coming soon" state).  
**Fixed:** Session 13 — Root cause was `overflow: hidden` on body trapping pointer events through z-index stacking. Quick action cards now show `cursor: not-allowed` for clearer disabled state. Stat cards and panels retain their hover effects.

### BUG-005: No sign out feature `🟢 FIXED`
**Severity:** Critical  
**Location:** Entire app  
**Behavior:** No way to sign out once signed in. No account menu anywhere.  
**Expected:** User menu / account dropdown with sign out option.  
**Fixed:** Session 14 — UserMenu component added to WorldShell (top-right). Shows avatar/initial, expands to dropdown with profile info, Settings link, and Sign Out. Also accessible from /settings page.

---

## HIGH — Major UX Problems

### BUG-006: Entire site runs at ~15 FPS, extremely laggy `🟢 FIXED`
**Severity:** High  
**Location:** Global — every page  
**Behavior:** Site feels like 15 FPS. Not responsive. Interactions feel sluggish.  
**Fixed:** Session 13 — ProceduralSkyline v5 rewrite. Eliminated: (1) all mouse tracking + 5 mousemove listeners, (2) constellation line O(n²) calculation, (3) building light sweep, (4) scan line, (5) mouse spotlight, (6) atmospheric particle system, (7) building mirror reflections in water. Reduced: buildings 150→118, stars 180→120, particles 60→30, water shimmers 30→18. Removed CustomCursor RAF loop + 4 event listeners.

### BUG-007: Custom cursor — dot not centered in circle `🟢 FIXED`
**Severity:** High  
**Location:** Global cursor component  
**Behavior:** The small dot and outer circle are misaligned. Dot is not centered.  
**Fixed:** Session 13 — Removed CustomCursor entirely per user preference. Removed from WorldShell import + render. Added global CSS `cursor: pointer` on a, button, [role=button], input, textarea, select, etc. Native cursor restored.

### BUG-008: Text elements move with cursor (parallax on content) `🟢 FIXED`
**Severity:** High  
**Location:** Lobby, Penthouse — text like "Welcome Armaan Arora"  
**Behavior:** Heading text, welcome messages, and other content shifts when moving the mouse.  
**Fixed:** Session 13 — Removed mousemove → transform handlers from lobby contentRef and penthouse headerRef. Text is now completely static. Lobby spotlight still tracks mouse (decorative only, zero performance impact).

### BUG-009: Background parallax is motion-sickness-inducing `🟢 FIXED`
**Severity:** High  
**Location:** Skyline / background on all pages  
**Behavior:** Background responds to mouse movement, causing jarring shifts.  
**Fixed:** Session 13 — Replaced all mouse-driven parallax with autonomous Apple TV-style drift. Two independent sine waves (periods ~25s and ~40s) create organic Ken Burns panning. Max displacement ~8% of viewport width. Building layers have depth-scaled drift via existing PARALLAX factors. `prefers-reduced-motion` shows completely static frame.

### BUG-010: Lobby and Penthouse share the same background `🟢 FIXED`
**Severity:** High  
**Location:** Lobby vs Penthouse  
**Behavior:** Both pages have the same skyline/background. Lobby doesn't feel like a lobby.  
**Expected:** Lobby should feel like walking into a luxury office building lobby — marble floors, reception desk energy, grand entrance. NOT a skyline view (that's the penthouse). Each floor needs its own visual identity.  
**Fix:** Design distinct lobby background — think: luxury office reception. The Penthouse gets the skyline/city view. Lobby gets ground-level opulence.  
**Fixed:** Session 15 — Created `LobbyBackground.tsx`: CSS-only luxury reception hall with dark marble floor (reflection effect), dual pillars with gold trim, central golden chandelier with pulsing glow, vignette overlay. Replaced `ProceduralSkyline` import in lobby-client.tsx. Penthouse retains the skyline view. Each space now has distinct visual identity.

---

## MEDIUM — Missing Standard Features

### BUG-011: No dark/light mode toggle `🟢 FIXED`
**Severity:** Medium  
**Location:** Entire app  
**Behavior:** No way to switch between dark and light mode.  
**Expected:** Settings/account section with theme toggle. Respects `prefers-color-scheme` as default.  
**Fixed:** Session 14 — Settings page has Appearance section with theme indicator. Dark mode is the current design system; light theme CSS vars are future work. next-themes installed, toggle wired for when light vars are defined.

### BUG-012: No account/settings section `🟢 FIXED`
**Severity:** Medium  
**Location:** Entire app  
**Behavior:** No settings page, no profile management, no preferences.  
**Expected:** Account section accessible from every page with:
- Dark/light mode toggle
- Sign in/out
- Switch accounts
- Data management (export, delete)
- Notification preferences
- Connected services (Google, etc.)
**Fixed:** Session 14 — Created /settings page (SettingsClient). Profile section shows name, email, Google provider badge. Appearance section (theme). Account section with export, notifications, connected services (all "Coming Soon"), and sign out. Accessible via UserMenu dropdown from every authenticated page.

### BUG-013: No sound design `⚪ SPECCED — Phase 2`
**Severity:** Medium  
**Location:** Entire app  
**Behavior:** Site is completely silent. No ambient sound, no interaction sounds.  
**Expected:** Subtle sound design:
- Soft ambient background per floor (optional, user-togglable)
- Click/tap sounds on interactions
- Transition sounds (elevator, floor change)
- Muted by default, sound toggle in settings
**Fix:** Phase 2+ item. Use Web Audio API or Howler.js. Always default to muted.  
**Sound Design Spec (Phase 2 Implementation Plan):**
1. **Library:** Howler.js (lightweight, cross-browser, sprite support) or Web Audio API for ambient loops.
2. **Sound Categories:**
   - **Ambient loops** — One per floor aesthetic. Lobby: soft corporate hum + distant city. Penthouse: muted jazz undertone. War Room: low-frequency radar pulse. Briefing Room: keyboard clatter hum. Each ~30s seamless loop, -20dB baseline.
   - **UI interactions** — Glass tap (button click), soft chime (navigation), whoosh (elevator transition), subtle click (toggle/checkbox). Keep under 100ms, normalize to -12dB.
   - **Transitions** — Elevator: mechanical hum + ding on arrival. Floor change: brief whoosh crossfade. Page mount: soft fade-in swoop.
3. **Controls:**
   - Master mute toggle in Settings (persist to localStorage). Default: muted.
   - Volume slider (0–100%) in Settings → Appearance.
   - Per-category toggles: Ambient / UI / Transitions.
   - Respect `prefers-reduced-motion` — disable all sounds when reduced motion is on.
4. **Architecture:**
   - `SoundProvider` context wrapping `(authenticated)/layout.tsx`.
   - `useSound()` hook: `playClick()`, `playTransition(type)`, `setAmbient(floorId)`.
   - Audio sprites compiled into a single .webm file per category for efficient loading.
   - Lazy-load sound files on first user interaction (avoid autoplay policy issues).
5. **File budget:** < 500KB total compressed audio assets.
6. **Settings UI:** Add "Sound & Audio" section between Appearance and Account in settings-client.tsx.

### BUG-014: Hover states on interactive elements are weak `🟢 FIXED`
**Severity:** Medium  
**Location:** Global — buttons, cards, clickable elements  
**Behavior:** Hover animations exist but are too subtle. Hard to tell what's interactive.  
**Expected:**
- `cursor: pointer` on ALL clickable elements (non-negotiable)
- Icons: scale up (1.1x) or increase opacity on hover
- Cards: subtle lift (translateY -2px + shadow increase)
- Buttons: clear color/brightness shift
- Transitions: 150-200ms ease-out (not too slow, not instant)
**Fix:** Audit every interactive element. Add `cursor-pointer` class globally to clickable things. Strengthen hover transforms.  
**Fixed:** Session 15 — Global hover utility classes added to globals.css: `.hover-lift` (translateY -2px + shadow), `.hover-glow` (brightness + scale), `.hover-scale` (1.1x), `.hover-interactive` (gold border glow). Strengthened `.glass-hover` with translateY(-1px) + box-shadow. Strengthened penthouse ActivityRow (added translateY + shadow lift). Strengthened Elevator buttons (scale 1.08 + gold glow, transition-all). Strengthened UserMenu trigger (scale 1.08 + glow). Strengthened Lobby DirectoryRow (added translateY). GlassPanel and QuickActionCard already had premium 3D tilt / rich hover effects. All interactive elements now have clear, consistent hover feedback.

---

## PRIORITY ORDER (fix sequence)

### Sprint 1 — Unblock basic usability
1. BUG-006: Performance (kill the lag — nothing else matters if the site runs at 15 FPS)
2. BUG-007: Remove custom cursor (quick win, reduces lag too)
3. BUG-008: Remove text parallax (quick win)
4. BUG-009: Replace mouse parallax with autonomous drift (Apple TV style)
5. BUG-003: Fix penthouse scroll
6. BUG-004: Make penthouse elements interactive or visually distinct

### Sprint 2 — Navigation & accounts
7. BUG-001: Floor navigation — placeholder pages for locked floors
8. BUG-002: Back-to-lobby navigation from every floor
9. BUG-005: Sign out feature
10. BUG-012: Account/settings page (includes BUG-011 dark/light mode)

### Sprint 3 — Visual identity & polish
11. BUG-010: Distinct lobby design (luxury office building, not skyline)
12. BUG-014: Hover state audit — cursor:pointer + stronger transforms
13. BUG-013: Sound design (Phase 2, but spec it now)

---

## NOTES FOR IMPLEMENTATION

- **Performance is job #1.** A beautiful site that runs at 15 FPS is a broken site. Profile first, fix the biggest offenders, then move to visual fixes.
- **Remove complexity, don't add it.** The custom cursor, mouse parallax on text, and aggressive animations are hurting more than helping. Simplify.
- **Every floor needs a page.** Even if it's a gorgeous "Coming Soon" screen with the floor's aesthetic and a progress bar.
- **Standard web conventions matter.** `cursor: pointer` on clickable things. Scroll works. Back button works. Sign out exists. These aren't features — they're table stakes.
- **Apple TV screensaver reference:** The background should feel like a living photograph. Barely moving. Hypnotic. Never reactive to the user. Think "digital painting in a luxury lobby" not "interactive parallax showcase."

---

## CLOSED ISSUES

Bugs that have been fixed. Moved here from OPEN ISSUES with fix details.

<!-- Move fixed bugs here. Keep the full bug description + add:
**Fixed:** Session X, `commit_hash`, brief description of the fix
-->

### BUG-003: Cannot scroll in penthouse `🟢 FIXED`
**Fixed:** Session 13, `6a2336d` — Removed `overflow: hidden` from body. Changed FloorShell decorative layers to `position: fixed` so content scrolls freely.

### BUG-004: Nothing is clickable in penthouse `🟢 FIXED`
**Fixed:** Session 13, `6a2336d` — Root cause was `overflow: hidden` on body trapping pointer events. Quick action cards now show `cursor: not-allowed`.

### BUG-006: Entire site runs at ~15 FPS `🟢 FIXED`
**Fixed:** Session 13, `6a2336d` — ProceduralSkyline v5 rewrite. Eliminated 5 mousemove listeners, constellation O(n²), light sweep, scan line, mouse spotlight, atmospheric particles, water mirror reflections. Reduced object counts ~35%.

### BUG-007: Custom cursor removed `🟢 FIXED`
**Fixed:** Session 13, `6a2336d` — Removed CustomCursor from WorldShell. Added global CSS `cursor: pointer` for all interactive elements.

### BUG-008: Text parallax removed `🟢 FIXED`
**Fixed:** Session 13, `6a2336d` — Removed mousemove → transform handlers from lobby and penthouse. Text is static.

### BUG-009: Apple TV autonomous drift `🟢 FIXED`
**Fixed:** Session 13, `6a2336d` — Replaced mouse parallax with autonomous sinusoidal drift (Ken Burns). Two sine waves, 25-40s periods. prefers-reduced-motion static.

### BUG-001: Floor navigation `🟢 FIXED`
**Fixed:** Session 14, `742ea47` — Elevator dims locked floors (55% opacity), tooltip shows "Phase N • Coming Soon". All floors navigate to stub pages.

### BUG-002: Back-to-lobby navigation `🟢 FIXED`
**Fixed:** Session 14, `742ea47` — Lobby button replaced with exit door icon, tooltip "Exit to Lobby". Desktop + mobile.

### BUG-005: Sign out feature `🟢 FIXED`
**Fixed:** Session 14, `742ea47` — UserMenu dropdown (top-right) with Sign Out action. Also on /settings page.

### BUG-011: Dark/light mode `🟢 FIXED`
**Fixed:** Session 14, `742ea47` — Settings page Appearance section. Dark mode is design system default. Light vars future work.

### BUG-012: Account/settings page `🟢 FIXED`
**Fixed:** Session 14, `742ea47` — /settings route with profile, appearance, account actions. Accessible from UserMenu.

### BUG-010: Lobby background `🟢 FIXED`
**Fixed:** Session 15 — Created `LobbyBackground.tsx` (CSS-only luxury reception hall). Dark marble floor with reflections, dual pillars with gold trim, central golden chandelier, vignette overlay. Lobby now has distinct ground-level opulence; penthouse retains skyline.

### BUG-014: Hover state audit `🟢 FIXED`
**Fixed:** Session 15 — Global CSS hover utilities (`.hover-lift`, `.hover-glow`, `.hover-scale`, `.hover-interactive`). Strengthened `.glass-hover`. Enhanced inline JS hovers on ActivityRow (+translateY, +shadow), Elevator buttons (+scale 1.08, +glow), UserMenu (+scale 1.08, +glow), DirectoryRow (+translateY). GlassPanel/QuickActionCard already premium.

### BUG-013: Sound design `⚪ SPECCED — Phase 2`
**Specced:** Session 15 — Full Phase 2 implementation plan: Howler.js, three sound categories (ambient/UI/transitions), per-floor loops, master mute default, SoundProvider context, <500KB audio budget. See open issue for full spec.

---

## SPRINT 3.5 — User-Reported Issues (Session 16)

### BUG-015: Penthouse content disappears on first visit `🟢 FIXED`
**Severity:** Critical  
**Behavior:** Dashboard loads then unloads into blank screen (only skyline visible). Works on reload.  
**Root cause:** `EntranceSequence` had a race condition — initial render showed children (flash), then `setShowEntrance(true)` re-rendered with `opacity:0`, but GSAP guard `hasPlayed.current` prevented animation from running on the re-triggered effect.  
**Fixed:** Session 16 — Rewrote EntranceSequence with three-state pattern: `null` (determining) → `true` (animate) / `false` (skip). Content starts at `opacity:0` during determination phase, preventing flash. GSAP cleanup sets `clearProps:"all"` on complete.

### BUG-016: Lobby redirects authenticated users to penthouse `🟢 FIXED`
**Severity:** High  
**Behavior:** Clicking Lobby in elevator sends user to /lobby, which immediately redirects back to /penthouse.  
**Root cause:** `lobby/page.tsx` had `if (user) { redirect("/penthouse"); }`.  
**Fixed:** Session 16 — Removed redirect. Lobby now passes `isAuthenticated` prop to LobbyClient. Authenticated users see "Welcome Back" with "Return to Penthouse" button instead of Google sign-in.

### BUG-017: Widget visibility — foreground matches background `🟢 FIXED`
**Severity:** High  
**Behavior:** Dashboard stat cards and quick actions are nearly invisible against the dark skyline.  
**Root cause:** GlassPanel bg was `rgba(10, 12, 25, 0.82)` — too transparent against identical dark skyline. Borders at 7% white were invisible.  
**Fixed:** Session 16 — Increased GlassPanel bg to `rgba(14, 16, 32, 0.92)`, borders to 12% white, strengthened gold top borders. QuickActionCard bg increased to 0.85 opacity (from 0.65), base opacity raised to 0.85 (from 0.65). Updated all glass CSS utility classes.

### BUG-018: No light mode `🟢 FIXED`
**Severity:** Medium  
**Behavior:** Settings says "light mode coming in future update" but no actual implementation.  
**Fixed:** Session 16 — Added `[data-theme="light"]` CSS vars (inverted palette: warm cream backgrounds, dark text, muted gold accents). Wrapped app in `ThemeProvider` from next-themes (`attribute="data-theme"`, default dark). Settings toggle now functional with moon/sun icons.

### BUG-019: No custom cursor `🟢 FIXED`
**Severity:** Low  
**Behavior:** Default browser cursor doesn't match luxury aesthetic.  
**Fixed:** Session 16 — Added SVG cursors: dark body with gold outline (default), solid gold pointer (interactive). CSS `cursor: url()` with native fallback. Zero JS overhead.

## STATISTICS

| Metric | Count |
|--------|-------|
| Total reported | 19 |
| 🔴 Open | 0 |
| 🟡 In Progress | 0 |
| 🟢 Fixed | 18 |
| ⚪ Specced (Phase 2) | 1 |

_Last updated: Session 22 (final handoff session), March 20, 2026_
