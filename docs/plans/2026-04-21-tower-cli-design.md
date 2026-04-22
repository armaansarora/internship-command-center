# Tower CLI — Context Transfer System (Design)

**Date**: 2026-04-21
**Status**: Approved — ready for implementation plan
**Scope**: New in-repo tooling. Replaces `SESSION-STATE.json`, augments `BOOTSTRAP-PROMPT.md`, unchanges the roadmap.

---

## Problem

Claude Code sessions working through `docs/NEXT-ROADMAP.md` have three unresolved continuity problems:

1. **Session resumption cost** — a new session must read BOOTSTRAP-PROMPT.md + CLAUDE.md + SESSION-STATE.json + the roadmap to know where things stand. ~2–3k tokens burned before any real work begins, and the cost grows as the roadmap grows.
2. **State drift** — a markdown narrative of "what's done" goes stale the moment a commit lands. There's no way for Claude to notice that the roadmap believes X is done but the codebase disagrees.
3. **Soft context loss** — decisions made mid-session ("we chose Vercel scheduled over Inngest because already deployed"), surprises ("scheduled functions don't retry"), and half-done work don't survive a handoff. Git log captures *what* shipped, not *why* or *what almost worked*.

A smarter MD file won't fix this. The fix is to stop treating the roadmap as state and treat it as strategy — with real state derived from a combination of git, a thin ledger, and per-session handoff packets.

## Solution: the `tower` CLI

A repo-local TypeScript CLI. Claude talks to it the way you'd talk to a colleague who has been tracking the project.

**Core promise**: a new Claude session is fully oriented after `tower status && tower resume` — ~300 tokens, constant regardless of roadmap size.

---

## §1 — Philosophy: Three Layers of Truth

Non-overlapping:

- **Git commits, tagged `[Rn/n.n]`** — truth for *events*. Hard to lie with, already exists, permanent record of what shipped.
- **Ledger YAML, one file per phase** — truth for *state*. What's done, what's in-progress, what's blocked, what was decided.
- **Handoff packets, one per session** — truth for *soft context*. Surprises, half-done work, unspoken reasoning, decisions too small to commit.

The roadmap MD is *strategy*, read on demand — never loaded wholesale. `tower brief R2` returns just R2's section.

---

## §2 — CLI Shape

TypeScript, repo-local at `scripts/tower/`. Invocation: `npm run t <cmd>` via package.json alias, or `tower <cmd>` if globally linked.

**Read commands (cheap, read-only):**
```
tower status            phase, last commit, tasks done/total, open blockers, lock state, drift
tower resume            latest handoff packet (truncated to ~200 tokens)
tower brief <phase>     phase brief from roadmap — just that section
tower next              which task to work on now + any blockers on it
tower diff              drift report: ledger vs code vs git log
tower log [--since]     R-tagged commits, chronological
tower phases            all phases with 1-line status each
tower blocked           all open blockers across phases
```

**Write commands (state mutations):**
```
tower done <id>         mark task complete; updates ledger, prints suggested commit tag
tower start <id>        mark task in_progress, acquire phase lock
tower block "..."       record blocker on current task with context
tower unblock <id>      clear blocker
tower lock <phase>      acquire phase lock explicitly
tower unlock <phase>    release lock
tower handoff           generate + commit handoff packet (end-of-session magic)
tower undo              revert last state mutation (last 10 ops cached)
```

**Admin:**
```
tower init              first-time setup: seeds ledger from NEXT-ROADMAP.md
tower verify            sanity check all YAML, detect corruption
tower prune             archive handoff packets older than N months
tower config            show config
```

---

## §3 — Storage Layout

```
/.ledger/                      per-phase state (git-tracked, YAML)
  R0-hardening.yml
  R1-observatory.yml
  R2-war-room.yml
  …
  R10-post-offer.yml

/.handoff/                     session packets (git-tracked, append-only, markdown)
  2026-04-21-1530.md
  2026-04-22-0930.md
  …

/.tower/
  config.yml                   repo-level config
  lock.yml                     active phase locks
  .cache/                      regenerated caches (gitignored)
    status.json                cached status for fast reads
    undo.json                  last 10 reversible ops
    drift.json                 last drift scan result

/docs/NEXT-ROADMAP.md          unchanged — strategy doc

/scripts/tower/                CLI source
  index.ts
  commands/
  lib/
```

---

## §4 — Ledger Schema

One YAML file per phase. Example `.ledger/R2-war-room.yml`:

```yaml
phase: R2
name: The War Room (Floor 7)
status: in_progress          # not_started | in_progress | complete | blocked
intent: Pipeline heat map that reveals stall patterns and momentum
started: 2026-04-18T10:30:00Z
completed: null

lock:
  holder: session-9a2f3e     # null if unlocked
  acquired: 2026-04-21T15:30:00Z
  expires: 2026-04-21T17:30:00Z

acceptance:
  criteria:
    - "War Room scene shows live application pipeline without refresh"
    - "Stale applications visibly decay over time"
    - "CRO character reacts to pipeline health state"
  met: false
  verified_by_commit: null

tasks:
  R2.1:
    title: "Schema: add decay_applied_at to applications"
    status: complete
    started: 2026-04-18T11:00:00Z
    completed: 2026-04-19T14:00:00Z
    commit: a3b5c8d
  R2.2:
    title: "Decay cron: Vercel scheduled function"
    status: complete
    completed: 2026-04-20T09:15:00Z
    commit: 7e4f2a1
  R2.3:
    title: "CRO dialogue: react to stall rate > 40%"
    status: in_progress
    started: 2026-04-21T10:00:00Z
    notes: "Basic trigger wired, threshold tuning pending"
  R2.4:
    title: "Weather tie-in: storm when stall spikes"
    status: not_started

blockers:
  - id: B1
    task: R2.3
    opened: 2026-04-21T11:30:00Z
    text: "Stall threshold ambiguous — 40% or 50%? need user input"
    resolved: null

decisions:
  - date: 2026-04-19
    text: "Chose Vercel scheduled function over Inngest for decay cron"
    why: "Already deployed, no new infra"
  - date: 2026-04-20
    text: "Decay model: linear over 30 days"
    why: "Simpler to reason about than exponential"

history:
  - 2026-04-18T10:30Z: phase_started
  - 2026-04-19T14:00Z: task_completed R2.1
  - 2026-04-20T09:15Z: task_completed R2.2
  - 2026-04-21T10:00Z: task_started R2.3
  - 2026-04-21T11:30Z: blocker_opened B1
```

Tasks are seeded from NEXT-ROADMAP.md briefs at `tower init`. Added later via CLI or direct YAML edit. Both modes supported.

---

## §5 — Session Start Protocol (The Magic)

CLAUDE.md directive: at session start, run `tower status && tower resume` before any other action.

Example combined output (~300 tokens):

```
TOWER STATUS
  Phase:        R2 — The War Room
  Progress:     2/4 tasks complete (50%)
  Last commit:  3h ago — [R2/2.3] wip: CRO stall trigger
  Blockers:     1 open (B1: stall threshold 40% vs 50%)
  Lock:         held by session-9a2f (expires in 42m, auto-extends on activity)
  Drift:        clean

RESUME (session 9a2f · 2026-04-21-1530)
  Shipped:     R2.2 — decay cron live in prod
  In progress: R2.3 — basic trigger wired, tuning threshold
  Next:        resolve B1, ship R2.3, start R2.4
  Surprises:   Vercel scheduled fns don't retry — wrote manual retry in src/lib/decay.ts:45
  Decisions:   decay model is linear 30-day (rejected exponential for simplicity)
  Files hot:   src/app/(authenticated)/war-room/*, src/lib/decay.ts, .ledger/R2-war-room.yml
```

Claude now knows exactly where to resume without reading the roadmap, CLAUDE.md, or any component. It reads only files specific to the in-progress task.

---

## §6 — Session End Protocol (The Other Magic)

Triggered by context threshold (70%), task completion, or user saying "wrap up". Fully auto.

`tower handoff`:
1. `git log --since="$session_start"` → commits made this session
2. Parses `[Rn/n.n]` tags → maps commits to tasks
3. Diffs ledger snapshot (session-start) vs current → which tasks flipped status, which blockers opened
4. **Claude self-prompts** to fill soft fields — *surprises*, *decisions*, *context notes* — piping them to `tower handoff --stdin`
5. Writes `.handoff/YYYY-MM-DD-HHMM.md`
6. `git add .handoff/ .ledger/ && git commit -m "chore(handoff): session 9a2f — R2 progress"`
7. Releases phase lock
8. Prints one-line summary

**Handoff packet template:**

```markdown
---
session_id: 9a2f3e
started: 2026-04-21T15:30:00Z
ended: 2026-04-21T17:45:00Z
phase: R2
context_used_pct: 72
commits: [7e4f2a1, b3c9d8e]
tasks_completed: [R2.2]
tasks_started: [R2.3]
blockers_opened: [B1]
---

## Shipped
- R2.2 decay cron live — commit `7e4f2a1`

## In progress
R2.3 — CRO stall trigger. Basic wiring done, threshold tuning pending on B1.

## Next
1. Resolve B1 (stall threshold decision)
2. Finish R2.3 dialogue integration
3. Start R2.4 (weather tie-in)

## Decisions this session
- Vercel scheduled > Inngest for decay cron (already deployed, no new infra)
- Decay model: linear 30-day (rejected exponential — simpler reasoning)

## Surprises / gotchas
- Vercel scheduled functions don't retry on failure — added manual retry in `src/lib/decay.ts:45`
- `applications.stage` enum already has `decayed` — reused instead of adding

## Files in play
- `src/lib/decay.ts` — new
- `src/app/(authenticated)/war-room/war-room-client.tsx` — modified
- `.ledger/R2-war-room.yml` — updated

## Blockers
- **B1** R2.3 — stall threshold 40% vs 50%, need user input

## Context notes
Trigger logic assumes stall rate computed over trailing 7 days. If window changes, B1 resolution needs revisiting.
```

User sees nothing unless they ask. Claude mentions the handoff commit in its closing message.

---

## §7 — Drift Detection

`tower diff` runs three checks. Results cached to `.tower/.cache/drift.json`. Drift surfaces in `tower status`.

**Check 1 — Ledger claims vs git log**
Ledger says R2.3 complete with commit `abc123`? Verify `[R2/2.3]` tag appears in `git log`. Mismatch = drift.

**Check 2 — Git log vs ledger**
Commit has `[R2.5]` tag but ledger has no R2.5 task? Drift. Offer `tower adopt R2.5 "..."` to reconcile.

**Check 3 — Acceptance heuristics**
For each phase's acceptance criteria, a grep heuristic lives in `.tower/checks/Rn.sh`. Example: R2 says "War Room scene shows live pipeline" — check = `grep -q 'supabase.*channel' src/components/floor-7/WarRoomScene.tsx`. Ledger says R2 complete but check fails → drift.

Default: warn, don't block. `tower diff --strict` (CI) exits non-zero on drift.

```
⚠ Drift detected:
  R1.2 marked complete but no [R1/1.2] tag in git log
  Commit b3c9d8e tagged [R2/2.9] but no R2.9 task in ledger
```

---

## §8 — Parallel Session Locks

`.tower/lock.yml`:
```yaml
locks:
  R2:
    holder: session-9a2f3e
    acquired: 2026-04-21T15:30:00Z
    expires: 2026-04-21T17:30:00Z   # 2h default, auto-extends on write cmds
  R5:
    holder: session-b7c1d8
    acquired: 2026-04-21T16:00:00Z
    expires: 2026-04-21T18:00:00Z
```

- Acquired implicitly by `tower start <id>` or `tower done <id>`
- Auto-extends on any write command from lock holder (rolling window)
- Expires after 2h of inactivity
- Conflict: second session gets clear error with steal option (`--force`, loud)

**Parallel session workflow:** Session A on R2 and Session B on R5 run concurrently. Both commit freely with phase tags. Neither touches the other's ledger. Shared code changes = normal merge conflict resolution. Git is the final arbiter; tower coordinates *intent* before commits.

---

## §9 — Commit-msg Hook

`.husky/commit-msg` (new):
- Parse commit message for `[Rn/n.n]` tag
- If missing and commit touches `src/`: **warn**, don't block
- If present: validate tag exists in ledger; warn if not (offers `tower adopt`)
- Bypassable with `--no-verify` (discouraged)

Tower is permissive — tags that don't match ledger aren't rejected, just flagged.

---

## §10 — Integration with Existing Systems

| System | Fate |
|---|---|
| `SESSION-STATE.json` | **deprecated** — `tower status` supersedes. Migrated at `tower init`, then deleted. |
| `BOOTSTRAP-PROMPT.md` | **kept** — build health, deps, dev context. `tower resume` links to it for deeper orientation. Regenerated by existing Husky hook. |
| `PROJECT-CONTEXT.md` | **kept, reduced role** — human-readable operational log. `tower handoff` appends one terse line per session. |
| `.husky/pre-commit` | **unchanged** — continues auto-organize-docs + BOOTSTRAP regen. |
| `.husky/commit-msg` | **new** — tag validation (see §9). |
| `.husky/post-commit` | **new** — triggers `tower verify` silently; warns on drift. |
| `CLAUDE.md` | **updated** — new §: "At session start run `tower status && tower resume`. At session end (70% context or wrap up) run `tower handoff`." Replaces current §2 (Session End) and §5 (Context Window Management). |

---

## §11 — Bootstrap Sequence

First-time setup: `tower init`
1. Parse NEXT-ROADMAP.md §7 (Briefs) — extract R0–R10, titles, intents, anchors
2. Create `.ledger/Rn-<slug>.yml` files with tasks seeded from brief's "Proof" and "Anchors" sections (empty if not enumerated)
3. Create `.tower/config.yml` with defaults
4. Create `.handoff/`, `.tower/.cache/` (gitignored)
5. Migrate `SESSION-STATE.json` → ledger if exists
6. Install Husky hooks (`commit-msg`, `post-commit`)
7. Update `CLAUDE.md` with session-start/end directives (user confirmation)
8. Print "Next: `tower status`"

---

## §12 — Edge Cases & Recovery

| Scenario | Behavior |
|---|---|
| Session dies (crash, laptop closes) | Lock expires in ≤2h. Next session sees stale lock, offers to claim + recover from last handoff. No data loss — git commits are the safety net. |
| Handoff packet has wrong info | User edits the MD file directly. Git commit preserves the fix. No special tooling needed. |
| Accidental `tower done` | `tower undo` reverts last state mutation. Last 10 ops cached. |
| Ledger YAML corruption | `tower verify` fails loudly with file + line. Recovery: `git checkout .ledger/Rn.yml`. |
| Roadmap phase added/removed manually | `tower verify` detects desync. `tower init --rebase` offers interactive sync. |
| Orphan commit (tagged, not in ledger) | `tower diff` surfaces. `tower adopt <tag> "title"` creates the task retroactively. |
| Manual commit bypassing CLI | Permissive — commit tag is the record. Ledger updates on next `tower verify` from git log. |
| Two Claudes both `tower done R2.3` | Lock contention — second fails with clear error, user resolves. |
| Context at 70% but task not done | `tower handoff` still runs — packet describes in-progress state, next session resumes. |

---

## Appendix A — Approved Assumptions

1. CLI is repo-local TypeScript (`scripts/tower/`), invoked via `npm run t` or global link — not a separate npm package
2. Handoff packets are **git-tracked** (preserves session history across clones)
3. Ledger is source of truth for state; git log is source of truth for events; handoffs are source of truth for soft context
4. Commit-msg hook **warns**, doesn't block — bypassable for quick fixes
5. `SESSION-STATE.json` is **deleted** after migration — tower supersedes it
6. Lock expiry is **2h** (auto-extends on activity) — tunable in config
7. Drift is warned, not blocked locally; **strict mode for CI** blocks
8. Soft fields in handoff (*surprises*, *decisions*) are **Claude-authored** via self-prompt at handoff time

## Appendix B — Out of Scope (v1)

- Remote sync (team/multi-user ledger)
- Cross-repo tower instances
- Metrics dashboard / analytics
- Web UI for ledger editing
- Automated R-tag inference from diff content
- Integration with external issue trackers (Linear, GitHub Issues)

## Appendix C — Success Criteria

- New Claude session fully oriented in < 300 tokens via `tower status && tower resume`
- Zero user intervention per session end — handoff is auto
- Parallel sessions coexist without ledger corruption
- Drift detected within one commit of introduction
- `tower init` seeds ledger cleanly from current NEXT-ROADMAP.md without manual massage
- CLAUDE.md session-start directive is followed by any fresh Claude session

---

*Approved to proceed to implementation plan (superpowers:writing-plans).*
