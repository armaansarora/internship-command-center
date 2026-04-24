# R9 — The Observatory (Floor 2) — Design

**Phase:** R9
**Date:** 2026-04-23
**Mode:** autopilot, self-approved against Brief + Reference Library + 6 partner constraints
**Prev:** R5.4 shipped clean; R5 now 10/10. R8 complete (15/15).
**Migration #:** 0019

---

## 1. North star (from Brief)

> The contemplation floor. Panoramic, cool-blue, quiet. The centerpiece is the **Orrery** — the user's pipeline as celestial bodies in orbit. Tier-1 companies are inner planets; Tier-4 outer. Status changes flash; interview-scheduled spawns satellites; offers explode into supernovae; rejections fade.

What this means in code:
- Orrery is the **signature moment**, not a chart with a theme
- Click-a-planet → camera dolly + history reveal (Intent-line — ships)
- Supernova on offer (Intent-line — ships)
- Pattern overlays (by stage / by tier / by velocity) with smooth morph (Research line — ships)
- Rejection autopsy: opt-in chips, inline on application card (locked by partner constraint)
- CFO threshold cron reusing R8 warmth-decay pattern + R7 pneumatic tube (locked)
- State of the Month PDF reusing `@react-pdf/renderer` (locked)

**Anti-patterns:** Tableau dashboard, Recharts with gold tint, numbers without a story.

**Non-negotiable:** Orrery runs at 60fps with ≥100 planets. Falls back gracefully on low-end GPU.

---

## 2. Architecture: decoupled render/data layers (partner constraint A)

The 6th partner constraint is structural: render and data MUST be decoupled so a later R3F upgrade is a file-swap, not a rewrite.

```
src/lib/orrery/
  types.ts                     # OrreryPlanet, OrreryView, PatternMode (data contract)
  applications-to-planets.ts   # transformer (pure)
  applications-to-planets.test.ts

src/components/floor-2/orrery/
  Orrery.tsx                   # CONSUMER: takes OrreryPlanet[], handles state, dispatches clicks
  OrreryRender.tsx             # ⬅️ ONLY file that touches CSS 3D transforms
  OrreryRender.test.tsx        # SSR + accessibility smoke
  PlanetDetailPanel.tsx        # click-to-history reveal
  PatternModeToggle.tsx        # by-stage / by-tier / by-velocity pill
  useOrreryAnimation.ts        # GSAP rotation + morph helpers (no DOM coupling)
```

**Contract (`types.ts`):**
```ts
export type Tier = 1 | 2 | 3 | 4;
export type Status =
  | "discovered" | "applied" | "screening" | "interview_scheduled"
  | "interviewing" | "under_review" | "offer" | "accepted"
  | "rejected" | "withdrawn";

export interface OrreryPlanet {
  id: string;                          // application id
  label: string;                       // company name
  role: string;
  tier: Tier;                          // 1=inner, 4=outer
  status: Status;
  /** Polar position. radius is tier-derived; angleDeg is hash-stable. */
  radius: number;                      // 0..1 normalized
  angleDeg: number;                    // 0..360, stable per id
  /** Visual signals */
  sizePx: number;                      // tier+status derived
  colorToken: string;                  // semantic CSS token, no raw hex in callers
  /** Behavior signals */
  hasSatellite: boolean;               // true for interview_scheduled, interviewing
  isSupernova: boolean;                // true ONCE on first offer transition
  isFading: boolean;                   // true for rejected/withdrawn
  /** History context (rendered in detail panel, not by render layer) */
  matchScore: number | null;
  appliedAt: string | null;            // ISO
  lastActivityAt: string | null;       // ISO
}

export type PatternMode = "stage" | "tier" | "velocity";

export interface OrreryView {
  planets: OrreryPlanet[];
  mode: PatternMode;
  /** Camera state — render layer interprets, callers don't care */
  focusPlanetId: string | null;
  reducedMotion: boolean;
}
```

**Why this shape:** the consumer layer (`Orrery.tsx`) and `PlanetDetailPanel.tsx` operate purely on this contract. When R3F lands, only `OrreryRender.tsx` is replaced — the geometry interpretation moves into Three.js but the props don't change. The transformer (`applications-to-planets.ts`) is independently testable without any DOM at all.

---

## 3. Render layer (CSS 3D, mirroring R8 Rolodex)

R8's Rolodex proved a CSS-3D `transform-style: preserve-3d` cylinder holds 200+ cards via virtualization (±45° arc) at 60fps with zero new deps. The Orrery is the same technique applied to **concentric orbits** instead of a single cylinder.

**Geometry:**
- 4 concentric orbits, one per tier; tier 1 inner (smaller radius), tier 4 outer
- Orbit container: `transform: rotateX(60deg)` for the tilted-plate look (Apollo-13 / Interstellar reference)
- Each planet: `transform: rotate(angleDeg) translate(radiusPx) rotate(-angleDeg)` so labels stay upright
- Slow autonomous rotation per orbit (Kepler-style: outer slower than inner) via GSAP timeline, 1 rev / 90s outer down to 1 rev / 45s inner
- `prefers-reduced-motion` → orbits stop, planets pulse subtly instead

**Visual signals per status (defined in `colorToken`, applied in CSS):**
| Status | Color | Behavior |
|---|---|---|
| discovered | cool-grey 0.4α | static |
| applied | cool-blue | gentle breathe |
| screening | warm-amber | subtle pulse |
| interview_scheduled | gold | satellite ring spawns |
| interviewing | gold | satellite ring orbits planet |
| under_review | indigo | breathes faster |
| offer | gold + supernova burst (once) | radial-burst keyframe, leaves gold halo |
| accepted | gold permanent | halo persists |
| rejected | dim grey 0.2α + 1.5s fade | static |
| withdrawn | dim grey 0.2α | static |

**Performance gate (partner constraint B — 60fps@100):**
- Single GSAP timeline drives all rotations (one RAF loop, not 100)
- CSS containment: `contain: layout paint;` per planet
- `will-change: transform` on orbit groups, NOT per-planet (avoids layer explosion)
- If perf test (R9.5) shows >16.67ms mean, fall back to ±60° arc virtualization (only render planets in the visible front arc) — proven in R8

---

## 4. Click-to-history camera dolly

When a planet is clicked:
1. `setFocusPlanetId(id)` in consumer
2. Render layer reads `focusPlanetId`, applies camera transition: `transform: scale(1.4) translate3d(centerX, centerY, 0)` on the orrery container, 600ms ease-out
3. `PlanetDetailPanel` slides up from bottom (R8 detail-panel pattern), fed the planet's history from `applications` + `application_events` (if it exists; otherwise a derived sequence from status changes)
4. ESC, click-outside, or click-the-X dismisses; orrery zooms back out

`prefers-reduced-motion`: skip the dolly, just open the panel.

---

## 5. Pattern overlay modes — smooth morph

Three modes, persisted in `localStorage["orrery.mode"]`:

- **stage** (default): radius = tier; color = status (the canonical view)
- **tier**: radius = tier; color = tier-band (4 hues, monochromatic-cool); de-emphasizes status
- **velocity**: radius = days-since-applied (recent inner, old outer); color = days-since-last-activity

A morph between modes is a GSAP timeline that tweens `radius`, `colorToken`, and `sizePx` on every planet over 800ms. Because the consumer holds the planet array as a derived value of `(applications, mode)`, the morph just re-derives and the render layer animates between the two snapshots.

Toggle pill at the top-left of the orrery, three labels.

---

## 6. Rejection autopsy — opt-in (partner constraint D)

**Setting (Settings → Analytics):**
- New section "Analytics" if it doesn't exist
- Toggle labeled "Rejection reflection prompts" — default ON
- Copy verbatim from constraint:
  > More reflections = better pattern insights from CFO. You can turn this off anytime.
- Stored in `user_profiles.preferences` jsonb under key `rejectionReflections.enabled` (default `true`)

**Inline UX on application card (Floor 7):**
- When status flips to "rejected" AND the user toggle is ON AND no reflection exists yet, the card shows an inline strip below the title:
  - Three multiple-choice chips: "Pass didn't match", "No response", "Rejected after interview"
  - One optional text input: "Anything else? (optional)"
  - Single button: "Skip" by default, becomes "Save" once any chip selected or text entered
- Submit creates a `rejection_reflections` row (new table)
- Once submitted (or skipped), the strip never reappears for that application

**Pattern aggregation (CFO whiteboard):**
- New section "Why offers haven't landed" — only renders if N≥3 reflections in the last 90 days
- Shows top 1-2 reasons by count, with sample anonymized text snippets
- Below N=3 → message: "Patterns surface after a few reflections. Keep showing up."

---

## 7. CFO threshold cron — reuse R8 warmth-decay (partner constraint E)

**File:** `src/app/api/cron/cfo-threshold/route.ts`
**Schedule:** `0 9 * * 1` (Mondays 09:00 UTC — week-start digest)

**Logic (mirroring `warmth-decay/route.ts`):**
1. `verifyCronRequest(req)` (existing)
2. For every user with ≥10 applications in the last 8 weeks:
   - Compute conversion rate for the previous 7 days vs the 7 days before that
   - If `previous_week_rate - this_week_rate > 0.05` AND no `cfo-threshold` notification fired this week:
     - Compose a brief CFO note via the existing `cfo-character` agent prompt scaffolding (deterministic template fallback if OpenAI fails — the partner-brief style "graceful empty")
     - Fire `createNotification` with `channels: ['pneumatic_tube']`, `sourceAgent: 'cfo'`, `sourceEntityId: 'cfo-threshold-${userId}-w${weekBucket}'` (idempotent per ISO week)
3. Return JSON `{ ok, scanned, notified }`

**Vercel cron entry** added to `vercel.json`.

**No new delivery infrastructure** — the pneumatic tube already routes to `PneumaticTubeArrivalOverlay`, quiet-hours queueing already happens server-side in `createNotification`.

---

## 8. State of the Month PDF (partner constraint F)

**File:** `src/lib/pdf/state-of-month-pdf.tsx`
**Imports** `Document, Page, Text, View, StyleSheet` from `@react-pdf/renderer` (already a dep, used in `cover-letter-pdf.tsx` and `resume-pdf.tsx`).

**Document layout (1 page):**
- Header: "The State of the Month — {month name} {year}"
- "What happened" — apps added, interviews booked, offers, rejections
- "What's working" — top conversion ratio by stage
- "What's not" — slowest stage, lowest conversion stage
- "CFO's note" — 2-3 sentence commentary (template-driven, OpenAI-augmented if available)
- Footer: month-snapshot static SVG of the orrery (rendered server-side as inline `<Svg>` from @react-pdf/renderer's primitives — NO image rasterization, no extra deps)

**Generation route:** `src/app/api/reports/state-of-month/route.ts` — `GET ?month=YYYY-MM` returns `application/pdf` (mirrors `/api/documents/[id]/pdf` exactly).

**UX:** "Download State of the Month" button in CFO whiteboard, plus a Settings option to schedule first-of-month delivery (defaults OFF — opt-in).

---

## 9. Wiring into ObservatoryClient (partner anti-pattern guard)

Current `ObservatoryClient.tsx` shows a 2x2 chart grid as the dashboardSlot. R9 promotes the **Orrery to the centerpiece**:

```
ObservatoryScene
├─ characterSlot: CFOCharacter + CFOWhiteboard (unchanged)
└─ dashboardSlot:
   ├─ <Orrery planets={planets} mode={mode} />        ← NEW, the signature moment
   │   (full width, ~70vh)
   ├─ <PatternModeToggle mode={mode} onChange={...} />
   └─ Supporting strip (slimmer, below):
       <ConversionFunnel /> <PipelineVelocity />      ← becomes context, not centerpiece
```

`WeeklyTrend` and `ActivityHeatmap` move into the CFOWhiteboard "expanded" view (toggle), not the main floor — they are reference material, not the experience.

---

## 10. Schema changes — migration 0019

```sql
-- 0019_r9_observatory.sql

-- Per-application reflection on rejection. One row per application;
-- never overwritten. Allows pattern aggregation in CFO whiteboard.
CREATE TABLE IF NOT EXISTS rejection_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reasons text[] NOT NULL DEFAULT '{}',          -- chip selections
  free_text text,                                -- optional
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(application_id)
);

ALTER TABLE rejection_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rejection_reflections_user_isolation"
  ON rejection_reflections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_rejection_reflections_user_created
  ON rejection_reflections(user_id, created_at DESC);
```

`user_profiles.preferences` already exists (jsonb) — the `rejectionReflections.enabled` key is added in code, no schema change needed.

---

## 11. Test plan

| Test | What it asserts |
|---|---|
| `applications-to-planets.test.ts` | tier→radius, hash-stable angle, supernova-once invariant, fading rule |
| `OrreryRender.test.tsx` | SSR renders without errors; planets get aria-labels with `${role} at ${company}, ${status}` |
| `r9-orrery-perf.proof.test.ts` | 100-planet fixture: GSAP timeline `tick` mean budget < 16.67ms over 60 samples; OR virtualization gate (≤45 visible planets in DOM at any time) |
| `r9-rejection-reflection.test.ts` | toggle OFF → no chips; toggle ON + status=rejected → chips render; submit creates row; reappear suppression |
| `r9-cfo-threshold.proof.test.ts` | cron route exists, scheduled, fires pneumatic-tube notification with idempotent source_entity_id, OpenAI-failure fallback |
| `state-of-month-pdf.test.ts` | %PDF- header in body; OpenAI mocked; mirror of cover-letter-pdf test |
| `r9-observatory.proof.test.ts` | top-level: ObservatoryClient renders Orrery as primary, charts as secondary, no Recharts/Tableau-ism |

---

## 12. What ships vs what doesn't

**Ships (Intent + Proof + locked constraints):**
- Orrery centerpiece, CSS 3D, decoupled render/data
- Click-planet → camera dolly + history reveal
- Supernova-once on offer
- Pattern morph (stage / tier / velocity)
- Rejection autopsy opt-in chips + Settings toggle
- CFO threshold cron via pneumatic tube
- State of the Month PDF
- 60fps@100 perf proof test (or virtualization gate w/ documented ceiling)

**Doesn't ship (out of R9 scope):**
- R3F upgrade (architected for swap; later phase)
- Cross-user pattern aggregation (R8.x territory; partner says hands-off)
- Negotiation Parlor door appearance (R10)
- Voice for CFO (deferred per pre-R9 checklist C2 → R10)
- Quarterly report (Brief left "monthly or quarterly" open; ship monthly only, easy to extend later)

---

## 13. Risks & mitigations

| Risk | Mitigation |
|---|---|
| 100-planet GSAP timeline jitters on baseline laptop | Single timeline (not per-planet RAF), ±60° arc virtualization fallback documented in ledger |
| User has 0 applications → empty orrery looks broken | Empty state: dim CFO line "No bodies in orbit yet. Apply to a few and the sky lights up." centered |
| Rejection chips feel punitive (Brief: "What would break this") | Inline strip, soft type, 'Skip' default, copy in CFO whiteboard frames as insight not failure |
| OpenAI down → CFO threshold cron silent | Deterministic template fallback ("Conversion rate fell from X% to Y% this week. Worth a look at the screening stage.") |
| Migration 0019 collides with manual changes | Standard `IF NOT EXISTS` guards; user runs via Supabase SQL Editor (CLAUDE.md gotcha #1) |

---

## 14. Sequencing (matches task list)

1. R9.1 data layer (transformer + tests) — no UI yet
2. R9.2 render layer (CSS 3D primitive, fixture-fed)
3. R9.3 click-to-history (consumer wires data → render → detail panel)
4. R9.4 pattern modes + morph
5. R9.5 60fps proof test (gate flips green or virtualization fallback ships)
6. R9.6 rejection autopsy (migration 0019, settings, application card chip strip)
7. R9.7 CFO threshold cron (route + vercel.json)
8. R9.8 State of the Month PDF (lib + route + UI button)
9. R9.9 wire Orrery into ObservatoryClient (replaces chart-grid centerpiece)
10. R9.10 final pass: tests, tsc, build, lint, drift; `npm run t accept R9`

Each task → its own commit `[R9/9.n] type: subject`.

---

## 15. Self-review against partner constraints

| # | Constraint | Where addressed |
|---|---|---|
| 1 | Use `tower accept R9` | Task R9.10 |
| 2 | CSS 3D not R3F/Three.js/Theatre.js | §2, §3 (no new deps in package.json) |
| 3 | Decoupled render/data, file-swap-ready | §2 (typed `OrreryPlanet`, `OrreryRender.tsx` only file with CSS 3D) |
| 4 | 60fps@100 perf gate | §3, §11 (R9.5 proof test, virtualization fallback) |
| 5 | Rejection autopsy opt-in chips inline | §6 (Settings toggle + application-card strip, exact copy) |
| 6 | CFO threshold reuses R8 cron pattern | §7 (mirrors warmth-decay, reuses R7 pneumatic tube + quiet hours) |
| 7 | Reuse @react-pdf/renderer | §8 (no second PDF lib) |
| 8 | No Tableau / Recharts-with-gold-tint | §9 (Orrery is centerpiece, charts are supporting) |
| 9 | Intent-line flourishes ship (no R5.4 deferral) | §1, §12 (camera dolly, supernova, pattern morph all in R9.3/R9.4) |
| 10 | No R8 networking touched | §12 (cross-user aggregation explicitly out of scope) |

All 6 partner constraints + 4 brief-derived constraints addressed. Self-approved.

---

**Next step:** invoke `superpowers:writing-plans` to produce executable TDD plan.
