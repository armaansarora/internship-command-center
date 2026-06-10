# 🔭 The Military at Max — the full-spectrum review

*2026-06-09, the examination round. Zoom all the way out, break it bit by bit, zoom in
recursively, zoom back out, link the puzzle. Six deep-dive examiners (design capability,
the General's seat, core-not-skills, the night shift, the Base vs. andro's real build, the
imagination atlas + gaps) feed this synthesis. Decisions taken here are folded into the
doctrine; this doc is the record and the maximum-vision atlas.*

---

## 0. Zoom all the way out — the puzzle box

```
L0  THE DREAM      intent → reality, compounding forever
L1  THE KERNEL     The Military as the CORE of every session (not a skill you invoke)   ← NEW
L2  THE PROTOCOL   two tempos (campaigns ⚔ / standing ops 🏰) · three gears (skirmish/campaign/probe)
L3  THE ORGANS     Briefing · Go · Build · Siege · Debrief · Archive · Analyst · Boot Camp
                   · Armory · Deployment Officer · Uniform Tailor · Treasury · RoE
L4  THE SUBSTRATE  Claude Code + Codex + Antigravity · hooks · Workflow · Routines (cloud) · git
L5  THE SURFACES   terminal · phone (Telegram) · the Base (the walkable world) · Morning Brief
```

The round's verdict in one line: **the organs were designed; the kernel, the seat, the
design arm, and the night shift were not — now they are.**

## 1. 🧬 THE KERNEL — core, not skills (the structural decision of this round)

**The Commander's demand:** *"Every session I boot should have it built into its core: for
every message, one of the first things it does is ask 'is there a skill that would deliver
a better result?' — so I never have to worry. Kill the names grill-me/forge/codex; their
behavior should happen naturally, by itself."*

**The design — three thin layers, ~40 tokens of overhead per message:**

1. **The reflex (per message).** A `UserPromptSubmit` hook injects one line into every
   message's context: *route-check → pick the move (recall / Brief / Build / Siege /
   Tailor) → silently fire the best organ → never require the user to name anything.*
   Hooks are deterministic — this fires every message, no exceptions, which is exactly
   what description-matching alone never guaranteed.
2. **The kernel (per session).** The global `~/.claude/CLAUDE.md` carries a ~25-line
   Military kernel replacing the old skill-routing table: the five moves as *reflex
   behavior* (sharpening questions before building IS default behavior, cross-model
   attack before "done" IS default behavior), with the organ skills listed as internal
   plumbing the model routes to — names never surface to the Commander.
3. **The other armies.** `~/.codex/AGENTS.md` gets the same kernel adapted for Codex
   sessions (whose standing role is the Demolition Squad / second opinion). Antigravity
   gets it via a workspace installer (the ArtLab installer is the precedent).

**What dies:** the names. grill-me, forge, codex, impeccable remain as files (they're the
organs' implementations) but stop being vocabulary. The Commander says what he wants; the
kernel routes. The deeper migration — physically merging grill-me + forge into one
`military` skill — is designed but deferred until after Proving Ground (merging
battle-tested skills mid-flight risks the routing that already works).

**What your daily experience becomes:** you type a message. The session silently asks
"which move is this?" — a question gets answered; a half-formed want gets two sharpening
questions back (Briefing reflex); a build runs the Build discipline and gets attacked
before "done"; design work flows through the Tailor pipeline. You never invoke anything.
**Installed this round** (kernel + reflex hook + Codex kernel; backup kept).

## 2. 🌙 The night shift — "does my computer have to stay on?"

**No.** The Analyst, the Morning Brief, and verdict check-backs run as **Claude Code
Routines** — Anthropic's cloud-hosted cron for agent sessions (research preview since
April). Your Mac can be shut in a bag at 2am: a clean cloud session clones the doctrine
repo, does the shift, opens a PR (propose-never-merge holds), pings Telegram, exits.
**Git is the memory; the cloud is stateless compute over it** — which is exactly the
architecture we already chose.

The economics fact that reshapes the choice: **on 2026-06-15 Anthropic splits billing** —
headless/SDK/Actions move from the Max subscription to a separate Agent-SDK credit pool
($200/mo included with Max 20×, hard stop, no rollover). So all automated venues cost
roughly the same — pick by reliability and ops burden, which Routines win (Max = 15
routine-runs/day; our rhythms use ~3, leaving headroom for phone-triggered campaign
fires via each routine's API endpoint).

**v1 posture:** 3 scheduled Routines (Analyst nightly · Brief daily→Telegram · check-backs
weekly) + 1 API-trigger routine as the Telegram→campaign bridge + a documented local
`launchd StartCalendarInterval` fallback (runs on wake if the Mac slept through 2am;
ArtLab's plist plumbing, swapping KeepAlive for the calendar trigger). Skip the Mac
mini/VPS — hardware to replicate a free cloud feature, plus a secret on a rented box.

## 3. 🧵 The Uniform Tailor at max (the design arm, finally designed)

The arsenal already exists in-house; what was missing is the **pipeline** that composes it
per campaign:

1. **Design system first, pixels second.** At Briefing, any campaign with a UI face gets a
   design-system spec minted via **ui-ux-pro-max** (`--design-system`: style + palette +
   type pairing + per-page overrides) seeded from the taste profile (below). Tokens are
   the contract; components implement tokens. No agent free-styles colors.
2. **The render→judge→refine loop** (what mechanically separates agent UI from slop):
   build → run → **screenshot** (Playwright) → a vision-model judge scores the screenshot
   against the frozen design rubric (hierarchy, spacing rhythm, contrast, density, the
   AI-slop checklist from **impeccable**) → kill-list → refine → re-shoot. The Tailor
   iterates against *rendered truth*, never its own JSX imagination. (This session's
   briefing-page render-check was the manual version; the Tailor automates it.)
3. **Design Siege.** Mechanical gates first: a11y (axe), contrast ratios, layout overflow,
   `prefers-reduced-motion`, token-conformance lint. Then adversarial: the alien model
   attacks the *experience* against the Orders ("the <10s log-a-set condition dies on this
   screen because…"). Then Rung-3: the Commander judges taste — side-by-side variants,
   one question at a time.
4. **Taste Boot Camp.** Armaan's register — *luxury game UI × Bloomberg terminal × Apple
   spatial* — becomes a trained profile: approve/reject/iterate with rationale on design
   batches, persisted to the Archive, distilled into the **design class kit** as delta
   bullets ("rejected: gradient-on-gradient — wants restraint with one luxurious
   accent"). The intervention-rate curve decides when the Tailor is battle-ready per
   surface type (marketing page vs. app UI vs. data-dense views graduate separately).
5. **Mint everything that survives.** Design systems, component variants, motion recipes,
   judge rubrics → the Armory with utility scores. ArtLab stays the asset arm (characters,
   textures, art); fal.ai the raw generation backbone; **vercel:shadcn** the component
   substrate. First mints: the Tower design system (it exists — extract it), the
   gym-tracker system (Proving Ground), the screenshot-judge rubric itself.

## 4. 🎖️ Making the General better (the seat, not the files)

- **The seat charter is layered, and lean is the law** (context rot is measured and real):
  **L0** = an output style (`the-general.md`, system-prompt weight, ~500 tokens): identity,
  the five move *names*, the three sacred rules, the two maxims, the JIT contract ("query
  the Archive before acting; cite Precedent"). **L1** = per-campaign gear (tempo, RoE,
  caps). **L2** = terrain CLAUDE.md. **L3/L4** = playbook, kits, Archive, Armory — pulled
  just-in-time, never resident. The doctrine files are NOT in the General's head; the
  pointer-and-principle layer is.
- **The charter evolves like everything else — with a fitness function.** GEPA-style
  reflective evolution (the ICLR-2026 result: +20% over RL with 35× fewer rollouts —
  affordable for one operator): mutations proposed from Siege kill-logs + Commander
  reject-rationales (never the builder's self-narrative), evaluated on the held-out
  benchmark campaigns, ACE-merged as deltas, Commander lines pinned, run by the Analyst,
  propose-never-merge. The seat's constitution changes rarely and only when the Service
  Record proves drift.
- **Persona — the counterintuitive call:** the research is unambiguous that
  reasoning-conditioning personas *degrade* agents (up to 26% worse; "battle-hardened
  general who trusts his gut" would be self-sabotage). But voice is output-layer. So:
  **a name and a reporting register, scoped to output only** — terse military-brief
  cadence, addresses the Commander, signs Dispatches; *"this voice governs how you WRITE,
  never how you DECIDE"* goes in the charter verbatim. The character is the chair; the
  brain is interchangeable. The Commander picks the callsign at the pilot.
- **The capability-tier table** makes seat swaps mechanical: weaker seat → smaller F1
  scope, more interrogation at Briefing, tighter checkpoint headroom, more seam-freezing,
  +1 siege round. The pre-window Fable-vs-Opus benchmark turns those rows from guesses
  into measured deltas.
- **Standing countermeasures for the seat's own failure modes:** overconfidence (agents
  mispredict their own success by up to 55 points — hence verdicts are never self-issued),
  sycophancy (the General must flag a bad Order at Briefing, not comply with it),
  scope-creep (FRAGO-or-it-didn't-happen), context rot (measured checkpoints, cursor
  reconciliation).

## 5. 🏰 The Base, corrected by what andro actually built

The Base spec held up against his transcripts — with five real gaps, now adopted:

| Verdict | What | Why |
|---|---|---|
| **ADOPT — flagship gap** | **Builder Mode**: *"Everything I do inside the game. Nothing's done outside the game… we can just create the room from here."* | A room = `{title, organ, terminal-kind, data-source-path}` — over files-as-backend this is *cheap*. The force that builds products builds its own cockpit. |
| **ADOPT** | **Live work-feeds** — *"watch him making a design right now"* | per-unit live tail of the War Log / Dispatch stream on every card drill-down; it's `tail -f`, free, and the single highest morale-per-byte feature |
| **ADOPT — elevate** | **Connected-accounts page** — *"in one place see everything attached to my AI agents and what they have access to"* | the credential audit surface becomes a first-class Armory tab, not a sub-bullet |
| **ADOPT** | **Room repurposing** — his supplement factory became something else after a pivot council | standing ops get re-pointed, not just killed; lineage/archive preserved |
| **ADAPT** | his **morale meter (88%)** → a truth-bound **Force Health** indicator | derived from the Service Record (kill-rate trend, intervention rate, stop-loss proximity) — never an arbitrary happiness number; the anti-vanity law holds |
| **SKIP** | the slavery/sweatshop register; building the game before the businesses; rebuilding Linear/Obsidian in-world | his own words: *"Fuck the ecosystem… set this up in a Discord — it would be easier. The point is the agents provide real value, not to be mesmerized by my GUI."* Terminals-first stands. |

His five load-bearing quotes are preserved in `THE-BASE.md` margins — including the one
that argues our whole Move 1: *"The only true skill you need is articulation. The agents
are not the founder — you are. If your idea is vague, your output is vague."*

## 6. 🚀 Every organ at max (the imagination atlas)

The 2–3-year ceiling for each organ, every one grounded in a mechanism that exists today:

- **The Briefing** that knows you — interviews you **by voice on a walk**, asks only what
  it can't predict from your Archive, and lands a half-written Orders on your phone.
- **Go/No-Go** as a *portfolio* gate — budget envelopes you set once ("up to $40 and 6h"),
  routine campaigns self-authorize inside them; only breaches escalate. You set policy,
  not keystrokes.
- **The Build** with per-class force priors — the Archive tells it where F1 historically
  broke *for this class*, so it decomposes preemptively on burned terrain and goes solo
  where it has aced.
- **The Siege** as a **standing red team that studies YOUR failure patterns** — a
  persistent adversary with a kill library of your recurring blind spots, opening each
  siege with "you under-specify offline states; here's where I look first," auto-rotating
  to whatever non-Claude frontier model is newest so alien-ness never decays.
- **The Debrief** that makes falsifiable bets about the *next* campaign and is graded on
  them; doctrine lessons ship as A/B experiments with measured effect sizes.
- **The Archive** as a queryable memory of your operating life — "when have I been wrong
  about scope?" is a question it answers with receipts.
- **The Analyst** as a scientist whose lab is your force — hypothesis, doctrine-diff PR,
  predicted effect, measured result.
- **Boot Camp** with cross-class taste transfer — the hundredth class graduates in a dozen
  rounds because it bootstraps from the nearest graduated profile.
- **The Armory** as compounding craft — hundreds of survival-gated minted skills; a fresh
  repo starts with your accumulated arsenal.
- **The Deployment Officer** that *measures* seat assignments — re-benchmarks every new
  model against your own Service Records and reassigns chairs.
- **Standing Operations** running a real revenue portfolio (the andro pattern, cleaned
  up) — each op earns its keep or faces the pivot council.
- **The Treasury** as a forecasting router — knows per-class marginal cost, routes to the
  cheapest *graduated* seat, projects the month.
- **The Base** as the walkable command world over it all — terminals real, characters
  in-voice, fog-of-war minimap, Builder Mode minting rooms from inside.

## 7. 🕳️ Gaps round 2 — fourteen things we'd never discussed

**Fixed in doctrine this round (they blocked the pilot):**
1. **The bootstrap paradox** — Briefing requires Archive precedent, Boot Camp needs
   verdicts, the Armory needs survivors… all empty on day one, so the first campaigns pay
   full ceremony for zero compounding. → **Cold-start mode**: first N campaigns run
   record-only (capture everything, retrieve-nothing expected, no Precedent block).
2. **Empty-Precedent-blocks-Go deadlocks any new terrain** → the **first-contact
   exemption**: on terrain with <3 campaigns, the Precedent row may cite seed kits +
   cross-terrain Armory assets.
3. **Doctrine versioning** — a long campaign could straddle a doctrine change → the War
   Log cursor now carries a doctrine-version field; the Analyst runs the held-out
   benchmark *before* a diff merges, not after.

**Near-term (before Standing Ops carry keys or money):**
4. **Runtime secrets** — agents from two vendors holding live Supabase/Stripe/Vercel keys.
   Posture: read-only-by-default for Siege/Analyst seats, a credential proxy so tokens
   never enter agent context, short-lived tokens over long-lived keys.
5. **Disaster recovery** — "the compounding lives in the files, and the files live on one
   laptop." Durable set = doctrine + Archive index + Armory, pushed to a private remote
   nightly by the Analyst; the drill: *rebuild the force on a fresh machine in an hour.*
6. **The force-level cost ceiling** — a monthly hard cap with a degradation order (pause
   standing ops → drop Analyst frequency → refuse new campaigns). A stop-loss for the
   force, not just per-campaign.
7. **Agent identity** — every external action tagged agent-originated (the Co-Authored-By
   convention, a distinct bot identity for messages) so the human/agent boundary is
   always provable.

**Strategic (decided stance, parked execution):**
8. **Non-code classes are unexercised** — the second proving ground must be Rung-2 (a
   researched decision memo) to test whether a sieged rubric actually catches a bad answer.
9. **Multi-user** — single-Commander invariant declared; everyone else is a stakeholder.
   Multi-Commander goes to the Reserve.
10. **Distribution** — stance: *doctrine shareable, Archive/Armory private* (the moat is
    the accumulated memory, not the protocol text).
11. **Legal exposure of autonomous revenue ops** — before any op transacts: an
    authority-limit doc per op (max spend, may-not-promise list) enforced as 🔴 RoE, plus
    agent disclosure. (2026 law has removed "the AI did it" as a defense.)
12. **Conflicting standing ops** — priority field + cross-op mainline writes always via
    proposal mode; the Commander is the arbiter of record.
13. **Outcome observability** — efficiency curves can improve while shipped artifacts rot
    (Goodhart on our own scoreboard): every standing op must carry ≥1 *external* outcome
    metric (usage, revenue, user verdict) wired into the Service Record. Reality gets the
    final say.
14. **The decommission criterion** — the system holds itself to its own standard: *if
    after 30 campaigns the kill-rate and intervention-rate curves show no downward trend,
    the Intelligence Division is decorative and gets cut back to bare campaigns.* Written
    into doctrine. No sunk-cost shrines.

## 8. 🧩 Zoom back out — the puzzle, linked

Every piece feeds a neighbor; this is the loop that makes it one organism:

```
            ┌──────────────────────────────────────────────────────────┐
            │                      👑 THE COMMANDER                     │
            │        (phone · terminal · the Base · Morning Brief)      │
            └──────────────────────────────────────────────────────────┘
                 │ intent / taste / go                      ▲ Dispatches / briefs / PRs
                 ▼                                          │
   🧬 KERNEL (every session) ─routes─▶ ⚔️ CAMPAIGNS & 🏰 STANDING OPS
                 ▲                            │ every artifact attacked (💥)
                 │ sharper defaults           ▼
   🧠 ANALYST (cloud, nightly) ◀─reads── 📚 ARCHIVE + 📊 SERVICE RECORD ◀─writes── 🎓 DEBRIEFS
                 │ doctrine PRs                       ▲
                 ▼                                    │ survival-gated mints
   📖 DOCTRINE + 🏭 ARMORY ──loaded JIT into──▶ 🎖️ THE GENERAL'S SEAT (resolver-bound)
```

Read it as a sentence: **the kernel makes every session fight by doctrine; campaigns
produce attacked artifacts and honest records; the Analyst turns records into sharper
doctrine and a fuller Armory overnight, in the cloud, while the laptop sleeps; the
General's seat loads the sharpened files just-in-time; and the Commander steers the whole
force through one gate, one feedback panel, and one morning voice.** Each loop around
that circuit is one notch of compounding — and the Service Record is the dial that proves
the notch happened.

---

*Decisions installed this round: the kernel (global CLAUDE.md + per-message reflex hook +
Codex kernel) · cold-start mode + first-contact exemption + doctrine-version stamp (in
doctrine) · the night-shift posture (Routines-first) · the Tailor pipeline + General's
seat spec (this doc, § 3–4) · Base deltas (in THE-BASE.md) · the decommission criterion.
Next: rebuild the briefing page (done this round), then Proving Ground.*
