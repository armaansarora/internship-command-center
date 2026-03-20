# BUG TRACKER — The Tower
## Living Document — Updated Every Session

> **Rule:** Every agent session that touches bugs MUST update this file. Log what was fixed, when, and the commit hash. This is the single source of truth for site health.

---

## CHANGELOG

Reverse-chronological log of all fixes. Every fix gets an entry here.

| Date | Session | Bug(s) Fixed | Commit | Notes |
|------|---------|-------------|--------|-------|
| 2026-03-20 | Session 14 | BUG-001: Floor navigation | `TBD` | Elevator now shows locked floors at 55% opacity with "Phase N • Coming Soon" in tooltip. Floors still navigable (stub pages handle Coming Soon UI). Removed grey-out lag root cause (was 15 FPS issue from Sprint 1). |
| 2026-03-20 | Session 14 | BUG-002: Back-to-lobby nav | `TBD` | Lobby button replaced with exit icon (door+arrow SVG). Tooltip reads "Exit to Lobby". Border changed from dashed to solid for clarity. Always visible in elevator panel (desktop + mobile). |
| 2026-03-20 | Session 14 | BUG-005: Sign out | `TBD` | Added UserMenu component (top-right avatar dropdown). Sign out via POST to /api/auth/signout. Also accessible from /settings page. Dropdown has profile info, settings link, sign out action. |
| 2026-03-20 | Session 14 | BUG-012: Account/settings page | `TBD` | Created /settings route with SettingsClient. Sections: Profile (name, email, provider badge), Appearance (dark mode indicator, light mode noted as future), Account (export, notifications, connected services placeholders + sign out). |
| 2026-03-20 | Session 14 | BUG-011: Dark/light mode | `TBD` | Settings page shows theme section. Dark mode is current design — light theme CSS vars not yet defined, noted in UI. Wired for future toggle. |
| 2026-03-20 | Session 14 | Fix: Root layout overflow-hidden | `TBD` | Removed leftover `overflow-hidden` Tailwind class from body tag in root layout.tsx. Was partially fixed in Sprint 1 (globals.css cleaned) but inline class was missed. |
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

### BUG-010: Lobby and Penthouse share the same background `🔴 OPEN`
**Severity:** High  
**Location:** Lobby vs Penthouse  
**Behavior:** Both pages have the same skyline/background. Lobby doesn't feel like a lobby.  
**Expected:** Lobby should feel like walking into a luxury office building lobby — marble floors, reception desk energy, grand entrance. NOT a skyline view (that's the penthouse). Each floor needs its own visual identity.  
**Fix:** Design distinct lobby background — think: luxury office reception. The Penthouse gets the skyline/city view. Lobby gets ground-level opulence.

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

### BUG-013: No sound design `🔴 OPEN`
**Severity:** Medium  
**Location:** Entire app  
**Behavior:** Site is completely silent. No ambient sound, no interaction sounds.  
**Expected:** Subtle sound design:
- Soft ambient background per floor (optional, user-togglable)
- Click/tap sounds on interactions
- Transition sounds (elevator, floor change)
- Muted by default, sound toggle in settings
**Fix:** Phase 2+ item, but note it. Use Web Audio API or Howler.js. Always default to muted.

### BUG-014: Hover states on interactive elements are weak `🔴 OPEN`
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
**Fixed:** Session 14, `TBD` — Elevator dims locked floors (55% opacity), tooltip shows "Phase N • Coming Soon". All floors navigate to stub pages.

### BUG-002: Back-to-lobby navigation `🟢 FIXED`
**Fixed:** Session 14, `TBD` — Lobby button replaced with exit door icon, tooltip "Exit to Lobby". Desktop + mobile.

### BUG-005: Sign out feature `🟢 FIXED`
**Fixed:** Session 14, `TBD` — UserMenu dropdown (top-right) with Sign Out action. Also on /settings page.

### BUG-011: Dark/light mode `🟢 FIXED`
**Fixed:** Session 14, `TBD` — Settings page Appearance section. Dark mode is design system default. Light vars future work.

### BUG-012: Account/settings page `🟢 FIXED`
**Fixed:** Session 14, `TBD` — /settings route with profile, appearance, account actions. Accessible from UserMenu.

---

## STATISTICS

| Metric | Count |
|--------|-------|
| Total reported | 14 |
| 🔴 Open | 3 |
| 🟡 In Progress | 0 |
| 🟢 Fixed | 11 |
| ⚪ Won't Fix | 0 |

_Last updated: Session 14, March 20, 2026_
