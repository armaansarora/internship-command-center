# 🏛️ The Military — canon (cast, terms, fleet)

*Updated 2026-06-09 (v2, after the Commander's counterattack). Theme rule unchanged: every
title must be **descriptive of its job** — hear it, guess the role. The costume can't cost
information.*

**North star:** *You're building the last tool you need to build. Everything downstream of
"I want X" gets handled, and it improves its own divisions over time, so it never stops
compounding. The only ceiling left is your imagination.*

---

## The cast (v3)

| Title | Role | What it does |
|---|---|---|
| 🏛️ **The Military** | the system | a standing force: doctrine + files, run by the strongest available agent. Campaigns build; standing operations operate; the Intelligence Division learns |
| 👑 **Commander-in-Chief** | you | declare intent, edit the Orders, say go, train taste in Boot Camp |
| ⚔️ **Campaign** / 🗡️ **Skirmish** / 🔍 **Probe loop** | bounded missions | full five moves / the collapsed 🟢 version / discovery-first iteration |
| 🏰 **Standing Operation** | unbounded mission | a product, store, or pipeline run on rhythms (Morning Brief · weekly review · pivot councils); spawns campaigns |
| 🎖️ **The General** | the strong agent | runs the campaign end-to-end; the F1 bar floats with this seat's strength |
| 📋 **The Briefing** | move 1 | interrogation + Recon (Archive + Armory + terrain) → the Orders |
| 📜 **Orders** + 🔄 **FRAGO** | the contract + amendments | one human-editable file; append-only changes, never silent drift |
| 🚦 **Go/No-Go** | move 2, the one spend gate | edit the Orders, say go; all other gates are declared in the Orders |
| 🪖 **Squads / Troops** | reinforcements | F2 fan-out · F3 seam-frozen parallel builders · oversize units become sub-campaigns |
| 📨 **Dispatches** | mid-run reporting | First Contact (the walking skeleton) then a dispatch from the front at every checkpoint — async, steerable, never blocking *(renamed from SITREP)* |
| 📕 **The War Log** | per-campaign record | `WAR-LOG.md`: the single-writer cursor block + running log + every Dispatch *(name recalled from the original cast)* |
| 💥 **Demolition Squad** | move 4 | alien-family attacker under a Siege packet with kill authority; disposition ledger; done = survived |
| 🎓 **The Debrief → AAR** | move 5 | five questions; lesson *deltas* (never rewrites); minting; the campaign can't close without it |
| 🗂️ **The Intelligence Division** | the learning organ | the Archive (everything, indexed, utility-scored) · the **Analyst** (standing curation agent — recalled to duty) · **Boot Camp** (approve/reject training to measured graduation) · the Armory's forge (skill minting) · the **Service Record** (fitness, plotted) |
| 🏭 **The Armory** | capability | existing tools + the minted inventory + the credential audit surface; *replicate, never install* |
| 🚚 **Deployment Officer** | the seat resolver | seats are roles, models are config: General Fable→Opus→Sonnet · Siege Codex→any alien · Analyst cheap *(recalled from retirement — the fallback story)* |
| 🧵 **Uniform Tailor** | polish | design + look (impeccable / ArtLab) |
| ⚠️ **Rules of Engagement** | the master dial | 🟢🟡🔴 keys siege depth, cadence, gear, thresholds; stop-loss always armed |
| 🏰 **The Base** | the frontend | the walkable command world; rooms = functions, terminals = real controls (`THE-BASE.md`) |

### Personnel file (who was retired, who came back, and why)
- **Target Selection, Strategist** → still absorbed into the Briefing.
- **Dispatches & the War Log** → *recalled* (v1.1 retired them; the Commander was right —
  the names now carry real mechanics: checkpoint reports + the cursor/log file).
- **Intelligence** → *recalled and promoted to a Division* — v1.1 split it into "the
  harness records / the Debrief learns" and that was too thin; it now has four organs with
  cited machinery (`THE-INTELLIGENCE-DIVISION.md`).
- **Deployment Officer** → *recalled as a config table* — v1.1 deleted the router and with
  it the fallback story; seats-as-roles with resolver chains restores it without software.
- **The onion** → lives at campaign level (sub-campaigns), and F3 is also the
  reduced-strength gear: **the swarm is the fallback, not a relic.**

## The five moves
```
📋 Briefing ─▶ 🚦 Go/No-Go ─▶ 🔨 Build (F1→F2→F3, Dispatches throughout) ─▶ 💥 Siege ─▶ 🎓 Debrief
     (skirmish collapses them · probe loop precedes them · standing ops spawn them)
```

## Force Levels (escalate on measured walls — and on seat strength)
| | Name | Shape |
|---|---|---|
| **F1** | Solo strike | the General alone — the default *at full strength*; the bar floats with the seat |
| **F2** | Strike team | + fan-out for laterals; parallel work freezes its boundary contract first |
| **F3** | Full deployment | seam-frozen decomposition, parallel Squads, sub-campaigns for oversize units — also the deadline gear and the weak-seat gear |

## The Verdict Ladder
Rung 1 **oracle** (code) · Rung 2 **adversarial review** (sieged rubric + external anchor)
· Rung 3 **human verdict** (taste — trainable via Boot Camp) · ⏳ **Verdict Pending**
(world-resolved; ledger + check-backs; compounding waits). Rungs 2–3 are honest opinion,
not oracles.

## Source corpora
- `2026-06-09-factory-brainstorm.md` — 851 ideas (the Reserve's deep bench)
- `2026-06-09-naming-worlds.md` · `2026-06-09-title-bank.md` — naming research
- Field research 2026-06-09: Hermes Agent · ACE · Voyager · MemRL · @androoagi transcripts
  (44 videos) — provenance cited in `THE-INTELLIGENCE-DIVISION.md`

## Status
Concept (Opus) → v1 doctrine (Fable rewrite) → sieged → **v2 after the Commander's
counterattack** — learning machinery, fallback chain, standing tempo, the Base spec.
Docs: `THE-MILITARY-DOCTRINE.md` · `THE-INTELLIGENCE-DIVISION.md` · `THE-BASE.md`.
Next: **Operation: Proving Ground**, then ship the `/military` plugin-skill (doctrine §10).
