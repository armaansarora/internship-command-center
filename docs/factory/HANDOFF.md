# 🪖 The Military — HANDOFF / START HERE

**You are picking up an in-flight project. Read this file first, then the linked docs. By
the end you'll be oriented to take a seat as the General of its first campaigns.**

> Originally written 2026-06-09 by Claude Opus 4.8 to hand the overseer seat to Fable 5.
> Rewritten later that day by Claude Fable 5 after the revision it was handed the seat to
> perform. History is preserved: the Opus-era design is summarized (and defended where it
> deserved it) in `2026-06-09-fable-revision.md`.

---

## 0. TL;DR
**The Military** is a standing force that turns any intent into a finished, attacked,
surviving artifact — and provably improves every run. It is **doctrine + a thin set of
files** (`THE-MILITARY-DOCTRINE.md` v2 + `doctrine/`), run by the strongest *available*
agent over tools that already exist. v1 survived its own siege (4 lenses + Codex); **v2
landed after the Commander's counterattack**, adding the machinery his critique demanded:
the **Intelligence Division** (Archive · Analyst · Boot Camp · skill minting · Service
Record — `THE-INTELLIGENCE-DIVISION.md`), the **Deployment Officer's fallback chains**
(the post-Fable answer: compounding lives in the files, not the model; the swarm is the
reduced-strength gear), **Standing Operations** (operate tempo, Morning Brief), formality
gears (Skirmish/Campaign/Probe), and the **Base** frontend spec (`THE-BASE.md`).
**Next action: run `OPERATION-PROVING-GROUND.md`** — the gym-tracker pilot campaign.

## 1. Who you're working with
**Armaan Arora** — senior CS student, owner of **The Tower** (interntower.com, this repo).
He is the **Commander-in-Chief**; you are the **General**. His style:
- Wants it **simple and clear** — explain *and show* (diagrams, walkthroughs).
- **Thinks BIG** — "go bigger" is a frequent push. Default ambitious, then trim.
- **Loves the craft** — naming, theming, the fun of it. Uses emojis and likes them back. 🎖️
- **Cost-aware** — $200 Claude Max + $100 Codex Pro; economics are a real design constraint.
- **Iterative + decisive** — locks decisions fast, holds them "provisional, subject to evidence."
- Builds **conversationally**: sharpen intent (grill-me) → fan out Workflow swarms → consolidate to docs.

## 2. The dream (north star) — do not lose this
> You're building **the last tool you need to build.** Everything downstream of "I want X"
> gets handled, and it improves its own divisions over time, so it never stops compounding.
> **The only ceiling left is your imagination.**

Universal — not just apps; anything decomposable (apps, research, decisions; art via the
ArtLab class kit). The Tower and ArtLab are *products it could run*; The Military is the
thing that *makes* them.

## 3. What it is (one paragraph)
A **campaign** runs five moves: 📋 **Briefing** (interrogate intent → one human-editable
`ORDERS.md` with victory conditions, verdict mechanism, rules of engagement) → 🚦 **Go/No-Go**
(the one spend gate — the Commander edits the Orders and says go) → 🔨 **Build** (one strong
agent end-to-end by default; fan-out and true decomposition only on measured walls; walking
skeleton early, Dispatches throughout) → 💥 **Siege** (a different model family attacks with
kill authority; every finding dispositioned; done = survived) → 🎓 **Debrief** (after-action
report → pattern-gated, alien-checked lessons graduate into capped doctrine files). The
governing maxim: **build nothing the model curve will obsolete; build only what compounds
as models improve.** Full doctrine: `THE-MILITARY-DOCTRINE.md`.

## 4. Current state
- ✅ Vision + concept locked (2026-06-09, Opus session); 851-idea brainstorm; army cast.
- ✅ **The Fable revision**: swarm-era machinery → doctrine; sieged (4 lenses + Codex,
  ~39 kills folded). Trail: `2026-06-09-fable-revision.md`.
- ✅ **v2 — the Commander's counterattack** (same day): self-improvement made mechanical
  (Hermes/ACE/Voyager/MemRL + a 44-video field study of @androoagi's profitable agent
  ecosystem), fallback chains, standing operations, Skirmish gear, Dispatches rename,
  the Base spec, packaging plan (doctrine §10).
- ✅ Doctrine seeds live: `doctrine/` (PLAYBOOK, GOTCHAS, VERDICTS, check-caps.sh, class-kits).
- ✅ Operation: Blueprint cancelled (subject evaporated; judgment work happened in-session).
- ⏳ **NOT yet field-tested.** Next = **Operation: Proving Ground**, then the `/military`
  plugin-skill (doctrine §10, layer 1).

## 5. The docs map (everything lives in `docs/factory/`)
- **`HANDOFF.md`** — this file (start here).
- **`2026-06-09-session-ledger.md`** — the compaction ledger: machine state (kernel
  installs + backups), the LIVE four-way cold-eyes review operation + its triage
  protocol, conversation-only context, the ranked queue. **Read 2nd if resuming
  mid-stream.**
- **`THE-MILITARY-CONCEPT.md`** — newcomer explainer (read 2nd). `BRIEFING-ROOM.html` — the visual pitch.
- **`THE-MILITARY-DOCTRINE.md`** — the system itself, v2 (read 3rd).
- **`THE-INTELLIGENCE-DIVISION.md`** — the learning machinery, with provenance (read 4th).
- **`THE-BASE.md`** — the frontend spec (the walkable command world).
- **`THE-MILITARY.md`** — canon: cast v3, Force Levels, Verdict Ladder, fleet.
- **`doctrine/`** — the live compounding asset (playbook, gotchas, verdicts, class kits).
- **`OPERATION-PROVING-GROUND.md`** — the next action: the pilot campaign (read 5th → run).
- **`2026-06-09-fable-revision.md`** — the full decision trail: Opus design → v1 → siege → v2.
- `OPERATION-BLUEPRINT.md` — superseded (kept for the record).
- `2026-06-09-factory-brainstorm.md` / `-naming-worlds.md` / `-title-bank.md` — the corpora.
- Auto-memory: `~/.claude/projects/-Users-armaanarora-Developer-The-Tower/memory/project-the-military-build-engine.md`.

## 6. Your job now (in order)
1. **Read** the doctrine (`THE-MILITARY-DOCTRINE.md`) — you will be executing it, so read
   it as your own field manual, not as a document to review.
2. **Run Operation: Proving Ground** (`OPERATION-PROVING-GROUND.md`): finalize the Orders
   with the Commander (Move 1 → 2), build the gym tracker, siege it, debrief it. The AAR is
   the real deliverable — it's the doctrine's first contact with reality.
3. **Apply the AAR**: whatever the pilot proves wrong in the doctrine, fix via Move 5's own
   rules (pattern-gated, alien-checked). Then decide with the Commander where doctrine
   graduates to (it's universal — a portable home, once proven).

## 7. Gotchas / constraints
- **The Fable free window ends 2026-06-22** — run the General's seat on Fable until then;
  after, it costs credits (~2× Opus). The fleet doctrine already accounts for this.
- **Tower DB:** server-side data access uses the Supabase REST client, never Drizzle's `db`
  at runtime (IPv6-only DB; pooler errors). Drizzle = schema/migrations only.
- **Migrations can't auto-apply unattended** — ship numbered SQL; the owner applies via the
  Supabase SQL editor. (Generalized in `doctrine/GOTCHAS.md`.)
- **The doctrine is sieged but unproven** — Proving Ground is allowed and expected to
  overturn parts of it. The dream (§2) and the working style (§1) are the fixed points;
  the mechanics remain negotiable, now with a kill-log to learn from.
