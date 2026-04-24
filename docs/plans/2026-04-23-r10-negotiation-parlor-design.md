# R10 — The Negotiation Parlor — Design

**Phase.** R10 (C-Suite annex).
**Mode.** Autopilot (scope: R10-only, started 2026-04-23).
**Status.** Design complete, awaiting plan.
**Supersedes.** Nothing — new work. Builds on R5.4 (LiveCompose), R6 (voice three-layer), R7 (send-hold), R9 (react-pdf, preferences whitelist).

---

## §0 — What this is

A door that is not on the C-Suite wall until the user's first offer lands.

Once the first row arrives in the `offers` table, the door materializes in a single cinematic beat and becomes the only way into the Parlor — a wood-paneled annex room with an oak table, a comp-band chart on the back wall, and three chairs. Offers are folders on the table. The Offer Evaluator, CFO, and CNO convene there. Negotiation drafts are written live. Nothing leaves the building for 24 hours.

The Parlor is not a feature of the C-Suite. It is a **scope-switching event** — the building itself changes shape when the user's state crosses a threshold. That spatial grammar is load-bearing; without it, this is just another page.

## §1 — What we are NOT building

Tripwires — if we drift toward any of these, we back up:

- A `/comp-benchmarks` page.
- A "Negotiation templates" library.
- Generic / boilerplate email drafts.
- A door that is hidden via `display:none`, `visibility:hidden`, disabled-button, `hidden` attribute, feature-flag, or any other soft-gate. The door is ABSENT from the DOM. The CSuiteScene does not render a door element of any kind when `offerCount === 0`.
- Section 8 living expansions (post-offer transition layer, alumni floor, industry cycle, partner mode, moat aggregation). Out of scope, not even stubbed.

## §2 — Pre-locked decisions (partner, 2026-04-23)

Carried verbatim from `.tower/autopilot.yml`:

1. **Comp source** — Firecrawl scraping Levels.fyi → `company_comp_bands` cache, 30-day TTL. Firecrawl free tier = 500 credits/month. Cap target list to top ~20 companies per sector the user has touched. Graceful-empty fallback (no pin, honest copy — not a fabricated band).
2. **CEO voice** — ships in the Parlor (reads negotiation drafts aloud). Opt-in via Settings. Three-layer pattern identical in shape to R6: Settings toggle → component gate → graceful fallback when capability unavailable.
3. **Send-hold** — 24h minimum hold on negotiation emails. Reuse R7's `outreach_queue.send_after`. Do not rebuild scheduling.
4. **PDF** — reuse `@react-pdf/renderer` if an offer-comparison export is needed. Do not pick a second PDF library.
5. **Offers schema** — migration 0020 with the exact columns named in the brief: `base`, `bonus`, `equity`, `sign_on`, `housing`, `start_date`, `location`, `benefits` jsonb, `received_at`, `deadline_at`, `status` enum.
6. **Comp chart** — red pin below 25th percentile, gold pin above 75th, ink between. Multiple offers stack as folders and show multiple pins.

## §3 — Scope & stretch

**MUST-SHIP (MVP, R10.1–R10.12):**
- Migration 0020: `offers` table, `company_comp_bands` cache, `outreach_queue.type` enum extended with `"negotiation"`, `"ceoVoice"` preference key.
- Offers CRUD (REST + API routes) with RLS.
- Firecrawl Levels.fyi scraper + cache + lookup endpoint.
- Parlor door: conditional-absent element in CSuiteScene, materialization animation on first appearance.
- Parlor route `/parlor` (server-gated to `offerCount > 0`), ParlorClient, oak-table layout with offer folders.
- Three-chair convening: API endpoint + in-room view rendering Offer Evaluator / CFO / CNO panels.
- Comp chart: SVG percentile bars, red-below-25 / gold-above-75 pins, multi-offer stack.
- Negotiation-script drafting via LiveCompose reuse, writing a `type='negotiation'` row to `outreach_queue` with `send_after = now() + 24h`.
- CEO voice: Settings toggle, play button, browser `speechSynthesis`, null when unsupported or disabled.
- Signature: CFO quip on first Parlor entry (comp-aware — "They're underpricing you by 12%. Walk in with confidence.").

**STRETCH (R10.13–R10.14, best-effort after MVP lands clean):**
- Negotiation simulator: CPO plays the recruiter, user practices counters, scored on anchoring/concession/walk-away.
- CNO reference-request drafting: CNO drafts requests to user's top-warmth contacts, tracks submission, drafts thank-yous.

## §4 — Architecture

### §4.1 — Data model

**New tables (migration 0020).**

```sql
-- offers: one row per offer. User-owned, RLS standard.
CREATE TABLE offers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  company_name   text NOT NULL,          -- denormalized, drives comp-band lookup
  role           text NOT NULL,
  level          text,                   -- optional: "New Grad", "L3", "Intern"
  location       text NOT NULL,          -- "New York, NY"
  base           integer NOT NULL,       -- USD, dollars (not cents — UI-friendly, no float)
  bonus          integer NOT NULL DEFAULT 0,
  equity         integer NOT NULL DEFAULT 0,
  sign_on        integer NOT NULL DEFAULT 0,
  housing        integer NOT NULL DEFAULT 0,
  start_date     date,
  benefits       jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at    timestamptz NOT NULL DEFAULT now(),
  deadline_at    timestamptz,
  status         text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','negotiating','accepted','declined','expired','withdrawn')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY offers_owner ON offers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_offers_user_received ON offers(user_id, received_at DESC);

-- company_comp_bands: GLOBAL cache (not user-owned). RLS = any authenticated user can SELECT.
CREATE TABLE company_comp_bands (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name_normalized  text NOT NULL,     -- lower(trim(replace(company_name, ' inc', '')))
  role                     text NOT NULL,
  location                 text NOT NULL,
  level                    text,               -- nullable; "" for aggregate
  base_p25                 integer,
  base_p50                 integer,
  base_p75                 integer,
  bonus_p25                integer,
  bonus_p50                integer,
  bonus_p75                integer,
  equity_p25               integer,
  equity_p50               integer,
  equity_p75               integer,
  sample_size              integer NOT NULL DEFAULT 0,
  source                   text NOT NULL DEFAULT 'levels.fyi',
  scraped_at               timestamptz NOT NULL DEFAULT now(),
  expires_at               timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (company_name_normalized, role, location, COALESCE(level,''))
);
ALTER TABLE company_comp_bands ENABLE ROW LEVEL SECURITY;
CREATE POLICY comp_bands_read ON company_comp_bands
  FOR SELECT USING (auth.role() = 'authenticated');
-- No INSERT/UPDATE/DELETE policy for regular users — service role only.
CREATE INDEX idx_comp_bands_lookup
  ON company_comp_bands(company_name_normalized, role, location);

-- outreach_queue.type enum extension
ALTER TABLE outreach_queue DROP CONSTRAINT outreach_queue_type_check;
ALTER TABLE outreach_queue ADD CONSTRAINT outreach_queue_type_check
  CHECK (type IN ('cold_email','follow_up','thank_you','networking','cover_letter_send','negotiation','reference_request'));
```

**Preferences key (R9.6 pattern).**

Whitelist `ceoVoice` in `/api/profile/preferences`:
```ts
CEO_VOICE_PREF_KEY = "ceoVoice"
CeoVoicePrefSchema = z.object({ enabled: z.boolean() }).strict()
```
Default: `{ enabled: false }` — opt-in.

**What we do NOT persist.**

- Three-chair convening output. Ephemeral. Users re-run it on next visit if they want fresh analysis. Persisting adds tables + drift risk for low value.
- Negotiation draft "history". The current draft lives in `outreach_queue` as a single row. The row carries its full lifecycle (pending → approved w/ send_after → sent). No extra `drafts` table.

### §4.2 — Component & route layout

```
/c-suite
  └── CSuiteScene
        ├── graphSlot (DispatchGraph)
        ├── panelSlot (RingTheBell)
        └── doorSlot ← NEW. Server-gated. Absent when offerCount===0.

/parlor  (NEW route, server-component gated. No elevator button.)
  └── ParlorScene
        ├── OakTable (offer folders)
        ├── CompBandChart (SVG)
        ├── ThreeChairsConvening (OE / CFO / CNO panels)
        └── NegotiationDraftArea (LiveCompose reuse)
```

**Key components:**
- `src/components/parlor/ParlorDoor.tsx` — the door element itself. Receives `firstAppearance: boolean` prop; runs the 3s materialization animation once, then settles.
- `src/components/parlor/ParlorScene.tsx` — environment compositor (wood panels, warm amber sconces, oak floor, dim-for-focus).
- `src/components/parlor/OakTable.tsx` — lays out `OfferFolder[]` on the table.
- `src/components/parlor/OfferFolder.tsx` — a folder-shaped card; click → opens to full detail.
- `src/components/parlor/CompBandChart.tsx` — SVG chart with percentile bars + red/gold pins.
- `src/components/parlor/ThreeChairsConvening.tsx` — three-column convening view.
- `src/components/parlor/NegotiationDraftPanel.tsx` — LiveCompose-powered draft surface with Send button.
- `src/components/parlor/CEOVoicePlayButton.tsx` — browser-TTS play control. Three-layer gated.
- `src/components/floor-1/CSuiteDoorSlot.tsx` — NEW slot consumer in the CSuiteScene that renders ParlorDoor when present.

### §4.3 — Server-side gating (the "ABSENT" rule)

The trip-wire for the "door absent from DOM" constraint lives in *two* places:

1. **Data boundary**: `/c-suite/page.tsx` (server component) fetches `offerCount` via `getOffersCount(userId)`. Passes `hasParlorDoor: offerCount > 0` to `CSuiteClient`. When false, no door prop is passed down.
2. **Render boundary**: `CSuiteScene` renders `{doorSlot && (<ParlorDoor .../>)}` — the `&&` short-circuits, and React does not emit a placeholder for a falsy child. The rendered HTML contains zero bytes referencing a door when `doorSlot` is null/undefined.

**Proof test (non-negotiable architectural invariant):**
- SSR render `CSuiteScene` with `doorSlot={undefined}` → assert the HTML string does NOT contain `data-parlor-door` or `aria-label*="Parlor"` or `Negotiation Parlor`.
- SSR render with `doorSlot={<ParlorDoor />}` → assert those markers ARE present.

**Route gate.** `/parlor/page.tsx` also queries `offerCount`. If zero, `redirect('/c-suite')`. This prevents URL-level sneak-in.

### §4.4 — Door materialization animation

Fired once, persisted via `user_profiles.preferences.parlorDoorSeen: boolean`. On first appearance:

| ms      | beat                                                                  |
|---------|-----------------------------------------------------------------------|
| 0       | Single 1px gold seam fades in on the wall                             |
| 400     | Seam extends downward (GSAP timeline, ease="power2.inOut")            |
| 900     | Seam extends horizontally into a door outline                         |
| 1400    | Door wood-texture fills within outline                                |
| 1900    | Brass door handle fades in                                            |
| 2300    | Single soft chime (`door-reveal-chime.mp3`, gated on `soundEnabled`)  |

`prefers-reduced-motion: reduce` → skip all GSAP; render door at final state after 200ms fade-in, no chime.

After first appearance (`parlorDoorSeen === true`), the door simply exists in the wall on render — no animation.

### §4.5 — Firecrawl / Levels.fyi flow

```
offer arrives
  ↓
normalize (company_name_normalized, role, location)
  ↓
SELECT company_comp_bands WHERE (normalized, role, location) AND expires_at > now()
  ├── hit  → return {p25, p50, p75}
  └── miss → decrement Firecrawl budget; scrape; write row with expires_at = now()+30d
                ├── success → return bands
                └── empty/quota_exceeded → return {empty: true, reason}
```

**Firecrawl client.** Direct HTTP (no npm dep). Single function `scrapeLevelsFyi(company, role, location)` in `src/lib/comp-bands/firecrawl.ts`. Returns a normalized `CompBands | null`.

**Budget tracking.** Rough counter in `company_comp_bands` — a monthly budget row that tracks scrape count. Reject new scrapes if we're at ≥ 450 calls this month (50-call safety buffer for the free tier). Better to graceful-empty than to hit hard quota limit.

**Seeding.** A one-time dev script `scripts/comp-bands-seed.ts` that lets the human pre-populate top 20 companies for RE-finance + SWE sectors. Runs via `npx tsx`, uses `FIRECRAWL_API_KEY`. Not shipped via cron — on-demand only.

**Lookup endpoint.** `GET /api/comp-bands/lookup?company=&role=&location=` — server-only, requires auth. Returns `{p25, p50, p75} | {empty: true}`.

**Graceful-empty UI.** When `{empty: true}`, the CompBandChart renders an empty chart with honest copy: *"Not enough benchmark data for this role + location yet. Your offer stands alone."* No fake band. No extrapolation.

### §4.6 — Three-chair convening

One API endpoint: `POST /api/offers/:id/convene`.

Runs three `runSubagent` calls in parallel (`Promise.allSettled`) against:
- **Offer Evaluator** — NEW agent persona in `src/lib/agents/offer-evaluator/{system-prompt.ts,tools.ts}`. Sees the offer + comp bands. Short, decisive, numbers-driven. Flags risks (exploding offer, vesting cliff, unrealistic start date, comp outside market).
- **CFO** — existing persona. Sees the offer + comp bands. Computes total comp, 4-year projected comp with vesting schedule, cash-flow curve. Already has calc tools.
- **CNO** — existing persona. Sees the offer + the user's contacts at the offering company. Suggests who to reach out to for insider context or references. Warmth-aware.

Each returns a typed JSON block. The API stitches them into a single response:

```ts
type ConveningResult = {
  offer_evaluator: { verdict: "strong" | "market" | "under" | "thin_data", narrative: string, risks: string[] };
  cfo: { total_comp_year1: number, total_comp_4yr: number, vesting_note: string, narrative: string };
  cno: { contacts_at_company: Array<{name: string, warmth: number, note: string}>, narrative: string };
};
```

Each `runSubagent` writes one `agent_dispatches` row for observability.

**Why parallel.** Three sub-calls serially would take 3× longer. The user is watching this happen in real time — the three chairs "lean in" visually. Parallel is both faster and narratively honest ("they're all thinking at once").

**Why not streamed.** Each analysis is short (~ 200 words). SSE overhead isn't worth it. Display a "three chairs leaning in" animation while the fetch resolves; render all three blocks simultaneously when it arrives.

### §4.7 — Negotiation draft flow

1. User clicks "Draft negotiation" on a folder.
2. API `POST /api/offers/:id/negotiation-draft` — runs a targeted generateObject call against a negotiation-specialist system prompt (Offer Evaluator + voice-aware). Output: `{subject: string, body: string}`.
3. INSERT into `outreach_queue`:
   ```ts
   { type: 'negotiation',
     status: 'pending_approval',
     subject, body,
     metadata: { offer_id, convening_id_optional },
     send_after: null,        // not approved yet
     ... }
   ```
4. UI opens LiveCompose panel (from R5.4) with character-by-character reveal of the body. User reads along.
5. CEO voice button (if enabled) plays the body via `speechSynthesis`.
6. User edits in place.
7. User clicks "Send".
8. `POST /api/outreach/approve` — **with a parameter specifying `minimumHoldSeconds: 86400`** (24h). The route honors this by clamping `send_after = max(now() + 30s, now() + minimumHoldSeconds)`.
9. Cron sender picks up the row after 24h and mails via Resend.

**The 24h rule is enforced on the server in `/api/outreach/approve`.** The UI cannot bypass. Even if someone hand-crafts a POST without `minimumHoldSeconds`, the route looks up the queued row's `type` and applies the 24h clamp when `type === 'negotiation'`.

**Undo.** Within 24h, the user can cancel like any other queued outreach (R7's undo flow works unchanged).

### §4.8 — CEO voice three-layer

Direct analog of R6's `DrillVoiceMic` three-layer, but for OUTPUT not INPUT:

1. **Settings toggle.** `Settings → Personal Assistants → "CEO voice (reads negotiation drafts aloud)"`. Copy: *"Hear your CEO read drafts before you send them. You can turn this off anytime."* Persists in `user_profiles.preferences.ceoVoice.enabled`.
2. **Per-surface gate.** `<CEOVoicePlayButton />` returns null unless: `(enabled === true) && (typeof window !== 'undefined') && ('speechSynthesis' in window) && (SpeechSynthesisUtterance)`.
3. **Graceful fallback.** If no voice matches preferred profile (deep male en-US), fall back to the first en-US voice. If NO voice is available at all, button still returns null from layer 2.

**No server TTS.** Browser `speechSynthesis` only. Zero cost, zero latency, zero privacy concerns (never leaves device).

**Voice selection.** Prefer `en-US` + name containing ("Daniel"|"Alex"|"Fred"|"Google US English Male"). Fall back to first `en-US` voice. Always set `rate = 0.95`, `pitch = 0.92` (gravitas).

### §4.9 — Signature: CFO quip on first parlor entry

On first-ever mount of `ParlorScene`, fire a single dialogue-bubble from the CFO character:
- comp-aware (uses the first offer's band position):
  - **below p25** → *"They're underpricing you by {N}%. Walk in with confidence."*
  - **p25–p50** → *"Market, not celebratory. There's room to push."*
  - **p50–p75** → *"Solid offer. Small counter is safe; big counter needs leverage."*
  - **above p75** → *"This is generous. Negotiate on non-comp — vesting, signing, start."*
  - **thin_data** → *"No benchmark data yet. Negotiate on terms that aren't ambiguous — start date, signing, equity refresh."*

Tracked via `user_profiles.preferences.parlorCfoQuipShown: boolean`. Shown ONCE, ever.

## §5 — Flows (end-to-end)

### §5.1 — Happy path: first offer

```
email arrives (existing email-parsing infra, R0-ish)
  ↓ classifier marks as type='offer'
  ↓ offer-parse job (NEW, R10.3) extracts structured fields
  ↓ INSERT into offers
  ↓ comp-band lookup lazy-fires for this (company, role, location)
  ↓ Penthouse shows a milestone toast ("Your first offer. The door opens.")
  ↓ user clicks through to C-Suite
  ↓ CSuiteScene renders with doorSlot={<ParlorDoor firstAppearance />}
  ↓ materialization animation plays (2.3s), chime if sound on
  ↓ parlorDoorSeen=true written to preferences
  ↓ user clicks door → /parlor
  ↓ ParlorClient loads offer(s) + bands
  ↓ CFO quip fires (once, parlorCfoQuipShown=true)
  ↓ user clicks "Convene" → three chairs lean in → analyses appear
  ↓ user clicks "Draft negotiation" on folder
  ↓ LiveCompose reveals draft (CEO voice reads if enabled)
  ↓ user edits, clicks Send
  ↓ /api/outreach/approve clamps send_after = now()+24h
  ↓ 24h later, cron sends via Resend
```

### §5.2 — Unhappy paths

- **No comp data.** Scrape returns empty or over budget. CompBandChart renders empty-state copy. Convening still runs (OE notes "thin benchmark data"). Draft still generates.
- **Offer email doesn't parse.** Classifier marks email `type='offer'` but parser fails structured extraction. Surface in the Penthouse as *"Offer detected but we couldn't parse it — add manually?"* → link to `/parlor/new`. (Manual offer entry is part of MVP.)
- **Firecrawl budget exhausted.** All lookups return `{empty: true}` until next calendar month. Already in graceful-empty UI. A CFO cron could warn the user in month 3 if budget is hitting ceiling.
- **Voice unsupported.** Button never renders. No error, no degraded experience.
- **User deletes last offer.** `offerCount → 0`. Door absent on next C-Suite render. `/parlor` redirects. No animation for the door disappearing — it simply is not there when the user returns. (We could add a "wall healing" animation; YAGNI for MVP.)

## §6 — Testing

### §6.1 — Proof tests (architectural invariants — non-negotiable)

| Test                                                 | What it proves                                                                |
|------------------------------------------------------|-------------------------------------------------------------------------------|
| `parlor-door-absence.proof.test.tsx`                 | SSR with `offerCount===0` emits zero markers for the Parlor door              |
| `parlor-door-presence.proof.test.tsx`                | SSR with `offerCount>0` emits the door element with correct aria              |
| `parlor-route-gate.proof.test.ts`                    | `GET /parlor` with no offers redirects to `/c-suite`                          |
| `negotiation-send-hold.proof.test.ts`                | `/api/outreach/approve` clamps `send_after` ≥ 24h for `type='negotiation'`    |
| `comp-bands-graceful-empty.proof.test.ts`            | Lookup returns `{empty: true}` on 0-result scrape + honors budget ceiling     |
| `ceo-voice-three-layer.proof.test.tsx`               | Button renders null at each of the three gates (disabled / no-window / no-API)|

### §6.2 — Unit & integration

- Offers REST (CRUD + RLS).
- Offers parse (structured extraction from an email body).
- Convening API (mocked runSubagent × 3, asserts Promise.allSettled handling).
- Negotiation draft API.
- CompBandChart SVG snapshot with 0, 1, 2 pins.
- ParlorDoor first-appearance animation (tests that `gsap` timeline builds; JSDOM won't run frames — we only assert calls).
- CFO quip once-only logic (preference toggles correctly).

### §6.3 — Stretch tests (only if R10.13/R10.14 ship)

- Negotiation simulator scoring (anchoring, concession, walk-away).
- Reference-request drafting flow.

## §7 — Risk & rollback

| Risk                                                  | Mitigation                                                                        |
|-------------------------------------------------------|-----------------------------------------------------------------------------------|
| Firecrawl changes Levels.fyi HTML → scraper breaks    | Graceful-empty fallback already shipped. Fix scraper in a follow-up; no downtime. |
| 24h hold frustrates user mid-negotiation              | The undo flow remains — they can edit, cancel, re-queue. The 24h is non-bypassable by design (partner constraint).                                                                                             |
| `speechSynthesis` voice inventory differs by browser  | Layer-2 gate + sensible fallback voice. Test on Safari/Chrome/Firefox manually.   |
| Offers table grows with stale "declined" rows         | Status enum includes `declined`/`withdrawn` — user can filter; no auto-delete.    |
| Parlor door "appears" then offer is deleted instantly | Next render → door absent. No animation for disappearance in MVP. Acceptable.     |
| Convening call fan-out hits rate limits               | `Promise.allSettled` — one failure doesn't kill the other two. UI shows which succeeded.                                                                                                                        |

**Rollback plan.** R10 ships behind no feature flag (per convention). If a critical bug lands:
- **Parlor-only bugs**: door keeps rendering from server gate, but `/parlor` route can throw a maintenance page by editing the route file.
- **Data corruption risk in offers**: migration 0020 is additive only; no destructive changes. A rollback reverts the migration.
- **Outreach clamp regression**: the clamp is a bounded code change in `/api/outreach/approve`. Revert that PR; 24h hold goes back to the R7 30s default.

## §8 — Acceptance criteria (what flips `met: true`)

All must be true:

1. ✅ Migration 0020 applied locally; `offers`, `company_comp_bands` tables exist with RLS. `outreach_queue.type` enum extended.
2. ✅ All proof tests from §6.1 pass.
3. ✅ All unit/integration tests from §6.2 pass.
4. ✅ `tower verify R10` is green: tasks complete, blockers empty, drift clean, tsc + build + lint + tests green.
5. ✅ Manual smoke: seed one test offer; door materializes on C-Suite; Parlor opens; convening returns three blocks; draft writes a row to outreach_queue with correct send_after; CEO voice reads draft (if enabled + supported); CFO quip fires once.
6. ✅ No new console.log / TODO / FIXME in shipped code. No `any` types. `import type { JSX } from "react"` where needed.
7. ✅ None of the tripwires in §1 present in final diff.

## §9 — Decisions recorded in ledger

These go into `.ledger/R10-the-negotiation-parlor-c-suite-annex.yml` under `decisions`:

- **DE1.** Offers = new dedicated table (not extension of applications). *Why: the lifecycle diverges sharply at offer — comp structure, deadline, negotiation surface. Colocating with applications would bloat that table's hot path.*
- **DE2.** `company_comp_bands` = global cache (not user-scoped). *Why: comp bands are public-data. User-scoping would quadratic-ify scrapes with no privacy benefit. Read-all-authenticated policy is safe.*
- **DE3.** Three-chair convening is ephemeral (not persisted). *Why: regenerating on demand is cheap and stays fresh; a `convenings` table with cache invalidation would be more code for no user-facing value.*
- **DE4.** `/parlor` is a standalone route, NOT an elevator floor. *Why: the brief frames the Parlor as a **C-Suite annex** that materializes, not a permanent part of the tower hierarchy. Adding it to the elevator breaks the metaphor.*
- **DE5.** Firecrawl via direct HTTP (no npm dep). *Why: one fetch call, no need for a client library; avoids dep churn.*
- **DE6.** CEO voice via browser `speechSynthesis` (no server TTS). *Why: free, fast, private, good enough for reading drafts. OpenAI TTS would cost money and introduce a server round-trip for zero quality gain at this task.*
- **DE7.** 24h hold is clamped server-side in `/api/outreach/approve` based on row type, not a free parameter. *Why: non-bypassable is the partner intent. A free parameter is bypassable by a hand-crafted request.*
- **DE8.** CFO quip fires once, ever (tracked in preferences). *Why: brief says "make each visit memorable" — a quip on every visit becomes noise. Once is memorable; always is dull.*

## §10 — Task decomposition (for writing-plans)

Preliminary — writing-plans will refine into TDD-sized tasks.

| Task      | Subject                                                                       | Blocks           |
|-----------|-------------------------------------------------------------------------------|------------------|
| R10.0     | Design + autopilot flip (this doc)                                            | —                |
| R10.1     | Migration 0020 (offers, comp_bands, enum, preference key) + schema types      | R10.2–R10.11     |
| R10.2     | `offers-rest.ts` REST queries + types                                         | R10.3, R10.6, R10.7, R10.9 |
| R10.3     | Offers CRUD API (POST/GET/PATCH) + offer-email parser                         | R10.5, R10.6     |
| R10.4     | Firecrawl client + `comp_bands_rest.ts` + `/api/comp-bands/lookup`            | R10.7, R10.8     |
| R10.5     | Parlor door slot in CSuiteScene + ParlorDoor component + materialization      | R10.6            |
| R10.6     | `/parlor` route + ParlorScene + OakTable + OfferFolder + route gate           | R10.7, R10.8, R10.9 |
| R10.7     | Three-chair convening API (Offer Evaluator persona + CFO + CNO) + panel view  | R10.9            |
| R10.8     | CompBandChart SVG + percentile pins + multi-offer stack                       | R10.9            |
| R10.9     | Negotiation-script API + LiveCompose reuse + outreach_queue write             | R10.10, R10.11   |
| R10.10    | 24h send-hold clamp in `/api/outreach/approve`                                | R10.13           |
| R10.11    | CEO voice: Settings toggle + play button + speechSynthesis                    | —                |
| R10.12    | Signature: CFO quip on first parlor entry                                     | —                |
| R10.13    | [STRETCH] Negotiation simulator (CPO as recruiter)                            | —                |
| R10.14    | [STRETCH] CNO reference-request drafting                                      | —                |
| R10.15    | Acceptance verify + ledger close (`tower accept R10`)                         | —                |

## §11 — Open items / post-R10

- R8.x cross-user matching — deferred per partner.
- Levels.fyi alternative sources (Candor, h1bdata) — out of scope; revisit if Firecrawl proves unreliable.
- Offer-comparison PDF export — out of MVP; scaffold a `src/lib/pdf/offer-comparison-pdf.tsx` only if stretch time permits.
- Post-offer transition floor — §8 living expansions.

---

**End of design.** Proceeding to `superpowers:writing-plans` for the TDD implementation plan.
