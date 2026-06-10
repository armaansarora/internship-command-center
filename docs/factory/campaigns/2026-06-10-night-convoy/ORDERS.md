# ⚔️ NIGHT ORDERS — Operation: Night Convoy (2026-06-10, overnight)

*Pre-signed master Orders for the overnight autonomous run. The Commander edits the ✏️
lines, launches the `/goal`, and sleeps. Tripwire compliance: this is a CAMPAIGN artifact,
not doctrine — the next files this operation creates are War Logs, exactly as the
tribunal demanded. The doctrine freeze holds until Phase 4, where it lifts BECAUSE field
data will exist by then.*

---

## Mission

Run the expanded Convoy end-to-end in one night: **use** The Military for real (two
campaigns + a seat benchmark), then **rebuild** it from what the field data and the four
cold-eyes verdicts prove — and leave the Commander a one-screen Morning Brief with
everything done, attacked, recorded, and awaiting only his merges.

**The night's victory conditions:**
1. Campaign 1 (Proving Ground) produced the full artifact set: Orders, War Log, kill-log
   + disposition ledger, AAR-from-the-attacker's-kill-log, Service Record row — and a
   working, gate-green, sieged gym tracker.
2. Campaign 2 (Tower feature) produced the same artifact set, as an OPEN PR — never merged.
3. The benchmark produced a measured Fable-vs-Opus Service Record comparison (the exit thesis).
4. The Rebuild produced doctrine v2.1 as a PROPOSAL branch + PR with the corpus **net
   smaller** (report the line delta), every tribunal charge dispositioned, and the first
   Armory mints (survival-gated only).
5. `MORNING-BRIEF.md` exists, in voice, one screen, with every decision the Commander
   must make listed with links.

## Standing rules for the whole night (non-negotiable)

- **The Commander is asleep. NEVER block on a question.** Any fork that would normally
  need him: take the conservative branch, log it in the War Log as `FRAGO-PENDING`, keep
  moving. Anything 🔴 (payments, auth config, deletion, main-branch merge, spend beyond
  free tiers) → leave as a proposal for morning.
- **Cursor discipline** (compaction WILL happen): `WAR-LOG.md` cursor block updated
  before every long operation and immediately after any compaction. Cold resume =
  re-read these Orders + the cursor, reconcile against `git status` — believe the repo.
- **Wall-clock caps per phase** (below). Cap hit → park at the nearest cut-line, write
  the Dispatch, move to the next phase. A parked phase beats a hung night.
- **Siege-blocked rule:** if Codex is unreachable, mark the campaign `SIEGE-PENDING`
  (never claim survived), continue other phases. Codex invocation per GOTCHAS.md:
  read-only via `codex exec` with `--ignore-user-config`.
- **Protected, never touched:** `public/lobby/`, `public/art/lobby/otis/`,
  `public/art/penthouse/ceo/`, Tower `main` branch (no direct commits, no merges),
  `.env*`, Stripe/auth config, `src/lib/config/legal-config.ts`. No secrets in any commit.
- **Force discipline:** F1 solo by default; subagents for laterals; Workflow fan-outs
  ONLY for genuinely parallel work (siege lens panel, benchmark seats). Escalate on
  measured walls only. Beware the known Workflow gotchas (GOTCHAS.md): no schemas on
  Codex agents, no large outputs through schemas.
- All campaign records live under `docs/factory/campaigns/2026-06-10-night-convoy/`.
  Commit early, commit often, on the right branch per phase RoE.

## Phase 0 — Muster (cap 00:20)

Verify the ground, then open `WAR-LOG.md` with the cursor block:
- `codex exec --ignore-user-config` answers (one-line ping) · Playwright launches ·
  `git status` clean on main · `docs/factory/doctrine/check-caps.sh` green.
- Read, in order: this file · `doctrine/PLAYBOOK.md` · `doctrine/GOTCHAS.md` ·
  `doctrine/class-kits/code.md` · `THE-TRIBUNAL.html` (the charge sheet IS the night's
  conscience) · the four `2026-06-09-cold-eyes-*.md` verdicts · `OPERATION-PROVING-GROUND.md`.

## Phase 1 — Campaign: PROVING GROUND (cap 03:30, incl. siege) — RoE 🟢

The gym tracker, per `docs/factory/OPERATION-PROVING-GROUND.md`, built for real.

- **Terrain:** NEW repo at `~/Developer/gym-tracker` (git init; local commits; create a
  GitHub repo only if `gh` is already authed — else local is fine tonight).
  Stack per the class kit: Next.js + Supabase + Tailwind, typed, RLS, @supabase/ssr.
- **Write its own ORDERS.md first** (in `proving-ground/`), sharpening the draft's
  victory conditions; freeze the verdict: Rung 1 — tsc, lint, vitest, build, Playwright
  e2e on log-a-set (the <10s condition asserted as ≤N interactions in e2e).
- **Users:** ✏️ COMMANDER — names/emails of the three users, or leave as-is and the app
  ships with an `allowlist.ts` config + magic-link auth, emails added in the morning.
  Default visibility: all three see each other's logs (per the draft Orders).
- **Walking skeleton first** (log a set → see it in history, end-to-end, ugly), then
  fill. First Contact = a War Log dispatch + screenshot.
- **Deploy chain (each step optional, fall through silently):** Supabase project via
  MCP if available and $0 → else write numbered SQL migrations + `MORNING-RUNBOOK.md`
  (10-minute setup for the Commander). Vercel deploy if authed → else runbook line.
  The kill-switch metrics do NOT require deployment.
- **The Siege:** full packet to Codex (kill authority, praise forbidden, attack the
  ORDERS not just the diff, severity taxonomy) → disposition ledger → fix Crit/High →
  one more round (🟢 = 1 round; a second only if round 1 drew blood).
- **Debrief:** AAR authored FROM the kill-log; Service Record row #1 into
  `SERVICE-RECORD.md` (kill-rate, first-pass survival, est-vs-actual, intervention
  count = 0 by construction, wall-clock, token estimate); lesson deltas appended to
  doctrine files ONLY as `GOTCHA:` entries (behavioral PLAYBOOK rules wait for
  campaign 2 confirmation, per two-speed graduation).
- **Measure for the kill-switch, honestly:** (a) did the Siege kill anything the gates
  missed? (b) ceremony overhead (Orders+log+AAR time) vs. build time. (c) does the AAR
  change how Phase 2 runs?

## Phase 2 — Campaign: A TOWER FEATURE (cap 02:00) — RoE 🟡 (branch + PR ONLY)

The four verbs run silently on the product that pays rent. Branch `feature/night-convoy-*`.

✏️ COMMANDER — pick one or delete to let the General choose by Recon-measured fit:
1. **Stale-application nudge** (War Room): applications untouched N days get a visible
   nudge + one-tap follow-up action.
2. **Momentum widget** (Penthouse): 7-day activity sparkline + streak from the existing
   snapshots data.
3. **Follow-up-due-today surfacing** (Rolodex): contacts with due follow-ups float to
   the top with a badge.

Same discipline as Phase 1: mini-Orders → skeleton → gates (full class-kit list) →
Codex siege (2 rounds max, 🟡) → disposition → AAR → Service Record row #2 → **open a
PR with screenshots; never merge.** Supabase schema changes: numbered SQL + runbook,
never applied (gotcha: unattended migrations are a handoff).

## Phase 3 — THE BENCHMARK (cap 01:30) — the exit thesis, measured

Extract a frozen mini-spec from Phase 1's Orders (the core log-a-set flow: schema, API,
UI, tests). In a clean scratch dir, an **Opus-seat subagent** (`model: opus`) builds it
one-pass from the spec. Then: same gates, one Codex mini-siege round on each seat's
output (Fable's = the Phase-1 implementation of that slice). Record per seat: gates
green first try? · siege kills (count + severity) · wall-clock · est-vs-actual.
Write `benchmark/SEAT-COMPARISON.md` + Service Record rows. No narrative spin — the
numbers ARE the deliverable. This is the 06-22 decision's data.

## Phase 4 — THE REBUILD (cap 01:30) — the freeze lifts, because data now exists

Inputs: the four verdicts + THE-TRIBUNAL.html + both AARs + the benchmark + Service Record.

- **Disposition ledger over every tribunal charge** (fixed / rejected / deferred /
  accepted-risk + reason) — the charges are findings, not orders; some SHOULD be rejected
  with reasons.
- **Doctrine v2.1 on branch `military/v21-rebuild`, as a PR, never merged:** merge the
  overlapping canon (THE-MILITARY.md, THE-MILITARY-CONCEPT.md, doctrine §-duplication)
  toward one owner per fact; kill what the field data killed; keep what survived. The
  corpus must exit **net smaller** — report the exact line delta in the PR body. No new
  subsystems, no new surfaces, no new names: triage and subtraction only.
- **The Armory opens:** `docs/factory/armory/` with its first survival-gated mints from
  tonight's campaigns (e.g., the gym-tracker Orders template, the Siege packet that drew
  blood, the benchmark protocol). Each entry: artifact + description + provenance.
- If the kill-switch fired (2 of 3: siege killed nothing the gates missed · ceremony
  cost more than it caught · AAR changed nothing), the rebuild's PR instead recommends
  **Stand Down** and says so plainly. Negative data wins.

## Phase 5 — MORNING BRIEF (cap 00:30)

`MORNING-BRIEF.md` in this directory — in voice ("Good morning, Commander"), ONE screen:
what shipped · what each siege killed · the Service Record table · the benchmark verdict
in one sentence · kill-switch result · the decisions awaiting (merge v2.1 PR? merge Tower
PR? run the tracker runbook? Stand Down?) · links to every artifact. Then: final commits
pushed on their branches; `check-caps.sh` green; one `mem.sh remember` pointer if
available. Optional, non-blocking: if the ArtLab Telegram bot env is configured, send
exactly one message: "🎖️ Morning Brief ready — docs/factory/campaigns/2026-06-10-night-convoy/MORNING-BRIEF.md".

## Stop-loss (global)

✏️ COMMANDER — defaults stand unless edited:
- Total wall-clock: at **08:00** or 8h elapsed (whichever first) → jump to Phase 5 from
  wherever you are. A finished Brief about a half-finished night beats neither.
- Spend: subscription only; nothing that requires a paid confirmation beyond free tiers.
- Loop detection: same hypothesis fails 2× → park, log, move on. Per-phase caps above.

## Go/No-Go

The Commander's edits to this file + launching the `/goal` **constitute the word "go"**
— the one spend gate, satisfied before sleep. FRAGOs overnight are impossible; that is
why every fork above has a pre-decided conservative branch.

*Signed in advance: the General's seat (Fable 5), 2026-06-09 night. The next file this
operation writes is a War Log.* 🎖️
