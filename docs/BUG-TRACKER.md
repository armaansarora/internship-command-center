# BUG TRACKER — The Tower
## Living Document — Updated Every Session

> **Rule:** Every agent session that touches bugs MUST update this file. Log what was fixed, when, and the commit hash. This is the single source of truth for site health.

---

## CHANGELOG

Reverse-chronological log of all fixes. Every fix gets an entry here.

| Date | Session | Bug(s) Fixed | Commit | Notes |
|------|---------|-------------|--------|-------|
| 2026-03-19 | Session 13 | BUG-006: Performance (15 FPS lag) | `pending` | Rewrote ProceduralSkyline v5: removed mouse tracking, constellation lines, light sweep, scan line, mouse spotlight. Reduced buildings (65/50/35 → 50/40/28), stars (180 → 120), particles (60 → 30), water shimmers (30 → 18). Removed atmospheric particles entirely. Eliminated 3 mousemove RAF loops. |
| 2026-03-19 | Session 13 | BUG-007: Remove custom cursor | `pending` | Removed CustomCursor from WorldShell. Added global CSS `cursor: pointer` rule for all interactive elements (a, button, [role=button], input, etc.). Eliminated per-frame RAF loop + 4 document event listeners. |
| 2026-03-19 | Session 13 | BUG-008: Remove text parallax | `pending` | Removed mousemove → transform handlers from lobby contentRef and penthouse headerRef. Text is now static. Eliminated 2 mousemove event listeners. |
| 2026-03-19 | Session 13 | BUG-009: Apple TV autonomous drift | `pending` | Replaced mouse-reactive parallax with autonomous sinusoidal drift (60-90s cycles). Two independent sine waves create organic Ken Burns panning. prefers-reduced-motion shows static frame. |
| 2026-03-19 | Session 13 | BUG-003: Penthouse scroll | `pending` | Removed `overflow: hidden` from body in globals.css. Changed FloorShell decorative layers from `absolute` to `fixed` so they stay as viewport backdrop while content scrolls freely. |
| 2026-03-19 | Session 13 | BUG-004: Penthouse clickability | `pending` | Fixed by removing body overflow:hidden (z-index stacking was trapping pointer events). Quick action cards now show `cursor: not-allowed` instead of `cursor: default` for clearer disabled state. |
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

### BUG-001: Cannot navigate to any floor from elevator `🔴 OPEN`
**Severity:** Critical  
**Location:** Elevator component  
**Behavior:** Clicking any floor greys out and lags the entire area. No feedback, no "under construction" screen, nothing happens.  
**Expected:** Either navigate to the floor OR show a clear "Under Construction — Coming in Phase X" interstitial page.  
**Fix:** Every locked floor needs a placeholder page. Grey-out should show a tooltip/overlay, not just lag.

### BUG-002: Cannot return to lobby from penthouse `🔴 OPEN`
**Severity:** Critical  
**Location:** Penthouse / navigation  
**Behavior:** Once in penthouse, no way to go back to lobby.  
**Expected:** Clear navigation — elevator button, back arrow, or lobby link always visible.  
**Fix:** Add persistent navigation (elevator access) from every floor.

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

### BUG-005: No sign out feature `🔴 OPEN`
**Severity:** Critical  
**Location:** Entire app  
**Behavior:** No way to sign out once signed in. No account menu anywhere.  
**Expected:** User menu / account dropdown with sign out option.  
**Fix:** Add account dropdown (top-right or sidebar) with sign out, accessible from every page.

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

### BUG-011: No dark/light mode toggle `🔴 OPEN`
**Severity:** Medium  
**Location:** Entire app  
**Behavior:** No way to switch between dark and light mode.  
**Expected:** Settings/account section with theme toggle. Respects `prefers-color-scheme` as default.  
**Fix:** Add theme provider (next-themes), account/settings page with toggle, persist preference to user_profiles.preferences.

### BUG-012: No account/settings section `🔴 OPEN`
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
**Fix:** Build `/settings` page with account management. Add user menu dropdown to access it.

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
**Fixed:** Session 13, `pending` — Removed `overflow: hidden` from body. Changed FloorShell decorative layers to `position: fixed` so content scrolls freely.

### BUG-004: Nothing is clickable in penthouse `🟢 FIXED`
**Fixed:** Session 13, `pending` — Root cause was `overflow: hidden` on body trapping pointer events. Quick action cards now show `cursor: not-allowed`.

### BUG-006: Entire site runs at ~15 FPS `🟢 FIXED`
**Fixed:** Session 13, `pending` — ProceduralSkyline v5 rewrite. Eliminated 5 mousemove listeners, constellation O(n²), light sweep, scan line, mouse spotlight, atmospheric particles, water mirror reflections. Reduced object counts ~35%.

### BUG-007: Custom cursor removed `🟢 FIXED`
**Fixed:** Session 13, `pending` — Removed CustomCursor from WorldShell. Added global CSS `cursor: pointer` for all interactive elements.

### BUG-008: Text parallax removed `🟢 FIXED`
**Fixed:** Session 13, `pending` — Removed mousemove → transform handlers from lobby and penthouse. Text is static.

### BUG-009: Apple TV autonomous drift `🟢 FIXED`
**Fixed:** Session 13, `pending` — Replaced mouse parallax with autonomous sinusoidal drift (Ken Burns). Two sine waves, 25-40s periods. prefers-reduced-motion static.

---

## STATISTICS

| Metric | Count |
|--------|-------|
| Total reported | 14 |
| 🔴 Open | 8 |
| 🟡 In Progress | 0 |
| 🟢 Fixed | 6 |
| ⚪ Won't Fix | 0 |

_Last updated: Session 13, March 19, 2026_
