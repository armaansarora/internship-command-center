# 📖 Playbook — running a campaign

*The General's checklist. Full rationale: `../THE-MILITARY-DOCTRINE.md`; learning spec:
`../THE-INTELLIGENCE-DIVISION.md`. Cap: 150 lines (`check-caps.sh`); compression happens
at the START of a Briefing, non-destructively (demote to source AAR). Lessons land as
append-only typed deltas — never rewrite this file wholesale.*

## Gear check (before Move 1)
- 🗡️ **Skirmish** (🟢, small, reversible): collapse the moves — inline brief → build →
  1 siege round → 3-line AAR. Don't ceremony a small job.
- 🔍 **Probe loop** (intent must be discovered): cheap bounded probes → sharpened Orders
  or a kill → then the five moves.
- ⚔️ Otherwise: full campaign, below. The Orders may waive any rule except Siege
  independence, stop-loss, and RoE gates (logged reason required).

## Move 1 — The Briefing
- [ ] Read this playbook, `GOTCHAS.md`, the class kit; check `VERDICTS.md` for resolvable
      predictions. Over-cap files: compress NOW (you're the reader; fresh budget).
- [ ] Query the Archive (`mem.sh recall` + AAR index) and pull top-k Armory assets for
      this class. Everything consulted → the Orders' **Precedent** row (empty blocks Go).
- [ ] Interrogate intent grill-me style. New task-class or taste-heavy? Plan **Boot Camp**
      (supervised approve/reject batches) into the Orders.
- [ ] Recon terrain; mine conventions as contract.
- [ ] Freeze the Verdict rung + rubric NOW (Rung 2: required shape — weighted criteria,
      threshold, disqualifiers, evidence rules — and ≥1 externally-anchored condition;
      delayed truth → Verdict-Pending). 
- [ ] Blast radius by danger; stop-loss: cost cap, clock cap, headroom threshold,
      hypothesis-based loop detection.
- [ ] Write `campaigns/<date>-<codename>/ORDERS.md`: ambitious, cut-lines ordered
      Core → outward, concrete F1 budget, why adjacent force levels were rejected.

## Move 2 — Go/No-Go
- [ ] Rung 2/3: adversary attacks the RUBRIC first; Commander approves post-attack.
- [ ] Declare every human touchpoint (Red confirms, Rung-3 judging, Boot Camp reviews,
      probe iterations): trigger + responses + blocks-or-not.
- [ ] Commander edits `ORDERS.md` directly; no build force until **go**; re-read the
      edits — the diffs are the intent signal.
- [ ] Mid-build changes = **FRAGO** blocks: clarification/cut → log + next Dispatch;
      victory-condition change or expansion → Commander ack.

## Move 3 — The Build
- [ ] Open `WAR-LOG.md`: cursor block (phase · Orders hash + FRAGO count · force level ·
      branches/worktrees · open issues · next command · last verified gates · rollback
      notes). Cold resume: reconcile against `git status`/`git worktree list` — believe
      the repo, fix the cursor.
- [ ] Start at the estimated Force Level (default F1 at full seat strength; weaker seat →
      smaller F1 scope, earlier escalation). Escalate on MEASURED tripwires only:
      headroom crossed or gates regressed at a checkpoint — never on felt struggle.
- [ ] Checkpoints: park state → run gates → re-read Orders → self-check every victory
      condition → file a **Dispatch** (progress vs. conditions, drift, FRAGOs, burn).
- [ ] Contracts freeze where parallelism starts (F2 included): boundary signature + one
      boundary test BEFORE parallel work. Oversize seam-unit → **sub-campaign**.
- [ ] Walking skeleton early → **First Contact** (required for 🔴, Rung-3, > ~90 min;
      prefer reversible work while the review window is open).
- [ ] First slice satisfies ONE named victory condition end-to-end; no infra-only first
      slices unless the mission is infra. Shippable at every cut-line.

## Move 4 — The Siege
- [ ] Mechanical gates first (class kit). Table stakes.
- [ ] Cross-family assault under a **Siege packet**: kill authority, praise forbidden,
      required failure search, minimum evidence, exact files/commands, Crit/High/Med/Low.
      Attack the ORDERS, not just the diff. Same-lineage ≠ survived.
- [ ] Siege family unavailable → ship-blocked HALT. Never self-review and ship.
- [ ] High stakes → lens panel (correctness / security / perf / mission-fit).
- [ ] Disposition every finding (fixed/rejected/deferred/accepted-risk + rationale) in the
      ledger. Survived = every Crit/High fixed or Commander-accepted.
- [ ] Rounds: 🟢 1 · 🟡 ≤2 · 🔴 two consecutive clean (Commander signs residual Mediums).
- [ ] Record the kill-rate for the Service Record.

## Move 5 — The Debrief (campaign NOT closed without it)
- [ ] `AAR.md`: the five questions; answer 2 authored FROM the attacker's kill-log;
      Verdict-Pending → prediction + check-back into `VERDICTS.md`.
- [ ] **Service Record row**: kill-rate, first-pass survival, FRAGO count, estimate
      accuracy, intervention rate, cost.
- [ ] Lessons = typed, **principle-level** deltas (GOTCHA / DECISION / CLASS-KIT delta)
      with counters — appended, never rewriting doctrine. Campaign-specific paths/values
      → rejected. Each delta passes a cheap alien check. GOTCHAs may land on one
      incident; PLAYBOOK rules need a second campaign or the Commander.
- [ ] **Mint**: any asset this campaign proved (template, rubric, kit, snippet, skill) →
      the Armory — only because the campaign SURVIVED. `check-caps.sh` green.
- [ ] One `mem.sh remember` pointer (never duplicate lesson text — doctrine owns lessons,
      memory owns pointers). Park state; release the lock.

## Standing rules (always in force)
- **RoE class is the master dial**: siege rounds, First Contact, Dispatch cadence, loop
  thresholds, formality gear — all key off 🟢🟡🔴.
- `CAMPAIGN.lock` is a real file (id, owner, branch, started, paths, expiry); unexpired
  foreign lock → stop or take a worktree. 🟡/🔴 lands as proposals, never direct writes.
- Loop detector watches hypotheses: same repair-class fails 2× → halt; no Crit/High
  reduction over real wall-clock → halt.
- Failover by seat: bulk blocked → General absorbs; General's seat degraded → smaller F1
  bar + earlier F3 + Commander flag (never silent); Siege family blocked → ship-blocked.
- Third-party capability: **replicate, never install**; alien audits the re-implementation.
- Boot Camp classes: supervised until the intervention rate crosses the kit's threshold;
  regression drops the class back. Spot-check battle-ready classes at the kit's rate.
