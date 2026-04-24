# R10 Attack Plan — Fires the moment user says "R10 done"

**Prepared by partner 2026-04-24 during autopilot session 2 (pre-verified, paste-ready).**
**Target execution: one continuous attack. No questions to user until final deliverable. Army-preparing-for-attack energy.**

This document is read FIRST when user says "R10 done" / "R10 finished" / equivalent. It exists so partner does not draft prompts, re-verify trim candidates, or think mid-attack — all thinking is pre-committed here.

---

## §0 — Attack phases (the whole sweep in one breath)

1. **T+0:00 — Pre-flight** (60s): confirm autopilot paused, confirm commits on origin, confirm working tree clean
2. **T+0:01 — Swarm dispatch** (5 agents in ONE Agent-tool message, parallel)
3. **T+0:05 — Synthesis** (read 5 verdicts, compose honest post-mortem)
4. **T+0:08 — Fix pass** (inline fixes for swarm findings; parallel subagent fan-out if multi-file)
5. **T+0:20 — Trim sweep** (pre-verified deletions + archival moves, one commit)
6. **T+0:25 — Accept gate** (`npm run t verify R10` → `npm run t accept R10` only if clean)
7. **T+0:30 — Partner-brief update + push** (bundled cleanup commit, includes held partner-brief edit)
8. **T+0:32 — Final deliverable** (one message: verdict + decision menu)

Times are ceiling targets; execute faster if possible. Do NOT pause between phases except at 4→5 if the fix pass reveals systemic drift (surface to user then, not earlier).

---

## §1 — Pre-flight checklist (EXECUTE IN ONE BASH BATCH)

```bash
# Paste this entire block as one Bash tool call at T+0:00
grep paused .tower/autopilot.yml && \
git fetch origin main --quiet && \
git log --oneline origin/main...HEAD && \
git status --short && \
npm run t status 2>&1 | tail -10
```

Expected state for attack-go:
- `paused: true` (autopilot ended itself on scope_complete)
- `git log origin/main...HEAD` empty or shows only my held partner-brief + attack-plan edits
- Working tree has only my held files (`.tower/partner-brief.md`, `.tower/r10-attack-plan.md`) + any new uncommitted bits
- `tower status` shows R10 at 15/16 or 16/16, 0 blockers, lock released

If any of those are wrong: STOP, surface to user, don't proceed.

---

## §2 — Swarm dispatch (5 agents, ONE message, parallel)

Copy these prompts verbatim into a single message with 5 Agent tool calls. Not sequential. Not 5 separate messages. ONE message, 5 tool_use blocks.

Git range for all swarm prompts: `ab0e91d..HEAD` (R9-complete → current-head = full R10 span).

### Agent 1 — Explore (thoroughness: medium) — Intent behavior shipping audit

```
For R10 in docs/NEXT-ROADMAP.md (§ starts at "### R10 — The Negotiation Parlor"), extract every Intent-level behavior the brief names. R10 Proof line:

"Offer arriving via email parses into the offers table. Parlor door appears within a short window. Comp chart renders with real benchmarks. Negotiation script generation produces a draft the user can send with minor edits. Side-by-side comparison works with 2+ offers. Deadline alerts fire."

Plus Intent-level behaviors from brief body: door materializes only after first offer (absent-from-DOM pre-trigger), comp band chart with red <25th / gold >75th pins, folders stack for multiple offers, three-chair convening (Offer Evaluator/CFO/CNO), 24h send-hold on negotiation emails, CEO voice reading drafts aloud, CFO quip once-only, negotiation script drafts live in front of user.

For each behavior, return ONE line:
  `{behavior}` | `{shipped|stubbed|deferred}` | `{file_path}:{line}` | `{one-line evidence}`

Scope: anything in git log --oneline ab0e91d..HEAD with [R10/...] prefix. Don't re-read the brief multiple times. Cap: 250 words.
```

### Agent 2 — code-reviewer — scope/security/perf/gate audit

```
Review git diff ab0e91d..HEAD (R10 territory). Flag specifically, with commit SHA evidence:

1. **TTS dependency drift** — grep package.json diff for new cloud TTS deps (elevenlabs, @openai/tts, cartesia, deepgram, playht). R10.11 must ship browser-native window.speechSynthesis ONLY.
2. **Charting library drift** — grep package.json diff for recharts, victory, chart.js, d3, visx, @nivo/*. R10.8 must ship native SVG <=150 LOC ONLY.
3. **Sequential-masquerading-as-fan-out** — grep the /api/offers/*/convene route for Promise.allSettled. If it's `await ae(); await cfo(); await cno();`, that's theater — the three chairs must be parallel.
4. **Send-hold rebuild** — grep for new scheduling tables, new cron handlers, new `send_after`-alike fields. R10.10 must reuse R7's existing `send_after` infrastructure.
5. **Ledger bypass** — grep `.ledger/R10-*.yml` history for direct `acceptance.met: true` flips without a corresponding `tower accept` commit. The post-R9 Husky gate should block this structurally, but verify no bypass attempt was even made.
6. **Stretch-ate-must-ships** — if R10.13 (simulator) and R10.14 (ref-requests) shipped, evidence-check R10.11 and R10.12 were shipped with equal rigor, not rushed.
7. **New migrations outside 0020** — any new `src/db/migrations/*.sql` beyond `0020_r10_*` is scope creep.
8. **Auth/Stripe contamination** — any R10 commit touching src/app/api/stripe/*, src/lib/stripe/*, src/lib/auth/*, src/proxy.ts is a red flag.

Return findings in priority order. Under 300 words.
```

### Agent 3 — Explore (thoroughness: quick) — contamination scan

```
Grep the git log for any R10 commits touching these untouchable zones:

- src/app/api/stripe/**
- src/lib/stripe/**
- src/lib/auth/**
- src/proxy.ts
- src/middleware.ts (should not exist, but verify)
- src/lib/supabase/** (auth infra)

Command: `git log --oneline ab0e91d..HEAD -- <path>` for each path.

Return format:
  {path} → {commit_sha_list_or_"clean"}

If any path shows commits, additionally show the one-line commit messages. Target is ALL clean. Under 150 words.
```

### Agent 4 — Explore (thoroughness: quick) — hygiene regression count

```
In R10-added code (anything in git diff ab0e91d..HEAD for .ts/.tsx files), count and locate:

1. **New TODO/FIXME/XXX/HACK comments** — excluding test fixtures, excluding docs/.
2. **New console.log/console.error/console.warn** — excluding src/lib/logger.ts, src/components/world/ErrorBoundary.tsx, and .test.tsx files.
3. **New `from "gsap"` imports** — all GSAP imports must route through @/lib/gsap-init per CLAUDE.md gotcha #3. List any direct `from "gsap"` or `from "gsap/*"` imports.
4. **New `: any` / `as any` annotations** — project contract is no `any`. List each.
5. **New `// @ts-ignore` / `// @ts-expect-error`** — should be zero or each with a justification comment.

Return each category with count + file:line list. If zero, say "0 — clean." Under 200 words.
```

### Agent 5 — Explore (thoroughness: medium) — proof test rigor vs R10 Proof line

```
R10's Proof line (from docs/NEXT-ROADMAP.md R10 brief):
"Offer arriving via email parses into the offers table. Parlor door appears within a short window. Comp chart renders with real benchmarks. Negotiation script generation produces a draft the user can send with minor edits. Side-by-side comparison works with 2+ offers. Deadline alerts fire."

Find R10's proof test files. Candidates:
- src/**/proof.test.ts
- src/**/*r10*.test.ts
- src/**/parlor*.test.ts
- src/**/offers*.test.ts

For each test file, extract the assertions. Compare each against the Proof line invariants:

1. **Email→offers parsing** — test must parse a realistic email fixture and verify offers table row inserted with parsed fields. NOT just "parser function returns non-null."
2. **Door-appears invariant** — test must verify door is absent from DOM (not hidden) when offerCount=0, and present when offerCount>=1. NOT just "component renders."
3. **Comp chart rendering** — test must verify pin colors (red <25th, gold >75th) AND pin positioning against band data. NOT just "chart mounts."
4. **Negotiation script draft** — test must verify draft content has meaningful length AND contains offer-specific values (company name, base, asking), not "draft.length > 0."
5. **2+ offer comparison** — test must use a fixture with 2 offer rows AND verify both pins/folders rendered. NOT 1-offer fixture with mocked second.
6. **Deadline alerts** — test must advance clock past deadline AND verify alert fires. NOT just "alert function defined."

Return for each invariant:  `{invariant}` | `{strong|weak|missing}` | `{test_file}:{line}` | `{what's weak, if weak}`

Under 300 words. R9 Proof-rigor caveat is in partner-brief — remember that jsdom can't assert frame timing; if a proof needs browser-level measurement, flag as "defer to post-R10 E2E harness" not "weak."
```

---

## §3 — Synthesis protocol (read 5 verdicts, compose)

Read all 5 agent returns. Compose in this exact shape (partner-brief §Post-mortem format):

```
# R10 Post-Mortem

**Verdict:** {clean | clean with N caveats | drift detected | broken}

**What shipped for real:**
- {bullet, with file:line evidence from Agent 1}
- ...

**What I'm flagging:**
- {bullet, with commit SHA from Agent 2/3/4}
- ...

**Caveats not blocking:**
- {bullet, hygiene stuff from Agent 4, weak-but-not-missing proofs from Agent 5}

**Follow-up tab updates:**
- {what got added/resolved in partner-brief}
```

Do not cheerlead. Lead with worst news. If verdict is "broken" or "drift detected," the fix pass (§4) is mandatory before accept. If "clean with caveats," caveats get documented in partner-brief's Running tab and we proceed.

---

## §4 — Fix pass (inline or subagent fan-out)

Priority matrix for swarm findings:

| Finding class | Action |
|---|---|
| TTS/charting dep drift | **BLOCK** — fix immediately: remove dep, rewrite with correct impl, re-run test. Not negotiable. |
| Sequential fan-out in convene | **BLOCK** — rewrite handler with Promise.allSettled. R3 pattern. Add test. |
| Send-hold rebuild | **BLOCK** — delete new scheduling code, wire to R7's `send_after`. |
| Auth/Stripe contamination | **BLOCK** — revert touches, surface to user as escalation. |
| Ledger hand-edit bypass | **BLOCK** — revert, run `tower accept R10` properly. |
| Missing Intent behavior (stubbed) | **BLOCK** — ship real implementation OR open blocker via `tower block R10.{sub-id}` and mark phase incomplete. |
| Weak proof test | **FIX** — tighten assertion. Add fixture if needed. No phase accept without real invariant tests. |
| New TODOs | **FIX** — resolve or convert to ledger blockers. |
| New console.logs | **FIX** — route through logger. |
| Direct gsap imports | **FIX** — route through @/lib/gsap-init. |
| New `any` annotations | **FIX** — type properly. |
| Stretch shipped, must-ships rushed | **FLAG** — surface to user; may need R10.x follow-up phase. |

Parallel subagent fan-out if: 3+ independent fixes across non-overlapping files. Use `superpowers:subagent-driven-development` for this.

If fix pass can't land cleanly in ~15 min, pivot to: accept R10 without acceptance.met=true, open blockers, surface to user with "R10 has N structural issues blocking accept, here's the plan to address" — don't force-accept.

---

## §5 — Trim sweep (pre-verified as of 2026-04-24)

**VERIFIED DEAD — safe to delete/archive:**

| File | Verification | Action |
|---|---|---|
| `src/components/world/FloorStub.tsx` | Zero imports (`grep -rn "from.*FloorStub"` = 0) | `git rm` |
| `src/lib/db/queries/daily-snapshots-rest.ts` | Zero imports (only schema.ts:581 comment reference) | `git rm` |
| `docs/R1-AUDIT.md` | Referenced only by PROJECT-CONTEXT.md + old handoff + partner-brief | `git mv → docs/archive/` |
| `docs/AUDIT-DEPLOY-CHECKLIST.md` | Same profile | `git mv → docs/archive/` |
| `docs/POST-HARDENING-MANUAL-STEPS.md` | Same profile | `git mv → docs/archive/` |
| `docs/SECRETS-ROTATION.md` | Only R0 plan + PROJECT-CONTEXT | `git mv → docs/archive/` |
| `docs/SECURITY-HEADERS-REPORT.md` | Same profile | `git mv → docs/archive/` |
| `docs/WAR-ROOM-BLUEPRINT.md` | NEXT-ROADMAP.md:894 mention only as historical Phase 1 reference | `git mv → docs/archive/` + update NEXT-ROADMAP.md ref to `docs/archive/WAR-ROOM-BLUEPRINT.md` |
| `.tower/pre-r9-checklist.md` | R9 shipped — historical | `git mv → .tower/archive/` (create dir) |
| `.handoff/2026-04-22-*.md` through `.handoff/2026-04-23-17*.md` | Keep last 5 by date; move older to archive | `mkdir .handoff/archive && git mv` |
| `docs/plans/2026-04-21-*.md` through `docs/plans/2026-04-23-r8-*.md` | Completed-phase plans; keep newest per phase in-tree | Move older drafts to `docs/archive/plans/` |

**NEEDS USER CALL — do NOT auto-trim:**

- `HANDOFF.md` (root, 10.8K) — written by `scripts/session-end.ts:858`. session-end.ts is superseded by `tower handoff` per CLAUDE.md §3 but not deleted. Options: (a) leave both coexisting, (b) delete HANDOFF.md and remove the write in session-end.ts, (c) deprecate session-end.ts entirely. **Surface as decision in §8.**
- `docs/r8/consent-copy.md` — referenced by `scripts/r8-acceptance-check.ts` and R8 ledger history. Keep as R8 compliance record.
- 3 orphans listed in CLAUDE.md "Known Orphaned Files" — already verified: FloorStub + daily-snapshots-rest are dead (above); MilestoneToast is actually WIRED (used by world-shell.tsx and MilestoneToastContainer.tsx). CLAUDE.md note is stale for MilestoneToast. Fix: update CLAUDE.md to remove MilestoneToast from orphan list.

**Execution as one bash batch (after §4 fix pass lands):**

```bash
# Delete confirmed-orphan src/ files
git rm src/components/world/FloorStub.tsx
git rm src/lib/db/queries/daily-snapshots-rest.ts

# Create archive dirs
mkdir -p docs/archive docs/archive/plans .tower/archive .handoff/archive

# Move R0/R1/R8-era docs to archive
git mv docs/R1-AUDIT.md docs/archive/
git mv docs/AUDIT-DEPLOY-CHECKLIST.md docs/archive/
git mv docs/POST-HARDENING-MANUAL-STEPS.md docs/archive/
git mv docs/SECRETS-ROTATION.md docs/archive/
git mv docs/SECURITY-HEADERS-REPORT.md docs/archive/
git mv docs/WAR-ROOM-BLUEPRINT.md docs/archive/

# Move R9 partner checklist
git mv .tower/pre-r9-checklist.md .tower/archive/

# Rotate .handoff/ — keep 5 most recent, archive rest
# (hand-select inside the attack, based on date sort; script here is illustrative)
for f in $(ls -t .handoff/*.md | tail -n +6); do git mv "$f" .handoff/archive/; done

# Rotate docs/plans/ — keep newest per phase
# Pattern per phase: keep newest *-design.md + newest *-plan.md for R5..R10, archive R0-R4
# (Hand-select list inside the attack — see phase_keep.txt below)
```

**Plans to keep in `docs/plans/` (most recent per still-referenced phase):**
- `2026-04-23-r9-observatory-design.md` + `2026-04-23-r9-observatory.md` (R9 just shipped)
- `2026-04-23-r10-negotiation-parlor-design.md` + `2026-04-23-r10-negotiation-parlor.md` (R10 just shipped)
- Newest `*-design.md` for R5.4, R6, R7, R8 (subphases may still reference)

Everything else in `docs/plans/` for R0–R4 moves to `docs/archive/plans/`.

**Update CLAUDE.md "Known Orphaned Files":**
- Remove `FloorStub.tsx` entry (deleted)
- Remove `daily-snapshots-rest.ts` entry (deleted)
- Remove `MilestoneToast.tsx` entry (not actually orphan — wired via world-shell.tsx)
- Result: §Known Orphaned Files is empty → delete the whole section

---

## §6 — Accept-phase protocol

```bash
npm run t verify R10
```

- All ✓: proceed to `npm run t accept R10`. This structurally refuses if any gate fails, so it's the correctness check.
- Any ✗: DO NOT run `tower accept --force`. Either fix what's failing (re-run §4) OR open blockers via `tower block R10.x "reason"` and leave `acceptance.met: false`. Force-accept is the R9-era partner bypass — banned.

After `tower accept R10` runs clean:
- `acceptance.met: true` flips via the mechanical Husky gate (not by hand).
- `.tower/autopilot.yml` auto-advances — probably `scope_complete` since R10 is the last scoped phase, or bumps to R10.x / R11 per roadmap.

If `tower accept R10` succeeds: R10 is closed.

---

## §7 — Partner-brief update + bundled commit

Held edits in working tree:
1. `.tower/partner-brief.md` — the paused-state rule + post-R10 cleanup sweep list (added 2026-04-24 during autopilot session 2)
2. `.tower/r10-attack-plan.md` — this file (archive to `.tower/archive/r10-attack-plan.md` once attack is done)

After trim sweep commit + accept commit(s), bundle the partner-brief cleanup + attack-plan archival into ONE commit:

```bash
git mv .tower/r10-attack-plan.md .tower/archive/r10-attack-plan.md
git add .tower/partner-brief.md .tower/archive/
git commit -m "chore(partner): post-R10 cleanup sweep + attack-plan archive"
git push origin main
```

Partner-brief updates inside the same pass:
- R10 row in §Current state of the build table — mark `complete`, note test count, flag any caveats from post-mortem
- §Running tab of follow-ups — move "Post-R10 cleanup sweep" from "queued" to "RESOLVED"
- §Needs user hand — remove migration 0020 entry if user applied it; keep FIRECRAWL_API_KEY entry if still missing
- §Partner decisions locked — append any R10-sized decisions that got made during the sweep

---

## §8 — Final deliverable (one message to user)

After everything commits + pushes, respond with ONE message following this shape:

```
# R10: {verdict}

**What shipped**: {one-sentence summary — e.g., "16/16 tasks, N new tests, Parlor ships the full Intent surface minus {stretch-item-X if dropped}"}

**Post-mortem**: {clean | N caveats logged | issues fixed inline}

**Sweep**: {N files deleted, N archived, CLAUDE.md tightened, partner-brief updated}

**Acceptance**: {tower accept R10 passed | blockers opened: X}

**Decisions for you** (pick one letter, I execute):

A. **R8.x mini-phase** — cross-user matching, queued per partner decision 2026-04-23. 30-50 min autopilot. Match-candidates endpoint currently 403-hard-stopped; ships the real matching behind it.

B. **Post-R10 hardening phase** — HARSH simulation E2E: hacking attempts, abuse/spam, parallel-agent user simulation. Partner decision #3. Longer phase (~60-90 min).

C. **HANDOFF.md cleanup decision** — root HANDOFF.md is written by deprecated session-end.ts; do we (i) leave both, (ii) delete HANDOFF.md + remove the write, (iii) deprecate session-end.ts entirely. 5-10 min partner work.

**Default recommendation**: {pick cheapest if verdict clean; if drift surfaced, recommend fix-first before moving on}.
```

No other prose. No "let me know what you think." No hedging. User picks A/B/C, I execute.

---

## §9 — Abort / escalate conditions

STOP the attack and surface to user IF:

1. Swarm returns finding that `src/proxy.ts` or `src/lib/auth/*` or `src/lib/stripe/*` was modified in R10 — security-critical, escalate immediately.
2. Swarm returns finding that a schema migration outside `0020_r10_*.sql` exists — scope creep at schema level, escalate.
3. Fix pass exceeds ~15 min without converging — don't force-land; open blockers and surface.
4. `tower accept R10` fails with a gate that looks structurally broken (not just "test fails") — surface.
5. Working tree has unexpected files (not `.tower/partner-brief.md` / `.tower/r10-attack-plan.md` / expected autopilot output) — investigate, don't sweep blindly.

Escalation format: one message, lead with worst news, concrete options for user to unblock.

---

## §10 — Read this at attack-time

When user says "R10 done," the partner's first tool call is:
```
Read /Users/armaanarora/Documents/The Tower/.tower/r10-attack-plan.md
```

Then execute §1 through §8. If state doesn't match §1 expectations, pivot to §9. Total user involvement post-trigger: pick A/B/C at §8.

Army preparing for attack = this file. Attack = one continuous sweep, minimal user surface.
