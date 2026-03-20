# BUG TRACKER — The Tower
## Living Document — Updated Every Session

> **Rule:** Every agent session that touches bugs MUST update this file. Log what was fixed, when, and the commit hash. This is the single source of truth for site health.

---

## CHANGELOG

Reverse-chronological log of all fixes. Every fix gets an entry here.

| Date | Session | Bug(s) Fixed | Commit | Notes |
|------|---------|-------------|--------|-------|
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

### BUG-003: Cannot scroll in penthouse `🔴 OPEN`
**Severity:** Critical  
**Location:** Penthouse page  
**Behavior:** Content is cut off, no scroll available.  
**Expected:** Page scrolls to show all content.  
**Fix:** Check for `overflow: hidden` on parent containers. Likely a layout/height issue.

### BUG-004: Nothing is clickable in penthouse `🔴 OPEN`
**Severity:** Critical  
**Location:** Penthouse page  
**Behavior:** Dashboard cards, stats, action items — none respond to clicks.  
**Expected:** Interactive elements should be clickable (even if they just show a "coming soon" state).  
**Fix:** Wire click handlers or make non-interactive elements visually distinct from interactive ones.

### BUG-005: No sign out feature `🔴 OPEN`
**Severity:** Critical  
**Location:** Entire app  
**Behavior:** No way to sign out once signed in. No account menu anywhere.  
**Expected:** User menu / account dropdown with sign out option.  
**Fix:** Add account dropdown (top-right or sidebar) with sign out, accessible from every page.

---

## HIGH — Major UX Problems

### BUG-006: Entire site runs at ~15 FPS, extremely laggy `🔴 OPEN`
**Severity:** High  
**Location:** Global — every page  
**Behavior:** Site feels like 15 FPS. Not responsive. Interactions feel sluggish.  
**Root causes to investigate:**
1. ProceduralSkyline canvas re-rendering every frame without throttling
2. Mouse parallax listeners firing on every mousemove without requestAnimationFrame batching
3. Too many CSS animations running simultaneously (dust motes, particles, glows, etc.)
4. GSAP animations not using `will-change` or GPU-accelerated properties
5. React re-renders — check for missing `useMemo`/`useCallback` on expensive computations
6. Multiple canvas contexts active at once
**Fix:** Profile with Chrome DevTools Performance tab. Kill the biggest offenders first. Target 60 FPS.

### BUG-007: Custom cursor — dot not centered in circle `🔴 OPEN`
**Severity:** High  
**Location:** Global cursor component  
**Behavior:** The small dot and outer circle are misaligned. Dot is not centered.  
**Expected:** Dot is perfectly centered within the circle, or...  
**User preference:** "I don't like it in general" — consider removing the custom cursor entirely. Replace with:
- Default cursor globally
- `cursor: pointer` on interactive elements (standard web behavior)
- Subtle hover states instead of custom cursor theatrics
**Fix:** Remove custom cursor component. Use CSS `cursor: pointer` on clickable elements.

### BUG-008: Text elements move with cursor (parallax on content) `🔴 OPEN`
**Severity:** High  
**Location:** Lobby, Penthouse — text like "Welcome Armaan Arora"  
**Behavior:** Heading text, welcome messages, and other content shifts when moving the mouse.  
**Expected:** Text should be STATIC. Only background/decorative layers should have subtle motion.  
**Fix:** Remove `useMouseParallax` (or equivalent transforms) from ALL text elements, headings, cards, and interactive UI. Parallax should only apply to deep background layers (skyline, decorative).

### BUG-009: Background parallax is motion-sickness-inducing `🔴 OPEN`
**Severity:** High  
**Location:** Skyline / background on all pages  
**Behavior:** Background responds to mouse movement, causing jarring shifts.  
**Expected:** Background should drift slowly on its own — think Apple TV screensaver. Slow, ambient, autonomous movement. NOT mouse-reactive.  
**Research needed:** Apple TV screensaver behavior:
- Very slow panning (takes 30-60 seconds to drift across)
- No user input drives the motion — it's purely autonomous
- Gentle, hypnotic, never jarring
- Ken Burns effect (slow zoom + pan simultaneously)
**Fix:** Replace mouse-driven parallax with autonomous slow-drift animation. CSS `@keyframes` with 60-120s duration, gentle translateX/translateY + subtle scale. `prefers-reduced-motion` disables entirely.

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

_No closed issues yet._

---

## STATISTICS

| Metric | Count |
|--------|-------|
| Total reported | 14 |
| 🔴 Open | 14 |
| 🟡 In Progress | 0 |
| 🟢 Fixed | 0 |
| ⚪ Won't Fix | 0 |

_Last updated: Session 12, March 19, 2026_
