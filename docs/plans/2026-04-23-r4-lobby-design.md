# R4 — The Lobby: Design (self-approved, autopilot)

**Phase:** R4 (The Lobby / Floor L)
**Session:** `sess-9226e5`
**Autopilot:** `paused: false`, `scope: R4-only`
**Brief:** `docs/NEXT-ROADMAP.md` §R4 (lines 473–504)
**Status:** design approved by self, execution ready

---

## 1. Decisions locked

### 1.1 Arrival scene — CSS + GSAP over the existing world primitives
- **Rejected:** R3F / three.js 3D model. Ships ~400KB, build-complexity high, redundant with the canvas skyline already in the tree, motion-sickness risk on reduced-motion paths.
- **Rejected:** pre-rendered video. Cannot sync audio cues to user-specific state; locks the arrival into a frozen asset; feels like a loading screen by the second time (even though the second time never happens — still wrong for the first).
- **Chosen:** a CSS + GSAP aerial-approach sequence composed of the existing `ProceduralSkyline` (pulled in as a massively scaled background layer) and `LobbyBackground` (Ken Burns reception-hall plate), with `data-arrival` animation stages driving camera-pull, atmospheric reveal, and the Concierge desk arrival.
- **Why this fits the brief's anchors:** Apple TV screensavers and Uncharted openings both resolve an exterior approach into an interior moment — CSS+GSAP over the procedural skyline reproduces that without new runtime dependencies. Severance's "Mark-first-day" cue = the Concierge's first line lands on the user *after* the approach has resolved, not during it.

### 1.2 Concierge — name "Otis", new character (not a repurposed department head)
- **Why "Otis":** world's most-recognisable elevator name — a subtle wink to the building that never breaks the metaphor. Warm, short, age-unplaceable. Not executive.
- **Visual identity (to be built in R4.2), distinct from any C-suite:**
  - Palette accent: **burgundy / #6B2A2E** — contrasts the gold C-suite accent across floors 1–7. The moment a user lands in the lobby they see a palette they've never seen anywhere else in the Tower.
  - Pose: **standing behind a reception desk**, not pacing a room. No whiteboard — a **guest book and a brass bell** on the desk.
  - Voice style: warm-hotel-concierge, not startup-founder. Follows the existing `docs/CHARACTER-PROMPTS.md` §Concierge tone; the **Name: TBD** line gets replaced with **Name: Otis** in R4.2.
  - Dialogue panel: derived from `AgentDialoguePanel` (so streaming state management is reused) but visually distinct via a burgundy frame and softer, rounder typography on the speaker label. The cover-the-name test must pass — a reader looking at the panel without its header should be able to say "this is not the CEO, this is not the CPO."
- **Hard rule for execution:** if any task file ends up importing a C-suite character component and aliasing it as Concierge/Otis, stop and open a blocker.

### 1.3 Conversation — AI SDK v6 `streamText` + `generateObject`
- Two endpoints: `/api/concierge/chat` (streaming chat) and `/api/concierge/extract` (structured profile extraction fired on user-confirmed completion or on skip).
- Otis drives the pacing. He asks **1–2 open questions at a time**, never a six-question barrage.
- Extraction schema `targetProfileSchema` (Zod):
  ```
  { roles: string[]            // ≥1, usable
    seniority: "intern" | "junior" | "mid" | "senior"
    targetCompanies: string[]  // optional
    locations: string[]        // optional
    startDate: string (ISO)    // optional
    visaSponsorshipNeeded: bool // default false
    dealbreakers: string[]
    dreamCompanies: string[]
  }
  ```
- Writes to the canonical target-profile storage: the existing `[target_profile_v1]` row in `agent_memory` (see `src/lib/db/queries/job-discovery-rest.ts:228`). No new storage surface — the CRO and the cron worker already read this row.
- **Skip path:** user clicks Skip → Otis acknowledges ("Understood. The building will meet you as you go.") → we persist a minimal placeholder profile (`{ roles: ["Software Engineer"], seniority: "intern" }`) so the bootstrap-discovery call still has enough to run — and the user never hits an empty Penthouse.

### 1.4 First-run Job Discovery — real pipeline, no stub
- On Otis-done signal, the client fires a server action → `/api/onboarding/bootstrap-discovery` → which directly awaits `runJobDiscoveryForUser(userId)` (already exported from `src/lib/jobs/discovery.ts:143`). This is the Tower's "Inngest-equivalent" — the same function the 4-hour cron invokes.
- The server action runs inside the `maxDuration = 300` envelope (Vercel Functions default). Typical completion 15–45 s.
- While it runs, the elevator-ascent cinematic plays (≥8 s cap; the cinematic doesn't gate on discovery — if discovery is still running when the elevator arrives, the Penthouse shows a two-beat "sourcing …" skyline shimmer for the last few seconds).
- **No mock fetches, no hard-coded discovered applications, no sentinel rows.** The Proof test (R4.11) asserts that the applications inserted during bootstrap have `source_id` matching real source payloads.

### 1.5 First-ever Morning Briefing override
- New columns: `user_profiles.first_briefing_shown boolean default false`, `user_profiles.concierge_completed_at timestamptz null`.
- On Penthouse mount (server component, pre-render):
  - If `first_briefing_shown = false` AND `concierge_completed_at` is within the last 10 minutes → call `generateMorningBriefing(input)` inline with pipeline snapshot derived from the just-inserted applications.
  - Atomically set `first_briefing_shown = true` in the same server round-trip (guards double-fire on refresh).
- The override bypasses the 13:00-UTC cron exactly once, then defers back to the normal cadence.
- **This is the autonomy proof:** Otis completes → Tower finds jobs → CEO delivers a briefing that references those specific jobs, end-to-end, without the user doing anything else.

### 1.6 Arrival one-time-per-account — strict
- New column: `user_profiles.arrival_played_at timestamptz null`.
- On first authenticated Lobby render: an atomic `UPDATE user_profiles SET arrival_played_at = now() WHERE id = $1 AND arrival_played_at IS NULL RETURNING arrival_played_at`. If the returned row's timestamp equals the just-generated `now()`, we won the race and play the cinematic. Otherwise the cinematic is already played — skip it entirely.
- Anti-pattern test (R4.12): simulate a second lobby render with `arrival_played_at` non-null → assert the `<CinematicArrival />` component is not mounted and the skip button isn't even rendered.

### 1.7 Building Directory cross-section
- New column: `user_profiles.floors_unlocked text[] default '{L}'` — driven by activity heuristics on each lobby render (has applications → add "7"; has contacts → add "6"; has interviews → add "3"; has cover letters → add "5"; has briefing → add "PH", "1", "2"; has follow-ups → add "4").
- New component `src/components/lobby/directory/BuildingDirectory.tsx` — vertical SVG slice, floors stacked from L at bottom to PH at top. Each row renders lit (gold dot, label full-opacity) or locked (ghosted, 30% opacity, no icon). Live-reads `floors_unlocked`.
- Mounts between the Concierge conversation and the elevator ride — a moment of orientation before the ascent.

### 1.8 Returning-user fast lane
- `src/proxy.ts` handles it. When a request hits `/lobby` *and* the session is authenticated *and* `user_profiles.arrival_played_at IS NOT NULL` → redirect to `/<lastFloorVisited>` route (fallback `/penthouse`).
- `lastFloorVisited` already exists on `user_profiles` (default "PH"); no schema change needed.
- Floor routes that are alreadyundefinedmounted update `lastFloorVisited` on mount via the existing session-tracking hook (add one if not present — low-cost server action).

### 1.9 LinkedIn OAuth — BLOCKER
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` do not exist in `.env.example` or any provisioned env.
- Per explicit autopilot directive: **do not stub**, **do not mock the OAuth flow**, **do not ship "LinkedIn sync coming soon" UI that never resolves**.
- Action: record a blocker via `tower block R4.10 "LINKEDIN_CLIENT_ID/SECRET env vars not provisioned; LinkedIn sync deferred. Unblock when credentials are added to .env.example and prod env."` and move on. R4 ships without LinkedIn, per the brief's Non-negotiables ("LinkedIn integration is optional — no gate behind it").

### 1.10 "Sharpening target" — the small unprompted detail
- The brief asks for one unprompted moment that makes a returning user feel seen. Implementation: on a returning-user visit (which normally fast-lanes past the lobby), if the user happens to navigate *back down* to `/lobby` manually, Otis reappears at the desk and greets them by referencing the last floor they were on — "You just came down from the Observatory. Numbers behaving?" — driven by `lastFloorVisited` + the briefing mood from the last 24h.
- This is a *tiny* R4 polish beat — the core R4 scope is the first-visit experience; the returning-visit greeting is a two-line branch on Otis's system prompt.

---

## 2. Data model delta (R4.1)

New columns on `user_profiles`:
| Column | Type | Default | Purpose |
|---|---|---|---|
| `arrival_played_at` | `timestamptz` | `null` | One-time cinematic gate |
| `concierge_target_profile` | `jsonb` | `null` | Full extracted profile (mirrors the `agent_memory` marker row, but canonicalised here for fast access) |
| `concierge_completed_at` | `timestamptz` | `null` | First-run briefing override window |
| `first_briefing_shown` | `boolean` | `false` | Briefing override idempotency |
| `floors_unlocked` | `text[]` | `'{L}'::text[]` | Building Directory state |

Migration `0013_r4_lobby_onboarding.sql` applies these columns. RLS unchanged (the existing `user_profiles_self_access` policy covers all columns).

`lastFloorVisited` and `sharedKnowledge` are reused; no new tables.

---

## 3. Route & surface area delta

### New server routes
- `POST /api/concierge/chat` — streams Otis's replies via `streamText` (AI SDK v6).
- `POST /api/concierge/extract` — `generateObject` with `targetProfileSchema`, writes to `agent_memory` + `user_profiles.concierge_target_profile`, stamps `concierge_completed_at`.
- `POST /api/onboarding/bootstrap-discovery` — awaits `runJobDiscoveryForUser(userId)` directly; returns `{ ok: true, newApplications, topScore }`.
- `POST /api/floors/last-visited` — single server action that bumps `lastFloorVisited` when a floor mounts (used by all floor clients).

### New components
- `src/components/lobby/concierge/OtisCharacter.tsx`
- `src/components/lobby/concierge/OtisDialoguePanel.tsx`
- `src/components/lobby/concierge/OtisAvatar.tsx` (SVG)
- `src/components/lobby/concierge/ConcierceFlow.tsx` (the conversation orchestrator)
- `src/components/lobby/cinematic/CinematicArrival.tsx` (the GSAP aerial approach)
- `src/components/lobby/directory/BuildingDirectory.tsx`

### Edits
- `src/proxy.ts` — returning-user fast lane.
- `src/app/lobby/page.tsx` — server-side decides which scene to hand to the client (cinematic vs concierge vs direct elevator) based on `arrival_played_at` and `concierge_completed_at`.
- `src/app/lobby/lobby-client.tsx` — gates the existing entrance animation behind the new `arrival_played_at` state; hands off to `ConcierceFlow` when appropriate.
- `src/lib/agents/concierge/system-prompt.ts` (new) — Otis's system prompt.
- `src/db/schema.ts` + new migration — R4.1.
- `docs/CHARACTER-PROMPTS.md` — replace `Name: TBD` with `Name: Otis`, and widen the Concierge prompt spec with the R4.3 voice rules (open-ended, 1–2 question bursts, honors skip).
- `src/types/ui.ts` — the `character: "Concierge"` line on the FLOORS registry row for `L` stays as-is ("Concierge" is the role, "Otis" is the character's name).

---

## 4. Proof & anti-pattern tests

- **R4.11 (Proof):** a full end-to-end integration test — new account → concierge extraction → bootstrap discovery → first briefing references the discovered apps. Stubs the upstream RSS/HTTP fetches (not the discovery pipeline itself) so CI is deterministic but the pipeline code is exercised end-to-end.
- **R4.12 (Anti-pattern):** simulated second-visit lobby render with `arrival_played_at != null` → assert no `CinematicArrival` in the tree and server-side `redirect('/penthouse')` fires.

---

## 5. What this does not touch

- Stripe / billing — untouched.
- Supabase Auth provider config — untouched (Google OAuth stays the only provider).
- Any existing C-suite character sheet — untouched.
- The 13:00-UTC briefing cron — untouched (first-run override is additive, not a replacement).
- CEO voice layer — still deferred (third time now; that's R5+ work).

---

## 6. Autopilot escalation ledger (design-time)

- **LinkedIn OAuth:** blocker opened, not stubbed, ship-without approved. One of the allowed max_blockers (1/3 used).
- **R3F vs video vs CSS:** self-resolved per §1.1. Not a business decision.
- **Concierge name ("Otis"):** self-resolved per §1.2. Reference-Library-compliant (luxury-hotel-concierge + existing Tower metaphor).
- **Cinematic motion-sickness:** handled via `prefers-reduced-motion` branch — existing lobby client already has the pattern.

All other R4 design choices stayed inside the brief's Intent / Anchors / Proof envelope; no user escalation needed.

---

## 7. Execution order (R4.1 → R4.12 → ship)

1. R4.1 schema (migration first — everything else depends on the new columns).
2. R4.2 Otis primitives (character before conversation).
3. R4.3 conversation engine (system prompt + extraction schema + routes).
4. R4.4 conversation UI flow (wires 4.2 + 4.3 together).
5. R4.5 bootstrap-discovery route.
6. R4.6 first-briefing override (depends on 4.5 output).
7. R4.7 cinematic arrival.
8. R4.8 Building Directory.
9. R4.9 proxy fast-lane (depends on 4.7's arrival_played_at).
10. R4.10 LinkedIn blocker (do this before the Proof test so tests don't wait for LinkedIn).
11. R4.11 Proof test.
12. R4.12 anti-pattern test.
13. Verify → commit final ledger → handoff.

Tasks R4.2 and R4.8 have no dependency on each other and neither do R4.7 vs R4.3 — they can run in parallel when I subcontract to `subagent-driven-development`.

---

End of design.
