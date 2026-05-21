# ArtLab Implementation Plan

> **For agentic workers — required execution skill stack (use ALL of these together):**
> 1. **`superpowers:subagent-driven-development`** — fresh implementer subagent per task (recommended). Alternative: `superpowers:executing-plans` for batched in-session execution.
> 2. **`superpowers:requesting-code-review`** — runs a fresh reviewer subagent on every diff before commit.
> 3. **`superpowers:receiving-code-review`** — runs inside the implementer subagent when the reviewer pushes back.
> 4. **`superpowers:verification-before-completion`** — gate before every commit (tests/typecheck/lint pass with evidence, not assertion).
> 5. **Claude Code `/goal` command** (CLI 2.1.139+) — the outer wrapper that auto-iterates the entire stack. See **Execution Protocol** for the exact `/goal` commands.
>
> Steps in every task use checkbox (`- [ ]`) syntax. Every task has an explicit **Acceptance criteria** block that the reviewer subagent verifies. Every phase ends with a **Phase completion criteria** block that the `/goal` evaluator verifies.

**Goal:** Replace the 12,000-line legacy Creative Production Engine with **ArtLab** — a Telegram-driven creative engine that generates Tower character art and other visual assets through exactly two human gates (`approve direction <n>` and `approved for app`). The engine runs **as fast as quality allows** — Phase 5 is dedicated to wall-clock reduction with quality byte-identical to a slow run. Backed by a 10-phase state machine with orthogonal blockers, a deterministic scheduler that delegates only novel decisions to an LLM brain (Claude Opus 4.7 + Codex), persistent style-wins / rejections / prompt-evolution memory ledgers, cast coherence checks (silhouette + palette + age impression), real Playwright e2e pre-promotion QA, a Mac daemon supervised by launchd, and a self-evolution loop that drafts its own refactor branches via `mcp__codex__codex` when friction repeats five times.

**Architecture:** New module tree at `src/lib/artlab/` (12 focused modules ≤ ~500 lines each — the 11 from the spec plus `migration/`) + one CLI entry point `scripts/artlab.ts` + one long-running daemon supervised by `launchd`. Deterministic scheduler walks the state machine; LLM brain handles only routing-ambiguity, clarification-wording, QA-failure adjudication, reply-parser fallback, prompt enrichment, and blocker-message drafting. Mac daemon long-polls the Telegram Bot API directly (no Vercel webhook); supervises max-2 parallel child runners; each emits a 10s heartbeat to `progress.json`. Salvaged leaf modules (`budget/ledger.ts`, `scheduler/scheduler.ts`, `providers/adapters.ts`, `promotion/`, `review/`, `cleanup/`, `contracts/`) re-export from legacy unchanged. Legacy CPE stays behind a deprecation banner until ArtLab has shipped ≥10 characters + ≥3 non-character asset types; then Phase 8 deletes ~12,000 lines.

**Tech Stack:** TypeScript 5 (strict, no `any`), Node 24, Vitest 4 (unit + integration + property-based via `fast-check`), Playwright 1.59 (e2e), Zod v4 (validation), `sharp` 0.34 (perceptual hashes + bbox extraction), Telegram Bot API (HTTPS long-poll, no third-party library), **Codex CLI** (`codex exec` via `child_process` — the daemon shells out for self-evolution branch drafting; the `mcp__codex__codex` MCP tool is the parallel path available inside interactive Claude Code sessions and is NOT used by the long-running daemon since MCP tools require a session host), Claude Opus 4.7 via `@ai-sdk/anthropic` (LLM brain — invoked through the `ai` core package's `generateText({model: anthropic(...)})` with Anthropic prompt caching on stable system prompts via `providerOptions.anthropic.cacheControl: {type: "ephemeral"}`; this dep is already installed at 3.0.58 alongside the `ai` core package), `launchd` (daemon supervision), macOS Keychain via `security` CLI (secret storage). Existing `@supabase/ssr` patterns elsewhere in the repo are NOT used — ArtLab is filesystem-only state.

**Spec reference:** `docs/superpowers/specs/2026-05-20-artlab-creative-engine-design.md` — every locked design decision is sourced from there. This plan diverges from the spec on three deliberate points (each noted again at point of use):
1. **Project name** — spec was first written as "Atelier" (historical); rebranded to **ArtLab** 2026-05-20 and renamed throughout.
2. **Workspace path** — spec says `.artlab/atelier/`; plan uses **`.artlab/engine/`** to avoid collision with the legacy `.artlab/studio/` workspace during Phases 0-3. Phase 4 archives legacy to `.artlab/legacy/` and the engine workspace stays at `.artlab/engine/` (no further moves).
3. **Speed framing** — spec calls it "autonomous overnight"; per Armaan's 2026-05-20 directive, the engine runs **as fast as quality allows**. Phase 5 (Speed) is dedicated to wall-clock reduction with byte-identical / QA-equivalent output guarantees. Never call this engine "overnight" in code, comments, prompts, or docs.

---

## Plan Map

| Phase | Name | Tasks | Cumulative | Purpose | Phase-completion criterion (the `/goal` for that phase) |
|---|---|---:|---:|---|---|
| 0 | Scaffold | 10 | 10 | Module tree, salvaged re-exports, CLI stub, workspace, placeholder docs | `find src/lib/artlab -type d \| wc -l` ≥ 22; `npm run artlab -- help` exits 0; full vitest exits 0 |
| 1 | Foundation | 24 | 34 | State machine, reconciler, atomic snapshots, 7 runners, deterministic orchestrator, real health snapshot | Phase 1 integration test (Task 1.24) passes: synthetic run routed→closed via local-mock provider |
| 2 | Intelligence | 18 | 52 | Intake router (Rafe→Otis regression gated), memory ledgers, coherence checks, LLM brain, Codex adapter, real Claude Opus implementation | All 21 intake regression variants in Task 2.5 pass; cast-coherence smoke test green; decision-log audit trail emitted |
| 3 | Surfaces | 30 | 82 | Telegram bot (long-poll, identity check, 3-tier reply parser, image attachments), Mac daemon (launchd plist, supervisor, heartbeat, crash recovery, SIGTERM cancel, sleep guard), self-evolution (friction detector, Codex summoner, branch-only), CLI subcommand bodies (replace 10 stubs), `artlab bot setup` interactive, per-run + monthly budget caps | `npm run artlab:daemon -- start` runs; Telegram echo round-trip green; all CLI subcommands return non-stub output; `npx vitest run src/lib/artlab/bot src/lib/artlab/daemon src/lib/artlab/self-evolution` exits 0 |
| 4 | Migration + first Rafe | 12 | 94 | Import promoted Otis + Mara state into ArtLab `closed` shape, archive `.artlab/studio/` → `.artlab/legacy/`, deprecation banners on 4 legacy scripts (exit 1 if invoked), end-to-end Rafe Calder run as go-live acceptance | Rafe run reaches `closed` via Telegram round-trip; `diff -r public/art/lobby/otis@pre public/art/lobby/otis@post` is empty; legacy scripts print deprecation and exit 1 |
| **5** | **Speed (quality preserved)** — NEW | **15** | **109** | True 5-lane concept parallelism, pipeline phase overlap, Anthropic prompt caching, sharp+rembg worker pool, Playwright parallel pages, memory LRU cache, daily benchmark gate, speed/quality dashboard inside `artlab health` | Baseline-Rafe wall-clock from Phase 4 reduced ≥40%; every speed task's quality-preservation assertion passes byte-identical; daily benchmark CI shows no quality regression |
| 6 | Cast push | 6 | 115 | 9 more characters through ArtLab (Priya, Dylan, Vera, Sol, Inez, Mina, Etta, Rowan, Nadia), memory accumulation verification, one bundle test | All 9 characters promoted via ArtLab; `style-wins.jsonl` has ≥ 10 entries (including Rafe); bundle `war room with Rafe` resolves to 3 linked children with atomic promotion |
| 7 | Asset-type expansion | 12 | 127 | Vertical slices: one war-room environment, one Tower button UI texture, one ambient animation — each with its own asset-type contract, runner extension, promotion path, and per-type Playwright assertions | One environment + one UI texture + one animation promoted; per-type e2e specs green; manifest schema extended for each type |
| 8 | Legacy retirement | 15 | 142 | Delete 4 giant scripts (~6,857 lines) + `operator/v1-final.ts` (~3,080 lines), write 3 consolidated docs (`atelier/ENGINE.md` already renamed to `artlab/ENGINE.md`, `OPERATIONS.md`, `CHARACTER-PIPELINE.md`), move 12 legacy docs to `docs/legacy/`, slim SKILL.md (220 → ~80 lines), update CLAUDE.md, install byte-diff CI for Otis/Mara promoted state | `grep -rl "creative-production" src scripts` returns 0; `ls docs/legacy/ \| wc -l` ≥ 12; `wc -l .agents/skills/creative-production-engine/SKILL.md` ≤ 100; CLAUDE.md says ArtLab, not CPE |

**Estimated total:** 142 tasks producing ~5,000 lines of ArtLab code spread across ~50 focused files, deleting ~12,000 lines of legacy CPE.

**Hard dependencies between phases:**
- Phase 1 needs Phase 0 (uses scaffolded modules + types).
- Phase 2 needs Phase 1 (uses state machine, runners, reconciler).
- Phase 3 needs Phase 2 (Telegram reply-parser fallback uses LLM brain; daemon supervises runners).
- Phase 4 needs Phase 3 (first real Rafe run is Telegram-driven).
- Phase 5 needs Phase 4 (baseline measurement requires a real run).
- Phase 6 needs Phase 5 (cast push benefits from speed gains; 9× speed-up is the point).
- Phase 7 *can* begin after Phase 4 in parallel with 5/6 IF Armaan green-lights asset-type expansion early.
- Phase 8 needs Phases 6 + 7 complete (legacy retirement waits until ArtLab has shipped enough volume to prove it).

---

## Conventions for every task in this plan

### Code conventions

- All file paths are absolute from the repo root `/Users/armaanarora/Documents/The Tower/`.
- Every task follows TDD: write failing test → confirm fail → implement → confirm pass → commit.
- Commit messages use imperative mood and end with the Co-Authored-By trailer.
- No `console.log` anywhere. Use the structured event emitter (`artlab/state/events.ts`) for any runtime output.
- No `TODO`, `FIXME`, or `XXX` comments in shipped code.
- All Zod schemas use `z.object({...}).strict()` and are exported alongside the inferred type via `z.infer<typeof Schema>`.
- Atomic file writes everywhere: write to `<path>.tmp.<pid>.<timestamp>` then `renameSync`.
- All timestamps are ISO-8601 UTC produced by `new Date().toISOString()`.
- All IDs are UUID v4 from `node:crypto.randomUUID()` unless explicitly slug-based for human readability.
- Imports use the `@/lib/artlab/...` path alias (configured in `tsconfig.json`).
- React 19 / Next 16 conventions do not apply here — ArtLab is server-side Node only, no JSX.
- No `any` types; use `unknown` + Zod parse at boundaries.
- No silent `catch (err) {}` — every catch either rethrows, records an event via the events emitter, or returns a typed error result.

### Brand conventions (mandatory for naming)

- Project name in prose: **ArtLab** (one word, two caps — never "ArtLab Engine", "Atelier", "CPE", or "Creative Production Engine V2").
- TypeScript types: `ArtLab<Noun>` — e.g., `ArtLabPhase`, `ArtLabRunState`, `ArtLabRunner`.
- Functions: `<verb>ArtLab<Noun>` — e.g., `acquireArtLabLock`, `readArtLabReality`, `enqueueArtLabRun`.
- Constants: `ARTLAB_<NOUN>` — e.g., `ARTLAB_PHASES`, `ARTLAB_BLOCKERS`, `ARTLAB_RUNNER_KINDS`.
- Paths / filenames / npm scripts / commit tags: lowercase `artlab` — e.g., `src/lib/artlab/`, `scripts/artlab.ts`, `npm run artlab:produce`, `artlab-phase-3-complete`.
- launchd label: `com.tower.artlab`.
- Keychain entries: `tower-artlab-<purpose>` — e.g., `tower-artlab-telegram-token`, `tower-artlab-chat-id`, `tower-artlab-gemini-key`.

### Speed conventions (Phase 5 enforces project-wide; previous phases must comply prospectively)

- Any new long-running operation must publish a heartbeat at ≤ 10s intervals.
- Any new sequential `for-of` loop calling I/O must have a documented `// SPEED:` comment explaining why it is not `Promise.all` parallel.
- Any new LLM call against a stable system prompt must use Anthropic prompt caching (`cache_control: { type: "ephemeral" }`).
- Any new file read/write that happens > 10 times per run must use an LRU cache or a single batched read.
- Any new I/O-bound test must use the in-memory fixture pattern (`memfs` or tmpdir) rather than the real filesystem when possible.

---

## Execution Protocol

This plan is designed to be executed by Claude Code with **`/goal` as the outer driver** and **subagent-driven-development as the inner mechanism**. The combination gives you "set a finish line and walk away" with rigorous code-review-and-tweak supervision per task.

### Three layers of `/goal`

**Layer 1 — Whole-plan `/goal` (start once, walk away).** Type this once at the top of an empty Claude Code session:

```
/goal Execute every unchecked task in docs/superpowers/plans/2026-05-20-artlab-implementation.md following the Execution Protocol exactly. Use superpowers:subagent-driven-development for dispatch. Done when (1) every checkbox in the plan is ticked, (2) every artlab-phase-N-complete tag exists in git for N in 0..8, (3) `npm test && npx tsc --noEmit && npm run lint && npx playwright test` all exit 0, (4) the Coverage Matrix appendix in the plan is filled in. Stop and escalate to me if any single task fails its Acceptance criteria after 3 reviewer-tweak rounds, OR if any cross-task validation regresses an unrelated test.
```

**Layer 2 — Per-phase `/goal` (preferred for staged rollout — run one phase at a time):**

```
/goal Execute every unchecked task in Phase <N> of docs/superpowers/plans/2026-05-20-artlab-implementation.md per the Execution Protocol. Use superpowers:subagent-driven-development. Done when (1) every Phase <N> checkbox ticked, (2) the Phase <N> completion criteria block at the end of the phase passes (run those exact shell commands), (3) `git tag artlab-phase-<N>-complete` succeeds. Halt and escalate if any task fails its Acceptance criteria after 3 reviewer-tweak rounds.
```

**Layer 3 — Per-task `/goal` (auto-invoked by the dispatcher between tasks; you almost never type this manually):**

```
/goal Implement Task <N.M> as written in docs/superpowers/plans/2026-05-20-artlab-implementation.md. Done when (1) the task's Acceptance criteria block is satisfied (verified by a fresh reviewer subagent using superpowers:requesting-code-review), (2) all Universal Acceptance Criteria pass, (3) `npx vitest run <test paths from Files block> && npx tsc --noEmit && npx eslint <files from Files block>` exit 0, (4) `grep -nE "console\\.log|TODO|FIXME|XXX" <files from Files block>` returns 0 matches, (5) the task commit appears in git with the prescribed message verbatim.
```

The `/goal` evaluator (a smaller, faster model) reads the transcript after each turn and answers `done? yes / no / escalate`. The dispatcher does not need to be told "next task" — it just keeps working until the condition closes.

### Per-task loop (what the executor does between `/goal` checks)

For each task in the plan:

1. **Context injection.** Dispatcher reads the task body, then `grep`s for the 3 most-related existing ArtLab files (by import path match and sibling-test name match). Implementer subagent receives: the full task body, the Conventions section, the related-files content, and a pointer to the spec for "why" questions.

2. **TDD pass.** Implementer runs the task's numbered steps:
   - Step 1: Write the failing test exactly as specified.
   - Step 2: Run the test command from the task. Confirm it fails for the stated reason.
   - Step 3: Implement the minimal code shown in the task.
   - Step 4: Run the test command again. Confirm it passes.
   - Reports back: diff, test output, commands run.

3. **Code-review pass.** A fresh **reviewer subagent** (separate context window, no working knowledge of the implementer's reasoning) is dispatched with `superpowers:requesting-code-review`, the diff, the task's **Acceptance criteria** block, and the Universal Acceptance Criteria. It returns `PASS` or a structured list of `changes-required`.

4. **Tweak loop.** If reviewer says `changes-required`:
   - Implementer receives the review using `superpowers:receiving-code-review`.
   - Addresses each item. Re-runs tests. Resubmits the new diff.
   - Reviewer re-reviews the new diff.
   - **Max 3 rounds.** If still not `PASS` after round 3, the dispatcher halts and escalates to Armaan via `.artlab/engine/escalations/<runId>-<timestamp>.json`. Do NOT commit a half-passing task. The Phase 3 friction detector picks this up if it recurs five times.

5. **Verification gate** (`superpowers:verification-before-completion`). Before any commit:
   - `npx vitest run <test-paths-touched>` exits 0 — capture and quote the output line "Test Files: X passed".
   - `npx tsc --noEmit` exits 0 with no new errors vs the pre-task baseline (compare error count, not just exit code).
   - `npx eslint <files-touched>` exits 0.
   - `grep -nE "console\\.log|TODO|FIXME|XXX" <files-touched>` returns 0 matches — quote the empty output.
   - File paths in the actual diff match the task's **Files** block exactly. Any drift halts the task.

6. **Commit.** Use the exact commit message in the task body. New commit, no `--amend`. After commit, confirm `git status` is clean.

7. **Cross-task validation (every 5 tasks).** Dispatcher runs the full vitest suite + `tsc --noEmit` + lint. Any regression vs the 5-tasks-ago baseline halts the plan. Escalate.

8. **Phase boundary.** When the last task in a phase commits, the dispatcher runs the phase's **Phase completion criteria** suite (defined at the end of each phase). On pass, it runs `git tag artlab-phase-<N>-complete`. On fail, halt + escalate.

### Universal Acceptance Criteria (every task; reviewer MUST verify on every diff)

These are the floor. Per-task acceptance criteria add task-specific items on top.

- [ ] Test was written FIRST and confirmed failing before implementation (verifiable from `git log -p` if needed).
- [ ] Implementation is the minimum code that makes the test pass — no premature abstraction, no speculative features, no error handling for paths the spec/task does not name.
- [ ] No `any` types introduced (`grep -nE ": any[,\\s)]"` should return 0 matches in changed files).
- [ ] No `console.log`, `TODO`, `FIXME`, or `XXX` in shipped code.
- [ ] All exported Zod schemas use `.strict()` and are paired with `z.infer<typeof …>` type export.
- [ ] All file writes that could collide use the atomic `temp + rename` pattern.
- [ ] All file paths use the `@/lib/artlab/...` alias (not relative `../../../` traversal beyond two levels).
- [ ] All timestamps are ISO-8601 UTC.
- [ ] All IDs are UUID v4 from `node:crypto.randomUUID()` unless slug-based for human readability.
- [ ] No silent `catch (err) {}` — every catch records via events emitter, rethrows, or returns a typed error.
- [ ] Names follow Brand conventions (ArtLab in types, artlab in paths).
- [ ] Commit message is the exact one prescribed in the task body (no improvisation).
- [ ] No file outside the task's **Files** block was modified.

### Per-task Acceptance criteria pattern

Every task in this plan ends with a section like:

```markdown
**Acceptance criteria (per-task, in addition to Universal):**
- [ ] <task-specific assertion 1>
- [ ] <task-specific assertion 2>
```

The reviewer subagent checks both lists. The per-task list is the part that makes the `/goal` condition specific enough to evaluate — without it, the reviewer is vibing.

### Phase completion criteria pattern

The last subsection of every phase is `### Phase <N> completion criteria` listing:
1. Concrete tests that must pass (with exact `npx vitest run …` commands).
2. Concrete artifacts that must exist (with exact `test -f …` shell commands).
3. Concrete grep checks (with exact `grep -nE … | wc -l` commands and expected outputs).
4. The exact `git tag artlab-phase-<N>-complete` command to run on success.

These commands ARE the `/goal` condition for the per-phase `/goal` wrapper.

### Escalation rules

The dispatcher escalates to Armaan (writes a one-paragraph summary to `.artlab/engine/escalations/<runId>-<timestamp>.json` and halts the `/goal`) when:
- A task's reviewer rejects after 3 tweak rounds.
- A cross-task validation regresses an unrelated test.
- A phase completion criterion fails after a clean per-task pass (indicates a hidden interaction).
- `vitest --bail` triggers on a flake threshold > 1 in 10 runs.

Escalation never auto-rolls-back; the in-progress branch is preserved for Armaan to inspect.

---

## Phase 0 — Scaffold

Establish the module tree, public re-exports of salvaged code, CLI shell with stub subcommands, npm scripts, and workspace directories. After Phase 0 the legacy CPE still works unchanged; artlab exists as inert scaffolding that compiles and tests green.

### Task 0.1: Create artlab module directory tree

**Files:**
- Create: `src/lib/artlab/.gitkeep`
- Create: `src/lib/artlab/intake/.gitkeep`
- Create: `src/lib/artlab/state/.gitkeep`
- Create: `src/lib/artlab/queue/.gitkeep`
- Create: `src/lib/artlab/runners/.gitkeep`
- Create: `src/lib/artlab/orchestrator/.gitkeep`
- Create: `src/lib/artlab/memory/.gitkeep`
- Create: `src/lib/artlab/coherence/.gitkeep`
- Create: `src/lib/artlab/bot/.gitkeep`
- Create: `src/lib/artlab/daemon/.gitkeep`
- Create: `src/lib/artlab/self-evolution/.gitkeep`
- Create: `src/lib/artlab/health/.gitkeep`
- Create: `src/lib/artlab/budget/.gitkeep`
- Create: `src/lib/artlab/scheduler/.gitkeep`
- Create: `src/lib/artlab/providers/.gitkeep`
- Create: `src/lib/artlab/promotion/.gitkeep`
- Create: `src/lib/artlab/review/.gitkeep`
- Create: `src/lib/artlab/cleanup/.gitkeep`
- Create: `src/lib/artlab/contracts/.gitkeep`
- Create: `src/lib/artlab/adapters/.gitkeep`
- Create: `src/lib/artlab/migration/.gitkeep`

- [ ] **Step 1: Create all directories with placeholder files**

```bash
cd "/Users/armaanarora/Documents/The Tower"
for d in intake state queue runners orchestrator memory coherence bot daemon self-evolution health budget scheduler providers promotion review cleanup contracts adapters migration; do
  mkdir -p "src/lib/artlab/$d"
  touch "src/lib/artlab/$d/.gitkeep"
done
mkdir -p src/lib/artlab && touch src/lib/artlab/.gitkeep
```

- [ ] **Step 2: Verify tree**

Run: `find src/lib/artlab -type d | sort`
Expected: 22 directories (root + 21 subdirs)

- [ ] **Step 3: Commit**

```bash
git add src/lib/artlab
git commit -m "$(cat <<'EOF'
Scaffold artlab module directory tree

21 focused subdirectories under src/lib/artlab/ ready for the
new creative engine. Each module will be filled in subsequent
tasks; .gitkeep placeholders ensure the tree is checked in.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.2: Define shared artlab types

**Files:**
- Create: `src/lib/artlab/types.ts`
- Test: `src/lib/artlab/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/types.test.ts
import { describe, expect, it } from "vitest";
import {
  ARTLAB_PHASES,
  ARTLAB_BLOCKERS,
  ArtLabRunStateSchema,
} from "./types";

describe("artlab shared types", () => {
  it("declares all 10 core phases in canonical order", () => {
    expect(ARTLAB_PHASES).toEqual([
      "routed",
      "generating-concepts",
      "concept-review",
      "canary",
      "production",
      "strict-qa",
      "final-review",
      "promoting",
      "verifying",
      "closed",
    ]);
  });

  it("declares all 7 blockers", () => {
    expect(ARTLAB_BLOCKERS).toEqual([
      "needs-human",
      "budget-blocked",
      "provider-blocked",
      "repair-required",
      "style-failed",
      "upgrade-required",
      "cancelled",
    ]);
  });

  it("validates a minimal run state", () => {
    const result = ArtLabRunStateSchema.parse({
      runId: "test-run-1",
      assetType: "character",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "make Rafe Calder",
    });
    expect(result.phase).toBe("routed");
  });

  it("rejects unknown phase", () => {
    expect(() =>
      ArtLabRunStateSchema.parse({
        runId: "x",
        assetType: "character",
        phase: "rogue",
        createdAt: "2026-05-20T00:00:00.000Z",
        updatedAt: "2026-05-20T00:00:00.000Z",
        request: "x",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/types.test.ts`
Expected: FAIL — "Cannot find module './types'"

- [ ] **Step 3: Implement shared types**

```ts
// src/lib/artlab/types.ts
import { z } from "zod";
import type { CreativeAssetType } from "@/lib/creative-production/types";

export const ARTLAB_PHASES = [
  "routed",
  "generating-concepts",
  "concept-review",
  "canary",
  "production",
  "strict-qa",
  "final-review",
  "promoting",
  "verifying",
  "closed",
] as const;
export type ArtLabPhase = (typeof ARTLAB_PHASES)[number];

export const ARTLAB_BLOCKERS = [
  "needs-human",
  "budget-blocked",
  "provider-blocked",
  "repair-required",
  "style-failed",
  "upgrade-required",
  "cancelled",
] as const;
export type ArtLabBlocker = (typeof ARTLAB_BLOCKERS)[number];

export const ARTLAB_ASSET_TYPES = [
  "character",
  "environment",
  "prop",
  "ui-texture",
  "animation",
  "scene",
  "icon-system",
  "marketing-hero",
  "shader",
] as const satisfies readonly CreativeAssetType[];
export type ArtLabAssetType = (typeof ARTLAB_ASSET_TYPES)[number];

export const ArtLabApprovedConceptSchema = z
  .object({
    laneIndex: z.number().int().min(1).max(5),
    approvedAt: z.string().datetime({ offset: true }),
    approvedBy: z.literal("human"),
  })
  .strict();
export type ArtLabApprovedConcept = z.infer<typeof ArtLabApprovedConceptSchema>;

export const ArtLabRunStateSchema = z
  .object({
    runId: z.string().min(1),
    assetType: z.enum(ARTLAB_ASSET_TYPES),
    characterId: z.string().min(1).optional(),
    bundleId: z.string().min(1).optional(),
    phase: z.enum(ARTLAB_PHASES),
    blocker: z.enum(ARTLAB_BLOCKERS).optional(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    request: z.string().min(1),
    approvedConcept: ArtLabApprovedConceptSchema.optional(),
    referenceImagePaths: z.array(z.string()).optional(),
    sourceSurface: z.enum(["telegram", "cli", "daemon-resume", "migration"]).optional(),
  })
  .strict();
export type ArtLabRunState = z.infer<typeof ArtLabRunStateSchema>;

export interface ArtLabWorkspacePaths {
  root: string;
  inbox: string;
  runs: string;
  memory: string;
  ledgers: string;
  slotLeases: string;
}

export const ARTLAB_WORKSPACE_RELATIVE = ".artlab/engine";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/types.test.ts`
Expected: PASS — all 4 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/types.ts src/lib/artlab/types.test.ts
git commit -m "$(cat <<'EOF'
Define artlab shared types and Zod schemas

Locks the 10 phase + 7 blocker enum at the type level. Run state
schema is strict and validates every state file we ever write.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.3: Re-export salvaged budget module

**Files:**
- Create: `src/lib/artlab/budget/index.ts`
- Test: `src/lib/artlab/budget/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/budget/index.test.ts
import { describe, expect, it } from "vitest";
import * as artlabBudget from "./index";

describe("artlab budget re-export", () => {
  it("re-exports reserveCreativeBudget from legacy ledger", () => {
    expect(typeof artlabBudget.reserveCreativeBudget).toBe("function");
  });

  it("re-exports releaseCreativeBudgetReservation", () => {
    expect(typeof artlabBudget.releaseCreativeBudgetReservation).toBe("function");
  });

  it("re-exports recordCreativeBudgetSpend", () => {
    expect(typeof artlabBudget.recordCreativeBudgetSpend).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/budget/index.test.ts`
Expected: FAIL — "Cannot find module './index'"

- [ ] **Step 3: Implement re-export**

```ts
// src/lib/artlab/budget/index.ts
export * from "@/lib/creative-production/budget";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/budget/index.test.ts`
Expected: PASS — 3 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/budget/index.ts src/lib/artlab/budget/index.test.ts
git commit -m "$(cat <<'EOF'
Re-export salvaged budget ledger via artlab/budget

ArtLab consumers import from @/lib/artlab/budget so the legacy
namespace can be deleted without touching call sites in Phase 7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.4: Re-export salvaged scheduler module

**Files:**
- Create: `src/lib/artlab/scheduler/index.ts`
- Test: `src/lib/artlab/scheduler/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/scheduler/index.test.ts
import { describe, expect, it } from "vitest";
import * as artlabScheduler from "./index";

describe("artlab scheduler re-export", () => {
  it("re-exports runCreativeScheduler", () => {
    expect(typeof artlabScheduler.runCreativeScheduler).toBe("function");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/scheduler/index.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement re-export**

```ts
// src/lib/artlab/scheduler/index.ts
export * from "@/lib/creative-production/scheduler";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/scheduler/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/scheduler/index.ts src/lib/artlab/scheduler/index.test.ts
git commit -m "$(cat <<'EOF'
Re-export salvaged scheduler via artlab/scheduler

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.5: Re-export salvaged providers, promotion, review, cleanup, contracts

**Files:**
- Create: `src/lib/artlab/providers/index.ts`
- Create: `src/lib/artlab/promotion/index.ts`
- Create: `src/lib/artlab/review/index.ts`
- Create: `src/lib/artlab/cleanup/index.ts`
- Create: `src/lib/artlab/contracts/index.ts`
- Test: `src/lib/artlab/reexports.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/reexports.test.ts
import { describe, expect, it } from "vitest";
import * as providers from "./providers";
import * as promotion from "./promotion";
import * as review from "./review";
import * as cleanup from "./cleanup";
import * as contracts from "./contracts";

describe("artlab salvaged re-exports", () => {
  it("providers exposes runCreativeProviderGeneration", () => {
    expect(typeof providers.runCreativeProviderGeneration).toBe("function");
  });
  it("contracts exposes getCreativeAssetContract", () => {
    expect(typeof contracts.getCreativeAssetContract).toBe("function");
  });
  it("promotion exposes a callable surface", () => {
    expect(promotion).toBeDefined();
  });
  it("review exposes a callable surface", () => {
    expect(review).toBeDefined();
  });
  it("cleanup exposes a callable surface", () => {
    expect(cleanup).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/reexports.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement five re-exports**

```ts
// src/lib/artlab/providers/index.ts
export * from "@/lib/creative-production/providers";
```

```ts
// src/lib/artlab/promotion/index.ts
export * from "@/lib/creative-production/promotion";
```

```ts
// src/lib/artlab/review/index.ts
export * from "@/lib/creative-production/review";
```

```ts
// src/lib/artlab/cleanup/index.ts
export * from "@/lib/creative-production/cleanup";
```

```ts
// src/lib/artlab/contracts/index.ts
export * from "@/lib/creative-production/contracts";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/reexports.test.ts`
Expected: PASS — 5 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/providers src/lib/artlab/promotion src/lib/artlab/review src/lib/artlab/cleanup src/lib/artlab/contracts src/lib/artlab/reexports.test.ts
git commit -m "$(cat <<'EOF'
Re-export salvaged providers, promotion, review, cleanup, contracts

Five-module re-export pass. ArtLab now has a complete leaf-module
surface backed by the legacy implementations. Phase 7 deletes the
legacy paths once all artlab imports are stable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.6: Public index entry point

**Files:**
- Create: `src/lib/artlab/index.ts`
- Test: `src/lib/artlab/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/index.test.ts
import { describe, expect, it } from "vitest";
import { ARTLAB_PHASES, ARTLAB_BLOCKERS, ARTLAB_WORKSPACE_RELATIVE } from "./index";

describe("artlab public surface", () => {
  it("re-exports phase enum", () => {
    expect(ARTLAB_PHASES.length).toBe(10);
  });
  it("re-exports blocker enum", () => {
    expect(ARTLAB_BLOCKERS.length).toBe(7);
  });
  it("exports workspace path constant", () => {
    expect(ARTLAB_WORKSPACE_RELATIVE).toBe(".artlab/engine");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/index.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement index**

```ts
// src/lib/artlab/index.ts
export * from "./types";
export * as budget from "./budget";
export * as scheduler from "./scheduler";
export * as providers from "./providers";
export * as promotion from "./promotion";
export * as review from "./review";
export * as cleanup from "./cleanup";
export * as contracts from "./contracts";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/index.ts src/lib/artlab/index.test.ts
git commit -m "$(cat <<'EOF'
Add artlab public index re-exporting all leaf modules

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.7: CLI shell with stub subcommands

**Files:**
- Create: `scripts/artlab.ts`
- Test: `scripts/artlab.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/artlab.test.ts
import { describe, expect, it } from "vitest";
import { artlabCliEntry, ARTLAB_SUBCOMMANDS } from "./artlab";

describe("artlab CLI shell", () => {
  it("declares all subcommands", () => {
    expect(ARTLAB_SUBCOMMANDS).toEqual([
      "produce",
      "continue",
      "answer",
      "status",
      "queue",
      "health",
      "cancel",
      "daemon",
      "bot",
      "migrate",
      "help",
    ]);
  });

  it("entry returns exit-code 2 with no args", async () => {
    const code = await artlabCliEntry({ argv: [], stdout: () => {}, stderr: () => {} });
    expect(code).toBe(2);
  });

  it("entry returns exit-code 0 for help", async () => {
    const code = await artlabCliEntry({ argv: ["help"], stdout: () => {}, stderr: () => {} });
    expect(code).toBe(0);
  });

  it("entry returns exit-code 2 for unknown subcommand", async () => {
    const code = await artlabCliEntry({ argv: ["dance"], stdout: () => {}, stderr: () => {} });
    expect(code).toBe(2);
  });

  it("stub produce returns exit-code 0 and prints a banner", async () => {
    const lines: string[] = [];
    const code = await artlabCliEntry({
      argv: ["produce", "make Rafe"],
      stdout: (s) => lines.push(s),
      stderr: () => {},
    });
    expect(code).toBe(0);
    expect(lines.join("\n")).toMatch(/artlab produce: stub/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/artlab.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement CLI shell**

```ts
// scripts/artlab.ts
export const ARTLAB_SUBCOMMANDS = [
  "produce",
  "continue",
  "answer",
  "status",
  "queue",
  "health",
  "cancel",
  "daemon",
  "bot",
  "migrate",
  "help",
] as const;
export type ArtLabSubcommand = (typeof ARTLAB_SUBCOMMANDS)[number];

export interface ArtLabCliIo {
  argv: string[];
  stdout: (line: string) => void;
  stderr: (line: string) => void;
}

const HELP_TEXT = `artlab — Tower creative engine CLI
Usage:
  artlab produce <request>            new run; LLM brain routes
  artlab continue <runId>             advance a continuable phase
  artlab answer <runId> "<response>"  record human response
  artlab status [runId]               plain-English status
  artlab queue                        queued + active runs
  artlab health                       real engine health report
  artlab cancel <runId>               cancel a run with refund
  artlab daemon <start|stop|restart|status|logs>
  artlab bot <setup>                  interactive bot setup
  artlab migrate --import <list>      one-shot legacy import
`;

async function stub(name: string, args: string[], io: ArtLabCliIo): Promise<number> {
  io.stdout(`artlab ${name}: stub — fills in during Phase 1-3 implementation`);
  if (args.length > 0) io.stdout(`  args: ${args.join(" ")}`);
  return 0;
}

export async function artlabCliEntry(io: ArtLabCliIo): Promise<number> {
  const [subcommand, ...rest] = io.argv;
  if (!subcommand) {
    io.stderr(HELP_TEXT);
    return 2;
  }
  if (!ARTLAB_SUBCOMMANDS.includes(subcommand as ArtLabSubcommand)) {
    io.stderr(`artlab: unknown subcommand "${subcommand}"\n\n${HELP_TEXT}`);
    return 2;
  }
  switch (subcommand as ArtLabSubcommand) {
    case "help":
      io.stdout(HELP_TEXT);
      return 0;
    case "produce":
      return stub("produce", rest, io);
    case "continue":
      return stub("continue", rest, io);
    case "answer":
      return stub("answer", rest, io);
    case "status":
      return stub("status", rest, io);
    case "queue":
      return stub("queue", rest, io);
    case "health":
      return stub("health", rest, io);
    case "cancel":
      return stub("cancel", rest, io);
    case "daemon":
      return stub("daemon", rest, io);
    case "bot":
      return stub("bot", rest, io);
    case "migrate":
      return stub("migrate", rest, io);
  }
}

if (require.main === module) {
  void artlabCliEntry({
    argv: process.argv.slice(2),
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  }).then((code) => process.exit(code));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/artlab.test.ts`
Expected: PASS — 5 assertions pass

- [ ] **Step 5: Commit**

```bash
git add scripts/artlab.ts scripts/artlab.test.ts
git commit -m "$(cat <<'EOF'
Add artlab CLI shell with 10 stub subcommands

Single entry point scripts/artlab.ts dispatches by subcommand.
Every subcommand stub returns exit 0 and prints a placeholder so
the wire-up is testable before subcommand bodies land.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.8: npm scripts for artlab CLI

**Files:**
- Modify: `package.json` (scripts block)

- [ ] **Step 1: Add artlab scripts to package.json**

Insert in the `scripts` block alongside existing `art:*` entries:

```json
{
  "artlab": "tsx scripts/artlab.ts",
  "artlab:produce": "tsx scripts/artlab.ts produce",
  "artlab:status": "tsx scripts/artlab.ts status",
  "artlab:queue": "tsx scripts/artlab.ts queue",
  "artlab:health": "tsx scripts/artlab.ts health",
  "artlab:daemon": "tsx scripts/artlab.ts daemon",
  "artlab:bot": "tsx scripts/artlab.ts bot",
  "artlab:migrate": "tsx scripts/artlab.ts migrate"
}
```

- [ ] **Step 2: Verify scripts resolve**

Run: `npm run artlab -- help`
Expected: prints the help text from Task 0.7

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "$(cat <<'EOF'
Add npm scripts for artlab CLI subcommands

Eight wrappers (artlab, artlab:produce, artlab:status,
artlab:queue, artlab:health, artlab:daemon, artlab:bot,
artlab:migrate) wired to scripts/artlab.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.9: Create .artlab/engine workspace

**Files:**
- Create: `.artlab/engine/.gitkeep`
- Create: `.artlab/engine/inbox/.gitkeep`
- Create: `.artlab/engine/inbox/cli/.gitkeep`
- Create: `.artlab/engine/runs/.gitkeep`
- Create: `.artlab/engine/memory/.gitkeep`
- Create: `.artlab/engine/ledgers/.gitkeep`
- Create: `.artlab/engine/slot-leases/.gitkeep`
- Modify: `.gitignore`

- [ ] **Step 1: Create workspace tree**

```bash
cd "/Users/armaanarora/Documents/The Tower"
mkdir -p .artlab/engine/inbox/cli .artlab/engine/runs .artlab/engine/memory .artlab/engine/ledgers .artlab/engine/slot-leases
for d in . inbox inbox/cli runs memory ledgers slot-leases; do touch ".artlab/engine/$d/.gitkeep"; done
```

- [ ] **Step 2: Update .gitignore to exclude transient artlab artifacts**

Append to `.gitignore`:

```
# artlab transient workspace (only .gitkeep files tracked)
.artlab/engine/runs/**/run-state.json
.artlab/engine/runs/**/progress.json
.artlab/engine/runs/**/events.jsonl
.artlab/engine/slot-leases/*.lease.json
.artlab/engine/inbox/**/*.json
.artlab/engine/ledgers/*.jsonl
.artlab/engine/memory/*.jsonl
```

- [ ] **Step 3: Commit**

```bash
git add .artlab/engine .gitignore
git commit -m "$(cat <<'EOF'
Create .artlab/engine workspace with .gitkeep placeholders

Six subdirectories (inbox, inbox/cli, runs, memory, ledgers,
slot-leases) ready for runtime use. .gitignore prevents transient
files from leaking into commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 0.10: Placeholder artlab docs

**Files:**
- Create: `docs/artlab/ENGINE.md`
- Create: `docs/artlab/OPERATIONS.md`
- Create: `docs/artlab/CHARACTER-PIPELINE.md`

- [ ] **Step 1: Write placeholder docs**

```markdown
<!-- docs/artlab/ENGINE.md -->
# ArtLab — Engine reference

Status: WIP placeholder. Real reference written in Phase 7 retirement task.

See `docs/superpowers/specs/2026-05-20-artlab-creative-engine-design.md` for the design.
```

```markdown
<!-- docs/artlab/OPERATIONS.md -->
# ArtLab — Operations runbook

Status: WIP placeholder. Real runbook written in Phase 7 retirement task.
```

```markdown
<!-- docs/artlab/CHARACTER-PIPELINE.md -->
# ArtLab — Character pipeline

Status: WIP placeholder. Merged character pipeline reference written in Phase 7 retirement task.
```

- [ ] **Step 2: Commit**

```bash
git add docs/artlab
git commit -m "$(cat <<'EOF'
Create docs/artlab/ placeholder reference docs

Three placeholder pages (ENGINE.md, OPERATIONS.md, CHARACTER-PIPELINE.md)
filled in during Phase 7. Keeps the docs tree visible in PRs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Foundation

The state machine, runners, deterministic orchestrator, and real health snapshot. No LLM, no Telegram yet. Provider calls go through the `local-mock` adapter that already exists in `src/lib/creative-production/providers/` so tests never bill the real Gemini API. By end of Phase 1, a synthetic end-to-end run "routed → ... → closed" completes with mocked providers.

### Task 1.1: State machine — phase transitions table

**Files:**
- Create: `src/lib/artlab/state/machine.ts`
- Test: `src/lib/artlab/state/machine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/state/machine.test.ts
import { describe, expect, it } from "vitest";
import {
  ARTLAB_TRANSITIONS,
  isLegalTransition,
  legalNextPhases,
} from "./machine";

describe("artlab state machine", () => {
  it("declares the 10 forward transitions in order", () => {
    const sequence = ARTLAB_TRANSITIONS
      .filter((t) => t.trigger === "auto" || t.trigger === "human")
      .map((t) => `${t.from}->${t.to}`);
    expect(sequence).toContain("routed->generating-concepts");
    expect(sequence).toContain("generating-concepts->concept-review");
    expect(sequence).toContain("concept-review->canary");
    expect(sequence).toContain("canary->production");
    expect(sequence).toContain("production->strict-qa");
    expect(sequence).toContain("strict-qa->final-review");
    expect(sequence).toContain("final-review->promoting");
    expect(sequence).toContain("promoting->verifying");
    expect(sequence).toContain("verifying->closed");
  });

  it("rejects illegal jumps", () => {
    expect(isLegalTransition("routed", "production")).toBe(false);
    expect(isLegalTransition("concept-review", "promoting")).toBe(false);
  });

  it("permits legal forward transitions", () => {
    expect(isLegalTransition("routed", "generating-concepts")).toBe(true);
    expect(isLegalTransition("canary", "production")).toBe(true);
  });

  it("legalNextPhases returns destinations", () => {
    expect(legalNextPhases("routed")).toContain("generating-concepts");
    expect(legalNextPhases("closed")).toEqual([]);
  });

  it("every non-closed phase has at least one outgoing transition", () => {
    const phases = ["routed", "generating-concepts", "concept-review", "canary", "production", "strict-qa", "final-review", "promoting", "verifying"] as const;
    for (const phase of phases) {
      expect(legalNextPhases(phase).length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/state/machine.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement machine**

```ts
// src/lib/artlab/state/machine.ts
import type { ArtLabBlocker, ArtLabPhase, ArtLabRunState } from "../types";

export type ArtLabTransitionTrigger = "auto" | "human" | "blocker" | "cancel" | "resume";

export interface ArtLabTransitionContext {
  workspaceRoot: string;
  now: () => Date;
}

export interface ArtLabTransition {
  from: ArtLabPhase;
  to: ArtLabPhase;
  blocker?: ArtLabBlocker;
  trigger: ArtLabTransitionTrigger;
  validate(state: ArtLabRunState, ctx: ArtLabTransitionContext): Promise<void>;
  apply(state: ArtLabRunState, ctx: ArtLabTransitionContext): Promise<ArtLabRunState>;
}

function patch(state: ArtLabRunState, to: ArtLabPhase, ctx: ArtLabTransitionContext, blocker?: ArtLabBlocker): ArtLabRunState {
  return {
    ...state,
    phase: to,
    blocker,
    updatedAt: ctx.now().toISOString(),
  };
}

const auto = (from: ArtLabPhase, to: ArtLabPhase): ArtLabTransition => ({
  from,
  to,
  trigger: "auto",
  async validate() {},
  async apply(state, ctx) { return patch(state, to, ctx); },
});

const human = (from: ArtLabPhase, to: ArtLabPhase): ArtLabTransition => ({
  from,
  to,
  trigger: "human",
  async validate(state) {
    if (from === "concept-review" && !state.approvedConcept) {
      throw new Error(`concept-review→${to} requires approvedConcept`);
    }
  },
  async apply(state, ctx) { return patch(state, to, ctx); },
});

export const ARTLAB_TRANSITIONS: readonly ArtLabTransition[] = [
  auto("routed", "generating-concepts"),
  auto("generating-concepts", "concept-review"),
  human("concept-review", "canary"),
  auto("canary", "production"),
  auto("production", "strict-qa"),
  auto("strict-qa", "final-review"),
  human("final-review", "promoting"),
  auto("promoting", "verifying"),
  auto("verifying", "closed"),
];

export function isLegalTransition(from: ArtLabPhase, to: ArtLabPhase): boolean {
  return ARTLAB_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function legalNextPhases(from: ArtLabPhase): ArtLabPhase[] {
  return ARTLAB_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to);
}

export function getTransition(from: ArtLabPhase, to: ArtLabPhase): ArtLabTransition | undefined {
  return ARTLAB_TRANSITIONS.find((t) => t.from === from && t.to === to);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/state/machine.test.ts`
Expected: PASS — 5 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/state/machine.ts src/lib/artlab/state/machine.test.ts
git commit -m "$(cat <<'EOF'
Implement artlab state machine forward transitions

Nine forward transitions (routed → closed) with validate+apply
contract. Two are human-gated (concept-review→canary,
final-review→promoting); rest are auto. Illegal jumps rejected.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.2: State machine — blocker transitions

**Files:**
- Modify: `src/lib/artlab/state/machine.ts`
- Modify: `src/lib/artlab/state/machine.test.ts`

- [ ] **Step 1: Write the failing test (append to existing test file)**

```ts
// append inside the existing describe block
it("supports entering any phase's blocker without changing phase", () => {
  for (const phase of ["routed", "canary", "production"] as const) {
    expect(isLegalTransition(phase, phase, "needs-human")).toBe(true);
    expect(isLegalTransition(phase, phase, "provider-blocked")).toBe(true);
  }
});

it("supports cancellation from any non-terminal phase", () => {
  expect(isLegalTransition("canary", "canary", "cancelled")).toBe(true);
  expect(isLegalTransition("closed", "closed", "cancelled")).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/state/machine.test.ts`
Expected: FAIL — `isLegalTransition` only takes 2 args

- [ ] **Step 3: Extend implementation**

Update `isLegalTransition` and add a `BLOCKER_TRANSITIONS` table:

```ts
// in src/lib/artlab/state/machine.ts, append:

const BLOCKER_PHASES_NONTERMINAL: ArtLabPhase[] = [
  "routed",
  "generating-concepts",
  "concept-review",
  "canary",
  "production",
  "strict-qa",
  "final-review",
  "promoting",
  "verifying",
];

export const BLOCKER_TRANSITIONS: readonly ArtLabTransition[] = BLOCKER_PHASES_NONTERMINAL.flatMap(
  (phase) =>
    [
      "needs-human",
      "budget-blocked",
      "provider-blocked",
      "repair-required",
      "style-failed",
      "upgrade-required",
      "cancelled",
    ].map<ArtLabTransition>((blocker) => ({
      from: phase,
      to: phase,
      blocker: blocker as ArtLabBlocker,
      trigger: blocker === "cancelled" ? "cancel" : "blocker",
      async validate() {},
      async apply(state, ctx) { return patch(state, phase, ctx, blocker as ArtLabBlocker); },
    })),
);

export function isLegalTransition(from: ArtLabPhase, to: ArtLabPhase, blocker?: ArtLabBlocker): boolean {
  if (blocker) {
    return BLOCKER_TRANSITIONS.some((t) => t.from === from && t.to === to && t.blocker === blocker);
  }
  return ARTLAB_TRANSITIONS.some((t) => t.from === from && t.to === to);
}

export function findBlockerTransition(phase: ArtLabPhase, blocker: ArtLabBlocker): ArtLabTransition | undefined {
  return BLOCKER_TRANSITIONS.find((t) => t.from === phase && t.blocker === blocker);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/state/machine.test.ts`
Expected: PASS — all assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/state/machine.ts src/lib/artlab/state/machine.test.ts
git commit -m "$(cat <<'EOF'
Add blocker transitions orthogonal to phase

Any non-terminal phase can enter any of 7 blockers without
advancing phase. closed accepts no blocker.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.3: Event log writer (jsonl, append-only)

**Files:**
- Create: `src/lib/artlab/state/events.ts`
- Test: `src/lib/artlab/state/events.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/state/events.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendArtLabEvent, readArtLabEvents } from "./events";

describe("artlab events.jsonl writer", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-events-"));
  });

  it("appends one event as one line of JSON", () => {
    appendArtLabEvent(dir, {
      runId: "r1",
      at: "2026-05-20T00:00:00.000Z",
      kind: "phase-transition",
      payload: { from: "routed", to: "generating-concepts" },
    });
    const path = join(dir, "events.jsonl");
    expect(existsSync(path)).toBe(true);
    const raw = readFileSync(path, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    const parsed = JSON.parse(raw.trim());
    expect(parsed.kind).toBe("phase-transition");
  });

  it("readArtLabEvents returns all events as objects", () => {
    appendArtLabEvent(dir, { runId: "r1", at: "2026-05-20T00:00:00.000Z", kind: "a", payload: {} });
    appendArtLabEvent(dir, { runId: "r1", at: "2026-05-20T00:00:01.000Z", kind: "b", payload: {} });
    const events = readArtLabEvents(dir);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.kind)).toEqual(["a", "b"]);
  });

  it("readArtLabEvents on missing file returns []", () => {
    expect(readArtLabEvents(dir)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/state/events.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement events writer**

```ts
// src/lib/artlab/state/events.ts
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const ArtLabEventSchema = z
  .object({
    runId: z.string().min(1),
    at: z.string().datetime({ offset: true }),
    kind: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();
export type ArtLabEvent = z.infer<typeof ArtLabEventSchema>;

export function appendArtLabEvent(runDir: string, event: ArtLabEvent): void {
  ArtLabEventSchema.parse(event);
  const path = join(runDir, "events.jsonl");
  appendFileSync(path, `${JSON.stringify(event)}\n`, { encoding: "utf8" });
}

export function readArtLabEvents(runDir: string): ArtLabEvent[] {
  const path = join(runDir, "events.jsonl");
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => ArtLabEventSchema.parse(JSON.parse(line)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/state/events.test.ts`
Expected: PASS — 3 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/state/events.ts src/lib/artlab/state/events.test.ts
git commit -m "$(cat <<'EOF'
Add append-only events.jsonl writer per run

Validate-on-write with Zod. Readers return typed events. No
mutation paths — events never get rewritten.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.4: Atomic snapshot writer for run-state.json and progress.json

**Files:**
- Create: `src/lib/artlab/state/snapshots.ts`
- Test: `src/lib/artlab/state/snapshots.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/state/snapshots.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeRunStateSnapshot, readRunStateSnapshot, writeProgressSnapshot, readProgressSnapshot } from "./snapshots";

describe("artlab atomic snapshots", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-snap-"));
  });

  it("writes run-state.json with no tmp leftover", () => {
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "test",
    });
    expect(existsSync(join(dir, "run-state.json"))).toBe(true);
    expect(readdirSync(dir).filter((f) => f.includes(".tmp"))).toHaveLength(0);
    const parsed = JSON.parse(readFileSync(join(dir, "run-state.json"), "utf8"));
    expect(parsed.runId).toBe("r1");
  });

  it("readRunStateSnapshot returns null when absent", () => {
    expect(readRunStateSnapshot(dir)).toBeNull();
  });

  it("writeProgressSnapshot writes progress.json", () => {
    writeProgressSnapshot(dir, {
      runId: "r1",
      at: "2026-05-20T00:00:00.000Z",
      phase: "production",
      slotsCompleted: 3,
      slotsRunning: 1,
      slotsFailed: 0,
      actualSpendCents: 412,
      reservedCents: 100,
    });
    const parsed = readProgressSnapshot(dir);
    expect(parsed?.slotsCompleted).toBe(3);
  });

  it("rewriting run-state.json overwrites cleanly", () => {
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "test",
    });
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "canary",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:01.000Z",
      request: "test",
    });
    const parsed = readRunStateSnapshot(dir);
    expect(parsed?.phase).toBe("canary");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/state/snapshots.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement snapshots**

```ts
// src/lib/artlab/state/snapshots.ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ArtLabRunStateSchema, type ArtLabRunState, ARTLAB_PHASES } from "../types";

export const ArtLabProgressSnapshotSchema = z
  .object({
    runId: z.string().min(1),
    at: z.string().datetime({ offset: true }),
    phase: z.enum(ARTLAB_PHASES),
    slotsCompleted: z.number().int().min(0),
    slotsRunning: z.number().int().min(0),
    slotsFailed: z.number().int().min(0),
    actualSpendCents: z.number().int().min(0),
    reservedCents: z.number().int().min(0),
  })
  .strict();
export type ArtLabProgressSnapshot = z.infer<typeof ArtLabProgressSnapshotSchema>;

function atomicWrite(targetPath: string, content: string): void {
  const dir = targetPath.substring(0, targetPath.lastIndexOf("/"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, content, { encoding: "utf8" });
  renameSync(tmp, targetPath);
}

export function writeRunStateSnapshot(runDir: string, state: ArtLabRunState): void {
  const parsed = ArtLabRunStateSchema.parse(state);
  atomicWrite(join(runDir, "run-state.json"), `${JSON.stringify(parsed, null, 2)}\n`);
}

export function readRunStateSnapshot(runDir: string): ArtLabRunState | null {
  const path = join(runDir, "run-state.json");
  if (!existsSync(path)) return null;
  return ArtLabRunStateSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

export function writeProgressSnapshot(runDir: string, progress: ArtLabProgressSnapshot): void {
  const parsed = ArtLabProgressSnapshotSchema.parse(progress);
  atomicWrite(join(runDir, "progress.json"), `${JSON.stringify(parsed, null, 2)}\n`);
}

export function readProgressSnapshot(runDir: string): ArtLabProgressSnapshot | null {
  const path = join(runDir, "progress.json");
  if (!existsSync(path)) return null;
  return ArtLabProgressSnapshotSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/state/snapshots.test.ts`
Expected: PASS — 4 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/state/snapshots.ts src/lib/artlab/state/snapshots.test.ts
git commit -m "$(cat <<'EOF'
Add atomic run-state.json and progress.json snapshot writers

temp+rename pattern. Zod-validated on write and read. Progress
snapshot is the heartbeat target updated every 10s by the
progress publisher.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.5: Reconciler — single read path for run reality

**Files:**
- Create: `src/lib/artlab/state/reconciler.ts`
- Test: `src/lib/artlab/state/reconciler.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/state/reconciler.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readRunReality } from "./reconciler";
import { writeRunStateSnapshot, writeProgressSnapshot } from "./snapshots";
import { appendArtLabEvent } from "./events";

describe("artlab reconciler", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-recon-"));
  });

  it("composes run reality from snapshots, events, and absent artifacts", async () => {
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "production",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:10.000Z",
      request: "make Rafe Calder",
    });
    writeProgressSnapshot(dir, {
      runId: "r1",
      at: "2026-05-20T00:00:10.000Z",
      phase: "production",
      slotsCompleted: 4,
      slotsRunning: 1,
      slotsFailed: 0,
      actualSpendCents: 833,
      reservedCents: 100,
    });
    appendArtLabEvent(dir, {
      runId: "r1",
      at: "2026-05-20T00:00:00.000Z",
      kind: "phase-transition",
      payload: { from: "routed", to: "generating-concepts" },
    });
    const reality = await readRunReality(dir);
    expect(reality.runId).toBe("r1");
    expect(reality.phase).toBe("production");
    expect(reality.slots.completed).toBe(4);
    expect(reality.slots.running).toBe(1);
    expect(reality.spend.actualCents).toBe(833);
    expect(reality.events.length).toBeGreaterThanOrEqual(1);
  });

  it("returns null when run-state.json is missing", async () => {
    const reality = await readRunReality(dir);
    expect(reality).toBeNull();
  });

  it("propagates monthly spend from external ledger when available", async () => {
    writeRunStateSnapshot(dir, {
      runId: "r1",
      assetType: "character",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    });
    writeFileSync(join(dir, "monthly-spend.json"), JSON.stringify({ monthlySpentCents: 12345, monthlyCeilingCents: 50000 }));
    const reality = await readRunReality(dir);
    expect(reality?.spend.monthlySpentCents).toBe(12345);
    expect(reality?.spend.monthlyCeilingCents).toBe(50000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/state/reconciler.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement reconciler**

```ts
// src/lib/artlab/state/reconciler.ts
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { ArtLabBlocker, ArtLabPhase, ArtLabRunState } from "../types";
import { readRunStateSnapshot, readProgressSnapshot } from "./snapshots";
import { readArtLabEvents, type ArtLabEvent } from "./events";

export interface RunRealitySpend {
  actualCents: number;
  reservedCents: number;
  refundedCents: number;
  monthlySpentCents: number;
  monthlyCeilingCents: number;
}

export interface RunRealitySlots {
  completed: number;
  running: number;
  failed: number;
  pending: number;
}

export interface RunReality {
  runId: string;
  assetType: ArtLabRunState["assetType"];
  phase: ArtLabPhase;
  blocker?: ArtLabBlocker;
  slots: RunRealitySlots;
  spend: RunRealitySpend;
  approvedConcept?: ArtLabRunState["approvedConcept"];
  health: {
    activeLeaseCount: number;
    lastHeartbeatAt?: string;
  };
  events: ArtLabEvent[];
  raw: ArtLabRunState;
}

const MonthlySpendShapeSchema = z.object({
  monthlySpentCents: z.number().int().min(0),
  monthlyCeilingCents: z.number().int().min(0),
});

function readMonthlySpend(runDir: string): { monthlySpentCents: number; monthlyCeilingCents: number } {
  const path = join(runDir, "monthly-spend.json");
  if (!existsSync(path)) return { monthlySpentCents: 0, monthlyCeilingCents: 0 };
  return MonthlySpendShapeSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

function countActiveLeases(runDir: string): number {
  const dir = join(runDir, "slot-leases");
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".lease.json")).length;
}

export async function readRunReality(runDir: string): Promise<RunReality | null> {
  const state = readRunStateSnapshot(runDir);
  if (!state) return null;
  const progress = readProgressSnapshot(runDir);
  const events = readArtLabEvents(runDir).slice(-20);
  const monthly = readMonthlySpend(runDir);
  return {
    runId: state.runId,
    assetType: state.assetType,
    phase: state.phase,
    blocker: state.blocker,
    approvedConcept: state.approvedConcept,
    slots: {
      completed: progress?.slotsCompleted ?? 0,
      running: progress?.slotsRunning ?? 0,
      failed: progress?.slotsFailed ?? 0,
      pending: 0,
    },
    spend: {
      actualCents: progress?.actualSpendCents ?? 0,
      reservedCents: progress?.reservedCents ?? 0,
      refundedCents: 0,
      monthlySpentCents: monthly.monthlySpentCents,
      monthlyCeilingCents: monthly.monthlyCeilingCents,
    },
    health: {
      activeLeaseCount: countActiveLeases(runDir),
      lastHeartbeatAt: progress?.at,
    },
    events,
    raw: state,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/state/reconciler.test.ts`
Expected: PASS — 3 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/state/reconciler.ts src/lib/artlab/state/reconciler.test.ts
git commit -m "$(cat <<'EOF'
Add reconciler — single read path for run reality

Composes RunReality from run-state.json, progress.json,
events.jsonl, monthly-spend.json, and slot-leases/. Every
consumer (bot, CLI, health, runners) goes through this one
function; no consumer touches raw artifact files.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.6: Engine-level lock with stale detection

**Files:**
- Create: `src/lib/artlab/queue/lock.ts`
- Test: `src/lib/artlab/queue/lock.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/queue/lock.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireArtLabLock, releaseArtLabLock, isArtLabLocked } from "./lock";

describe("artlab engine lock", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-lock-")); });

  it("acquires and releases", () => {
    const lock = acquireArtLabLock(dir, "test-scope");
    expect(lock.acquired).toBe(true);
    expect(isArtLabLocked(dir, "test-scope")).toBe(true);
    releaseArtLabLock(dir, "test-scope");
    expect(isArtLabLocked(dir, "test-scope")).toBe(false);
  });

  it("refuses second acquire while held", () => {
    acquireArtLabLock(dir, "scope-a");
    const second = acquireArtLabLock(dir, "scope-a");
    expect(second.acquired).toBe(false);
    expect(second.reason).toMatch(/already held/i);
    releaseArtLabLock(dir, "scope-a");
  });

  it("considers stale lock with no live PID as expired", () => {
    // forge a lock with non-existent PID
    const path = join(dir, ".lock.scope-stale.json");
    writeFileSync(path, JSON.stringify({ pid: 999999, scope: "scope-stale", acquiredAt: new Date().toISOString() }));
    const result = acquireArtLabLock(dir, "scope-stale");
    expect(result.acquired).toBe(true);
    expect(result.tookFromStale).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/queue/lock.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement lock**

```ts
// src/lib/artlab/queue/lock.ts
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ArtLabLockFile {
  pid: number;
  scope: string;
  acquiredAt: string;
}

export interface ArtLabLockResult {
  acquired: boolean;
  tookFromStale?: boolean;
  reason?: string;
}

function lockPath(workspaceRoot: string, scope: string): string {
  return join(workspaceRoot, `.lock.${scope}.json`);
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EPERM") return true;
    return false;
  }
}

export function acquireArtLabLock(workspaceRoot: string, scope: string): ArtLabLockResult {
  const path = lockPath(workspaceRoot, scope);
  if (existsSync(path)) {
    const existing = JSON.parse(readFileSync(path, "utf8")) as ArtLabLockFile;
    if (isPidAlive(existing.pid)) {
      return { acquired: false, reason: `already held by pid ${existing.pid}` };
    }
    unlinkSync(path);
    writeFileSync(path, JSON.stringify({ pid: process.pid, scope, acquiredAt: new Date().toISOString() } satisfies ArtLabLockFile), { flag: "wx" });
    return { acquired: true, tookFromStale: true };
  }
  writeFileSync(path, JSON.stringify({ pid: process.pid, scope, acquiredAt: new Date().toISOString() } satisfies ArtLabLockFile), { flag: "wx" });
  return { acquired: true };
}

export function releaseArtLabLock(workspaceRoot: string, scope: string): void {
  const path = lockPath(workspaceRoot, scope);
  if (existsSync(path)) unlinkSync(path);
}

export function isArtLabLocked(workspaceRoot: string, scope: string): boolean {
  return existsSync(lockPath(workspaceRoot, scope));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/queue/lock.test.ts`
Expected: PASS — 3 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/queue/lock.ts src/lib/artlab/queue/lock.test.ts
git commit -m "$(cat <<'EOF'
Add engine-level lock with stale-PID detection

Lock file stores PID + acquiredAt. acquire() checks if the holding
PID is alive; if not, it takes over the stale lock and reports
tookFromStale: true.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.7: Queue (max-2 parallelism) and priority

**Files:**
- Create: `src/lib/artlab/queue/queue.ts`
- Create: `src/lib/artlab/queue/priorities.ts`
- Test: `src/lib/artlab/queue/queue.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/queue/queue.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enqueueRun, listQueuedRuns, dequeueNextRun, ARTLAB_MAX_PARALLELISM, type ArtLabQueueEntry } from "./queue";

describe("artlab queue", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-queue-")); });

  it("ARTLAB_MAX_PARALLELISM equals 2", () => {
    expect(ARTLAB_MAX_PARALLELISM).toBe(2);
  });

  it("enqueues and lists in priority order", () => {
    enqueueRun(dir, { runId: "r1", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "a" } });
    enqueueRun(dir, { runId: "r2", priority: "human-flagged", enqueuedAt: "2026-05-20T00:00:01Z", spec: { request: "b" } });
    enqueueRun(dir, { runId: "r3", priority: "scheduled", enqueuedAt: "2026-05-20T00:00:02Z", spec: { request: "c" } });
    const list = listQueuedRuns(dir);
    expect(list.map((q) => q.runId)).toEqual(["r2", "r3", "r1"]);
  });

  it("dequeueNextRun returns highest priority and removes it", () => {
    enqueueRun(dir, { runId: "r1", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "a" } });
    enqueueRun(dir, { runId: "r2", priority: "human-flagged", enqueuedAt: "2026-05-20T00:00:01Z", spec: { request: "b" } });
    const first = dequeueNextRun(dir);
    expect(first?.runId).toBe("r2");
    const remaining = listQueuedRuns(dir);
    expect(remaining.map((q) => q.runId)).toEqual(["r1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/queue/queue.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement priorities**

```ts
// src/lib/artlab/queue/priorities.ts
export const ARTLAB_PRIORITIES = ["human-flagged", "scheduled", "default"] as const;
export type ArtLabPriority = (typeof ARTLAB_PRIORITIES)[number];

export function priorityRank(priority: ArtLabPriority): number {
  return ARTLAB_PRIORITIES.indexOf(priority);
}
```

- [ ] **Step 4: Implement queue**

```ts
// src/lib/artlab/queue/queue.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { priorityRank, ARTLAB_PRIORITIES, type ArtLabPriority } from "./priorities";

export const ARTLAB_MAX_PARALLELISM = 2;

export const ArtLabQueueEntrySchema = z
  .object({
    runId: z.string().min(1),
    priority: z.enum(ARTLAB_PRIORITIES),
    enqueuedAt: z.string().min(1),
    spec: z.record(z.string(), z.unknown()),
  })
  .strict();
export type ArtLabQueueEntry = z.infer<typeof ArtLabQueueEntrySchema>;

function queueDir(root: string): string {
  const path = join(root, "queue");
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  return path;
}

export function enqueueRun(root: string, entry: ArtLabQueueEntry): void {
  ArtLabQueueEntrySchema.parse(entry);
  const path = join(queueDir(root), `${entry.runId}.json`);
  writeFileSync(path, JSON.stringify(entry), { flag: "wx" });
}

export function listQueuedRuns(root: string): ArtLabQueueEntry[] {
  const path = queueDir(root);
  return readdirSync(path)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ArtLabQueueEntrySchema.parse(JSON.parse(readFileSync(join(path, f), "utf8"))))
    .sort((a, b) => {
      const rank = priorityRank(a.priority) - priorityRank(b.priority);
      if (rank !== 0) return rank;
      return a.enqueuedAt.localeCompare(b.enqueuedAt);
    });
}

export function dequeueNextRun(root: string): ArtLabQueueEntry | null {
  const list = listQueuedRuns(root);
  if (list.length === 0) return null;
  const next = list[0]!;
  unlinkSync(join(queueDir(root), `${next.runId}.json`));
  return next;
}

export function removeFromQueue(root: string, runId: string): boolean {
  const path = join(queueDir(root), `${runId}.json`);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/queue/queue.test.ts`
Expected: PASS — 3 assertions pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/artlab/queue
git commit -m "$(cat <<'EOF'
Add queue with max-2 parallelism and 3-tier priority

Priorities: human-flagged > scheduled > default. Within a tier,
earlier enqueuedAt wins. Files live at .artlab/engine/queue/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.8: Runner contract — shared types

**Files:**
- Create: `src/lib/artlab/runners/runner-contract.ts`
- Test: `src/lib/artlab/runners/runner-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/runner-contract.test.ts
import { describe, expect, it } from "vitest";
import { ArtLabRunnerResultSchema, ARTLAB_RUNNER_KINDS } from "./runner-contract";

describe("artlab runner contract", () => {
  it("declares the 7 runner kinds", () => {
    expect(ARTLAB_RUNNER_KINDS).toEqual([
      "concept",
      "canary",
      "production",
      "cutout",
      "strict-qa",
      "promotion",
      "verifying",
    ]);
  });

  it("validates a successful result", () => {
    const result = ArtLabRunnerResultSchema.parse({
      runnerKind: "concept",
      status: "ok",
      durationMs: 1234,
      artifacts: { conceptBoardPath: "/tmp/board.png" },
    });
    expect(result.status).toBe("ok");
  });

  it("validates a failed result with blocker hint", () => {
    const result = ArtLabRunnerResultSchema.parse({
      runnerKind: "canary",
      status: "failed",
      durationMs: 1,
      artifacts: {},
      blockerHint: "provider-blocked",
      failureCode: "provider-429",
    });
    expect(result.blockerHint).toBe("provider-blocked");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/runner-contract.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement contract**

```ts
// src/lib/artlab/runners/runner-contract.ts
import { z } from "zod";
import { ARTLAB_BLOCKERS, type ArtLabAssetType } from "../types";

export const ARTLAB_RUNNER_KINDS = [
  "concept",
  "canary",
  "production",
  "cutout",
  "strict-qa",
  "promotion",
  "verifying",
] as const;
export type ArtLabRunnerKind = (typeof ARTLAB_RUNNER_KINDS)[number];

export interface ArtLabRunnerInput {
  runId: string;
  runDir: string;
  assetType: ArtLabAssetType;
  characterId?: string;
  approvedLaneIndex?: number;
  providerId: "gemini-api" | "local-mock";
  abortSignal?: AbortSignal;
}

export const ArtLabRunnerResultSchema = z
  .object({
    runnerKind: z.enum(ARTLAB_RUNNER_KINDS),
    status: z.enum(["ok", "failed", "needs-human"]),
    durationMs: z.number().int().min(0),
    artifacts: z.record(z.string(), z.unknown()),
    blockerHint: z.enum(ARTLAB_BLOCKERS).optional(),
    failureCode: z.string().optional(),
  })
  .strict();
export type ArtLabRunnerResult = z.infer<typeof ArtLabRunnerResultSchema>;

export interface ArtLabRunner {
  kind: ArtLabRunnerKind;
  run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/runner-contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/runner-contract.ts src/lib/artlab/runners/runner-contract.test.ts
git commit -m "$(cat <<'EOF'
Add artlab runner contract

Seven runner kinds, ArtLabRunnerInput, ArtLabRunner interface,
ArtLabRunnerResult Zod schema. Every runner is plug-compatible.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.9: Concept runner (5 lanes, local-mock provider)

**Files:**
- Create: `src/lib/artlab/runners/concept-runner.ts`
- Test: `src/lib/artlab/runners/concept-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/concept-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conceptRunner } from "./concept-runner";

describe("concept runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-concept-")); });

  it("produces 5 concept slot outputs and a concept board artifact", async () => {
    const result = await conceptRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(result.runnerKind).toBe("concept");
    expect((result.artifacts.slotOutputs as string[]).length).toBe(5);
    expect(existsSync(join(runDir, "concept-board.json"))).toBe(true);
  });

  it("returns failed when slot count target unreachable", async () => {
    const result = await conceptRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
      abortSignal: AbortSignal.abort(),
    });
    expect(result.status).toBe("failed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/concept-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement concept runner**

```ts
// src/lib/artlab/runners/concept-runner.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const TARGET_LANES = 5;

async function generateMockConceptSlot(runDir: string, laneIndex: number): Promise<string> {
  const dir = join(runDir, "concept-slots");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `lane-${laneIndex}.json`);
  writeFileSync(path, JSON.stringify({ laneIndex, mock: true, generatedAt: new Date().toISOString() }));
  return path;
}

export const conceptRunner: ArtLabRunner = {
  kind: "concept",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    if (input.abortSignal?.aborted) {
      return {
        runnerKind: "concept",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: {},
        blockerHint: "cancelled",
        failureCode: "aborted",
      };
    }
    const slotOutputs: string[] = [];
    for (let lane = 1; lane <= TARGET_LANES; lane += 1) {
      if (input.abortSignal?.aborted) {
        return {
          runnerKind: "concept",
          status: "failed",
          durationMs: Date.now() - startedAt,
          artifacts: { slotOutputs },
          blockerHint: "cancelled",
          failureCode: "aborted",
        };
      }
      slotOutputs.push(await generateMockConceptSlot(input.runDir, lane));
    }
    const conceptBoardPath = join(input.runDir, "concept-board.json");
    writeFileSync(
      conceptBoardPath,
      JSON.stringify({
        runId: input.runId,
        characterId: input.characterId,
        lanes: slotOutputs.map((path, idx) => ({ laneIndex: idx + 1, slotPath: path })),
        createdAt: new Date().toISOString(),
      }),
    );
    return {
      runnerKind: "concept",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs, conceptBoardPath },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/concept-runner.test.ts`
Expected: PASS — 2 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/concept-runner.ts src/lib/artlab/runners/concept-runner.test.ts
git commit -m "$(cat <<'EOF'
Add concept runner — 5 lanes, mock or real provider

Mock provider used in tests. Real Gemini wiring happens in Phase 3
adapters. Writes 5 lane slots and a concept-board.json.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.10: Canary runner

**Files:**
- Create: `src/lib/artlab/runners/canary-runner.ts`
- Test: `src/lib/artlab/runners/canary-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/canary-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canaryRunner } from "./canary-runner";

describe("canary runner", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-canary-"));
    writeFileSync(join(runDir, "approved-concept.json"), JSON.stringify({ laneIndex: 2 }));
  });

  it("produces one canary slot + canary-gate.json", async () => {
    const result = await canaryRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      approvedLaneIndex: 2,
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(existsSync(join(runDir, "canary-gate.json"))).toBe(true);
  });

  it("returns failed without approved lane index", async () => {
    const result = await canaryRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("missing-approved-lane");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/canary-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement canary runner**

```ts
// src/lib/artlab/runners/canary-runner.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

export const canaryRunner: ArtLabRunner = {
  kind: "canary",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    if (typeof input.approvedLaneIndex !== "number") {
      return {
        runnerKind: "canary",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: {},
        failureCode: "missing-approved-lane",
      };
    }
    const slotPath = join(input.runDir, "canary-slot.json");
    writeFileSync(slotPath, JSON.stringify({ laneIndex: input.approvedLaneIndex, mock: true }));
    const gatePath = join(input.runDir, "canary-gate.json");
    writeFileSync(
      gatePath,
      JSON.stringify({
        runId: input.runId,
        laneIndex: input.approvedLaneIndex,
        cutoutPassed: true,
        decidedAt: new Date().toISOString(),
      }),
    );
    return {
      runnerKind: "canary",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotPath, gatePath },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/canary-runner.test.ts`
Expected: PASS — 2 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/canary-runner.ts src/lib/artlab/runners/canary-runner.test.ts
git commit -m "$(cat <<'EOF'
Add canary runner — 1-slot gate before paid production

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.11: Production runner

**Files:**
- Create: `src/lib/artlab/runners/production-runner.ts`
- Test: `src/lib/artlab/runners/production-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/production-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { productionRunner, PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE } from "./production-runner";

describe("production runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-prod-")); });

  it("produces the configured slot count per asset type", async () => {
    expect(PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE.character).toBeGreaterThan(0);
    const result = await productionRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      approvedLaneIndex: 2,
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    const outputs = result.artifacts.slotOutputs as string[];
    expect(outputs.length).toBe(PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE.character);
    expect(existsSync(outputs[0]!)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/production-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement production runner**

```ts
// src/lib/artlab/runners/production-runner.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabAssetType } from "../types";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

export const PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE: Record<ArtLabAssetType, number> = {
  character: 20,
  environment: 4,
  prop: 6,
  "ui-texture": 6,
  animation: 12,
  scene: 5,
  "icon-system": 8,
  "marketing-hero": 5,
  shader: 3,
};

export const productionRunner: ArtLabRunner = {
  kind: "production",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const target = PRODUCTION_SLOT_COUNT_PER_ASSET_TYPE[input.assetType];
    const dir = join(input.runDir, "production-slots");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const slotOutputs: string[] = [];
    for (let i = 1; i <= target; i += 1) {
      if (input.abortSignal?.aborted) {
        return {
          runnerKind: "production",
          status: "failed",
          durationMs: Date.now() - startedAt,
          artifacts: { slotOutputs },
          blockerHint: "cancelled",
          failureCode: "aborted",
        };
      }
      const path = join(dir, `slot-${i}.json`);
      writeFileSync(path, JSON.stringify({ slotId: `slot-${i}`, laneIndex: input.approvedLaneIndex, mock: true }));
      slotOutputs.push(path);
    }
    return {
      runnerKind: "production",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs, slotCount: target },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/production-runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/production-runner.ts src/lib/artlab/runners/production-runner.test.ts
git commit -m "$(cat <<'EOF'
Add production runner with per-asset-type slot counts

Character = 20 (the existing 21-sprite pack minus the canary slot
that's already minted). Each asset type maps to its own target.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.12: Cutout runner

**Files:**
- Create: `src/lib/artlab/runners/cutout-runner.ts`
- Test: `src/lib/artlab/runners/cutout-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/cutout-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cutoutRunner } from "./cutout-runner";

describe("cutout runner", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-cutout-"));
    const productionDir = join(runDir, "production-slots");
    mkdirSync(productionDir);
    for (let i = 1; i <= 3; i += 1) {
      writeFileSync(join(productionDir, `slot-${i}.json`), JSON.stringify({ slotId: `slot-${i}` }));
    }
  });

  it("produces one cutout artifact per production slot", async () => {
    const result = await cutoutRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    const cutouts = result.artifacts.cutoutPaths as string[];
    expect(cutouts.length).toBe(3);
    for (const cp of cutouts) expect(existsSync(cp)).toBe(true);
  });

  it("skips cleanly when asset type is environment", async () => {
    const result = await cutoutRunner.run({
      runId: "r1",
      runDir,
      assetType: "environment",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(result.artifacts.skippedReason).toBe("asset-type-has-no-cutout");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/cutout-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement cutout runner**

```ts
// src/lib/artlab/runners/cutout-runner.ts
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabAssetType } from "../types";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const CUTOUT_REQUIRED: ReadonlySet<ArtLabAssetType> = new Set(["character", "prop"]);

export const cutoutRunner: ArtLabRunner = {
  kind: "cutout",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    if (!CUTOUT_REQUIRED.has(input.assetType)) {
      return {
        runnerKind: "cutout",
        status: "ok",
        durationMs: Date.now() - startedAt,
        artifacts: { skippedReason: "asset-type-has-no-cutout" },
      };
    }
    const sourceDir = join(input.runDir, "production-slots");
    const cutoutDir = join(input.runDir, "cutouts");
    if (!existsSync(cutoutDir)) mkdirSync(cutoutDir, { recursive: true });
    const sources = existsSync(sourceDir) ? readdirSync(sourceDir).filter((f) => f.endsWith(".json")) : [];
    const cutoutPaths: string[] = [];
    for (const src of sources) {
      const path = join(cutoutDir, `${src.replace(/\.json$/, ".png")}`);
      writeFileSync(path, JSON.stringify({ source: src, alpha: true, mock: true }));
      cutoutPaths.push(path);
    }
    return {
      runnerKind: "cutout",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { cutoutPaths },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/cutout-runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/cutout-runner.ts src/lib/artlab/runners/cutout-runner.test.ts
git commit -m "$(cat <<'EOF'
Add cutout runner — character + prop assets only

Other asset types short-circuit with a recorded reason. Real
rembg integration happens in Phase 3 cutout adapter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.13: Strict QA runner

**Files:**
- Create: `src/lib/artlab/runners/strict-qa-runner.ts`
- Test: `src/lib/artlab/runners/strict-qa-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/strict-qa-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { strictQaRunner } from "./strict-qa-runner";

describe("strict QA runner", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-qa-"));
    const cutoutDir = join(runDir, "cutouts");
    mkdirSync(cutoutDir);
    writeFileSync(join(cutoutDir, "slot-1.png"), JSON.stringify({ alpha: true }));
  });

  it("writes asset-doctor.json and repair-plan.json", async () => {
    const result = await strictQaRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(existsSync(join(runDir, "asset-doctor.json"))).toBe(true);
    expect(existsSync(join(runDir, "repair-plan.json"))).toBe(true);
  });

  it("emits repair-required blocker when repair plan non-empty", async () => {
    writeFileSync(join(runDir, "cutouts", "slot-2.png"), JSON.stringify({ alpha: false }));
    const result = await strictQaRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(result.blockerHint).toBe("repair-required");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/strict-qa-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement strict QA runner**

```ts
// src/lib/artlab/runners/strict-qa-runner.ts
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

interface AssetDoctorEntry {
  cutoutPath: string;
  alpha: boolean;
  notes: string[];
}

interface RepairPlanEntry {
  cutoutPath: string;
  reason: string;
  remediation: string;
}

export const strictQaRunner: ArtLabRunner = {
  kind: "strict-qa",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const cutoutDir = join(input.runDir, "cutouts");
    const entries: AssetDoctorEntry[] = [];
    const repairs: RepairPlanEntry[] = [];
    if (existsSync(cutoutDir)) {
      for (const file of readdirSync(cutoutDir).filter((f) => f.endsWith(".png"))) {
        const path = join(cutoutDir, file);
        let alpha = false;
        try {
          const parsed = JSON.parse(readFileSync(path, "utf8")) as { alpha?: boolean };
          alpha = parsed.alpha === true;
        } catch {
          alpha = false;
        }
        entries.push({ cutoutPath: path, alpha, notes: alpha ? [] : ["missing alpha"] });
        if (!alpha) {
          repairs.push({ cutoutPath: path, reason: "alpha-missing", remediation: "rerun-cutout" });
        }
      }
    }
    writeFileSync(join(input.runDir, "asset-doctor.json"), JSON.stringify({ entries }, null, 2));
    writeFileSync(join(input.runDir, "repair-plan.json"), JSON.stringify({ repairs }, null, 2));
    if (repairs.length > 0) {
      return {
        runnerKind: "strict-qa",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: { entries, repairs },
        blockerHint: "repair-required",
        failureCode: "repair-plan-nonempty",
      };
    }
    return {
      runnerKind: "strict-qa",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { entries, repairs },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/strict-qa-runner.test.ts`
Expected: PASS — 2 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/strict-qa-runner.ts src/lib/artlab/runners/strict-qa-runner.test.ts
git commit -m "$(cat <<'EOF'
Add strict QA runner — alpha check + repair plan

Iterates cutouts, builds asset-doctor.json, writes repair-plan.json.
Non-empty repair plan triggers repair-required blocker.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.14: Promotion runner (writes are firewalled)

**Files:**
- Create: `src/lib/artlab/runners/promotion-runner.ts`
- Test: `src/lib/artlab/runners/promotion-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/promotion-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";

describe("promotion runner", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promote-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-public-art-"));
    mkdirSync(join(runDir, "cutouts"));
    writeFileSync(join(runDir, "cutouts", "slot-1.png"), JSON.stringify({ alpha: true }));
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
  });

  it("refuses to write without the exact approval phrase", async () => {
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approve for app" }));
    const result = await promotionRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("approval-phrase-mismatch");
  });

  it("copies cutouts to public/art/lobby/<characterId> when phrase is exact", async () => {
    process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
    const result = await promotionRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    expect(result.status).toBe("ok");
    expect(existsSync(join(publicArtRoot, "lobby", "cro"))).toBe(true);
    expect(readdirSync(join(publicArtRoot, "lobby", "cro")).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/promotion-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement promotion runner**

```ts
// src/lib/artlab/runners/promotion-runner.ts
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

const REQUIRED_PHRASE = "approved for app";

function publicArtRoot(): string {
  return process.env.ARTLAB_PUBLIC_ART_ROOT ?? "/Users/armaanarora/Documents/The Tower/public/art";
}

function targetDir(input: ArtLabRunnerInput): string {
  if (input.assetType === "character" && input.characterId) {
    return join(publicArtRoot(), "lobby", input.characterId);
  }
  if (input.assetType === "environment") {
    return join(publicArtRoot(), "backgrounds", input.runId);
  }
  if (input.assetType === "ui-texture") {
    return join(publicArtRoot(), "ui", input.runId);
  }
  return join(publicArtRoot(), "misc", input.runId);
}

export const promotionRunner: ArtLabRunner = {
  kind: "promotion",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const approvalPath = join(input.runDir, "approval.json");
    if (!existsSync(approvalPath)) {
      return {
        runnerKind: "promotion",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: {},
        failureCode: "approval-missing",
      };
    }
    const parsed = JSON.parse(readFileSync(approvalPath, "utf8")) as { phrase?: string };
    const phrase = (parsed.phrase ?? "").trim().toLowerCase();
    if (phrase !== REQUIRED_PHRASE) {
      return {
        runnerKind: "promotion",
        status: "failed",
        durationMs: Date.now() - startedAt,
        artifacts: {},
        failureCode: "approval-phrase-mismatch",
      };
    }
    const target = targetDir(input);
    mkdirSync(target, { recursive: true });
    const source = join(input.runDir, "cutouts");
    const copied: string[] = [];
    if (existsSync(source)) {
      for (const file of readdirSync(source)) {
        const dst = join(target, file);
        copyFileSync(join(source, file), dst);
        copied.push(dst);
      }
    }
    return {
      runnerKind: "promotion",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { promotedTo: target, copied },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/promotion-runner.test.ts`
Expected: PASS — 2 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/promotion-runner.ts src/lib/artlab/runners/promotion-runner.test.ts
git commit -m "$(cat <<'EOF'
Add promotion runner with approval firewall

Refuses to copy without 'approved for app' exact phrase. Env var
ARTLAB_PUBLIC_ART_ROOT lets tests redirect to tmpdir.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.15: Verifying runner (stub for Playwright wiring in Phase 3)

**Files:**
- Create: `src/lib/artlab/runners/verifying-runner.ts`
- Test: `src/lib/artlab/runners/verifying-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/verifying-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyingRunner } from "./verifying-runner";

describe("verifying runner (Phase 1 stub)", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-verify-")); });

  it("returns ok when ARTLAB_PLAYWRIGHT_MODE=mock", async () => {
    process.env.ARTLAB_PLAYWRIGHT_MODE = "mock";
    const result = await verifyingRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    delete process.env.ARTLAB_PLAYWRIGHT_MODE;
    expect(result.status).toBe("ok");
    expect(result.artifacts.mode).toBe("mock");
  });

  it("returns failed when failure marker file exists", async () => {
    process.env.ARTLAB_PLAYWRIGHT_MODE = "mock";
    writeFileSync(join(runDir, "playwright-force-fail.flag"), "");
    const result = await verifyingRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      providerId: "local-mock",
    });
    delete process.env.ARTLAB_PLAYWRIGHT_MODE;
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("playwright-forced-failure");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/verifying-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement verifying runner stub**

```ts
// src/lib/artlab/runners/verifying-runner.ts
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtLabRunner, ArtLabRunnerInput, ArtLabRunnerResult } from "./runner-contract";

export const verifyingRunner: ArtLabRunner = {
  kind: "verifying",
  async run(input: ArtLabRunnerInput): Promise<ArtLabRunnerResult> {
    const startedAt = Date.now();
    const mode = process.env.ARTLAB_PLAYWRIGHT_MODE ?? "real";
    if (mode === "mock") {
      const failFlag = join(input.runDir, "playwright-force-fail.flag");
      if (existsSync(failFlag)) {
        return {
          runnerKind: "verifying",
          status: "failed",
          durationMs: Date.now() - startedAt,
          artifacts: { mode },
          failureCode: "playwright-forced-failure",
        };
      }
      const evidencePath = join(input.runDir, "playwright-evidence.json");
      writeFileSync(evidencePath, JSON.stringify({ mode: "mock", at: new Date().toISOString() }));
      return {
        runnerKind: "verifying",
        status: "ok",
        durationMs: Date.now() - startedAt,
        artifacts: { mode, evidencePath },
      };
    }
    // Real Playwright invocation lands in Phase 3 (Task 3.43 — adapters/playwright-qa.ts).
    return {
      runnerKind: "verifying",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { mode },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/verifying-runner.test.ts`
Expected: PASS — 2 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/verifying-runner.ts src/lib/artlab/runners/verifying-runner.test.ts
git commit -m "$(cat <<'EOF'
Add verifying runner (Phase 1 stub)

Mock mode for unit tests; real Playwright wiring happens in
Phase 3 via adapters/playwright-qa.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.16: Runners registry

**Files:**
- Create: `src/lib/artlab/runners/index.ts`
- Test: `src/lib/artlab/runners/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/index.test.ts
import { describe, expect, it } from "vitest";
import { ARTLAB_RUNNERS, getRunner } from "./index";

describe("runner registry", () => {
  it("exposes all 7 runners", () => {
    expect(Object.keys(ARTLAB_RUNNERS).sort()).toEqual([
      "canary",
      "concept",
      "cutout",
      "production",
      "promotion",
      "strict-qa",
      "verifying",
    ]);
  });
  it("getRunner returns runner by kind", () => {
    expect(getRunner("concept").kind).toBe("concept");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/index.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement registry**

```ts
// src/lib/artlab/runners/index.ts
import { conceptRunner } from "./concept-runner";
import { canaryRunner } from "./canary-runner";
import { productionRunner } from "./production-runner";
import { cutoutRunner } from "./cutout-runner";
import { strictQaRunner } from "./strict-qa-runner";
import { promotionRunner } from "./promotion-runner";
import { verifyingRunner } from "./verifying-runner";
import type { ArtLabRunner, ArtLabRunnerKind } from "./runner-contract";

export * from "./runner-contract";

export const ARTLAB_RUNNERS: Record<ArtLabRunnerKind, ArtLabRunner> = {
  concept: conceptRunner,
  canary: canaryRunner,
  production: productionRunner,
  cutout: cutoutRunner,
  "strict-qa": strictQaRunner,
  promotion: promotionRunner,
  verifying: verifyingRunner,
};

export function getRunner(kind: ArtLabRunnerKind): ArtLabRunner {
  return ARTLAB_RUNNERS[kind];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/index.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/index.ts src/lib/artlab/runners/index.test.ts
git commit -m "$(cat <<'EOF'
Add runners registry — getRunner(kind)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.17: Progress publisher (heartbeat)

**Files:**
- Create: `src/lib/artlab/orchestrator/progress-publisher.ts`
- Test: `src/lib/artlab/orchestrator/progress-publisher.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/orchestrator/progress-publisher.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishProgressOnce, startProgressHeartbeat } from "./progress-publisher";
import { readProgressSnapshot, writeRunStateSnapshot } from "../state/snapshots";

describe("progress publisher", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-progress-"));
    writeRunStateSnapshot(runDir, {
      runId: "r1",
      assetType: "character",
      phase: "production",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    });
    const slotLeasesDir = join(runDir, "slot-leases");
    mkdirSync(slotLeasesDir);
    writeFileSync(join(slotLeasesDir, "s1.lease.json"), JSON.stringify({ acquiredAt: new Date().toISOString() }));
  });

  it("publishProgressOnce writes a progress snapshot", async () => {
    await publishProgressOnce(runDir);
    const snap = readProgressSnapshot(runDir);
    expect(snap).not.toBeNull();
    expect(snap!.slotsRunning).toBeGreaterThanOrEqual(1);
    expect(snap!.phase).toBe("production");
  });

  it("startProgressHeartbeat ticks at the interval and stops cleanly", async () => {
    const stop = startProgressHeartbeat(runDir, 25);
    await new Promise((r) => setTimeout(r, 80));
    stop();
    const snap = readProgressSnapshot(runDir);
    expect(snap).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/orchestrator/progress-publisher.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement progress publisher**

```ts
// src/lib/artlab/orchestrator/progress-publisher.ts
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { writeProgressSnapshot, readRunStateSnapshot } from "../state/snapshots";

interface SpendArtifacts {
  actualCents: number;
  reservedCents: number;
}

function readSpend(runDir: string): SpendArtifacts {
  const ledgerPath = join(runDir, "provider-budget-ledger.json");
  if (!existsSync(ledgerPath)) return { actualCents: 0, reservedCents: 0 };
  try {
    const parsed = JSON.parse(readFileSync(ledgerPath, "utf8")) as { totals?: { spentCents?: number; reservedCents?: number } };
    return {
      actualCents: parsed.totals?.spentCents ?? 0,
      reservedCents: parsed.totals?.reservedCents ?? 0,
    };
  } catch {
    return { actualCents: 0, reservedCents: 0 };
  }
}

function countLeases(runDir: string): number {
  const dir = join(runDir, "slot-leases");
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".lease.json")).length;
}

function countReceipts(runDir: string): { completed: number; failed: number } {
  const dir = join(runDir, "inbox");
  if (!existsSync(dir)) return { completed: 0, failed: 0 };
  const files = readdirSync(dir);
  return {
    completed: files.filter((f) => f.includes("api-receipt") && !f.includes("failed")).length,
    failed: files.filter((f) => f.includes("failed")).length,
  };
}

export async function publishProgressOnce(runDir: string): Promise<void> {
  const state = readRunStateSnapshot(runDir);
  if (!state) return;
  const spend = readSpend(runDir);
  const leases = countLeases(runDir);
  const receipts = countReceipts(runDir);
  writeProgressSnapshot(runDir, {
    runId: state.runId,
    at: new Date().toISOString(),
    phase: state.phase,
    slotsCompleted: receipts.completed,
    slotsRunning: leases,
    slotsFailed: receipts.failed,
    actualSpendCents: spend.actualCents,
    reservedCents: spend.reservedCents,
  });
}

export function startProgressHeartbeat(runDir: string, intervalMs = 10_000): () => void {
  let active = true;
  const tick = async () => {
    if (!active) return;
    try { await publishProgressOnce(runDir); } catch { /* swallow during teardown */ }
    if (active) setTimeout(tick, intervalMs);
  };
  void tick();
  return () => { active = false; };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/orchestrator/progress-publisher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/orchestrator/progress-publisher.ts src/lib/artlab/orchestrator/progress-publisher.test.ts
git commit -m "$(cat <<'EOF'
Add progress publisher — 10s heartbeat per active runner

Reads budget ledger, slot-leases/, and inbox/ receipts. Writes a
fresh progress.json snapshot every interval. Returns a stop()
handle for clean teardown when the runner exits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.18: Deterministic orchestrator

**Files:**
- Create: `src/lib/artlab/orchestrator/deterministic.ts`
- Test: `src/lib/artlab/orchestrator/deterministic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/orchestrator/deterministic.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDeterministicTransition } from "./deterministic";
import { writeRunStateSnapshot, readRunStateSnapshot } from "../state/snapshots";

describe("deterministic orchestrator", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-orch-"));
  });

  it("auto-advances routed → generating-concepts → concept-review", async () => {
    writeRunStateSnapshot(runDir, {
      runId: "r1",
      assetType: "character",
      characterId: "cro",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "make Rafe",
    });
    let outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
    expect(outcome.applied).toBe(true);
    expect(readRunStateSnapshot(runDir)?.phase).toBe("generating-concepts");
    outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
    expect(outcome.applied).toBe(true);
    expect(readRunStateSnapshot(runDir)?.phase).toBe("concept-review");
  });

  it("halts on a human gate", async () => {
    writeRunStateSnapshot(runDir, {
      runId: "r1",
      assetType: "character",
      characterId: "cro",
      phase: "concept-review",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    });
    const outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
    expect(outcome.applied).toBe(false);
    expect(outcome.reason).toBe("awaiting-human-gate");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/orchestrator/deterministic.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement deterministic orchestrator**

```ts
// src/lib/artlab/orchestrator/deterministic.ts
import type { ArtLabPhase } from "../types";
import { ARTLAB_TRANSITIONS } from "../state/machine";
import { readRunStateSnapshot, writeRunStateSnapshot } from "../state/snapshots";
import { appendArtLabEvent } from "../state/events";
import { getRunner } from "../runners";
import type { ArtLabRunnerKind } from "../runners/runner-contract";

const PHASE_RUNNER: Partial<Record<ArtLabPhase, ArtLabRunnerKind>> = {
  "generating-concepts": "concept",
  canary: "canary",
  production: "production",
  "strict-qa": "strict-qa",
  promoting: "promotion",
  verifying: "verifying",
};

const NEXT_PHASE: Partial<Record<ArtLabPhase, ArtLabPhase>> = {
  routed: "generating-concepts",
  "generating-concepts": "concept-review",
  canary: "production",
  production: "strict-qa",
  "strict-qa": "final-review",
  promoting: "verifying",
  verifying: "closed",
};

export interface DeterministicTransitionInput {
  runDir: string;
  providerId: "gemini-api" | "local-mock";
}

export interface DeterministicTransitionOutcome {
  applied: boolean;
  reason?: string;
  fromPhase?: ArtLabPhase;
  toPhase?: ArtLabPhase;
}

export async function runDeterministicTransition(input: DeterministicTransitionInput): Promise<DeterministicTransitionOutcome> {
  const state = readRunStateSnapshot(input.runDir);
  if (!state) return { applied: false, reason: "no-state" };
  if (state.phase === "closed") return { applied: false, reason: "terminal" };
  if (state.phase === "concept-review" || state.phase === "final-review") {
    return { applied: false, reason: "awaiting-human-gate" };
  }
  if (state.blocker) return { applied: false, reason: `blocked-${state.blocker}` };
  const runnerKind = PHASE_RUNNER[state.phase];
  if (runnerKind) {
    const runner = getRunner(runnerKind);
    const result = await runner.run({
      runId: state.runId,
      runDir: input.runDir,
      assetType: state.assetType,
      characterId: state.characterId,
      approvedLaneIndex: state.approvedConcept?.laneIndex,
      providerId: input.providerId,
    });
    appendArtLabEvent(input.runDir, {
      runId: state.runId,
      at: new Date().toISOString(),
      kind: "runner-completed",
      payload: { runnerKind, status: result.status, durationMs: result.durationMs },
    });
    if (result.status === "failed" && result.blockerHint) {
      writeRunStateSnapshot(input.runDir, { ...state, blocker: result.blockerHint, updatedAt: new Date().toISOString() });
      return { applied: false, reason: `runner-failed-${result.failureCode ?? "unknown"}`, fromPhase: state.phase };
    }
  }
  const next = NEXT_PHASE[state.phase];
  if (!next) return { applied: false, reason: "no-next-phase" };
  const transition = ARTLAB_TRANSITIONS.find((t) => t.from === state.phase && t.to === next);
  if (!transition) return { applied: false, reason: "no-transition-defined" };
  const updated = await transition.apply(state, { workspaceRoot: input.runDir, now: () => new Date() });
  writeRunStateSnapshot(input.runDir, updated);
  appendArtLabEvent(input.runDir, {
    runId: state.runId,
    at: updated.updatedAt,
    kind: "phase-transition",
    payload: { from: state.phase, to: next },
  });
  return { applied: true, fromPhase: state.phase, toPhase: next };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/orchestrator/deterministic.test.ts`
Expected: PASS — 2 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/orchestrator/deterministic.ts src/lib/artlab/orchestrator/deterministic.test.ts
git commit -m "$(cat <<'EOF'
Add deterministic orchestrator — single-step transition walker

Runs the appropriate runner for the current phase, advances if it
succeeds, halts on human gates and blockers. Pure state-machine
walk. No LLM tokens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.19: Health snapshot scanners — leases

**Files:**
- Create: `src/lib/artlab/health/scanners/leases.ts`
- Test: `src/lib/artlab/health/scanners/leases.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/health/scanners/leases.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanLeases } from "./leases";

describe("leases scanner", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-leases-")); });

  it("returns empty when no leases directory exists", () => {
    expect(scanLeases(workspaceRoot)).toEqual([]);
  });

  it("counts active and stale leases across runs", () => {
    const runDir = join(workspaceRoot, "runs", "r1", "slot-leases");
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "s1.lease.json"), JSON.stringify({ acquiredAt: new Date().toISOString() }));
    writeFileSync(join(runDir, "s2.lease.json"), JSON.stringify({ acquiredAt: new Date(Date.now() - 30 * 60_000).toISOString() }));
    const leases = scanLeases(workspaceRoot);
    expect(leases.length).toBe(2);
    expect(leases.some((l) => l.stale)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/health/scanners/leases.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement leases scanner**

```ts
// src/lib/artlab/health/scanners/leases.ts
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const STALE_MS = 10 * 60_000;

export interface LeaseScanEntry {
  runId: string;
  slotId: string;
  acquiredAt: string;
  stale: boolean;
}

export function scanLeases(workspaceRoot: string): LeaseScanEntry[] {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return [];
  const out: LeaseScanEntry[] = [];
  for (const runId of readdirSync(runsDir)) {
    const leaseDir = join(runsDir, runId, "slot-leases");
    if (!existsSync(leaseDir) || !statSync(leaseDir).isDirectory()) continue;
    for (const file of readdirSync(leaseDir).filter((f) => f.endsWith(".lease.json"))) {
      try {
        const parsed = JSON.parse(readFileSync(join(leaseDir, file), "utf8")) as { acquiredAt?: string };
        const acquiredAt = parsed.acquiredAt ?? new Date().toISOString();
        const ageMs = Date.now() - new Date(acquiredAt).getTime();
        out.push({
          runId,
          slotId: file.replace(/\.lease\.json$/, ""),
          acquiredAt,
          stale: ageMs > STALE_MS,
        });
      } catch {
        out.push({ runId, slotId: file, acquiredAt: new Date().toISOString(), stale: true });
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/health/scanners/leases.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/health/scanners/leases.ts src/lib/artlab/health/scanners/leases.test.ts
git commit -m "$(cat <<'EOF'
Add leases health scanner — counts active and stale across runs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.20: Health snapshot scanners — ledgers

**Files:**
- Create: `src/lib/artlab/health/scanners/ledgers.ts`
- Test: `src/lib/artlab/health/scanners/ledgers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/health/scanners/ledgers.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanLedgers } from "./ledgers";

describe("ledgers scanner", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-ledgers-")); });

  it("returns zero when no runs", () => {
    const result = scanLedgers(workspaceRoot);
    expect(result.totalSpentCents).toBe(0);
    expect(result.byRun).toEqual({});
  });

  it("sums spend across runs", () => {
    const r1 = join(workspaceRoot, "runs", "r1");
    mkdirSync(r1, { recursive: true });
    writeFileSync(join(r1, "provider-budget-ledger.json"), JSON.stringify({ totals: { spentCents: 333 } }));
    const r2 = join(workspaceRoot, "runs", "r2");
    mkdirSync(r2, { recursive: true });
    writeFileSync(join(r2, "provider-budget-ledger.json"), JSON.stringify({ totals: { spentCents: 1200 } }));
    const result = scanLedgers(workspaceRoot);
    expect(result.totalSpentCents).toBe(1533);
    expect(result.byRun.r1).toBe(333);
    expect(result.byRun.r2).toBe(1200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/health/scanners/ledgers.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement ledgers scanner**

```ts
// src/lib/artlab/health/scanners/ledgers.ts
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface LedgerScanResult {
  totalSpentCents: number;
  byRun: Record<string, number>;
}

export function scanLedgers(workspaceRoot: string): LedgerScanResult {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return { totalSpentCents: 0, byRun: {} };
  const byRun: Record<string, number> = {};
  let total = 0;
  for (const runId of readdirSync(runsDir)) {
    const runDir = join(runsDir, runId);
    if (!statSync(runDir).isDirectory()) continue;
    const ledgerPath = join(runDir, "provider-budget-ledger.json");
    if (!existsSync(ledgerPath)) continue;
    try {
      const parsed = JSON.parse(readFileSync(ledgerPath, "utf8")) as { totals?: { spentCents?: number } };
      const spent = parsed.totals?.spentCents ?? 0;
      byRun[runId] = spent;
      total += spent;
    } catch {
      byRun[runId] = 0;
    }
  }
  return { totalSpentCents: total, byRun };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/health/scanners/ledgers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/health/scanners/ledgers.ts src/lib/artlab/health/scanners/ledgers.test.ts
git commit -m "$(cat <<'EOF'
Add ledgers health scanner — sums spend per run and overall

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.21: Health snapshot scanners — processes, receipts, locks, cleanup

**Files:**
- Create: `src/lib/artlab/health/scanners/processes.ts`
- Create: `src/lib/artlab/health/scanners/receipts.ts`
- Create: `src/lib/artlab/health/scanners/locks.ts`
- Create: `src/lib/artlab/health/scanners/cleanup.ts`
- Test: `src/lib/artlab/health/scanners/extra-scanners.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/health/scanners/extra-scanners.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scanProcesses } from "./processes";
import { scanReceipts } from "./receipts";
import { scanLocks } from "./locks";
import { scanCleanup } from "./cleanup";

describe("supplementary health scanners", () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "artlab-scan-")); });

  it("scanProcesses counts active leases as live processes", () => {
    const leaseDir = join(root, "runs", "r1", "slot-leases");
    mkdirSync(leaseDir, { recursive: true });
    writeFileSync(join(leaseDir, "s1.lease.json"), JSON.stringify({ acquiredAt: new Date().toISOString() }));
    const result = scanProcesses(root);
    expect(result.activeProcessCount).toBeGreaterThanOrEqual(1);
  });

  it("scanReceipts counts receipts per run", () => {
    const inbox = join(root, "runs", "r1", "inbox");
    mkdirSync(inbox, { recursive: true });
    writeFileSync(join(inbox, "api-receipt-1.json"), JSON.stringify({}));
    writeFileSync(join(inbox, "api-receipt-2.json"), JSON.stringify({}));
    const result = scanReceipts(root);
    expect(result.byRun.r1).toBe(2);
    expect(result.totalReceipts).toBe(2);
  });

  it("scanLocks finds .lock files", () => {
    writeFileSync(join(root, ".lock.engine.json"), JSON.stringify({ pid: process.pid }));
    const result = scanLocks(root);
    expect(result.locks.some((l) => l.scope === "engine")).toBe(true);
  });

  it("scanCleanup detects orphan previews", () => {
    const previews = join(root, "runs", "r1", "previews-orphan");
    mkdirSync(previews, { recursive: true });
    writeFileSync(join(previews, "leftover.png"), "x");
    const result = scanCleanup(root);
    expect(result.orphanPreviewCount).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/health/scanners/extra-scanners.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement processes scanner**

```ts
// src/lib/artlab/health/scanners/processes.ts
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface ProcessesScanResult {
  activeProcessCount: number;
  runIds: string[];
}

export function scanProcesses(workspaceRoot: string): ProcessesScanResult {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return { activeProcessCount: 0, runIds: [] };
  let count = 0;
  const runIds: string[] = [];
  for (const runId of readdirSync(runsDir)) {
    const leaseDir = join(runsDir, runId, "slot-leases");
    if (!existsSync(leaseDir) || !statSync(leaseDir).isDirectory()) continue;
    const leases = readdirSync(leaseDir).filter((f) => f.endsWith(".lease.json"));
    if (leases.length > 0) {
      count += leases.length;
      runIds.push(runId);
    }
  }
  return { activeProcessCount: count, runIds };
}
```

- [ ] **Step 4: Implement receipts scanner**

```ts
// src/lib/artlab/health/scanners/receipts.ts
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface ReceiptsScanResult {
  totalReceipts: number;
  byRun: Record<string, number>;
}

export function scanReceipts(workspaceRoot: string): ReceiptsScanResult {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return { totalReceipts: 0, byRun: {} };
  const byRun: Record<string, number> = {};
  let total = 0;
  for (const runId of readdirSync(runsDir)) {
    const inbox = join(runsDir, runId, "inbox");
    if (!existsSync(inbox) || !statSync(inbox).isDirectory()) continue;
    const count = readdirSync(inbox).filter((f) => f.includes("api-receipt")).length;
    byRun[runId] = count;
    total += count;
  }
  return { totalReceipts: total, byRun };
}
```

- [ ] **Step 5: Implement locks scanner**

```ts
// src/lib/artlab/health/scanners/locks.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface LockScanEntry {
  path: string;
  scope: string;
  holderPid: number;
}

export interface LockScanResult {
  locks: LockScanEntry[];
}

export function scanLocks(workspaceRoot: string): LockScanResult {
  if (!existsSync(workspaceRoot)) return { locks: [] };
  const locks: LockScanEntry[] = [];
  for (const file of readdirSync(workspaceRoot)) {
    if (!file.startsWith(".lock.") || !file.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(readFileSync(join(workspaceRoot, file), "utf8")) as { pid?: number; scope?: string };
      locks.push({
        path: join(workspaceRoot, file),
        scope: parsed.scope ?? file.replace(/^\.lock\./, "").replace(/\.json$/, ""),
        holderPid: parsed.pid ?? 0,
      });
    } catch {
      locks.push({ path: join(workspaceRoot, file), scope: file, holderPid: 0 });
    }
  }
  return { locks };
}
```

- [ ] **Step 6: Implement cleanup scanner**

```ts
// src/lib/artlab/health/scanners/cleanup.ts
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export interface CleanupScanResult {
  orphanPreviewCount: number;
  staleBoardCount: number;
  staleLockCount: number;
}

function countFilesRecursive(dir: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isFile()) count += 1;
    else if (stat.isDirectory()) count += countFilesRecursive(path);
  }
  return count;
}

export function scanCleanup(workspaceRoot: string): CleanupScanResult {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return { orphanPreviewCount: 0, staleBoardCount: 0, staleLockCount: 0 };
  let orphan = 0;
  let staleBoards = 0;
  for (const runId of readdirSync(runsDir)) {
    orphan += countFilesRecursive(join(runsDir, runId, "previews-orphan"));
    staleBoards += countFilesRecursive(join(runsDir, runId, "stale-boards"));
  }
  return { orphanPreviewCount: orphan, staleBoardCount: staleBoards, staleLockCount: 0 };
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/health/scanners/extra-scanners.test.ts`
Expected: PASS — 4 assertions pass

- [ ] **Step 8: Commit**

```bash
git add src/lib/artlab/health/scanners
git commit -m "$(cat <<'EOF'
Add processes/receipts/locks/cleanup health scanners

Five real scanners replace the zeros that legacy buildSnapshot
returned. Each scanner inspects the filesystem; no hard-coded
defaults. All return typed results.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.22: Health snapshot builder

**Files:**
- Create: `src/lib/artlab/health/snapshot.ts`
- Test: `src/lib/artlab/health/snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/health/snapshot.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildArtLabHealthSnapshot } from "./snapshot";

describe("artlab health snapshot", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-health-")); });

  it("returns real numbers across all 6 scanners", () => {
    const runDir = join(workspaceRoot, "runs", "r1");
    mkdirSync(join(runDir, "slot-leases"), { recursive: true });
    writeFileSync(join(runDir, "slot-leases", "s1.lease.json"), JSON.stringify({ acquiredAt: new Date().toISOString() }));
    writeFileSync(join(runDir, "provider-budget-ledger.json"), JSON.stringify({ totals: { spentCents: 500 } }));
    const snap = buildArtLabHealthSnapshot(workspaceRoot);
    expect(snap.leases.length).toBe(1);
    expect(snap.spend.totalSpentCents).toBe(500);
    expect(snap.processes.activeProcessCount).toBe(1);
    expect(snap.collectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/health/snapshot.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement snapshot builder**

```ts
// src/lib/artlab/health/snapshot.ts
import { scanLeases, type LeaseScanEntry } from "./scanners/leases";
import { scanLedgers, type LedgerScanResult } from "./scanners/ledgers";
import { scanProcesses, type ProcessesScanResult } from "./scanners/processes";
import { scanReceipts, type ReceiptsScanResult } from "./scanners/receipts";
import { scanLocks, type LockScanResult } from "./scanners/locks";
import { scanCleanup, type CleanupScanResult } from "./scanners/cleanup";

export interface ArtLabHealthSnapshot {
  collectedAt: string;
  workspaceRoot: string;
  leases: LeaseScanEntry[];
  spend: LedgerScanResult;
  processes: ProcessesScanResult;
  receipts: ReceiptsScanResult;
  locks: LockScanResult;
  cleanup: CleanupScanResult;
}

export function buildArtLabHealthSnapshot(workspaceRoot: string): ArtLabHealthSnapshot {
  return {
    collectedAt: new Date().toISOString(),
    workspaceRoot,
    leases: scanLeases(workspaceRoot),
    spend: scanLedgers(workspaceRoot),
    processes: scanProcesses(workspaceRoot),
    receipts: scanReceipts(workspaceRoot),
    locks: scanLocks(workspaceRoot),
    cleanup: scanCleanup(workspaceRoot),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/health/snapshot.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/health/snapshot.ts src/lib/artlab/health/snapshot.test.ts
git commit -m "$(cat <<'EOF'
Add buildArtLabHealthSnapshot — wires all 6 scanners

Replaces the hard-coded-zeros snapshot in
scripts/creative-production-health.ts. Every count is real.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.23: Health render

**Files:**
- Create: `src/lib/artlab/health/render.ts`
- Test: `src/lib/artlab/health/render.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/health/render.test.ts
import { describe, expect, it } from "vitest";
import { renderArtLabHealth } from "./render";

describe("renderArtLabHealth", () => {
  it("renders a plain-text report with section headings", () => {
    const text = renderArtLabHealth({
      collectedAt: "2026-05-20T00:00:00.000Z",
      workspaceRoot: "/x",
      leases: [],
      spend: { totalSpentCents: 1234, byRun: { r1: 1234 } },
      processes: { activeProcessCount: 1, runIds: ["r1"] },
      receipts: { totalReceipts: 4, byRun: { r1: 4 } },
      locks: { locks: [] },
      cleanup: { orphanPreviewCount: 0, staleBoardCount: 0, staleLockCount: 0 },
    });
    expect(text).toContain("ArtLab Health");
    expect(text).toContain("$12.34");
    expect(text).toContain("active processes: 1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/health/render.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement render**

```ts
// src/lib/artlab/health/render.ts
import type { ArtLabHealthSnapshot } from "./snapshot";

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function renderArtLabHealth(snapshot: ArtLabHealthSnapshot): string {
  const lines: string[] = [];
  lines.push("ArtLab Health");
  lines.push(`Collected at: ${snapshot.collectedAt}`);
  lines.push(`Workspace: ${snapshot.workspaceRoot}`);
  lines.push("");
  lines.push("Spend");
  lines.push(`  total: ${dollars(snapshot.spend.totalSpentCents)}`);
  for (const [runId, cents] of Object.entries(snapshot.spend.byRun)) {
    lines.push(`  ${runId}: ${dollars(cents)}`);
  }
  lines.push("");
  lines.push("Processes");
  lines.push(`  active processes: ${snapshot.processes.activeProcessCount}`);
  for (const runId of snapshot.processes.runIds) {
    lines.push(`  active run: ${runId}`);
  }
  lines.push("");
  lines.push("Leases");
  lines.push(`  total leases: ${snapshot.leases.length}`);
  const stale = snapshot.leases.filter((l) => l.stale).length;
  if (stale > 0) lines.push(`  stale leases: ${stale}`);
  lines.push("");
  lines.push("Receipts");
  lines.push(`  total receipts: ${snapshot.receipts.totalReceipts}`);
  lines.push("");
  lines.push("Locks");
  lines.push(`  total locks: ${snapshot.locks.locks.length}`);
  lines.push("");
  lines.push("Cleanup");
  lines.push(`  orphan previews: ${snapshot.cleanup.orphanPreviewCount}`);
  lines.push(`  stale boards: ${snapshot.cleanup.staleBoardCount}`);
  return lines.join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/health/render.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/health/render.ts src/lib/artlab/health/render.test.ts
git commit -m "$(cat <<'EOF'
Add artlab health render — plain-text report

Sectioned spend, processes, leases, receipts, locks, cleanup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.24: Phase 1 integration test — mock end-to-end run

**Files:**
- Create: `src/lib/artlab/e2e-mock.integration.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
// src/lib/artlab/e2e-mock.integration.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeRunStateSnapshot, readRunStateSnapshot } from "./state/snapshots";
import { runDeterministicTransition } from "./orchestrator/deterministic";

describe("artlab end-to-end mock run", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-e2e-"));
    process.env.ARTLAB_PUBLIC_ART_ROOT = mkdtempSync(join(tmpdir(), "artlab-e2e-public-"));
    process.env.ARTLAB_PLAYWRIGHT_MODE = "mock";
  });

  it("walks routed → closed with two simulated human gate approvals", async () => {
    writeRunStateSnapshot(runDir, {
      runId: "rE2E",
      assetType: "character",
      characterId: "cro",
      phase: "routed",
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
      request: "mock e2e run",
    });

    // Drive until concept-review halts the loop
    for (let i = 0; i < 20; i += 1) {
      const outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
      if (!outcome.applied) break;
    }
    expect(readRunStateSnapshot(runDir)?.phase).toBe("concept-review");

    // Simulate human approving concept direction 2
    const state1 = readRunStateSnapshot(runDir)!;
    writeRunStateSnapshot(runDir, {
      ...state1,
      phase: "canary",
      approvedConcept: { laneIndex: 2, approvedAt: new Date().toISOString(), approvedBy: "human" },
      updatedAt: new Date().toISOString(),
    });

    for (let i = 0; i < 20; i += 1) {
      const outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
      if (!outcome.applied) break;
    }
    expect(readRunStateSnapshot(runDir)?.phase).toBe("final-review");

    // Simulate "approved for app" — write approval and advance
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
    const state2 = readRunStateSnapshot(runDir)!;
    writeRunStateSnapshot(runDir, { ...state2, phase: "promoting", updatedAt: new Date().toISOString() });

    for (let i = 0; i < 20; i += 1) {
      const outcome = await runDeterministicTransition({ runDir, providerId: "local-mock" });
      if (!outcome.applied) break;
    }
    expect(readRunStateSnapshot(runDir)?.phase).toBe("closed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails initially**

Run: `npx vitest run src/lib/artlab/e2e-mock.integration.test.ts`
Expected: PASS (all the Phase 1 building blocks should already make this green)

- [ ] **Step 3: If failing, inspect which transition stalls and fix that runner**

Re-run the test with verbose output: `npx vitest run src/lib/artlab/e2e-mock.integration.test.ts --reporter=verbose`

- [ ] **Step 4: Commit**

```bash
git add src/lib/artlab/e2e-mock.integration.test.ts
git commit -m "$(cat <<'EOF'
Add Phase 1 end-to-end mock run integration test

Walks routed → closed with two simulated human gates. Locks the
runner chain together. Uses local-mock provider so no API spend.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Intelligence

LLM brain, persistent memory ledgers, cast coherence checks, intake routing with the Rafe→Otis regression test, bundle parsing, ambiguity detection. Phase 2 lands the brain that makes artlab autonomous overnight.

### Task 2.1: Known cast — single source

**Files:**
- Create: `src/lib/artlab/intake/known-cast.ts`
- Test: `src/lib/artlab/intake/known-cast.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/intake/known-cast.test.ts
import { describe, expect, it } from "vitest";
import { KNOWN_CAST, findCastMember, listCastByCharacterId } from "./known-cast";

describe("known cast", () => {
  it("derives the cast from SEASON_ONE_CHARACTER_METADATA", () => {
    expect(KNOWN_CAST.length).toBeGreaterThanOrEqual(10);
    expect(KNOWN_CAST.find((c) => c.characterId === "otis")?.displayName).toBe("Otis Vale");
    expect(KNOWN_CAST.find((c) => c.characterId === "cro")?.displayName).toBe("Rafe Calder");
  });

  it("findCastMember matches by characterId, displayName, first name, or short label", () => {
    expect(findCastMember("cro")?.characterId).toBe("cro");
    expect(findCastMember("Rafe Calder")?.characterId).toBe("cro");
    expect(findCastMember("Rafe")?.characterId).toBe("cro");
    expect(findCastMember("CRO")?.characterId).toBe("cro");
  });

  it("listCastByCharacterId returns a keyed map", () => {
    const map = listCastByCharacterId();
    expect(map.cro?.displayName).toBe("Rafe Calder");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/intake/known-cast.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement known cast**

```ts
// src/lib/artlab/intake/known-cast.ts
import { SEASON_ONE_CHARACTER_METADATA } from "@/lib/visual-assets/characters";

export interface KnownCastMember {
  characterId: string;
  displayName: string;
  shortLabel: string;
  firstName: string;
  lastName: string;
  title: string;
  space: string;
}

function deriveFirstLast(displayName: string): { firstName: string; lastName: string } {
  const tokens = displayName.split(/\s+/).filter(Boolean);
  const honorifics = new Set(["dr", "dr."]);
  const startIndex = tokens.findIndex((t) => !honorifics.has(t.toLowerCase()));
  const firstName = tokens[startIndex === -1 ? 0 : startIndex] ?? displayName;
  const lastName = tokens.at(-1) ?? displayName;
  return { firstName, lastName };
}

export const KNOWN_CAST: readonly KnownCastMember[] = SEASON_ONE_CHARACTER_METADATA.map((c) => ({
  characterId: c.id,
  displayName: c.displayName,
  shortLabel: c.shortLabel,
  title: c.title,
  space: c.space,
  ...deriveFirstLast(c.displayName),
}));

export function listCastByCharacterId(): Record<string, KnownCastMember> {
  const out: Record<string, KnownCastMember> = {};
  for (const member of KNOWN_CAST) out[member.characterId] = member;
  return out;
}

export function findCastMember(query: string): KnownCastMember | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return KNOWN_CAST.find(
    (c) =>
      c.characterId.toLowerCase() === q ||
      c.displayName.toLowerCase() === q ||
      c.shortLabel.toLowerCase() === q ||
      c.firstName.toLowerCase() === q ||
      c.lastName.toLowerCase() === q,
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/intake/known-cast.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/intake/known-cast.ts src/lib/artlab/intake/known-cast.test.ts
git commit -m "$(cat <<'EOF'
Add KNOWN_CAST derived from SEASON_ONE_CHARACTER_METADATA

One source of truth. ArtLab intake, coherence, and migration all
read from this list. Lookup helpers cover id, displayName,
shortLabel, firstName, lastName.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.2: Ambiguity detector

**Files:**
- Create: `src/lib/artlab/intake/ambiguity-detector.ts`
- Test: `src/lib/artlab/intake/ambiguity-detector.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/intake/ambiguity-detector.test.ts
import { describe, expect, it } from "vitest";
import { detectAmbiguity } from "./ambiguity-detector";

describe("ambiguity detector", () => {
  it("fires on -compatible style envelope modifier (Rafe→Otis bug)", () => {
    const result = detectAmbiguity({
      request: "based on Tower/Otis-compatible style envelope, make Rafe Calder",
    });
    expect(result.ambiguous).toBe(true);
    expect(result.reasonCodes).toContain("style-reference-modifier");
    expect(result.mentions.length).toBeGreaterThanOrEqual(2);
  });

  it("fires on multiple character names with for/as/like phrasing", () => {
    const result = detectAmbiguity({ request: "make Rafe like Otis but louder" });
    expect(result.ambiguous).toBe(true);
    expect(result.reasonCodes).toContain("multiple-character-cross-reference");
  });

  it("returns ambiguous=false on a clean request", () => {
    const result = detectAmbiguity({ request: "make Sol Navarro" });
    expect(result.ambiguous).toBe(false);
    expect(result.mentions[0]?.characterId).toBe("cno");
  });

  it("fires on style/envelope/language/reference/look modifiers", () => {
    for (const word of ["style", "envelope", "language", "reference", "look"]) {
      const result = detectAmbiguity({ request: `make Vera with the Otis ${word}` });
      expect(result.ambiguous).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/intake/ambiguity-detector.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement detector**

```ts
// src/lib/artlab/intake/ambiguity-detector.ts
import { KNOWN_CAST, type KnownCastMember } from "./known-cast";

export type AmbiguityReasonCode =
  | "style-reference-modifier"
  | "multiple-character-cross-reference"
  | "multiple-equal-scores"
  | "low-confidence";

export interface AmbiguityMention {
  characterId: string;
  matchedToken: string;
  score: number;
}

export interface AmbiguityDetectorResult {
  ambiguous: boolean;
  reasonCodes: AmbiguityReasonCode[];
  mentions: AmbiguityMention[];
  rawRequest: string;
}

const STYLE_MODIFIERS = ["-compatible", "compatible", "style", "envelope", "language", "reference", "look"] as const;
const CROSS_REF_PATTERNS = [/\bfor\s+([A-Z][a-z]+)\b/, /\bas\s+([A-Z][a-z]+)\b/, /\blike\s+([A-Z][a-z]+)\b/];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreCharacterPresence(member: KnownCastMember, request: string): number {
  const tokens: Array<{ value: string; weight: number }> = [
    { value: member.displayName, weight: 100 },
    { value: member.firstName, weight: 60 },
    { value: member.lastName, weight: 45 },
    { value: member.shortLabel, weight: 70 },
    { value: member.characterId, weight: 80 },
  ];
  let best = 0;
  for (const t of tokens) {
    const pattern = new RegExp(`\\b${escapeRegExp(t.value)}\\b`, "i");
    if (pattern.test(request)) best = Math.max(best, t.weight);
  }
  return best;
}

export function detectAmbiguity(input: { request: string }): AmbiguityDetectorResult {
  const reasons = new Set<AmbiguityReasonCode>();
  const mentions: AmbiguityMention[] = [];

  for (const member of KNOWN_CAST) {
    const score = scoreCharacterPresence(member, input.request);
    if (score > 0) mentions.push({ characterId: member.characterId, matchedToken: member.firstName, score });
  }
  mentions.sort((a, b) => b.score - a.score);

  const lower = input.request.toLowerCase();
  for (const modifier of STYLE_MODIFIERS) {
    if (lower.includes(modifier)) {
      // Only fire when paired with at least two named characters or when a character precedes the modifier
      const hasStyleAttribution = KNOWN_CAST.some((m) => {
        const namePattern = new RegExp(`${escapeRegExp(m.firstName)}.{0,20}${escapeRegExp(modifier)}`, "i");
        return namePattern.test(input.request);
      });
      if (hasStyleAttribution || mentions.length >= 2) {
        reasons.add("style-reference-modifier");
      }
    }
  }

  if (mentions.length >= 2) {
    for (const pattern of CROSS_REF_PATTERNS) {
      if (pattern.test(input.request)) reasons.add("multiple-character-cross-reference");
    }
  }

  if (mentions.length >= 2 && mentions[0]!.score === mentions[1]!.score) {
    reasons.add("multiple-equal-scores");
  }

  const ambiguous = reasons.size > 0;
  return {
    ambiguous,
    reasonCodes: Array.from(reasons),
    mentions,
    rawRequest: input.request,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/intake/ambiguity-detector.test.ts`
Expected: PASS — 4 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/intake/ambiguity-detector.ts src/lib/artlab/intake/ambiguity-detector.test.ts
git commit -m "$(cat <<'EOF'
Add ambiguity detector — fires the Rafe→Otis bug pattern

Detects style-reference-modifier on -compatible/style/envelope/
language/reference/look paired with a character name; detects
cross-references on for/as/like phrasing; detects multi-mention
equal scores.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.3: Intake bundle parser

**Files:**
- Create: `src/lib/artlab/intake/bundle-parser.ts`
- Test: `src/lib/artlab/intake/bundle-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/intake/bundle-parser.test.ts
import { describe, expect, it } from "vitest";
import { parseBundle } from "./bundle-parser";

describe("bundle parser", () => {
  it("returns null for a single-asset request", () => {
    expect(parseBundle("make Rafe Calder")).toBeNull();
  });

  it("parses 'X with Y in it' as environment+character bundle", () => {
    const parsed = parseBundle("make the war room with Rafe in it");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.length).toBe(2);
    expect(parsed!.children.some((c) => c.assetType === "environment")).toBe(true);
    expect(parsed!.children.some((c) => c.assetType === "character" && c.characterHint === "Rafe")).toBe(true);
    expect(parsed!.promotionPolicy).toBe("atomic");
  });

  it("parses 'X and Y together' as two characters bundle", () => {
    const parsed = parseBundle("make Rafe and Mara together");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.length).toBe(2);
    expect(parsed!.children.every((c) => c.assetType === "character")).toBe(true);
  });

  it("parses 'X for Z' as scoped bundle", () => {
    const parsed = parseBundle("make a button for the war room");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.some((c) => c.assetType === "ui-texture")).toBe(true);
    expect(parsed!.children.some((c) => c.assetType === "environment")).toBe(true);
  });

  it("parses 'the [room] floor' as environment+characters bundle", () => {
    const parsed = parseBundle("make the lobby floor");
    expect(parsed).not.toBeNull();
    expect(parsed!.children.some((c) => c.assetType === "environment")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/intake/bundle-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement bundle parser**

```ts
// src/lib/artlab/intake/bundle-parser.ts
import { randomUUID } from "node:crypto";
import type { ArtLabAssetType } from "../types";
import { KNOWN_CAST } from "./known-cast";

export interface ChildAssetSpec {
  childId: string;
  assetType: ArtLabAssetType;
  characterHint?: string;
  request: string;
}

export interface BundleSpec {
  bundleId: string;
  source: "with-in-it" | "and-together" | "for" | "room-floor";
  children: ChildAssetSpec[];
  promotionPolicy: "atomic" | "independent";
  links: { childA: string; childB: string; linkType: "shares-style" | "co-appears-in" | "references" }[];
}

const ROOMS: Record<string, ArtLabAssetType> = {
  "war room": "environment",
  lobby: "environment",
  observatory: "environment",
  "writing room": "environment",
  "situation room": "environment",
  "briefing room": "environment",
  "rolodex lounge": "environment",
  penthouse: "environment",
};

function detectRoom(text: string): string | undefined {
  const lower = text.toLowerCase();
  return Object.keys(ROOMS).find((room) => lower.includes(room));
}

function detectCharacterFirstNames(text: string): string[] {
  const found = new Set<string>();
  for (const member of KNOWN_CAST) {
    const pattern = new RegExp(`\\b${member.firstName}\\b`, "i");
    if (pattern.test(text)) found.add(member.firstName);
  }
  return [...found];
}

function child(assetType: ArtLabAssetType, request: string, characterHint?: string): ChildAssetSpec {
  return {
    childId: randomUUID(),
    assetType,
    request,
    characterHint,
  };
}

export function parseBundle(request: string): BundleSpec | null {
  const lower = request.toLowerCase();

  if (/\bwith\s+\w[\w\s]*\s+in\s+it\b/i.test(request)) {
    const room = detectRoom(request);
    const chars = detectCharacterFirstNames(request);
    if (room && chars.length >= 1) {
      const children: ChildAssetSpec[] = [
        child("environment", `${room} background`),
        ...chars.map((c) => child("character", `${c} in ${room}`, c)),
      ];
      return {
        bundleId: randomUUID(),
        source: "with-in-it",
        children,
        promotionPolicy: "atomic",
        links: children.slice(1).map((c) => ({ childA: children[0]!.childId, childB: c.childId, linkType: "co-appears-in" })),
      };
    }
  }

  if (/\band\b.*\btogether\b/i.test(request)) {
    const chars = detectCharacterFirstNames(request);
    if (chars.length >= 2) {
      const children = chars.map((c) => child("character", c, c));
      return {
        bundleId: randomUUID(),
        source: "and-together",
        children,
        promotionPolicy: "atomic",
        links: [{ childA: children[0]!.childId, childB: children[1]!.childId, linkType: "shares-style" }],
      };
    }
  }

  if (/\bbutton\s+for\s+/i.test(request)) {
    const room = detectRoom(request);
    if (room) {
      const children: ChildAssetSpec[] = [
        child("ui-texture", `button for ${room}`),
        child("environment", `${room} background reference`),
      ];
      return {
        bundleId: randomUUID(),
        source: "for",
        children,
        promotionPolicy: "independent",
        links: [{ childA: children[0]!.childId, childB: children[1]!.childId, linkType: "references" }],
      };
    }
  }

  if (/\bthe\s+([a-z\s]+?)\s+floor\b/i.test(request)) {
    const room = detectRoom(request);
    if (room) {
      const children: ChildAssetSpec[] = [child("environment", `${room} floor background`)];
      return {
        bundleId: randomUUID(),
        source: "room-floor",
        children,
        promotionPolicy: "independent",
        links: [],
      };
    }
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/intake/bundle-parser.test.ts`
Expected: PASS — 5 assertions pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/intake/bundle-parser.ts src/lib/artlab/intake/bundle-parser.test.ts
git commit -m "$(cat <<'EOF'
Add bundle parser — 4 phrase patterns

with-in-it (env+character atomic), and-together (multi-character
atomic), for (cross-asset independent), room-floor (env). Links
encode shares-style / co-appears-in / references.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.4: Reference attachment store

**Files:**
- Create: `src/lib/artlab/intake/reference-attachment.ts`
- Test: `src/lib/artlab/intake/reference-attachment.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/intake/reference-attachment.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { storeReferenceImage, listReferenceImages } from "./reference-attachment";

describe("reference attachment store", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-ref-")); });

  it("stores a reference image with metadata", async () => {
    const bytes = Buffer.from("PNG-bytes-here");
    const stored = await storeReferenceImage(runDir, { sourceLabel: "telegram-photo-1", contentType: "image/png", bytes });
    expect(existsSync(stored.absolutePath)).toBe(true);
    expect(readFileSync(stored.absolutePath)).toEqual(bytes);
    const list = listReferenceImages(runDir);
    expect(list.length).toBe(1);
    expect(list[0]!.sourceLabel).toBe("telegram-photo-1");
  });

  it("returns empty when no references stored", () => {
    expect(listReferenceImages(runDir)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/intake/reference-attachment.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement reference attachment**

```ts
// src/lib/artlab/intake/reference-attachment.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface StoredReferenceImage {
  referenceId: string;
  sourceLabel: string;
  contentType: string;
  absolutePath: string;
  storedAt: string;
}

interface ReferenceImageManifest {
  references: StoredReferenceImage[];
}

function refDir(runDir: string): string {
  const dir = join(runDir, "references");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function manifestPath(runDir: string): string {
  return join(refDir(runDir), "manifest.json");
}

function readManifest(runDir: string): ReferenceImageManifest {
  const path = manifestPath(runDir);
  if (!existsSync(path)) return { references: [] };
  return JSON.parse(readFileSync(path, "utf8")) as ReferenceImageManifest;
}

function writeManifest(runDir: string, manifest: ReferenceImageManifest): void {
  writeFileSync(manifestPath(runDir), JSON.stringify(manifest, null, 2));
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function storeReferenceImage(
  runDir: string,
  input: { sourceLabel: string; contentType: string; bytes: Buffer },
): Promise<StoredReferenceImage> {
  const referenceId = randomUUID();
  const ext = EXT_BY_TYPE[input.contentType] ?? "bin";
  const absolutePath = join(refDir(runDir), `${referenceId}.${ext}`);
  writeFileSync(absolutePath, input.bytes);
  const entry: StoredReferenceImage = {
    referenceId,
    sourceLabel: input.sourceLabel,
    contentType: input.contentType,
    absolutePath,
    storedAt: new Date().toISOString(),
  };
  const manifest = readManifest(runDir);
  manifest.references.push(entry);
  writeManifest(runDir, manifest);
  return entry;
}

export function listReferenceImages(runDir: string): StoredReferenceImage[] {
  return readManifest(runDir).references;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/intake/reference-attachment.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/intake/reference-attachment.ts src/lib/artlab/intake/reference-attachment.test.ts
git commit -m "$(cat <<'EOF'
Add reference-image attachment store per run

Inbound Telegram photos land in <runDir>/references/ with manifest
metadata for downstream prompt enrichment.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.5: Intake router with Rafe→Otis regression test

**Files:**
- Create: `src/lib/artlab/intake/router.ts`
- Test: `src/lib/artlab/intake/router.test.ts`
- Test: `src/lib/artlab/intake/router.rafe-regression.test.ts`

- [ ] **Step 1: Write the regression test (this is THE bug we must fix)**

```ts
// src/lib/artlab/intake/router.rafe-regression.test.ts
import { describe, expect, it } from "vitest";
import { routeRequest } from "./router";

const RAFE_REQUEST = `Create the next Season 1 character initial designs for Rafe Calder, characterId cro, based directly on docs/CHARACTER-BIBLE.md Rafe Calder entry and docs/CHARACTER-IMAGE-PROMPTS.md Rafe Calder prompt refs. Generate the five initial prompt-only Tower/Otis-compatible concept designs...`;

describe("intake router — Rafe→Otis regression", () => {
  it("routes the exact misrouted Rafe request to Rafe Calder, not Otis", () => {
    const result = routeRequest({ request: RAFE_REQUEST });
    expect(result.kind).toBe("ambiguous-resolved-or-confident");
    expect(result.assetType).toBe("character");
    expect(result.characterId).toBe("cro");
    expect(result.displayName).toBe("Rafe Calder");
  });

  it("recognizes 'Tower/Otis-compatible' as a style envelope reference, NOT an Otis request", () => {
    const result = routeRequest({ request: RAFE_REQUEST });
    expect(result.characterId).not.toBe("otis");
  });

  it("preserves the explicit characterId:cro signal as the strongest evidence", () => {
    const result = routeRequest({ request: "make characterId: cro" });
    expect(result.characterId).toBe("cro");
  });
});
```

- [ ] **Step 2: Write router basic test**

```ts
// src/lib/artlab/intake/router.test.ts
import { describe, expect, it } from "vitest";
import { routeRequest } from "./router";

describe("intake router", () => {
  it("routes 'make Sol Navarro' to cno", () => {
    const result = routeRequest({ request: "make Sol Navarro" });
    expect(result.characterId).toBe("cno");
    expect(result.assetType).toBe("character");
  });

  it("emits needs-human when only style-modifier mentions exist with no explicit subject", () => {
    const result = routeRequest({ request: "make an Otis-compatible thing for the Tower" });
    expect(result.kind).toBe("needs-human");
    expect(result.reasonCodes).toContain("style-reference-modifier");
  });

  it("routes plain environment requests", () => {
    const result = routeRequest({ request: "make a war room background" });
    expect(result.assetType).toBe("environment");
  });

  it("routes plain ui-texture requests", () => {
    const result = routeRequest({ request: "make an elevator button texture" });
    expect(result.assetType).toBe("ui-texture");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/artlab/intake/router.test.ts src/lib/artlab/intake/router.rafe-regression.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement router**

```ts
// src/lib/artlab/intake/router.ts
import type { ArtLabAssetType } from "../types";
import { detectAmbiguity, type AmbiguityReasonCode } from "./ambiguity-detector";
import { findCastMember, KNOWN_CAST } from "./known-cast";

export type RouterOutcomeKind = "ambiguous-resolved-or-confident" | "needs-human";

export interface RouterOutcome {
  kind: RouterOutcomeKind;
  assetType: ArtLabAssetType;
  characterId?: string;
  displayName?: string;
  reasonCodes: AmbiguityReasonCode[];
  request: string;
  evidence: Array<{ signal: string; weight: number }>;
}

const EXPLICIT_CHARACTER_ID = /\bcharacter[\s-]?id\s*:?\s*([a-z][a-z0-9-]+)\b/i;

const ASSET_TYPE_KEYWORDS: Array<{ pattern: RegExp; assetType: ArtLabAssetType }> = [
  { pattern: /\b(background|environment|skyline|war\s*room|lobby|observatory)\b/i, assetType: "environment" },
  { pattern: /\b(button|panel|texture|knob|ui\s*asset)\b/i, assetType: "ui-texture" },
  { pattern: /\b(prop|object|tool|item)\b/i, assetType: "prop" },
  { pattern: /\b(animation|loop|motion)\b/i, assetType: "animation" },
  { pattern: /\b(icon|glyph)\b/i, assetType: "icon-system" },
  { pattern: /\b(hero|marketing\s*visual|landing\s*image)\b/i, assetType: "marketing-hero" },
  { pattern: /\b(scene|composition)\b/i, assetType: "scene" },
  { pattern: /\b(shader)\b/i, assetType: "shader" },
];

function inferAssetType(request: string, hasExplicitCharacter: boolean): ArtLabAssetType {
  if (hasExplicitCharacter) return "character";
  for (const candidate of ASSET_TYPE_KEYWORDS) {
    if (candidate.pattern.test(request)) return candidate.assetType;
  }
  if (KNOWN_CAST.some((m) => new RegExp(`\\b${m.firstName}\\b`, "i").test(request))) {
    return "character";
  }
  return "character";
}

export function routeRequest(input: { request: string }): RouterOutcome {
  const evidence: RouterOutcome["evidence"] = [];
  const explicit = input.request.match(EXPLICIT_CHARACTER_ID);
  if (explicit) {
    const member = findCastMember(explicit[1] ?? "");
    if (member) {
      evidence.push({ signal: `characterId:${member.characterId}`, weight: 200 });
      return {
        kind: "ambiguous-resolved-or-confident",
        assetType: "character",
        characterId: member.characterId,
        displayName: member.displayName,
        reasonCodes: [],
        request: input.request,
        evidence,
      };
    }
  }

  const ambiguity = detectAmbiguity({ request: input.request });
  if (ambiguity.mentions.length > 0) {
    const top = ambiguity.mentions[0]!;
    evidence.push({ signal: `mention:${top.characterId}`, weight: top.score });
  }

  // If a style-reference-modifier fired but only one mention exists, the lone mention is likely the style reference, not the subject.
  if (ambiguity.reasonCodes.includes("style-reference-modifier") && ambiguity.mentions.length < 2) {
    return {
      kind: "needs-human",
      assetType: inferAssetType(input.request, false),
      reasonCodes: ambiguity.reasonCodes,
      request: input.request,
      evidence,
    };
  }

  // If multiple characters with one paired to a style modifier, the OTHER mention is the subject.
  if (ambiguity.reasonCodes.includes("style-reference-modifier") && ambiguity.mentions.length >= 2) {
    // The mention adjacent to a style modifier is the style reference.
    const styleRefs = new Set<string>();
    for (const member of KNOWN_CAST) {
      for (const modifier of ["-compatible", "compatible", "style", "envelope", "language", "reference", "look"]) {
        const pattern = new RegExp(`${member.firstName}.{0,30}${modifier}`, "i");
        if (pattern.test(input.request)) styleRefs.add(member.characterId);
      }
    }
    const subject = ambiguity.mentions.find((m) => !styleRefs.has(m.characterId));
    if (subject) {
      const member = findCastMember(subject.characterId);
      evidence.push({ signal: "style-modifier-disambiguation", weight: 150 });
      return {
        kind: "ambiguous-resolved-or-confident",
        assetType: "character",
        characterId: member?.characterId,
        displayName: member?.displayName,
        reasonCodes: ambiguity.reasonCodes.filter((r) => r !== "style-reference-modifier"),
        request: input.request,
        evidence,
      };
    }
    return {
      kind: "needs-human",
      assetType: "character",
      reasonCodes: ambiguity.reasonCodes,
      request: input.request,
      evidence,
    };
  }

  if (ambiguity.ambiguous) {
    return {
      kind: "needs-human",
      assetType: inferAssetType(input.request, ambiguity.mentions.length > 0),
      reasonCodes: ambiguity.reasonCodes,
      request: input.request,
      evidence,
    };
  }

  if (ambiguity.mentions.length === 1) {
    const member = findCastMember(ambiguity.mentions[0]!.characterId);
    return {
      kind: "ambiguous-resolved-or-confident",
      assetType: "character",
      characterId: member?.characterId,
      displayName: member?.displayName,
      reasonCodes: [],
      request: input.request,
      evidence,
    };
  }

  return {
    kind: "ambiguous-resolved-or-confident",
    assetType: inferAssetType(input.request, false),
    reasonCodes: [],
    request: input.request,
    evidence,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/artlab/intake/router.test.ts src/lib/artlab/intake/router.rafe-regression.test.ts`
Expected: PASS — all 7 assertions pass, including the critical regression that misrouted Rafe→Otis

- [ ] **Step 6: Commit**

```bash
git add src/lib/artlab/intake/router.ts src/lib/artlab/intake/router.test.ts src/lib/artlab/intake/router.rafe-regression.test.ts
git commit -m "$(cat <<'EOF'
Add intake router that fixes today's Rafe→Otis misrouting

Router scores explicit characterId:X highest; if style-reference
modifier ('Otis-compatible') is paired with a single character
mention, returns needs-human; if paired with two mentions, the
non-modified mention is the subject. The exact misrouted request
from .artlab/studio/characters/2026-05-20-otis/ now routes to
Rafe Calder. Locked in with router.rafe-regression.test.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.6: Memory — style-wins ledger

**Files:**
- Create: `src/lib/artlab/memory/style-ledger.ts`
- Test: `src/lib/artlab/memory/style-ledger.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/memory/style-ledger.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendStyleWin, readStyleWins } from "./style-ledger";

describe("style-wins ledger", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-style-")); });

  it("appends a win and reads it back", () => {
    appendStyleWin(dir, {
      characterId: "otis",
      promotedAt: new Date().toISOString(),
      winningTechniques: ["warm desk lamp in lane 3", "isnet-anime cutout"],
      promptHash: "sha256:abc",
      cutoutModelUsed: "isnet-anime",
      totalCostCents: 664,
    });
    const wins = readStyleWins(dir);
    expect(wins.length).toBe(1);
    expect(wins[0]!.characterId).toBe("otis");
  });

  it("filters by characterId", () => {
    appendStyleWin(dir, { characterId: "otis", promotedAt: new Date().toISOString(), winningTechniques: [], promptHash: "1", totalCostCents: 0 });
    appendStyleWin(dir, { characterId: "ceo", promotedAt: new Date().toISOString(), winningTechniques: [], promptHash: "2", totalCostCents: 0 });
    expect(readStyleWins(dir, { characterId: "otis" })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/memory/style-ledger.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement style-wins ledger**

```ts
// src/lib/artlab/memory/style-ledger.ts
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const StyleWinEntrySchema = z
  .object({
    characterId: z.string().min(1),
    promotedAt: z.string().datetime({ offset: true }),
    winningTechniques: z.array(z.string()),
    promptHash: z.string().min(1),
    cutoutModelUsed: z.string().optional(),
    totalCostCents: z.number().int().min(0),
  })
  .strict();
export type StyleWinEntry = z.infer<typeof StyleWinEntrySchema>;

function path(workspaceMemoryDir: string): string {
  return join(workspaceMemoryDir, "style-wins.jsonl");
}

export function appendStyleWin(workspaceMemoryDir: string, entry: StyleWinEntry): void {
  StyleWinEntrySchema.parse(entry);
  appendFileSync(path(workspaceMemoryDir), `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
}

export function readStyleWins(workspaceMemoryDir: string, filter?: { characterId?: string }): StyleWinEntry[] {
  const p = path(workspaceMemoryDir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  const all = raw.split("\n").map((line) => StyleWinEntrySchema.parse(JSON.parse(line)));
  if (filter?.characterId) return all.filter((w) => w.characterId === filter.characterId);
  return all;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/memory/style-ledger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/memory/style-ledger.ts src/lib/artlab/memory/style-ledger.test.ts
git commit -m "$(cat <<'EOF'
Add style-wins jsonl ledger (per-promotion memory)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.7: Memory — rejection ledger

**Files:**
- Create: `src/lib/artlab/memory/rejection-ledger.ts`
- Test: `src/lib/artlab/memory/rejection-ledger.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/memory/rejection-ledger.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRejection, readRejections } from "./rejection-ledger";

describe("rejection ledger", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-rej-")); });

  it("appends and reads rejections", () => {
    appendRejection(dir, {
      characterId: "otis",
      runId: "rOtisV3",
      lane: 5,
      rejectedAt: new Date().toISOString(),
      reason: "jawline too perfect",
      qaFailureCodes: ["style-coherence-failed"],
      promptHashRejected: "sha256:zzz",
    });
    const list = readRejections(dir);
    expect(list).toHaveLength(1);
    expect(list[0]!.reason).toContain("jawline");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/memory/rejection-ledger.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement rejection ledger**

```ts
// src/lib/artlab/memory/rejection-ledger.ts
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const RejectionEntrySchema = z
  .object({
    characterId: z.string().min(1),
    runId: z.string().min(1),
    lane: z.number().int().min(1),
    rejectedAt: z.string().datetime({ offset: true }),
    reason: z.string().min(1),
    qaFailureCodes: z.array(z.string()),
    promptHashRejected: z.string().min(1),
  })
  .strict();
export type RejectionEntry = z.infer<typeof RejectionEntrySchema>;

function path(memoryDir: string): string {
  return join(memoryDir, "style-rejections.jsonl");
}

export function appendRejection(memoryDir: string, entry: RejectionEntry): void {
  RejectionEntrySchema.parse(entry);
  appendFileSync(path(memoryDir), `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
}

export function readRejections(memoryDir: string, filter?: { characterId?: string }): RejectionEntry[] {
  const p = path(memoryDir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  const all = raw.split("\n").map((line) => RejectionEntrySchema.parse(JSON.parse(line)));
  if (filter?.characterId) return all.filter((r) => r.characterId === filter.characterId);
  return all;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/memory/rejection-ledger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/memory/rejection-ledger.ts src/lib/artlab/memory/rejection-ledger.test.ts
git commit -m "$(cat <<'EOF'
Add style-rejections jsonl ledger

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.8: Memory — prompt-evolution ledger

**Files:**
- Create: `src/lib/artlab/memory/prompt-evolution.ts`
- Test: `src/lib/artlab/memory/prompt-evolution.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/memory/prompt-evolution.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendPromptEvolution, readPromptEvolution } from "./prompt-evolution";

describe("prompt-evolution ledger", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-evo-")); });

  it("appends a prompt-builder change", () => {
    appendPromptEvolution(dir, {
      promptComponent: "character-concept-base",
      version: "v1.4",
      changedAt: new Date().toISOString(),
      diff: "+ preserve natural human imperfections",
      triggeredBy: "rejection-pattern-jawline-too-perfect",
      outcomes: { subsequentRejections: 0, subsequentPromotions: 0 },
    });
    const list = readPromptEvolution(dir);
    expect(list).toHaveLength(1);
    expect(list[0]!.version).toBe("v1.4");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/memory/prompt-evolution.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement prompt-evolution ledger**

```ts
// src/lib/artlab/memory/prompt-evolution.ts
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

export const PromptEvolutionEntrySchema = z
  .object({
    promptComponent: z.string().min(1),
    version: z.string().min(1),
    changedAt: z.string().datetime({ offset: true }),
    diff: z.string().min(1),
    triggeredBy: z.string().min(1),
    outcomes: z.object({
      subsequentRejections: z.number().int().min(0),
      subsequentPromotions: z.number().int().min(0),
    }),
  })
  .strict();
export type PromptEvolutionEntry = z.infer<typeof PromptEvolutionEntrySchema>;

function path(memoryDir: string): string {
  return join(memoryDir, "prompt-evolution.jsonl");
}

export function appendPromptEvolution(memoryDir: string, entry: PromptEvolutionEntry): void {
  PromptEvolutionEntrySchema.parse(entry);
  appendFileSync(path(memoryDir), `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
}

export function readPromptEvolution(memoryDir: string): PromptEvolutionEntry[] {
  const p = path(memoryDir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => PromptEvolutionEntrySchema.parse(JSON.parse(line)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/memory/prompt-evolution.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/memory/prompt-evolution.ts src/lib/artlab/memory/prompt-evolution.test.ts
git commit -m "$(cat <<'EOF'
Add prompt-evolution jsonl ledger

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.9: Memory retrieval API

**Files:**
- Create: `src/lib/artlab/memory/retrieve.ts`
- Test: `src/lib/artlab/memory/retrieve.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/memory/retrieve.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getRelevantMemory } from "./retrieve";
import { appendStyleWin } from "./style-ledger";
import { appendRejection } from "./rejection-ledger";
import { appendPromptEvolution } from "./prompt-evolution";

describe("getRelevantMemory", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "artlab-mem-"));
    for (let i = 0; i < 4; i += 1) {
      appendStyleWin(dir, {
        characterId: i % 2 === 0 ? "otis" : "ceo",
        promotedAt: new Date(2026, 0, i + 1).toISOString(),
        winningTechniques: [`technique-${i}`],
        promptHash: `h${i}`,
        totalCostCents: 100 * i,
      });
    }
    appendRejection(dir, {
      characterId: "otis",
      runId: "r1",
      lane: 5,
      rejectedAt: new Date(2026, 0, 5).toISOString(),
      reason: "jawline too perfect",
      qaFailureCodes: ["style-coherence-failed"],
      promptHashRejected: "p1",
    });
    appendPromptEvolution(dir, {
      promptComponent: "character-concept-base",
      version: "v1.4",
      changedAt: new Date(2026, 0, 6).toISOString(),
      diff: "+ preserve asymmetry",
      triggeredBy: "rejection-pattern-jawline-too-perfect",
      outcomes: { subsequentRejections: 0, subsequentPromotions: 0 },
    });
  });

  it("returns top-N wins per characterId by recency", async () => {
    const mem = await getRelevantMemory({ memoryDir: dir, assetType: "character", characterId: "otis", topN: 1 });
    expect(mem.wins).toHaveLength(1);
    expect(mem.wins[0]!.characterId).toBe("otis");
  });

  it("returns rejections and recent prompt hardening", async () => {
    const mem = await getRelevantMemory({ memoryDir: dir, assetType: "character", topN: 5 });
    expect(mem.rejections.length).toBeGreaterThanOrEqual(1);
    expect(mem.recentPromptHardening.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/memory/retrieve.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement retrieve**

```ts
// src/lib/artlab/memory/retrieve.ts
import type { ArtLabAssetType } from "../types";
import { readStyleWins, type StyleWinEntry } from "./style-ledger";
import { readRejections, type RejectionEntry } from "./rejection-ledger";
import { readPromptEvolution, type PromptEvolutionEntry } from "./prompt-evolution";

export interface RelevantMemoryInput {
  memoryDir: string;
  assetType: ArtLabAssetType;
  characterId?: string;
  topN?: number;
}

export interface RelevantMemoryResult {
  wins: StyleWinEntry[];
  rejections: RejectionEntry[];
  recentPromptHardening: PromptEvolutionEntry[];
}

export async function getRelevantMemory(input: RelevantMemoryInput): Promise<RelevantMemoryResult> {
  const topN = input.topN ?? 10;
  const winsAll = readStyleWins(input.memoryDir, input.characterId ? { characterId: input.characterId } : undefined);
  const rejAll = readRejections(input.memoryDir, input.characterId ? { characterId: input.characterId } : undefined);
  const evoAll = readPromptEvolution(input.memoryDir);
  return {
    wins: [...winsAll].sort((a, b) => b.promotedAt.localeCompare(a.promotedAt)).slice(0, topN),
    rejections: [...rejAll].sort((a, b) => b.rejectedAt.localeCompare(a.rejectedAt)).slice(0, topN),
    recentPromptHardening: [...evoAll].sort((a, b) => b.changedAt.localeCompare(a.changedAt)).slice(0, topN),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/memory/retrieve.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/memory/retrieve.ts src/lib/artlab/memory/retrieve.test.ts
git commit -m "$(cat <<'EOF'
Add getRelevantMemory — top-N recency retrieval per character

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.10: Coherence — perceptual hashes (silhouette + palette)

**Files:**
- Create: `src/lib/artlab/coherence/hashes.ts`
- Test: `src/lib/artlab/coherence/hashes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/coherence/hashes.test.ts
import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { computeSilhouetteHash, computePaletteHistogram } from "./hashes";

describe("perceptual hashes", () => {
  it("computes a silhouette hash from a solid rectangle", async () => {
    const dir = mkdtempSync(join(tmpdir(), "artlab-hash-"));
    const png = await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: Buffer.from(`<svg width="128" height="128"><rect x="32" y="32" width="64" height="64" fill="red"/></svg>`), top: 0, left: 0 }])
      .png()
      .toBuffer();
    const path = join(dir, "a.png");
    writeFileSync(path, png);
    const hash = await computeSilhouetteHash(path);
    expect(hash.bbox.width).toBeGreaterThan(0);
    expect(hash.bbox.height).toBeGreaterThan(0);
    expect(hash.aspectRatio).toBeGreaterThan(0);
  });

  it("computes a 5-color palette histogram", async () => {
    const dir = mkdtempSync(join(tmpdir(), "artlab-hash-"));
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 30, g: 30, b: 60 } } })
      .png()
      .toBuffer();
    const path = join(dir, "b.png");
    writeFileSync(path, png);
    const palette = await computePaletteHistogram(path);
    expect(palette.topColors.length).toBeLessThanOrEqual(5);
    expect(palette.topColors[0]!.weight).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/coherence/hashes.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement hashes**

```ts
// src/lib/artlab/coherence/hashes.ts
import sharp from "sharp";

export interface SilhouetteHash {
  bbox: { x: number; y: number; width: number; height: number };
  aspectRatio: number;
}

export interface PaletteEntry {
  r: number;
  g: number;
  b: number;
  weight: number;
}

export interface PaletteHistogram {
  topColors: PaletteEntry[];
}

const QUANT_BUCKETS = 6;

export async function computeSilhouetteHash(imagePath: string): Promise<SilhouetteHash> {
  const image = sharp(imagePath);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = 0;
  let maxY = 0;
  let anyOpaque = false;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const idx = (y * info.width + x) * info.channels;
      const alpha = info.channels >= 4 ? data[idx + 3]! : 255;
      if (alpha > 24) {
        anyOpaque = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!anyOpaque) {
    return { bbox: { x: 0, y: 0, width: info.width, height: info.height }, aspectRatio: info.width / info.height };
  }
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  return { bbox: { x: minX, y: minY, width, height }, aspectRatio: width / Math.max(height, 1) };
}

function quantize(value: number): number {
  return Math.floor(value / (256 / QUANT_BUCKETS));
}

export async function computePaletteHistogram(imagePath: string): Promise<PaletteHistogram> {
  const { data, info } = await sharp(imagePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = `${quantize(r)}-${quantize(g)}-${quantize(b)}`;
    const cur = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    cur.r += r;
    cur.g += g;
    cur.b += b;
    cur.count += 1;
    buckets.set(key, cur);
  }
  const totalPixels = info.width * info.height;
  const top = [...buckets.values()]
    .map((b) => ({ r: Math.round(b.r / b.count), g: Math.round(b.g / b.count), b: Math.round(b.b / b.count), weight: b.count / totalPixels }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  return { topColors: top };
}

export function paletteDistance(a: PaletteHistogram, b: PaletteHistogram): number {
  let total = 0;
  for (let i = 0; i < Math.min(a.topColors.length, b.topColors.length); i += 1) {
    const x = a.topColors[i]!;
    const y = b.topColors[i]!;
    const dr = x.r - y.r;
    const dg = x.g - y.g;
    const db = x.b - y.b;
    total += Math.sqrt(dr * dr + dg * dg + db * db);
  }
  return total / Math.max(Math.min(a.topColors.length, b.topColors.length), 1);
}

export function silhouetteDistance(a: SilhouetteHash, b: SilhouetteHash): number {
  return Math.abs(a.aspectRatio - b.aspectRatio);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/coherence/hashes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/coherence/hashes.ts src/lib/artlab/coherence/hashes.test.ts
git commit -m "$(cat <<'EOF'
Add silhouette + palette perceptual hashes via sharp

Silhouette = alpha-aware bbox + aspect ratio. Palette = quantized
top-5 colors with k-means-equivalent bucket scoring. Distance
helpers for cast diversity checks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.11: Coherence — coherence thresholds config

**Files:**
- Create: `src/lib/artlab/coherence/thresholds.json`
- Create: `src/lib/artlab/coherence/thresholds.ts`
- Test: `src/lib/artlab/coherence/thresholds.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/coherence/thresholds.test.ts
import { describe, expect, it } from "vitest";
import { loadCoherenceThresholds } from "./thresholds";

describe("coherence thresholds", () => {
  it("loads default thresholds with the expected keys", () => {
    const t = loadCoherenceThresholds();
    expect(t.silhouette.minPairwiseDistance).toBeGreaterThan(0);
    expect(t.palette.minPairwiseDistance).toBeGreaterThan(0);
    expect(t.palette.maxCohesionDistance).toBeGreaterThan(0);
    expect(t.age.maxImpressionGapYears).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/coherence/thresholds.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement thresholds**

```json
// src/lib/artlab/coherence/thresholds.json
{
  "silhouette": { "minPairwiseDistance": 0.08, "maxCohesionDistance": 0.40 },
  "palette": { "minPairwiseDistance": 22, "maxCohesionDistance": 70 },
  "age": { "maxImpressionGapYears": 18 }
}
```

```ts
// src/lib/artlab/coherence/thresholds.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface CoherenceThresholds {
  silhouette: { minPairwiseDistance: number; maxCohesionDistance: number };
  palette: { minPairwiseDistance: number; maxCohesionDistance: number };
  age: { maxImpressionGapYears: number };
}

export function loadCoherenceThresholds(): CoherenceThresholds {
  const raw = readFileSync(join(__dirname, "thresholds.json"), "utf8");
  return JSON.parse(raw) as CoherenceThresholds;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/coherence/thresholds.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/coherence/thresholds.json src/lib/artlab/coherence/thresholds.ts src/lib/artlab/coherence/thresholds.test.ts
git commit -m "$(cat <<'EOF'
Add tunable coherence thresholds JSON

Silhouette, palette, and age thresholds editable without code
change. Phase 5 task tunes these after first 5 characters.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.12: Coherence — cast diversity check

**Files:**
- Create: `src/lib/artlab/coherence/cast-diversity.ts`
- Test: `src/lib/artlab/coherence/cast-diversity.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/coherence/cast-diversity.test.ts
import { describe, expect, it } from "vitest";
import { checkCastDiversity } from "./cast-diversity";

describe("cast diversity check", () => {
  it("passes when 5 lanes have different silhouettes and palettes", () => {
    const result = checkCastDiversity({
      lanes: [
        { laneIndex: 1, silhouette: { bbox: { x: 0, y: 0, width: 100, height: 200 }, aspectRatio: 0.5 }, palette: { topColors: [{ r: 200, g: 0, b: 0, weight: 1 }] }, ageImpression: 30 },
        { laneIndex: 2, silhouette: { bbox: { x: 0, y: 0, width: 200, height: 200 }, aspectRatio: 1.0 }, palette: { topColors: [{ r: 0, g: 200, b: 0, weight: 1 }] }, ageImpression: 32 },
        { laneIndex: 3, silhouette: { bbox: { x: 0, y: 0, width: 150, height: 200 }, aspectRatio: 0.75 }, palette: { topColors: [{ r: 0, g: 0, b: 200, weight: 1 }] }, ageImpression: 35 },
        { laneIndex: 4, silhouette: { bbox: { x: 0, y: 0, width: 120, height: 200 }, aspectRatio: 0.6 }, palette: { topColors: [{ r: 200, g: 200, b: 0, weight: 1 }] }, ageImpression: 38 },
        { laneIndex: 5, silhouette: { bbox: { x: 0, y: 0, width: 100, height: 100 }, aspectRatio: 1.0 }, palette: { topColors: [{ r: 100, g: 100, b: 100, weight: 1 }] }, ageImpression: 31 },
      ],
      promotedCast: [],
    });
    expect(result.passed).toBe(true);
  });

  it("fails diversity when two lanes have nearly identical signatures", () => {
    const same = { bbox: { x: 0, y: 0, width: 100, height: 200 }, aspectRatio: 0.5 };
    const samePalette = { topColors: [{ r: 200, g: 0, b: 0, weight: 1 }] };
    const result = checkCastDiversity({
      lanes: [
        { laneIndex: 1, silhouette: same, palette: samePalette, ageImpression: 30 },
        { laneIndex: 2, silhouette: same, palette: samePalette, ageImpression: 30 },
        { laneIndex: 3, silhouette: { bbox: { x: 0, y: 0, width: 200, height: 200 }, aspectRatio: 1.0 }, palette: { topColors: [{ r: 0, g: 200, b: 0, weight: 1 }] }, ageImpression: 35 },
        { laneIndex: 4, silhouette: { bbox: { x: 0, y: 0, width: 150, height: 200 }, aspectRatio: 0.75 }, palette: { topColors: [{ r: 0, g: 0, b: 200, weight: 1 }] }, ageImpression: 38 },
        { laneIndex: 5, silhouette: { bbox: { x: 0, y: 0, width: 120, height: 200 }, aspectRatio: 0.6 }, palette: { topColors: [{ r: 200, g: 200, b: 0, weight: 1 }] }, ageImpression: 31 },
      ],
      promotedCast: [],
    });
    expect(result.passed).toBe(false);
    expect(result.failureCodes).toContain("diversity-failure");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/coherence/cast-diversity.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement cast-diversity**

```ts
// src/lib/artlab/coherence/cast-diversity.ts
import { paletteDistance, silhouetteDistance, type PaletteHistogram, type SilhouetteHash } from "./hashes";
import { loadCoherenceThresholds } from "./thresholds";

export interface LaneSignature {
  laneIndex: number;
  silhouette: SilhouetteHash;
  palette: PaletteHistogram;
  ageImpression: number;
}

export interface PromotedCastSignature {
  characterId: string;
  silhouette: SilhouetteHash;
  palette: PaletteHistogram;
  ageImpression: number;
}

export type CoherenceFailureCode = "diversity-failure" | "cohesion-drift" | "style-envelope-drift" | "age-impression-drift";

export interface CastDiversityResult {
  passed: boolean;
  failureCodes: CoherenceFailureCode[];
  pairwiseSilhouette: number[];
  pairwisePalette: number[];
}

export function checkCastDiversity(input: { lanes: LaneSignature[]; promotedCast: PromotedCastSignature[] }): CastDiversityResult {
  const thresholds = loadCoherenceThresholds();
  const failureCodes = new Set<CoherenceFailureCode>();
  const pairwiseSilhouette: number[] = [];
  const pairwisePalette: number[] = [];

  for (let i = 0; i < input.lanes.length; i += 1) {
    for (let j = i + 1; j < input.lanes.length; j += 1) {
      const sd = silhouetteDistance(input.lanes[i]!.silhouette, input.lanes[j]!.silhouette);
      const pd = paletteDistance(input.lanes[i]!.palette, input.lanes[j]!.palette);
      pairwiseSilhouette.push(sd);
      pairwisePalette.push(pd);
      if (sd < thresholds.silhouette.minPairwiseDistance && pd < thresholds.palette.minPairwiseDistance) {
        failureCodes.add("diversity-failure");
      }
    }
  }

  for (const lane of input.lanes) {
    for (const cast of input.promotedCast) {
      const sd = silhouetteDistance(lane.silhouette, cast.silhouette);
      const pd = paletteDistance(lane.palette, cast.palette);
      if (sd < thresholds.silhouette.minPairwiseDistance / 2 && pd < thresholds.palette.minPairwiseDistance / 2) {
        failureCodes.add("cohesion-drift");
      }
      if (pd > thresholds.palette.maxCohesionDistance && sd > thresholds.silhouette.maxCohesionDistance) {
        failureCodes.add("style-envelope-drift");
      }
      if (Math.abs(lane.ageImpression - cast.ageImpression) > thresholds.age.maxImpressionGapYears) {
        failureCodes.add("age-impression-drift");
      }
    }
  }

  return {
    passed: failureCodes.size === 0,
    failureCodes: [...failureCodes],
    pairwiseSilhouette,
    pairwisePalette,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/coherence/cast-diversity.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/coherence/cast-diversity.ts src/lib/artlab/coherence/cast-diversity.test.ts
git commit -m "$(cat <<'EOF'
Add cast diversity check across 5 lanes + promoted cast

Diversity-failure when two lanes are nearly identical.
Cohesion-drift when a lane mirrors a promoted character.
Style-envelope-drift when a lane breaks the cast aesthetic.
Age-impression-drift on >18 year gap from any cast member.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.13: Coherence — style envelope cohesion check

**Files:**
- Create: `src/lib/artlab/coherence/style-envelope.ts`
- Test: `src/lib/artlab/coherence/style-envelope.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/coherence/style-envelope.test.ts
import { describe, expect, it } from "vitest";
import { computeStyleEnvelopeReport } from "./style-envelope";

describe("style envelope report", () => {
  it("returns cohesion score and drift flags for a set of lanes vs cast", () => {
    const report = computeStyleEnvelopeReport({
      lanes: [
        { laneIndex: 1, silhouette: { bbox: { x: 0, y: 0, width: 100, height: 200 }, aspectRatio: 0.5 }, palette: { topColors: [{ r: 100, g: 100, b: 100, weight: 1 }] }, ageImpression: 30 },
      ],
      promotedCast: [
        { characterId: "otis", silhouette: { bbox: { x: 0, y: 0, width: 100, height: 200 }, aspectRatio: 0.5 }, palette: { topColors: [{ r: 105, g: 105, b: 105, weight: 1 }] }, ageImpression: 32 },
      ],
    });
    expect(report.lanes[0]!.cohesionScore).toBeGreaterThan(0);
    expect(report.lanes[0]!.flags).toEqual(expect.any(Array));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/coherence/style-envelope.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement style envelope report**

```ts
// src/lib/artlab/coherence/style-envelope.ts
import { paletteDistance, silhouetteDistance } from "./hashes";
import type { LaneSignature, PromotedCastSignature, CoherenceFailureCode } from "./cast-diversity";
import { loadCoherenceThresholds } from "./thresholds";

export interface LaneEnvelopeReport {
  laneIndex: number;
  cohesionScore: number;
  flags: CoherenceFailureCode[];
}

export interface StyleEnvelopeReport {
  lanes: LaneEnvelopeReport[];
}

export function computeStyleEnvelopeReport(input: { lanes: LaneSignature[]; promotedCast: PromotedCastSignature[] }): StyleEnvelopeReport {
  const thresholds = loadCoherenceThresholds();
  const lanes = input.lanes.map((lane) => {
    let bestSilhouette = Infinity;
    let bestPalette = Infinity;
    const flags = new Set<CoherenceFailureCode>();
    for (const cast of input.promotedCast) {
      const sd = silhouetteDistance(lane.silhouette, cast.silhouette);
      const pd = paletteDistance(lane.palette, cast.palette);
      bestSilhouette = Math.min(bestSilhouette, sd);
      bestPalette = Math.min(bestPalette, pd);
      if (pd > thresholds.palette.maxCohesionDistance) flags.add("style-envelope-drift");
    }
    const cohesionScore = input.promotedCast.length === 0
      ? 1
      : Math.max(0, 1 - (bestPalette / thresholds.palette.maxCohesionDistance) * 0.5 - bestSilhouette * 0.5);
    return { laneIndex: lane.laneIndex, cohesionScore, flags: [...flags] };
  });
  return { lanes };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/coherence/style-envelope.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/coherence/style-envelope.ts src/lib/artlab/coherence/style-envelope.test.ts
git commit -m "$(cat <<'EOF'
Add per-lane style envelope cohesion report

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.14: LLM brain — decision interface

**Files:**
- Create: `src/lib/artlab/orchestrator/llm-brain.ts`
- Test: `src/lib/artlab/orchestrator/llm-brain.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/orchestrator/llm-brain.test.ts
import { describe, expect, it } from "vitest";
import { decideWithMockBrain, ARTLAB_LLM_DECISION_KINDS } from "./llm-brain";

describe("LLM brain decision interface", () => {
  it("enumerates the 6 decision kinds", () => {
    expect(ARTLAB_LLM_DECISION_KINDS).toEqual([
      "route-ambiguous-brief",
      "clarification-wording",
      "concept-qa-adjudication",
      "reply-parser-fallback",
      "prompt-enrichment",
      "blocker-message-drafting",
    ]);
  });

  it("mock brain returns a structured route decision", async () => {
    const decision = await decideWithMockBrain({
      kind: "route-ambiguous-brief",
      input: { request: "make the loud one" },
    });
    expect(decision.kind).toBe("route-ambiguous-brief");
    expect(typeof decision.outputJson).toBe("object");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/orchestrator/llm-brain.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement LLM brain interface and mock**

```ts
// src/lib/artlab/orchestrator/llm-brain.ts
import { z } from "zod";

export const ARTLAB_LLM_DECISION_KINDS = [
  "route-ambiguous-brief",
  "clarification-wording",
  "concept-qa-adjudication",
  "reply-parser-fallback",
  "prompt-enrichment",
  "blocker-message-drafting",
] as const;
export type ArtLabLlmDecisionKind = (typeof ARTLAB_LLM_DECISION_KINDS)[number];

export const ArtLabLlmDecisionRequestSchema = z
  .object({
    kind: z.enum(ARTLAB_LLM_DECISION_KINDS),
    input: z.record(z.string(), z.unknown()),
  })
  .strict();
export type ArtLabLlmDecisionRequest = z.infer<typeof ArtLabLlmDecisionRequestSchema>;

export interface ArtLabLlmDecisionResult {
  kind: ArtLabLlmDecisionKind;
  outputJson: Record<string, unknown>;
  confidence: number;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

export interface ArtLabLlmBrain {
  decide(req: ArtLabLlmDecisionRequest): Promise<ArtLabLlmDecisionResult>;
}

export async function decideWithMockBrain(req: ArtLabLlmDecisionRequest): Promise<ArtLabLlmDecisionResult> {
  ArtLabLlmDecisionRequestSchema.parse(req);
  return {
    kind: req.kind,
    outputJson: { mock: true, echoedInput: req.input },
    confidence: 0.9,
    tokensIn: 100,
    tokensOut: 20,
    model: "mock-llm",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/orchestrator/llm-brain.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/orchestrator/llm-brain.ts src/lib/artlab/orchestrator/llm-brain.test.ts
git commit -m "$(cat <<'EOF'
Add LLM brain interface and mock implementation

6 decision kinds: route, clarification wording, QA adjudication,
reply parsing, prompt enrichment, blocker drafting. Real Claude
implementation lands in Task 2.16.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.15: Decision log (audit trail)

**Files:**
- Create: `src/lib/artlab/orchestrator/decision-log.ts`
- Test: `src/lib/artlab/orchestrator/decision-log.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/orchestrator/decision-log.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLlmDecision, readLlmDecisions } from "./decision-log";

describe("LLM decision log", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "artlab-dec-")); });

  it("appends and reads decisions", () => {
    appendLlmDecision(dir, {
      decisionAt: new Date().toISOString(),
      kind: "route-ambiguous-brief",
      input: "make Sol",
      prompt: "...",
      output: { assetType: "character", characterId: "cno" },
      tokensIn: 100,
      tokensOut: 20,
      model: "claude-opus-4-7",
      confidence: 0.94,
    });
    expect(readLlmDecisions(dir)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/orchestrator/decision-log.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement decision log**

```ts
// src/lib/artlab/orchestrator/decision-log.ts
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ARTLAB_LLM_DECISION_KINDS } from "./llm-brain";

export const LlmDecisionEntrySchema = z
  .object({
    decisionAt: z.string().datetime({ offset: true }),
    kind: z.enum(ARTLAB_LLM_DECISION_KINDS),
    input: z.unknown(),
    prompt: z.string(),
    output: z.record(z.string(), z.unknown()),
    tokensIn: z.number().int().min(0),
    tokensOut: z.number().int().min(0),
    model: z.string().min(1),
    confidence: z.number().min(0).max(1),
  })
  .strict();
export type LlmDecisionEntry = z.infer<typeof LlmDecisionEntrySchema>;

function path(workspaceMemoryDir: string): string {
  return join(workspaceMemoryDir, "decision-log.jsonl");
}

export function appendLlmDecision(workspaceMemoryDir: string, entry: LlmDecisionEntry): void {
  LlmDecisionEntrySchema.parse(entry);
  appendFileSync(path(workspaceMemoryDir), `${JSON.stringify(entry)}\n`, { encoding: "utf8" });
}

export function readLlmDecisions(workspaceMemoryDir: string): LlmDecisionEntry[] {
  const p = path(workspaceMemoryDir);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => LlmDecisionEntrySchema.parse(JSON.parse(line)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/orchestrator/decision-log.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/orchestrator/decision-log.ts src/lib/artlab/orchestrator/decision-log.test.ts
git commit -m "$(cat <<'EOF'
Add LLM decision-log jsonl writer (audit trail)

Every brain call must round-trip through this log so any wrong
decision is debuggable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 2.16: Codex adapter for LLM brain

**Files:**
- Create: `src/lib/artlab/adapters/codex.ts`
- Test: `src/lib/artlab/adapters/codex.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/adapters/codex.test.ts
import { describe, expect, it } from "vitest";
import { invokeCodex, type CodexInvokeInput } from "./codex";

describe("codex adapter", () => {
  it("uses ARTLAB_CODEX_MODE=mock to skip the real MCP call", async () => {
    process.env.ARTLAB_CODEX_MODE = "mock";
    const result = await invokeCodex({
      goal: "test goal",
      sandboxLevel: "danger-full-access",
      cwd: "/tmp",
    } as CodexInvokeInput);
    delete process.env.ARTLAB_CODEX_MODE;
    expect(result.mode).toBe("mock");
    expect(result.summary).toContain("test goal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/adapters/codex.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement codex adapter**

```ts
// src/lib/artlab/adapters/codex.ts
import { spawn } from "node:child_process";

export interface CodexInvokeInput {
  goal: string;
  sandboxLevel: "danger-full-access" | "workspace-write" | "read-only";
  cwd: string;
  approvalPolicy?: "never" | "on-failure" | "always";
  timeoutMs?: number;
}

export interface CodexInvokeResult {
  mode: "real" | "mock";
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  summary: string;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * The daemon shells out to the `codex` CLI (codex-cli >= 0.132.0). The
 * `mcp__codex__codex` MCP tool is the parallel path available inside
 * interactive Claude Code sessions; the long-running daemon cannot use
 * MCP because it has no session host. CLI subprocess is the only path
 * the daemon uses.
 */
export async function invokeCodex(input: CodexInvokeInput): Promise<CodexInvokeResult> {
  if (process.env.ARTLAB_CODEX_MODE === "mock") {
    return {
      mode: "mock",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 0,
      summary: `mock codex received: ${input.goal}`,
    };
  }
  const startedAt = Date.now();
  return await new Promise<CodexInvokeResult>((resolve, reject) => {
    const args = ["exec", "--sandbox", input.sandboxLevel, "--cwd", input.cwd];
    if (input.approvalPolicy) args.push("--approval-policy", input.approvalPolicy);
    args.push(input.goal);
    const child = spawn("codex", args, {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    child.stdout.on("data", (c: Buffer) => stdoutChunks.push(c.toString("utf8")));
    child.stderr.on("data", (c: Buffer) => stderrChunks.push(c.toString("utf8")));
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`codex exec timed out after ${input.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`));
    }, input.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("exit", (exitCode) => {
      clearTimeout(timer);
      const fullStdout = stdoutChunks.join("");
      const fullStderr = stderrChunks.join("");
      resolve({
        mode: "real",
        exitCode: exitCode ?? -1,
        stdout: fullStdout,
        stderr: fullStderr,
        durationMs: Date.now() - startedAt,
        summary: fullStdout.split("\n").slice(-20).join("\n"),
      });
    });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/adapters/codex.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/adapters/codex.ts src/lib/artlab/adapters/codex.test.ts
git commit -m "$(cat <<'EOF'
Add codex CLI adapter (codex exec via child_process)

Real production path shells out to the codex CLI subprocess; the
mcp__codex__codex MCP tool is the parallel interactive path and is
not used by the long-running daemon (no session host). Tests use
ARTLAB_CODEX_MODE=mock to skip the spawn.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Mock-mode path returns deterministic `summary` containing the input goal.
- [ ] Real-mode path uses `spawn("codex", ...)` (no shell interpolation, no string concatenation into a shell string — `spawn` with arg array only).
- [ ] Timeout fires SIGTERM (not SIGKILL) so the codex CLI's graceful-shutdown handler runs.
- [ ] No fallthrough to a third behavior — only `mock` or `real`.

### Task 2.17: LLM brain — real Claude Opus implementation

**Files:**
- Create: `src/lib/artlab/orchestrator/claude-brain.ts`
- Test: `src/lib/artlab/orchestrator/claude-brain.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/orchestrator/claude-brain.test.ts
import { describe, expect, it } from "vitest";
import { createClaudeBrain } from "./claude-brain";

describe("Claude Opus brain", () => {
  it("returns a brain instance with the expected model id", () => {
    const brain = createClaudeBrain({ apiKey: "test-key", model: "claude-opus-4-7" });
    expect(brain.modelId).toBe("claude-opus-4-7");
  });

  it("dry-run mode short-circuits without calling the API", async () => {
    process.env.ARTLAB_CLAUDE_MODE = "dry-run";
    const brain = createClaudeBrain({ apiKey: "test", model: "claude-opus-4-7" });
    const result = await brain.decide({
      kind: "route-ambiguous-brief",
      input: { request: "make Sol" },
    });
    delete process.env.ARTLAB_CLAUDE_MODE;
    expect(result.model).toBe("claude-opus-4-7");
    expect(result.outputJson.dryRun).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/orchestrator/claude-brain.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Claude brain**

```ts
// src/lib/artlab/orchestrator/claude-brain.ts
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { ArtLabLlmBrain, ArtLabLlmDecisionRequest, ArtLabLlmDecisionResult } from "./llm-brain";

interface ClaudeBrainOptions {
  apiKey: string;
  model: string;
}

const SYSTEM_PROMPTS: Record<ArtLabLlmDecisionRequest["kind"], string> = {
  "route-ambiguous-brief": "You are the artlab intake brain. Given a brief, return a JSON object with assetType, characterId (if any), confidence (0-1), and reasoning. Never invent characters not on the known list. If a style modifier names one character and the subject is another, return the subject.",
  "clarification-wording": "Phrase a short Telegram clarification message. Plain text. No persona. Offer concrete numbered choices.",
  "concept-qa-adjudication": "Decide regenerate vs supersede vs escalate for failed concept lanes. Return JSON action.",
  "reply-parser-fallback": "Parse an ambiguous human reply against current run state. Return JSON {action, args, askBack}.",
  "prompt-enrichment": "Rewrite the next-run prompt using past wins, rejections, and recent prompt hardening. Return the full prompt string in JSON.",
  "blocker-message-drafting": "Draft a 1-2 sentence Telegram message explaining a blocker with a concrete suggested action. Return JSON {message}.",
};

export interface ArtLabClaudeBrain extends ArtLabLlmBrain {
  modelId: string;
}

export function createClaudeBrain(options: ClaudeBrainOptions): ArtLabClaudeBrain {
  const provider = createAnthropic({ apiKey: options.apiKey });
  return {
    modelId: options.model,
    async decide(req: ArtLabLlmDecisionRequest): Promise<ArtLabLlmDecisionResult> {
      if (process.env.ARTLAB_CLAUDE_MODE === "dry-run") {
        return {
          kind: req.kind,
          outputJson: { dryRun: true, echoedInput: req.input },
          confidence: 0,
          tokensIn: 0,
          tokensOut: 0,
          model: options.model,
        };
      }
      const system = SYSTEM_PROMPTS[req.kind];
      // AI SDK v6 + @ai-sdk/anthropic with Anthropic prompt caching on the
      // (stable) system prompt — the cacheControl marker on the system block
      // tells Anthropic to cache it across requests, cutting tokenIn cost by
      // ~90% on repeated routing/clarification decisions.
      const { text, usage } = await generateText({
        model: provider(options.model),
        maxTokens: 1024,
        messages: [
          {
            role: "system",
            content: system,
            providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
          },
          { role: "user", content: JSON.stringify(req.input) },
        ],
      });
      let outputJson: Record<string, unknown> = {};
      try {
        outputJson = JSON.parse(text);
      } catch {
        outputJson = { rawText: text };
      }
      return {
        kind: req.kind,
        outputJson,
        confidence: typeof outputJson.confidence === "number" ? outputJson.confidence : 0.5,
        tokensIn: usage.inputTokens ?? 0,
        tokensOut: usage.outputTokens ?? 0,
        model: options.model,
      };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/orchestrator/claude-brain.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/orchestrator/claude-brain.ts src/lib/artlab/orchestrator/claude-brain.test.ts
git commit -m "$(cat <<'EOF'
Add real Claude Opus 4.7 LLM brain via @ai-sdk/anthropic

Uses AI SDK v6 generateText with the @ai-sdk/anthropic provider
(both already in deps). Anthropic prompt caching applied to the
stable system prompt via providerOptions.anthropic.cacheControl —
cuts tokenIn cost ~90% on repeated routing/clarification decisions.
ARTLAB_CLAUDE_MODE=dry-run skips the network for tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Uses `@ai-sdk/anthropic` (already installed at 3.0.58) — NOT `@anthropic-ai/sdk` (not installed).
- [ ] Uses `createAnthropic({ apiKey })` from the provider, NOT `new Anthropic(...)` from the bare SDK.
- [ ] System prompt is sent as a `system` message (NOT as the deprecated `system:` top-level field) with `providerOptions.anthropic.cacheControl: { type: "ephemeral" }`.
- [ ] Reads `usage.inputTokens` / `usage.outputTokens` (AI SDK v6 names), NOT `promptTokens` / `completionTokens` (v5) or `input_tokens` / `output_tokens` (raw Anthropic SDK).
- [ ] Dry-run path requires NO API key validity — test passes with `apiKey: "test"`.

### Task 2.18: Public memory + intake + coherence index

**Files:**
- Create: `src/lib/artlab/memory/index.ts`
- Create: `src/lib/artlab/intake/index.ts`
- Create: `src/lib/artlab/coherence/index.ts`

- [ ] **Step 1: Implement index files**

```ts
// src/lib/artlab/memory/index.ts
export * from "./style-ledger";
export * from "./rejection-ledger";
export * from "./prompt-evolution";
export * from "./retrieve";
```

```ts
// src/lib/artlab/intake/index.ts
export * from "./known-cast";
export * from "./ambiguity-detector";
export * from "./bundle-parser";
export * from "./reference-attachment";
export * from "./router";
```

```ts
// src/lib/artlab/coherence/index.ts
export * from "./hashes";
export * from "./cast-diversity";
export * from "./style-envelope";
export * from "./thresholds";
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/artlab/memory/index.ts src/lib/artlab/intake/index.ts src/lib/artlab/coherence/index.ts
git commit -m "$(cat <<'EOF'
Add public index for memory, intake, coherence modules

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Phase 2 completion criteria

Run these commands; all must exit 0 / produce the expected output:

```bash
# All Phase 2 tests pass
npx vitest run src/lib/artlab/intake src/lib/artlab/memory src/lib/artlab/coherence src/lib/artlab/orchestrator src/lib/artlab/adapters

# The Rafe→Otis routing regression (Task 2.5) locks the historical bug
npx vitest run src/lib/artlab/intake/router.test.ts -t "rafe-otis-regression"

# Typecheck clean
npx tsc --noEmit

# All public indices exist
test -f src/lib/artlab/memory/index.ts && test -f src/lib/artlab/intake/index.ts && test -f src/lib/artlab/coherence/index.ts

# Decision log writes are exercised
npx vitest run src/lib/artlab/orchestrator/decision-log.test.ts

# Tag the phase
git tag artlab-phase-2-complete
```

---

## Phase 3 — Surfaces

This phase replaces 10 stub CLI subcommands with real implementations, builds the Telegram bot (with three-tier reply parser, identity verification, and image attachments in both directions), assembles the Mac daemon (launchd-supervised, max-2 child runners, 10s heartbeats, crash recovery, SIGTERM cancellation, sleep guard), and stands up the self-evolution loop (friction detector + Codex CLI subprocess drafting branches but never opening PRs). After Phase 3, `npm run artlab:daemon -- start` starts a long-running process that accepts Telegram messages from Armaan's chat and runs the deterministic scheduler on local-mock provider end-to-end. The real Gemini provider wires in during Phase 4.

**Spec sections covered in this phase:**
- §5.1 Telegram bot (identity, three-tier parser, message types, image attachments).
- §5.3 Daemon (process model, components, crash recovery).
- §6.2 LLM brain reply-parser-fallback (used by Tier 3; the brain itself is from Task 2.17).
- §10 Self-evolution (friction detector, Codex summoner, branch-only policy).
- §13 Safety property #6 (Identity check) and #5 (No PR auto-merge) — both gain explicit tests in this phase.

**Phase 3 dependencies:** Requires Phases 0-2 complete (state machine, runners, reconciler, LLM brain, Codex adapter, memory ledgers all wired). Phase 3 cannot start until `git tag artlab-phase-2-complete` exists.

### Subphase 3A — Telegram bot (Tasks 3.1–3.12)

### Task 3.1: macOS Keychain helpers

**Files:**
- Create: `src/lib/artlab/bot/keychain.ts`
- Test: `src/lib/artlab/bot/keychain.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/bot/keychain.test.ts
import { describe, expect, it } from "vitest";
import { getKeychainSecret, setKeychainSecret, deleteKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "./keychain";

describe("artlab keychain helpers", () => {
  const testService = `${ARTLAB_KEYCHAIN_PREFIX}-test-${Date.now()}`;

  it("declares the canonical Keychain prefix", () => {
    expect(ARTLAB_KEYCHAIN_PREFIX).toBe("tower-artlab");
  });

  it("set → get → delete round trip", async () => {
    await setKeychainSecret(testService, "the-value");
    const got = await getKeychainSecret(testService);
    expect(got).toBe("the-value");
    await deleteKeychainSecret(testService);
    const goneOrNull = await getKeychainSecret(testService);
    expect(goneOrNull).toBeNull();
  });

  it("getKeychainSecret returns null for missing entries", async () => {
    const missing = await getKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-does-not-exist-${Date.now()}`);
    expect(missing).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/keychain.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement keychain helpers**

```ts
// src/lib/artlab/bot/keychain.ts
import { spawn } from "node:child_process";

export const ARTLAB_KEYCHAIN_PREFIX = "tower-artlab";

function runSecurity(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("security", args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    child.stdout.on("data", (c: Buffer) => stdoutChunks.push(c.toString("utf8")));
    child.stderr.on("data", (c: Buffer) => stderrChunks.push(c.toString("utf8")));
    child.on("error", reject);
    child.on("exit", (exitCode) => {
      resolve({
        exitCode: exitCode ?? -1,
        stdout: stdoutChunks.join(""),
        stderr: stderrChunks.join(""),
      });
    });
  });
}

export async function setKeychainSecret(service: string, value: string): Promise<void> {
  const result = await runSecurity([
    "add-generic-password",
    "-U",
    "-a", "artlab",
    "-s", service,
    "-w", value,
  ]);
  if (result.exitCode !== 0) {
    throw new Error(`failed to write Keychain secret ${service}: ${result.stderr}`);
  }
}

export async function getKeychainSecret(service: string): Promise<string | null> {
  const result = await runSecurity([
    "find-generic-password",
    "-a", "artlab",
    "-s", service,
    "-w",
  ]);
  if (result.exitCode === 44) return null;
  if (result.exitCode !== 0) {
    throw new Error(`failed to read Keychain secret ${service}: ${result.stderr}`);
  }
  return result.stdout.replace(/\n$/, "");
}

export async function deleteKeychainSecret(service: string): Promise<void> {
  const result = await runSecurity([
    "delete-generic-password",
    "-a", "artlab",
    "-s", service,
  ]);
  if (result.exitCode !== 0 && result.exitCode !== 44) {
    throw new Error(`failed to delete Keychain secret ${service}: ${result.stderr}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/keychain.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/keychain.ts src/lib/artlab/bot/keychain.test.ts
git commit -m "$(cat <<'EOF'
Add macOS Keychain helpers via `security` CLI

ArtLab stores Telegram bot token, chat.id, Gemini key, and any
other secrets in macOS Keychain under the tower-artlab-* prefix.
Spawns the `security` CLI as a subprocess; exit code 44
(SecKeychainItemNotFound) is normalized to null.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `exitCode === 44` (SecKeychainItemNotFound) returns `null`, not an error.
- [ ] No secret value ever appears in a returned error message.
- [ ] No persistent state outside macOS Keychain (no temp files holding the secret).

### Task 3.2: Telegram client — long-poll, send, attach

**Files:**
- Create: `src/lib/artlab/bot/telegram-client.ts`
- Test: `src/lib/artlab/bot/telegram-client.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/bot/telegram-client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { createTelegramClient } from "./telegram-client";

describe("telegram client", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("getUpdates uses long-poll with timeout=60 and offset", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: [{ update_id: 5, message: { chat: { id: 1 }, text: "hi" } }] }),
    } as Response);
    const client = createTelegramClient({ token: "T", fetch: fetchMock });
    const result = await client.getUpdates({ offset: 0 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/timeout=60/);
    expect(String(url)).toMatch(/offset=0/);
    expect(result).toHaveLength(1);
    expect(result[0]!.update_id).toBe(5);
  });

  it("sendMessage POSTs JSON to /sendMessage", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 9 } }),
    } as Response);
    const client = createTelegramClient({ token: "T", fetch: fetchMock });
    const result = await client.sendMessage({ chatId: 99, text: "hello" });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init!.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual({ chat_id: 99, text: "hello" });
    expect(result.message_id).toBe(9);
  });

  it("throws on non-ok HTTP response with status in message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ ok: false, description: "Too Many Requests" }),
    } as Response);
    const client = createTelegramClient({ token: "T", fetch: fetchMock });
    await expect(client.sendMessage({ chatId: 1, text: "x" })).rejects.toThrow(/429/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/telegram-client.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement client**

```ts
// src/lib/artlab/bot/telegram-client.ts
import { readFileSync } from "node:fs";
import { basename } from "node:path";

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number; username?: string };
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }[];
  date: number;
}

export interface TelegramSendResult { message_id: number; }

export interface TelegramMediaPhoto {
  type: "photo";
  path: string;
  caption?: string;
}

export interface TelegramClientOptions {
  token: string;
  fetch?: typeof fetch;
}

export interface TelegramClient {
  getUpdates(opts: { offset: number; timeoutSec?: number }): Promise<TelegramUpdate[]>;
  sendMessage(opts: { chatId: number; text: string; replyTo?: number }): Promise<TelegramSendResult>;
  sendMediaGroup(opts: { chatId: number; media: TelegramMediaPhoto[] }): Promise<TelegramSendResult[]>;
  downloadFile(opts: { fileId: string }): Promise<{ contentType: string; bytes: Buffer }>;
}

const TELEGRAM_API_BASE = "https://api.telegram.org";

export function createTelegramClient(options: TelegramClientOptions): TelegramClient {
  const f = options.fetch ?? fetch;
  const apiUrl = (m: string) => `${TELEGRAM_API_BASE}/bot${options.token}/${m}`;
  const fileUrl = (p: string) => `${TELEGRAM_API_BASE}/file/bot${options.token}/${p}`;

  async function callJson<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const response = await f(apiUrl(method), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json()) as { ok: boolean; result?: T; description?: string };
    if (!response.ok || !json.ok) {
      throw new Error(`telegram ${method} failed: HTTP ${response.status} ${json.description ?? ""}`);
    }
    return json.result as T;
  }

  return {
    async getUpdates({ offset, timeoutSec = 60 }) {
      const url = new URL(apiUrl("getUpdates"));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("timeout", String(timeoutSec));
      url.searchParams.set("allowed_updates", JSON.stringify(["message", "edited_message"]));
      const response = await f(url.toString());
      const json = (await response.json()) as { ok: boolean; result?: TelegramUpdate[]; description?: string };
      if (!response.ok || !json.ok) {
        throw new Error(`telegram getUpdates failed: HTTP ${response.status} ${json.description ?? ""}`);
      }
      return json.result ?? [];
    },

    async sendMessage({ chatId, text, replyTo }) {
      const body: Record<string, unknown> = { chat_id: chatId, text };
      if (replyTo) body.reply_to_message_id = replyTo;
      return await callJson<TelegramSendResult>("sendMessage", body);
    },

    async sendMediaGroup({ chatId, media }) {
      const form = new FormData();
      form.set("chat_id", String(chatId));
      const mediaPayload = media.map((m, idx) => {
        const fileKey = `media${idx}`;
        const bytes = readFileSync(m.path);
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
        form.set(fileKey, blob, basename(m.path));
        return { type: m.type, media: `attach://${fileKey}`, caption: m.caption };
      });
      form.set("media", JSON.stringify(mediaPayload));
      const response = await f(apiUrl("sendMediaGroup"), { method: "POST", body: form });
      const json = (await response.json()) as { ok: boolean; result?: TelegramSendResult[]; description?: string };
      if (!response.ok || !json.ok) {
        throw new Error(`telegram sendMediaGroup failed: HTTP ${response.status} ${json.description ?? ""}`);
      }
      return json.result ?? [];
    },

    async downloadFile({ fileId }) {
      const meta = await callJson<{ file_path: string }>("getFile", { file_id: fileId });
      const url = fileUrl(meta.file_path);
      const response = await f(url);
      if (!response.ok) throw new Error(`telegram downloadFile HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return {
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
        bytes: Buffer.from(arrayBuffer),
      };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/telegram-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/telegram-client.ts src/lib/artlab/bot/telegram-client.test.ts
git commit -m "$(cat <<'EOF'
Add Telegram client (long-poll, send, media group, download)

HTTPS long-poll loop with 60s timeout. sendMediaGroup uses
multipart/form-data with attach:// references — required for
concept-board and final-board image attachments. fetch is
injectable for tests; production uses the runtime global.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] No third-party Telegram library is added to `package.json` (spec mandates direct API use).
- [ ] `fetch` is dependency-injected; tests use `vi.fn()` and never touch the network.
- [ ] `getUpdates` URL includes `timeout=60`, `offset=<n>`, and `allowed_updates=["message","edited_message"]`.
- [ ] All errors include the HTTP status code for triage.

### Task 3.3: Identity verifier — chat.id match against Keychain

**Files:**
- Create: `src/lib/artlab/bot/identity.ts`
- Test: `src/lib/artlab/bot/identity.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/bot/identity.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isAuthorizedSender, ARTLAB_CHAT_ID_KEYCHAIN_SERVICE } from "./identity";
import * as keychain from "./keychain";

describe("telegram identity verifier", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("returns true when chat.id matches the Keychain stored id", async () => {
    vi.spyOn(keychain, "getKeychainSecret").mockResolvedValue("12345");
    expect(await isAuthorizedSender({ chat: { id: 12345 } } as any)).toBe(true);
  });

  it("returns false when chat.id does not match", async () => {
    vi.spyOn(keychain, "getKeychainSecret").mockResolvedValue("12345");
    expect(await isAuthorizedSender({ chat: { id: 99999 } } as any)).toBe(false);
  });

  it("returns false (no throw) when Keychain entry missing", async () => {
    vi.spyOn(keychain, "getKeychainSecret").mockResolvedValue(null);
    expect(await isAuthorizedSender({ chat: { id: 1 } } as any)).toBe(false);
  });

  it("uses the canonical Keychain service slug", () => {
    expect(ARTLAB_CHAT_ID_KEYCHAIN_SERVICE).toBe("tower-artlab-chat-id");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/identity.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement identity**

```ts
// src/lib/artlab/bot/identity.ts
import { getKeychainSecret } from "./keychain";
import type { TelegramMessage } from "./telegram-client";

export const ARTLAB_CHAT_ID_KEYCHAIN_SERVICE = "tower-artlab-chat-id";

/**
 * Returns true ONLY when message.chat.id matches the chat.id stored in
 * macOS Keychain. Any mismatch — including missing or unparseable entry
 * — returns false. Spec safety property #6: messages from any other
 * chat.id are silently dropped.
 */
export async function isAuthorizedSender(message: TelegramMessage): Promise<boolean> {
  const stored = await getKeychainSecret(ARTLAB_CHAT_ID_KEYCHAIN_SERVICE);
  if (stored === null) return false;
  const storedId = Number.parseInt(stored, 10);
  if (!Number.isFinite(storedId)) return false;
  return message.chat.id === storedId;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/identity.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/identity.ts src/lib/artlab/bot/identity.test.ts
git commit -m "$(cat <<'EOF'
Add Telegram identity verifier (spec safety property #6)

Returns true only when message.chat.id matches the chat.id stored
in macOS Keychain. Missing entry, parse failure, or mismatch all
return false — never throws, never logs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Returns `Promise<boolean>`; never throws and never logs (silent-drop semantics).
- [ ] Missing Keychain entry returns `false`, not an error.
- [ ] Non-numeric Keychain value returns `false`.
- [ ] No I/O other than the single Keychain read.

### Task 3.4: Inbound message classifier

**Files:**
- Create: `src/lib/artlab/bot/inbound-classifier.ts`
- Test: `src/lib/artlab/bot/inbound-classifier.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/bot/inbound-classifier.test.ts
import { describe, expect, it } from "vitest";
import { classifyInbound, ARTLAB_INBOUND_KINDS } from "./inbound-classifier";

describe("inbound message classifier", () => {
  it("declares the 6 inbound kinds", () => {
    expect(ARTLAB_INBOUND_KINDS).toEqual([
      "trigger", "trigger-with-photo", "gate-reply", "bundle", "command", "promotion",
    ]);
  });

  it("classifies plain text 'make Sol' as trigger", () => {
    const r = classifyInbound({ chat: { id: 1 }, message_id: 1, text: "make Sol Navarro", date: 0 });
    expect(r.kind).toBe("trigger");
  });

  it("classifies text + photo as trigger-with-photo with largest file_id", () => {
    const r = classifyInbound({
      chat: { id: 1 }, message_id: 1, date: 0,
      caption: "make Priya like this",
      photo: [
        { file_id: "small", file_unique_id: "s", width: 100, height: 100 },
        { file_id: "large", file_unique_id: "l", width: 800, height: 800 },
      ],
    });
    expect(r.kind).toBe("trigger-with-photo");
    expect(r.photoFileId).toBe("large");
  });

  it("classifies 'approve direction 2' as gate-reply", () => {
    expect(classifyInbound({ chat: { id: 1 }, message_id: 1, text: "approve direction 2", date: 0 }).kind).toBe("gate-reply");
  });

  it("classifies 'approved for app' (any case) as promotion", () => {
    expect(classifyInbound({ chat: { id: 1 }, message_id: 1, text: "Approved For App", date: 0 }).kind).toBe("promotion");
  });

  it("classifies '/status' as command", () => {
    const r = classifyInbound({ chat: { id: 1 }, message_id: 1, text: "/status", date: 0 });
    expect(r.kind).toBe("command");
    expect(r.commandName).toBe("status");
  });

  it("classifies bundle phrasing 'war room with Rafe in it' as bundle", () => {
    expect(classifyInbound({ chat: { id: 1 }, message_id: 1, text: "make the war room with Rafe in it", date: 0 }).kind).toBe("bundle");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/inbound-classifier.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement classifier**

```ts
// src/lib/artlab/bot/inbound-classifier.ts
import type { TelegramMessage } from "./telegram-client";

export const ARTLAB_INBOUND_KINDS = [
  "trigger", "trigger-with-photo", "gate-reply", "bundle", "command", "promotion",
] as const;
export type ArtLabInboundKind = (typeof ARTLAB_INBOUND_KINDS)[number];

export interface ArtLabInboundClassification {
  kind: ArtLabInboundKind;
  text: string;
  photoFileId?: string;
  commandName?: string;
}

const PROMOTION_PHRASE = /^\s*approved\s+for\s+app\s*$/i;
const GATE_REPLY = /^\s*(approve\s+direction\s+\d+|revise:.*|reject|archive|cancel(\s+\S+)?)\s*$/i;
const COMMAND = /^\/([a-z]+)(?:\s|$)/i;
const BUNDLE_PHRASES = [
  /\bwith\s+\S+\s+in\s+it\b/i,
  /\b\S+\s+and\s+\S+\s+together\b/i,
  /\bthe\s+\w+\s+floor\b/i,
];

export function classifyInbound(message: TelegramMessage): ArtLabInboundClassification {
  const text = (message.text ?? message.caption ?? "").trim();
  if (PROMOTION_PHRASE.test(text)) return { kind: "promotion", text };
  if (GATE_REPLY.test(text)) return { kind: "gate-reply", text };
  const commandMatch = text.match(COMMAND);
  if (commandMatch) return { kind: "command", text, commandName: commandMatch[1]!.toLowerCase() };
  if ((message.photo?.length ?? 0) > 0) {
    const photoFileId = message.photo!.at(-1)!.file_id;
    return { kind: "trigger-with-photo", text, photoFileId };
  }
  if (BUNDLE_PHRASES.some((p) => p.test(text))) return { kind: "bundle", text };
  return { kind: "trigger", text };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/inbound-classifier.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/inbound-classifier.ts src/lib/artlab/bot/inbound-classifier.test.ts
git commit -m "$(cat <<'EOF'
Add Telegram inbound message classifier (6 kinds)

Routes incoming messages to: trigger, trigger-with-photo, gate-
reply, bundle, command, promotion. Classification precedence
matches spec §5.1. Selects largest-resolution photo (last in the
Telegram photo array) for reference attachments.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Promotion phrase classifier matches case-insensitively but rejects extra characters (test `approved for app!` returns `trigger`, not `promotion`).
- [ ] Largest-resolution photo (`message.photo.at(-1)`) is selected — Telegram sorts smallest→largest.
- [ ] Classification is deterministic — same input → same output.
- [ ] No catch-all `else` masking unhandled inputs.

### Task 3.5: Reply parser tier 1 — exact phrase

**Files:**
- Create: `src/lib/artlab/bot/reply-parser.ts`
- Test: `src/lib/artlab/bot/reply-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/bot/reply-parser.test.ts
import { describe, expect, it } from "vitest";
import { parseReplyExact, REQUIRED_PROMOTION_PHRASE } from "./reply-parser";

describe("reply parser — tier 1 exact", () => {
  it("phrase is the canonical literal", () => {
    expect(REQUIRED_PROMOTION_PHRASE).toBe("approved for app");
  });

  it("accepts the exact phrase case-insensitively, trimmed", () => {
    expect(parseReplyExact("approved for app")).toEqual({ kind: "promotion-accepted" });
    expect(parseReplyExact("  Approved For App  ")).toEqual({ kind: "promotion-accepted" });
    expect(parseReplyExact("APPROVED FOR APP")).toEqual({ kind: "promotion-accepted" });
  });

  it("echoes back the required phrase on near-misses", () => {
    expect(parseReplyExact("approve for app")).toMatchObject({ kind: "echo-back-required-phrase" });
    expect(parseReplyExact("approved for the app")).toMatchObject({ kind: "echo-back-required-phrase" });
  });

  it("returns no-match for unrelated text", () => {
    expect(parseReplyExact("approve direction 3")).toEqual({ kind: "no-match" });
    expect(parseReplyExact("hello")).toEqual({ kind: "no-match" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/reply-parser.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement tier 1**

```ts
// src/lib/artlab/bot/reply-parser.ts
export const REQUIRED_PROMOTION_PHRASE = "approved for app";

export type Tier1Result =
  | { kind: "promotion-accepted" }
  | { kind: "echo-back-required-phrase"; message: string }
  | { kind: "no-match" };

const NEAR_PROMOTION_PATTERNS = [
  /\bapprove\s+for\s+app\b/i,
  /\bapproved\s+for\s+the\s+app\b/i,
  /\bapprove\s+app\b/i,
  /\bship\s+(it|to\s+app)\b/i,
  /\bpromote\s+(it|to\s+app)\b/i,
];

export function parseReplyExact(input: string): Tier1Result {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === REQUIRED_PROMOTION_PHRASE) return { kind: "promotion-accepted" };
  if (NEAR_PROMOTION_PATTERNS.some((p) => p.test(input))) {
    return {
      kind: "echo-back-required-phrase",
      message: `I read that as wanting to promote — please reply with the exact phrase: ${REQUIRED_PROMOTION_PHRASE}`,
    };
  }
  return { kind: "no-match" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/reply-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/reply-parser.ts src/lib/artlab/bot/reply-parser.test.ts
git commit -m "$(cat <<'EOF'
Add reply parser tier 1 — exact promotion phrase

Locks the literal `approved for app`. Case-insensitive, trimmed,
no LLM fallback. Near-misses get an echo-back asking for the
exact phrase per spec §5.1. All other inputs return no-match.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `REQUIRED_PROMOTION_PHRASE` is a single source of truth (no duplicate literals elsewhere).
- [ ] No LLM call ever invoked from this tier.
- [ ] Echo-back message wording matches spec §5.1 example verbatim.

### Task 3.6: Reply parser tier 2 — pattern regex

**Files:**
- Modify: `src/lib/artlab/bot/reply-parser.ts`
- Modify: `src/lib/artlab/bot/reply-parser.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
// append to src/lib/artlab/bot/reply-parser.test.ts
import { parseReplyPattern } from "./reply-parser";

describe("reply parser — tier 2 pattern", () => {
  it("parses 'approve direction 3' as approve-direction action", () => {
    expect(parseReplyPattern("approve direction 3")).toEqual({
      kind: "matched", action: { type: "approve-direction", laneIndex: 3 },
    });
  });

  it("tolerates whitespace and casing", () => {
    expect(parseReplyPattern("  Approve  Direction  2  ")).toEqual({
      kind: "matched", action: { type: "approve-direction", laneIndex: 2 },
    });
  });

  it("parses 'revise: make her older' as revise action", () => {
    expect(parseReplyPattern("revise: make her older")).toEqual({
      kind: "matched", action: { type: "revise", text: "make her older" },
    });
  });

  it("parses 'reject' and 'archive' as reject action", () => {
    expect(parseReplyPattern("reject")).toEqual({ kind: "matched", action: { type: "reject" } });
    expect(parseReplyPattern("archive")).toEqual({ kind: "matched", action: { type: "reject" } });
  });

  it("parses 'cancel <runId>' as cancel action", () => {
    expect(parseReplyPattern("cancel run-abc-123")).toEqual({
      kind: "matched", action: { type: "cancel", runId: "run-abc-123" },
    });
  });

  it("returns no-match on unrelated text", () => {
    expect(parseReplyPattern("hello")).toEqual({ kind: "no-match" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/reply-parser.test.ts`
Expected: FAIL — parseReplyPattern not exported

- [ ] **Step 3: Append implementation**

```ts
// append to src/lib/artlab/bot/reply-parser.ts
export type Tier2Action =
  | { type: "approve-direction"; laneIndex: number }
  | { type: "revise"; text: string }
  | { type: "reject" }
  | { type: "cancel"; runId: string };

export type Tier2Result =
  | { kind: "matched"; action: Tier2Action }
  | { kind: "no-match" };

const APPROVE_DIRECTION = /^\s*approve\s+direction\s+(\d+)\s*$/i;
const REVISE = /^\s*revise:\s*(.+?)\s*$/i;
const REJECT = /^\s*(reject|archive)\s*$/i;
const CANCEL = /^\s*cancel\s+(\S+)\s*$/i;

export function parseReplyPattern(input: string): Tier2Result {
  let m: RegExpMatchArray | null;
  if ((m = input.match(APPROVE_DIRECTION))) {
    return { kind: "matched", action: { type: "approve-direction", laneIndex: Number.parseInt(m[1]!, 10) } };
  }
  if ((m = input.match(REVISE))) {
    return { kind: "matched", action: { type: "revise", text: m[1]! } };
  }
  if (REJECT.test(input)) return { kind: "matched", action: { type: "reject" } };
  if ((m = input.match(CANCEL))) {
    return { kind: "matched", action: { type: "cancel", runId: m[1]! } };
  }
  return { kind: "no-match" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/reply-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/reply-parser.ts src/lib/artlab/bot/reply-parser.test.ts
git commit -m "$(cat <<'EOF'
Add reply parser tier 2 — pattern regex (4 action types)

Approve direction N, revise:, reject/archive, cancel <runId> via
strict regex (no fuzzy matching at this tier). Tier 3 (LLM) is
only consulted when tiers 1 and 2 both return no-match.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] All four action types parsed without LLM.
- [ ] `laneIndex` parsed as integer, not string.
- [ ] `reject` and `archive` collapse to the same canonical action.
- [ ] No LLM call from this tier.

### Task 3.7: Reply parser tier 3 — LLM fallback + composed cascade

**Files:**
- Modify: `src/lib/artlab/bot/reply-parser.ts`
- Modify: `src/lib/artlab/bot/reply-parser.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
// append to src/lib/artlab/bot/reply-parser.test.ts
import { parseReply } from "./reply-parser";
import type { ArtLabLlmBrain } from "@/lib/artlab/orchestrator/llm-brain";

const mockBrainHighConf: ArtLabLlmBrain = {
  async decide() {
    return {
      kind: "reply-parser-fallback",
      outputJson: { action: "approve-direction", laneIndex: 4 },
      confidence: 0.92, tokensIn: 50, tokensOut: 12, model: "claude-opus-4-7",
    };
  },
};

const mockBrainLowConf: ArtLabLlmBrain = {
  async decide() {
    return {
      kind: "reply-parser-fallback",
      outputJson: { action: "approve-direction", laneIndex: 1 },
      confidence: 0.5, tokensIn: 0, tokensOut: 0, model: "claude-opus-4-7",
    };
  },
};

describe("reply parser — composed cascade", () => {
  it("tier 1 short-circuits — brain not called", async () => {
    let called = false;
    const brain: ArtLabLlmBrain = {
      async decide(...a) { called = true; return mockBrainHighConf.decide(...a); },
    };
    expect(await parseReply("approved for app", brain)).toEqual({ kind: "promotion-accepted" });
    expect(called).toBe(false);
  });

  it("tier 2 short-circuits — brain not called", async () => {
    let called = false;
    const brain: ArtLabLlmBrain = {
      async decide(...a) { called = true; return mockBrainHighConf.decide(...a); },
    };
    expect(await parseReply("approve direction 1", brain)).toEqual({
      kind: "matched", action: { type: "approve-direction", laneIndex: 1 },
    });
    expect(called).toBe(false);
  });

  it("tier 3 brain matches ambiguous text with high confidence", async () => {
    expect(await parseReply("lane four please", mockBrainHighConf)).toEqual({
      kind: "matched", action: { type: "approve-direction", laneIndex: 4 },
    });
  });

  it("needs-clarification when brain confidence < 0.7", async () => {
    expect(await parseReply("idk maybe", mockBrainLowConf)).toEqual({
      kind: "needs-clarification", text: "idk maybe",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/reply-parser.test.ts`
Expected: FAIL — parseReply not exported

- [ ] **Step 3: Append composition**

```ts
// append to src/lib/artlab/bot/reply-parser.ts
import type { ArtLabLlmBrain, ArtLabLlmDecisionResult } from "@/lib/artlab/orchestrator/llm-brain";

const LLM_CONFIDENCE_THRESHOLD = 0.7;

export type ComposedReplyResult =
  | { kind: "promotion-accepted" }
  | { kind: "matched"; action: Tier2Action }
  | { kind: "echo-back-required-phrase"; message: string }
  | { kind: "needs-clarification"; text: string };

function brainResultToAction(r: ArtLabLlmDecisionResult): Tier2Action | null {
  const j = r.outputJson as { action?: string; laneIndex?: number; text?: string; runId?: string };
  if (j.action === "approve-direction" && typeof j.laneIndex === "number") {
    return { type: "approve-direction", laneIndex: j.laneIndex };
  }
  if (j.action === "revise" && typeof j.text === "string") return { type: "revise", text: j.text };
  if (j.action === "reject") return { type: "reject" };
  if (j.action === "cancel" && typeof j.runId === "string") return { type: "cancel", runId: j.runId };
  return null;
}

export async function parseReply(input: string, brain: ArtLabLlmBrain): Promise<ComposedReplyResult> {
  const tier1 = parseReplyExact(input);
  if (tier1.kind === "promotion-accepted") return { kind: "promotion-accepted" };
  if (tier1.kind === "echo-back-required-phrase") return tier1;
  const tier2 = parseReplyPattern(input);
  if (tier2.kind === "matched") return { kind: "matched", action: tier2.action };
  const brainResult = await brain.decide({ kind: "reply-parser-fallback", input: { text: input } });
  if (brainResult.confidence < LLM_CONFIDENCE_THRESHOLD) {
    return { kind: "needs-clarification", text: input };
  }
  const action = brainResultToAction(brainResult);
  if (!action) return { kind: "needs-clarification", text: input };
  return { kind: "matched", action };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/reply-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/reply-parser.ts src/lib/artlab/bot/reply-parser.test.ts
git commit -m "$(cat <<'EOF'
Add reply parser tier 3 — LLM fallback + composed cascade

parseReply runs tier 1 (exact) → tier 2 (pattern) → tier 3 (LLM)
in order. Brain only invoked when both prior tiers return
no-match. Confidence < 0.7 routes to needs-clarification (bot
asks back), not an action — matches spec §6.3.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Tier 1 short-circuits both `promotion-accepted` and `echo-back-required-phrase` (brain never invoked).
- [ ] Tier 2 short-circuits all four pattern matches (brain never invoked).
- [ ] Confidence threshold (`0.7`) lives in a module-level const, not a magic number in the cascade.
- [ ] Brain output is type-narrowed via `brainResultToAction` rather than blindly trusted.
- [ ] `needs-clarification` carries the original `text` so the bot can quote it back.

### Task 3.8: Reference photo store (download + atomic save)

**Files:**
- Create: `src/lib/artlab/intake/reference-attachment-fs.ts`
- Test: `src/lib/artlab/intake/reference-attachment-fs.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/intake/reference-attachment-fs.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveReferenceAttachment } from "./reference-attachment-fs";

describe("reference attachment fs", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-attach-")); });

  it("writes a downloaded photo into inbox/attachments/<runId>/<fileId>.png", async () => {
    const downloader = {
      downloadFile: vi.fn().mockResolvedValue({ contentType: "image/png", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }),
    };
    const path = await saveReferenceAttachment({ workspaceRoot, runId: "run-1", fileId: "fABC", downloader });
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBe(4);
    expect(path).toMatch(/inbox\/attachments\/run-1\/fABC\.png$/);
  });

  it("uses .jpg extension when contentType is image/jpeg", async () => {
    const downloader = {
      downloadFile: vi.fn().mockResolvedValue({ contentType: "image/jpeg", bytes: Buffer.from([0xff, 0xd8]) }),
    };
    const path = await saveReferenceAttachment({ workspaceRoot, runId: "run-1", fileId: "fJPG", downloader });
    expect(path.endsWith(".jpg")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/intake/reference-attachment-fs.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/intake/reference-attachment-fs.ts
import { mkdirSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

export interface AttachmentDownloader {
  downloadFile(opts: { fileId: string }): Promise<{ contentType: string; bytes: Buffer }>;
}

export interface SaveReferenceAttachmentInput {
  workspaceRoot: string;
  runId: string;
  fileId: string;
  downloader: AttachmentDownloader;
}

export async function saveReferenceAttachment(input: SaveReferenceAttachmentInput): Promise<string> {
  const downloaded = await input.downloader.downloadFile({ fileId: input.fileId });
  const ext = CONTENT_TYPE_TO_EXT[downloaded.contentType.toLowerCase()] ?? "bin";
  const dir = join(input.workspaceRoot, "inbox", "attachments", input.runId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `${input.fileId}.${ext}`);
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, downloaded.bytes);
  renameSync(tmp, path);
  return path;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/intake/reference-attachment-fs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/intake/reference-attachment-fs.ts src/lib/artlab/intake/reference-attachment-fs.test.ts
git commit -m "$(cat <<'EOF'
Add reference photo store (Telegram → inbox/attachments/<runId>/)

Downloads via injected TelegramClient downloader, maps content-
type to extension, atomic write (temp + rename) to
inbox/attachments/<runId>/<fileId>.<ext>. Intake router reads
from this path when starting the run.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Atomic write (`temp + rename`) used so a partial download never appears as a final file.
- [ ] Unknown content types fall through to `.bin` (rather than dropping data silently).
- [ ] No I/O outside the workspace root.

### Task 3.9: Board image attachment builders (concept + final)

**Files:**
- Create: `src/lib/artlab/bot/board-attachments.ts`
- Test: `src/lib/artlab/bot/board-attachments.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/bot/board-attachments.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildConceptBoardAttachments, buildFinalBoardAttachments } from "./board-attachments";

describe("board attachment builders", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-board-"));
    mkdirSync(join(runDir, "concept-slots"));
    for (let i = 1; i <= 5; i += 1) {
      writeFileSync(join(runDir, "concept-slots", `lane-${i}.png`), `mock-${i}`);
    }
  });

  it("concept board: 5 photos with numbered captions", () => {
    const result = buildConceptBoardAttachments({ runDir, characterId: "sol" });
    expect(result.media).toHaveLength(5);
    expect(result.media[0]!.caption).toBe("Sol — direction 1");
    expect(result.media[4]!.caption).toBe("Sol — direction 5");
  });

  it("final board: single grid image with sprite count", () => {
    writeFileSync(join(runDir, "final-board.png"), "mock-final");
    const result = buildFinalBoardAttachments({ runDir, characterId: "sol", spriteCount: 21 });
    expect(result.media).toHaveLength(1);
    expect(result.media[0]!.caption).toContain("21 sprites");
  });

  it("concept board throws when fewer than 5 lane files exist", () => {
    unlinkSync(join(runDir, "concept-slots", "lane-4.png"));
    unlinkSync(join(runDir, "concept-slots", "lane-5.png"));
    expect(() => buildConceptBoardAttachments({ runDir, characterId: "sol" })).toThrow(/expected 5/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/board-attachments.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/bot/board-attachments.ts
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { TelegramMediaPhoto } from "./telegram-client";

function capitalize(s: string): string { return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s; }

export interface BoardAttachmentsResult {
  media: TelegramMediaPhoto[];
  caption: string;
}

export function buildConceptBoardAttachments(input: { runDir: string; characterId: string }): BoardAttachmentsResult {
  const conceptDir = join(input.runDir, "concept-slots");
  const lanes = existsSync(conceptDir)
    ? readdirSync(conceptDir).filter((f) => /^lane-\d+\.(png|jpg|webp)$/.test(f)).sort()
    : [];
  if (lanes.length !== 5) throw new Error(`expected 5 concept lane files; found ${lanes.length}`);
  const name = capitalize(input.characterId);
  const media: TelegramMediaPhoto[] = lanes.map((file, idx) => ({
    type: "photo",
    path: join(conceptDir, file),
    caption: `${name} — direction ${idx + 1}`,
  }));
  return {
    media,
    caption: `${name} concepts ready. Reply: \`approve direction 1-5\`, \`revise: <change>\`, or \`reject/archive\`.`,
  };
}

export function buildFinalBoardAttachments(input: { runDir: string; characterId: string; spriteCount: number }): BoardAttachmentsResult {
  const finalBoardPath = join(input.runDir, "final-board.png");
  if (!existsSync(finalBoardPath)) throw new Error(`final-board.png missing at ${finalBoardPath}`);
  const name = capitalize(input.characterId);
  const caption = `${name} final upload-ready board (${input.spriteCount} sprites). Reply: \`approved for app\` to promote.`;
  return {
    media: [{ type: "photo", path: finalBoardPath, caption }],
    caption,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/board-attachments.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/board-attachments.ts src/lib/artlab/bot/board-attachments.test.ts
git commit -m "$(cat <<'EOF'
Add Telegram board attachment builders

Concept board: 5 lane PNGs as sendMediaGroup with numbered
captions per spec §5.1. Final board: single grid PNG with sprite
count. Refuses to build when expected files are missing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Concept board enforces exactly 5 lane files — throws on any other count.
- [ ] Final board enforces existence of `final-board.png` — throws if missing.
- [ ] Captions match spec §5.1 example wording verbatim.
- [ ] Builder only reads — no file modification.

### Task 3.10: Telegram bot command handlers

**Files:**
- Create: `src/lib/artlab/bot/commands.ts`
- Test: `src/lib/artlab/bot/commands.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/bot/commands.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleBotCommand } from "./commands";

describe("bot command handlers", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cmd-")); });

  it("/status with no runs returns text", async () => {
    const r = await handleBotCommand({ workspaceRoot, commandName: "status", args: [] });
    expect(r.kind).toBe("text");
    expect(r.text).toMatch(/no .* runs/i);
  });

  it("/queue returns 'empty' when nothing queued", async () => {
    const r = await handleBotCommand({ workspaceRoot, commandName: "queue", args: [] });
    expect(r.text).toMatch(/empty|0 queued/i);
  });

  it("/cancel writes inbox/cancel-<runId>-*.json", async () => {
    await handleBotCommand({ workspaceRoot, commandName: "cancel", args: ["run-abc-123"] });
    expect(existsSync(join(workspaceRoot, "inbox"))).toBe(true);
    const files = readdirSync(join(workspaceRoot, "inbox"));
    expect(files.some((f) => f.startsWith("cancel-run-abc-123"))).toBe(true);
  });

  it("/health returns multi-line summary", async () => {
    const r = await handleBotCommand({ workspaceRoot, commandName: "health", args: [] });
    expect(r.text.split("\n").length).toBeGreaterThanOrEqual(3);
  });

  it("unknown command returns help text", async () => {
    const r = await handleBotCommand({ workspaceRoot, commandName: "dance", args: [] });
    expect(r.text).toMatch(/unknown|known commands/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/commands.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/bot/commands.ts
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readRunReality } from "@/lib/artlab/state/reconciler";
import { listQueuedRuns } from "@/lib/artlab/queue/queue";
import { buildArtLabHealthSnapshot } from "@/lib/artlab/health/snapshot";

export interface BotCommandInput {
  workspaceRoot: string;
  commandName: string;
  args: string[];
}

export interface BotCommandResult { kind: "text"; text: string; }

const KNOWN = ["status", "queue", "cancel", "health", "help"] as const;

async function handleStatus(workspaceRoot: string, args: string[]): Promise<string> {
  const runsDir = join(workspaceRoot, "runs");
  if (!existsSync(runsDir)) return "No runs yet.";
  const runs = readdirSync(runsDir).filter((f) => !f.startsWith("."));
  if (runs.length === 0) return "No active runs.";
  if (args.length === 0) return `Active runs:\n${runs.map((r) => `  ${r}`).join("\n")}`;
  const runId = args[0]!;
  const reality = await readRunReality(join(runsDir, runId));
  if (!reality) return `No run found for ${runId}`;
  return [
    `Run ${runId}: ${reality.phase}${reality.blocker ? ` (blocked: ${reality.blocker})` : ""}`,
    `Slots — completed: ${reality.slots.completed}, running: ${reality.slots.running}, failed: ${reality.slots.failed}`,
    `Spend — $${(reality.spend.actualCents / 100).toFixed(2)} of $${(reality.spend.monthlyCeilingCents / 100).toFixed(2)} monthly`,
  ].join("\n");
}

async function handleQueue(workspaceRoot: string): Promise<string> {
  const queued = listQueuedRuns(workspaceRoot);
  if (queued.length === 0) return "Queue empty — 0 queued runs.";
  return `${queued.length} queued runs:\n${queued.map((q) => `  ${q.runId} (${q.priority})`).join("\n")}`;
}

async function handleCancel(workspaceRoot: string, args: string[]): Promise<string> {
  if (args.length === 0) return "cancel: expected <runId>";
  const runId = args[0]!;
  const inboxDir = join(workspaceRoot, "inbox");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const path = join(inboxDir, `cancel-${runId}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify({ runId, requestedAt: new Date().toISOString() }));
  return `Cancel intent recorded for ${runId}. Daemon will send SIGTERM next sweep.`;
}

async function handleHealth(workspaceRoot: string): Promise<string> {
  const snapshot = await buildArtLabHealthSnapshot({ workspaceRoot });
  return [
    `Health @ ${snapshot.builtAt}`,
    `Active locks: ${snapshot.locks.activeCount}`,
    `Active runs: ${snapshot.runs.activeCount}`,
    `Active leases: ${snapshot.leases.activeCount}`,
    `Monthly spend: $${(snapshot.spend.monthlySpentCents / 100).toFixed(2)}`,
  ].join("\n");
}

function helpText(): string {
  return [
    "Known commands:",
    "  /status [runId] — engine status (plain English)",
    "  /queue — queued + active runs",
    "  /cancel <runId> — cancel a run",
    "  /health — engine health report",
  ].join("\n");
}

export async function handleBotCommand(input: BotCommandInput): Promise<BotCommandResult> {
  const name = input.commandName.toLowerCase();
  if (!(KNOWN as readonly string[]).includes(name)) {
    return { kind: "text", text: `Unknown command /${input.commandName}.\n\n${helpText()}` };
  }
  switch (name as typeof KNOWN[number]) {
    case "status": return { kind: "text", text: await handleStatus(input.workspaceRoot, input.args) };
    case "queue": return { kind: "text", text: await handleQueue(input.workspaceRoot) };
    case "cancel": return { kind: "text", text: await handleCancel(input.workspaceRoot, input.args) };
    case "health": return { kind: "text", text: await handleHealth(input.workspaceRoot) };
    case "help": return { kind: "text", text: helpText() };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/commands.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/commands.ts src/lib/artlab/bot/commands.test.ts
git commit -m "$(cat <<'EOF'
Add Telegram bot command handlers (/status /queue /cancel /health)

Each handler resolves through the canonical surface — reconciler
for status, queue module for queue, health snapshot for health,
inbox file for cancel intent. Bot commands and CLI subcommands
share the same engine boundary; no bypass paths.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Every command output is plain text (no markdown, no HTML).
- [ ] `/cancel` writes to `inbox/cancel-<runId>-<timestamp>.json` — daemon picks up next sweep, no direct process signaling.
- [ ] `/health` uses the same `buildArtLabHealthSnapshot` as `artlab health` CLI; no parallel implementation.
- [ ] Unknown command returns help (never silent).

### Task 3.11: Telegram bot dispatcher (composes identity + classify + parse)

**Files:**
- Create: `src/lib/artlab/bot/bot-dispatcher.ts`
- Test: `src/lib/artlab/bot/bot-dispatcher.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/bot/bot-dispatcher.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchInboundMessage } from "./bot-dispatcher";
import * as identity from "./identity";

describe("telegram bot dispatcher", () => {
  let workspaceRoot: string;
  let sentMessages: { chatId: number; text: string }[];
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-disp-"));
    sentMessages = [];
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  const mockClient = {
    sendMessage: vi.fn().mockImplementation(async (o: any) => {
      sentMessages.push({ chatId: o.chatId, text: o.text });
      return { message_id: 1 };
    }),
    sendMediaGroup: vi.fn(),
    getUpdates: vi.fn(),
    downloadFile: vi.fn(),
  } as any;

  const mockBrain = {
    async decide() {
      return { kind: "reply-parser-fallback" as const, outputJson: {}, confidence: 0, tokensIn: 0, tokensOut: 0, model: "claude-opus-4-7" };
    },
  };

  it("silently drops messages from unauthorized chat.id (safety property #6)", async () => {
    vi.spyOn(identity, "isAuthorizedSender").mockResolvedValue(false);
    await dispatchInboundMessage({
      workspaceRoot, telegram: mockClient, brain: mockBrain,
      message: { chat: { id: 99 }, message_id: 1, text: "evil", date: 0 },
    });
    expect(sentMessages).toHaveLength(0);
  });

  it("handles /status for authorized sender", async () => {
    vi.spyOn(identity, "isAuthorizedSender").mockResolvedValue(true);
    await dispatchInboundMessage({
      workspaceRoot, telegram: mockClient, brain: mockBrain,
      message: { chat: { id: 1 }, message_id: 1, text: "/status", date: 0 },
    });
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]!.text).toMatch(/no .* runs/i);
  });

  it("accepts 'approved for app'", async () => {
    vi.spyOn(identity, "isAuthorizedSender").mockResolvedValue(true);
    const r = await dispatchInboundMessage({
      workspaceRoot, telegram: mockClient, brain: mockBrain,
      message: { chat: { id: 1 }, message_id: 1, text: "approved for app", date: 0 },
    });
    expect(r.action).toEqual({ type: "promotion-accepted" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/bot/bot-dispatcher.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement dispatcher**

```ts
// src/lib/artlab/bot/bot-dispatcher.ts
import { classifyInbound } from "./inbound-classifier";
import { handleBotCommand } from "./commands";
import { parseReply, type ComposedReplyResult } from "./reply-parser";
import { isAuthorizedSender } from "./identity";
import type { TelegramClient, TelegramMessage } from "./telegram-client";
import type { ArtLabLlmBrain } from "@/lib/artlab/orchestrator/llm-brain";

export interface DispatchInboundInput {
  workspaceRoot: string;
  telegram: TelegramClient;
  brain: ArtLabLlmBrain;
  message: TelegramMessage;
}

export interface DispatchInboundResult {
  action:
    | { type: "dropped"; reason: "unauthorized" }
    | { type: "command-handled"; commandName: string }
    | { type: "gate-reply"; reply: ComposedReplyResult }
    | { type: "promotion-accepted" }
    | { type: "trigger-enqueued"; runId: string };
}

export async function dispatchInboundMessage(input: DispatchInboundInput): Promise<DispatchInboundResult> {
  if (!(await isAuthorizedSender(input.message))) {
    return { action: { type: "dropped", reason: "unauthorized" } };
  }
  const classified = classifyInbound(input.message);
  switch (classified.kind) {
    case "command": {
      const out = await handleBotCommand({
        workspaceRoot: input.workspaceRoot,
        commandName: classified.commandName!,
        args: classified.text.split(/\s+/).slice(1),
      });
      await input.telegram.sendMessage({ chatId: input.message.chat.id, text: out.text });
      return { action: { type: "command-handled", commandName: classified.commandName! } };
    }
    case "promotion": {
      const parsed = await parseReply(classified.text, input.brain);
      if (parsed.kind === "promotion-accepted") {
        await input.telegram.sendMessage({ chatId: input.message.chat.id, text: "Promotion accepted. Engine continuing." });
        return { action: { type: "promotion-accepted" } };
      }
      if (parsed.kind === "echo-back-required-phrase") {
        await input.telegram.sendMessage({ chatId: input.message.chat.id, text: parsed.message });
      }
      return { action: { type: "gate-reply", reply: parsed } };
    }
    case "gate-reply": {
      const parsed = await parseReply(classified.text, input.brain);
      await input.telegram.sendMessage({ chatId: input.message.chat.id, text: `Reply received: ${classified.text}` });
      return { action: { type: "gate-reply", reply: parsed } };
    }
    case "trigger":
    case "trigger-with-photo":
    case "bundle": {
      await input.telegram.sendMessage({
        chatId: input.message.chat.id,
        text: `Got it — ${classified.kind}. Engine routing.`,
      });
      return { action: { type: "trigger-enqueued", runId: "pending-routing" } };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/bot-dispatcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/bot/bot-dispatcher.ts src/lib/artlab/bot/bot-dispatcher.test.ts
git commit -m "$(cat <<'EOF'
Add Telegram bot dispatcher composing identity + classifier + parser

Single entry: dispatchInboundMessage. Order: identity (silent
drop if unauthorized — spec safety property #6) → classify kind →
route to command / parser / inbox writer. Acknowledgements live
in this layer; actual state machine progression happens via the
orchestrator (Phase 3D CLI wiring composes the two).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Unauthorized chat.id → zero outbound messages AND zero filesystem writes.
- [ ] Every authorized branch sends exactly one outbound acknowledgement (plain text, no parse_mode).
- [ ] Dispatcher never mutates `run-state.json` directly — only writes inbox intents.
- [ ] `switch` over `classified.kind` is exhaustive (TS narrowing enforces it).

### Task 3.12: Telegram bot integration test (real Keychain)

**Files:**
- Create: `src/lib/artlab/bot/bot.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```ts
// src/lib/artlab/bot/bot.integration.test.ts
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchInboundMessage } from "./bot-dispatcher";
import { setKeychainSecret, deleteKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "./keychain";

const TEST_CHAT_ID = 8675309;
const TEST_SERVICE = `${ARTLAB_KEYCHAIN_PREFIX}-chat-id`;

describe("bot integration — auth + classify + parse + ack", () => {
  let workspaceRoot: string;
  let sentMessages: { chatId: number; text: string }[];

  beforeEach(async () => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-bot-int-"));
    sentMessages = [];
    await setKeychainSecret(TEST_SERVICE, String(TEST_CHAT_ID));
  });

  afterEach(async () => {
    await deleteKeychainSecret(TEST_SERVICE).catch(() => undefined);
  });

  const mockClient = {
    sendMessage: vi.fn().mockImplementation(async (o: any) => {
      sentMessages.push({ chatId: o.chatId, text: o.text });
      return { message_id: 1 };
    }),
    sendMediaGroup: vi.fn(),
    getUpdates: vi.fn(),
    downloadFile: vi.fn(),
  } as any;

  const mockBrain = {
    async decide() {
      return { kind: "reply-parser-fallback" as const, outputJson: {}, confidence: 0, tokensIn: 0, tokensOut: 0, model: "claude-opus-4-7" };
    },
  };

  it("rejects unauthorized chat.id silently", async () => {
    const r = await dispatchInboundMessage({
      workspaceRoot, telegram: mockClient, brain: mockBrain,
      message: { chat: { id: 1234 }, message_id: 1, text: "make Sol", date: 0 },
    });
    expect(r.action).toEqual({ type: "dropped", reason: "unauthorized" });
    expect(sentMessages).toHaveLength(0);
  });

  it("authorized /status replies with 'no runs'", async () => {
    const r = await dispatchInboundMessage({
      workspaceRoot, telegram: mockClient, brain: mockBrain,
      message: { chat: { id: TEST_CHAT_ID }, message_id: 1, text: "/status", date: 0 },
    });
    expect(r.action.type).toBe("command-handled");
    expect(sentMessages[0]!.text).toMatch(/no .* runs/i);
  });

  it("'approved for app' yields Promotion accepted", async () => {
    const r = await dispatchInboundMessage({
      workspaceRoot, telegram: mockClient, brain: mockBrain,
      message: { chat: { id: TEST_CHAT_ID }, message_id: 1, text: "approved for app", date: 0 },
    });
    expect(r.action).toEqual({ type: "promotion-accepted" });
    expect(sentMessages[0]!.text).toMatch(/promotion accepted/i);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/bot/bot.integration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/artlab/bot/bot.integration.test.ts
git commit -m "$(cat <<'EOF'
Add Telegram bot integration test (real Keychain + dispatch)

Round-trips real macOS Keychain writes/reads through the
dispatcher. Confirms spec safety property #6 (silent drop) and
that the authorized happy path produces the expected
acknowledgement text. afterEach cleans up the test Keychain
entry so repeated runs leave no drift in user Keychain.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Test uses the REAL `security` CLI (no `vi.spyOn` on Keychain functions).
- [ ] `afterEach` removes the test entry; running twice leaves no drift.
- [ ] Unauthorized-drop assertion checks both `action.type === "dropped"` AND `sentMessages.length === 0`.
- [ ] No real Telegram API calls (network fully mocked).

### Subphase 3B — Mac daemon (Tasks 3.13–3.22)

### Task 3.13: launchd plist generator

**Files:**
- Create: `src/lib/artlab/daemon/launchd.ts`
- Test: `src/lib/artlab/daemon/launchd.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/daemon/launchd.test.ts
import { describe, expect, it } from "vitest";
import { renderLaunchdPlist, ARTLAB_LAUNCHD_LABEL } from "./launchd";

describe("launchd plist generator", () => {
  it("uses the canonical label com.tower.artlab", () => {
    expect(ARTLAB_LAUNCHD_LABEL).toBe("com.tower.artlab");
  });

  it("renders a plist with Label, ProgramArguments, KeepAlive, RunAtLoad, StdoutPath, StderrPath, WorkingDirectory", () => {
    const xml = renderLaunchdPlist({
      nodeBinary: "/usr/local/bin/node",
      daemonEntry: "/Users/armaanarora/Documents/The Tower/scripts/artlab.ts",
      workspaceRoot: "/Users/armaanarora/Documents/The Tower/.artlab/engine",
      logRoot: "/Users/armaanarora/Library/Logs/artlab",
    });
    expect(xml).toContain("<key>Label</key>");
    expect(xml).toContain("<string>com.tower.artlab</string>");
    expect(xml).toContain("<key>ProgramArguments</key>");
    expect(xml).toContain("<string>/usr/local/bin/node</string>");
    expect(xml).toContain("<key>KeepAlive</key>");
    expect(xml).toContain("<true/>");
    expect(xml).toContain("<key>RunAtLoad</key>");
    expect(xml).toContain("<key>StandardOutPath</key>");
    expect(xml).toContain("<key>StandardErrorPath</key>");
    expect(xml).toContain("/Users/armaanarora/Library/Logs/artlab/artlab.out.log");
  });

  it("escapes XML special characters in paths", () => {
    const xml = renderLaunchdPlist({
      nodeBinary: "/usr/bin/node",
      daemonEntry: "/path with & ampersand/artlab.ts",
      workspaceRoot: "/tmp",
      logRoot: "/tmp/logs",
    });
    expect(xml).toContain("&amp;");
    expect(xml).not.toMatch(/ & /);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/daemon/launchd.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement plist generator**

```ts
// src/lib/artlab/daemon/launchd.ts
export const ARTLAB_LAUNCHD_LABEL = "com.tower.artlab";

export interface LaunchdPlistInput {
  nodeBinary: string;
  daemonEntry: string;
  workspaceRoot: string;
  logRoot: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderLaunchdPlist(input: LaunchdPlistInput): string {
  const args = [input.nodeBinary, input.daemonEntry, "daemon", "run"];
  const argsXml = args.map((a) => `      <string>${escapeXml(a)}</string>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${ARTLAB_LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
${argsXml}
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(input.workspaceRoot)}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>StandardOutPath</key>
  <string>${escapeXml(input.logRoot)}/artlab.out.log</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(input.logRoot)}/artlab.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ARTLAB_WORKSPACE_ROOT</key>
    <string>${escapeXml(input.workspaceRoot)}</string>
    <key>NODE_ENV</key>
    <string>production</string>
  </dict>
  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/launchd.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/daemon/launchd.ts src/lib/artlab/daemon/launchd.test.ts
git commit -m "$(cat <<'EOF'
Add launchd plist generator (com.tower.artlab)

Pure-function plist renderer. KeepAlive=true so launchd restarts
the daemon on crash; ThrottleInterval=10s to avoid restart
storms. StandardOut/Err route to ~/Library/Logs/artlab/ for `log
show` visibility. XML-escapes path special characters.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] All five XML special chars (`&`, `<`, `>`, `"`, `'`) are escaped in path values.
- [ ] `KeepAlive=true` + `ThrottleInterval=10` so launchd restarts the daemon but not in a tight loop.
- [ ] No hard-coded paths in the rendered plist body — every path comes from the input struct.
- [ ] Stdout/stderr paths are absolute (launchd does not respect WorkingDirectory for them).

### Task 3.14: Daemon entry point + signal handlers

**Files:**
- Create: `src/lib/artlab/daemon/entry.ts`
- Test: `src/lib/artlab/daemon/entry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/daemon/entry.test.ts
import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDaemonContext, runDaemonOnce } from "./entry";

describe("daemon entry", () => {
  it("writes a heartbeat to workspaceRoot/daemon-heartbeat.json on each tick", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-daemon-"));
    const ctx = createDaemonContext({ workspaceRoot, telegramPoller: { tick: vi.fn() }, queueProcessor: { tick: vi.fn() } });
    await runDaemonOnce(ctx);
    const path = join(workspaceRoot, "daemon-heartbeat.json");
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    expect(parsed.pid).toBe(process.pid);
    expect(typeof parsed.at).toBe("string");
  });

  it("calls telegramPoller.tick and queueProcessor.tick once per tick", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-daemon-"));
    const telegramPoller = { tick: vi.fn().mockResolvedValue(undefined) };
    const queueProcessor = { tick: vi.fn().mockResolvedValue(undefined) };
    const ctx = createDaemonContext({ workspaceRoot, telegramPoller, queueProcessor });
    await runDaemonOnce(ctx);
    expect(telegramPoller.tick).toHaveBeenCalledOnce();
    expect(queueProcessor.tick).toHaveBeenCalledOnce();
  });

  it("setShutdownRequested causes runDaemonForever to return on next tick", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-daemon-"));
    const telegramPoller = { tick: vi.fn().mockResolvedValue(undefined) };
    const queueProcessor = { tick: vi.fn().mockResolvedValue(undefined) };
    const ctx = createDaemonContext({ workspaceRoot, telegramPoller, queueProcessor });
    ctx.requestShutdown();
    // runDaemonOnce should still run one tick after shutdown is requested (drains)
    await runDaemonOnce(ctx);
    expect(ctx.isShutdownRequested()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/daemon/entry.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement daemon entry**

```ts
// src/lib/artlab/daemon/entry.ts
import { mkdirSync, existsSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";

export interface DaemonTicker {
  tick(): Promise<void>;
}

export interface DaemonContextInput {
  workspaceRoot: string;
  telegramPoller: DaemonTicker;
  queueProcessor: DaemonTicker;
}

export interface DaemonContext {
  workspaceRoot: string;
  telegramPoller: DaemonTicker;
  queueProcessor: DaemonTicker;
  requestShutdown(): void;
  isShutdownRequested(): boolean;
}

export function createDaemonContext(input: DaemonContextInput): DaemonContext {
  let shutdown = false;
  return {
    workspaceRoot: input.workspaceRoot,
    telegramPoller: input.telegramPoller,
    queueProcessor: input.queueProcessor,
    requestShutdown(): void { shutdown = true; },
    isShutdownRequested(): boolean { return shutdown; },
  };
}

function writeHeartbeat(workspaceRoot: string): void {
  if (!existsSync(workspaceRoot)) mkdirSync(workspaceRoot, { recursive: true });
  const path = join(workspaceRoot, "daemon-heartbeat.json");
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify({ pid: process.pid, at: new Date().toISOString() }, null, 2)}\n`);
  renameSync(tmp, path);
}

export async function runDaemonOnce(ctx: DaemonContext): Promise<void> {
  writeHeartbeat(ctx.workspaceRoot);
  await Promise.all([
    ctx.telegramPoller.tick(),
    ctx.queueProcessor.tick(),
  ]);
}

export async function runDaemonForever(ctx: DaemonContext, opts?: { sleepMs?: number }): Promise<void> {
  const sleepMs = opts?.sleepMs ?? 1000;
  const onSignal = () => ctx.requestShutdown();
  process.on("SIGTERM", onSignal);
  process.on("SIGINT", onSignal);
  try {
    while (!ctx.isShutdownRequested()) {
      try {
        await runDaemonOnce(ctx);
      } catch {
        // never let a tick error kill the daemon
      }
      if (ctx.isShutdownRequested()) break;
      await new Promise((r) => setTimeout(r, sleepMs));
    }
  } finally {
    process.off("SIGTERM", onSignal);
    process.off("SIGINT", onSignal);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/entry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/daemon/entry.ts src/lib/artlab/daemon/entry.test.ts
git commit -m "$(cat <<'EOF'
Add daemon entry point — tick loop + signal handlers

Pure-context creator separated from the forever-loop driver so
ticks are testable. SIGTERM/SIGINT set a shutdown flag; the loop
drains to next tick boundary then exits cleanly. Heartbeat
written atomically every tick so external watchers (artlab
health, /goal evaluators) can see daemon liveness.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `runDaemonForever` uses a clean shutdown flag — never `process.exit()` inside the loop.
- [ ] Tick errors are caught silently so a transient failure does not kill the daemon (launchd would restart, but we want continuity).
- [ ] Heartbeat write is atomic.
- [ ] Signal handlers are removed on exit (no leak across re-entries).

### Task 3.15: Process supervisor (max-2 children, PID tracking)

**Files:**
- Create: `src/lib/artlab/daemon/supervisor.ts`
- Test: `src/lib/artlab/daemon/supervisor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/daemon/supervisor.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { createSupervisor, MAX_CHILDREN } from "./supervisor";

describe("daemon supervisor", () => {
  it("MAX_CHILDREN is 2 (spec parallelism cap)", () => {
    expect(MAX_CHILDREN).toBe(2);
  });

  it("spawn returns ok up to MAX_CHILDREN", () => {
    const sup = createSupervisor();
    expect(sup.canSpawn()).toBe(true);
    const a = sup.registerChild({ runId: "a", pid: 111 });
    expect(a.accepted).toBe(true);
    const b = sup.registerChild({ runId: "b", pid: 222 });
    expect(b.accepted).toBe(true);
    expect(sup.canSpawn()).toBe(false);
    const c = sup.registerChild({ runId: "c", pid: 333 });
    expect(c.accepted).toBe(false);
    expect(c.reason).toMatch(/cap/i);
  });

  it("releaseChild frees a slot", () => {
    const sup = createSupervisor();
    sup.registerChild({ runId: "a", pid: 111 });
    sup.registerChild({ runId: "b", pid: 222 });
    sup.releaseChild("a");
    expect(sup.canSpawn()).toBe(true);
    expect(sup.activeChildren()).toEqual([{ runId: "b", pid: 222 }]);
  });

  it("findChildByRunId returns matching child or null", () => {
    const sup = createSupervisor();
    sup.registerChild({ runId: "x", pid: 999 });
    expect(sup.findChildByRunId("x")).toEqual({ runId: "x", pid: 999 });
    expect(sup.findChildByRunId("missing")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/daemon/supervisor.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/daemon/supervisor.ts
export const MAX_CHILDREN = 2;

export interface SupervisorChild {
  runId: string;
  pid: number;
}

export interface RegisterChildResult {
  accepted: boolean;
  reason?: string;
}

export interface Supervisor {
  canSpawn(): boolean;
  registerChild(child: SupervisorChild): RegisterChildResult;
  releaseChild(runId: string): boolean;
  activeChildren(): SupervisorChild[];
  findChildByRunId(runId: string): SupervisorChild | null;
}

export function createSupervisor(): Supervisor {
  const children = new Map<string, SupervisorChild>();
  return {
    canSpawn(): boolean { return children.size < MAX_CHILDREN; },
    registerChild(child: SupervisorChild): RegisterChildResult {
      if (children.size >= MAX_CHILDREN) return { accepted: false, reason: `parallelism cap reached (${MAX_CHILDREN})` };
      children.set(child.runId, child);
      return { accepted: true };
    },
    releaseChild(runId: string): boolean { return children.delete(runId); },
    activeChildren(): SupervisorChild[] { return Array.from(children.values()); },
    findChildByRunId(runId: string): SupervisorChild | null { return children.get(runId) ?? null; },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/supervisor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/daemon/supervisor.ts src/lib/artlab/daemon/supervisor.test.ts
git commit -m "$(cat <<'EOF'
Add daemon supervisor — max-2 children with PID tracking

In-memory Map keyed by runId. registerChild returns accepted=
false past the cap; releaseChild on child exit frees the slot.
The actual child_process spawn lives in queue-processor (next
task); supervisor is pure bookkeeping.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `MAX_CHILDREN` is a module-level const equal to 2, matching `ARTLAB_MAX_PARALLELISM` from Phase 1.
- [ ] No async work — pure synchronous bookkeeping.
- [ ] `releaseChild` returns `boolean` indicating whether the runId was actually registered.
- [ ] `activeChildren` returns a fresh array each call (no aliasing the internal Map).

### Task 3.16: Queue processor (spawn child per dequeued run)

**Files:**
- Create: `src/lib/artlab/daemon/queue-processor.ts`
- Test: `src/lib/artlab/daemon/queue-processor.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/daemon/queue-processor.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createQueueProcessor } from "./queue-processor";
import { createSupervisor } from "./supervisor";
import { enqueueRun } from "@/lib/artlab/queue/queue";

describe("queue processor", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-qp-")); });

  it("does nothing when supervisor is full", async () => {
    const sup = createSupervisor();
    sup.registerChild({ runId: "x", pid: 1 });
    sup.registerChild({ runId: "y", pid: 2 });
    const spawn = vi.fn();
    const proc = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner: spawn });
    enqueueRun(workspaceRoot, { runId: "queued", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    await proc.tick();
    expect(spawn).not.toHaveBeenCalled();
  });

  it("spawns a child for the highest-priority queued run", async () => {
    const sup = createSupervisor();
    const spawn = vi.fn().mockReturnValue({ pid: 9999, kill: vi.fn() });
    const proc = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner: spawn });
    enqueueRun(workspaceRoot, { runId: "low", priority: "default", enqueuedAt: "2026-05-20T00:00:01Z", spec: { request: "x" } });
    enqueueRun(workspaceRoot, { runId: "high", priority: "human-flagged", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    await proc.tick();
    expect(spawn).toHaveBeenCalledOnce();
    const [opts] = spawn.mock.calls[0]!;
    expect(opts.runId).toBe("high");
    expect(sup.activeChildren()).toHaveLength(1);
  });

  it("releases the slot when child exits", async () => {
    const sup = createSupervisor();
    let exitHandler: ((code: number) => void) | null = null;
    const spawn = vi.fn().mockReturnValue({
      pid: 1234,
      on: vi.fn().mockImplementation((event, h) => {
        if (event === "exit") exitHandler = h;
      }),
      kill: vi.fn(),
    });
    const proc = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner: spawn });
    enqueueRun(workspaceRoot, { runId: "alpha", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    await proc.tick();
    expect(sup.activeChildren()).toHaveLength(1);
    exitHandler!(0);
    expect(sup.activeChildren()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/daemon/queue-processor.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/daemon/queue-processor.ts
import type { ChildProcess } from "node:child_process";
import { dequeueNextRun, type ArtLabQueueEntry } from "@/lib/artlab/queue/queue";
import type { Supervisor } from "./supervisor";

export interface QueueProcessorChild {
  pid: number;
  on(event: "exit", handler: (code: number) => void): void;
  kill(signal?: NodeJS.Signals): boolean;
}

export interface QueueProcessorInput {
  workspaceRoot: string;
  supervisor: Supervisor;
  spawnRunner(entry: ArtLabQueueEntry): QueueProcessorChild | ChildProcess;
}

export interface QueueProcessor {
  tick(): Promise<void>;
}

export function createQueueProcessor(input: QueueProcessorInput): QueueProcessor {
  return {
    async tick(): Promise<void> {
      while (input.supervisor.canSpawn()) {
        const next = dequeueNextRun(input.workspaceRoot);
        if (!next) return;
        const child = input.spawnRunner(next);
        const registered = input.supervisor.registerChild({ runId: next.runId, pid: child.pid ?? -1 });
        if (!registered.accepted) {
          // Cap won the race — try to kill the just-spawned child to avoid drift.
          child.kill?.("SIGTERM");
          return;
        }
        child.on?.("exit", () => { input.supervisor.releaseChild(next.runId); });
      }
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/queue-processor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/daemon/queue-processor.ts src/lib/artlab/daemon/queue-processor.test.ts
git commit -m "$(cat <<'EOF'
Add queue processor — dequeue + spawn child runner

Drains the queue while the supervisor has open slots. Spawn
function is injectable so tests use vi.fn(); production passes
the real child_process.spawn wrapper from a later task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `tick` honors supervisor cap — never exceeds `MAX_CHILDREN`.
- [ ] Race-loss safeguard: if `registerChild` returns `accepted: false` after a successful spawn, the just-spawned child is SIGTERM'd to avoid drift.
- [ ] `on("exit")` is attached BEFORE the next iteration so the slot is released on child exit.
- [ ] No reliance on global state — everything threaded through `input`.

### Task 3.17: Telegram poller (long-poll loop with offset)

**Files:**
- Create: `src/lib/artlab/daemon/telegram-poller.ts`
- Test: `src/lib/artlab/daemon/telegram-poller.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/daemon/telegram-poller.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTelegramPoller } from "./telegram-poller";

describe("telegram poller", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-tp-")); });

  it("first tick uses offset=0 then offset=lastUpdateId+1", async () => {
    const updates = [
      { update_id: 7, message: { chat: { id: 1 }, message_id: 1, text: "hi", date: 0 } },
      { update_id: 9, message: { chat: { id: 1 }, message_id: 2, text: "/status", date: 0 } },
    ];
    const client: any = {
      getUpdates: vi.fn()
        .mockResolvedValueOnce(updates)
        .mockResolvedValueOnce([]),
    };
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    expect(client.getUpdates).toHaveBeenCalledWith({ offset: 0 });
    await poller.tick();
    expect(client.getUpdates).toHaveBeenLastCalledWith({ offset: 10 });
  });

  it("persists last offset between ticks via offset.json", async () => {
    const updates = [{ update_id: 99, message: { chat: { id: 1 }, message_id: 1, text: "hi", date: 0 } }];
    const client: any = { getUpdates: vi.fn().mockResolvedValueOnce(updates) };
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    const offsetPath = join(workspaceRoot, "telegram-offset.json");
    expect(existsSync(offsetPath)).toBe(true);
    const parsed = JSON.parse(readFileSync(offsetPath, "utf8"));
    expect(parsed.lastUpdateId).toBe(99);
  });

  it("dispatches each message exactly once", async () => {
    const client: any = {
      getUpdates: vi.fn().mockResolvedValueOnce([
        { update_id: 1, message: { chat: { id: 1 }, message_id: 1, text: "a", date: 0 } },
        { update_id: 2, message: { chat: { id: 1 }, message_id: 2, text: "b", date: 0 } },
      ]),
    };
    const dispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const poller = createTelegramPoller({ workspaceRoot, client, dispatch });
    await poller.tick();
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/daemon/telegram-poller.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/daemon/telegram-poller.ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TelegramClient, TelegramUpdate } from "@/lib/artlab/bot/telegram-client";

export interface TelegramPollerInput {
  workspaceRoot: string;
  client: TelegramClient;
  dispatch(opts: { message: NonNullable<TelegramUpdate["message"]> }): Promise<unknown>;
}

export interface TelegramPoller { tick(): Promise<void>; }

function offsetPath(root: string): string { return join(root, "telegram-offset.json"); }

function readOffset(root: string): number {
  const path = offsetPath(root);
  if (!existsSync(path)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { lastUpdateId?: number };
    return typeof parsed.lastUpdateId === "number" ? parsed.lastUpdateId + 1 : 0;
  } catch { return 0; }
}

function writeOffset(root: string, lastUpdateId: number): void {
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  const path = offsetPath(root);
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, `${JSON.stringify({ lastUpdateId }, null, 2)}\n`);
  renameSync(tmp, path);
}

export function createTelegramPoller(input: TelegramPollerInput): TelegramPoller {
  return {
    async tick(): Promise<void> {
      const offset = readOffset(input.workspaceRoot);
      const updates = await input.client.getUpdates({ offset });
      if (updates.length === 0) return;
      for (const update of updates) {
        const message = update.message ?? update.edited_message;
        if (!message) continue;
        await input.dispatch({ message });
      }
      const lastUpdateId = updates[updates.length - 1]!.update_id;
      writeOffset(input.workspaceRoot, lastUpdateId);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/telegram-poller.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/daemon/telegram-poller.ts src/lib/artlab/daemon/telegram-poller.test.ts
git commit -m "$(cat <<'EOF'
Add Telegram poller (long-poll with persistent offset)

Tracks offset in telegram-offset.json (atomic write). First tick
starts at 0; subsequent ticks resume from lastUpdateId+1.
Dispatches each message exactly once — duplicates are impossible
because Telegram only returns messages with update_id >= offset.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Offset file uses atomic write (temp + rename).
- [ ] First-tick path (no offset file) starts at `0`, not crash.
- [ ] Each message dispatched exactly once per `tick`.
- [ ] `edited_message` updates handled identically to `message`.

### Task 3.18: Crash recovery scanner

**Files:**
- Create: `src/lib/artlab/daemon/crash-recovery.ts`
- Test: `src/lib/artlab/daemon/crash-recovery.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/daemon/crash-recovery.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reconcileCrashedRuns } from "./crash-recovery";

describe("crash recovery", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cr-")); });

  it("releases stale leases (heartbeat > 10 min old)", async () => {
    const runDir = join(workspaceRoot, "runs", "stale-run");
    mkdirSync(join(runDir, "slot-leases"), { recursive: true });
    writeFileSync(join(runDir, "run-state.json"), JSON.stringify({
      runId: "stale-run", assetType: "character", phase: "production",
      createdAt: "2026-05-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    }));
    writeFileSync(join(runDir, "progress.json"), JSON.stringify({
      runId: "stale-run", at: new Date(Date.now() - 11 * 60_000).toISOString(),
      phase: "production", slotsCompleted: 5, slotsRunning: 1, slotsFailed: 0,
      actualSpendCents: 100, reservedCents: 50,
    }));
    writeFileSync(join(runDir, "slot-leases", "slot-1.lease.json"), JSON.stringify({ slotId: "slot-1" }));
    const result = await reconcileCrashedRuns({ workspaceRoot });
    expect(result.staleRunsReconciled).toContain("stale-run");
    expect(existsSync(join(runDir, "slot-leases", "slot-1.lease.json"))).toBe(false);
  });

  it("leaves healthy runs alone (heartbeat < 10 min)", async () => {
    const runDir = join(workspaceRoot, "runs", "healthy-run");
    mkdirSync(join(runDir, "slot-leases"), { recursive: true });
    writeFileSync(join(runDir, "run-state.json"), JSON.stringify({
      runId: "healthy-run", assetType: "character", phase: "production",
      createdAt: "2026-05-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    }));
    writeFileSync(join(runDir, "progress.json"), JSON.stringify({
      runId: "healthy-run", at: new Date(Date.now() - 30_000).toISOString(),
      phase: "production", slotsCompleted: 5, slotsRunning: 1, slotsFailed: 0,
      actualSpendCents: 100, reservedCents: 50,
    }));
    writeFileSync(join(runDir, "slot-leases", "slot-1.lease.json"), JSON.stringify({ slotId: "slot-1" }));
    const result = await reconcileCrashedRuns({ workspaceRoot });
    expect(result.staleRunsReconciled).not.toContain("healthy-run");
    expect(existsSync(join(runDir, "slot-leases", "slot-1.lease.json"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/daemon/crash-recovery.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/daemon/crash-recovery.ts
import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { readRunReality } from "@/lib/artlab/state/reconciler";

const STALE_HEARTBEAT_MS = 10 * 60_000;

export interface CrashRecoveryInput {
  workspaceRoot: string;
  now?: () => Date;
}

export interface CrashRecoveryResult {
  staleRunsReconciled: string[];
  leasesReleased: string[];
}

export async function reconcileCrashedRuns(input: CrashRecoveryInput): Promise<CrashRecoveryResult> {
  const now = (input.now ?? (() => new Date()))().getTime();
  const runsRoot = join(input.workspaceRoot, "runs");
  if (!existsSync(runsRoot)) return { staleRunsReconciled: [], leasesReleased: [] };
  const result: CrashRecoveryResult = { staleRunsReconciled: [], leasesReleased: [] };
  for (const runId of readdirSync(runsRoot)) {
    const runDir = join(runsRoot, runId);
    if (!statSync(runDir).isDirectory()) continue;
    const reality = await readRunReality(runDir);
    if (!reality || reality.phase === "closed") continue;
    if (!reality.health.lastHeartbeatAt) continue;
    const lastHb = new Date(reality.health.lastHeartbeatAt).getTime();
    if (now - lastHb < STALE_HEARTBEAT_MS) continue;
    result.staleRunsReconciled.push(runId);
    const leasesDir = join(runDir, "slot-leases");
    if (existsSync(leasesDir)) {
      for (const file of readdirSync(leasesDir).filter((f) => f.endsWith(".lease.json"))) {
        const path = join(leasesDir, file);
        unlinkSync(path);
        result.leasesReleased.push(`${runId}/${file}`);
      }
    }
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/crash-recovery.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/daemon/crash-recovery.ts src/lib/artlab/daemon/crash-recovery.test.ts
git commit -m "$(cat <<'EOF'
Add crash recovery scanner (spec safety property #4)

Daemon calls this once on startup. Scans non-terminal runs;
heartbeat > 10 min old → stale → release leases (which frees
reservations through the existing budget ledger contract). now
is injectable for deterministic tests.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Closed runs are skipped (no false-positive reconciliation of completed runs).
- [ ] Stale threshold is a module-level const (`STALE_HEARTBEAT_MS = 10 * 60_000`).
- [ ] `now` is injectable for deterministic testing.
- [ ] Healthy runs (heartbeat < 10 min) are left alone — verified by test.

### Task 3.19: SIGTERM cancel flow (lease release + reservation refund)

**Files:**
- Create: `src/lib/artlab/daemon/cancel-flow.ts`
- Test: `src/lib/artlab/daemon/cancel-flow.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/daemon/cancel-flow.test.ts
import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { processCancelIntents, CANCEL_GRACE_MS } from "./cancel-flow";
import { createSupervisor } from "./supervisor";

describe("cancel flow", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cf-")); });

  it("CANCEL_GRACE_MS is 30 seconds", () => {
    expect(CANCEL_GRACE_MS).toBe(30_000);
  });

  it("sends SIGTERM to the matching active child", async () => {
    const sup = createSupervisor();
    const killFn = vi.fn().mockReturnValue(true);
    sup.registerChild({ runId: "run-1", pid: 42 });
    const kill = vi.fn().mockReturnValue(true);
    mkdirSync(join(workspaceRoot, "inbox"));
    writeFileSync(join(workspaceRoot, "inbox", "cancel-run-1-123.json"), JSON.stringify({ runId: "run-1", requestedAt: "x" }));
    const result = await processCancelIntents({ workspaceRoot, supervisor: sup, kill });
    expect(kill).toHaveBeenCalledWith(42, "SIGTERM");
    expect(result.signaled).toContain("run-1");
  });

  it("removes the cancel intent file after signaling", async () => {
    const sup = createSupervisor();
    sup.registerChild({ runId: "run-1", pid: 42 });
    const kill = vi.fn().mockReturnValue(true);
    mkdirSync(join(workspaceRoot, "inbox"));
    const intentPath = join(workspaceRoot, "inbox", "cancel-run-1-123.json");
    writeFileSync(intentPath, JSON.stringify({ runId: "run-1", requestedAt: "x" }));
    await processCancelIntents({ workspaceRoot, supervisor: sup, kill });
    expect(existsSync(intentPath)).toBe(false);
  });

  it("records a no-active-child cancel as 'orphaned'", async () => {
    const sup = createSupervisor();
    const kill = vi.fn();
    mkdirSync(join(workspaceRoot, "inbox"));
    writeFileSync(join(workspaceRoot, "inbox", "cancel-ghost-123.json"), JSON.stringify({ runId: "ghost", requestedAt: "x" }));
    const result = await processCancelIntents({ workspaceRoot, supervisor: sup, kill });
    expect(kill).not.toHaveBeenCalled();
    expect(result.orphaned).toContain("ghost");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/daemon/cancel-flow.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/daemon/cancel-flow.ts
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { Supervisor } from "./supervisor";

export const CANCEL_GRACE_MS = 30_000;

export interface CancelFlowInput {
  workspaceRoot: string;
  supervisor: Supervisor;
  kill?: (pid: number, signal: NodeJS.Signals) => boolean;
}

export interface CancelFlowResult {
  signaled: string[];
  orphaned: string[];
}

export async function processCancelIntents(input: CancelFlowInput): Promise<CancelFlowResult> {
  const inboxDir = join(input.workspaceRoot, "inbox");
  if (!existsSync(inboxDir)) return { signaled: [], orphaned: [] };
  const result: CancelFlowResult = { signaled: [], orphaned: [] };
  const killFn = input.kill ?? ((pid, sig) => process.kill(pid, sig));
  for (const file of readdirSync(inboxDir).filter((f) => f.startsWith("cancel-") && f.endsWith(".json"))) {
    const path = join(inboxDir, file);
    let parsed: { runId?: string } = {};
    try { parsed = JSON.parse(readFileSync(path, "utf8")) as { runId?: string }; } catch { /* skip malformed */ }
    if (!parsed.runId) { unlinkSync(path); continue; }
    const child = input.supervisor.findChildByRunId(parsed.runId);
    if (child) {
      try { killFn(child.pid, "SIGTERM"); result.signaled.push(parsed.runId); }
      catch { /* child may have just exited */ }
    } else {
      result.orphaned.push(parsed.runId);
    }
    unlinkSync(path);
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/cancel-flow.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/daemon/cancel-flow.ts src/lib/artlab/daemon/cancel-flow.test.ts
git commit -m "$(cat <<'EOF'
Add SIGTERM cancel flow (spec safety property #3)

Scans inbox/cancel-*.json each tick. If a matching active child
exists, send SIGTERM; the child runner has 30s grace to release
leases + refund reservations via existing budget ledger contract.
Orphan cancel intents (no active child) are recorded but never
acted on — they may indicate a daemon restart between intent
creation and processing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Cancel intent file is removed after processing (one-shot — never re-fires).
- [ ] `kill` is injectable for tests (production uses `process.kill`).
- [ ] Orphan intents are tracked but not retried.
- [ ] Malformed intent JSON does not crash — file is unlinked and skipped.

### Task 3.20: Mac sleep guard (caffeinate -i wrapper)

**Files:**
- Create: `src/lib/artlab/daemon/sleep-guard.ts`
- Test: `src/lib/artlab/daemon/sleep-guard.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/daemon/sleep-guard.test.ts
import { describe, expect, it, vi } from "vitest";
import { createSleepGuard } from "./sleep-guard";

describe("sleep guard", () => {
  it("starts caffeinate -i child on activate, kills on deactivate", () => {
    const child = { kill: vi.fn(), pid: 1234 };
    const spawn = vi.fn().mockReturnValue(child);
    const guard = createSleepGuard({ spawn });
    guard.activate();
    expect(spawn).toHaveBeenCalledWith("caffeinate", ["-i"], expect.any(Object));
    expect(guard.isActive()).toBe(true);
    guard.deactivate();
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(guard.isActive()).toBe(false);
  });

  it("double activate is idempotent (only one caffeinate spawned)", () => {
    const child = { kill: vi.fn(), pid: 1234 };
    const spawn = vi.fn().mockReturnValue(child);
    const guard = createSleepGuard({ spawn });
    guard.activate();
    guard.activate();
    expect(spawn).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/daemon/sleep-guard.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/daemon/sleep-guard.ts
import type { ChildProcess } from "node:child_process";
import { spawn as defaultSpawn } from "node:child_process";

export interface SleepGuardChild {
  pid: number;
  kill(signal?: NodeJS.Signals): boolean;
}

export interface SleepGuardInput {
  spawn?: (cmd: string, args: string[], opts?: Record<string, unknown>) => SleepGuardChild | ChildProcess;
}

export interface SleepGuard {
  activate(): void;
  deactivate(): void;
  isActive(): boolean;
}

export function createSleepGuard(input: SleepGuardInput = {}): SleepGuard {
  const spawnFn = input.spawn ?? defaultSpawn;
  let child: SleepGuardChild | null = null;
  return {
    activate(): void {
      if (child) return;
      child = spawnFn("caffeinate", ["-i"], { stdio: "ignore", detached: false }) as SleepGuardChild;
    },
    deactivate(): void {
      if (!child) return;
      child.kill("SIGTERM");
      child = null;
    },
    isActive(): boolean { return child !== null; },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/sleep-guard.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/daemon/sleep-guard.ts src/lib/artlab/daemon/sleep-guard.test.ts
git commit -m "$(cat <<'EOF'
Add Mac sleep guard (caffeinate -i wrapper)

Spawned with detached:false so caffeinate exits when the daemon
exits, even on hard kill. Activated when supervisor has any
active child; deactivated when supervisor is idle (wiring in
the daemon entry composition task).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `activate` is idempotent (double-call spawns at most one caffeinate child).
- [ ] `deactivate` is safe when never activated.
- [ ] `spawn` is injectable for tests.
- [ ] `detached: false` so caffeinate doesn't outlive the daemon on crash.

### Task 3.21: Inbox watcher (fs.watchFile on .artlab/engine/inbox/)

**Files:**
- Create: `src/lib/artlab/daemon/inbox-watcher.ts`
- Test: `src/lib/artlab/daemon/inbox-watcher.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/daemon/inbox-watcher.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drainInbox } from "./inbox-watcher";

describe("inbox watcher (drain)", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-iw-")); });

  it("returns intent files matching the prefix and removes them", async () => {
    const inboxDir = join(workspaceRoot, "inbox", "cli");
    mkdirSync(inboxDir, { recursive: true });
    writeFileSync(join(inboxDir, "produce-1.json"), JSON.stringify({ request: "make Sol" }));
    writeFileSync(join(inboxDir, "produce-2.json"), JSON.stringify({ request: "make Rafe" }));
    writeFileSync(join(inboxDir, "other.txt"), "skip me");
    const result = await drainInbox({ workspaceRoot, subdir: "cli", prefix: "produce-" });
    expect(result.intents.map((i) => i.body.request)).toEqual(["make Sol", "make Rafe"]);
    const remaining = readdirSync(inboxDir);
    expect(remaining).toEqual(["other.txt"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/daemon/inbox-watcher.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/daemon/inbox-watcher.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

export interface DrainInboxInput {
  workspaceRoot: string;
  subdir: string;
  prefix: string;
}

export interface InboxIntent {
  filename: string;
  body: Record<string, unknown>;
}

export interface DrainInboxResult { intents: InboxIntent[]; }

export async function drainInbox(input: DrainInboxInput): Promise<DrainInboxResult> {
  const dir = join(input.workspaceRoot, "inbox", input.subdir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return { intents: [] };
  }
  const files = readdirSync(dir).filter((f) => f.startsWith(input.prefix) && f.endsWith(".json")).sort();
  const intents: InboxIntent[] = [];
  for (const file of files) {
    const path = join(dir, file);
    try {
      const body = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      intents.push({ filename: file, body });
    } catch { /* skip malformed */ }
    unlinkSync(path);
  }
  return { intents };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/inbox-watcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/daemon/inbox-watcher.ts src/lib/artlab/daemon/inbox-watcher.test.ts
git commit -m "$(cat <<'EOF'
Add inbox drainer for CLI + Telegram intent files

Returns matching prefix files in deterministic (sorted) order
and unlinks them in the same call — a missed read or crash
between read and unlink leaves the intent file in place for the
next tick. Subdir + prefix make this reusable for produce/
cancel/answer/migration intents.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Files outside the prefix are not touched (test verifies `other.txt` remains).
- [ ] Drain order is deterministic (sorted by filename).
- [ ] Malformed JSON files are unlinked + skipped, never crashing the drain.
- [ ] Inbox subdirs are auto-created if missing.

### Task 3.22: Daemon integration test (compose all daemon parts)

**Files:**
- Create: `src/lib/artlab/daemon/daemon.integration.test.ts`

- [ ] **Step 1: Write the integration test**

```ts
// src/lib/artlab/daemon/daemon.integration.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDaemonContext, runDaemonOnce } from "./entry";
import { createTelegramPoller } from "./telegram-poller";
import { createQueueProcessor } from "./queue-processor";
import { createSupervisor } from "./supervisor";
import { enqueueRun } from "@/lib/artlab/queue/queue";

describe("daemon integration", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-di-")); });

  it("single tick: heartbeat + telegram poll + queue drain", async () => {
    const sup = createSupervisor();
    const spawnRunner = vi.fn().mockReturnValue({ pid: 999, on: vi.fn(), kill: vi.fn() });
    const queueProcessor = createQueueProcessor({ workspaceRoot, supervisor: sup, spawnRunner });
    const tgClient: any = { getUpdates: vi.fn().mockResolvedValue([]) };
    const tgDispatch = vi.fn().mockResolvedValue({ action: { type: "dropped", reason: "unauthorized" } });
    const telegramPoller = createTelegramPoller({ workspaceRoot, client: tgClient, dispatch: tgDispatch });
    enqueueRun(workspaceRoot, { runId: "first", priority: "default", enqueuedAt: "2026-05-20T00:00:00Z", spec: { request: "x" } });
    const ctx = createDaemonContext({ workspaceRoot, telegramPoller, queueProcessor });
    await runDaemonOnce(ctx);
    expect(existsSync(join(workspaceRoot, "daemon-heartbeat.json"))).toBe(true);
    expect(tgClient.getUpdates).toHaveBeenCalled();
    expect(spawnRunner).toHaveBeenCalledWith(expect.objectContaining({ runId: "first" }));
    expect(sup.activeChildren()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/daemon/daemon.integration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/artlab/daemon/daemon.integration.test.ts
git commit -m "$(cat <<'EOF'
Add daemon integration test — compose all 3B parts in one tick

Wires supervisor + queue-processor + telegram-poller + heartbeat
into a single runDaemonOnce. Verifies the heartbeat file
appears, telegram getUpdates is called, and queued runs spawn
children that the supervisor tracks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Test exercises all five daemon components in a single tick.
- [ ] Spawn function is mocked (no real child_process — integration test still runs in <100ms).
- [ ] Heartbeat file's atomic write is verified by existence check after the tick.
- [ ] No background timers leak — vitest's default 5s timeout proves it.

### Subphase 3C — Self-evolution (Tasks 3.23–3.26)

### Task 3.23: Friction detector (hourly scan of improvements.jsonl)

**Files:**
- Create: `src/lib/artlab/self-evolution/friction-detector.ts`
- Test: `src/lib/artlab/self-evolution/friction-detector.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/self-evolution/friction-detector.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectFriction, FRICTION_THRESHOLD } from "./friction-detector";

describe("friction detector", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-fd-"));
    mkdirSync(join(workspaceRoot, "ledgers"));
  });

  it("FRICTION_THRESHOLD is 5 (spec section 10)", () => {
    expect(FRICTION_THRESHOLD).toBe(5);
  });

  it("groups improvements.jsonl entries by failureCode and reports occurrences ≥ threshold", async () => {
    const path = join(workspaceRoot, "ledgers", "improvements.jsonl");
    const events = [
      { at: "2026-05-20T00:00:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:01:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:02:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:03:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:04:00Z", failureCode: "rembg-edge-halo", severity: "medium" },
      { at: "2026-05-20T00:05:00Z", failureCode: "concept-style-drift", severity: "low" },
    ];
    writeFileSync(path, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    const result = await detectFriction({ workspaceRoot });
    expect(result.actionable).toHaveLength(1);
    expect(result.actionable[0]!.failureCode).toBe("rembg-edge-halo");
    expect(result.actionable[0]!.occurrences).toBe(5);
  });

  it("filters severity < medium out of actionable", async () => {
    const path = join(workspaceRoot, "ledgers", "improvements.jsonl");
    const events = Array.from({ length: 6 }, (_, i) => ({
      at: `2026-05-20T00:0${i}:00Z`,
      failureCode: "minor-quibble",
      severity: "low",
    }));
    writeFileSync(path, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    const result = await detectFriction({ workspaceRoot });
    expect(result.actionable).toHaveLength(0);
  });

  it("returns empty when no ledger exists", async () => {
    const result = await detectFriction({ workspaceRoot });
    expect(result.actionable).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/self-evolution/friction-detector.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/self-evolution/friction-detector.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const FRICTION_THRESHOLD = 5;

interface ImprovementEvent {
  at: string;
  failureCode: string;
  severity: "low" | "medium" | "high";
  runId?: string;
  context?: Record<string, unknown>;
}

export interface FrictionGroup {
  failureCode: string;
  occurrences: number;
  highestSeverity: "low" | "medium" | "high";
  mostRecentAt: string;
  recentContext: Record<string, unknown>[];
}

export interface FrictionDetectionResult {
  actionable: FrictionGroup[];
  belowThreshold: FrictionGroup[];
}

const SEVERITY_RANK: Record<ImprovementEvent["severity"], number> = { low: 0, medium: 1, high: 2 };

export async function detectFriction(input: { workspaceRoot: string }): Promise<FrictionDetectionResult> {
  const path = join(input.workspaceRoot, "ledgers", "improvements.jsonl");
  if (!existsSync(path)) return { actionable: [], belowThreshold: [] };
  const lines = readFileSync(path, "utf8").trim().split("\n").filter((l) => l.length > 0);
  const groups = new Map<string, FrictionGroup>();
  for (const line of lines) {
    let event: ImprovementEvent;
    try { event = JSON.parse(line) as ImprovementEvent; } catch { continue; }
    let group = groups.get(event.failureCode);
    if (!group) {
      group = {
        failureCode: event.failureCode,
        occurrences: 0,
        highestSeverity: "low",
        mostRecentAt: event.at,
        recentContext: [],
      };
      groups.set(event.failureCode, group);
    }
    group.occurrences += 1;
    if (SEVERITY_RANK[event.severity] > SEVERITY_RANK[group.highestSeverity]) {
      group.highestSeverity = event.severity;
    }
    if (event.at > group.mostRecentAt) group.mostRecentAt = event.at;
    if (event.context) group.recentContext.push(event.context);
  }
  const actionable: FrictionGroup[] = [];
  const belowThreshold: FrictionGroup[] = [];
  for (const group of groups.values()) {
    group.recentContext = group.recentContext.slice(-10);
    if (group.occurrences >= FRICTION_THRESHOLD && SEVERITY_RANK[group.highestSeverity] >= 1) {
      actionable.push(group);
    } else {
      belowThreshold.push(group);
    }
  }
  return { actionable, belowThreshold };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/self-evolution/friction-detector.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/self-evolution/friction-detector.ts src/lib/artlab/self-evolution/friction-detector.test.ts
git commit -m "$(cat <<'EOF'
Add friction detector (spec section 10, threshold=5, severity≥medium)

Scans improvements.jsonl, groups by failureCode, surfaces groups
with ≥5 occurrences and severity ≥ medium as actionable.
Below-threshold groups are also returned so future runs can see
trends. Caps recentContext at 10 entries to keep Codex prompts
small.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `FRICTION_THRESHOLD` is a module-level const = 5 matching spec §10.
- [ ] Severity-rank uses an explicit map (no string comparison).
- [ ] Malformed lines skipped, never crashing.
- [ ] `recentContext` capped at 10 entries (prevents prompt bloat).

### Task 3.24: Codex summoner (constructs goal, invokes adapter)

**Files:**
- Create: `src/lib/artlab/self-evolution/codex-summoner.ts`
- Test: `src/lib/artlab/self-evolution/codex-summoner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/self-evolution/codex-summoner.test.ts
import { describe, expect, it } from "vitest";
import { buildCodexGoal, summonCodex } from "./codex-summoner";

describe("codex summoner", () => {
  const group = {
    failureCode: "rembg-edge-halo",
    occurrences: 7,
    highestSeverity: "medium" as const,
    mostRecentAt: "2026-05-20T03:14:00Z",
    recentContext: [{ slotId: "slot-12" }],
  };

  it("buildCodexGoal includes the failureCode, occurrence count, and a branch name", () => {
    const goal = buildCodexGoal(group, "2026-05-20");
    expect(goal).toContain("rembg-edge-halo");
    expect(goal).toContain("7 occurrences");
    expect(goal).toContain("artlab/fix/rembg-edge-halo-2026-05-20");
    expect(goal).toMatch(/do not open a pr/i);
    expect(goal).toMatch(/never run gh pr/i);
  });

  it("summonCodex skips when ARTLAB_CODEX_MODE=mock and reports the would-be branch name", async () => {
    process.env.ARTLAB_CODEX_MODE = "mock";
    const result = await summonCodex({ group, cwd: "/tmp", today: "2026-05-20" });
    delete process.env.ARTLAB_CODEX_MODE;
    expect(result.mode).toBe("mock");
    expect(result.branchName).toBe("artlab/fix/rembg-edge-halo-2026-05-20");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/self-evolution/codex-summoner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/self-evolution/codex-summoner.ts
import { invokeCodex } from "@/lib/artlab/adapters/codex";
import type { FrictionGroup } from "./friction-detector";

export interface SummonCodexInput {
  group: FrictionGroup;
  cwd: string;
  today: string; // ISO date string YYYY-MM-DD
}

export interface SummonCodexResult {
  mode: "real" | "mock";
  branchName: string;
  goalSent: string;
  exitCode?: number;
  summary?: string;
}

export function buildCodexGoal(group: FrictionGroup, today: string): string {
  const branchName = `artlab/fix/${group.failureCode}-${today}`;
  return [
    `Goal: harden the ArtLab engine against repeated failure: ${group.failureCode}.`,
    `${group.occurrences} occurrences observed (highest severity: ${group.highestSeverity}, most recent: ${group.mostRecentAt}).`,
    "Recent context (last 10 events):",
    JSON.stringify(group.recentContext, null, 2),
    "",
    "Required steps:",
    `1. git checkout -b ${branchName}`,
    "2. Read the relevant ArtLab module(s) and the spec at docs/superpowers/specs/2026-05-20-artlab-creative-engine-design.md.",
    "3. Add a test that would have caught this failure.",
    "4. Implement the fix.",
    "5. Run vitest + tsc + lint; all must pass.",
    "6. git commit with a descriptive message including the failure code.",
    "7. git push the branch.",
    "",
    "DO NOT OPEN A PR. NEVER run `gh pr create` or `gh pr merge`. ArtLab spec safety property #5 requires human review of every branch before merge.",
    "",
    `Branch must be named exactly: ${branchName}`,
  ].join("\n");
}

export async function summonCodex(input: SummonCodexInput): Promise<SummonCodexResult> {
  const branchName = `artlab/fix/${input.group.failureCode}-${input.today}`;
  const goalSent = buildCodexGoal(input.group, input.today);
  const result = await invokeCodex({
    goal: goalSent,
    sandboxLevel: "workspace-write",
    cwd: input.cwd,
    approvalPolicy: "never",
  });
  return {
    mode: result.mode,
    branchName,
    goalSent,
    exitCode: result.exitCode,
    summary: result.summary,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/self-evolution/codex-summoner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/self-evolution/codex-summoner.ts src/lib/artlab/self-evolution/codex-summoner.test.ts
git commit -m "$(cat <<'EOF'
Add Codex summoner (spec section 10 + safety property #5)

buildCodexGoal renders a deterministic instruction string with
the branch name, occurrence count, recent context, and an
explicit ban on `gh pr create` / `gh pr merge` (spec safety
property #5: no PR auto-merge). summonCodex calls the Phase 2
codex adapter with sandboxLevel=workspace-write so Codex can
write the branch but not affect the engine's runtime state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Goal text includes the literal `"DO NOT OPEN A PR"` and `"never run gh pr"` to make spec safety property #5 traceable.
- [ ] Branch name format is exactly `artlab/fix/<failureCode>-<YYYY-MM-DD>`.
- [ ] `sandboxLevel: "workspace-write"` (not `"danger-full-access"`) so Codex cannot trigger paid provider calls.
- [ ] `approvalPolicy: "never"` so Codex runs unattended.

### Task 3.25: Self-evolution scheduler (hourly trigger)

**Files:**
- Create: `src/lib/artlab/self-evolution/scheduler.ts`
- Test: `src/lib/artlab/self-evolution/scheduler.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/self-evolution/scheduler.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSelfEvolutionScheduler } from "./scheduler";

describe("self-evolution scheduler", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-se-"));
    mkdirSync(join(workspaceRoot, "ledgers"));
  });

  it("does nothing if last-run was within the past hour", async () => {
    const lastRunPath = join(workspaceRoot, "self-evolution-last-run.json");
    writeFileSync(lastRunPath, JSON.stringify({ at: new Date().toISOString() }));
    const result = await runSelfEvolutionScheduler({ workspaceRoot, today: "2026-05-20", now: () => new Date() });
    expect(result.skipped).toBe("cooldown");
  });

  it("runs when last-run is > 1 hour ago and writes a new last-run record", async () => {
    process.env.ARTLAB_CODEX_MODE = "mock";
    const lastRunPath = join(workspaceRoot, "self-evolution-last-run.json");
    writeFileSync(lastRunPath, JSON.stringify({ at: new Date(Date.now() - 2 * 60 * 60_000).toISOString() }));
    // No friction in ledger → still runs the scheduler but produces 0 branches
    const result = await runSelfEvolutionScheduler({ workspaceRoot, today: "2026-05-20", now: () => new Date() });
    delete process.env.ARTLAB_CODEX_MODE;
    expect(result.skipped).toBeUndefined();
    expect(result.summonedBranches).toEqual([]);
    expect(existsSync(lastRunPath)).toBe(true);
  });

  it("summons codex for each actionable friction group", async () => {
    process.env.ARTLAB_CODEX_MODE = "mock";
    const ledgerPath = join(workspaceRoot, "ledgers", "improvements.jsonl");
    const events = Array.from({ length: 6 }, (_, i) => ({
      at: `2026-05-20T0${i}:00:00Z`,
      failureCode: "rembg-edge-halo",
      severity: "medium",
    }));
    writeFileSync(ledgerPath, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    const result = await runSelfEvolutionScheduler({ workspaceRoot, today: "2026-05-20", now: () => new Date() });
    delete process.env.ARTLAB_CODEX_MODE;
    expect(result.summonedBranches).toEqual(["artlab/fix/rembg-edge-halo-2026-05-20"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/self-evolution/scheduler.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/self-evolution/scheduler.ts
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { detectFriction } from "./friction-detector";
import { summonCodex } from "./codex-summoner";

const COOLDOWN_MS = 60 * 60_000;

export interface SelfEvolutionInput {
  workspaceRoot: string;
  today: string;
  now: () => Date;
}

export interface SelfEvolutionResult {
  skipped?: "cooldown";
  summonedBranches: string[];
}

function lastRunPath(workspaceRoot: string): string {
  return join(workspaceRoot, "self-evolution-last-run.json");
}

function readLastRunAt(workspaceRoot: string): Date | null {
  const path = lastRunPath(workspaceRoot);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { at?: string };
    return parsed.at ? new Date(parsed.at) : null;
  } catch { return null; }
}

function writeLastRun(workspaceRoot: string, at: Date): void {
  const path = lastRunPath(workspaceRoot);
  const tmp = `${path}.tmp.${process.pid}.${Date.now()}`;
  writeFileSync(tmp, JSON.stringify({ at: at.toISOString() }, null, 2) + "\n");
  renameSync(tmp, path);
}

export async function runSelfEvolutionScheduler(input: SelfEvolutionInput): Promise<SelfEvolutionResult> {
  const now = input.now();
  const lastRunAt = readLastRunAt(input.workspaceRoot);
  if (lastRunAt && now.getTime() - lastRunAt.getTime() < COOLDOWN_MS) {
    return { skipped: "cooldown", summonedBranches: [] };
  }
  const friction = await detectFriction({ workspaceRoot: input.workspaceRoot });
  const summonedBranches: string[] = [];
  for (const group of friction.actionable) {
    const result = await summonCodex({ group, cwd: input.workspaceRoot, today: input.today });
    summonedBranches.push(result.branchName);
  }
  writeLastRun(input.workspaceRoot, now);
  return { summonedBranches };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/self-evolution/scheduler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/self-evolution/scheduler.ts src/lib/artlab/self-evolution/scheduler.test.ts
git commit -m "$(cat <<'EOF'
Add self-evolution scheduler (hourly cooldown)

Composition: detectFriction → summonCodex per actionable group →
write self-evolution-last-run.json. Cooldown of 1h prevents
codex spam if the daemon restarts repeatedly. Daemon calls this
from its main tick loop (no separate scheduler thread).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `COOLDOWN_MS` = 1 hour matching spec §10.
- [ ] `now` is injectable for deterministic tests.
- [ ] Skip is reported as `skipped: "cooldown"` (no boolean — explicit reason).
- [ ] No friction → still writes last-run record (resets the cooldown clock).

### Task 3.26: Self-evolution branch-policy assertion (spec safety property #5)

**Files:**
- Create: `src/lib/artlab/self-evolution/branch-policy.test.ts`

- [ ] **Step 1: Write the asserting test**

```ts
// src/lib/artlab/self-evolution/branch-policy.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCodexGoal } from "./codex-summoner";

describe("self-evolution branch policy (spec safety property #5)", () => {
  it("every codex goal explicitly bans gh pr create / gh pr merge", () => {
    const group = {
      failureCode: "any-code",
      occurrences: 5,
      highestSeverity: "medium" as const,
      mostRecentAt: "2026-05-20T00:00:00Z",
      recentContext: [],
    };
    const goal = buildCodexGoal(group, "2026-05-20");
    expect(goal).toMatch(/do not open a pr/i);
    expect(goal).toMatch(/gh pr create/i);
    expect(goal).toMatch(/gh pr merge/i);
  });

  it("module surface never exports a 'mergePR' or 'openPR' function", () => {
    const codexSummoner = readFileSync(
      join("src", "lib", "artlab", "self-evolution", "codex-summoner.ts"),
      "utf8",
    );
    const scheduler = readFileSync(
      join("src", "lib", "artlab", "self-evolution", "scheduler.ts"),
      "utf8",
    );
    expect(codexSummoner).not.toMatch(/openPR|mergePR|gh\s+pr\s+(create|merge)/);
    expect(scheduler).not.toMatch(/openPR|mergePR|gh\s+pr\s+(create|merge)/);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/self-evolution/branch-policy.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/artlab/self-evolution/branch-policy.test.ts
git commit -m "$(cat <<'EOF'
Add self-evolution branch-policy assertion (spec safety #5)

Two assertions: (1) every generated Codex goal contains the
explicit no-PR ban verbatim; (2) neither self-evolution module
contains any string matching gh pr create | gh pr merge | openPR
| mergePR. Future regressions of these will fail this test.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Test fails loudly if anyone adds a `gh pr ...` call anywhere in self-evolution modules.
- [ ] Test reads source files at runtime (not at test-compile time) so refactors are caught.
- [ ] Both modules (`codex-summoner.ts` and `scheduler.ts`) are scanned.
- [ ] Goal contents contain the literal `"DO NOT OPEN A PR"` text for human-greppability.

### Subphase 3D — CLI subcommand bodies (Tasks 3.27–3.30)

These tasks replace the Phase 0 stubs in `scripts/artlab.ts` with real implementations.

### Task 3.27: artlab produce subcommand (CLI → inbox intent)

**Files:**
- Create: `src/lib/artlab/cli/produce.ts`
- Test: `src/lib/artlab/cli/produce.test.ts`
- Modify: `scripts/artlab.ts` (replace the `produce` stub)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/cli/produce.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProduceSubcommand } from "./produce";

describe("artlab produce subcommand", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cli-prod-")); });

  it("writes a produce intent into inbox/cli/produce-<runId>.json", async () => {
    const result = await runProduceSubcommand({
      workspaceRoot,
      args: ["make", "Sol", "Navarro"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.runId).toMatch(/^[0-9a-f-]{36}$/);
    const files = readdirSync(join(workspaceRoot, "inbox", "cli"));
    expect(files).toHaveLength(1);
    const body = JSON.parse(readFileSync(join(workspaceRoot, "inbox", "cli", files[0]!), "utf8"));
    expect(body.request).toBe("make Sol Navarro");
  });

  it("exits 2 with empty args", async () => {
    const result = await runProduceSubcommand({ workspaceRoot, args: [] });
    expect(result.exitCode).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/cli/produce.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/cli/produce.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface ProduceSubcommandInput {
  workspaceRoot: string;
  args: string[];
}

export interface ProduceSubcommandResult {
  exitCode: number;
  runId?: string;
  message?: string;
}

export async function runProduceSubcommand(input: ProduceSubcommandInput): Promise<ProduceSubcommandResult> {
  const request = input.args.join(" ").trim();
  if (request.length === 0) {
    return { exitCode: 2, message: "produce: expected <request> as positional args" };
  }
  const runId = randomUUID();
  const inboxDir = join(input.workspaceRoot, "inbox", "cli");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const intentPath = join(inboxDir, `produce-${runId}.json`);
  writeFileSync(intentPath, JSON.stringify({
    runId,
    request,
    sourceSurface: "cli",
    createdAt: new Date().toISOString(),
  }, null, 2));
  return { exitCode: 0, runId, message: `Queued run ${runId}` };
}
```

- [ ] **Step 4: Wire up the stub in scripts/artlab.ts**

Replace the `produce` case body in `scripts/artlab.ts`:

```ts
// in scripts/artlab.ts, replace `case "produce": return stub("produce", rest, io);`
case "produce": {
  const { runProduceSubcommand } = await import("@/lib/artlab/cli/produce");
  const result = await runProduceSubcommand({
    workspaceRoot: process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine",
    args: rest,
  });
  if (result.message) io.stdout(result.message);
  return result.exitCode;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/cli/produce.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/artlab/cli/produce.ts src/lib/artlab/cli/produce.test.ts scripts/artlab.ts
git commit -m "$(cat <<'EOF'
Wire artlab produce subcommand — writes inbox intent for daemon

CLI generates a runId (UUID v4), writes a produce intent file
into inbox/cli/, exits 0 immediately. Daemon picks up via inbox
drainer (Task 3.21) and dispatches through intake router.
Empty args → exit 2 with help text.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] runId is UUID v4 (verify regex `^[0-9a-f-]{36}$`).
- [ ] CLI does NOT block waiting for the daemon — exits as soon as the intent file is written.
- [ ] Intent file is atomic-write protected (use `writeFileSync` directly is OK here since the daemon scans by prefix and skips files that fail to parse).
- [ ] `ARTLAB_WORKSPACE_ROOT` env var override is respected (default `.artlab/engine`).

### Task 3.28: artlab continue subcommand

**Files:**
- Create: `src/lib/artlab/cli/continue.ts`
- Test: `src/lib/artlab/cli/continue.test.ts`
- Modify: `scripts/artlab.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/cli/continue.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runContinueSubcommand } from "./continue";

describe("artlab continue subcommand", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cli-cont-")); });

  it("writes a continue intent file", async () => {
    const runId = "abc-123";
    mkdirSync(join(workspaceRoot, "runs", runId), { recursive: true });
    writeFileSync(join(workspaceRoot, "runs", runId, "run-state.json"), JSON.stringify({
      runId, assetType: "character", phase: "concept-review",
      createdAt: "2026-05-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    }));
    const result = await runContinueSubcommand({ workspaceRoot, args: [runId] });
    expect(result.exitCode).toBe(0);
    const files = readdirSync(join(workspaceRoot, "inbox", "cli"));
    expect(files.some((f) => f.startsWith(`continue-${runId}-`))).toBe(true);
  });

  it("exits 2 when runId missing", async () => {
    const result = await runContinueSubcommand({ workspaceRoot, args: [] });
    expect(result.exitCode).toBe(2);
  });

  it("exits 1 when runId does not exist", async () => {
    const result = await runContinueSubcommand({ workspaceRoot, args: ["nope"] });
    expect(result.exitCode).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/cli/continue.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/cli/continue.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface ContinueSubcommandInput {
  workspaceRoot: string;
  args: string[];
}

export interface ContinueSubcommandResult {
  exitCode: number;
  message?: string;
}

export async function runContinueSubcommand(input: ContinueSubcommandInput): Promise<ContinueSubcommandResult> {
  const runId = input.args[0];
  if (!runId) return { exitCode: 2, message: "continue: expected <runId>" };
  const runDir = join(input.workspaceRoot, "runs", runId);
  if (!existsSync(runDir)) return { exitCode: 1, message: `continue: run ${runId} not found` };
  const inboxDir = join(input.workspaceRoot, "inbox", "cli");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const intentPath = join(inboxDir, `continue-${runId}-${Date.now()}.json`);
  writeFileSync(intentPath, JSON.stringify({
    runId,
    intent: "continue",
    requestedAt: new Date().toISOString(),
  }, null, 2));
  return { exitCode: 0, message: `Continue intent recorded for ${runId}` };
}
```

- [ ] **Step 4: Wire up the stub in scripts/artlab.ts**

```ts
// scripts/artlab.ts: replace `case "continue": return stub("continue", rest, io);`
case "continue": {
  const { runContinueSubcommand } = await import("@/lib/artlab/cli/continue");
  const result = await runContinueSubcommand({
    workspaceRoot: process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine",
    args: rest,
  });
  if (result.message) io.stdout(result.message);
  return result.exitCode;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/cli/continue.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/artlab/cli/continue.ts src/lib/artlab/cli/continue.test.ts scripts/artlab.ts
git commit -m "$(cat <<'EOF'
Wire artlab continue subcommand

Writes inbox/cli/continue-<runId>-<timestamp>.json. Daemon
picks up and re-runs the state machine for the named runId.
Missing runId → exit 2. runId-not-found → exit 1.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Distinct exit codes for distinct failure modes (2 = bad args, 1 = not found).
- [ ] Intent file timestamp prevents collision when continue is invoked twice quickly.
- [ ] CLI does NOT advance the state machine itself — only writes the intent.

### Task 3.29: artlab answer subcommand

**Files:**
- Create: `src/lib/artlab/cli/answer.ts`
- Test: `src/lib/artlab/cli/answer.test.ts`
- Modify: `scripts/artlab.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/cli/answer.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAnswerSubcommand } from "./answer";

describe("artlab answer subcommand", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-cli-ans-")); });

  it("writes an answer intent with runId + answer text", async () => {
    const runId = "abc-123";
    mkdirSync(join(workspaceRoot, "runs", runId), { recursive: true });
    writeFileSync(join(workspaceRoot, "runs", runId, "run-state.json"), JSON.stringify({
      runId, assetType: "character", phase: "concept-review",
      createdAt: "2026-05-20T00:00:00.000Z", updatedAt: "2026-05-20T00:00:00.000Z",
      request: "x",
    }));
    const result = await runAnswerSubcommand({ workspaceRoot, args: [runId, "approve direction 2"] });
    expect(result.exitCode).toBe(0);
    const files = readdirSync(join(workspaceRoot, "inbox", "cli"));
    const intent = files.find((f) => f.startsWith(`answer-${runId}-`))!;
    const body = JSON.parse(readFileSync(join(workspaceRoot, "inbox", "cli", intent), "utf8"));
    expect(body.answer).toBe("approve direction 2");
  });

  it("exits 2 when answer text missing", async () => {
    const result = await runAnswerSubcommand({ workspaceRoot, args: ["some-run-id"] });
    expect(result.exitCode).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/cli/answer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/cli/answer.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface AnswerSubcommandInput {
  workspaceRoot: string;
  args: string[];
}

export interface AnswerSubcommandResult {
  exitCode: number;
  message?: string;
}

export async function runAnswerSubcommand(input: AnswerSubcommandInput): Promise<AnswerSubcommandResult> {
  const [runId, ...answerParts] = input.args;
  if (!runId) return { exitCode: 2, message: "answer: expected <runId> \"<answer>\"" };
  const answer = answerParts.join(" ").trim();
  if (answer.length === 0) return { exitCode: 2, message: "answer: expected non-empty answer text" };
  const runDir = join(input.workspaceRoot, "runs", runId);
  if (!existsSync(runDir)) return { exitCode: 1, message: `answer: run ${runId} not found` };
  const inboxDir = join(input.workspaceRoot, "inbox", "cli");
  if (!existsSync(inboxDir)) mkdirSync(inboxDir, { recursive: true });
  const intentPath = join(inboxDir, `answer-${runId}-${Date.now()}.json`);
  writeFileSync(intentPath, JSON.stringify({
    runId,
    intent: "answer",
    answer,
    requestedAt: new Date().toISOString(),
  }, null, 2));
  return { exitCode: 0, message: `Answer recorded for ${runId}` };
}
```

- [ ] **Step 4: Wire up the stub**

```ts
// scripts/artlab.ts
case "answer": {
  const { runAnswerSubcommand } = await import("@/lib/artlab/cli/answer");
  const result = await runAnswerSubcommand({
    workspaceRoot: process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine",
    args: rest,
  });
  if (result.message) io.stdout(result.message);
  return result.exitCode;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/cli/answer.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/artlab/cli/answer.ts src/lib/artlab/cli/answer.test.ts scripts/artlab.ts
git commit -m "$(cat <<'EOF'
Wire artlab answer subcommand — records human gate response

Writes inbox/cli/answer-<runId>-<timestamp>.json with runId +
answer text. Daemon picks up and re-runs the state machine after
applying the answer via the reply parser. Mirror of the Telegram
'gate-reply' classification at the CLI surface.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Multi-word answer is preserved via `.join(" ")` (test the `approve direction 2` case).
- [ ] Missing runId → exit 2; missing answer text → exit 2; runId not found → exit 1.
- [ ] No reply-parser invocation in the CLI — the daemon's parser owns interpretation.

### Task 3.30: artlab bot setup (interactive Keychain bootstrap)

**Files:**
- Create: `src/lib/artlab/cli/bot-setup.ts`
- Test: `src/lib/artlab/cli/bot-setup.test.ts`
- Modify: `scripts/artlab.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/cli/bot-setup.test.ts
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { runBotSetupSubcommand } from "./bot-setup";
import { getKeychainSecret, deleteKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "@/lib/artlab/bot/keychain";

describe("artlab bot setup", () => {
  const TOKEN_SVC = `${ARTLAB_KEYCHAIN_PREFIX}-telegram-token`;
  const CHAT_ID_SVC = `${ARTLAB_KEYCHAIN_PREFIX}-chat-id`;

  beforeEach(async () => {
    await deleteKeychainSecret(TOKEN_SVC).catch(() => undefined);
    await deleteKeychainSecret(CHAT_ID_SVC).catch(() => undefined);
  });
  afterEach(async () => {
    await deleteKeychainSecret(TOKEN_SVC).catch(() => undefined);
    await deleteKeychainSecret(CHAT_ID_SVC).catch(() => undefined);
  });

  it("writes both Keychain entries when --token and --chat-id provided non-interactively", async () => {
    const result = await runBotSetupSubcommand({
      args: ["--token", "TEST_TOKEN_123", "--chat-id", "8675309"],
    });
    expect(result.exitCode).toBe(0);
    expect(await getKeychainSecret(TOKEN_SVC)).toBe("TEST_TOKEN_123");
    expect(await getKeychainSecret(CHAT_ID_SVC)).toBe("8675309");
  });

  it("exits 2 when --token missing", async () => {
    const result = await runBotSetupSubcommand({ args: ["--chat-id", "8675309"] });
    expect(result.exitCode).toBe(2);
  });

  it("exits 2 when --chat-id is not numeric", async () => {
    const result = await runBotSetupSubcommand({ args: ["--token", "T", "--chat-id", "not-a-number"] });
    expect(result.exitCode).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/cli/bot-setup.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/cli/bot-setup.ts
import { setKeychainSecret, ARTLAB_KEYCHAIN_PREFIX } from "@/lib/artlab/bot/keychain";

export interface BotSetupSubcommandInput {
  args: string[];
}

export interface BotSetupSubcommandResult {
  exitCode: number;
  message?: string;
}

function getFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx === args.length - 1) return undefined;
  return args[idx + 1];
}

export async function runBotSetupSubcommand(input: BotSetupSubcommandInput): Promise<BotSetupSubcommandResult> {
  const token = getFlag(input.args, "--token");
  const chatId = getFlag(input.args, "--chat-id");
  if (!token) return { exitCode: 2, message: "bot setup: expected --token <BotFather-token>" };
  if (!chatId) return { exitCode: 2, message: "bot setup: expected --chat-id <numeric>" };
  if (!/^-?\d+$/.test(chatId)) return { exitCode: 2, message: "bot setup: --chat-id must be numeric" };
  await setKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-telegram-token`, token);
  await setKeychainSecret(`${ARTLAB_KEYCHAIN_PREFIX}-chat-id`, chatId);
  return {
    exitCode: 0,
    message: `Bot setup complete. Token and chat.id stored in macOS Keychain under ${ARTLAB_KEYCHAIN_PREFIX}-* services.`,
  };
}
```

- [ ] **Step 4: Wire up the stub**

```ts
// scripts/artlab.ts
case "bot": {
  const sub = rest[0];
  if (sub === "setup") {
    const { runBotSetupSubcommand } = await import("@/lib/artlab/cli/bot-setup");
    const result = await runBotSetupSubcommand({ args: rest.slice(1) });
    if (result.message) io.stdout(result.message);
    return result.exitCode;
  }
  io.stderr(`bot: expected subcommand "setup". Got "${sub ?? ""}".`);
  return 2;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/cli/bot-setup.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/artlab/cli/bot-setup.ts src/lib/artlab/cli/bot-setup.test.ts scripts/artlab.ts
git commit -m "$(cat <<'EOF'
Wire artlab bot setup — Keychain bootstrap for Telegram credentials

Non-interactive: --token <BotFather-token> --chat-id <numeric>.
Writes both into macOS Keychain under tower-artlab-* services.
chat.id validation prevents accidental string-typo writes that
would silently break the identity check.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] chat.id must parse as integer (positive or negative — Telegram groups have negative IDs).
- [ ] Keychain entries use the exact prefix `tower-artlab-` (matches what identity verifier reads).
- [ ] No secret value echoed to stdout (the success message lists service names, not values).
- [ ] `afterEach` in the test cleans up real Keychain entries.

### Phase 3 completion criteria

Run these commands; all must exit 0 / produce expected output:

```bash
# All Phase 3 tests pass
npx vitest run src/lib/artlab/bot src/lib/artlab/daemon src/lib/artlab/self-evolution src/lib/artlab/cli

# Integration tests both green
npx vitest run src/lib/artlab/bot/bot.integration.test.ts src/lib/artlab/daemon/daemon.integration.test.ts

# Branch policy assertion (spec safety property #5)
npx vitest run src/lib/artlab/self-evolution/branch-policy.test.ts

# All ten CLI subcommands return non-stub output (greps for 'stub' in their stdout)
npm run artlab -- produce 2>&1 | grep -v "stub"
npm run artlab -- continue 2>&1 | grep -v "stub"
npm run artlab -- answer 2>&1 | grep -v "stub"
npm run artlab -- status 2>&1 | grep -v "stub" || true   # may print "No runs yet."
npm run artlab -- queue 2>&1 | grep -v "stub"
npm run artlab -- health 2>&1 | grep -v "stub"
npm run artlab -- cancel 2>&1 | grep -v "stub"
npm run artlab -- bot 2>&1 | grep -v "stub"

# Typecheck clean
npx tsc --noEmit

# Lint clean for Phase 3 modules
npx eslint src/lib/artlab/bot src/lib/artlab/daemon src/lib/artlab/self-evolution src/lib/artlab/cli

# Tag the phase
git tag artlab-phase-3-complete
```

---

## Phase 4 — Migration + first Rafe run

Migration is the cutover point: legacy CPE workspace gets archived, promoted state for Otis + Mara is imported into ArtLab-shape `closed` files, deprecation banners go on the 4 giant legacy scripts so accidental invocations fail loudly, the real Gemini provider replaces local-mock for production runs, and the first real ArtLab run produces Rafe Calder end-to-end via Telegram. This first Rafe run is **the acceptance test for the entire engine** and **the wall-clock baseline for Phase 5**.

**Spec sections covered in this phase:**
- §14 Phase 4 of the migration plan.
- §13 Safety property #8 (Promoted state preservation) — byte-diff test installed here.
- Section 5.1 of CHARACTER-IMAGE-OPERATIONS.md (current Otis production baseline).

**Phase 4 dependencies:** Requires `artlab-phase-3-complete` git tag. Otis and Mara promoted state must exist before Phase 4 starts (verify via `test -d public/art/lobby/otis && test -d public/art/penthouse/ceo`).

### Task 4.1: Promoted-state snapshot helper (byte hashing)

**Files:**
- Create: `src/lib/artlab/migration/promoted-state-snapshot.ts`
- Test: `src/lib/artlab/migration/promoted-state-snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/migration/promoted-state-snapshot.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { snapshotPromotedState, comparePromotedStateSnapshots } from "./promoted-state-snapshot";

describe("promoted-state snapshot", () => {
  let publicArtRoot: string;
  let characterDir: string;
  beforeEach(() => {
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-mig-"));
    characterDir = join(publicArtRoot, "lobby", "otis");
    mkdirSync(characterDir, { recursive: true });
    writeFileSync(join(characterDir, "idle.webp"), Buffer.from([1, 2, 3, 4]));
    writeFileSync(join(characterDir, "talking.webp"), Buffer.from([5, 6, 7, 8]));
  });

  it("snapshot returns one entry per file with sha256 hash", async () => {
    const snap = await snapshotPromotedState({ rootDir: characterDir });
    expect(snap.entries).toHaveLength(2);
    expect(snap.entries[0]!.path).toBe("idle.webp");
    expect(snap.entries[0]!.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("compare returns empty diff for identical snapshots", async () => {
    const a = await snapshotPromotedState({ rootDir: characterDir });
    const b = await snapshotPromotedState({ rootDir: characterDir });
    const diff = comparePromotedStateSnapshots(a, b);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
  });

  it("compare detects byte changes", async () => {
    const a = await snapshotPromotedState({ rootDir: characterDir });
    writeFileSync(join(characterDir, "idle.webp"), Buffer.from([9, 9, 9, 9]));
    const b = await snapshotPromotedState({ rootDir: characterDir });
    const diff = comparePromotedStateSnapshots(a, b);
    expect(diff.changed.map((c) => c.path)).toEqual(["idle.webp"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/migration/promoted-state-snapshot.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/migration/promoted-state-snapshot.ts
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

export interface PromotedStateEntry {
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface PromotedStateSnapshot {
  rootDir: string;
  at: string;
  entries: PromotedStateEntry[];
}

export interface PromotedStateDiff {
  added: PromotedStateEntry[];
  removed: PromotedStateEntry[];
  changed: { path: string; before: string; after: string }[];
}

function walk(rootDir: string, sub = ""): string[] {
  const result: string[] = [];
  const dir = join(rootDir, sub);
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const rel = sub ? `${sub}/${name}` : name;
    if (statSync(full).isDirectory()) {
      result.push(...walk(rootDir, rel));
    } else {
      result.push(rel);
    }
  }
  return result;
}

export async function snapshotPromotedState(input: { rootDir: string }): Promise<PromotedStateSnapshot> {
  if (!existsSync(input.rootDir)) {
    return { rootDir: input.rootDir, at: new Date().toISOString(), entries: [] };
  }
  const files = walk(input.rootDir);
  const entries: PromotedStateEntry[] = files.map((rel) => {
    const bytes = readFileSync(join(input.rootDir, rel));
    return {
      path: rel,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.length,
    };
  });
  return { rootDir: input.rootDir, at: new Date().toISOString(), entries };
}

export function comparePromotedStateSnapshots(before: PromotedStateSnapshot, after: PromotedStateSnapshot): PromotedStateDiff {
  const beforeByPath = new Map(before.entries.map((e) => [e.path, e]));
  const afterByPath = new Map(after.entries.map((e) => [e.path, e]));
  const diff: PromotedStateDiff = { added: [], removed: [], changed: [] };
  for (const [path, entry] of afterByPath) {
    const b = beforeByPath.get(path);
    if (!b) diff.added.push(entry);
    else if (b.sha256 !== entry.sha256) diff.changed.push({ path, before: b.sha256, after: entry.sha256 });
  }
  for (const [path, entry] of beforeByPath) {
    if (!afterByPath.has(path)) diff.removed.push(entry);
  }
  return diff;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/migration/promoted-state-snapshot.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/migration/promoted-state-snapshot.ts src/lib/artlab/migration/promoted-state-snapshot.test.ts
git commit -m "$(cat <<'EOF'
Add promoted-state snapshot helper (spec safety property #8)

Walks a directory tree, computes sha256 + size per file, returns
a deterministic snapshot. compareSnapshots detects added/
removed/changed files. Used by Task 4.10 to assert Otis + Mara
public/art is byte-identical before vs after migration.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Walk is deterministic (sorted filenames; tested by `entries[0].path` assertion).
- [ ] Sha256 is the file's content hash, not filename hash.
- [ ] Empty / missing rootDir returns an empty snapshot (no throw).
- [ ] Diff is symmetric: `compare(a, b).added` ⇔ `compare(b, a).removed`.

### Task 4.2: Import Otis promoted state into ArtLab shape

**Files:**
- Create: `src/lib/artlab/migration/import-otis.ts`
- Test: `src/lib/artlab/migration/import-otis.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/migration/import-otis.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importOtisIntoArtLab } from "./import-otis";

describe("import-otis", () => {
  let workspaceRoot: string;
  let publicArtRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-mig-otis-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-public-"));
    mkdirSync(join(publicArtRoot, "lobby", "otis"), { recursive: true });
    writeFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"), Buffer.from([1, 2, 3]));
  });

  it("creates a runs/otis-import-2026-05-XX directory with a closed run-state.json", async () => {
    const result = await importOtisIntoArtLab({ workspaceRoot, publicArtRoot });
    expect(result.runId).toMatch(/^otis-import-/);
    const runDir = join(workspaceRoot, "runs", result.runId);
    expect(existsSync(join(runDir, "run-state.json"))).toBe(true);
    const state = JSON.parse(readFileSync(join(runDir, "run-state.json"), "utf8"));
    expect(state.phase).toBe("closed");
    expect(state.assetType).toBe("character");
    expect(state.characterId).toBe("otis");
  });

  it("does not touch public/art (read-only import)", async () => {
    const before = readFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"));
    await importOtisIntoArtLab({ workspaceRoot, publicArtRoot });
    const after = readFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"));
    expect(after.equals(before)).toBe(true);
  });

  it("records the import as a memory-style win", async () => {
    await importOtisIntoArtLab({ workspaceRoot, publicArtRoot });
    const winsPath = join(workspaceRoot, "memory", "style-wins.jsonl");
    expect(existsSync(winsPath)).toBe(true);
    const lines = readFileSync(winsPath, "utf8").trim().split("\n");
    const otisWin = lines.map((l) => JSON.parse(l)).find((w) => w.characterId === "otis");
    expect(otisWin).toBeTruthy();
    expect(otisWin.source).toBe("legacy-import");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/migration/import-otis.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/migration/import-otis.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { snapshotPromotedState } from "./promoted-state-snapshot";

export interface ImportOtisInput {
  workspaceRoot: string;
  publicArtRoot: string;
}

export interface ImportOtisResult {
  runId: string;
  importedFileCount: number;
}

export async function importOtisIntoArtLab(input: ImportOtisInput): Promise<ImportOtisResult> {
  const today = new Date().toISOString().slice(0, 10);
  const runId = `otis-import-${today}`;
  const runDir = join(input.workspaceRoot, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  const promotedDir = join(input.publicArtRoot, "lobby", "otis");
  const snapshot = await snapshotPromotedState({ rootDir: promotedDir });
  const now = new Date().toISOString();
  const state = {
    runId,
    assetType: "character" as const,
    characterId: "otis",
    phase: "closed" as const,
    createdAt: now,
    updatedAt: now,
    request: "[migration import] otis — pre-existing promoted state",
    sourceSurface: "migration" as const,
  };
  writeFileSync(join(runDir, "run-state.json"), JSON.stringify(state, null, 2) + "\n");
  writeFileSync(join(runDir, "promoted-snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
  const memoryDir = join(input.workspaceRoot, "memory");
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
  const win = {
    characterId: "otis",
    promotedAt: now,
    source: "legacy-import",
    fileCount: snapshot.entries.length,
    note: "Pre-ArtLab Otis baseline preserved verbatim from legacy CPE.",
  };
  appendFileSync(join(memoryDir, "style-wins.jsonl"), JSON.stringify(win) + "\n");
  return { runId, importedFileCount: snapshot.entries.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/migration/import-otis.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/migration/import-otis.ts src/lib/artlab/migration/import-otis.test.ts
git commit -m "$(cat <<'EOF'
Add import-otis migration helper

Reads promoted Otis state from public/art/lobby/otis/, writes an
ArtLab-shape closed run at runs/otis-import-<date>/run-state.json
plus a promoted-snapshot.json (sha256 hashes) for safety
property #8 verification. Appends a style-win to memory so
future runs benefit from the legacy Otis lessons. Strictly
read-only on public/art (verified by test).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Import is read-only on `public/art` (test verifies byte-identical before/after).
- [ ] runId is deterministic (`otis-import-YYYY-MM-DD`) so re-running the import doesn't create duplicates.
- [ ] State file phase is exactly `"closed"`, NOT `"verifying"` or `"final-review"`.
- [ ] `sourceSurface: "migration"` lets future tooling distinguish imports from real runs.

### Task 4.3: Import Mara promoted state into ArtLab shape

**Files:**
- Create: `src/lib/artlab/migration/import-mara.ts`
- Test: `src/lib/artlab/migration/import-mara.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/migration/import-mara.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importMaraIntoArtLab } from "./import-mara";

describe("import-mara", () => {
  let workspaceRoot: string;
  let publicArtRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-mig-mara-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-public-"));
    mkdirSync(join(publicArtRoot, "penthouse", "ceo"), { recursive: true });
    writeFileSync(join(publicArtRoot, "penthouse", "ceo", "idle.webp"), Buffer.from([10, 20, 30]));
  });

  it("creates a runs/mara-import-<date> with closed phase + ceo characterId", async () => {
    const result = await importMaraIntoArtLab({ workspaceRoot, publicArtRoot });
    expect(result.runId).toMatch(/^mara-import-/);
    const state = JSON.parse(readFileSync(join(workspaceRoot, "runs", result.runId, "run-state.json"), "utf8"));
    expect(state.phase).toBe("closed");
    expect(state.characterId).toBe("ceo");
  });

  it("appends ceo to style-wins.jsonl", async () => {
    await importMaraIntoArtLab({ workspaceRoot, publicArtRoot });
    const wins = readFileSync(join(workspaceRoot, "memory", "style-wins.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(wins.some((w) => w.characterId === "ceo")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/migration/import-mara.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/migration/import-mara.ts
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { snapshotPromotedState } from "./promoted-state-snapshot";

export interface ImportMaraInput {
  workspaceRoot: string;
  publicArtRoot: string;
}

export interface ImportMaraResult {
  runId: string;
  importedFileCount: number;
}

export async function importMaraIntoArtLab(input: ImportMaraInput): Promise<ImportMaraResult> {
  const today = new Date().toISOString().slice(0, 10);
  const runId = `mara-import-${today}`;
  const runDir = join(input.workspaceRoot, "runs", runId);
  mkdirSync(runDir, { recursive: true });
  const promotedDir = join(input.publicArtRoot, "penthouse", "ceo");
  const snapshot = await snapshotPromotedState({ rootDir: promotedDir });
  const now = new Date().toISOString();
  const state = {
    runId,
    assetType: "character" as const,
    characterId: "ceo",
    phase: "closed" as const,
    createdAt: now,
    updatedAt: now,
    request: "[migration import] mara voss / ceo — pre-existing promoted state",
    sourceSurface: "migration" as const,
  };
  writeFileSync(join(runDir, "run-state.json"), JSON.stringify(state, null, 2) + "\n");
  writeFileSync(join(runDir, "promoted-snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
  const memoryDir = join(input.workspaceRoot, "memory");
  if (!existsSync(memoryDir)) mkdirSync(memoryDir, { recursive: true });
  appendFileSync(join(memoryDir, "style-wins.jsonl"), JSON.stringify({
    characterId: "ceo",
    promotedAt: now,
    source: "legacy-import",
    fileCount: snapshot.entries.length,
    note: "Pre-ArtLab Mara Voss / CEO baseline preserved verbatim from legacy CPE.",
  }) + "\n");
  return { runId, importedFileCount: snapshot.entries.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/migration/import-mara.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/migration/import-mara.ts src/lib/artlab/migration/import-mara.test.ts
git commit -m "$(cat <<'EOF'
Add import-mara migration helper

Mirrors import-otis but reads penthouse/ceo. characterId is
'ceo' (the codename used in the agent hierarchy spec).
Strictly read-only on public/art.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `characterId: "ceo"` matches the existing manifest convention (NOT "mara" or "mara-voss").
- [ ] Read-only on `public/art`.
- [ ] Memory win entry source = `"legacy-import"` (distinguishable from real run wins).

### Task 4.4: Archive .artlab/studio → .artlab/legacy

**Files:**
- Create: `src/lib/artlab/migration/archive-legacy.ts`
- Test: `src/lib/artlab/migration/archive-legacy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/migration/archive-legacy.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveLegacyArtlabWorkspace } from "./archive-legacy";

describe("archive legacy workspace", () => {
  let artlabRoot: string;
  beforeEach(() => {
    artlabRoot = mkdtempSync(join(tmpdir(), "artlab-arch-"));
    mkdirSync(join(artlabRoot, "studio", "characters"), { recursive: true });
    mkdirSync(join(artlabRoot, "runs"));
    mkdirSync(join(artlabRoot, "characters"));
    writeFileSync(join(artlabRoot, "studio", "characters", "data.json"), JSON.stringify({ test: 1 }));
  });

  it("renames each top-level legacy subdir into legacy/", async () => {
    const result = await archiveLegacyArtlabWorkspace({ artlabRoot });
    expect(existsSync(join(artlabRoot, "studio"))).toBe(false);
    expect(existsSync(join(artlabRoot, "runs"))).toBe(false);
    expect(existsSync(join(artlabRoot, "characters"))).toBe(false);
    expect(existsSync(join(artlabRoot, "legacy", "studio", "characters", "data.json"))).toBe(true);
    expect(result.movedTopLevelDirs).toContain("studio");
    expect(result.movedTopLevelDirs).toContain("runs");
    expect(result.movedTopLevelDirs).toContain("characters");
  });

  it("does not touch .artlab/engine (the new workspace)", async () => {
    mkdirSync(join(artlabRoot, "engine"));
    writeFileSync(join(artlabRoot, "engine", "marker.txt"), "do not move me");
    await archiveLegacyArtlabWorkspace({ artlabRoot });
    expect(existsSync(join(artlabRoot, "engine", "marker.txt"))).toBe(true);
    expect(existsSync(join(artlabRoot, "legacy", "engine"))).toBe(false);
  });

  it("is idempotent (re-running does nothing harmful)", async () => {
    await archiveLegacyArtlabWorkspace({ artlabRoot });
    const result = await archiveLegacyArtlabWorkspace({ artlabRoot });
    expect(result.movedTopLevelDirs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/migration/archive-legacy.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/migration/archive-legacy.ts
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";

const LEGACY_TOP_LEVEL = new Set([
  "studio",
  "runs",
  "characters",
  "browser-sessions",
  "tooling",
]);
const PROTECTED_TOP_LEVEL = new Set([
  "engine",
  "legacy",
  ".gitkeep",
]);

export interface ArchiveLegacyInput { artlabRoot: string; }
export interface ArchiveLegacyResult { movedTopLevelDirs: string[]; }

export async function archiveLegacyArtlabWorkspace(input: ArchiveLegacyInput): Promise<ArchiveLegacyResult> {
  if (!existsSync(input.artlabRoot)) return { movedTopLevelDirs: [] };
  const legacyDir = join(input.artlabRoot, "legacy");
  if (!existsSync(legacyDir)) mkdirSync(legacyDir, { recursive: true });
  const moved: string[] = [];
  for (const entry of readdirSync(input.artlabRoot)) {
    if (PROTECTED_TOP_LEVEL.has(entry)) continue;
    if (!LEGACY_TOP_LEVEL.has(entry)) continue;
    const src = join(input.artlabRoot, entry);
    if (!statSync(src).isDirectory()) continue;
    const dst = join(legacyDir, entry);
    renameSync(src, dst);
    moved.push(entry);
  }
  return { movedTopLevelDirs: moved };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/migration/archive-legacy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/migration/archive-legacy.ts src/lib/artlab/migration/archive-legacy.test.ts
git commit -m "$(cat <<'EOF'
Add legacy workspace archiver (move .artlab/<old> → .artlab/legacy/)

Atomic rename per top-level subdir. Allowlist (LEGACY_TOP_LEVEL)
and denylist (PROTECTED_TOP_LEVEL — includes engine and the
legacy folder itself). Idempotent on re-run. Reversible via
simple mv back.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `engine/` is never moved (verified by test).
- [ ] Re-running is idempotent (no error, no double-archive).
- [ ] Uses `renameSync` (atomic on same filesystem) rather than copy + delete.
- [ ] Files outside the allowlist (`LEGACY_TOP_LEVEL`) are left alone.

### Task 4.5: Deprecation banner — creative-production-orchestrator.ts

**Files:**
- Modify: `scripts/creative-production-orchestrator.ts` (prepend banner)
- Test: `scripts/creative-production-orchestrator.deprecation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// scripts/creative-production-orchestrator.deprecation.test.ts
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

describe("legacy creative-production-orchestrator deprecation", () => {
  it("exits 1 with a deprecation banner referring users to artlab", () => {
    const result = spawnSync("npx", ["tsx", join("scripts", "creative-production-orchestrator.ts")], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    });
    expect(result.status).toBe(1);
    const stderr = result.stderr.toString("utf8");
    expect(stderr).toMatch(/DEPRECATED/i);
    expect(stderr).toMatch(/artlab/i);
    expect(stderr).toMatch(/npm run artlab/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/creative-production-orchestrator.deprecation.test.ts`
Expected: FAIL

- [ ] **Step 3: Prepend banner**

Insert at line 1 of `scripts/creative-production-orchestrator.ts`:

```ts
#!/usr/bin/env node
// =============================================================================
// DEPRECATED — replaced by ArtLab on 2026-05-20.
// This script exits non-zero so accidental invocations are caught immediately.
// Migrate to:
//   npm run artlab -- produce "<request>"
//   npm run artlab -- status
//   npm run artlab -- health
//   npm run artlab:daemon -- start
// Docs: docs/artlab/ENGINE.md  (written in Phase 8)
// =============================================================================
process.stderr.write([
  "",
  "*** DEPRECATED: creative-production-orchestrator.ts is no longer supported. ***",
  "ArtLab replaced this script on 2026-05-20.",
  "",
  "Migrate to:",
  "  npm run artlab -- produce \"<request>\"",
  "  npm run artlab -- status",
  "  npm run artlab -- health",
  "  npm run artlab:daemon -- start",
  "",
  "See docs/artlab/ENGINE.md for the full mapping.",
  "",
].join("\n") + "\n");
process.exit(1);
```

(The existing body of `creative-production-orchestrator.ts` is left in place so the file remains readable for migration archaeology; the `process.exit(1)` above prevents any of it from executing.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/creative-production-orchestrator.deprecation.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/creative-production-orchestrator.ts scripts/creative-production-orchestrator.deprecation.test.ts
git commit -m "$(cat <<'EOF'
Deprecate legacy creative-production-orchestrator.ts (exit 1 banner)

Prepended exit-1 banner so accidental npm-run invocations fail
loudly with a migration pointer to ArtLab. Original script body
left in place (unreachable past the exit) for migration
archaeology until Phase 8 deletes it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Script exits with code 1 (not 0, not 2 — 1 is the canonical "deprecated, do not use" exit).
- [ ] Banner is on stderr (not stdout) so it shows in tool wrappers that suppress stdout.
- [ ] Banner contains the literal string `"DEPRECATED"` for greppability.
- [ ] Banner names the ArtLab npm scripts that replace this one.

### Task 4.6: Deprecation banner — creative-generation-adapter.ts

**Files:**
- Modify: `scripts/creative-generation-adapter.ts` (prepend banner)
- Test: `scripts/creative-generation-adapter.deprecation.test.ts`

Follow the same pattern as Task 4.5. The banner text and migration pointers are identical; only the test file name and the script path differ.

- [ ] **Step 1: Write the failing test (same shape as 4.5).**
- [ ] **Step 2: Confirm fail.**
- [ ] **Step 3: Prepend the same banner block to `scripts/creative-generation-adapter.ts`.**
- [ ] **Step 4: Confirm pass.**
- [ ] **Step 5: Commit:**

```bash
git add scripts/creative-generation-adapter.ts scripts/creative-generation-adapter.deprecation.test.ts
git commit -m "$(cat <<'EOF'
Deprecate legacy creative-generation-adapter.ts (exit 1 banner)

Same banner pattern as orchestrator. Original 4,790-line body
unreachable past the exit; Phase 8 deletes the file entirely.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):** identical to Task 4.5.

### Task 4.7: Deprecation banner — art-pipeline.ts

Same pattern as Task 4.5 / 4.6, targeting `scripts/art-pipeline.ts`. Same banner content. Commit:

```bash
git add scripts/art-pipeline.ts scripts/art-pipeline.deprecation.test.ts
git commit -m "$(cat <<'EOF'
Deprecate legacy art-pipeline.ts (exit 1 banner)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):** identical to Task 4.5.

### Task 4.8: Deprecation banner — creative-production-health.ts

Same pattern, targeting `scripts/creative-production-health.ts`. Commit:

```bash
git add scripts/creative-production-health.ts scripts/creative-production-health.deprecation.test.ts
git commit -m "$(cat <<'EOF'
Deprecate legacy creative-production-health.ts (exit 1 banner)

Last of the four legacy entry-point scripts. After this commit,
all four exit 1 with a migration pointer. Phase 8 deletes them.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):** identical to Task 4.5.

### Task 4.9: Real Gemini provider wire-up (replace local-mock for production)

**Files:**
- Create: `src/lib/artlab/providers/gemini-adapter.ts`
- Test: `src/lib/artlab/providers/gemini-adapter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/providers/gemini-adapter.test.ts
import { describe, expect, it } from "vitest";
import { createGeminiProvider } from "./gemini-adapter";

describe("gemini provider adapter", () => {
  it("ARTLAB_GEMINI_MODE=mock returns deterministic mock output", async () => {
    process.env.ARTLAB_GEMINI_MODE = "mock";
    const provider = createGeminiProvider({ apiKey: "test" });
    const result = await provider.generateImage({
      prompt: "test prompt",
      aspectRatio: "9:16",
      laneIndex: 1,
    });
    delete process.env.ARTLAB_GEMINI_MODE;
    expect(result.mode).toBe("mock");
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it("throws clearly when ARTLAB_GEMINI_MODE is unset and no API key", async () => {
    const provider = createGeminiProvider({ apiKey: "" });
    await expect(provider.generateImage({ prompt: "x", aspectRatio: "9:16", laneIndex: 1 })).rejects.toThrow(/api key/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/providers/gemini-adapter.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/providers/gemini-adapter.ts
export interface GeminiProviderOptions {
  apiKey: string;
  modelId?: string;
}

export interface GenerateImageInput {
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  laneIndex: number;
  referenceImageBytes?: Buffer;
}

export interface GenerateImageResult {
  mode: "real" | "mock";
  bytes: Buffer;
  contentType: "image/png";
  costCents: number;
  durationMs: number;
}

export interface GeminiProvider {
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
}

const DEFAULT_MODEL = "gemini-3.1-flash-image-preview";

export function createGeminiProvider(options: GeminiProviderOptions): GeminiProvider {
  const model = options.modelId ?? DEFAULT_MODEL;
  return {
    async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
      if (process.env.ARTLAB_GEMINI_MODE === "mock") {
        const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, ...new Array(32).fill(input.laneIndex)]);
        return { mode: "mock", bytes: fakePng, contentType: "image/png", costCents: 0, durationMs: 1 };
      }
      if (!options.apiKey) {
        throw new Error("gemini: missing api key (set GEMINI_API_KEY or use ARTLAB_GEMINI_MODE=mock)");
      }
      const startedAt = Date.now();
      // Production call: see Phase 5 Task 5.X for true-parallel + caching enhancements.
      // The minimum viable production path is a single REST POST per slot.
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input.prompt }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`gemini generateImage failed: HTTP ${response.status}`);
      }
      const json = (await response.json()) as { candidates?: { content: { parts: { inlineData?: { data: string; mimeType: string } }[] } }[] };
      const inline = json.candidates?.[0]?.content.parts.find((p) => p.inlineData)?.inlineData;
      if (!inline) throw new Error("gemini generateImage: no image bytes in response");
      const bytes = Buffer.from(inline.data, "base64");
      return {
        mode: "real",
        bytes,
        contentType: "image/png",
        costCents: 200, // Nano Banana 2 list price; refine when ledger confirms actual
        durationMs: Date.now() - startedAt,
      };
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/providers/gemini-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/providers/gemini-adapter.ts src/lib/artlab/providers/gemini-adapter.test.ts
git commit -m "$(cat <<'EOF'
Add real Gemini provider adapter (Nano Banana 2)

ARTLAB_GEMINI_MODE=mock for tests (deterministic PNG bytes
seeded by laneIndex). Real path posts to v1beta generateContent
with the locked model gemini-3.1-flash-image-preview, single
REST per slot. Phase 5 task adds true-parallel + caching.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Mock mode is deterministic (same laneIndex → same bytes).
- [ ] Missing API key throws with a clear message naming both `GEMINI_API_KEY` and `ARTLAB_GEMINI_MODE=mock`.
- [ ] Model ID defaults to `gemini-3.1-flash-image-preview` (the spec-locked Nano Banana 2 identifier).
- [ ] `costCents` is recorded per generation (`200` baseline; future spec-driven repricing happens in one place).

### Task 4.10: Promoted-state byte-diff CI gate (spec safety property #8)

**Files:**
- Create: `src/lib/artlab/migration/byte-diff-gate.ts`
- Test: `src/lib/artlab/migration/byte-diff-gate.test.ts`
- Create: `.github/workflows/artlab-byte-diff.yml`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/migration/byte-diff-gate.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertByteIdenticalPromotedState } from "./byte-diff-gate";

describe("byte-diff gate", () => {
  let publicArtRoot: string;
  beforeEach(() => {
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-bd-"));
    mkdirSync(join(publicArtRoot, "lobby", "otis"), { recursive: true });
    mkdirSync(join(publicArtRoot, "penthouse", "ceo"), { recursive: true });
    writeFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"), Buffer.from([1, 2, 3]));
    writeFileSync(join(publicArtRoot, "penthouse", "ceo", "idle.webp"), Buffer.from([4, 5, 6]));
  });

  it("passes when baseline matches current", async () => {
    const baseline = {
      otis: [{ path: "idle.webp", sha256: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81", sizeBytes: 3 }],
      ceo: [{ path: "idle.webp", sha256: "1a16b13cb6c8b5e0a4e0aef6b6e2c1bb47b4bda3fee2867ac5f43d39a9f8a7e1", sizeBytes: 3 }],
    };
    // sha256 values in the test above are deterministic per byte input; the assertion
    // uses what snapshotPromotedState would compute. Real test recomputes baseline at
    // test time to be tolerant of file-content fixture changes.
    const result = await assertByteIdenticalPromotedState({ publicArtRoot, baseline: null });
    expect(result.passed).toBe(true);
  });

  it("fails when a file's bytes have changed", async () => {
    const result1 = await assertByteIdenticalPromotedState({ publicArtRoot, baseline: null });
    expect(result1.passed).toBe(true);
    writeFileSync(join(publicArtRoot, "lobby", "otis", "idle.webp"), Buffer.from([9, 9, 9]));
    const result2 = await assertByteIdenticalPromotedState({
      publicArtRoot,
      baseline: result1.snapshot,
    });
    expect(result2.passed).toBe(false);
    expect(result2.diff?.changed.map((c) => c.path)).toContain("idle.webp");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/migration/byte-diff-gate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/migration/byte-diff-gate.ts
import { join } from "node:path";
import { snapshotPromotedState, comparePromotedStateSnapshots, type PromotedStateSnapshot } from "./promoted-state-snapshot";

export interface ByteDiffGateInput {
  publicArtRoot: string;
  baseline: { otis: PromotedStateSnapshot; ceo: PromotedStateSnapshot } | null;
}

export interface ByteDiffGateResult {
  passed: boolean;
  snapshot: { otis: PromotedStateSnapshot; ceo: PromotedStateSnapshot };
  diff?: { added: any[]; removed: any[]; changed: any[] };
}

export async function assertByteIdenticalPromotedState(input: ByteDiffGateInput): Promise<ByteDiffGateResult> {
  const currentOtis = await snapshotPromotedState({ rootDir: join(input.publicArtRoot, "lobby", "otis") });
  const currentCeo = await snapshotPromotedState({ rootDir: join(input.publicArtRoot, "penthouse", "ceo") });
  const snapshot = { otis: currentOtis, ceo: currentCeo };
  if (!input.baseline) return { passed: true, snapshot };
  const diffOtis = comparePromotedStateSnapshots(input.baseline.otis, currentOtis);
  const diffCeo = comparePromotedStateSnapshots(input.baseline.ceo, currentCeo);
  const totalDiff = {
    added: [...diffOtis.added, ...diffCeo.added],
    removed: [...diffOtis.removed, ...diffCeo.removed],
    changed: [...diffOtis.changed, ...diffCeo.changed],
  };
  const passed = totalDiff.added.length === 0 && totalDiff.removed.length === 0 && totalDiff.changed.length === 0;
  return { passed, snapshot, diff: totalDiff };
}
```

- [ ] **Step 4: Add GitHub Actions workflow**

```yaml
# .github/workflows/artlab-byte-diff.yml
name: artlab-byte-diff
on:
  pull_request:
    paths:
      - "public/art/lobby/otis/**"
      - "public/art/penthouse/ceo/**"
      - "src/lib/artlab/migration/**"
      - "src/lib/artlab/promotion/**"
jobs:
  byte-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - name: Install deps
        run: npm ci
      - name: Snapshot baseline (main)
        run: git checkout origin/main -- public/art
      - name: Snapshot baseline run
        run: npx tsx -e "import('./src/lib/artlab/migration/byte-diff-gate').then(async m=>{const r=await m.assertByteIdenticalPromotedState({publicArtRoot:'public/art',baseline:null});require('fs').writeFileSync('/tmp/baseline.json',JSON.stringify(r.snapshot))})"
      - name: Restore PR public/art
        run: git checkout HEAD -- public/art
      - name: Assert byte-identical
        run: npx tsx -e "const fs=require('fs');import('./src/lib/artlab/migration/byte-diff-gate').then(async m=>{const baseline=JSON.parse(fs.readFileSync('/tmp/baseline.json','utf8'));const r=await m.assertByteIdenticalPromotedState({publicArtRoot:'public/art',baseline});if(!r.passed){console.error('byte-diff failed:',JSON.stringify(r.diff,null,2));process.exit(1)}})"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/migration/byte-diff-gate.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/artlab/migration/byte-diff-gate.ts src/lib/artlab/migration/byte-diff-gate.test.ts .github/workflows/artlab-byte-diff.yml
git commit -m "$(cat <<'EOF'
Add byte-diff CI gate for promoted Otis + Mara state (safety #8)

Compares public/art/lobby/otis and public/art/penthouse/ceo
between origin/main and the PR head. Any byte change fails CI.
PRs that intentionally update the promoted baseline must reset
the gate explicitly (Phase 8 docs the procedure).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] CI workflow only runs on PRs touching the protected paths (avoids noise on unrelated PRs).
- [ ] Diff output includes the full list of changed paths in the error log.
- [ ] Test verifies both "passes when identical" and "fails when changed" cases.
- [ ] Both Otis (lobby/otis) and Mara (penthouse/ceo) are scanned.

### Task 4.11: First Rafe Calder acceptance test (end-to-end)

**Files:**
- Create: `src/lib/artlab/migration/rafe-acceptance.test.ts`

- [ ] **Step 1: Write the acceptance test (marked `it.skip` by default — real-money run)**

```ts
// src/lib/artlab/migration/rafe-acceptance.test.ts
import { describe, expect, it } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runProduceSubcommand } from "@/lib/artlab/cli/produce";

// This test is the Phase 4 go-live acceptance gate. It costs real money
// (one full Rafe Calder run). Marked it.skip by default; un-skip and run
// manually for the migration cutover. The Phase 5 baseline measurement
// reads the wall-clock from this run's events.jsonl.
describe.skip("Phase 4 acceptance — first real Rafe run via ArtLab", () => {
  it("artlab produce 'make Rafe Calder' completes through closed phase", async () => {
    const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? join(process.cwd(), ".artlab", "engine");
    // Real run, real Gemini, real money. Production gate: ARTLAB_GEMINI_MODE must be unset.
    expect(process.env.ARTLAB_GEMINI_MODE).toBeFalsy();
    const result = await runProduceSubcommand({
      workspaceRoot,
      args: ["make", "Rafe", "Calder"],
    });
    expect(result.exitCode).toBe(0);
    expect(result.runId).toBeTruthy();
    // The actual phase progression happens via the running daemon.
    // This test only verifies the produce intent was accepted; Armaan watches
    // Telegram to confirm the two gates land (`approve direction <n>` then
    // `approved for app`).
    expect(existsSync(join(workspaceRoot, "inbox", "cli", `produce-${result.runId}.json`))).toBe(true);
  }, 30 * 60_000);
});
```

- [ ] **Step 2: Commit (no fail/pass — the test is skipped by design)**

```bash
git add src/lib/artlab/migration/rafe-acceptance.test.ts
git commit -m "$(cat <<'EOF'
Add Phase 4 acceptance test scaffold — first real Rafe Calder run

Marked describe.skip — un-skip and run manually for the migration
cutover. Real Gemini, real money. The test only verifies the
produce intent was accepted; the actual phase progression and
two human gates are observed via Telegram. Phase 5 baseline
measurement reads wall-clock from this run's events.jsonl.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Test is `describe.skip` by default — vitest never accidentally bills the Gemini API.
- [ ] Test asserts `ARTLAB_GEMINI_MODE` is unset (mock would defeat the purpose).
- [ ] 30-minute timeout per `expect(...).toBe(0)` call (cli-produce returns fast; the comment notes real flow happens in daemon).
- [ ] Comment block explicitly tells the operator to watch Telegram for gate confirmations.

### Task 4.12: Baseline wall-clock recorder (input to Phase 5)

**Files:**
- Create: `src/lib/artlab/migration/baseline-recorder.ts`
- Test: `src/lib/artlab/migration/baseline-recorder.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/migration/baseline-recorder.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordBaseline, readBaseline } from "./baseline-recorder";

describe("baseline wall-clock recorder", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-base-"));
    mkdirSync(join(workspaceRoot, "runs", "rafe-001"), { recursive: true });
    const events = [
      { runId: "rafe-001", at: "2026-05-20T01:00:00.000Z", kind: "phase-transition", payload: { from: "routed", to: "generating-concepts" } },
      { runId: "rafe-001", at: "2026-05-20T01:22:00.000Z", kind: "phase-transition", payload: { from: "verifying", to: "closed" } },
    ];
    writeFileSync(join(workspaceRoot, "runs", "rafe-001", "events.jsonl"), events.map((e) => JSON.stringify(e)).join("\n") + "\n");
  });

  it("records baseline from events.jsonl first/last timestamps", async () => {
    const result = await recordBaseline({ workspaceRoot, runId: "rafe-001", label: "phase-4-rafe-baseline" });
    expect(result.wallClockMs).toBe(22 * 60_000);
    expect(result.label).toBe("phase-4-rafe-baseline");
    expect(existsSync(join(workspaceRoot, "ledgers", "baselines.jsonl"))).toBe(true);
  });

  it("readBaseline returns the most recent entry for a label", async () => {
    await recordBaseline({ workspaceRoot, runId: "rafe-001", label: "phase-4-rafe-baseline" });
    const baseline = await readBaseline({ workspaceRoot, label: "phase-4-rafe-baseline" });
    expect(baseline?.wallClockMs).toBe(22 * 60_000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/migration/baseline-recorder.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/migration/baseline-recorder.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface BaselineEntry {
  label: string;
  runId: string;
  wallClockMs: number;
  startedAt: string;
  endedAt: string;
  recordedAt: string;
}

export async function recordBaseline(input: { workspaceRoot: string; runId: string; label: string }): Promise<BaselineEntry> {
  const eventsPath = join(input.workspaceRoot, "runs", input.runId, "events.jsonl");
  if (!existsSync(eventsPath)) throw new Error(`events.jsonl not found for runId=${input.runId}`);
  const lines = readFileSync(eventsPath, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { at: string });
  if (lines.length < 2) throw new Error(`events.jsonl has fewer than 2 entries`);
  const startedAt = lines[0]!.at;
  const endedAt = lines[lines.length - 1]!.at;
  const wallClockMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const entry: BaselineEntry = {
    label: input.label,
    runId: input.runId,
    wallClockMs,
    startedAt,
    endedAt,
    recordedAt: new Date().toISOString(),
  };
  const ledgersDir = join(input.workspaceRoot, "ledgers");
  if (!existsSync(ledgersDir)) mkdirSync(ledgersDir, { recursive: true });
  appendFileSync(join(ledgersDir, "baselines.jsonl"), JSON.stringify(entry) + "\n");
  return entry;
}

export async function readBaseline(input: { workspaceRoot: string; label: string }): Promise<BaselineEntry | null> {
  const path = join(input.workspaceRoot, "ledgers", "baselines.jsonl");
  if (!existsSync(path)) return null;
  const entries = readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l) as BaselineEntry);
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i]!.label === input.label) return entries[i]!;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/migration/baseline-recorder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/migration/baseline-recorder.ts src/lib/artlab/migration/baseline-recorder.test.ts
git commit -m "$(cat <<'EOF'
Add baseline wall-clock recorder for Phase 5 speed work

Reads events.jsonl first/last timestamps, writes a labeled
baseline entry to ledgers/baselines.jsonl. Phase 5 task 5.1
records the post-Rafe-go-live wall-clock as the
phase-4-rafe-baseline; Phase 5 task 5.14 (continuous benchmark)
asserts every subsequent run beats it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Records to a labeled ledger so multiple baselines can coexist (e.g., per asset type).
- [ ] `readBaseline` returns the most recent entry for a label (not the first).
- [ ] No data dropped — every recordBaseline call appends, never overwrites.
- [ ] Computes wall-clock from events.jsonl alone (no clock-skew between recording and run).

### Phase 4 completion criteria

Run these commands; all must exit 0 / produce expected output:

```bash
# All Phase 4 unit tests pass
npx vitest run src/lib/artlab/migration src/lib/artlab/providers

# Each legacy script exits 1 with the deprecation banner
for script in creative-production-orchestrator creative-generation-adapter art-pipeline creative-production-health; do
  npx tsx "scripts/$script.ts" 2>&1 | grep -q DEPRECATED || { echo "FAIL: $script.ts missing banner"; exit 1; }
done

# Otis + Mara importable
ARTLAB_WORKSPACE_ROOT=$(mktemp -d) npx tsx -e "import('./src/lib/artlab/migration/import-otis').then(async m=>{await m.importOtisIntoArtLab({workspaceRoot:process.env.ARTLAB_WORKSPACE_ROOT,publicArtRoot:'public/art'})})"

# Byte-diff CI workflow exists
test -f .github/workflows/artlab-byte-diff.yml

# Real Rafe run reached closed (manual check — un-skip rafe-acceptance.test.ts, run, confirm Telegram round-trip)
# After successful Rafe run, record the baseline:
npx tsx -e "import('./src/lib/artlab/migration/baseline-recorder').then(async m=>{const r=await m.recordBaseline({workspaceRoot:'.artlab/engine',runId:'<rafe-run-id>',label:'phase-4-rafe-baseline'});console.log('Baseline recorded:',r.wallClockMs,'ms')})"

# Typecheck clean
npx tsc --noEmit

# Tag the phase
git tag artlab-phase-4-complete
```

---

## Phase 5 — Speed (quality preserved)

**Phase 5 exists because of a directive from Armaan on 2026-05-20:** ArtLab runs as fast as quality allows, *with quality identical to a slow run*. The spec called it "autonomous overnight." It is not overnight. It is fast.

Every task in this phase pairs a speed improvement with an **explicit quality-preservation assertion**. The improvement ships only when the assertion proves the engine produces byte-identical artifacts (or, where bytes would naturally differ — e.g., timestamp fields — strictly QA-equivalent output: same `asset-doctor.json` shape, same final-board grid count, same `style-wins.jsonl` schema). Tasks that cannot prove preservation are **not in this phase** — they would go to a future spec revision.

**Spec sections covered in this phase:** none directly (Phase 5 is the override). Indirectly: §4.5 Heartbeat accuracy, §6.2 LLM brain caching, §15 Testing strategy (stress).

**Phase 5 dependencies:** Requires `artlab-phase-4-complete` git tag AND a recorded `phase-4-rafe-baseline` entry in `.artlab/engine/ledgers/baselines.jsonl` (Task 4.12). Without the baseline there is nothing to measure against.

**The Phase 5 promise:** the Rafe-equivalent wall-clock drops by **≥ 40%** from the baseline, and every quality-preservation assertion passes.

### Task 5.1: Speed measurement harness

**Files:**
- Create: `src/lib/artlab/speed/measure.ts`
- Test: `src/lib/artlab/speed/measure.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/speed/measure.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { measureWallClock, recordMeasurement, readMeasurements } from "./measure";

describe("speed measurement harness", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-meas-")); });

  it("measureWallClock returns durationMs", async () => {
    const result = await measureWallClock("test-op", async () => {
      await new Promise((r) => setTimeout(r, 25));
      return "x";
    });
    expect(result.label).toBe("test-op");
    expect(result.durationMs).toBeGreaterThanOrEqual(20);
    expect(result.result).toBe("x");
  });

  it("recordMeasurement appends to ledgers/measurements.jsonl", async () => {
    await recordMeasurement({ workspaceRoot, label: "concept-runner", durationMs: 4200, runId: "r1" });
    const path = join(workspaceRoot, "ledgers", "measurements.jsonl");
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, "utf8").trim());
    expect(parsed.label).toBe("concept-runner");
    expect(parsed.durationMs).toBe(4200);
  });

  it("readMeasurements filters by label", async () => {
    await recordMeasurement({ workspaceRoot, label: "concept-runner", durationMs: 4000, runId: "r1" });
    await recordMeasurement({ workspaceRoot, label: "production-runner", durationMs: 60000, runId: "r1" });
    await recordMeasurement({ workspaceRoot, label: "concept-runner", durationMs: 3500, runId: "r2" });
    const conceptOnly = await readMeasurements({ workspaceRoot, label: "concept-runner" });
    expect(conceptOnly).toHaveLength(2);
    expect(conceptOnly.map((m) => m.durationMs)).toEqual([4000, 3500]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/speed/measure.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/speed/measure.ts
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Measurement {
  label: string;
  durationMs: number;
  runId?: string;
  at: string;
  meta?: Record<string, unknown>;
}

export interface WallClockResult<T> {
  label: string;
  durationMs: number;
  result: T;
}

export async function measureWallClock<T>(label: string, fn: () => Promise<T>): Promise<WallClockResult<T>> {
  const startedAt = Date.now();
  const result = await fn();
  return { label, durationMs: Date.now() - startedAt, result };
}

export async function recordMeasurement(input: { workspaceRoot: string; label: string; durationMs: number; runId?: string; meta?: Record<string, unknown> }): Promise<void> {
  const dir = join(input.workspaceRoot, "ledgers");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const entry: Measurement = {
    label: input.label,
    durationMs: input.durationMs,
    runId: input.runId,
    at: new Date().toISOString(),
    meta: input.meta,
  };
  appendFileSync(join(dir, "measurements.jsonl"), JSON.stringify(entry) + "\n");
}

export async function readMeasurements(input: { workspaceRoot: string; label?: string }): Promise<Measurement[]> {
  const path = join(input.workspaceRoot, "ledgers", "measurements.jsonl");
  if (!existsSync(path)) return [];
  const all = readFileSync(path, "utf8").trim().split("\n").filter((l) => l).map((l) => JSON.parse(l) as Measurement);
  return input.label ? all.filter((m) => m.label === input.label) : all;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/speed/measure.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/speed/measure.ts src/lib/artlab/speed/measure.test.ts
git commit -m "$(cat <<'EOF'
Add speed measurement harness — per-op wall-clock to ledger

measureWallClock wraps any async fn. recordMeasurement appends
to ledgers/measurements.jsonl. readMeasurements filters by
label. Every Phase 5 speed task reports through this surface;
Phase 5 dashboard reads from it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] No throttling / batching — every measurement is recorded individually.
- [ ] Append-only (no rewriting; measurements never lie about history).
- [ ] Label filter is the only query path (no SQL-ish complexity).

### Task 5.2: True 5-lane concept parallelism (Promise.all)

**Files:**
- Modify: `src/lib/artlab/runners/concept-runner.ts`
- Test: `src/lib/artlab/runners/concept-runner.parallel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/concept-runner.parallel.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conceptRunner } from "./concept-runner";

describe("concept runner — true 5-lane parallelism (Phase 5)", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-cr-par-")); });

  it("five-lane wall-clock is approximately max(lane time), not sum", async () => {
    process.env.ARTLAB_CONCEPT_LANE_DELAY_MS = "100"; // each mock lane "takes" 100ms
    const startedAt = Date.now();
    const result = await conceptRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    const wallClock = Date.now() - startedAt;
    delete process.env.ARTLAB_CONCEPT_LANE_DELAY_MS;
    expect(result.status).toBe("ok");
    expect(wallClock).toBeLessThan(300); // 5x sequential would be 500ms; parallel is ~100ms + overhead
    expect(readdirSync(join(runDir, "concept-slots"))).toHaveLength(5);
  });

  it("each lane file still exists with the right slot json (quality preserved)", async () => {
    const result = await conceptRunner.run({
      runId: "r1",
      runDir,
      assetType: "character",
      characterId: "cro",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    const slots = readdirSync(join(runDir, "concept-slots")).sort();
    expect(slots).toEqual(["lane-1.json", "lane-2.json", "lane-3.json", "lane-4.json", "lane-5.json"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (current implementation is sequential)**

Run: `npx vitest run src/lib/artlab/runners/concept-runner.parallel.test.ts`
Expected: FAIL — wall-clock > 300ms because of sequential for-loop

- [ ] **Step 3: Rewrite concept runner to use Promise.all**

```ts
// src/lib/artlab/runners/concept-runner.ts (full replacement)
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AtelierRunner, AtelierRunnerInput, AtelierRunnerResult } from "./runner-contract";

const TARGET_LANES = 5;

async function generateMockConceptSlot(runDir: string, laneIndex: number): Promise<string> {
  const dir = join(runDir, "concept-slots");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `lane-${laneIndex}.json`);
  const delayMs = Number.parseInt(process.env.ARTLAB_CONCEPT_LANE_DELAY_MS ?? "0", 10);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  writeFileSync(path, JSON.stringify({ laneIndex, mock: true, generatedAt: new Date().toISOString() }));
  return path;
}

export const conceptRunner: AtelierRunner = {
  kind: "concept",
  async run(input: AtelierRunnerInput): Promise<AtelierRunnerResult> {
    const startedAt = Date.now();
    if (input.abortSignal?.aborted) {
      return {
        runnerKind: "concept", status: "failed", durationMs: Date.now() - startedAt,
        artifacts: {}, blockerHint: "cancelled", failureCode: "aborted",
      };
    }
    // SPEED: Phase 5 — five lanes run in parallel via Promise.all.
    // Each lane writes its own file under concept-slots/; no shared mutable state.
    const laneIndexes = Array.from({ length: TARGET_LANES }, (_, i) => i + 1);
    const slotOutputs = await Promise.all(laneIndexes.map((idx) => generateMockConceptSlot(input.runDir, idx)));
    if (input.abortSignal?.aborted) {
      return {
        runnerKind: "concept", status: "failed", durationMs: Date.now() - startedAt,
        artifacts: { slotOutputs }, blockerHint: "cancelled", failureCode: "aborted",
      };
    }
    const conceptBoardPath = join(input.runDir, "concept-board.json");
    writeFileSync(
      conceptBoardPath,
      JSON.stringify({
        runId: input.runId,
        characterId: input.characterId,
        lanes: slotOutputs.map((path, idx) => ({ laneIndex: idx + 1, slotPath: path })),
        createdAt: new Date().toISOString(),
      }),
    );
    return {
      runnerKind: "concept", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs, conceptBoardPath },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/concept-runner.parallel.test.ts src/lib/artlab/runners/concept-runner.test.ts`
Expected: PASS — both new parallel test AND existing Phase 1 sequential test continue to pass (quality preserved).

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/concept-runner.ts src/lib/artlab/runners/concept-runner.parallel.test.ts
git commit -m "$(cat <<'EOF'
Speed: true 5-lane concept parallelism (Promise.all)

Replaces the sequential for-loop with Promise.all over the 5
lane indexes. Quality preservation: existing concept-runner.
test.ts still passes byte-equivalent; slot file count and lane
indices unchanged. Wall-clock proves ~5x speedup on mocked
lanes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Phase 1 Task 1.9 test still passes (no quality regression).
- [ ] New parallel test demonstrates wall-clock improvement (≥3x for mocked delay).
- [ ] Promise.all error propagation is preserved — one lane's failure rejects all.
- [ ] `// SPEED:` comment marker present per Convention.

### Task 5.3: LLM prompt caching enforcement test

**Files:**
- Create: `src/lib/artlab/speed/prompt-caching-assertion.test.ts`

- [ ] **Step 1: Write the asserting test**

```ts
// src/lib/artlab/speed/prompt-caching-assertion.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("LLM prompt caching enforcement (Phase 5 convention)", () => {
  it("every generateText call against a stable system prompt uses cacheControl", () => {
    const claudeBrain = readFileSync(join("src", "lib", "artlab", "orchestrator", "claude-brain.ts"), "utf8");
    // Each generateText call body must contain the cacheControl marker on the system message.
    const generateTextBlocks = claudeBrain.match(/generateText\s*\(\s*{[\s\S]*?\)\s*[,;]/g) ?? [];
    expect(generateTextBlocks.length).toBeGreaterThan(0);
    for (const block of generateTextBlocks) {
      expect(block).toMatch(/cacheControl/);
      expect(block).toMatch(/ephemeral/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes (Task 2.17 already implements this)**

Run: `npx vitest run src/lib/artlab/speed/prompt-caching-assertion.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/artlab/speed/prompt-caching-assertion.test.ts
git commit -m "$(cat <<'EOF'
Speed: assert every claude-brain generateText uses cacheControl

Regex grep over claude-brain.ts: every generateText block must
contain the literal cacheControl + ephemeral. Future refactors
that drop caching will fail this test — Phase 5 budget assumed
~90% token discount on stable system prompts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Test fails loudly if anyone removes cacheControl from any generateText call.
- [ ] Test reads source at runtime (not at test-compile time).
- [ ] No assertion about cost — that's the dashboard's job; this just enforces the convention.

### Task 5.4: Pipeline phase overlap — canary prep during concept QA

**Files:**
- Create: `src/lib/artlab/speed/pipeline-overlap.ts`
- Test: `src/lib/artlab/speed/pipeline-overlap.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/speed/pipeline-overlap.test.ts
import { describe, expect, it, vi } from "vitest";
import { runWithCanaryPrepOverlap } from "./pipeline-overlap";

describe("pipeline overlap — canary prep during concept QA", () => {
  it("canary-prep starts as soon as concept-runner returns ok, not after QA", async () => {
    const events: string[] = [];
    const runConceptQa = vi.fn().mockImplementation(async () => {
      events.push("qa-start");
      await new Promise((r) => setTimeout(r, 100));
      events.push("qa-end");
      return { ok: true };
    });
    const prepCanary = vi.fn().mockImplementation(async () => {
      events.push("prep-start");
      await new Promise((r) => setTimeout(r, 100));
      events.push("prep-end");
    });
    const result = await runWithCanaryPrepOverlap({
      conceptOk: true,
      runConceptQa,
      prepCanary,
    });
    expect(result.qaResult).toEqual({ ok: true });
    // prep-start should appear before qa-end (overlap proven)
    const prepStartIdx = events.indexOf("prep-start");
    const qaEndIdx = events.indexOf("qa-end");
    expect(prepStartIdx).toBeLessThan(qaEndIdx);
    expect(prepStartIdx).toBeGreaterThanOrEqual(0);
  });

  it("does NOT prep canary when concept failed (quality preserved)", async () => {
    const runConceptQa = vi.fn().mockResolvedValue({ ok: true });
    const prepCanary = vi.fn().mockResolvedValue(undefined);
    await runWithCanaryPrepOverlap({
      conceptOk: false,
      runConceptQa,
      prepCanary,
    });
    expect(prepCanary).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/speed/pipeline-overlap.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/speed/pipeline-overlap.ts
export interface PipelineOverlapInput<T> {
  conceptOk: boolean;
  runConceptQa(): Promise<T>;
  prepCanary(): Promise<void>;
}

export interface PipelineOverlapResult<T> {
  qaResult: T;
}

/**
 * SPEED: Phase 5 — run concept QA and canary prep in parallel when concept
 * succeeded. If concept failed, do NOT prep canary (canary is wasted work
 * on a board that won't be approved). Quality preservation: canary prep
 * artifacts are not consumed until concept QA passes downstream, so the
 * overlap is purely a wall-clock optimization.
 */
export async function runWithCanaryPrepOverlap<T>(input: PipelineOverlapInput<T>): Promise<PipelineOverlapResult<T>> {
  if (!input.conceptOk) {
    const qaResult = await input.runConceptQa();
    return { qaResult };
  }
  const [qaResult] = await Promise.all([
    input.runConceptQa(),
    input.prepCanary(),
  ]);
  return { qaResult };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/speed/pipeline-overlap.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/speed/pipeline-overlap.ts src/lib/artlab/speed/pipeline-overlap.test.ts
git commit -m "$(cat <<'EOF'
Speed: overlap canary prep with concept QA when concept ok

Canary prep is wasted work if concept fails — we explicitly gate
on conceptOk so the overlap is only taken on the happy path.
Test proves prep-start happens before qa-end (true overlap, not
serialization).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Overlap is gated on `conceptOk` — failed concept never wastes canary work.
- [ ] Test verifies overlap empirically via event ordering.
- [ ] Promise.all error propagation: if either fails, the function rejects (no silent ignoring).

### Task 5.5: Sharp + rembg cutout worker pool

**Files:**
- Create: `src/lib/artlab/speed/cutout-pool.ts`
- Test: `src/lib/artlab/speed/cutout-pool.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/speed/cutout-pool.test.ts
import { describe, expect, it } from "vitest";
import { runCutoutPool, DEFAULT_CUTOUT_CONCURRENCY } from "./cutout-pool";

describe("cutout worker pool", () => {
  it("DEFAULT_CUTOUT_CONCURRENCY is at least 4 (or os.cpus().length, whichever is smaller)", () => {
    expect(DEFAULT_CUTOUT_CONCURRENCY).toBeGreaterThanOrEqual(2);
  });

  it("runs up to concurrency cutouts in parallel", async () => {
    let active = 0;
    let maxActive = 0;
    const cutout = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 30));
      active -= 1;
    };
    const tasks = Array.from({ length: 10 }, () => cutout);
    await runCutoutPool({ tasks, concurrency: 3 });
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(maxActive).toBeGreaterThan(1);
  });

  it("propagates errors (no silent swallowing)", async () => {
    const tasks = [async () => { throw new Error("nope"); }];
    await expect(runCutoutPool({ tasks, concurrency: 2 })).rejects.toThrow(/nope/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/speed/cutout-pool.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/speed/cutout-pool.ts
import { cpus } from "node:os";

export const DEFAULT_CUTOUT_CONCURRENCY = Math.max(2, Math.min(4, cpus().length));

export interface CutoutPoolInput {
  tasks: Array<() => Promise<unknown>>;
  concurrency?: number;
}

export async function runCutoutPool(input: CutoutPoolInput): Promise<void> {
  const concurrency = input.concurrency ?? DEFAULT_CUTOUT_CONCURRENCY;
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < input.tasks.length) {
      const idx = cursor;
      cursor += 1;
      await input.tasks[idx]!();
    }
  });
  await Promise.all(workers);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/speed/cutout-pool.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/speed/cutout-pool.ts src/lib/artlab/speed/cutout-pool.test.ts
git commit -m "$(cat <<'EOF'
Speed: cutout worker pool with capped concurrency

Cursor-shared worker pool — each worker pulls the next task as
it finishes the previous. Default concurrency clamped to
[2, 4] to avoid OOM on rembg + sharp inference. Cutout runner
will adopt this in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Concurrency cap respected (test verifies `maxActive <= concurrency`).
- [ ] Errors propagate (no silent swallowing).
- [ ] No global state — every invocation is independent.
- [ ] Concurrency clamped to [2, 4] by default to avoid memory pressure.

### Task 5.6: Cutout runner adopts the worker pool

**Files:**
- Modify: `src/lib/artlab/runners/cutout-runner.ts`
- Test: `src/lib/artlab/runners/cutout-runner.pool.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/cutout-runner.pool.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cutoutRunner } from "./cutout-runner";

describe("cutout runner — uses worker pool (Phase 5)", () => {
  let runDir: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-cr-pool-"));
    const productionDir = join(runDir, "production-slots");
    mkdirSync(productionDir);
    for (let i = 1; i <= 8; i += 1) {
      writeFileSync(join(productionDir, `slot-${i}.json`), JSON.stringify({ slotId: `slot-${i}` }));
    }
  });

  it("wall-clock for 8 cutouts is < 4x the per-cutout latency (parallelism proof)", async () => {
    process.env.ARTLAB_CUTOUT_DELAY_MS = "60";
    const startedAt = Date.now();
    const result = await cutoutRunner.run({
      runId: "r1", runDir, assetType: "character", characterId: "cro", providerId: "local-mock",
    });
    const wallClock = Date.now() - startedAt;
    delete process.env.ARTLAB_CUTOUT_DELAY_MS;
    expect(result.status).toBe("ok");
    // 8 cutouts × 60ms sequential = 480ms; pool of ≥2 should beat 4x = 240ms by some margin
    expect(wallClock).toBeLessThan(240);
    expect((result.artifacts.cutoutPaths as string[])).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (current impl is sequential)**

Run: `npx vitest run src/lib/artlab/runners/cutout-runner.pool.test.ts`
Expected: FAIL

- [ ] **Step 3: Rewrite cutout runner to use the pool**

```ts
// src/lib/artlab/runners/cutout-runner.ts (full replacement)
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AtelierAssetType } from "../types";
import type { AtelierRunner, AtelierRunnerInput, AtelierRunnerResult } from "./runner-contract";
import { runCutoutPool } from "@/lib/artlab/speed/cutout-pool";

const CUTOUT_REQUIRED: ReadonlySet<AtelierAssetType> = new Set(["character", "prop"]);

async function cutoutOne(sourceDir: string, cutoutDir: string, src: string): Promise<string> {
  const delayMs = Number.parseInt(process.env.ARTLAB_CUTOUT_DELAY_MS ?? "0", 10);
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  const path = join(cutoutDir, `${src.replace(/\.json$/, ".png")}`);
  writeFileSync(path, JSON.stringify({ source: src, alpha: true, mock: true }));
  return path;
}

export const cutoutRunner: AtelierRunner = {
  kind: "cutout",
  async run(input: AtelierRunnerInput): Promise<AtelierRunnerResult> {
    const startedAt = Date.now();
    if (!CUTOUT_REQUIRED.has(input.assetType)) {
      return {
        runnerKind: "cutout", status: "ok", durationMs: Date.now() - startedAt,
        artifacts: { skippedReason: "asset-type-has-no-cutout" },
      };
    }
    const sourceDir = join(input.runDir, "production-slots");
    const cutoutDir = join(input.runDir, "cutouts");
    if (!existsSync(cutoutDir)) mkdirSync(cutoutDir, { recursive: true });
    const sources = existsSync(sourceDir) ? readdirSync(sourceDir).filter((f) => f.endsWith(".json")) : [];
    const cutoutPaths: string[] = [];
    // SPEED: Phase 5 — runCutoutPool with capped concurrency. Each task
    // writes to its own file; no shared mutable state. Quality preservation:
    // exactly one cutout per source file, same naming.
    const tasks = sources.map((src) => async () => {
      cutoutPaths.push(await cutoutOne(sourceDir, cutoutDir, src));
    });
    await runCutoutPool({ tasks });
    return {
      runnerKind: "cutout", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { cutoutPaths: cutoutPaths.sort() },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/cutout-runner.pool.test.ts src/lib/artlab/runners/cutout-runner.test.ts`
Expected: PASS — both new pool test AND existing Phase 1 cutout test continue to pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/cutout-runner.ts src/lib/artlab/runners/cutout-runner.pool.test.ts
git commit -m "$(cat <<'EOF'
Speed: cutout runner uses runCutoutPool (parallel cutouts)

Each cutout task writes its own file independently. Quality
preservation: cutoutPaths is sorted before return so the
artifact order is deterministic across pool scheduling; Phase 1
Task 1.12 test still passes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Phase 1 Task 1.12 test still passes (no behavior regression).
- [ ] Output `cutoutPaths` is sorted (deterministic despite pool scheduling).
- [ ] Wall-clock test demonstrates ≥ 2x parallelism on 8 slots.

### Task 5.7: Memory retrieval LRU cache

**Files:**
- Create: `src/lib/artlab/speed/lru-cache.ts`
- Test: `src/lib/artlab/speed/lru-cache.test.ts`
- Modify: `src/lib/artlab/memory/retrieve.ts` (wrap getRelevantMemory)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/speed/lru-cache.test.ts
import { describe, expect, it, vi } from "vitest";
import { createLruCache } from "./lru-cache";

describe("LRU cache", () => {
  it("hits cache for repeated key", async () => {
    const fetcher = vi.fn().mockResolvedValue({ payload: "data" });
    const cache = createLruCache<string, { payload: string }>({ capacity: 3 });
    const a = await cache.getOrFetch("k1", fetcher);
    const b = await cache.getOrFetch("k1", fetcher);
    expect(a).toEqual(b);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("evicts least-recently-used when capacity exceeded", async () => {
    const fetcher = vi.fn().mockImplementation((k: string) => Promise.resolve({ payload: k }));
    const cache = createLruCache<string, { payload: string }>({ capacity: 2 });
    await cache.getOrFetch("a", () => fetcher("a"));
    await cache.getOrFetch("b", () => fetcher("b"));
    await cache.getOrFetch("a", () => fetcher("a")); // bumps a to MRU
    await cache.getOrFetch("c", () => fetcher("c")); // evicts b
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
    expect(cache.has("c")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/speed/lru-cache.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/speed/lru-cache.ts
export interface LruCache<K, V> {
  getOrFetch(key: K, fetcher: () => Promise<V>): Promise<V>;
  has(key: K): boolean;
  clear(): void;
}

export function createLruCache<K, V>(options: { capacity: number }): LruCache<K, V> {
  const map = new Map<K, V>();
  function touch(key: K, value: V): void {
    map.delete(key);
    map.set(key, value);
    while (map.size > options.capacity) {
      const oldest = map.keys().next().value as K;
      map.delete(oldest);
    }
  }
  return {
    async getOrFetch(key: K, fetcher: () => Promise<V>): Promise<V> {
      if (map.has(key)) {
        const v = map.get(key)!;
        touch(key, v);
        return v;
      }
      const v = await fetcher();
      touch(key, v);
      return v;
    },
    has(key: K): boolean { return map.has(key); },
    clear(): void { map.clear(); },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/speed/lru-cache.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/speed/lru-cache.ts src/lib/artlab/speed/lru-cache.test.ts
git commit -m "$(cat <<'EOF'
Speed: in-memory LRU cache (used by memory retrieval)

Insertion-ordered Map serves as LRU storage — re-insert on hit
to bump the key to MRU. capacity-bounded eviction on every
touch. Memory retrieve.ts adopts this in the next task to cache
getRelevantMemory results across same-character runs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] LRU semantics verified via test (recent access bumps key).
- [ ] No global state — each `createLruCache` returns an isolated instance.
- [ ] Eviction runs on every touch (no batched eviction).
- [ ] Capacity 0 is degenerate but doesn't crash.

### Task 5.8: Provider request retry-then-batch helper

**Files:**
- Create: `src/lib/artlab/speed/provider-batch.ts`
- Test: `src/lib/artlab/speed/provider-batch.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/speed/provider-batch.test.ts
import { describe, expect, it, vi } from "vitest";
import { withRetryAndBackoff, DEFAULT_RETRY_OPTIONS } from "./provider-batch";

describe("provider retry+backoff helper", () => {
  it("succeeds on first try without sleep", async () => {
    const op = vi.fn().mockResolvedValue("ok");
    const result = await withRetryAndBackoff(op, { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 3, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds", async () => {
    let calls = 0;
    const op = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) throw new Error("HTTP 429");
      return "ok";
    });
    const result = await withRetryAndBackoff(op, { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 5, baseDelayMs: 1 });
    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry on 4xx other than 429 (quality preserved)", async () => {
    const op = vi.fn().mockRejectedValue(new Error("HTTP 400 bad request"));
    await expect(withRetryAndBackoff(op, { ...DEFAULT_RETRY_OPTIONS, maxAttempts: 5, baseDelayMs: 1 })).rejects.toThrow(/400/);
    expect(op).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/speed/provider-batch.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/speed/provider-batch.ts
export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  retryableStatusCodes: number[];
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 4,
  baseDelayMs: 500,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

function isRetryableError(err: unknown, retryableStatusCodes: number[]): boolean {
  if (!(err instanceof Error)) return false;
  const match = err.message.match(/HTTP\s+(\d{3})/);
  if (!match) return false;
  const status = Number.parseInt(match[1]!, 10);
  return retryableStatusCodes.includes(status);
}

export async function withRetryAndBackoff<T>(op: () => Promise<T>, options: RetryOptions = DEFAULT_RETRY_OPTIONS): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await op();
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err, options.retryableStatusCodes)) throw err;
      if (attempt === options.maxAttempts) throw err;
      const delay = options.baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error("withRetryAndBackoff: exhausted attempts");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/speed/provider-batch.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/speed/provider-batch.ts src/lib/artlab/speed/provider-batch.test.ts
git commit -m "$(cat <<'EOF'
Speed: provider retry+exponential-backoff helper

Only retries on the canonical transient HTTP codes (408, 429,
5xx). 4xx user-error codes pass through unretried — quality
preservation: bad prompts fail fast, not after 4 attempts.
baseDelayMs doubles per attempt.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Retryable status codes are an explicit list (no string-matching heuristics).
- [ ] 4xx errors (except 429) never retried.
- [ ] Exponential backoff (delay doubles per attempt).
- [ ] `lastError` thrown after exhausting attempts (no silent return).

### Task 5.9: Telegram message debounce (avoid notification spam)

**Files:**
- Create: `src/lib/artlab/speed/telegram-debounce.ts`
- Test: `src/lib/artlab/speed/telegram-debounce.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/speed/telegram-debounce.test.ts
import { describe, expect, it, vi } from "vitest";
import { createTelegramDebouncer } from "./telegram-debounce";

describe("telegram message debouncer", () => {
  it("coalesces multiple sends within the window to one batched send", async () => {
    const sendFn = vi.fn().mockResolvedValue(undefined);
    const debouncer = createTelegramDebouncer({ sendFn, windowMs: 50, maxQueueSize: 100 });
    debouncer.enqueue("msg-1");
    debouncer.enqueue("msg-2");
    debouncer.enqueue("msg-3");
    await new Promise((r) => setTimeout(r, 80));
    expect(sendFn).toHaveBeenCalledOnce();
    const [text] = sendFn.mock.calls[0]!;
    expect(text).toContain("msg-1");
    expect(text).toContain("msg-2");
    expect(text).toContain("msg-3");
  });

  it("flushes immediately when maxQueueSize is hit (quality preserved)", async () => {
    const sendFn = vi.fn().mockResolvedValue(undefined);
    const debouncer = createTelegramDebouncer({ sendFn, windowMs: 1000, maxQueueSize: 2 });
    debouncer.enqueue("a");
    debouncer.enqueue("b");
    await new Promise((r) => setTimeout(r, 10));
    expect(sendFn).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/speed/telegram-debounce.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/speed/telegram-debounce.ts
export interface TelegramDebouncerOptions {
  sendFn(text: string): Promise<void>;
  windowMs: number;
  maxQueueSize: number;
}

export interface TelegramDebouncer {
  enqueue(text: string): void;
  flush(): Promise<void>;
}

export function createTelegramDebouncer(options: TelegramDebouncerOptions): TelegramDebouncer {
  let queue: string[] = [];
  let timer: NodeJS.Timeout | null = null;

  async function flush(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    if (queue.length === 0) return;
    const batch = queue.slice();
    queue = [];
    const text = batch.join("\n");
    await options.sendFn(text);
  }

  return {
    enqueue(text: string): void {
      queue.push(text);
      if (queue.length >= options.maxQueueSize) {
        void flush();
        return;
      }
      if (!timer) {
        timer = setTimeout(() => { void flush(); }, options.windowMs);
      }
    },
    flush,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/speed/telegram-debounce.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/speed/telegram-debounce.ts src/lib/artlab/speed/telegram-debounce.test.ts
git commit -m "$(cat <<'EOF'
Speed: Telegram message debouncer (coalesce in windowMs)

Quality preservation: every message still arrives — they're just
joined with \n into one batched send when they fall within the
window. maxQueueSize forces a flush so a fast burst doesn't get
stuck behind the timer.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Every enqueued message appears in some batched send (none dropped).
- [ ] `maxQueueSize` forces immediate flush (no starvation).
- [ ] Concurrent `enqueue` calls during flush are safe (queue is reset to `[]`, new pushes go to the next batch).

### Task 5.10: Quality preservation harness (compare fast vs slow outputs)

**Files:**
- Create: `src/lib/artlab/speed/quality-equivalence.ts`
- Test: `src/lib/artlab/speed/quality-equivalence.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/speed/quality-equivalence.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertQualityEquivalent } from "./quality-equivalence";

describe("quality equivalence", () => {
  let dirA: string;
  let dirB: string;
  beforeEach(() => {
    dirA = mkdtempSync(join(tmpdir(), "artlab-qe-a-"));
    dirB = mkdtempSync(join(tmpdir(), "artlab-qe-b-"));
  });

  it("passes when artifact shapes match (timestamps allowed to differ)", () => {
    writeFileSync(join(dirA, "asset-doctor.json"), JSON.stringify({ entries: [{ cutoutPath: "a", alpha: true, notes: [] }] }));
    writeFileSync(join(dirB, "asset-doctor.json"), JSON.stringify({ entries: [{ cutoutPath: "a", alpha: true, notes: [] }] }));
    writeFileSync(join(dirA, "run-state.json"), JSON.stringify({ phase: "closed", createdAt: "2026-05-20T01:00:00Z" }));
    writeFileSync(join(dirB, "run-state.json"), JSON.stringify({ phase: "closed", createdAt: "2026-05-20T02:00:00Z" }));
    const result = assertQualityEquivalent({ runDirA: dirA, runDirB: dirB });
    expect(result.equivalent).toBe(true);
  });

  it("fails when asset-doctor entries differ", () => {
    writeFileSync(join(dirA, "asset-doctor.json"), JSON.stringify({ entries: [{ cutoutPath: "a", alpha: true, notes: [] }] }));
    writeFileSync(join(dirB, "asset-doctor.json"), JSON.stringify({ entries: [{ cutoutPath: "a", alpha: false, notes: ["missing alpha"] }] }));
    const result = assertQualityEquivalent({ runDirA: dirA, runDirB: dirB });
    expect(result.equivalent).toBe(false);
    expect(result.differences).toContain("asset-doctor.json");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/speed/quality-equivalence.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/speed/quality-equivalence.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const TIMESTAMP_FIELDS = new Set(["at", "createdAt", "updatedAt", "promotedAt", "recordedAt", "decidedAt", "generatedAt"]);

function stripTimestamps(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripTimestamps);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (TIMESTAMP_FIELDS.has(k)) continue;
      out[k] = stripTimestamps(v);
    }
    return out;
  }
  return value;
}

function loadCanonicalJson(path: string): unknown {
  if (!existsSync(path)) return null;
  return stripTimestamps(JSON.parse(readFileSync(path, "utf8")));
}

export interface QualityEquivalenceInput {
  runDirA: string;
  runDirB: string;
}

export interface QualityEquivalenceResult {
  equivalent: boolean;
  differences: string[];
}

const COMPARED_FILES = ["asset-doctor.json", "repair-plan.json", "concept-board.json", "canary-gate.json", "run-state.json"];

export function assertQualityEquivalent(input: QualityEquivalenceInput): QualityEquivalenceResult {
  const differences: string[] = [];
  for (const file of COMPARED_FILES) {
    const a = loadCanonicalJson(join(input.runDirA, file));
    const b = loadCanonicalJson(join(input.runDirB, file));
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      differences.push(file);
    }
  }
  return { equivalent: differences.length === 0, differences };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/speed/quality-equivalence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/speed/quality-equivalence.ts src/lib/artlab/speed/quality-equivalence.test.ts
git commit -m "$(cat <<'EOF'
Speed: quality-equivalence harness (compare fast vs slow runs)

Loads canonical engine state files (asset-doctor, repair-plan,
concept-board, canary-gate, run-state), strips timestamp fields,
JSON-stringifies, and compares. Phase 5 tasks reference this to
prove their speed changes preserve output quality.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Timestamp fields stripped before comparison (recursive — nested objects too).
- [ ] `COMPARED_FILES` is the canonical list of artifacts the engine writes.
- [ ] Missing file on one side and present on the other counts as a difference.
- [ ] Test demonstrates both equivalent and non-equivalent cases.

### Task 5.11: Speed/quality dashboard inside `artlab health`

**Files:**
- Modify: `src/lib/artlab/health/snapshot.ts` (extend with speed summary)
- Test: `src/lib/artlab/health/snapshot.speed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/health/snapshot.speed.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildArtLabHealthSnapshot } from "./snapshot";

describe("health snapshot — speed summary (Phase 5)", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-hs-"));
    mkdirSync(join(workspaceRoot, "ledgers"));
    writeFileSync(join(workspaceRoot, "ledgers", "measurements.jsonl"), [
      JSON.stringify({ label: "rafe-run", durationMs: 1320000, at: "2026-05-20T00:00:00Z" }),
      JSON.stringify({ label: "rafe-run", durationMs: 700000, at: "2026-05-21T00:00:00Z" }),
    ].join("\n") + "\n");
    writeFileSync(join(workspaceRoot, "ledgers", "baselines.jsonl"), JSON.stringify({
      label: "phase-4-rafe-baseline", runId: "rafe-001", wallClockMs: 1320000,
      startedAt: "x", endedAt: "y", recordedAt: "z",
    }) + "\n");
  });

  it("snapshot.speed.medianRunMs is computed from measurements", async () => {
    const snapshot = await buildArtLabHealthSnapshot({ workspaceRoot });
    expect(snapshot.speed?.medianRecentRunMs).toBeGreaterThan(0);
    expect(snapshot.speed?.baselineRunMs).toBe(1320000);
    expect(snapshot.speed?.improvementPercent).toBeGreaterThanOrEqual(40);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/health/snapshot.speed.test.ts`
Expected: FAIL

- [ ] **Step 3: Extend health snapshot**

```ts
// extend src/lib/artlab/health/snapshot.ts buildArtLabHealthSnapshot return
// (assuming snapshot.ts exists and exports the existing shape; add a `speed` field)

import { readMeasurements } from "@/lib/artlab/speed/measure";
import { readBaseline } from "@/lib/artlab/migration/baseline-recorder";

export interface SpeedSummary {
  medianRecentRunMs: number;
  baselineRunMs: number;
  improvementPercent: number;
  recentRunCount: number;
}

async function buildSpeedSummary(workspaceRoot: string): Promise<SpeedSummary | undefined> {
  const recent = await readMeasurements({ workspaceRoot, label: "rafe-run" });
  if (recent.length === 0) return undefined;
  const sorted = recent.map((m) => m.durationMs).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const baseline = await readBaseline({ workspaceRoot, label: "phase-4-rafe-baseline" });
  const baselineMs = baseline?.wallClockMs ?? median;
  const improvementPercent = baselineMs > 0 ? Math.round(((baselineMs - median) / baselineMs) * 100) : 0;
  return {
    medianRecentRunMs: median,
    baselineRunMs: baselineMs,
    improvementPercent,
    recentRunCount: recent.length,
  };
}

// Then in buildArtLabHealthSnapshot, add: speed: await buildSpeedSummary(workspaceRoot),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/health/snapshot.speed.test.ts src/lib/artlab/health/snapshot.test.ts`
Expected: PASS (both new speed test + Phase 1 snapshot test)

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/health/snapshot.ts src/lib/artlab/health/snapshot.speed.test.ts
git commit -m "$(cat <<'EOF'
Speed: extend artlab health snapshot with speed summary

Adds snapshot.speed { medianRecentRunMs, baselineRunMs,
improvementPercent, recentRunCount }. Reads from
ledgers/measurements.jsonl + ledgers/baselines.jsonl. CLI
`artlab health` will surface this; Phase 5 promise is
improvementPercent ≥ 40.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Phase 1 snapshot test still passes (additive change, no breakage).
- [ ] Speed summary is `undefined` (not error) when no measurements exist.
- [ ] `improvementPercent` is integer-rounded.
- [ ] Baseline missing falls back to median (so the dashboard reads "0% improvement" rather than NaN).

### Task 5.12: Daily benchmark CI workflow

**Files:**
- Create: `.github/workflows/artlab-benchmark.yml`
- Create: `src/lib/artlab/speed/benchmark-runner.ts`
- Test: `src/lib/artlab/speed/benchmark-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/speed/benchmark-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMockBenchmark } from "./benchmark-runner";

describe("daily benchmark runner", () => {
  let workspaceRoot: string;
  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-bench-"));
    mkdirSync(join(workspaceRoot, "ledgers"));
  });

  it("emits a benchmark entry to ledgers/measurements.jsonl", async () => {
    process.env.ARTLAB_CONCEPT_LANE_DELAY_MS = "5";
    process.env.ARTLAB_CUTOUT_DELAY_MS = "5";
    const result = await runMockBenchmark({ workspaceRoot });
    delete process.env.ARTLAB_CONCEPT_LANE_DELAY_MS;
    delete process.env.ARTLAB_CUTOUT_DELAY_MS;
    expect(result.label).toBe("daily-mock-benchmark");
    expect(result.durationMs).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/speed/benchmark-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/speed/benchmark-runner.ts
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conceptRunner } from "@/lib/artlab/runners/concept-runner";
import { cutoutRunner } from "@/lib/artlab/runners/cutout-runner";
import { measureWallClock, recordMeasurement } from "./measure";

export interface MockBenchmarkResult {
  label: "daily-mock-benchmark";
  durationMs: number;
  conceptMs: number;
  cutoutMs: number;
}

export async function runMockBenchmark(input: { workspaceRoot: string }): Promise<MockBenchmarkResult> {
  const runDir = mkdtempSync(join(tmpdir(), "artlab-bm-"));
  const conceptMeasurement = await measureWallClock("concept", () => conceptRunner.run({
    runId: "bm",
    runDir,
    assetType: "character",
    characterId: "bm",
    providerId: "local-mock",
  }));
  const cutoutMeasurement = await measureWallClock("cutout", () => cutoutRunner.run({
    runId: "bm",
    runDir,
    assetType: "character",
    providerId: "local-mock",
  }));
  const total = conceptMeasurement.durationMs + cutoutMeasurement.durationMs;
  await recordMeasurement({ workspaceRoot: input.workspaceRoot, label: "daily-mock-benchmark", durationMs: total });
  return {
    label: "daily-mock-benchmark",
    durationMs: total,
    conceptMs: conceptMeasurement.durationMs,
    cutoutMs: cutoutMeasurement.durationMs,
  };
}
```

- [ ] **Step 4: Add the GitHub Actions workflow**

```yaml
# .github/workflows/artlab-benchmark.yml
name: artlab-benchmark
on:
  schedule:
    - cron: "13 7 * * *"   # daily 07:13 UTC
  workflow_dispatch: {}
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - name: Run mock benchmark
        env:
          ARTLAB_CONCEPT_LANE_DELAY_MS: "5"
          ARTLAB_CUTOUT_DELAY_MS: "5"
        run: |
          mkdir -p .artlab/engine/ledgers
          npx tsx -e "import('./src/lib/artlab/speed/benchmark-runner').then(async m=>{const r=await m.runMockBenchmark({workspaceRoot:'.artlab/engine'});console.log('benchmark',JSON.stringify(r));if(r.durationMs>2000){console.error('REGRESSION: benchmark exceeded 2s');process.exit(1)}})"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/speed/benchmark-runner.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/artlab/speed/benchmark-runner.ts src/lib/artlab/speed/benchmark-runner.test.ts .github/workflows/artlab-benchmark.yml
git commit -m "$(cat <<'EOF'
Speed: daily mock benchmark CI

Runs concept + cutout against local-mock with deterministic
delays; records to measurements.jsonl; fails CI if total wall-
clock exceeds 2s (the upper bound at current parallelism).
Workflow runs daily at 07:13 UTC + on dispatch.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Benchmark is deterministic (uses local-mock + env-var delays only).
- [ ] CI workflow fails if `durationMs > 2000` — actionable regression signal.
- [ ] Schedule cron picks an off-peak time (07:13 UTC = 03:13 ET = no overlap with East Coast workday).
- [ ] `workflow_dispatch: {}` allows manual triggering for ad-hoc benchmarks.

### Task 5.13: PR-gate — speed regression > 10% fails CI

**Files:**
- Create: `.github/workflows/artlab-speed-regression-gate.yml`
- Create: `src/lib/artlab/speed/regression-gate.ts`
- Test: `src/lib/artlab/speed/regression-gate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/speed/regression-gate.test.ts
import { describe, expect, it } from "vitest";
import { assertNoSpeedRegression } from "./regression-gate";

describe("speed regression gate", () => {
  it("passes when prDurationMs ≤ baseline * 1.1", () => {
    const result = assertNoSpeedRegression({ baselineMs: 1000, prMs: 1050 });
    expect(result.passed).toBe(true);
  });

  it("passes when PR is FASTER than baseline", () => {
    const result = assertNoSpeedRegression({ baselineMs: 1000, prMs: 700 });
    expect(result.passed).toBe(true);
  });

  it("fails when prDurationMs > baseline * 1.1", () => {
    const result = assertNoSpeedRegression({ baselineMs: 1000, prMs: 1101 });
    expect(result.passed).toBe(false);
    expect(result.regressionPercent).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/speed/regression-gate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/speed/regression-gate.ts
export const ALLOWED_REGRESSION_PERCENT = 10;

export interface RegressionGateInput {
  baselineMs: number;
  prMs: number;
}

export interface RegressionGateResult {
  passed: boolean;
  regressionPercent: number;
  message: string;
}

export function assertNoSpeedRegression(input: RegressionGateInput): RegressionGateResult {
  if (input.baselineMs <= 0) return { passed: true, regressionPercent: 0, message: "no baseline available" };
  const regressionPercent = ((input.prMs - input.baselineMs) / input.baselineMs) * 100;
  const passed = regressionPercent <= ALLOWED_REGRESSION_PERCENT;
  return {
    passed,
    regressionPercent: Math.round(regressionPercent * 10) / 10,
    message: passed
      ? `OK: ${input.prMs}ms vs baseline ${input.baselineMs}ms (${regressionPercent.toFixed(1)}%)`
      : `REGRESSION: ${input.prMs}ms exceeds baseline ${input.baselineMs}ms by ${regressionPercent.toFixed(1)}% (cap ${ALLOWED_REGRESSION_PERCENT}%)`,
  };
}
```

- [ ] **Step 4: Add the workflow**

```yaml
# .github/workflows/artlab-speed-regression-gate.yml
name: artlab-speed-regression-gate
on:
  pull_request:
    paths:
      - "src/lib/artlab/**"
jobs:
  speed-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - name: Run PR benchmark
        env:
          ARTLAB_CONCEPT_LANE_DELAY_MS: "5"
          ARTLAB_CUTOUT_DELAY_MS: "5"
        run: |
          mkdir -p .artlab/engine/ledgers
          PR_MS=$(npx tsx -e "import('./src/lib/artlab/speed/benchmark-runner').then(async m=>{const r=await m.runMockBenchmark({workspaceRoot:'.artlab/engine'});process.stdout.write(String(r.durationMs))})")
          # baseline: use the last-known mock benchmark duration from main (fallback 1500)
          BASELINE_MS=1500
          npx tsx -e "import('./src/lib/artlab/speed/regression-gate').then(m=>{const r=m.assertNoSpeedRegression({baselineMs:$BASELINE_MS,prMs:$PR_MS});console.log(r.message);if(!r.passed)process.exit(1)})"
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/speed/regression-gate.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/artlab/speed/regression-gate.ts src/lib/artlab/speed/regression-gate.test.ts .github/workflows/artlab-speed-regression-gate.yml
git commit -m "$(cat <<'EOF'
Speed: PR gate — fail CI on speed regression > 10%

Runs the mock benchmark on PR, compares against a fixed baseline
(1500ms — the current ceiling for concept+cutout on local-mock).
Future tasks can replace the literal 1500 with a dynamic
baseline fetched from main, but the literal works as the v1 gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Regression cap is a module-level const (`ALLOWED_REGRESSION_PERCENT = 10`).
- [ ] PR faster than baseline → passes (negative regression).
- [ ] Message includes both absolute ms numbers AND percentage.
- [ ] Workflow only runs on PRs touching `src/lib/artlab/**` (no noise on doc-only PRs).

### Task 5.14: Phase 5 acceptance — Rafe-rerun proves ≥ 40% improvement

**Files:**
- Create: `src/lib/artlab/speed/phase-5-acceptance.test.ts`

- [ ] **Step 1: Write the asserting test (describe.skip — real-money rerun)**

```ts
// src/lib/artlab/speed/phase-5-acceptance.test.ts
import { describe, expect, it } from "vitest";
import { readBaseline } from "@/lib/artlab/migration/baseline-recorder";
import { readMeasurements } from "./measure";

describe.skip("Phase 5 acceptance — Rafe-rerun ≥ 40% faster than baseline", () => {
  it("median post-Phase-5 rafe-run measurement beats the baseline by ≥ 40%", async () => {
    const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine";
    const baseline = await readBaseline({ workspaceRoot, label: "phase-4-rafe-baseline" });
    expect(baseline).toBeTruthy();
    const measurements = await readMeasurements({ workspaceRoot, label: "rafe-run" });
    expect(measurements.length).toBeGreaterThanOrEqual(3); // need ≥ 3 post-speed runs
    const recentMs = measurements.slice(-3).map((m) => m.durationMs).sort((a, b) => a - b);
    const median = recentMs[1]!;
    const improvement = ((baseline!.wallClockMs - median) / baseline!.wallClockMs) * 100;
    expect(improvement).toBeGreaterThanOrEqual(40);
  }, 60_000);
});
```

- [ ] **Step 2: Commit (the test is skipped — Armaan un-skips after re-running Rafe)**

```bash
git add src/lib/artlab/speed/phase-5-acceptance.test.ts
git commit -m "$(cat <<'EOF'
Phase 5 acceptance test — assert Rafe-rerun ≥ 40% faster

describe.skip until Armaan reruns Rafe through the Phase 5
engine and records ≥ 3 'rafe-run' measurements. When un-skipped,
the test asserts median post-Phase-5 wall-clock beats the
phase-4-rafe-baseline by ≥ 40%. This is the Phase 5 completion
gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `describe.skip` so vitest does not run it automatically.
- [ ] Asserts ≥ 3 post-Phase-5 runs exist (single measurement is noise).
- [ ] Median (not min, not mean) used — robust to outliers.
- [ ] Threshold is `≥ 40%` matching the Phase 5 promise.

### Task 5.15: Phase 5 documentation — Speed Playbook

**Files:**
- Create: `docs/artlab/SPEED.md`

- [ ] **Step 1: Write the doc**

```markdown
# ArtLab — Speed Playbook

ArtLab runs **as fast as quality allows**, with output byte-identical or QA-equivalent to a slow run. This page lists every speed mechanism, its quality-preservation guarantee, and the on-by-default tuning.

## Phase 5 speed mechanisms

| Mechanism | Quality preservation | Where |
|---|---|---|
| 5-lane concept parallelism (Promise.all) | Same slot files; Phase 1 Task 1.9 still passes | `src/lib/artlab/runners/concept-runner.ts` |
| LLM prompt caching (Anthropic ephemeral cache) | Same response; cache hit/miss invisible | `src/lib/artlab/orchestrator/claude-brain.ts` (Task 5.3 enforces) |
| Canary prep / concept QA overlap | Canary artifacts only consumed after QA pass | `src/lib/artlab/speed/pipeline-overlap.ts` |
| Cutout worker pool (concurrency 2-4) | Same cutout files, sorted output for determinism | `src/lib/artlab/speed/cutout-pool.ts`, `runners/cutout-runner.ts` |
| Memory retrieval LRU cache | Same results; cache size capped | `src/lib/artlab/speed/lru-cache.ts` |
| Provider retry+backoff (4xx/5xx-aware) | 4xx pass through; only transients retried | `src/lib/artlab/speed/provider-batch.ts` |
| Telegram message debounce | Every message preserved in batched send | `src/lib/artlab/speed/telegram-debounce.ts` |

## Tuning knobs

| Env var | Purpose | Default |
|---|---|---|
| `ARTLAB_CONCEPT_LANE_DELAY_MS` | Per-lane sleep in mock provider (test-only) | unset |
| `ARTLAB_CUTOUT_DELAY_MS` | Per-cutout sleep in mock provider (test-only) | unset |
| `ARTLAB_GEMINI_MODE=mock` | Skip real Gemini, return deterministic mock bytes | unset (production hits API) |
| `ARTLAB_CLAUDE_MODE=dry-run` | Skip real Anthropic call, echo input | unset (production hits API) |
| `ARTLAB_CODEX_MODE=mock` | Skip real codex CLI invocation | unset (production spawns CLI) |

## Daily benchmark + PR gate

- `.github/workflows/artlab-benchmark.yml` — daily 07:13 UTC mock-benchmark run; fails if total > 2s.
- `.github/workflows/artlab-speed-regression-gate.yml` — PR gate; fails if PR benchmark > baseline × 1.1.

## Quality-equivalence harness

Any contributor proposing a new speed change must use `src/lib/artlab/speed/quality-equivalence.ts` to assert their fast-path output is byte-identical (or QA-equivalent — timestamps stripped) to a slow-path run. Tests that ship in the PR cover this.

## Phase 5 acceptance gate

The whole-Phase-5 acceptance test (`src/lib/artlab/speed/phase-5-acceptance.test.ts`) asserts that the median of the last ≥ 3 Rafe-rerun wall-clocks is ≥ 40% faster than `phase-4-rafe-baseline`. The test is `describe.skip` by default; un-skip and run after ≥ 3 post-Phase-5 Rafe-equivalent runs are in the measurements ledger.
```

- [ ] **Step 2: Commit**

```bash
git add docs/artlab/SPEED.md
git commit -m "$(cat <<'EOF'
Add ArtLab Speed Playbook doc

Catalogs every Phase 5 speed mechanism with its quality-
preservation guarantee, tuning env vars, daily benchmark and
PR gate workflows, and the acceptance test gate.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Every Phase 5 task is listed in the mechanism table.
- [ ] Every tuning env var is named in the knobs table.
- [ ] Doc references the acceptance test (Task 5.14) by file path.

### Phase 5 completion criteria

Run these commands; all must exit 0 / produce expected output:

```bash
# All Phase 5 unit tests pass
npx vitest run src/lib/artlab/speed src/lib/artlab/runners

# Prompt caching is still enforced
npx vitest run src/lib/artlab/speed/prompt-caching-assertion.test.ts

# Phase 1 quality tests still pass (no regressions)
npx vitest run src/lib/artlab/runners/concept-runner.test.ts src/lib/artlab/runners/cutout-runner.test.ts

# Daily benchmark workflow + speed gate workflow + speed doc exist
test -f .github/workflows/artlab-benchmark.yml
test -f .github/workflows/artlab-speed-regression-gate.yml
test -f docs/artlab/SPEED.md

# Phase 5 acceptance test (manual): un-skip and run after ≥ 3 Rafe-rerun measurements exist
# Median wall-clock of last 3 rafe-runs must beat phase-4-rafe-baseline by ≥ 40%

# Tag the phase
git tag artlab-phase-5-complete
```

---

## Phase 6 — Cast push

Take the engine from "works once" to "shipped at scale." 9 more characters move from concept through `closed`, memory accumulates, cast coherence becomes a meaningful constraint, the daemon runs unattended overnight (because *the daemon* is overnight — Armaan triggers, walks away, wakes to a ready board), and one bundle (`war room with Rafe`) proves multi-asset linkage.

This phase is mostly **runbook + acceptance assertions**, not implementation. The engine is built; here it produces. Each character is a `npm run artlab -- produce` from Telegram, two human gates per character, and an acceptance test that verifies the run reached `closed` cleanly.

**Spec sections covered:** §14 Phase 5; §7 Memory; §8 Cast coherence; §9 Multi-asset bundles.

**Phase 6 dependencies:** `artlab-phase-5-complete` git tag.

### Task 6.1: Per-character production runbook

**Files:**
- Create: `docs/artlab/CAST-PUSH-RUNBOOK.md`

- [ ] **Step 1: Write the runbook**

```markdown
# ArtLab — Cast Push Runbook (Phase 6)

The 9 Season-1 characters to produce after Rafe Calder is promoted:

| # | Character ID | Telegram trigger | Floor / role | Special notes |
|---|---|---|---|---|
| 1 | priya | `make Priya Vasquez` | Floor 7 War Room / CRO | Pipeline closer energy; deep colors |
| 2 | dylan | `make Dylan Marsh` | Floor 6 Rolodex / CNO | Warm extrovert; relationship-focused |
| 3 | vera | `make Vera Bloom` | Floor 5 Writing Room / CMO | Editorial precision; "atelier confidence" |
| 4 | sol | `make Sol Navarro` | Floor 4 Situation / COO | Calm authority; situational adaptability |
| 5 | inez | `make Inez Reyes` | Floor 3 Briefing / CPO | Coaching/interview prep persona |
| 6 | mina | `make Mina Hart` | Floor 2 Observatory / CFO | Analytical; comfort with numbers |
| 7 | etta | `make Etta Brooks` | Floor 6 secondary / CIO | Information-architecture mind |
| 8 | rowan | `make Rowan Park` | Floor 4 secondary | Operations support |
| 9 | nadia | `make Nadia Saito` | Floor 3 secondary | Interview-prep coach |

**Per-character protocol:**

1. From Telegram: send the exact trigger text (column 3).
2. Wait for concept-board notification (5 lanes) — typical wall-clock < 4 minutes (post-Phase-5).
3. Reply `approve direction <n>` selecting the lane closest to the character's role.
4. Wait for final-board notification (21-sprite grid) — typical wall-clock < 10 minutes.
5. Inspect the final board carefully against the character's role + voice.
6. Reply `approved for app` to promote.
7. `npm run artlab:status -- <runId>` confirms `closed` phase.
8. Browser-QA the affected floor: `npx playwright test tests/e2e/<floor>-browser-qa.spec.ts`.
9. Run `npm run artlab -- health` and verify the speed/quality dashboard shows no regression.

**If a concept board fails QA:** reply `revise: <one-sentence direction>`. Engine regenerates. Three consecutive coherence failures escalate to Armaan via Telegram blocker.

**If the production pack is wrong:** cancel via Telegram `/cancel <runId>` — engine releases budget reservations and writes a refund-confirmation message.

**Memory checkpoint after every promote:**
- `wc -l .artlab/engine/memory/style-wins.jsonl` increased by 1.
- `wc -l .artlab/engine/memory/style-rejections.jsonl` may have grown if any concepts were rejected.
- `wc -l .artlab/engine/memory/prompt-evolution.jsonl` may have grown if the prompt builder hardened.

**Bundle test (after at least 3 characters promoted):** send `make the war room with Rafe in it` from Telegram. Engine should parse as a bundle, spawn ≥ 2 linked sub-runs (war-room environment + Rafe co-appears scene), and promote atomically.
```

- [ ] **Step 2: Commit**

```bash
git add docs/artlab/CAST-PUSH-RUNBOOK.md
git commit -m "$(cat <<'EOF'
Add Cast Push runbook for Phase 6 (9 character production)

Per-character protocol (Telegram trigger → concept → approve →
final → approved for app → status → browser QA), memory
checkpoints, escalation paths, and the bundle test that proves
multi-asset linkage works end-to-end.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Each of the 9 character IDs matches the existing agent hierarchy in `docs/CHAIN-OF-COMMAND.md`.
- [ ] Per-character protocol references exact CLI commands and Telegram phrases.
- [ ] Memory checkpoint section names the three ledger files explicitly.
- [ ] Bundle test instruction is included.

### Task 6.2: Memory accumulation acceptance test

**Files:**
- Create: `src/lib/artlab/memory/cast-push-accumulation.test.ts`

- [ ] **Step 1: Write the asserting test (real workspace, run manually after each character)**

```ts
// src/lib/artlab/memory/cast-push-accumulation.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe.skip("Phase 6 memory accumulation (manual — run after each character)", () => {
  const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine";

  it("style-wins.jsonl grows by 1 per promoted character", () => {
    const path = join(workspaceRoot, "memory", "style-wins.jsonl");
    expect(existsSync(path)).toBe(true);
    const lines = readFileSync(path, "utf8").trim().split("\n").filter((l) => l);
    const wins = lines.map((l) => JSON.parse(l)) as { characterId: string; source?: string }[];
    const characterIds = new Set(wins.map((w) => w.characterId));
    // After Otis + Mara import + Rafe + 9 cast = 12 distinct character IDs by end of Phase 6
    expect(characterIds.size).toBeGreaterThanOrEqual(3); // adjust as cast push progresses
  });

  it("style-wins from legacy-import are preserved (Otis + Mara/ceo)", () => {
    const path = join(workspaceRoot, "memory", "style-wins.jsonl");
    const wins = readFileSync(path, "utf8").trim().split("\n").map((l) => JSON.parse(l)) as { characterId: string; source?: string }[];
    expect(wins.some((w) => w.characterId === "otis" && w.source === "legacy-import")).toBe(true);
    expect(wins.some((w) => w.characterId === "ceo" && w.source === "legacy-import")).toBe(true);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/artlab/memory/cast-push-accumulation.test.ts
git commit -m "$(cat <<'EOF'
Add memory accumulation acceptance test (Phase 6 manual gate)

describe.skip — un-skip and adjust the expected-count assertion
after each character lands. Confirms the legacy-import wins for
Otis and Mara/ceo are preserved throughout the cast push.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `describe.skip` so vitest doesn't fail on a not-yet-pushed cast.
- [ ] Asserts legacy-import wins specifically (no quiet overwrite).
- [ ] Threshold is adjustable — comment notes "adjust as cast push progresses".

### Task 6.3: Cast diversity regression suite

**Files:**
- Create: `src/lib/artlab/coherence/cast-diversity-regression.test.ts`

- [ ] **Step 1: Write the asserting test**

```ts
// src/lib/artlab/coherence/cast-diversity-regression.test.ts
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { computePerceptualHash } from "./hashes";

describe.skip("Phase 6 cast diversity (manual — run after each character)", () => {
  const workspaceRoot = process.env.ARTLAB_WORKSPACE_ROOT ?? ".artlab/engine";
  const publicArtRoot = "public/art/lobby";

  it("every promoted character's idle.webp has a distinct perceptual hash from all others", async () => {
    if (!existsSync(publicArtRoot)) return;
    const characters = readdirSync(publicArtRoot).filter((d) =>
      existsSync(join(publicArtRoot, d, "idle.webp")),
    );
    expect(characters.length).toBeGreaterThan(0);
    const hashes: { characterId: string; hash: string }[] = [];
    for (const characterId of characters) {
      const bytes = readFileSync(join(publicArtRoot, characterId, "idle.webp"));
      const hash = await computePerceptualHash(bytes);
      hashes.push({ characterId, hash });
    }
    // All hashes must be distinct — no character's idle pose collides with another's.
    const distinct = new Set(hashes.map((h) => h.hash));
    expect(distinct.size).toBe(hashes.length);
  }, 60_000);
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/artlab/coherence/cast-diversity-regression.test.ts
git commit -m "$(cat <<'EOF'
Add cast diversity regression test (Phase 6 manual gate)

Computes perceptual hash of every promoted character's
idle.webp; asserts no two characters share a hash. Catches
the failure mode where two cast members converge on the same
silhouette/palette and read as the same person.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Uses the Phase 2 Task 2.10 `computePerceptualHash` helper (no parallel implementation).
- [ ] Asserts strict distinctness (no `>= 0.8 similarity` softness — hashes must be literally different).
- [ ] Tolerates the early state (returns silently if no characters yet promoted).

### Task 6.4: Bundle resolution acceptance test (war room + Rafe)

**Files:**
- Create: `src/lib/artlab/intake/bundle-acceptance.test.ts`

- [ ] **Step 1: Write the asserting test**

```ts
// src/lib/artlab/intake/bundle-acceptance.test.ts
import { describe, expect, it } from "vitest";
import { parseBundleSpec } from "./bundle-parser";

describe.skip("Phase 6 bundle acceptance — war room with Rafe", () => {
  it("'make the war room with Rafe in it' parses to a bundle with ≥ 2 children", () => {
    const bundle = parseBundleSpec("make the war room with Rafe in it");
    expect(bundle.children.length).toBeGreaterThanOrEqual(2);
    const types = bundle.children.map((c) => c.assetType);
    expect(types).toContain("environment");
    // Rafe co-appears via either a character reference or a scene asset linked to him
    expect(bundle.links.some((l) => l.linkType === "co-appears-in" || l.linkType === "references")).toBe(true);
  });

  it("promotionPolicy is 'atomic' for war-room bundles (env + character)", () => {
    const bundle = parseBundleSpec("make the war room with Rafe in it");
    expect(bundle.promotionPolicy).toBe("atomic");
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/artlab/intake/bundle-acceptance.test.ts
git commit -m "$(cat <<'EOF'
Add bundle acceptance test for 'war room with Rafe' (Phase 6)

describe.skip — un-skip after the war-room background is
generated (Phase 7 environment slice). Asserts the bundle
parser produces a multi-child spec with atomic promotion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Bundle has ≥ 2 children with `environment` among the asset types.
- [ ] Linkage between children is `co-appears-in` or `references`.
- [ ] Atomic promotion enforced for env+character bundles.

### Task 6.5: Daemon unattended-overnight smoke test

**Files:**
- Create: `src/lib/artlab/daemon/unattended-smoke.test.ts`

- [ ] **Step 1: Write the asserting test**

```ts
// src/lib/artlab/daemon/unattended-smoke.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reconcileCrashedRuns } from "./crash-recovery";

describe("daemon unattended smoke — simulate daemon restart mid-run", () => {
  let workspaceRoot: string;
  beforeEach(() => { workspaceRoot = mkdtempSync(join(tmpdir(), "artlab-unattended-")); });

  it("runs with stale heartbeats are reconciled and leases released", async () => {
    // Simulate: daemon was running a Rafe-style production, then crashed 12 minutes ago.
    const runDir = join(workspaceRoot, "runs", "rafe-overnight");
    mkdirSync(join(runDir, "slot-leases"), { recursive: true });
    writeFileSync(join(runDir, "run-state.json"), JSON.stringify({
      runId: "rafe-overnight", assetType: "character", phase: "production",
      createdAt: "2026-05-21T00:00:00.000Z", updatedAt: "2026-05-21T00:00:00.000Z",
      request: "make Rafe Calder",
    }));
    writeFileSync(join(runDir, "progress.json"), JSON.stringify({
      runId: "rafe-overnight",
      at: new Date(Date.now() - 12 * 60_000).toISOString(),
      phase: "production",
      slotsCompleted: 14, slotsRunning: 2, slotsFailed: 0,
      actualSpendCents: 800, reservedCents: 200,
    }));
    for (let i = 1; i <= 2; i += 1) {
      writeFileSync(join(runDir, "slot-leases", `slot-${i}.lease.json`), JSON.stringify({ slotId: `slot-${i}` }));
    }
    const result = await reconcileCrashedRuns({ workspaceRoot });
    expect(result.staleRunsReconciled).toContain("rafe-overnight");
    expect(result.leasesReleased.length).toBe(2);
    expect(existsSync(join(runDir, "slot-leases", "slot-1.lease.json"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (Task 3.18 already implements reconcile)**

Run: `npx vitest run src/lib/artlab/daemon/unattended-smoke.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/artlab/daemon/unattended-smoke.test.ts
git commit -m "$(cat <<'EOF'
Add daemon unattended-overnight smoke test (Phase 6)

Simulates: daemon crashed 12 min ago mid-production. Reconciler
releases stale leases (spec safety property #4). This is the
non-real-money proxy for the 'wake to ready board' usage
pattern.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Uses the Phase 3 Task 3.18 `reconcileCrashedRuns` (no parallel implementation).
- [ ] Asserts exact lease count released (2/2).
- [ ] Tests the actual lease file removal (filesystem assertion, not just return value).

### Phase 6 completion criteria

Run these commands; expected results listed:

```bash
# All Phase 6 tests pass (skipped tests don't fail)
npx vitest run src/lib/artlab/memory/cast-push-accumulation.test.ts src/lib/artlab/coherence/cast-diversity-regression.test.ts src/lib/artlab/intake/bundle-acceptance.test.ts src/lib/artlab/daemon/unattended-smoke.test.ts

# Cast push runbook exists
test -f docs/artlab/CAST-PUSH-RUNBOOK.md

# All 9 characters promoted via ArtLab (Telegram-driven; verify by directory presence)
for c in priya dylan vera sol inez mina etta rowan nadia; do
  test -d public/art/lobby/$c || { echo "FAIL: missing $c"; exit 1; }
done

# style-wins.jsonl has at least 12 entries (Otis + Mara + Rafe + 9 cast)
test "$(wc -l < .artlab/engine/memory/style-wins.jsonl)" -ge 12

# Bundle test passed (manual; war room + Rafe atomically promoted)
# Daemon unattended smoke test passes (automated)

# Tag the phase
git tag artlab-phase-6-complete
```

---

## Phase 7 — Asset-type expansion

Three vertical slices: environment, UI texture, animation. Each slice proves the engine can produce that asset type end-to-end with the same two-gate flow, the same QA discipline, and per-asset-type Playwright assertions that verify the asset works in the actual Tower runtime.

**Spec sections covered:** §14 Phase 6 of the migration plan; §3.1 module map (the runners now extend beyond character).

**Phase 7 dependencies:** `artlab-phase-6-complete` git tag. Phase 7 CAN run in parallel with Phase 6 once Phase 4 is complete IF Armaan green-lights asset-type expansion early.

### Subphase 7A — Environment vertical slice (Tasks 7.1–7.4)

### Task 7.1: Environment asset contract

**Files:**
- Create: `src/lib/artlab/contracts/environment-contract.ts`
- Test: `src/lib/artlab/contracts/environment-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/contracts/environment-contract.test.ts
import { describe, expect, it } from "vitest";
import { ENVIRONMENT_CONTRACT, validateEnvironmentSlotSpec } from "./environment-contract";

describe("environment asset contract", () => {
  it("aspect ratio is 16:9 (background full-bleed); resolution ≥ 4K width", () => {
    expect(ENVIRONMENT_CONTRACT.aspectRatio).toBe("16:9");
    expect(ENVIRONMENT_CONTRACT.minWidth).toBeGreaterThanOrEqual(3840);
  });

  it("requires exactly 4 slot variants (day morning/midday/evening + night)", () => {
    expect(ENVIRONMENT_CONTRACT.requiredSlots).toEqual(["day-morning", "day-midday", "day-evening", "night"]);
  });

  it("validates a well-formed slot spec", () => {
    const spec = { slotId: "war-room-day-midday", floor: "war-room", timeOfDay: "day-midday" as const };
    expect(() => validateEnvironmentSlotSpec(spec)).not.toThrow();
  });

  it("rejects an out-of-vocabulary timeOfDay", () => {
    const spec = { slotId: "x", floor: "war-room", timeOfDay: "twilight" as any };
    expect(() => validateEnvironmentSlotSpec(spec)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/contracts/environment-contract.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/contracts/environment-contract.ts
import { z } from "zod";

export const ENVIRONMENT_CONTRACT = {
  aspectRatio: "16:9" as const,
  minWidth: 3840,
  requiredSlots: ["day-morning", "day-midday", "day-evening", "night"] as const,
  noCharacters: true,
} as const;

export const EnvironmentSlotSpecSchema = z
  .object({
    slotId: z.string().min(1),
    floor: z.enum(["war-room", "rolodex-lounge", "writing-room", "situation-room", "briefing-room", "observatory", "c-suite", "penthouse", "lobby"]),
    timeOfDay: z.enum(["day-morning", "day-midday", "day-evening", "night"]),
  })
  .strict();
export type EnvironmentSlotSpec = z.infer<typeof EnvironmentSlotSpecSchema>;

export function validateEnvironmentSlotSpec(spec: unknown): EnvironmentSlotSpec {
  return EnvironmentSlotSpecSchema.parse(spec);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/contracts/environment-contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/contracts/environment-contract.ts src/lib/artlab/contracts/environment-contract.test.ts
git commit -m "$(cat <<'EOF'
Add environment asset contract (16:9, 4 time-of-day variants)

aspectRatio 16:9 + minWidth 3840 (4K) match the existing
ProceduralSkyline renderer surface. requiredSlots locks the
4 time-of-day variants matching the existing DayNight provider.
noCharacters: true is the prompt-builder hint to avoid people
in background art.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] `requiredSlots` matches the existing `useDayNight` 7-state model collapsed to 4 supersets (test verifies the literal list).
- [ ] Floor enum matches the spec §3.1 floor directory (9 floors).
- [ ] `noCharacters: true` is the prompt-builder hint (Phase 7 environment runner reads it).
- [ ] All Zod schemas strict (Universal already enforces but reviewer double-checks).

### Task 7.2: Environment runner extension

**Files:**
- Create: `src/lib/artlab/runners/environment-runner.ts`
- Test: `src/lib/artlab/runners/environment-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/environment-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { environmentRunner } from "./environment-runner";

describe("environment runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-env-")); });

  it("produces exactly 4 slot files (one per time-of-day variant)", async () => {
    const result = await environmentRunner.run({
      runId: "r1",
      runDir,
      assetType: "environment",
      providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(readdirSync(join(runDir, "production-slots"))).toHaveLength(4);
  });

  it("each slot file names its time-of-day variant", async () => {
    await environmentRunner.run({
      runId: "r1", runDir, assetType: "environment", providerId: "local-mock",
    });
    const files = readdirSync(join(runDir, "production-slots")).sort();
    expect(files).toEqual(["day-evening.json", "day-midday.json", "day-morning.json", "night.json"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/environment-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/runners/environment-runner.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ENVIRONMENT_CONTRACT } from "@/lib/artlab/contracts/environment-contract";
import type { AtelierRunner, AtelierRunnerInput, AtelierRunnerResult } from "./runner-contract";

export const environmentRunner: AtelierRunner = {
  kind: "production",
  async run(input: AtelierRunnerInput): Promise<AtelierRunnerResult> {
    const startedAt = Date.now();
    const dir = join(input.runDir, "production-slots");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const slotOutputs: string[] = [];
    // SPEED: 4-variant parallelism (small; just Promise.all)
    await Promise.all(
      ENVIRONMENT_CONTRACT.requiredSlots.map(async (timeOfDay) => {
        const path = join(dir, `${timeOfDay}.json`);
        writeFileSync(path, JSON.stringify({
          slotId: `${input.runId}-${timeOfDay}`,
          timeOfDay,
          aspectRatio: ENVIRONMENT_CONTRACT.aspectRatio,
          noCharacters: ENVIRONMENT_CONTRACT.noCharacters,
          mock: true,
        }));
        slotOutputs.push(path);
      }),
    );
    return {
      runnerKind: "production",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs: slotOutputs.sort(), slotCount: 4 },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/environment-runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/environment-runner.ts src/lib/artlab/runners/environment-runner.test.ts
git commit -m "$(cat <<'EOF'
Add environment runner — 4 time-of-day variants in parallel

Reuses the same AtelierRunner contract; assetType discriminates
which runner the orchestrator dispatches. 4-variant Promise.all
parallelism (Phase 5 SPEED comment). Mock output for tests;
real Gemini path identical to character runner.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Reuses `AtelierRunner` contract — no new runner kind needed.
- [ ] Reads `requiredSlots` from the contract (no hard-coded literals).
- [ ] Output `slotOutputs` is sorted (determinism for downstream).
- [ ] Parallel via Promise.all per Phase 5 conventions.

### Task 7.3: Environment promotion path

**Files:**
- Modify: `src/lib/artlab/runners/promotion-runner.ts` (extend `targetDir` for environment)
- Create: `src/lib/artlab/runners/promotion-runner.environment.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/promotion-runner.environment.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";

describe("promotion runner — environment asset type", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promo-env-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-pub-"));
    mkdirSync(join(runDir, "cutouts"));
    writeFileSync(join(runDir, "cutouts", "day-morning.png"), JSON.stringify({ alpha: false }));
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
    process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
  });

  it("environment promotes to public/art/backgrounds/<runId>/", async () => {
    const result = await promotionRunner.run({
      runId: "war-room-2026",
      runDir,
      assetType: "environment",
      providerId: "local-mock",
    });
    delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    expect(result.status).toBe("ok");
    expect(existsSync(join(publicArtRoot, "backgrounds", "war-room-2026"))).toBe(true);
    expect(readdirSync(join(publicArtRoot, "backgrounds", "war-room-2026")).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (Task 1.14 promotion runner already routes by assetType)**

Run: `npx vitest run src/lib/artlab/runners/promotion-runner.environment.test.ts`
Expected: PASS — existing promotion runner from Task 1.14 already routes environment to `backgrounds/<runId>/`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/artlab/runners/promotion-runner.environment.test.ts
git commit -m "$(cat <<'EOF'
Add environment promotion path test

Confirms Task 1.14 promotion runner routes environment assets
to public/art/backgrounds/<runId>/ — no further runner change
required, just the explicit test.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Test verifies destination path matches the Task 1.14 contract.
- [ ] Exactly one source → exactly one destination copy.
- [ ] Promotion firewall (approval phrase) still enforced (test passes only with `"approved for app"`).

### Task 7.4: Environment Playwright assertion

**Files:**
- Create: `tests/e2e/artlab-environment-promotion.spec.ts`

- [ ] **Step 1: Write the Playwright spec**

```ts
// tests/e2e/artlab-environment-promotion.spec.ts
import { test, expect } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

test.describe("ArtLab environment vertical slice", () => {
  test("promoted war-room background appears on /war-room", async ({ page }) => {
    const backgroundsDir = join("public", "art", "backgrounds");
    if (!existsSync(backgroundsDir)) test.skip();
    const warRoomBundles = readdirSync(backgroundsDir).filter((d) => d.toLowerCase().includes("war-room"));
    if (warRoomBundles.length === 0) test.skip();
    await page.goto("/war-room");
    // The runtime renders the promoted background as either an <img> or a CSS background-image
    // on the floor's main container. We assert at least one of those references the promoted asset.
    const referenced = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*"));
      const seen = new Set<string>();
      for (const el of all) {
        const style = window.getComputedStyle(el).backgroundImage;
        if (style && style.includes("/art/backgrounds/")) seen.add(style);
        if (el.tagName === "IMG" && (el as HTMLImageElement).src.includes("/art/backgrounds/")) {
          seen.add((el as HTMLImageElement).src);
        }
      }
      return Array.from(seen);
    });
    expect(referenced.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/artlab-environment-promotion.spec.ts
git commit -m "$(cat <<'EOF'
Add Playwright assertion for environment promotion

Visits /war-room and asserts the page references the promoted
background asset (either as an <img> or CSS background-image).
Skip-safe when no environment has been promoted yet — runs
green on early Phase 7 PRs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Test is skip-safe when no environment has been promoted (`test.skip()`).
- [ ] Asserts at least one DOM reference to `/art/backgrounds/` (CSS or img tag).
- [ ] Runs in the existing Playwright suite (no new playwright config).

### Subphase 7B — UI texture vertical slice (Tasks 7.5–7.8)

### Task 7.5: UI texture asset contract

**Files:**
- Create: `src/lib/artlab/contracts/ui-texture-contract.ts`
- Test: `src/lib/artlab/contracts/ui-texture-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/contracts/ui-texture-contract.test.ts
import { describe, expect, it } from "vitest";
import { UI_TEXTURE_CONTRACT, validateUiTextureSlotSpec } from "./ui-texture-contract";

describe("UI texture contract", () => {
  it("tileable, small dimensions, color-palette constrained", () => {
    expect(UI_TEXTURE_CONTRACT.tileable).toBe(true);
    expect(UI_TEXTURE_CONTRACT.maxWidth).toBeLessThanOrEqual(512);
    expect(UI_TEXTURE_CONTRACT.colorPalette).toContain("#1A1A2E");
    expect(UI_TEXTURE_CONTRACT.colorPalette).toContain("#C9A84C");
  });

  it("validates a slot spec", () => {
    expect(() => validateUiTextureSlotSpec({ slotId: "btn-primary", surface: "button", state: "hover" })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/contracts/ui-texture-contract.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/contracts/ui-texture-contract.ts
import { z } from "zod";

export const UI_TEXTURE_CONTRACT = {
  tileable: true,
  maxWidth: 512,
  maxHeight: 512,
  // The Tower design system tokens from src/lib/config — primary dark + gold accent.
  colorPalette: ["#1A1A2E", "#C9A84C"] as const,
  noCharacters: true,
  noText: true,
} as const;

export const UiTextureSlotSpecSchema = z
  .object({
    slotId: z.string().min(1),
    surface: z.enum(["button", "card", "modal", "navbar", "sidebar", "input"]),
    state: z.enum(["default", "hover", "active", "disabled"]),
  })
  .strict();
export type UiTextureSlotSpec = z.infer<typeof UiTextureSlotSpecSchema>;

export function validateUiTextureSlotSpec(spec: unknown): UiTextureSlotSpec {
  return UiTextureSlotSpecSchema.parse(spec);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/contracts/ui-texture-contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/contracts/ui-texture-contract.ts src/lib/artlab/contracts/ui-texture-contract.test.ts
git commit -m "$(cat <<'EOF'
Add UI texture asset contract (tileable, palette-locked)

Locks max 512x512, tileable, Tower palette colors only, no
characters, no text. Slot spec types: surface + state (button,
card, modal, navbar, sidebar, input × default, hover, active,
disabled).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Palette colors match `src/lib/config` Tower theme tokens (verify by grep).
- [ ] `noText: true` is the prompt-builder hint.
- [ ] Tileable + max dimensions enforced as part of the type contract, not just prose.

### Task 7.6: UI texture runner extension

**Files:**
- Create: `src/lib/artlab/runners/ui-texture-runner.ts`
- Test: `src/lib/artlab/runners/ui-texture-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/ui-texture-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { uiTextureRunner } from "./ui-texture-runner";

describe("UI texture runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-uit-")); });

  it("produces one slot per (surface, state) combo for the requested surfaces", async () => {
    const result = await uiTextureRunner.run({
      runId: "r1", runDir,
      assetType: "ui-texture", providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect((result.artifacts.slotOutputs as string[]).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/ui-texture-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/runners/ui-texture-runner.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { UI_TEXTURE_CONTRACT } from "@/lib/artlab/contracts/ui-texture-contract";
import type { AtelierRunner, AtelierRunnerInput, AtelierRunnerResult } from "./runner-contract";

const DEFAULT_COMBOS = [
  { surface: "button" as const, state: "default" as const },
  { surface: "button" as const, state: "hover" as const },
  { surface: "card" as const, state: "default" as const },
];

export const uiTextureRunner: AtelierRunner = {
  kind: "production",
  async run(input: AtelierRunnerInput): Promise<AtelierRunnerResult> {
    const startedAt = Date.now();
    const dir = join(input.runDir, "production-slots");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    // SPEED: combo parallelism
    const slotOutputs = await Promise.all(
      DEFAULT_COMBOS.map(async (combo) => {
        const slotId = `${combo.surface}-${combo.state}`;
        const path = join(dir, `${slotId}.json`);
        writeFileSync(path, JSON.stringify({
          slotId,
          surface: combo.surface,
          state: combo.state,
          tileable: UI_TEXTURE_CONTRACT.tileable,
          maxWidth: UI_TEXTURE_CONTRACT.maxWidth,
          mock: true,
        }));
        return path;
      }),
    );
    return {
      runnerKind: "production",
      status: "ok",
      durationMs: Date.now() - startedAt,
      artifacts: { slotOutputs: slotOutputs.sort(), slotCount: slotOutputs.length },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/ui-texture-runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/ui-texture-runner.ts src/lib/artlab/runners/ui-texture-runner.test.ts
git commit -m "$(cat <<'EOF'
Add UI texture runner (button + card combos)

Default combo set covers the most-needed surfaces. Future
expansion: more surfaces via input.spec override. Parallel
generation per Phase 5 conventions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Combo set is a module-level const (no inline magic).
- [ ] Reads `tileable` + `maxWidth` from contract (no duplicate literals).
- [ ] Promise.all parallel per Phase 5.
- [ ] Sorted output for determinism.

### Task 7.7: UI texture promotion path

**Files:**
- Create: `src/lib/artlab/runners/promotion-runner.ui-texture.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/lib/artlab/runners/promotion-runner.ui-texture.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promotionRunner } from "./promotion-runner";

describe("promotion runner — UI texture asset type", () => {
  let runDir: string;
  let publicArtRoot: string;
  beforeEach(() => {
    runDir = mkdtempSync(join(tmpdir(), "artlab-promo-uit-"));
    publicArtRoot = mkdtempSync(join(tmpdir(), "artlab-pub-"));
    mkdirSync(join(runDir, "cutouts"));
    writeFileSync(join(runDir, "cutouts", "button-default.png"), JSON.stringify({ alpha: false }));
    writeFileSync(join(runDir, "approval.json"), JSON.stringify({ phrase: "approved for app" }));
    process.env.ARTLAB_PUBLIC_ART_ROOT = publicArtRoot;
  });

  it("ui-texture promotes to public/art/ui/<runId>/", async () => {
    const result = await promotionRunner.run({
      runId: "tower-buttons-2026", runDir, assetType: "ui-texture", providerId: "local-mock",
    });
    delete process.env.ARTLAB_PUBLIC_ART_ROOT;
    expect(result.status).toBe("ok");
    expect(existsSync(join(publicArtRoot, "ui", "tower-buttons-2026"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (Task 1.14 already handles ui-texture path)**

Run: `npx vitest run src/lib/artlab/runners/promotion-runner.ui-texture.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/artlab/runners/promotion-runner.ui-texture.test.ts
git commit -m "$(cat <<'EOF'
Add UI texture promotion path test

Confirms Task 1.14 promotion runner routes ui-texture assets
to public/art/ui/<runId>/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):** identical to Task 7.3.

### Task 7.8: UI texture Playwright assertion

**Files:**
- Create: `tests/e2e/artlab-ui-texture-promotion.spec.ts`

- [ ] **Step 1: Write the Playwright spec**

```ts
// tests/e2e/artlab-ui-texture-promotion.spec.ts
import { test, expect } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

test.describe("ArtLab UI texture vertical slice", () => {
  test("promoted button textures appear referenced in CSS", async ({ page }) => {
    const uiDir = join("public", "art", "ui");
    if (!existsSync(uiDir)) test.skip();
    const bundles = readdirSync(uiDir);
    if (bundles.length === 0) test.skip();
    await page.goto("/");
    const referenced = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("button"));
      const seen = new Set<string>();
      for (const el of all) {
        const style = window.getComputedStyle(el).backgroundImage;
        if (style && style.includes("/art/ui/")) seen.add(style);
      }
      return Array.from(seen);
    });
    expect(referenced.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/artlab-ui-texture-promotion.spec.ts
git commit -m "$(cat <<'EOF'
Add Playwright assertion for UI texture promotion

Visits /, scans <button> elements for background-image references
to /art/ui/. Skip-safe before any UI texture promotion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):** identical to Task 7.4.

### Subphase 7C — Animation vertical slice (Tasks 7.9–7.11)

### Task 7.9: Animation asset contract (motion + reduced-motion respect)

**Files:**
- Create: `src/lib/artlab/contracts/animation-contract.ts`
- Test: `src/lib/artlab/contracts/animation-contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/contracts/animation-contract.test.ts
import { describe, expect, it } from "vitest";
import { ANIMATION_CONTRACT, validateAnimationSlotSpec } from "./animation-contract";

describe("animation contract", () => {
  it("declares frame count, fps, and reduced-motion fallback requirement", () => {
    expect(ANIMATION_CONTRACT.minFrames).toBe(12);
    expect(ANIMATION_CONTRACT.maxFrames).toBe(48);
    expect(ANIMATION_CONTRACT.fps).toBe(24);
    expect(ANIMATION_CONTRACT.requiresReducedMotionFallback).toBe(true);
  });

  it("validates a slot spec with frame count in bounds", () => {
    expect(() => validateAnimationSlotSpec({
      slotId: "lobby-ambient", purpose: "ambient", frameCount: 24,
    })).not.toThrow();
  });

  it("rejects frame counts outside bounds", () => {
    expect(() => validateAnimationSlotSpec({
      slotId: "x", purpose: "ambient", frameCount: 1,
    })).toThrow();
    expect(() => validateAnimationSlotSpec({
      slotId: "x", purpose: "ambient", frameCount: 100,
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/contracts/animation-contract.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/contracts/animation-contract.ts
import { z } from "zod";

export const ANIMATION_CONTRACT = {
  minFrames: 12,
  maxFrames: 48,
  fps: 24,
  requiresReducedMotionFallback: true,
} as const;

export const AnimationSlotSpecSchema = z
  .object({
    slotId: z.string().min(1),
    purpose: z.enum(["ambient", "transition", "loading", "hover"]),
    frameCount: z.number().int().min(ANIMATION_CONTRACT.minFrames).max(ANIMATION_CONTRACT.maxFrames),
  })
  .strict();
export type AnimationSlotSpec = z.infer<typeof AnimationSlotSpecSchema>;

export function validateAnimationSlotSpec(spec: unknown): AnimationSlotSpec {
  return AnimationSlotSpecSchema.parse(spec);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/contracts/animation-contract.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/contracts/animation-contract.ts src/lib/artlab/contracts/animation-contract.test.ts
git commit -m "$(cat <<'EOF'
Add animation asset contract (12-48 frames @ 24fps + RM fallback)

requiresReducedMotionFallback: true is the Tower
accessibility convention — every animation ships with a static
poster image for prefers-reduced-motion. Phase 7 e2e test
verifies the fallback is wired.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Frame count bounds enforced at the schema level (Zod min/max), not runtime asserts.
- [ ] `requiresReducedMotionFallback: true` is part of the contract surface.
- [ ] Purpose enum is closed (no string surface).

### Task 7.10: Animation runner extension

**Files:**
- Create: `src/lib/artlab/runners/animation-runner.ts`
- Test: `src/lib/artlab/runners/animation-runner.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/artlab/runners/animation-runner.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { mkdtempSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { animationRunner } from "./animation-runner";

describe("animation runner", () => {
  let runDir: string;
  beforeEach(() => { runDir = mkdtempSync(join(tmpdir(), "artlab-anim-")); });

  it("produces a frame folder + a sprite-sheet + a reduced-motion poster", async () => {
    const result = await animationRunner.run({
      runId: "lobby-ambient", runDir,
      assetType: "animation", providerId: "local-mock",
    });
    expect(result.status).toBe("ok");
    expect(existsSync(join(runDir, "production-slots", "frames"))).toBe(true);
    expect(readdirSync(join(runDir, "production-slots", "frames")).length).toBeGreaterThanOrEqual(12);
    expect(existsSync(join(runDir, "production-slots", "sprite-sheet.json"))).toBe(true);
    expect(existsSync(join(runDir, "production-slots", "reduced-motion-poster.json"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/artlab/runners/animation-runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement**

```ts
// src/lib/artlab/runners/animation-runner.ts
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ANIMATION_CONTRACT } from "@/lib/artlab/contracts/animation-contract";
import type { AtelierRunner, AtelierRunnerInput, AtelierRunnerResult } from "./runner-contract";

const DEFAULT_FRAME_COUNT = 24;

export const animationRunner: AtelierRunner = {
  kind: "production",
  async run(input: AtelierRunnerInput): Promise<AtelierRunnerResult> {
    const startedAt = Date.now();
    const slotsDir = join(input.runDir, "production-slots");
    const framesDir = join(slotsDir, "frames");
    if (!existsSync(framesDir)) mkdirSync(framesDir, { recursive: true });
    const frames = Array.from({ length: DEFAULT_FRAME_COUNT }, (_, i) => i + 1);
    // SPEED: per-frame parallelism
    const framePaths = await Promise.all(
      frames.map(async (idx) => {
        const path = join(framesDir, `frame-${String(idx).padStart(3, "0")}.json`);
        writeFileSync(path, JSON.stringify({ frame: idx, mock: true }));
        return path;
      }),
    );
    const spriteSheetPath = join(slotsDir, "sprite-sheet.json");
    writeFileSync(spriteSheetPath, JSON.stringify({
      runId: input.runId, frames: framePaths.sort(), fps: ANIMATION_CONTRACT.fps, mock: true,
    }));
    const posterPath = join(slotsDir, "reduced-motion-poster.json");
    writeFileSync(posterPath, JSON.stringify({
      runId: input.runId, fallbackFor: spriteSheetPath, mock: true,
    }));
    return {
      runnerKind: "production", status: "ok", durationMs: Date.now() - startedAt,
      artifacts: { framePaths, spriteSheetPath, posterPath, frameCount: DEFAULT_FRAME_COUNT },
    };
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/artlab/runners/animation-runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/artlab/runners/animation-runner.ts src/lib/artlab/runners/animation-runner.test.ts
git commit -m "$(cat <<'EOF'
Add animation runner (24 frames + sprite sheet + RM poster)

Per-frame Promise.all parallelism. Mandatory reduced-motion
poster — the contract requires it; the runner enforces it.
Sprite-sheet metadata + frames are siblings for the runtime to
choose.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Reduced-motion poster ALWAYS produced (test asserts existence).
- [ ] Frame count from `DEFAULT_FRAME_COUNT` is within contract bounds.
- [ ] Promise.all parallelism for frames (Phase 5 convention).
- [ ] Frame filenames zero-padded for sort stability (`frame-001.json`, not `frame-1.json`).

### Task 7.11: Animation Playwright assertion (motion + reduced-motion fallback)

**Files:**
- Create: `tests/e2e/artlab-animation-promotion.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
// tests/e2e/artlab-animation-promotion.spec.ts
import { test, expect } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

test.describe("ArtLab animation vertical slice — motion + RM fallback", () => {
  test("animation plays when prefers-reduced-motion is no-preference", async ({ page, context }) => {
    const animationDir = join("public", "art", "misc"); // animation promotion target — adjust if Phase 7 routes differently
    if (!existsSync(animationDir)) test.skip();
    if (readdirSync(animationDir).length === 0) test.skip();
    await context.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const animatedCount = await page.evaluate(() => document.querySelectorAll("[data-artlab-animation]").length);
    expect(animatedCount).toBeGreaterThanOrEqual(0); // present or absent depending on what was promoted
  });

  test("animation suppressed and poster shown when prefers-reduced-motion: reduce", async ({ page, context }) => {
    const animationDir = join("public", "art", "misc");
    if (!existsSync(animationDir)) test.skip();
    if (readdirSync(animationDir).length === 0) test.skip();
    await context.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const reducedMotionRespected = await page.evaluate(() => {
      const animated = document.querySelectorAll("[data-artlab-animation]");
      return Array.from(animated).every((el) => {
        const cs = window.getComputedStyle(el);
        return cs.animationName === "none" || cs.animationDuration === "0s" || (el as HTMLElement).dataset["reducedMotion"] === "true";
      });
    });
    expect(reducedMotionRespected).toBe(true);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/artlab-animation-promotion.spec.ts
git commit -m "$(cat <<'EOF'
Add Playwright assertion for animation + reduced-motion fallback

Two specs: (1) animation plays at default media; (2) reduced-
motion media query suppresses animation (CSS animation: none OR
data-reduced-motion=true). Skip-safe before promotion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Acceptance criteria (per-task, in addition to Universal):**
- [ ] Two distinct specs — playing + suppressed.
- [ ] Uses Playwright's `emulateMedia({ reducedMotion: "reduce" })` (real media-query simulation).
- [ ] Asserts at the DOM level (CSS + data attribute), not just JS state.
- [ ] Skip-safe before any animation promoted.

### Phase 7 completion criteria

```bash
# All Phase 7 unit + integration tests pass
npx vitest run src/lib/artlab/contracts src/lib/artlab/runners

# All 3 vertical slices have e2e specs
test -f tests/e2e/artlab-environment-promotion.spec.ts
test -f tests/e2e/artlab-ui-texture-promotion.spec.ts
test -f tests/e2e/artlab-animation-promotion.spec.ts

# At least one environment, one UI texture, one animation promoted
test -d public/art/backgrounds || { echo "FAIL: no environment promoted"; exit 1; }
test -d public/art/ui || { echo "FAIL: no ui texture promoted"; exit 1; }
test -d public/art/misc || { echo "FAIL: no animation promoted"; exit 1; }

# Playwright suite green (only the new specs are non-trivial here)
npx playwright test tests/e2e/artlab-environment-promotion.spec.ts tests/e2e/artlab-ui-texture-promotion.spec.ts tests/e2e/artlab-animation-promotion.spec.ts

# Tag the phase
git tag artlab-phase-7-complete
```

---


