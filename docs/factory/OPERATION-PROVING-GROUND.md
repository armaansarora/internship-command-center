# 🎯 Operation: Proving Ground — the first campaign

*The gym tracker, run as the first real campaign under `THE-MILITARY-DOCTRINE.md`. A proving
ground is where weapons are tested before the field — that's exactly what this is: the doctrine
itself is the weapon under test. Replaces Operation: Blueprint (cancelled — see
`2026-06-09-fable-revision.md`).*

**Status: ready to launch.** The General drafts final Orders from the skeleton below (Move 1),
the Commander edits and says **go** (Move 2), and the campaign runs.

---

## Why this target (unchanged from the original plan)

Small, real, code-shaped (has a true mechanical oracle), and wanted: Armaan + girlfriend +
brother actually log lifts. It exercises every move of the doctrine on the friendliest possible
terrain — greenfield 🟢, Rung-1 oracle, F1-sized — so failures will be failures of the
*doctrine*, not of the target. That's the point.

## Draft Orders (skeleton — the Briefing finalizes this WITH the Commander)

**Mission.** A dead-simple shared gym tracker for three named users. Log a set (exercise ×
weight × reps) in seconds, mid-workout, on a phone. See your own history and progress; peek at
each other's. Nothing else.

**Victory conditions (draft — sharpen at Briefing):**
1. Logging one set takes **< 10 seconds** from app-open, one-handed, on a phone (the one metric
   that decides if it gets used mid-workout).
2. The three users sign in, see their own data, can view each other's (small fixed group —
   decide at Briefing: shared visibility or per-user privacy toggles).
3. History per exercise + a progress view (best set / volume over time) that makes a PR feel
   good.
4. Repeat-last-workout flow: yesterday's session is one tap away from being today's template.
5. Deployed, on a real URL, installable on their phones (PWA is fine), used for one real
   workout by each of the three before the campaign closes.

**The Verdict (Rung 1 — oracle + siege):** tsc, lint, vitest, build, Playwright e2e on the
log-a-set flow; the <10s criterion verified in e2e with a stopwatch assertion on interaction
count/steps; then the full Siege (Codex assault with a Siege packet + disposition ledger)
before ship.

**Rules of Engagement:** 🟢 Green (greenfield repo — the Military writes directly; one siege
round per doctrine's class-keyed dial). Stop-loss: [cost cap and wall-clock cap — Commander
sets at Go]; context-headroom checkpoints per the Orders' F1 budget; hypothesis-based loop
detection. No Tower repo paths touched.

**Terrain.** New repo. Golden template = the Tower stack, simplified: Next.js + Supabase
(auth + Postgres + RLS) + Tailwind, deployed on Vercel. Inherit the Tower's hard-won gotchas
(REST-client-not-Drizzle-at-runtime, @supabase/ssr, RLS on every table, typed throughout) as
the seed `class-kits/code.md` doctrine. **Not** part of the Tower product; no building
metaphor required — but it should look like someone with taste made it.

**Force estimate.** F1 (solo strike), with F2 fan-out allowed for lateral work (e.g., seed
data, an options council on the progress-chart design). F3 is explicitly out of scope — if F1
hits the wall on an app this size, that itself is a finding for the AAR.

**Out of scope.** Workout programs/plans, social features beyond the trio, exercise media,
wearables, native apps, monetization. (Cut-lines if the stop-loss fires: 5 → 4 → 3; the app
ships usable at any of them.)

## What the Commander must bring to Go/No-Go

1. Edits to the victory conditions above (especially #2 — visibility model — and the names of
   the three users for auth).
2. A Supabase project (or approval for the General to create one via MCP) + Vercel account
   linkage for the new repo.
3. The stop-loss numbers: max spend ($) and max wall-clock for the run.
4. The word **go**.

## What the campaign must prove (the real victory conditions — for the AAR)

The gym tracker is the cover story; these are the actual test points:

1. **Move 1** — did the Briefing catch a wrong assumption before build? (At least one victory
   condition above is probably wrong; the Briefing should find it.)
2. **Move 2** — was editing `ORDERS.md` directly a better steering wheel than chat? If the
   spec shifted mid-build, did the FRAGO protocol carry it cleanly?
3. **Move 3** — did F1 hold for a whole small app? Did checkpoints fire on measurement (not
   feel)? Were First Contact + Dispatches useful or noise? Did always-shippable ordering
   survive contact with reality?
4. **Move 4** — did the Siege (packet + disposition ledger) kill anything the mechanical
   gates missed? (If it killed nothing, the Siege design is suspect — that's a finding, not
   a victory.)
5. **Move 5** — did the AAR produce at least one doctrine change that would alter the *next*
   campaign? (If not, the compounding loop is decorative.)
6. **Economics** — total tokens + wall-clock vs. the Orders estimate; where estimates were
   wrong and why.

A campaign that ships the tracker but proves nothing about the doctrine is a failed proving
ground. The AAR is the deliverable; the app is the bonus. (Tell the trio otherwise. 🏋️)
