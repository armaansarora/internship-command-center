# 🗂️ The Intelligence Division — how The Military actually learns

*The full self-improvement spec. Every mechanism here is stolen from a system with
published evidence or a profitable field deployment — provenance is cited per mechanism so
nothing rests on assertion. Command summary: doctrine §6.*

**The claim being made precise:** "it improves itself every run" means — after N campaigns,
the (N+1)th campaign briefs faster, builds with fewer wrong turns, survives the Siege in
fewer rounds, and needs the Commander less — *and each of those is a number on the Service
Record, plotted over time.* Improvement you can't see on a chart didn't happen.

---

## 1. 📚 The Archive — Total Recall, indexed

**What's recorded (everything; recording is free):**
- Raw: session transcripts (harness), Workflow journals, git history.
- Deliberate: per campaign — `ORDERS.md` + FRAGOs · `WAR-LOG.md` (cursor + running log +
  every Dispatch) · the Siege kill-log + disposition ledger · `AAR.md`.
- **Commander feedback as first-class records**: every approve/reject/iterate verdict
  *with its rationale* ("rejected: too corporate, wanted warmth"). Field-proven as the
  single highest-leverage record type — it's what lets supervision stop. *(Provenance:
  androoagi's Archives/Obsidian room: "everything I ever say is remembered… a lot of it's
  the feedback I've given them.")*

**How it's retrieved (the part that makes an archive an asset, not a landfill):**
- Index: FTS5 + embeddings over AARs, kill-logs, and feedback records (extends forge's
  existing `mem.sh` index — no new infrastructure).
- Retrieval score = **recency** (exponential decay) × **importance** (stamped 1–10 at
  write) × **relevance** (embedding cosine) *(Generative Agents, 2023)* **+ utility** —
  a per-record Q-value updated by exponential moving average each time the record is
  retrieved into a Briefing: reward = that campaign survived its Siege cleanly. Useless-
  but-similar precedent decays out automatically. *(MemRL, 2026: +56% over static memory.)*
- The Briefing **must** query it; the Orders' Precedent row is the receipt; an empty row
  blocks Go. Retrieval is just-in-time and class-scoped — never whole-archive loading.
  *(Anthropic context-engineering; OpenHands keyword-triggered microagents.)*

## 2. 🎓 The lesson loop — ACE-style deltas, not rewrites

The v1.1 sin: "the General updates the playbook at Debrief" = the same agent rewriting the
asset every run → context collapse and confident garbage. v2 rule set:

1. **Lessons are typed delta bullets, append-only**: `GOTCHA` / `DECISION` / `CLASS-KIT
   delta`, each carrying helpful/harmful counters. The General *never* rewrites a doctrine
   file at Debrief; it appends deltas. Merging is deterministic (a script, not an LLM).
   *(ACE, 2025: delta-updates beat full rewrites by ~+10% with ~85% less adaptation
   latency — full rewrites are how playbooks rot.)*
2. **Principle-level only**: a delta naming a specific path, value, or campaign particular
   is rejected mechanically. *(2026 continual-internalization result: principle-level
   statements are 84% reusable vs 3.7% for instance-level.)*
3. **The post-mortem is authored from the attacker's kill-log**, never the builder's
   self-narrative — the builder explaining its own misses is the canonical unreliable
   narrator. *(Reflexion, 2023: evaluator and self-reflection are separate roles.)*
4. **Alien check before landing**: every delta faces a cheap cross-family pass — "true,
   general, worth a slot, or overfit to one campaign?"
5. **Two-speed graduation**: GOTCHAs land on one incident; PLAYBOOK behavioral rules need
   a second confirming campaign or the Commander's signature.
6. **Compression at the *next* Briefing** (fresh budget, the reader prunes): de-dup by
   embedding, prune low-counter/low-utility, demote non-destructively to source AARs.
   Caps enforced by `check-caps.sh` — structural, not motivational.

## 3. 🧠 The Analyst — the standing improvement agent

*Recalled from v1.1 retirement; the Commander was right that improvement can't only happen
in the exhausted last minutes of a campaign.* The Analyst is The Military's "research bay
pointed at itself" — a separate role whose ONLY job is meta. *(Provenance: Hermes Agent's
Curator — an idle-fork maintenance loop with backups and rollback; androoagi's Radar Bay:
"he just looks across our current systems and asks how can it be better — he's just a
feedback guy.")*

**Runs**: scheduled (nightly via Routines/cron/launchd) or idle-triggered. Cheap seat —
curation is volume work, not scalpel work.

**The shift checklist:**
1. Stale pass (no LLM needed): demote lessons uncited in N campaigns; archive dead records.
2. Consolidation: merge near-duplicate GOTCHAs (embedding similarity), compress over-cap
   files non-destructively.
3. **Verdict check-backs**: scan `doctrine/VERDICTS.md` for predictions now resolvable;
   reopen the AAR, grade the original Orders against reality, graduate or kill the lesson.
4. Utility updates: EMA over the latest Service Records.
5. **Drift watch**: kill-rate trending to zero (alien-ness tripwire) · estimate accuracy
   rotting · intervention rate rising — each fires a flag to the Commander.
6. **Propose, never merge**: doctrine diffs land as PRs with reasoning. The Commander (or
   the next campaign's alien check) approves. *(Hermes: REPORT.md + rollback; The
   Military: git is the snapshot/rollback layer.)*

**Safety rails** *(Hermes write-origin model)*: every doctrine line carries a write-origin
tag (commander / general / analyst); **Commander-written lines are pinned** — no automated
process may prune or rewrite them; protected files stay protected; everything is in git.

## 4. 🎯 Boot Camp — the approve/reject training loop

The single most field-proven mechanism in this spec: run a *high-frequency* human
verdict loop on a new task-class until trust is earned, then stop supervising — and make
"then" a measured threshold, not a feeling. *(Provenance: androoagi trained his Etsy
design agent with "a few hundred" approve/rejects over 2–3 days, then: "now I completely
trust him — I don't even have to approve it anymore." ArtLab's two human gates are the
in-house precedent.)*

- A class kit opens in **supervised** state: every artifact batch goes to the Commander as
  approve / reject / iterate / notes — *rationale required on reject* (the rationale is
  the training data).
- All verdicts + rationales persist to the Archive (importance-stamped high) and distill
  into the class kit's taste profile as delta bullets.
- The kit tracks **intervention rate** (rejects per batch, rolling). Below the threshold
  written in the kit → the class graduates to **battle-ready**: spot-checks replace
  per-batch review (sampling rate also written in the kit). The rate is plotted on the
  Service Record — *you watch the supervision need fall.*
- Regression (rate climbs, or a Siege kill traces to taste) → the class drops back to
  supervised. Graduation is reversible, automatic, and logged.

## 5. 🏭 The Armory's forge — skill minting (Voyager, weaponized)

The Military is itself a skill that mints smaller skills. *(Provenance: Voyager, 2023 —
an ever-growing library of verified, compositional skills made an agent 3.3× more
productive and transferred to unseen worlds. androoagi's Armory + "replicate, never
install" is the field version. skill-creator is the in-house minting tool.)*

- **What gets minted**: Orders templates · rubrics · class kits · golden snippets ·
  sub-routines · whole installable Claude Code skills.
- **Storage**: artifact + natural-language description + embedding, in the Armory
  inventory (a directory + index, not a database product).
- **Admission gate**: an asset enters ONLY after a campaign that used it **survived its
  Siege** (Voyager's critic-gate, upgraded to our standard of done). Failed assets don't
  enter; stale assets lose utility score and fall out.
- **Retrieval**: top-k by embedding + utility at every Briefing → the Precedent row.
- **Compositional**: class kits reference kits; sub-campaign Orders seed from parent seam
  contracts; skills call skills.
- **Replicate, never install**: third-party capability is read-only inspected, intent
  extracted, re-implemented in-house, and the re-implementation is audited by the alien
  family. Untrusted artifacts never execute. The Armory also owns the **credential audit
  surface** — one page listing every account/key every seat can touch.

## 6. 📊 The Service Record — fitness, or it didn't happen

Per campaign, appended automatically at Debrief *(Hermes GEPA's lesson: evolution needs a
fitness signal; without one, "improvement" is vibes)*:

| Metric | Improvement looks like |
|---|---|
| Siege kill-rate (kills / round) | falling over campaigns *for the same class* |
| First-pass survival (% conditions met before round 1) | rising |
| FRAGO count + cause | falling for known classes |
| Estimate accuracy (cost & wall-clock, est ÷ actual) | converging on 1.0 |
| Commander intervention rate | falling per class (Boot Camp curve) |
| Cost per surviving artifact | falling |

The Analyst plots these; the Base (cockpit) displays them; a held-out check keeps it
honest — periodically re-run a fixed benchmark briefing/build and compare against its last
Service Record *(Hermes: 10% held-out gain requirement before a curated change merges)*.
**The Fable-window benchmark (§5 of doctrine) is the first entry.**

## 7. What was rejected, deliberately

- **A logging daemon / Dispatches pipeline** — the harness already records everything;
  build retrieval, not capture.
- **LLM-rewrites-the-playbook** — that's context collapse with extra confidence (ACE).
- **Vanity gamification of learning** (XP for activity, streaks for streaks' sake) — the
  Service Record tracks real outcomes only; the research is blunt that point-farming
  corrupts the signal it decorates.
- **Weight-level learning** (fine-tunes, RL) — wrong layer for a solo operator; every
  mechanism above improves a frozen model, which is precisely what makes it survive the
  Fable window's close.

---

*Spec v1, 2026-06-09 — written after the Commander's counterattack, from: Hermes Agent
(Curator, write-origin, GEPA fitness, model-agnostic resolver) · ACE (delta playbooks) ·
Voyager (gated compositional skill library) · Generative Agents + MemGPT + MemRL
(archive scoring & tiering) · Reflexion (role separation) · Anthropic context-engineering
(just-in-time retrieval, caps) · @androoagi's field deployment (Boot Camp, Radar Bay,
Archives, replicate-don't-install, Morning Brief). The Proving Ground campaign is its
first live test.*
