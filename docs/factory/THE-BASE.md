# 🏰 The Base — the frontend (design spec)

*The Military's world. Not a dashboard with a theme — a base you walk into, where every
unit is visible, every room is a function, and every screen tells the truth. Inspiration:
@androoagi's space-station tycoon (Fallout-Shelter-style, every NPC a real agent, XP tied
to real revenue) · OpenClaw Mission Control pattern language · Devin/Windsurf Agent
Command Center · Langfuse trace trees · NASA Open MCT. Anti-inspiration: vanity-metric
gamification (the research is unanimous it corrupts).*

**Relationship to The Tower:** same DNA, different building. The Tower is the *product*
(floors, C-suite characters); the Base is the *force that builds products*. ArtLab
generates all Base art — the pipeline already exists. The Tower itself becomes a Standing
Operation managed *from* the Base.

---

## 1. The shape: a base you walk, with terminals that are real

androoagi's load-bearing trick, kept whole: **a spatial world where each room is a
department, each character is a real agent, and each room's terminal opens the real
controls for that function.** His stack reveal: *"Next.js, TypeScript, Phaser. That's all
you need"* — and all art AI-generated. Ours: Next.js + TS + Phaser for the world layer,
ArtLab for art, the campaign/doctrine **files as the only backend** (the cockpit reads
what the force already writes — no new state store).

His honesty, also kept: *"You could set all this up in a Discord — it would be easier."*
The world layer is morale, legibility, and joy — the **terminals are the product.** So the
build order is terminals-first (usable as plain panels), world-shell second.

## 2. The room map

| Room | Function | The terminal shows |
|---|---|---|
| 🎖️ **The Bridge** | command overview + the Morning Brief | one screen: standing-ops health, active campaigns, overnight Dispatches digest, money/burn. The Morning Brief plays here, in-voice: *"Good morning, Commander…"* |
| ⚔️ **The War Room** | the master board | **Kanban whose columns ARE the five moves**: Briefing → Go gate → Build → Siege → Debrief. Campaign cards move left→right. The Go and Siege columns are literal wait-on-Commander lanes |
| 📋 **The Briefing Room** | intent + Orders | edit `ORDERS.md` live, approve rubrics, answer the General's questions, FRAGO history |
| 📡 **The Watchtower** | the live feed | persistent ticker (follows you to every room): Dispatches, First Contacts, FRAGOs, Siege kills, gate results — **error-priority sorted** so a Critical never rots below a status line |
| 🗂️ **The Archive** | memory + Boot Camp | search the everything-archive; the **approve/reject/iterate/notes panel** (rationale required); the doctrine shelf — graduated lessons with citation counts (a trophy case anchored to real artifacts, not badges) |
| 🏭 **The Armory** | minted capability | the skill/template/rubric inventory with utility scores; the **credential audit surface** (every key, every seat, one page) |
| 💰 **The Treasury** | cost truth | per-campaign burn vs. Orders caps as **twin fuel gauges** (cost + wall-clock, amber→red toward stop-loss); per-seat monthly spend; subscription-vs-token routing |
| 🧠 **The Analyst's desk** | the learning loop, visible | proposed doctrine diffs awaiting approval; the Verdict ledger with check-back dates; **Service Record charts** (kill-rate falling, estimates converging, intervention rate dropping — the self-improvement, plotted) |
| 🪖 **The Parade Ground** | force structure | org chart of active squads under the General, **capped at 3 levels** (the legibility law); status dot per node; click any node → attach to its live session; the **Force Health** indicator — andro's morale meter, bound to truth (derived from Service Record trends + stop-loss proximity, never an arbitrary number) |

## 3. The ten UI laws (stolen from what works, enforced)

1. **Kanban-by-phase is the master layout** — "what's blocked, what's building, what
   needs my go" in one glance. (Windsurf Command Center, OpenClaw Mission Control.)
2. **Campaign-as-card with a fixed face**: codename · RoE color (🟢🟡🔴 IS the design
   system) · force level icon · victory conditions met N/M · last War-Log line · twin
   fuel gauges. Status reads by color, never by text-parsing.
3. **Every card is a control, not a readout** — click attaches into the live session /
   worktree (xterm), where you can talk, FRAGO, or kill. (AgentsRoom; doctrine §7's
   "the live session is the control plane," made one click.)
4. **One persistent feed, error-priority sorted**, on every screen. (The floating-log rule.)
5. **Drill-down is a trace tree**: campaign → five moves as spans → squads → tool calls,
   with elapsed/tokens/$ per span; the Siege gets a waterfall lane per round with its
   kill-log; kill-rate plotted over campaigns. (Langfuse/Braintrust shape.)
6. **Fuel gauges, not points**: the only "number-go-up" is depletion against real caps and
   the Service Record's real curves. **Banned: XP-for-activity, streaks, leaderboards,
   badges.** XP exists only where androoagi earned it — tied to real outcomes (campaigns
   survived, verdicts resolved, revenue on standing ops).
7. **Org depth ≤ 3 levels.** Deeper nesting is illegible; sub-campaigns get their own card
   instead.
8. **Fog-of-war minimap** for Inbound mode and portfolios: shipped terrain lit, in-flight
   glowing, proposed candidates dimmed in fog. (RTS situational awareness.)
9. **Progressive disclosure**: a 🟢 F1 skirmish renders a card and a feed line — no empty
   squad org-charts, no siege waterfall until a siege exists. Complexity unlocks as the
   campaign escalates. (Idle-game tab-graying, used honestly.)
10. **Characters speak their status in voice** — the General's Dispatches, the Analyst's
    proposals, the Morning Brief: each delivered by its character (ArtLab cast pipeline;
    the Telegram-forum @identity pattern). Authorship unmistakable, theme reinforced.

## 3.5 The andro corrections (2026-06-09 examination round)

Five deltas after auditing his actual build against this spec (full table:
`THE-MILITARY-AT-MAX.md` §5):

- **§B4 Builder Mode (the flagship gap):** *"Everything I do inside the game. Nothing's
  done outside the game… we can just create the room from here."* A room is just
  `{title, organ, terminal-kind, data-source-path}` over files-as-backend — so the Base
  can mint and **repurpose** its own rooms from inside (a pivoted standing op re-points
  its factory room; lineage preserved). The force that builds products builds its own
  cockpit.
- **Live work-feeds:** every campaign card drill-down gets a live tail of its War Log /
  Dispatch stream — *"watch him making a design right now."* It's `tail -f`; free; the
  highest morale-per-byte feature he has.
- **Credential page promoted:** the connected-accounts/key audit becomes a first-class
  Armory tab — *"in one place see everything attached to my AI agents and what they have
  access to."*
- **Force Health** (Parade Ground): his 88% morale meter, rebuilt truth-bound.
- **Tone:** his slavery/sweatshop register is SKIPPED entirely — The Military's register
  is doctrine and honor. And his own honesty pins our build order: *"Fuck the ecosystem…
  set this up in a Discord, it would be easier. The point is the agents provide real
  value — not to be mesmerized by my GUI."* Terminals first. World second.

## 4. Build plan (each stage ships something usable)

| Stage | Ships | Effort |
|---|---|---|
| **B0 — Files** | already done: campaign dirs are the data model; /workflows + forge dashboard watch builds today | 0 |
| **B1 — Terminals** | a local Next.js app reading campaign/doctrine files: War Room kanban + card faces + Watchtower feed + Treasury gauges + Service Record charts. No game layer | the pilot's sibling campaign |
| **B2 — The phone** | Telegram: Morning Brief, Dispatches, approve/reject (Boot Camp from your pocket), the word **go** | small (ArtLab bot exists) |
| **B3 — The world** | Phaser shell around the terminals: walkable Base, rooms, characters, ArtLab art, the commander's chair | the fun one — after the loop is proven |

Each stage is itself a campaign with Orders and a Siege. B3 before B1 would be decorating
an empty building — androoagi built his game *around* working businesses, not before them.

---

*Spec v1, 2026-06-09. The Base is to The Military what the lobby is to The Tower: the
moment the system stops being files and starts being a place.*
