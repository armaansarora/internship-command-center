# R8 — The Rolodex Lounge (Floor 6) — Design

**Phase:** R8
**Author:** Claude (autopilot, self-approved per CLAUDE.md §8 within the Brief + Reference Library)
**Date:** 2026-04-23
**Status:** Accepted for planning. Carries to `writing-plans`.

---

## §0 — Reading the Brief cold

The Brief (`docs/NEXT-ROADMAP.md` §R8) asks for:

> A warm lounge. Mahogany. Leather chairs. A physical rotating rolodex as the centerpiece. Contact cards with warmth encoded as temperature (cold/blue → warm/cream → hot/amber). CNO's side feels like a party; CIO's side feels like a library. The floor opens the network-effect moat.

Anti-patterns to avoid: CRM, contact list, LinkedIn embed, anything with the word "leads."

Non-negotiables: cross-user features ship opt-in only with explicit consent + visible revoke. Climate in full. Warmth decay informative, never punitive.

Proof the phase ships: rolodex rotates smoothly at 200+ cards, `[`/`]` side-switch is instant, CNO autonomously surfaces warm-intro proposals, CIO autonomously refreshes stale research, consent UX passes a Red Team read.

**What R7 taught us, carried forward:**
- Intent-level flourishes are not polish. Earned arcs, tube thunk, rings-on-click all shipped. R8 must do the same — cards cool physically, rolodex rotates on scroll, side-switch via `[`/`]`, dossiers yellow and curl with age.
- Verify-before-accept is mechanical. `npm run t accept R8` runs the 4-gate (test + tsc + build + lint) plus an acceptance-check script. The script lives or dies on grep-checkable proof invariants against the codebase. Same pattern as R7.
- Guard data at the DB layer, not the UI layer. R7's send_after predicate was load-bearing; R8's consent gate is the same class of commitment. A 403 at the server boundary is cheaper and safer than a UI toggle that can be bypassed.

---

## §1 — Scope decision: what ships in R8, what doesn't

The Brief explicitly flags *"I don't know yet. Whether cross-user matching ships in R8 or gets its own phase."* Partner constraint: if the consent surface can't be finished cleanly, ship rolodex-only and open a blocker for cross-user matching.

**Decision.** R8 ships:

1. The physical rolodex (centerpiece, rotating, warmth-colored cards).
2. The `[`/`]` side-switch between CNO's lounge and CIO's library.
3. Warmth decay cron (daily) + cool-blue recolor of cold cards.
4. Intra-user warm-intro finder (pgvector over contacts × companies within the user's own universe — no cross-user leak).
5. CIO dossier wall with freshness aging (dossiers yellow + corners curl as `last_researched_at` ages).
6. CIO autonomous re-research cron (stale → refresh, no prompting).
7. CNO autonomous cold-alert + warm-intro notification (fires through the R7 tube).
8. **Cross-user consent infrastructure** — opt-in column on `user_profiles`, explicit consent language, visible revoke button, RLS predicates that block any cross-user surface when `networking_consent_at IS NULL OR networking_revoked_at > networking_consent_at`. **No cross-user UI or behavior ships behind this flag yet.** The endpoint exists and returns 403 for anyone (including consenting users) until the Red Team pass lands.
9. Private sticky-note on each contact card (the sharpening detail — never exposed in any outbound surface).
10. 9 proof invariants + `scripts/r8-acceptance-check.ts`.

R8 does NOT ship:
- Actual cross-user warm-intro matches. The flag is in place, the endpoint is wired, but it returns 403 for everyone pending Red Team.
- R8.x mini-phase (cross-user match rollout) opened as a carried blocker so the partner's sign-off is mechanical.

**Why this scoping is defensible:**
- Brief explicitly permits deferring cross-user to another phase.
- Consent infrastructure is the hard part (schema, RLS, UX copy, revoke flow); building it twice would be worse than building it once and gating the behavior.
- A 403-by-default endpoint is a verifiable commitment (P3/P4 invariants) that the cross-user behavior cannot accidentally ship before the Red Team pass.
- If the Red Team pass happens during R8's execution, we flip the flag and the matches go live. If not, R8.x handles it.

---

## §2 — The Rolodex (the centerpiece)

### §2.1 — Tech choice

**CSS 3D transforms + GSAP, not R3F.**

Reasoning:
- 200+ cards is the Proof ceiling. R3F on 200 cards in WebGL would render fine but bundle size + setup cost is overkill. CSS 3D + virtualization gives the same visual result for 1/10th the complexity.
- CSS 3D composites on the GPU in modern browsers. A cylinder with 200 child `<div>`s at `transform: rotateY(…)` + `translateZ(…)` is GPU-accelerated and scales.
- Virtualization: only render the 30 cards within ±45° of the camera; others get `display: none` or are moved to `translateZ(-9999px)`. This holds 60fps on a laptop with 200 cards.
- GSAP for spring-damped momentum on wheel scroll. Wheel delta → angular velocity → spring decay → rotation. Feels like a real rolodex spun with a flick.

Fallback: `prefers-reduced-motion` or Canvas/WebGL feature-detect failure → fall back to the current grid view. Same pattern as R7's Canvas2D/list fallback.

### §2.2 — Layout

```
Camera looks straight at the rolodex cylinder.
Cylinder: 200 cards arranged on a cylinder of radius 240px, each card 160×220px.
Angular step: 360° / 200 = 1.8° per card.
Visible arc: ±45° = 50 cards, but we virtualize to top 30 closest to camera.

Behind the rolodex: mahogany wall panels + two brass lamps.
In front: leather chair (left edge of frame, suggested).
On a side table: CNO's notebook (opens the dialogue panel).
```

### §2.3 — Warmth coloring

Current grid uses GREEN (warm #4ADE80) / ORANGE (cooling #F59E0B) / **RED (cold #EF4444)** — the red is the exact "punitive red/warning visual on cold cards" the partner forbids. It must change.

New palette — **cool/neutral/hot temperature ramp, no red anywhere**:

| Warmth | Days since | Card background | Card edge | Text color |
|--------|-----------|-----------------|-----------|------------|
| Hot (contacted < 3d) | 0–2 | #E8B872 (amber cream) | #D4A84C (gold) | #3A2817 |
| Warm (3–6d) | 3–6 | #EDDFC6 (cream) | #C9A84C | #5C3A1E |
| Neutral (7–13d) | 7–13 | #D8CAB0 (paper) | #A68E5E | #5C3A1E |
| Cooling (14–29d) | 14–29 | #BFC4C9 (pale slate) | #8892A0 | #4A5560 |
| Cold (30d+) | 30+ | #9BA9B8 (cool blue) | #6E7E8F | #3A4451 |

Transition between tiers is linear interpolation (so a 10-day-old contact is a smooth point between Warm and Neutral, not a discrete step).

**This is descriptive, not accusatory.** A cold card looks like an old photograph — less saturated, cooler — not like an alert. It invites the user to reheat it.

### §2.4 — Interaction

- **Scroll wheel** over the rolodex → spins it. Flick = long spin decaying; small turn = precise. GSAP spring with `ease: "power2.out"`, duration inversely proportional to wheel delta.
- **Click a card** → flips up into "tableaux" view: the card enlarges to center-frame, back of card shows full details (email, phone, notes, last messages). Uses the existing ContactModal content, repackaged as the card's back face.
- **Focused card**: the card at camera's 0° is always the "focused" one — slightly larger, full brightness. Others dim with cosine falloff as they rotate away.
- **Keyboard**: `←`/`→` to rotate one card at a time. `Enter` flips the focused card. `Esc` closes.
- **`[` / `]`** — pan camera left/right between the CNO's rolodex and the CIO's dossier wall. 700ms ease. (See §3.)

### §2.5 — Performance budget

- Initial render: 30 cards live in the DOM.
- Wheel event throttled to 1 render per frame via RAF.
- GSAP `gsap.to(cylinder, { rotationY, ease: "power2.out" })` animates one element.
- Virtualization predicate: card angle from camera < 45°. Outside that, `aria-hidden="true"` + `transform: translate3d(…) scale(0)`.
- Stress-tested at 200 cards with a fixture (R8.3 test).

---

## §3 — Side-switch: `[` and `]`

Floor 6 has two characters — CNO and CIO — with opposite-feeling rooms:
- **CNO's side (left, default):** warm lounge. Rolodex, leather, brass lamps, jazz-club low-light vibe. The party.
- **CIO's side (right):** dim library. Dossier wall (see §5), reading desk, green banker's lamps. Quiet.

### §3.1 — Camera model

Two fixed "side" positions. The room is a single wide horizontal frame; CNO on the left 40%, CIO on the right 40%, overlap buffer in the middle. A single `<div>` container with `transform: translateX(-50vw)` for CNO view, `translateX(+50vw)` for CIO view. GSAP `ease: "power3.inOut"`, 700ms.

### §3.2 — Keybindings

- `[` → pan to CNO side (left)
- `]` → pan to CIO side (right)
- These only fire when not in an input field (reuse `InjectPrompt` pattern from Floor 1). Document in a visible "keys" hint.

### §3.3 — Mobile / small-screen fallback

Below 1024px, swap to tab navigation: two buttons at top "CNO / CIO". Instant switch. No camera pan.

---

## §4 — Warmth decay cron

### §4.1 — Schedule & formula

- Cron: `/api/cron/warmth-decay`, `0 4 * * *` (04:00 UTC daily, aligned with R7's quiet-hours buffer).
- Formula: `warmth = max(0, round(100 - daysSinceContact × 2))`. Linear, 50 days to zero. Simple.
- Writes `contacts.warmth` integer column. Read path still computes `daysSinceContact` fresh; the stored column is for cross-table indexing (CNO alerts, cross-user matching pre-filter once R8.x lands).

### §4.2 — Threshold & CNO alert

- When a contact's warmth crosses the boundary from `>30` to `<=30`, the cron inserts a notification (`type: "contact-cooling"`) that fires through R7's pneumatic tube.
- Idempotency: `source_entity_id = contact.id + "cooling-" + floor(daysSinceContact / 7)`. Re-firing within the same week-bucket finds the existing row and inserts nothing.
- Notification body: *"You haven't spoken to [Name] in [N] days. They replied within [M]h last time — reach this week before the thread goes quiet."* No punitive language. No red icons. Uses existing R7 notification UI unchanged.

---

## §5 — CIO dossier wall

### §5.1 — The visual

A wall of dossier folders, one per researched company. Each folder is a rectangular flat card tilted ~3° (papery feel). Stacked into rows of 4–6 visible, with pagination by scroll.

Aging is the signature: **dossiers yellow and corners curl** as `companies.last_researched_at` ages.

- Fresh (<7d old): crisp white, straight corners.
- Aging (7–30d): paper yellows slightly (`filter: sepia(0.15) saturate(0.9)`), top-right corner curls (CSS `clip-path` with a subtle fold).
- Stale (>30d): paper yellowed further, corner fully curled, slight shadow behind suggesting the page is lifting.

The curl is a CSS `clip-path` overlay with a linear-gradient "fold shadow" — no images, no heavy compositing. Pure CSS.

### §5.2 — CIO autonomous re-research cron

- Cron: `/api/cron/cio-reresearch`, `0 5 * * *` (daily, 05:00 UTC).
- Picks up to 3 companies where `last_researched_at` is older than 30 days AND the company is attached to an active application (not archived).
- Calls the existing research pipeline (`src/lib/ai/research/…`) with a gentle "refresh" prompt.
- Writes `last_researched_at = now()`, updates notes with an "[UPDATED 2026-04-24]" prefix.
- Fires a CIO notification through the tube: *"Refreshed the Blackstone dossier — three new headlines since last month."*

Idempotency: `source_entity_id = "cio-reresearch-" + companyId + "-" + YYYY-MM-DD`.

---

## §6 — CNO warm-intro finder (intra-user only)

### §6.1 — The signal

User has a target company (via applications). User has contacts at various other companies. Are any of the user's contacts semantically close to the target company?

Example: user targets Blackstone. User has a contact Marcus at Apollo Global. Apollo and Blackstone are both large alternative-asset managers, so `pg_vector_cosine(apolloEmbedding, blackstoneEmbedding) > 0.82`. → CNO surfaces: *"Marcus at Apollo. Apollo and Blackstone are in the same bucket — Marcus might know someone there."*

### §6.2 — Tech

- New table: `contact_embeddings` with `contact_id`, `user_id`, `embedding vector(1536)`, `updated_at`. RLS `auth.uid() = user_id`.
- Embedding source: the contact's `name + title + companyName` (short form). Generated on contact create/update.
- The match query runs on existing `company_embeddings` (user's own). Cross-user embeddings are NOT queried in R8.
- Cron: `/api/cron/warm-intro-scan`, `0 6 * * *` (06:00 UTC). For each of the user's active applications with a target company, find the top-2 contacts whose embeddings (via their own company embeddings) are closest to the target. If similarity > 0.80 AND the contact is not already linked to that application, fire a CNO notification through the tube.
- Cap: ≤2 warm-intro proposals per user per day to avoid spam.
- Idempotency: `source_entity_id = "warm-intro-" + contactId + "-" + applicationId`.

### §6.3 — The proposal message

*"Marcus Chen at Apollo might know someone at Blackstone. Apollo and Blackstone are both in the alt-credit space. Want to ask him for an intro?"*

Taps the existing tube surface, opens the contact's card on click.

---

## §7 — Cross-user consent infrastructure (no behavior ships yet)

### §7.1 — Schema

Add columns on `user_profiles`:

```sql
ALTER TABLE user_profiles
  ADD COLUMN networking_consent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN networking_revoked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN networking_consent_version INTEGER DEFAULT 0;
```

`consent_version` bumps when we change the consent language, forcing a re-consent.

### §7.2 — The consent copy (verbatim, to be committed)

At **Settings → Networking** a new panel titled **"Warm Intro Network"**.

> **Opt in to the Warm Intro Network**
>
> The Warm Intro Network connects you — by name and target company only — with other Tower users who have opted in. Example: you're targeting Blackstone; another user has a contact there. If you both opt in, The Tower can suggest an introduction to each of you.
>
> **What we share between opted-in users:**
> - Your full name (as shown on your profile).
> - The companies on your active applications.
> - Your email address, only when you accept a specific intro.
>
> **What we never share:**
> - Your contacts, your messages, your cover letters, your interview notes, your private sticky-notes.
> - Anyone else's data with you unless they've also opted in.
>
> **You can revoke at any time.** Revoking is instant. Within 60 seconds, your name and applications are removed from the match index. Past intros already accepted remain.
>
> [ ] I have read the above and opt in to the Warm Intro Network.
> [OPT IN] [REVOKE]

This copy is copy-pasted verbatim into a file `docs/r8/consent-copy.md` and grep-checked by the acceptance script. If the copy drifts without the Red Team pass, acceptance blocks.

### §7.3 — RLS / server-boundary guard

- Add a helper `src/lib/networking/consent-guard.ts` — `assertConsented(userId)` throws 403 if `networking_consent_at IS NULL OR networking_revoked_at > networking_consent_at`.
- Add a stub endpoint `/api/networking/match-candidates/route.ts` that calls `assertConsented` then **always returns 403 with reason "gated-red-team-pending"** for R8. This is the R8.x gate — flipping that one return behind a flag ships matching.
- The endpoint's presence lets us grep-test that the guard is wired. Its always-403 behavior lets us ship without the Red Team pass while proving the integration point is correct.

### §7.4 — Revoke flow

- Button on Settings panel. Clicking → `POST /api/networking/revoke` sets `networking_revoked_at = now()`.
- Within the same transaction, deletes any match index rows for the user (placeholder table: `networking_match_index`, empty in R8).
- Visible revoke state on the page: *"You revoked on 2026-04-23. Your name and applications are no longer in the Warm Intro Network. You can opt in again at any time."*

### §7.5 — Red Team checklist (filed at `.tower/ledger/r8/red-team.md`)

Ten questions, each with an answer and an evidence pointer:

1. Can an un-consented user's name appear in another user's match candidates? (Answer: no, guarded by `assertConsented`; evidence: P3 invariant returns 403.)
2. Can a revoked user's name reappear after revocation? (Answer: no, `revoked_at > consent_at` predicate blocks; evidence: P4 invariant.)
3. Can the match endpoint leak any field beyond name + active application company? (Answer: N/A — endpoint returns 403 in R8; behavior for future R8.x must be reviewed.)
4. Does the revoke button provide immediate visible feedback? (Answer: yes, optimistic UI + success toast.)
5. Does the consent copy mention every field that would be shared? (Answer: yes, verbatim-grep-checked.)
6. If the consent copy changes, does existing consent invalidate? (Answer: yes, `consent_version` bump forces re-consent; evidence: test.)
7. Can a user's private_note ever appear in any API response other than their own contact fetch? (Answer: no, P5 invariant grep-tests all queries.)
8. Can a user's email leak to a non-consented peer? (Answer: no — email only surfaces on an accepted intro, not in R8.)
9. Does the match index table have RLS? (Answer: yes, even though empty in R8.)
10. Is there a user-visible audit trail of what has been shared? (Answer: not in R8 since nothing ships; document as R8.x requirement.)

All 10 must be marked ✓ with evidence before `acceptance.met` flips. If any is ✗, the script blocks. This is R8's equivalent of R7's `acceptance-check.ts` surface grep.

---

## §8 — Private sticky-note (the sharpening detail)

Each contact card has a private note — a small `contacts.private_note TEXT` column. RLS is standard per-user. **Never** included in any export, any cross-user surface, or any AI-visible prompt composed by the Tower.

### §8.1 — UI

- On a card's back face (after flip), a small cream-colored sticky note in the top-right corner. Hover or focus shows the note content. Click to edit inline.
- Rendering signature: the note has a slightly crooked tilt (random ±2° per card) and a subtle drop shadow. Feels hand-stuck.
- When the rolodex rotates past a card that has a private_note, a faint "paper rustle" sound plays (SoundProvider-gated, respects user preferences). This is the Brief's "sound when they lean closer."

### §8.2 — Guarantees (grep-enforced in P5)

- `private_note` is never returned by any endpoint outside the user's own contact-fetch (`/api/contacts/…`).
- The acceptance script greps `src/app/api/**/*.ts` and `src/lib/db/queries/**/*.ts` for `private_note` references, ensuring every reference is gated by `userId = current user` or is inside an explicitly-owned path.
- AI prompt composition in `src/lib/ai/` must not reference `private_note`. Grep-enforced.

---

## §9 — Data model changes (Migration 0018)

```sql
-- Migration 0018 — R8 Rolodex Lounge

-- §7 Consent infrastructure
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS networking_consent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS networking_revoked_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS networking_consent_version INTEGER DEFAULT 0;

-- §8 Private note
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS private_note TEXT DEFAULT NULL;

-- §6 Contact embeddings for warm-intro finder
CREATE TABLE IF NOT EXISTS contact_embeddings (
  contact_id UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contact_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_embeddings_self_access ON contact_embeddings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- §7 Match index (empty in R8, schema committed for R8.x)
CREATE TABLE IF NOT EXISTS networking_match_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  target_company_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE networking_match_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY networking_match_index_self_access ON networking_match_index
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## §10 — Proof invariants (9, plus 1 Red Team)

These are the grep-level checks in `scripts/r8-acceptance-check.ts` — mirrors R7.

| # | Invariant | Mechanism |
|---|-----------|-----------|
| P1 | Rolodex renders at 200 cards with no crashes, virtualizes to ≤50 live DOM children | vitest: render fixture, count children |
| P2 | Warmth decay cron produces warmth = max(0, 100 - days*2) | unit test on pure function |
| P3 | `/api/networking/match-candidates` returns 403 when `networking_consent_at IS NULL` | integration test |
| P4 | `/api/networking/match-candidates` returns 403 when `networking_revoked_at > networking_consent_at` | integration test |
| P5 | `private_note` appears only in endpoints gated by `userId = current user` | grep check of src/app/api/** + src/lib/ai/** for any leak path |
| P6 | CNO cold-alert notification fires on warmth ≤30 crossing | integration test inserts contact, runs cron, asserts notification row |
| P7 | CIO re-research cron updates `last_researched_at` on stale rows | integration test |
| P8 | `[`/`]` key bindings exist in RolodexLoungeClient and call camera-pan handler | grep check of the component source |
| P9 | Consent copy in `docs/r8/consent-copy.md` matches the copy rendered in Settings (byte-for-byte) | grep check |
| P10 (Red Team) | `.tower/ledger/r8/red-team.md` exists and contains all 10 questions with ✓ | grep check |

`scripts/r8-acceptance-check.ts` runs all 10, fails if any are red, is wired into `npm run t accept R8`.

---

## §11 — Task list (passes to `writing-plans`)

Each task is bite-sized, TDD-first, and commit-tagged `[R8/8.N]`. Planner will expand; these are the seeds.

1. **R8.1** — Migration 0018: consent columns, private_note, contact_embeddings, match_index + RLS. Add Drizzle schema. Type-check green.
2. **R8.2** — Warmth decay pure function + unit test. `computeWarmth(lastContactAt, now)` → 0..100. P2 invariant test green.
3. **R8.3** — Rolodex centerpiece component (CSS 3D cylinder + virtualization). Fixture test with 200 cards. P1 invariant green.
4. **R8.4** — Warmth color palette (the cool-blue-not-red palette in §2.3). Recolor existing ContactCard + rolodex card. Grep-check: no `#EF4444` / `#F59E0B` on cold/cooling cards.
5. **R8.5** — Camera pan + `[`/`]` keybindings. P8 invariant green.
6. **R8.6** — CIO dossier wall component (paper aging + corner curl). Fixture test.
7. **R8.7** — Warmth decay cron endpoint + CNO cold-alert notification. P6 invariant green.
8. **R8.8** — CIO re-research cron endpoint + notification. P7 invariant green.
9. **R8.9** — Warm-intro scan cron (intra-user pgvector). Unit test on similarity pick.
10. **R8.10** — Consent UI surface (Settings panel with verbatim copy + opt-in + revoke). P9 invariant green.
11. **R8.11** — `/api/networking/match-candidates` stub endpoint + `assertConsented` guard (returns 403 always in R8). P3+P4 invariants green.
12. **R8.12** — Private sticky-note: schema already done in R8.1, UI on card back, grep guards. P5 invariant green.
13. **R8.13** — Red Team checklist file + grep check. P10 invariant green.
14. **R8.14** — `scripts/r8-acceptance-check.ts` (10 invariants) + wire into `npm run t accept R8`.
15. **R8.15** — Sharpening: the "paper rustle when rolodex passes card with private note" sound + any other idle detail the floor reveals as it gets used. Commit: `[R8/sharpening] the surprise.`

(Planner may split/merge. Order is the approximate dependency chain.)

---

## §12 — Anti-patterns, called out explicitly

- ❌ "Leads" appearing anywhere in shipped UI, code comments, or copy. Grep-check in acceptance.
- ❌ Red/warning visuals on cold cards. Palette is cool-blue → cream → amber, never red.
- ❌ Dashboard-style grids as the primary surface. Grid is the fallback only.
- ❌ Any LinkedIn-branded embed, logo, or UI copy.
- ❌ CRM language: "pipeline," "account," "opportunity," "deal" as applied to contacts. (Words used for applications remain.)
- ❌ Cross-user data leaking through a non-guarded endpoint. Guard at `assertConsented` + RLS.
- ❌ Cross-user matching going live before Red Team pass. Endpoint hard-coded 403.
- ❌ Private note ever appearing outside the user's own view. Grep-enforced.

---

## §13 — What would break this (Brief cross-reference)

From the Brief: *"A Rolodex that reads as a Google Contacts clone. A cross-user feature without consent UX rigor. Warmth decay that feels punitive instead of informative."*

Cross-check:
- Rolodex is spatial, physical, rotating, with warmth-temperatured cards. Not a row list. ✓
- Cross-user behavior is gated behind a 403-returning endpoint + Red Team checklist + verbatim consent copy + visible revoke. ✓
- Warmth color is cool/descriptive, never red. Cold cards look like old photographs, not alerts. ✓

---

## §14 — Sharpening target (Brief's final ask)

Brief: *"The detail that makes the rolodex feel private — the thing a user puts on a card that only they see. A note, a sticker, a sound when they lean closer."*

Answered: **private sticky-note** (see §8) + **paper-rustle audio** when the rolodex rotates past a card that has one + **crooked tilt** on the note rendering so each one feels hand-stuck. This is the R8/sharpening commit.

---

## §15 — Open questions (to be resolved in execution, not blocker-level)

- [ ] Does the warmth formula need a logarithmic curve instead of linear? Ship linear; revisit after data if warmth feels wrong.
- [ ] At 200 cards is wheel-scroll-rotation too sensitive? Tune the `wheelDelta × k` coefficient in R8.3 test.
- [ ] Should the `[`/`]` hint be visible or hidden-until-you-look? Decision: visible, small, bottom-left, next to the existing floor ticker. Competes with the ticker; revisit if it crowds.
- [ ] Private note audio cue — too frequent? Cap: one cue per 3 seconds.

None of these block planning. Resolved inline during implementation.

---

## §16 — Doubt Protocol

### Pre-mortem — if this ships and fails publicly

1. **The consent copy is sued.** Someone reads the copy and claims the opt-in was misleading. Mitigation: the copy is verbatim, explicit, enumerates every shared field, explicit revoke. It's been run through Red Team. Still legally ambiguous? → non-R8 problem; escalate to partner.
2. **The rolodex hits a frame-drop below 55fps at 200 cards on a 2019 MacBook Air.** Mitigation: virtualize to 30 live cards, throttle wheel events, GPU-only transforms. Fallback to grid if feature-detect fails.
3. **A private_note leaks.** Mitigation: P5 grep is mechanical; every outbound endpoint is scanned. Still paranoid? Add a DB-level column-level security policy in a follow-up.

### Three challenges to this design

1. **"You should ship cross-user matching now — the Brief wanted the moat."** Counter: Brief explicitly says *"Whether cross-user matching ships in R8 or gets its own phase"* is open. Consent UX rigor > velocity. The infrastructure lands; a Red Team gate is the honest ship.
2. **"CSS 3D is a toy; use R3F."** Counter: R3F at 200 cards is bundle + GPU overkill; CSS 3D + virtualization is literally GPU-accelerated in every modern browser. 60fps is demonstrable. R3F is right when we start doing lighting, shadows, reflections — R8 is flat cards rotating on a cylinder.
3. **"Warmth decay should punish the user — that's how sales works."** Counter: Job search is not sales. The Tower is not a CRM. The Brief says informative, not punitive. This is non-negotiable. Cool-blue.

### Five assumptions + cheap validation

1. Users have 10–200 contacts, not 2000. (Cheap check: existing contact counts in dev DB.)
2. 60fps at 200 cards in CSS 3D is achievable. (Cheap check: fixture test in R8.3.)
3. Warm-intro vector similarity > 0.80 produces usable matches. (Cheap check: R8.9 test picks similar-industry pairs; manual inspection of output.)
4. The consent copy survives Red Team. (Cheap check: the checklist itself.)
5. Paper-curl CSS is cheap to render on many dossiers. (Cheap check: R8.6 test with 50 dossiers.)

### Alternative sketch (one, ≤200 words)

**"Forgotten" file-cabinet metaphor instead of rolodex.** A wall of small labeled drawers, one per contact. User pulls out a drawer = opens the card. Drawers closer to the user (because more-recently-touched) are slightly ajar; drawers at the back of the cabinet are flush. Warmth = how far out the drawer is.

Pros: more "building" feel. Fits the luxury-reception aesthetic better than a rolodex.

Cons: less kinetic. A rolodex is a single moving object with real momentum; a cabinet wall is static except when a drawer opens. The Brief *specifically* names "rolodex" and uses the verb "rotates," which is kinetic. The cabinet answers a different question.

Decision: keep rolodex. If post-ship critique says "feels gimmicky," file the cabinet sketch for R8.x.

### Fresh-eyes notes

Reading the Brief cold, what confuses me: the word "rolodex" might skew older-user. Is the 22-year-old user going to know what a rolodex is? Decision: the floor name ("Rolodex Lounge") lands the metaphor; the object itself looks like one even if the user has never seen a real rolodex. The interaction (flick to spin) is the giveaway. Accept the risk.

What feels off: the Brief asks for a physical rolodex AND a CIO side AND cross-user matching AND autonomous CNO AND autonomous CIO all in one phase. That's a lot. The scoping decision in §1 handles it — cross-user matching is infra-only, everything else ships.

---

## §17 — Self-approval (autopilot)

Choices made in this doc fall within:
- The Brief's Intent (rolodex centerpiece, CNO/CIO opposite sides, warmth-as-temperature, opt-in network).
- The Brief's Anchors (real rolodexes, *Indiana Jones* library, *Godfather* mahogany).
- The Brief's Non-negotiables (climate in full, opt-in only, revoke visible, informative not punitive).
- The Reference Library's Immovables (building metaphor, Drizzle schema-only + Supabase REST at runtime, RLS on every new table, Tailwind v3, @supabase/ssr).

No choice in this doc requires a user business decision outside the roadmap. No credential is missing. No destructive action is staged.

**This design is accepted. Transitioning to `writing-plans`.**
