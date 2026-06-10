# 🔭 The Fable Revision — what changed and why

*Written 2026-06-09 by Claude Fable 5, after taking the overseer seat per `HANDOFF.md`. This is
the trail. Read it to follow the reasoning; read `THE-MILITARY-DOCTRINE.md` for the result.*

---

## 1. The verdict on what I inherited

The dream is right and untouched. The brainstorm corpus is genuinely excellent — and its own
**completeness critic is the sharpest document in the folder**: it had already found everything
I'm about to say. "Nobody asked where the optimum is or whether it's often N=1." "The two-model
router is asserted as architecture but never justified empirically." "The strongest critique is
that the user's own product is being starved to build a tool to build products." Opus wrote the
indictment of its own design and filed it as an appendix.

The design itself is a 2025 architecture written on the eve of the capability jump that
obsoletes it. Almost every piece of machinery — the recursive plan-tree, contracts frozen
top-down as universal law, headless worker swarms off a shared manifest, the 3-tier Deployment
Officer, the Dispatches→War Log pipeline, the bespoke cockpit — exists to compensate for
builders that needed tiny one-shot tasks. I don't. A Fable-class agent holds a whole small app
in its head and builds it coherently in one pass, and every model after me widens that.

The machinery wasn't wrong when designed. It's wrong *now*, and it would be more wrong every
month: scaffolding that compensates for model weakness depreciates; assets that amplify model
strength compound. That asymmetry became the new design's governing maxim.

**The second discovery:** half of The Military already exists and is shipped. The `forge` skill
(built 2026-05-29, before this project was conceived as "The Military") already implements
right-sized tiers, Claude-builds/Codex-proves adversarial verification, fan-out, councils,
multi-turn campaigns with cursors, persistent recall/remember memory, and a dashboard. The old
plan was on course to rebuild forge, heavier, under army names. The new design uses it instead.

## 2. The reframe in one line

> **The Military was going to be software. It is now doctrine** — a thin set of files and a
> campaign protocol, executed by the strongest available agent on top of tools that already
> exist. It rides the model curve instead of racing it.

## 3. Decision by decision

| Original | Revision | Why |
|---|---|---|
| Recursive plan-tree + onion as **crown jewel**; decompose until "Codex-ready" | **F1 solo build is the default**; decomposition demoted to F3 escape hatch, seam-contracts only | Preemptive decomposition fragments context and buys integration risk before it's needed. The critic saw it: coordination cost grows superlinearly; the optimum is often N=1. Fable raised the "Codex-ready" bar past *whole small apps* — the tree collapsed to a point |
| Contracts frozen top-down as universal law | Contracts freeze **only at seams where parallel agents meet**; inside one head the spec stays discoverable | Renegotiation inside one agent is free; the waterfall-of-contracts only pays where two builders must agree. (The critic: "renegotiation may be the COMMON case") |
| The General spawns headless workers (`claude -p`) off a shared manifest; solve "who resumes the resumer" | **Don't build an orchestrator.** The session is the orchestrator; F2/F3 run through the Workflow tool (journaled, resumable, supervised by Anthropic) | The third killer hole — orchestrator-is-a-distributed-system — is dissolved, not solved. Never build distributed-systems machinery a vendor maintains for free |
| 3-tier Deployment Officer (router + load-balancer + failover subsystem) | A 3-row **habit table** (§5 of doctrine): strongest model in the General's seat, cheap models for bulk, alien family for the Siege | The router was an org chart, not architecture. Routing is a habit, not a subsystem |
| Dispatches → append-only War Log → Intelligence analyst reads the complete record | Transcripts/journals/git already record everything for free. What's deliberate: `WORKLOG.md` + a 5-question `AAR.md` per campaign → distilled into **capped, pruned doctrine files** | Total Recall's *purpose* (compounding) is kept; its *plumbing* (a logging pipeline + analyst) is deleted. Learning that compounds is curated, not accumulated |
| Operation: Blueprint — a ~50–60-agent research mega-run to design the orchestrator software | **Cancelled.** The system it was going to design is no longer software. Replaced by: this revision (done, on Fable, in the free window) + the pilot campaign | The research run's subject matter evaporated. The judgment-heavy waves happened anyway — in this session, at the cost of one session instead of 60 agents |
| Bespoke cockpit ("rebuilt clarity-first Forge") | /workflows + the existing forge dashboard | A cockpit for a swarm that no longer exists. The forge dashboard already watches Workflow runs |
| Target Selection + Strategist as separate units | Absorbed into **the Briefing** (move 1) — one heavy front door producing `ORDERS.md` | They were phases of one agent's work, not separate machinery |
| Go/No-Go: approve a plan preview | Go/No-Go: **edit `ORDERS.md` directly**, then go | The contract-IDE idea from the critic, simplified: the spec is the steering wheel, not the prompt |
| Verification: green wave (tests pass → done) | **The Siege**: done = survived attack. Mechanical gates are table stakes; cross-model assault is the verdict; 3-round cap | Self-authored tests verifying self-authored code is a closed loop. The critic: "the factory's confidence will be HIGHEST exactly when it's most wrong" |
| Generality claimed via the same code-shaped machinery | **Oracle Ladder**, frozen at Briefing: mechanical / pre-registered rubric + adversarial panel / human-as-oracle | Honest universality: one doctrine, pluggable oracles. Rung 2 doesn't make judgment mechanical — it makes it pre-registered and adversarial instead of post-hoc vibes |
| (missing) | **Rules of Engagement**: blast-radius classes (🟢🟡🔴), proposal mode, stop-loss, protected paths, wall-clock caps | Promoted from the critic's best finds: gate on *danger*, not size; the factory *proposes* rather than writes when touching live surfaces |
| (missing) | **First Contact rule**: early walking skeleton + one async report mid-build | The critic's "intent is not stable for the duration of a run" — a steering window that doesn't re-add a gate |
| Army cast of 15 units | Cast kept where the unit survived (General, Orders, Go/No-Go, Demolition Squad, Recon, Squads, Uniform Tailor); retired where the machinery died (Deployment Officer, Dispatches/War Log); new real military terms where new things earned names (Campaign, Briefing, AAR, Doctrine, Rules of Engagement, Force Levels) | The theme rule holds — "the costume can't cost information." Doctrine, AAR, and ROE are *actual* military terms for exactly these jobs, so the theme got stronger |

## 4. What survived untouched

- **The dream** (sacred, verbatim).
- **One human gate, bias bigger** — Go/No-Go, strengthened into Orders-editing.
- **Cross-model adversarial trust** — promoted from one reviewer among many ideas to *the*
  definition of done.
- **Golden templates / senior-grade by construction** — now per-class kits in doctrine.
- **Pilot light, not a furnace** — radicalized: there is no daemon at all.
- **The gym-tracker pilot** — still the first campaign (`OPERATION-PROVING-GROUND.md`).
- **The army theme** and the naming bar.
- **graphify as Recon, ArtLab as the art-class kit, the working style in HANDOFF §1.**

## 5. The siege on this revision (dog food)

Before finalizing the doc set, I ran the new doctrine through its own Move 4: four
adversarial Claude lenses (capability-bet skeptic, compounding skeptic, generality skeptic,
and a lost-value auditor instructed to defend Opus's original) plus a Codex cross-model
assault — in parallel, via the Workflow tool. **The siege earned its keep: 21 + 18 findings,
nearly all accepted.** The kill-log is §7; v1.1 of the doctrine is what survived.

## 6. Open questions left for the Commander

1. **Where does doctrine live long-term?** Seeded at `docs/factory/doctrine/` so you can watch
   it; The Military is universal, so it should graduate to a home that travels (a small repo or
   `~/.claude/military/`) once the pilot proves the loop. Decide after Proving Ground.
2. **Skill or not?** I deliberately did *not* create a `/military` skill yet — it would collide
   with forge's routing lanes mid-revamp. After the pilot, graduating the doctrine to a skill
   is a one-hour job if the loading-by-reference flow feels clunky.
3. **The Fable window (through 2026-06-22):** the expensive-judgment work this window was for
   is happening now. What remains worth burning free Fable on: run Operation: Proving Ground
   with Fable in the General's seat.

## 7. Siege results — what the assault killed and what I changed

Two waves: 21 findings from the four Claude lenses (2 fatal, 16 serious, 3 minor), then an
18-finding Codex teardown. Essentially everything landed — the v1 draft had real holes, and
several were the *same species of mistake Opus made*: confident claims where the mechanism
was missing.

**The fatal kills (v1 → v1.1):**
- **"Escalate at the wall" was keyed on the one wall an agent cannot feel** (capability
  lens). An agent's coherence rots silently — it emits confident, plausible, wrong work, no
  signal. Fix adopted: **checkpoint discipline** — measured tripwires (context-headroom
  threshold + mechanical-gate regression frozen in the Orders), each checkpoint parks state,
  re-runs gates, re-reads the Orders. Escalation triggers on *measurement*, never on feel.
- **Rung 2 of the ladder renamed the no-oracle problem instead of solving it** (generality
  lens). A frozen rubric is the author's beliefs in a costume; panel consensus is agreement,
  not truth. Fix adopted: the **Oracle Ladder became the Verdict Ladder** — rungs 2–3 are
  honestly labeled adversarial review, every Rung-2 Orders needs at least one
  *externally-anchored* victory condition, the rubric itself gets sieged before Go, and
  delayed-ground-truth work goes **Verdict-Pending** (prediction + check-back in
  `doctrine/VERDICTS.md`; lessons graduate only on resolution — the system doesn't get to
  compound confidence in its own taste).

**The embarrassing ones (my "the harness already does this" overclaims, caught by the
lost-value auditor defending Opus):**
- "The session is the orchestrator, Anthropic maintains supervision" — **false for
  orchestrator death**. The real answer existed in forge all along: the **campaign cursor**,
  reconciled against repo truth on every cold resume. Adopted wholesale.
- "The onion survives at F3" — **false as written**: workflow fan-out is one flat layer, no
  nesting. Fixed honestly: recursion lives at the *campaign* level — an oversized seam-unit
  is promoted to a **sub-campaign** with its own Orders, General, Siege, and AAR.
- The F1 carve-out ("spec stays discoverable inside one head") silently covered F2's
  *parallel* work too — re-opening integration hell. Fixed: **contracts freeze wherever
  parallelism starts**, scoped by parallelism, not force level.
- The armory table now carries **provenance marks** (verified vs. assumed) — the auditor's
  point that unaudited substrate claims at load-bearing joints are how doctrine lies.

**The compounding loop got teeth** (compounding lens — all five findings landed):
doctrine vs. forge memory got one-owner rules (doctrine owns lessons, memory owns pointers);
"reads doctrine first" became an *enforced* Precedent row in the Orders that blocks Go when
empty; the graduation filter went from a predictive vibe to recognition patterns
(GOTCHA/DECISION/CLASS-KIT delta) with citation-based pruning; the 150-line cap became
mechanical (`check-caps.sh`) with compression moved to the *next* Briefing (fresh budget,
the reader prunes) and made non-destructive; AAR answer 2 must be grounded in the attacker's
kill log, and doctrine diffs face their own alien check before landing.

**The Codex round** (cross-model, as the doctrine demands) added what the same-family lenses
missed — mostly *operational* honesty:
- "One human gate" was a fiction (Red confirms, Rung-3 judging, probe loops all exist) →
  reframed as the one **spend** gate; every other touchpoint must be declared in the Orders.
- Freeze-at-Go vs. spec-discovered-during-build was an internal contradiction → the
  **FRAGO protocol** (append-only amendments; clarifications/cuts non-blocking, victory-
  condition changes need the Commander).
- The Siege had no kill authority and no definition of "survived" when findings are
  disputed → the **Siege packet** (attacker role, praise forbidden, severity taxonomy) and
  the **disposition ledger** (every finding fixed/rejected/deferred/accepted-risk; survived
  = every Crit/High resolved or Commander-accepted).
- One-size scalars (3 rounds, 1-hour First Contact, 3-strikes loop detector) → **the RoE
  class is the master dial**: siege depth, First Contact, SITREP cadence, loop thresholds
  all key off 🟢🟡🔴. The loop detector now watches *hypotheses*, not symptoms.
- Plus: ordered cut-lines (Core → outward), first-slice-must-hit-a-victory-condition,
  obvious-seams-start-at-F3, a real `CAMPAIGN.lock` file format, two-speed graduation
  (GOTCHAs on one incident; PLAYBOOK rules need a second campaign or the Commander).

**Rejected (one):** Codex wanted a hard pre-Go budget cap on the Briefing (≤10% of campaign
budget). Rejected as contradicting the design's thesis — the Briefing *is* the
disproportionate-spend move; wrong intent is the most expensive thing the system can build.
Wording clarified instead ("no *build force* until go").

**What the siege says about the process:** the four same-family lenses found the conceptual
holes; the cross-family attacker found the operational ones. Neither found the other's set.
That asymmetry is the doctrine's own argument for itself — and it held on the doctrine's
first real target: the doctrine.

---

## 8. The Commander's counterattack → v2 (same day)

Armaan read v1.1 and the briefing page, then fired five shots in three minutes — and a
note that stung correctly: *"if I can find these in three minutes, there are dozens more.
Push harder, think bigger, zoom out."* His shots, and the honest scoring:

1. **"Self-improvement just says it will improve — I don't see how."** HIT. v1.1's Debrief
   was a diary with discipline; nothing *ran* between campaigns and nothing *measured*
   improvement.
2. **"Where's the archive — everything logged and recorded to get better?"** HIT — and an
   over-correction of mine. I'd deleted Opus's Total Recall plumbing and kept only "the
   harness records for free." Recording WAS free; what was missing was *retrieval that
   learns* and *feedback as a first-class record*.
3. **"Fable exists for 12 days; after that this breaks apart. No fallback. That's why I
   had swarm agents."** HIT. v1.1's fleet table was a habit, not a fallback story. He was
   also right about *why his original swarm mattered* — it's the reduced-strength gear.
4. **"Too rigid — can't allow anything outside its wheelhouse."** PARTIAL — probe loops
   and Orders-level waivers existed, but the doctrine read like everything was a
   full-dress campaign, and "standing" work (a business, a product) had no home at all.
5. **"SITREP tells me nothing."** HIT on the theme's own rule (the costume cost
   information for its actual audience).

**The evidence pass** (one research workflow, four web researchers + a 44-video TikTok
transcription pipeline — yt-dlp → whisper.cpp — on @androoagi, the profitable gamified
agent-ecosystem operator he follows):

- **Hermes Agent** (Nous Research) supplied the standing-improvement machinery: the
  Curator (idle maintenance with backups/rollback), write-origin tagging + pinning,
  fitness-gated evolution, and the model-agnostic seat resolver.
- **The landscape** (Voyager, ACE, Reflexion, MemGPT, MemRL, Generative Agents, Anthropic
  context-engineering) supplied the proven loops — and one decisive sentence: *every one
  of these mechanisms improves a frozen, weaker model; the compounding lives in the files,
  not the model.* That is the complete answer to shot #3.
- **androoagi's transcripts** supplied field-proof: the approve/reject training loop run
  "a few hundred times" until supervision stops; a research bay + a radar bay (a standing
  agent whose only job is improving the system); an Obsidian archive of "everything I ever
  say, especially feedback"; replicate-never-install skill safety; daily war-room retros;
  the Morning Brief ("Good morning, Commander"); ~$400/mo two-tier economics running seven
  businesses; and the stack reveal (Next.js + TS + Phaser, all art AI-generated).
- **The frontend research** mapped his "Mission Control" pattern plus Devin/Factory/
  Langfuse/NASA into ten UI laws and three anti-patterns (vanity XP, leaderboards,
  point-rewards — banned).

**What v2 changed:**
- **The Intelligence Division** (new doc) — Archive with learning retrieval
  (recency × importance × relevance + utility), the **Analyst** (nightly standing agent,
  propose-never-merge), **Boot Camp** (the approve/reject loop with measured graduation),
  **skill minting** (Voyager-gated Armory inventory), and the **Service Record** (fitness
  plotted, or it didn't happen). Lessons became ACE-style append-only deltas — the General
  never rewrites the playbook again.
- **The Deployment Officer recalled** — seats are roles with resolver chains; the F1 bar
  floats with seat strength; **F3/the swarm is the explicit fallback gear**; a benchmark
  campaign runs on both seats before 06-22.
- **Standing Operations** — the operate tempo (Morning Brief, weekly review, pivot
  councils) joins the build tempo; The Tower itself becomes one after the pilot.
- **Formality gears** — Skirmish / Campaign / Probe; the Orders outrank the playbook.
- **Renames** — SITREP → **Dispatches**; WORKLOG → **the War Log**. Three veterans of the
  Opus cast (War Log, Dispatches, Intelligence) plus the Deployment Officer are back on
  active duty — restored with machinery instead of plumbing.
- **Packaging decided** (doctrine §10) — plugin-skill `/military` first (with hooks that
  make doctrine mechanical), CLI over headless/SDK second, scheduled rhythms third,
  Telegram gates fourth, the Base (`THE-BASE.md`) as its own campaign, MCP primitives last.

**The zoom-out, named:** v1.1 was a *build protocol*. v2 is a *standing force* — campaigns
build, operations run, the Intelligence Division learns, the Armory compounds, the Base
makes it a place. Which is, candidly, much closer to what Opus and the Commander were
designing all along — minus the machinery that depreciates, plus the machinery that's now
cited.
