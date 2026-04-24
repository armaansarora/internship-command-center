# Pre-R9/R10 Perfectness Audit

Compiled after R8 close + R5.4 mini-phase kickoff, 2026-04-23. Ground truth snapshot:
- Phases complete: R0–R8 (R5 is 9/10; R5.4 running now)
- Tests: 1087 passing / 167 files
- tsc: clean
- Build: green
- Lint: **15 errors / 2 warnings**
- Drift: clean
- Uncommitted: `.tower/autopilot.yml` + `.tower/partner-brief.md` (both need commit)
- Ahead of origin: 19 commits (need push)

---

## A. MUST-FIX before R9 (hard bars)

None of these fail `tower verify`, but each is a real correctness/production issue that will bite.

### A1. 15 lint errors in production code (React 19 correctness)

Not "baseline debt" — these are genuine `react-hooks/refs` violations where refs are accessed or mutated during render. React 19 may break these at runtime in the near future.

Files:
- `src/hooks/useAgentChat.ts` — 6+ violations (lines 183, 184, 221-230)
- `src/app/(authenticated)/rolodex-lounge/page.tsx`
- `src/app/lobby/lobby-client.tsx`
- `src/components/world/ProceduralSkyline.tsx`

**Fix:** move ref access into effects / event handlers. Follow the `if (ref.current == null) { ref.current = ... }` pattern the lint rule suggests.

### A2. R8 re-introduced direct `gsap` import (bypasses tree-shaking)

`src/components/floor-6/rolodex/useRolodexRotation.ts:11` imports `gsap` directly. This was the exact Gotcha #3 we thought was closed — post-R4 everything routes through `@/lib/gsap-init`, but R8's rolodex work skipped it.

**Fix:** change the import to `@/lib/gsap-init`. One-line change.

### A3. Build NOT in CI

`.github/workflows/tower-quality.yml` runs tsc + eslint + test. It does **NOT** run `npm run build`. That's exactly the regression class that bit R0 (dual middleware/proxy). Would be caught locally by `tower accept` but CI is blind to it.

**Fix:** add a `build` job to `tower-quality.yml`.

### A4. 8 TODO comments in shipped code

CLAUDE.md convention says "No TODO/FIXME comments in shipped code." Currently violated in:
- `src/lib/rate-limit.ts:13` — Upstash migration
- `src/lib/agents/cfo/tools.ts:474` — schema comment
- `src/lib/ai/cost.ts:61,69` — pricing TODOs
- `src/lib/db/queries/companies-rest.ts:21,46,86,302` — schema TODOs

**Fix:** either resolve (if actionable) or convert to tracked issues/blockers then delete the comment.

### A5. `console.error` in production request path

`src/app/(authenticated)/war-room/page.tsx:148` — "War Room query failed" goes to console.error on every failed query. CLAUDE.md says "No console.logs in shipped code." Legit error logging should route through `src/lib/logger.ts`.

Error boundaries (`app/error.tsx`, `(authenticated)/error.tsx`) keep their console.error — those are defensible since they're fallback-of-last-resort.

---

## B. SHOULD-FIX before R9 (quality + hygiene)

### B1. CLAUDE.md "Known Orphaned Files" is stale

- `src/hooks/useCharacter.ts` — **listed as kept, but file was deleted** since CLAUDE.md was written.
- `src/lib/gsap-init.ts` — **listed as "not yet wired" but is now fully wired** (7 importers, 0 direct `gsap` imports in app code except the new R8 regression in A2).

CLAUDE.md is supposed to be ground-truth reference. Stale items erode trust in it.

**Fix:** remove `useCharacter.ts` from list, remove gsap-init note, update Gotcha #3.

### B2. SESSION-STATE.json referenced in CLAUDE.md but doesn't exist

CLAUDE.md §2 (Documentation Architecture) describes SESSION-STATE.json as a Tier 2 "living doc" for mid-session task state. File doesn't exist in repo. Either migrated away (and CLAUDE.md needs update) or an ungenerated artifact.

**Fix:** remove references from CLAUDE.md OR reinstate the file + generation path.

### B3. No production smoke test

Currently no deployed-app check runs post-deploy. A broken prod deploy can only be caught by a user hitting a 500. Low-cost fix: a GitHub Action that `curl`s `/` after Vercel deploys, fails if 5xx.

### B4. Husky pre-commit doesn't run `tower lint-autopilot`

My new lint command exists but isn't enforced. An autopilot.yml drift like the R4 timestamp bug would only be caught if someone manually runs it.

**Fix:** add `npm run t lint-autopilot --strict` to `.husky/pre-commit`.

---

## C. NEEDS DECISION (user call)

### C1. R8.x — Human Red Team second pass

Cross-user warm-intro matching (`/api/networking/match-candidates`) is hard-stopped at 403 for ALL callers pending your Red Team read of `.tower/ledger/r8/red-team.md` (10 self-reviewed questions). Until you OK it, no cross-user matching ships.

**Options:**
- (a) Do the Red Team pass now (15 min read). Flip endpoint from 403 to real results as R8.x.
- (b) Defer indefinitely. R8 ships rolodex-only, and the moat feature waits.
- (c) Fold into R10 as the "network" moment that arrives alongside offers.

### C2. CEO voice — deferred 3 times (R2, R3, R4)

Voice pipeline exists from R6 (CPO). CEO voice keeps getting kicked.

**Options:**
- (a) Land in R10 (my earlier vote — negotiation dialogue is a natural voice moment).
- (b) Post-R10 polish pass.
- (c) Accept indefinite.

### C3. R1 full-journey E2E deferred

Since R1, waiting for seeded test account + Resend mock. Never shipped. Nine phases later, still deferred. Either build the infrastructure or explicitly decline to.

---

## D. Pre-R9 specific readiness

R9 = The Observatory. Brief centerpiece: the **Orrery** — pipeline as celestial bodies in orbit at 60fps with 100+ planets. Heavy phase.

### D1. R3F vs Theatre.js vs shader approach — pick before autopilot starts

Brief's "I don't know yet" calls out Theatre.js. Autopilot will pick one. If you have a preference (or a constraint — e.g., no new animation library), tell me before R9 kicks off and I'll bake it into the prompt.

### D2. @react-pdf/renderer is already installed (R5.7)

State of the Month report generation can reuse it. Make that explicit in the R9 prompt so autopilot doesn't pick a second PDF library.

### D3. 60fps at 100+ planets is tight

Autopilot needs an explicit perf gate in the proof test. Similar to R8 virtualization assertion but animation-frame-based.

### D4. CFO threshold triggers reuse R8 cron pattern

Brief says CFO composes analysis when conversion rate drops >5% WoW. This is structurally identical to R8's warmth decay cron. Call out the reuse so autopilot doesn't redesign.

### D5. Rejection autopsy — opt-in or mandatory?

Brief says "I don't know yet." This is a product call. Recommend opt-in, soft default (user declines each time vs. opting out globally). If you want mandatory, tell me.

---

## E. Pre-R10 specific readiness

R10 = Negotiation Parlor. Small floor that materializes on first offer.

### E1. Schema needed: `offers` table

Brief calls out the shape: base, bonus, equity, sign-on, housing, start_date, location, benefits jsonb, received_at, deadline_at, status enum. This will be migration 0020 (after R9's 0019).

### E2. Comp benchmarking data source

Brief's open question: Levels.fyi API? Static seed dataset? Needs pre-phase research. If no API, autopilot will need a seed JSON file. If you have a preference, lock it before R10.

### E3. Door-appears-on-offer logic

Ties back to R3's unprompted CEO triggers + R7's tube delivery. "Door appears within a short window" means a realtime or polling-based notification path. Spec the latency.

### E4. Send-hold for negotiation emails (24h min)

Reuses R7's `send_after` infrastructure. Call out explicitly so autopilot doesn't rebuild.

### E5. R10 is where CEO voice most naturally lands (if C2 = option a)

Negotiation drafts live in front of the user — voice could read the draft aloud. Decide C2 before R10 starts.

---

## F. Run order recommendation

1. Right now: **R5.4 is running** — let it finish.
2. After R5.4 lands: **fix A1-A5 + B1-B2 in one cleanup commit** (~30-45 min of my work, no autopilot needed).
3. Then: **make decision on C1 Red Team** (15 min user read).
4. Fire **R9 autopilot** with pre-locked choices from D1-D5 baked into the prompt.
5. Post-R9 post-mortem + any fixes.
6. Make decisions on C2 (CEO voice) + E2 (Levels.fyi) before R10.
7. Fire **R10 autopilot** with E1-E5 baked in.
8. Post-R10 post-mortem.
9. Decide C3 (E2E test infrastructure) — post-R10 hygiene pass.

Total remaining hand-holding moments for user: ~4 (Red Team read, R9 kickoff, R10 kickoff, final polish).
