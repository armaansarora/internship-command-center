# 📐 Operation: Blueprint — the research-and-plan run

> ## ⚰️ SUPERSEDED — 2026-06-09 (same day it was written)
> **This operation was cancelled, not run.** It was designed to research how to build The
> Military as *software* (orchestrator, router, manifest, cockpit). The Fable revision
> (`2026-06-09-fable-revision.md`) concluded that software should not be built at all — the
> system became doctrine over existing tools (`THE-MILITARY-DOCTRINE.md`). The
> judgment-heavy waves (3–5) effectively ran anyway, in one Fable session instead of ~50–60
> agents: forks settled, plan drafted as executable doctrine, cross-model attack performed
> (4 Claude lenses + Codex; kill-log in the revision doc §7). Wave 6's completeness critic
> lives on as Proving Ground's test points. The next operation is
> **`OPERATION-PROVING-GROUND.md`**. Original text kept below for the record.

**Purpose:** turn the locked concept of The Military (`THE-MILITARY-CONCEPT.md`) into a concrete,
researched, **buildable** master plan — `THE-MILITARY-PLAN.md` — resolving the open questions and the
three known holes. This is the next action after the concept lock; it is **not yet run**.

**How to run it:** as a **Workflow** (ultracode is on). Run the judgment-heavy waves (3, 4, 5) on
**Fable 5** while it's free (through **2026-06-22**); the parallel research grunt-work (wave 1) can run
on cheaper tiers. Present a **Go/No-Go** preview to the Commander before launching (it's a big spend,
~50–60 agents).

## Inputs to feed the run
- The concept + canon: `THE-MILITARY-CONCEPT.md`, `THE-MILITARY.md`.
- The idea bank: `2026-06-09-factory-brainstorm.md` (851 ideas; agents can read the slices they need).
- The Tower repo itself = the **golden template** (read its conventions, stack, `CLAUDE.md`).
- The real constraints: $200 Claude Max + $100 Codex Pro; `claude -p` / `codex exec`; git worktrees; graphify.

## The 6 waves
1. 🔭 **Recon — research every subsystem** (~13 parallel researchers, one per division). Each digs into
   *how it's really done* — real tools, commands (`claude -p`, `codex exec`, git worktrees, the Claude
   Agent SDK, graphify), and gotchas — using the web, docs, AND the Tower repo. Fronts:
   plan-tree engine · Orders (contracts-as-failing-tests) · The General (headless worker spawning +
   supervision) · worktree stitch / green-wave · Deployment Officer (3-tier router + failover) ·
   Demolition Squad (verification + the no-oracle problem) · Recon (graphify wiring) · Target Selection
   (intent capture) · Go/No-Go (altitude dial + cost estimation) · Intelligence + the **War Log**
   (Total-Recall plumbing) · the cockpit (rebuilt clarity-first "Forge") · the recursion mechanism
   (squads spawning squads) · the state / source-of-truth model (spec-canonical vs code-as-cache).
2. 🛡️ **Hold the line — the three killers.** Focused deep-dives: *wrong-intent-compiles* ·
   *no-oracle-for-non-code* · *orchestrator-is-a-distributed-system*. Plus determinism + reproducibility.
3. ⚖️ **Settle the forks** (run on Fable). Resolve with a decision + reason each: spec-canonical-vs-code ·
   alive-from-t=0 · always-on-vs-run (pilot-light) · biggest-then-trim · **how far does Fable 5 raise the
   "Codex-ready" bar** (smarter builders → shallower trees → simpler orchestration).
4. 📐 **Draft the master plan** (run on Fable). One blueprint: the architecture · each division's design
   **and the interfaces between them** · the 3-tier model fleet · a phased roadmap
   (**skeleton → gym-app pilot → generality**) · risks/open-questions.
5. 💥 **Cross-model attack** (Codex, prose — not schema). Hand it the finished plan; try to break it
   (hand-waved, underspecified, wrong); a Claude pass folds the survivors' fixes in.
6. 🧹 **Completeness critic.** "What's still missing — a subsystem, an assumption nobody challenged?"

## Output
- **`docs/factory/THE-MILITARY-PLAN.md`** — the document you build from — plus highlights to the Commander.

## Reference: prior Workflow scripts (patterns to adapt/resume)
Under the session's `workflows/scripts/`:
- `factory-brainstorm-wf_*.js` — fan-out by aspect → curate → synthesize → assemble markdown in-script.
- `naming-worlds-wf_*.js` and `title-bank-wf_*.js` — fan-out → judge/rank → assemble.
Pattern: parallel `agent()` calls with JSON schemas → `pipeline`/`parallel` → build the markdown in the
script → `return { markdown }` → caller extracts `result.markdown` from the task output file and writes
it to `docs/factory/`. (Note: the workflow output file wraps the return value under `.result`.)
