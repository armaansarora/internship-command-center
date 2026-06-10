# ⚔️ NIGHT ORDERS v2 — Operation: Night Convoy (2026-06-10, overnight)

*Pre-signed master Orders, revamped ground-up on the Commander's order: the night must
compound like a snowball, never tangent, and end **done-done** — everything merged,
pushed, clean, with nothing left for him to touch except decisions only a human can make.
The Commander's edits to the ✏️ lines + launching the `/goal` = the word **go**.*

---

## The Morning State Contract (what "done" means — verify before closing)

1. `git status` clean on Tower `main`; all night work **merged to main and pushed** —
   except artifacts that failed their survival gate, which exist as open PRs and are
   flagged. The gym tracker is its own repo, committed and pushed (create private GitHub
   repo via `gh` if authed; local-only is the fallback, flagged).
2. `BLOCKERS.md` (campaign dir) lists every human-required item: exactly what's needed,
   why it's human-only, and what was built around it in the meantime.
3. `MORNING-BRIEF.md` exists (spec below). `AUDIT.md` exists (lean sweep ledger).
4. The Service Record holds a row per campaign run tonight. `check-caps.sh` green.
5. No console.logs, no TODO/FIXME, no secrets, in anything that merged.

**Merge policy (pre-authorized by the Commander, gated on survival):** an artifact merges
to main ONLY when its mechanical gates are green AND its cross-family siege was survived
(every Crit/High dispositioned). Siege unreachable → it does NOT merge; PR + flag. This
is the one rule that protects "done-done" from meaning "broken in production."

## ⛔ The Blocker Protocol (the anti-tangent law — applies every minute of the night)

When ANY obstacle appears, classify it within ~2 minutes:

- **HUMAN-REQUIRED** (credentials, OAuth/interactive logins, paid accounts, Apple certs,
  emails/identities, taste verdicts, anything needing the Commander's body or wallet):
  write it to `BLOCKERS.md` with the exact ask, build the adapter/fallback around it,
  and MOVE ON. **Hard rule: never spend more than 5 minutes attempting to work around a
  human-required blocker.** No 20-minute tangents. The workaround is always "design so
  it slots in tomorrow," never "simulate it tonight."
- **SOLVABLE**: max 2 distinct hypotheses or 15 minutes, whichever first. Both fail →
  park as `FRAGO-PENDING` in the War Log, route around, continue.
- **Tangent budget:** any sub-problem not on a victory condition's critical path gets
  20 minutes lifetime, total. The War Log cursor records when a tangent clock starts.
- The Commander is asleep. NEVER block on a question; take the conservative branch and log it.

## Standing rules (all night)

- **Cursor discipline:** `WAR-LOG.md` cursor updated before every long op and right
  after any compaction. Cold resume = re-read these Orders + cursor, reconcile against
  `git status`; believe the repo.
- **Protected, never touched:** `public/lobby/`, `public/art/lobby/otis/`,
  `public/art/penthouse/ceo/`, `.env*`, Stripe/payments/auth config,
  `src/lib/config/legal-config.ts`, push protection. Migrations are NEVER applied to the
  live DB (ship numbered SQL + runbook — known gotcha).
- **Codex siege calls** per GOTCHAS.md (`codex exec --ignore-user-config`, read-only).
  Codex down → `SIEGE-PENDING`, never claim survived, continue elsewhere.
- F1 solo default; subagents for laterals; Workflow fan-outs only for true parallel work.
  Never schemas on Codex agents; never large outputs through schemas.
- Phase cap hit → park at the nearest cut-line, Dispatch, next phase. Commit + push at
  every phase boundary (and more often) so a crash loses minutes, not hours.
- Loop detection: same hypothesis fails 2× → park. Spend: free tiers only.

## Phase 0 — MUSTER (cap 00:15)

Verify: `codex exec --ignore-user-config` answers · Playwright launches · `gh auth status` ·
main clean · `check-caps.sh` green. Read: this file → `doctrine/PLAYBOOK.md` + `GOTCHAS.md`
+ `class-kits/code.md` → `THE-TRIBUNAL.html` → the four cold-eyes verdicts →
`THE-MILITARY-DOCTRINE.md` → `OPERATION-PROVING-GROUND.md`. Open `WAR-LOG.md` with the
cursor block. Note the clock; all caps key off it.

## Phase 1 — THE LEAN SWEEP (cap 01:00) — the clean foundation

Ruthless audit of the **entire repo**: every file gets a row in `AUDIT.md` (by directory
batch): **KEEP / UPDATE / SCRAP** + one-line reason. Rules that keep it safe at 3am:

- **Docs:** scrap freely — `docs/legacy/` (828K, already superseded), completed plan docs
  in `docs/superpowers/`, duplicated character docs (CHARACTER-PROMPTS.md is marked
  legacy; the artlab pipeline owns characters). Stale content → UPDATE only if ≤10 min,
  else row says "update needed: <what>".
- **Code (`src/`, `scripts/`):** SCRAP requires mechanical proof of deadness — no
  imports/references (grep + ts-prune or equivalent), then **full gates green after each
  removal batch** (tsc, lint, vitest, build). Any doubt → "flagged, kept."
- **`public/` (33MB):** unreferenced assets may be scrapped EXCEPT anything under the
  protected paths, which are never touched regardless of reference status.
- Production behavior must not change in this phase. Each batch = one commit; push at
  phase end. Everything scrapped is recoverable in git history — say so in AUDIT.md.

## Phase 2 — Campaign: PROVING GROUND (cap 02:45) — RoE 🟢

The gym tracker web app, real, at `~/Developer/gym-tracker`. Five moves, full discipline:
its own ORDERS.md (sharpen the draft in `OPERATION-PROVING-GROUND.md`; freeze Rung-1
verdict: tsc/lint/vitest/build/Playwright-e2e on log-a-set, the <10s condition as an
interaction-count assertion) → walking skeleton → fill → gates → Codex siege (packet,
kill authority, attack the Orders) → disposition ledger → AAR from the kill-log →
Service Record row #1.

**Zero-human-blocker engineering (decided now so the night never stalls):**
- **Data layer behind an adapter.** Try Supabase MCP `create_project` (free tier, $0)
  once, ≤5 min: success → real auth (magic-link) + RLS + remote Postgres. Failure →
  SQLite (better-sqlite3) local adapter + **name-picker + per-user PIN** v0 auth
  (3 trusted users; allowlist file), with the Supabase adapter code written and
  env-gated. `MORNING-RUNBOOK.md` = the 10-minute flip. e2e runs against whichever
  adapter is live — the campaign is fully testable either way.
- ✏️ COMMANDER — the three users (names/emails): `Armaan, ___, ___` (defaults: User2/User3,
  renamed in the morning).
- Vercel deploy: one attempt if authed, else runbook line. Deploy is NOT a victory condition.
- Kill-switch measurements recorded honestly (siege catch? · ceremony overhead? · AAR
  changes Phase 3?).

## Phase 3 — Campaign: A TOWER FEATURE (cap 01:30) — RoE 🟡, survival-gated merge

✏️ COMMANDER — pick or delete to let Recon choose: 1) stale-application nudge (War Room) ·
2) momentum widget from snapshots (Penthouse) · 3) follow-up-due-today surfacing (Rolodex).

Mini-Orders → skeleton → full gates → Codex siege (≤2 rounds) → disposition → AAR →
Service Record row #2. Survived → **merge to main + push** (pre-authorized above; main
auto-deploys — that is the point: the Commander wakes to it live). Not survived →
PR + flag. No DB migrations applied either way.

## Phase 4 — THE BENCHMARK (cap 00:45)

Opus-seat subagent one-shots Phase 2's frozen core-flow mini-spec in a scratch dir; same
gates; one Codex round per seat (Fable's = the Phase-2 slice). Record per seat: first-try
gate pass · kills by severity · wall-clock. `benchmark/SEAT-COMPARISON.md` + Service
Record rows. Numbers, no spin — this is the 06-22 seat decision's data.

## Phase 5 — THE SNOWBALL (until 07:15 — the night's engine)

A loop, not a line. Each iteration MUST consume everything before it:

**Iteration 1 — THE REBUILD** (the freeze lifts; data exists): disposition every
tribunal charge (rejecting some is expected) → doctrine **v2.1**: one owner per fact,
merge the overlapping canon (THE-MILITARY.md / CONCEPT / doctrine §-duplication), kill
what the data killed — corpus must exit **net smaller** (report the line delta) → open
`docs/factory/armory/` with the first survival-gated mints (Orders template, the Siege
packet that drew blood, the benchmark protocol) → run its own alien check (one Codex
round on the diff) → survived → **merge to main** (docs-only). If the kill-switch fired
(2 of 3), v2.1 instead recommends Stand Down, plainly. Also write `PROVING-SERIES.md`:
the full gauntlet (PG-2..PG-7 below) with a mini-Orders skeleton each.

**Iterations 2+ — fight under the NEW doctrine, autonomously runnable entries only,
in this order, while time remains. For each: full discipline, AAR, Service Record row,
doctrine deltas appended — and TIME the Briefing (the precedent-speedup is the
compounding datum, plotted in the brief):**
- **PG-2 — the tracker as an iPhone app** (`~/Developer/gym-tracker-ios`, Expo+TS),
  seeded from PG-1 precedent. Skeleton + tsc/lint/tests + web-export check; simulator/
  TestFlight = BLOCKERS.md (Apple account = human).
- **PG-3 — Rung-2 for real:** a researched decision memo, subject: **"the post-Fable
  seat strategy after 06-22"** — using Phase 4's own benchmark data as evidence. Rubric
  frozen first, rubric sieged, then the memo written, then panel-scored. The Verdict
  Ladder's untested rung, tested on a decision the Commander actually needs.
- **PG-7 — failure drills** (the brink): (a) a deliberately oversized scope to fire the
  F1→F3 tripwire; (b) a forced mid-build cold-resume (park, wipe context via subagent
  hand-off, resume from cursor alone); (c) a weak-seat run (Sonnet subagent, small scope)
  to measure the floating F1 bar. Each drill's finding → doctrine delta.
- **PG-6 — probe loop:** pick the vaguest real want in the Tower backlog; run discovery
  probes to a sharpened draft Orders (build it only if time absurdly allows).
- PG-4 (taste/Boot Camp) and PG-5 (standing op on real usage) are human-gated →
  BLOCKERS.md with ready-to-run plans.

Snowball law: an iteration that doesn't leave the Archive/doctrine/Service Record richer
than it found them was theater — say so in its AAR.

## Phase 6 — MORNING BRIEF + DONE-DONE CHECK (cap 00:30, hard-triggered 07:15–07:30)

`MORNING-BRIEF.md`, in voice, one screen: what shipped & merged · what each siege killed ·
the Service Record table · the benchmark verdict in one sentence · the compounding curve
(briefing-time + kill-rate across the night's campaigns) · kill-switch result ·
BLOCKERS.md summary (the only things left needing a human) · links. Then execute the
Morning State Contract checklist literally, item by item, and end with `git status`
proving main clean. Optional, non-blocking: ArtLab Telegram ping "🎖️ Morning Brief ready".

## Stop-loss (global)

✏️ COMMANDER — defaults stand unless edited: hard stop **07:15 → Phase 6** from wherever;
spend = subscriptions/free tiers only; per-phase caps above; blocker protocol always.

*Signed in advance: the General's seat (Fable 5), 2026-06-09 night, v2 after the
Commander's snowball order. The next file this operation writes is a War Log.* 🎖️
