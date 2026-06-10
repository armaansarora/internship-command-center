# 🏛️ The Military — Field Doctrine v2

*The system itself. An agent loads this file and runs by it.*

> **North star (sacred):** the last tool you need to build. Everything downstream of
> *"I want X"* gets handled, and it improves its own divisions over time, so it never
> stops compounding. The only ceiling left is your imagination.

> **Version trail:** v1 (Fable rewrite of the Opus swarm design) → sieged same day (4 lenses
> + Codex, ~39 kills folded) → **v2 after the Commander's counterattack** (2026-06-09):
> the everything-Archive returns, the Analyst returns, the Deployment Officer returns, the
> swarm is rehabilitated as the fallback gear, Standing Operations join bounded campaigns,
> and self-improvement gets real machinery (Hermes / ACE / Voyager / field-proven loops).
> Kill-log + reasoning: `2026-06-09-fable-revision.md`.

---

## 0. The two maxims

> **1. Build nothing the model curve will obsolete. Build only what compounds as models improve.**

> **2. The compounding lives in the files, not the model.** Every proven self-improvement
> mechanism (Reflexion, ACE, Voyager, MemRL, Hermes) improves a *frozen, weaker* model with
> no weight updates. A strong archive + doctrine + skill library makes a cheaper General
> perform like a stronger one did. **This is the Fable-window exit strategy, not a slogan.**

The Military is **doctrine plus a thin set of files**, run by the strongest *available*
agent over tools that already exist. When models get smarter it gets stronger automatically;
when the affordable model gets weaker (post 2026-06-22), the files carry the strength.

## 1. What The Military is (one screen)

A **standing force** with two tempos:

- **⚔️ Campaigns** — bounded missions: intent in → finished, attacked, surviving artifact
  out, through the five moves. (Build tempo.)
- **🏰 Standing Operations** — unbounded missions that never "finish": a product run and
  grown (The Tower), a content pipeline, a business. They run on **rhythms** (Morning
  Brief · weekly review · pivot councils) and **spawn campaigns** for every bounded chunk
  of work they need. (Operate tempo.)

> "Claude Code you build your business with; the agent ecosystem you *manage* it with."
> The Military does both: campaigns build, standing operations operate.

```
👑 Commander ─▶ 1. 📋 THE BRIEFING   interrogate intent → write the Orders
                       │
                2. 🚦 GO/NO-GO       the one SPEND gate: edit the Orders, say go
                       │
                3. 🔨 THE BUILD      Force Level 1 → 2 → 3 (escalate on measured walls)
                       │                 …Dispatches stream to you the whole way
                4. 💥 THE SIEGE      a different model family attacks it; survives = done
                       │
                5. 🎓 THE DEBRIEF    AAR + Service Record → the Intelligence Division
                                      → every future campaign starts smarter
```

**Three formality gears** (rigidity is a dial, not a law):
- **🗡️ Skirmish** — 🟢-class, small, reversible: the moves collapse (inline brief → build
  → one siege round → 3-line AAR). Most days are skirmishes.
- **⚔️ Campaign** — the full five moves. Default for anything 🟡/🔴, novel, or sizable.
- **🔍 Probe loop** — when intent must be *discovered* (exploration, taste, debugging):
  cheap bounded probes iterate until the Orders are knowable, then the five moves run.

**The Orders outrank the playbook.** Any rule in this doctrine except the sacred three
(Siege independence · stop-loss · RoE gates) can be waived per-campaign in the Orders with
a logged reason. Doctrine serves the mission, never the reverse.

**The Kernel.** The Military is not an app you launch — it is **the core of every
session**: a per-message route-check reflex (UserPromptSubmit hook), a ~25-line kernel in
the global CLAUDE.md, and the same kernel adapted for Codex (`~/.codex/AGENTS.md`) and
Antigravity. The organ skills (intent interrogation, execution loops, cross-model attack,
design judgment) are internal plumbing the kernel routes to — **their names never surface
to the Commander.** Design + install record: `THE-MILITARY-AT-MAX.md` §1.

## 2. The five moves

### Move 1 — 📋 The Briefing (the heaviest move)

Wrong-intent-compiles-perfectly is the #1 failure mode and it gets worse as builders get
stronger. The General interrogates the Commander (one question at a time, propose a take,
sharpen), does **Recon** (graphify the terrain + query **the Archive** for precedent +
pull top-k minted assets from **the Armory**), then freezes `ORDERS.md`:

| Section | Contents |
|---|---|
| **Mission** | what, for whom, why — one paragraph |
| **Tempo & gear** | campaign / skirmish / probe-loop · standing-op parent if any |
| **Victory conditions** | enumerated; Rung-2 classes need ≥1 externally-anchored condition (§3) |
| **The Verdict** | rung + frozen rubric / test plan (§3) |
| **Precedent** | Archive hits + doctrine lines + Armory assets actually consulted. **Empty row blocks Go** — with the **first-contact exemption**: on terrain with <3 campaigns, seed class kits + cross-terrain Armory assets satisfy the row |
| **Rules of Engagement** | blast-radius 🟢🟡🔴, protected paths, stop-loss caps, proposal-vs-write (§4) |
| **Terrain** | stack, golden template, conventions |
| **Force estimate** | F1/F2/F3 + cost + wall-clock + a concrete F1 budget (the escalation tripwire) + why adjacent levels were rejected |
| **Out of scope** | non-goals; cut-lines marked and ordered (Core → outward) |

### Move 2 — 🚦 Go/No-Go (the one *spend* gate)

The Commander edits `ORDERS.md` directly — the contract is the steering wheel — and says
**go**. No build force commits before it. (Briefing spend is deliberate and exempt.)
All other human touchpoints are **declared in the Orders** (Red confirms, Rung-3 judging,
probe iterations, Boot Camp reviews): trigger, allowed responses, blocks-or-not.

**FRAGO protocol:** mid-build spec changes are append-only `FRAGO n` blocks in the Orders —
clarifications/cuts non-blocking (next Dispatch reports them); victory-condition changes or
scope expansion need the Commander's ack. Orders are amended, never silently drifted.

**Rung-2/3 campaigns:** the adversary attacks the *rubric* before Go; the Commander
approves the post-attack rubric.

### Move 3 — 🔨 The Build

**Default: one strong agent builds the whole thing.** Decomposition is an escape hatch at
full strength — *and the main gear at reduced strength* (§5). The F1 bar **floats with the
General's capability**: a weaker General takes smaller solo scopes and escalates earlier.
The swarm was never deleted; it is the low-capability gear and the deadline gear.

| Level | Shape | Trigger |
|---|---|---|
| **F1 — Solo strike** | the General, end-to-end | default at full strength |
| **F2 — Strike team** | + Workflow fan-out for lateral work (sweeps, variants, councils) | independent side-jobs |
| **F3 — Full deployment** | seam-frozen decomposition, parallel Squads in worktrees, the General integrates | F1 budget tripwire fires (measured) · deadline · seams obvious at Briefing · **or a weakened General seat** |

- **Checkpoint discipline — walls are measured, never felt.** At the Orders' headroom
  threshold or any gate regression: park state, run gates, re-read Orders, self-check
  every victory condition. Escalate on measurement only.
- **Contracts freeze where parallelism starts** (F2 included): boundary signature + one
  boundary test, before parallel work.
- **Sub-campaigns** (the onion, real): an oversized seam-unit gets its own Orders (seeded
  with the frozen seam contract), its own General, Siege, and AAR.
- **The War Log** (`WAR-LOG.md`): opens with the single-writer cursor block (phase ·
  **doctrine version** · Orders hash + FRAGO count · force level · branches/worktrees ·
  open issues · next command · last verified gates · rollback notes). Every cold resume
  reconciles cursor against repo truth — believe the repo, fix the cursor. A campaign
  finishes under the doctrine version it started with. Below the cursor, the running
  log: tried / why / result, plus every Dispatch as filed.
- **📨 Dispatches** (mid-run reporting): the build produces a reviewable **walking
  skeleton** early → files **First Contact** (async; required for 🔴, Rung-3, anything
  > ~90 min; prefer reversible work while the review window is open). Every checkpoint
  after files a **Dispatch**: progress vs. victory conditions, drift, FRAGOs, burn vs.
  caps. Never blocking; always steerable. *(Renamed from SITREP — a dispatch from the
  front tells you what it is.)*
- **Always-shippable ordering:** first slice satisfies one named victory condition
  end-to-end; infra-only first slices forbidden unless the mission is infra; shippable at
  every cut-line.

### Move 4 — 💥 The Siege (done = survived, not green)

1. **Mechanical gates** first (class kit): tsc/lint/tests/build/e2e for code. Table
   stakes, not the verdict.
2. **Cross-model assault** (non-negotiable): a different model family attacks against the
   Orders under a **Siege packet** — attacker role with kill authority, praise forbidden,
   required failure search, minimum evidence, exact files/commands, severity taxonomy.
3. **Lens panel** at higher stakes (correctness / security / perf / mission-fit).
4. **Disposition ledger**: every finding → fixed / rejected / deferred / accepted-risk,
   with rationale. **Survived =** every Critical/High fixed or Commander-accepted; nothing
   undispositioned.
5. **Rounds key off blast radius**: 🟢 one · 🟡 ≤2 · 🔴 until two consecutive clean rounds.
6. Kill-rate recorded every campaign (Service Record). Same-lineage review ≠ survived.
   Siege family unavailable → **ship-blocked halt** (§5 failover).

### Move 5 — 🎓 The Debrief (the campaign is NOT closed without it)

`AAR.md`, five questions — now with Intelligence-grade mechanics (full spec:
`THE-INTELLIGENCE-DIVISION.md`):

1. Orders satisfied? (Verdict-Pending classes: falsifiable prediction + check-back date
   into the ledger instead of a self-grade.)
2. What did the Siege kill and why did the Build miss it — **authored from the attacker's
   kill-log**, not the builder's self-narrative.
3. Cost vs. estimate (tokens, time, rounds) — written to the **Service Record** (§6).
4. **Lesson deltas**: typed, principle-level bullets appended to doctrine — *never* a
   rewrite of the playbook (ACE rule: append + counters; compress at next Briefing).
   GOTCHAs may land on one incident; PLAYBOOK behavioral rules need a second campaign or
   the Commander. Every delta faces a cheap alien check before landing.
5. **What gets minted**: any reusable asset this campaign proved (template, rubric, class
   kit, snippet, whole skill) → the Armory, gated on the campaign having *survived*.

Close-out: one `mem.sh remember` pointer; `check-caps.sh` green; lock released with state
parked.

## 3. The Verdict Ladder (honest, per class)

| Rung | Class | Verdict mechanism | Reality contact |
|---|---|---|---|
| 1 — **Oracle** | code | mechanical gates + Siege | ✅ execution doesn't care what the author believed |
| 2 — **Adversarial review** | research, plans, decks, decisions | rubric frozen at Briefing (required shape: weighted criteria + threshold + disqualifiers + evidence rules), *itself sieged before Go*, scored by a cross-family panel | ⚠️ only via the required external anchor |
| 3 — **Human verdict** | taste, art, brand | the Commander, made cheap (small sets, side-by-side, one question at a time) — and trainable via **Boot Camp** (§6) | ✅ the human IS ground truth |
| ⏳ — **Verdict Pending** | world-resolved on delay | rungs 2–3 now + prediction & check-back in `doctrine/VERDICTS.md`; lessons graduate only on resolution | ✅ later — compounding waits for it |

Rungs 2–3 are structured opinion, not oracles — naming that is what stops the system
compounding confidence in its own taste. An Orders with only rubric-internal victory
conditions is invalid ("cannot be sieged, only reviewed — ship at your own risk").

## 4. Rules of Engagement (the master dial)

> ⚠️ **Honesty mark (2026-06-09 tribunal):** RoE enforcement is currently **ASPIRATIONAL**
> — the installed environment runs `bypassPermissions` with no PreToolUse gates, so these
> rules bind by doctrine-following, not mechanism. Until the §10 hooks exist, every
> campaign's Orders must carry its protected paths explicitly, and "mechanical" may not
> be claimed.

| Class | Means | Rules |
|---|---|---|
| 🟢 Green | reversible, isolated | direct writes; skirmish gear allowed |
| 🟡 Amber | live surface | **proposal mode** — lands as PR/diff; Commander merges |
| 🔴 Red | payments, auth, migrations, deletion, secrets | proposal mode + per-action confirmation + protected paths |

**The RoE class keys everything**: siege depth, First Contact requirement, Dispatch
cadence, loop thresholds, formality gear. Never raw size, never global constants.

**Stop-loss, always set:** cost cap · wall-clock cap · context-headroom checkpoints ·
hypothesis-based loop detection (same hypothesis fails 2× → halt; no Crit/High reduction
over a real fraction of wall-clock → halt). **Capability/credential audit:** every agent's
account/key access is enumerated in one reviewable place (the Armory's audit surface).

**Locks:** `CAMPAIGN.lock` is a real file (id, owner session, branch, started, touched
paths, expiry); serializes mainline writes; 🟢 worktree campaigns don't contend; pause
releases only after parking reconciled state.

**Third-party capability rule — replicate, never install:** community skills/tools are
downloaded read-only, internals inspected, then *re-implemented in-house*; the alien model
audits the re-implementation. Untrusted artifacts never execute.

## 5. The fleet — the Deployment Officer returns (as a config, not a subsystem)

Seats are **roles bound by a resolver**, not models. Swapping a brain is a config change
(the Hermes property). Recalled from v1.1 retirement because the Commander was right: a
system with no fallback story breaks the day the window closes.

| Seat | Resolver chain (today) | Notes |
|---|---|---|
| **The General** | Fable 5 *(free thru 2026-06-22)* → Opus 4.8 (Max sub) → Sonnet | the F1 bar floats with this seat (§3) |
| **Squads / laterals** | session default → cheaper Claude tiers | bulk never needs the scalpel |
| **Demolition Squad** | Codex/GPT-5.x (Pro sub) → any non-Claude family | alien-ness is the requirement, not the brand |
| **The Analyst** (§6) | cheap tier, scheduled | curation is volume work |

**Failover by seat:** bulk blocked → General absorbs (the only case where dropping a Force
Level is the answer). General's tier blocked/downgraded → F1 bar drops, decomposition comes
earlier, contracts freeze more, siege rounds increase — **quality is held by structure when
it can't be held by brains.** Autonomous downgrade of the General requires a Commander
flag. Siege family blocked → ship-blocked halt; "survived" cannot be claimed without an
alien attacker.

**Before the window closes (standing order):** run the same benchmark campaign with Opus
in the General's seat and compare Service Records, so the post-window posture is measured,
not guessed. Economics target: $200 Max + $100 Codex Pro runs the whole force — hierarchy
is what makes it affordable (one expensive brain gating work down to cheap hands).

## 6. 🗂️ The Intelligence Division (self-improvement with machinery)

*The full spec lives in `THE-INTELLIGENCE-DIVISION.md` — this is the command summary.*
Four organs, all real mechanisms with named provenance:

1. **📚 The Archive (Total Recall, indexed).** Everything is recorded — transcripts,
   Workflow journals, git, Orders+FRAGOs, War Logs, kill-logs, AARs, **and every piece of
   Commander feedback with its rationale**. The cross-campaign index retrieves by
   *recency × importance × relevance + a utility score* that rises when a retrieved
   precedent leads to a clean Siege and decays when it doesn't. The Briefing queries it;
   the Precedent row proves it.
2. **🧠 The Analyst (the standing improvement agent — recalled from retirement).** A
   scheduled, cheap, off-peak run (nightly/idle): consolidates GOTCHAs, demotes uncited
   lessons, resolves Verdict-Pending check-backs, updates utility scores, watches the
   Service Record for drift (kill-rate sliding, estimates rotting), and **proposes
   doctrine diffs as PRs — never merges.** Write-origin tags + pinning protect
   Commander-written lines; git gives snapshots and rollback.
3. **🎯 Boot Camp (the approve/reject training loop).** New task-class or taste-heavy
   work starts *supervised*: high-frequency approve / reject / iterate / notes cycles,
   every verdict + rationale persisted to the Archive. The class kit tracks a measured
   **graduation state** (supervised → battle-ready) per task-type; graduation = the
   Commander's intervention rate falling below threshold. *You can watch it learn — the
   improvement is a number, not a vibe.*
4. **🏭 The Armory's forge (skill minting).** The Military mints **smaller skills from
   itself**: templates, rubrics, class kits, snippets, and whole installable skills
   (via skill-creator), stored with description + embedding, retrieved top-k at Briefing,
   **admitted only after a campaign using them survived its Siege.** Compositional —
   skills reference skills. The massive skill that creates smaller skills, literally.

**📊 The Service Record** feeds all four: per-campaign fitness — Siege kill-rate,
first-pass survival, FRAGO count, estimate accuracy, human-intervention rate, cost. It is
the system's honest answer to "is it actually improving?" — plotted, not asserted.

Anti-rot rules stand: principle-level graduation only (no campaign-specific paths/values),
append-deltas with helpful/harmful counters, compression at the next Briefing
(non-destructive demotion to source AARs), citation/utility-based pruning, mechanical caps
(`check-caps.sh`), one owner per fact (doctrine owns lessons; mem.sh owns pointers).

**Cold-start mode (the bootstrap paradox, answered):** for the first ~5 campaigns on a
new force or terrain, the Division runs **record-only** — capture everything, expect
retrieval to return little, no Precedent block, reduced ceremony. The machinery switches
on as the Archive gains mass; early campaigns must be cheap precisely when trust is
being decided.

**The decommission criterion (the Division holds itself to its own standard):** if after
~30 campaigns the Service Record's kill-rate and intervention-rate curves show no downward
trend, the Intelligence Division is decorative — cut it back to bare campaigns and say so
in the AAR. No sunk-cost shrines.

## 7. The Armory (use → mint → audit)

| Need | Use | Don't build |
|---|---|---|
| intent interrogation | grill-me | a Target Selection subsystem |
| execution + memory + campaign cursor | forge | a second tiering engine |
| fan-out / councils (one flat layer; nesting = sub-campaigns) | Workflow tool | a manifest + worker daemon |
| cross-model attack | codex | a bespoke reviewer fleet |
| terrain mapping | graphify | a custom code-graph layer |
| skill minting | skill-creator | a bespoke skill compiler |
| art class | ArtLab | absorbing ArtLab |
| passive watching | /workflows + forge dashboard | — |
| interactive control | the live session + the Base (cockpit, `THE-BASE.md`) | a control-plane daemon |

Plus the **minted inventory** (§6.4) and the **credential audit surface**: one place
listing every account/key each seat can touch.

## 8. Standing Operations & Inbound mode

A **Standing Operation** is a mission with no end state (a product, a store, a content
pipeline). It gets: a standing `OPERATION.md` (mission, metrics, rhythms, RoE), the
**Morning Brief** (overnight outcomes, Dispatches digest, blocked items, burn — delivered
in-voice, "Good morning, Commander"), a weekly review, and **pivot councils** (damage
control: what's not working, what to reallocate — the war-room rhythm). Standing
operations spawn campaigns for bounded work and feed outcomes back to the Verdict ledger —
real-world results are the ultimate ground truth for Rung-2/⏳ classes.

**Inbound mode:** point The Military at any codebase/terrain with no intent: Recon maps
it, the General proposes 3–5 candidate campaigns as draft Orders; they queue. The Tower
itself becomes a Standing Operation the day the pilot proves the loop.

## 9. The Reserve (deferred, with tripwires)

- **Spec-canonical / code-as-cache** — if F3 seam-drift bites at scale.
- **Bid markets / insurance premiums / tournaments** — at fleet sizes v2 never reaches.
- **Dreaming factory (synthetic self-play)** — partially promoted: the Analyst is the
  awake version; full self-play when the Archive holds enough campaigns to replay.
- **Speculative N-variant builds** — promote if Siege kill-rates justify the spend.
- **Multi-tenant concurrency** — lock-scope rules cover today.

## 10. How it ships (packaging — layered, in build order)

1. **The plugin-skill `/military`** *(build first)* — one Claude Code plugin: the lean
   five-move SKILL.md (routes into grill-me/forge/codex/skill-creator) + **hooks that make
   doctrine mechanical** (Stop hook: no campaign close without AAR + caps green;
   PreToolUse: protected paths + Red confirms) + the doctrine files. Go/No-Go ships as a
   separate manual-only skill so the General can never auto-authorize spend.
2. **The CLI `military`** — thin wrapper over headless `claude -p` / Agent SDK:
   `military campaign "<intent>"` · `status` · `go` · `brief`. Resumable, cron-able.
   *(Note: from 2026-06-15, headless/SDK draws from a separate Agent-SDK credit pool —
   budget accordingly.)*
3. **The rhythms — cloud-first; the laptop stays shut.** Three scheduled **Claude Code
   Routines** (Analyst nightly · Morning Brief daily → Telegram · check-backs weekly):
   each is a stateless cloud session that clones the doctrine repo, does the shift, opens
   a PR, exits — git is the memory. Plus one API-trigger routine as the Telegram→campaign
   bridge. Local `launchd StartCalendarInterval` (runs-on-wake) is the documented offline
   fallback, never the primary. Full venue matrix: `THE-MILITARY-AT-MAX.md` §2.
4. **The phone** — the Telegram bot (ArtLab precedent) carries gates, Dispatches, Morning
   Briefs, and the word **go** from anywhere; an API-trigger can fire a campaign.
5. **The Base** — the cockpit/world (`THE-BASE.md`): watch the force, walk the rooms,
   pull any unit's terminal. Built later, as its own campaign, with ArtLab art.
6. **MCP campaign-primitives server** *(when ≥2 surfaces need the same verbs)* —
   orders_read, frago_append, warlog_cursor, archive_query, aar_record, campaign_lock.

---

*v2, 2026-06-09. The dream is unchanged. The machinery is files that compound — and now
the learning loop, the fallback chain, and the standing tempo are mechanisms, not
assertions. Field-test pending: Operation Proving Ground.*
