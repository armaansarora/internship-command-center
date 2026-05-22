---
name: artlab
description: Use when Armaan asks to use ArtLab, run the engine, generate Tower visuals (characters, environments, UI textures, animations), or asks "what's the status" of a run. ArtLab is the Telegram-driven, two-gate creative engine (see docs/artlab/ENGINE.md).
---

# ArtLab

ArtLab is the Tower's creative engine — Telegram-driven, two human gates only.

## Trigger phrases

Use this skill when Armaan says:
- "use ArtLab" / "run ArtLab"
- "make <character/asset>"
- "generate a Tower visual"
- "continue the run" / "what's the status"
- "did the daemon …"

## Workflow

1. **Run from Telegram, not CLI** unless Armaan specifically asks for CLI.
2. **Two human gates only:**
   - Concept board → `approve direction <n>`
   - Final board → `approved for app` (EXACT phrase)
3. **Read status via reconciler:** `npm run artlab -- status [<runId>]`
4. **Read health via snapshot:** `npm run artlab -- health` (includes speed dashboard)
5. **Cancel via inbox intent:** `npm run artlab -- cancel <runId>` (daemon SIGTERMs next sweep)

## Quality non-negotiables

- Lobby backgrounds (`public/lobby/bg-*.jpg`) are protected.
- Otis + CEO public/art is **byte-protected** by CI (Task 4.10).
- Engine never opens PRs (self-evolution drafts branches only).
- Promotion requires the EXACT phrase `approved for app`.

## Detail references

- Architecture + state machine: `docs/artlab/ENGINE.md`
- Setup + troubleshooting + runbook: `docs/artlab/OPERATIONS.md`
- Character matrix + cast coherence: `docs/artlab/CHARACTER-PIPELINE.md`
- Speed playbook: `docs/artlab/SPEED.md`
- Cast push protocol: `docs/artlab/CAST-PUSH-RUNBOOK.md`

## /goal recipes

- Whole-plan: see `docs/superpowers/plans/2026-05-20-artlab-implementation.md` Execution Protocol § "Three layers of /goal".
- Per-phase + per-task: same source.
